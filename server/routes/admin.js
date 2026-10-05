// Organisation administration. Every route requires the admin role.
const r = require('express').Router(), bcrypt = require('bcryptjs');
const { authenticate, requireRole } = require('../middleware/auth');
const User = require('../models/User'), Job = require('../models/Job'), Candidate = require('../models/Candidate'), AuditLog = require('../models/AuditLog');
const config = require('../config');
const { wrap, HttpError, escapeRegex } = require('../utils/http');
const { rules: v, validate, idParam } = require('../utils/validate');
const { STAGES } = require('../utils/stages');
const audit = require('../utils/audit');

r.use(authenticate, requireRole('admin'));

const userView = u => ({
  id: u._id, name: u.name, email: u.email, company: u.company, role: u.role, isActive: u.isActive,
  lastLoginAt: u.lastLoginAt, createdAt: u.createdAt, locked: !!(u.lockUntil && u.lockUntil > new Date())
});
const page = q => { const limit = q.limit || 25, p = q.page || 1; return { limit, p, skip: (p - 1) * limit }; };

r.get('/users', wrap(async (req, res) => {
  const q = validate({
    role: v.oneOf(User.ROLES, { optional: true }), active: v.oneOf(['true', 'false'], { optional: true }),
    q: v.str({ max: 100, optional: true }), page: v.int({ min: 1, max: 10000, optional: true }), limit: v.int({ min: 1, max: 100, optional: true })
  }, req.query);
  const filter = {};
  if (q.role) filter.role = q.role;
  if (q.active) filter.isActive = q.active === 'true';
  if (q.q) { const re = new RegExp(escapeRegex(q.q), 'i'); filter.$or = [{ name: re }, { email: re }, { company: re }]; }
  const { limit, p, skip } = page(q);
  const [users, total] = await Promise.all([User.find(filter).sort('-createdAt').skip(skip).limit(limit).lean(), User.countDocuments(filter)]);
  const ids = users.map(u => u._id);
  const [jobs, apps] = await Promise.all([
    Job.aggregate([{ $match: { owner: { $in: ids } } }, { $group: { _id: '$owner', n: { $sum: 1 } } }]),
    Candidate.aggregate([{ $match: { $or: [{ owner: { $in: ids } }, { applicant: { $in: ids } }] } },
      { $group: { _id: { owner: '$owner', applicant: '$applicant' }, n: { $sum: 1 } } }])
  ]);
  const jobN = Object.fromEntries(jobs.map(j => [String(j._id), j.n]));
  const handled = {}, applied = {};
  apps.forEach(a => { handled[String(a._id.owner)] = (handled[String(a._id.owner)] || 0) + a.n; if (a._id.applicant) applied[String(a._id.applicant)] = (applied[String(a._id.applicant)] || 0) + a.n; });
  res.json({
    items: users.map(u => ({ ...userView(u), jobs: jobN[String(u._id)] || 0, applications: u.role === 'candidate' ? applied[String(u._id)] || 0 : handled[String(u._id)] || 0 })),
    total, page: p, pages: Math.max(1, Math.ceil(total / limit))
  });
}));

r.post('/users', wrap(async (req, res) => {
  const b = validate({
    name: v.str({ min: 2, max: 80 }), email: v.email(), password: v.password(), company: v.str({ max: 120, optional: true }), role: v.oneOf(User.ROLES)
  }, req.body);
  if (await User.exists({ email: b.email })) throw new HttpError(409, 'An account with this email already exists.');
  const u = await User.create({ name: b.name, email: b.email, company: b.company || undefined, role: b.role, isActive: true, password: await bcrypt.hash(b.password, config.bcryptRounds) });
  audit(req, 'admin.user.create', { targetType: 'user', target: u._id, meta: { role: u.role } });
  res.status(201).json(userView(u));
}));

