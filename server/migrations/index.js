// Idempotent, non-destructive data migration. It only ADDS fields to existing documents
// (role, isActive, stage, history, ...) and never deletes or rewrites existing data such as
// scores, resumes or passwords. Safe to run on every start; each step also records itself.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User'), Job = require('../models/Job'), Candidate = require('../models/Candidate');
const config = require('../config');
const { legacyStatusToStage } = require('../utils/stages');
const { explain } = require('../utils/matcher');

const Migration = mongoose.models.Migration || mongoose.model('Migration', new mongoose.Schema({
  name: { type: String, unique: true }, appliedAt: Date, stats: mongoose.Schema.Types.Mixed
}));

const steps = [
  {
    name: '001-users-roles',
    // Every pre-existing account was an HR user who owns jobs: they become recruiters and keep all their data.
    async run() {
      const roles = await User.updateMany({ role: { $exists: false } }, { $set: { role: 'recruiter' } });
      const active = await User.updateMany({ isActive: { $exists: false } }, { $set: { isActive: true } });
      const tv = await User.updateMany({ tokenVersion: { $exists: false } }, { $set: { tokenVersion: 0 } });
      return { roles: roles.modifiedCount, active: active.modifiedCount, tokenVersion: tv.modifiedCount };
    }
  },
  {
    name: '002-jobs-status',
    async run() { return { jobs: (await Job.updateMany({ status: { $exists: false } }, { $set: { status: 'open' } })).modifiedCount }; }
  },
  {
    name: '003-candidates-pipeline',
    // Adds stage + history + source and back-fills the score explanation WITHOUT recomputing any stored score.
    async run() {
      const jobs = new Map();
      const getJob = async id => { const k = String(id); if (!jobs.has(k)) jobs.set(k, await Job.findById(id).lean()); return jobs.get(k); };
      let ops = [], n = 0;
      const flush = async () => { if (ops.length) { await Candidate.bulkWrite(ops); ops = []; } };
      const cursor = Candidate.find({ $or: [{ stage: { $exists: false } }, { explanation: { $exists: false } }, { source: { $exists: false } }] }).lean().cursor();
      for await (const c of cursor) {
        const $set = {};
        if (!c.stage) {
          $set.stage = legacyStatusToStage(c.status);
          $set.history = [{ to: $set.stage, byRole: 'system', note: 'Migrated from legacy status "' + (c.status || 'review') + '"', at: c.createdAt || new Date() }];
        }
        if (!c.source) $set.source = 'recruiter_upload';
        if (!c.explanation && c.breakdown && c.score !== undefined) {
          const job = await getJob(c.job);
          if (job) $set.explanation = explain(c, job, { score: c.score, breakdown: c.breakdown, matchedSkills: c.matchedSkills || [], missingSkills: c.missingSkills || [], recommendation: c.recommendation || '' });
        }
        if (Object.keys($set).length) { ops.push({ updateOne: { filter: { _id: c._id }, update: { $set }, timestamps: false } }); n++; }
        if (ops.length >= 200) await flush();
      }
      await flush();
      return { candidates: n };
    }
  }
];

async function runMigrations() {
  for (const s of steps) {
    const stats = await s.run();
    if (!(await Migration.exists({ name: s.name }))) await Migration.create({ name: s.name, appliedAt: new Date(), stats });
    const changed = Object.values(stats).reduce((a, b) => a + b, 0);
    if (changed) console.log(`[migrate] ${s.name}:`, JSON.stringify(stats));
  }
}

// Makes sure the organisation always has an administrator. Runs only while NO active admin exists:
//   1. promote existing accounts listed in ADMIN_EMAILS, else
//   2. create ADMIN_EMAIL / ADMIN_PASSWORD, else
//   3. warn (use `npm run create-admin`).
async function ensureAdmin() {
  if (await User.exists({ role: 'admin', isActive: true })) return;
  if (config.adminEmails.length) {
    const r = await User.updateMany({ email: { $in: config.adminEmails } }, { $set: { role: 'admin', isActive: true }, $inc: { tokenVersion: 1 } });
    if (r.modifiedCount) { console.log(`[admin] promoted ${r.modifiedCount} account(s) from ADMIN_EMAILS`); return; }
  }
  const b = config.adminBootstrap;
  if (b.email && b.password) {
    if (b.password.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters.');
    const existing = await User.findOne({ email: b.email });
    if (existing) await User.updateOne({ _id: existing._id }, { $set: { role: 'admin', isActive: true }, $inc: { tokenVersion: 1 } });
    else await User.create({ name: b.name, email: b.email, role: 'admin', isActive: true, password: await bcrypt.hash(b.password, config.bcryptRounds) });
    console.log(`[admin] administrator ready: ${b.email}`);
    return;
  }
  console.warn('[admin] No active administrator exists. Run `npm run create-admin -- <email> [password]` or set ADMIN_EMAILS / ADMIN_EMAIL + ADMIN_PASSWORD in server/.env.');
}

module.exports = { runMigrations, ensureAdmin };