r.patch('/users/:id', idParam('id'), wrap(async (req, res) => {
  const b = validate({
    name: v.str({ min: 2, max: 80 }), company: v.str({ max: 120 }), role: v.oneOf(User.ROLES), isActive: v.bool()
  }, req.body, { partial: true });
  const u = await User.findById(req.params.id);
  if (!u) throw new HttpError(404, 'User not found.');
  const self = String(u._id) === String(req.user._id);
  const roleChanges = b.role !== undefined && b.role !== u.role, deactivates = b.isActive === false && u.isActive;
  if (self && (roleChanges || deactivates)) throw new HttpError(400, 'You cannot change your own role or deactivate your own account.');
  if (u.role === 'admin' && (roleChanges || deactivates)) {
    const others = await User.countDocuments({ _id: { $ne: u._id }, role: 'admin', isActive: true });
    if (!others) throw new HttpError(409, 'At least one active administrator is required.');
  }
  if (roleChanges && u.role !== 'candidate' && b.role === 'candidate') {
    const owned = await Job.countDocuments({ owner: u._id });
    if (owned) throw new HttpError(409, `This user owns ${owned} job(s). Reassign them before changing the role to candidate.`);
  }
  if (roleChanges && u.role === 'candidate' && b.role !== 'candidate') {
    if (await Candidate.exists({ applicant: u._id })) throw new HttpError(409, 'This candidate has applications. Create a separate recruiter account instead of converting it.');
  }
  const before = { role: u.role, isActive: u.isActive };
  u.set(b);
  if (roleChanges || deactivates) u.tokenVersion = (u.tokenVersion || 0) + 1;   // sign the user out everywhere immediately
  await u.save();
  audit(req, 'admin.user.update', { targetType: 'user', target: u._id, meta: { before, changes: b } });
  res.json(userView(u));
}));

r.post('/users/:id/reset-password', idParam('id'), wrap(async (req, res) => {
  const b = validate({ password: v.password() }, req.body);
  const u = await User.findById(req.params.id);
  if (!u) throw new HttpError(404, 'User not found.');
  u.password = await bcrypt.hash(b.password, config.bcryptRounds);
  u.tokenVersion = (u.tokenVersion || 0) + 1;
  u.failedLogins = 0; u.lockUntil = undefined; u.passwordChangedAt = new Date();
  await u.save();
  audit(req, 'admin.user.reset_password', { targetType: 'user', target: u._id });
  res.json({ ok: true });
}));

// All applications / screened candidates across the organisation (no resume text, no notes).
r.get('/applications', wrap(async (req, res) => {
  const q = validate({
    job: v.id({ optional: true }), recruiter: v.id({ optional: true }), stage: v.oneOf(STAGES, { optional: true }),
    q: v.str({ max: 100, optional: true }), page: v.int({ min: 1, max: 10000, optional: true }), limit: v.int({ min: 1, max: 100, optional: true })
  }, req.query);
  const filter = {};
  if (q.job) filter.job = q.job;
  if (q.recruiter) filter.owner = q.recruiter;
  if (q.stage) filter.stage = q.stage;
  if (q.q) { const re = new RegExp(escapeRegex(q.q), 'i'); filter.$or = [{ name: re }, { email: re }]; }
  const { limit, p, skip } = page(q);
  const [items, total] = await Promise.all([
    Candidate.find(filter).select('-resumeText -notes -history').sort('-createdAt').skip(skip).limit(limit)
      .populate('job', 'title status').populate('owner', 'name').lean(),
    Candidate.countDocuments(filter)
  ]);
  res.json({ items, total, page: p, pages: Math.max(1, Math.ceil(total / limit)) });
}));

r.get('/audit', wrap(async (req, res) => {
  const q = validate({ page: v.int({ min: 1, max: 10000, optional: true }), action: v.str({ max: 60, optional: true }) }, req.query);
  const filter = q.action ? { action: q.action } : {};
  const { p, skip } = page({ limit: 50, page: q.page });
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort('-createdAt').skip(skip).limit(50).populate('actor', 'name email').lean(), AuditLog.countDocuments(filter)
  ]);
  res.json({ items, total, page: p, pages: Math.max(1, Math.ceil(total / 50)) });
}));

module.exports = r;
