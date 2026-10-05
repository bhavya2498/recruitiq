const r = require('express').Router(), { authenticate, requireRole } = require('../middleware/auth');
const Job = require('../models/Job'), Candidate = require('../models/Candidate'), User = require('../models/User');
const { wrap, HttpError } = require('../utils/http');
const { rules: v, validate, idParam } = require('../utils/validate');
const { rescoreJob } = require('../services/screening');
const audit = require('../utils/audit');

r.use(authenticate, requireRole('recruiter', 'admin'));

// Ownership: recruiters only ever see/modify their own jobs; admins see the whole organisation.
// A job outside the caller's scope is reported as 404 so its existence is not revealed.
const scope = user => (user.role === 'admin' ? {} : { owner: user._id });
const EDU = ['any', 'diploma', 'bachelor', 'master', 'phd'];
const jobSchema = {
  title: v.str({ min: 2, max: 150 }), department: v.str({ max: 100, optional: true }), location: v.str({ max: 100, optional: true }),
  description: v.str({ max: 10000 }), requiredSkills: v.skills({ optional: true }),
  minExperience: v.int({ min: 0, max: 50, optional: true }), minEducation: v.oneOf(EDU, { optional: true }),
  status: v.oneOf(Job.JOB_STATUS, { optional: true })
};
const REQUIREMENT_FIELDS = ['requiredSkills', 'minExperience', 'minEducation', 'description'];
const snapshot = j => JSON.stringify([[...j.requiredSkills], j.minExperience, j.minEducation, j.description]);

const findJob = async req => {
  const job = await Job.findOne({ _id: req.params.id, ...scope(req.user) });
  if (!job) throw new HttpError(404, 'Job not found.');
  return job;
};

r.get('/', wrap(async (req, res) => {
  const q = validate({ status: v.oneOf(Job.JOB_STATUS, { optional: true }) }, req.query);
  const filter = { ...scope(req.user), ...(q.status ? { status: q.status } : {}) };
  let query = Job.find(filter).sort('-createdAt');
  if (req.user.role === 'admin') query = query.populate('owner', 'name email company');
  const jobs = await query.lean();
  const counts = await Candidate.aggregate([
    { $match: { job: { $in: jobs.map(j => j._id) } } },
    { $group: { _id: '$job', n: { $sum: 1 }, avg: { $avg: '$score' }, hired: { $sum: { $cond: [{ $eq: ['$stage', 'hired'] }, 1, 0] } } } }
  ]);
  const map = Object.fromEntries(counts.map(c => [String(c._id), c]));
  res.json(jobs.map(j => ({ ...j, status: j.status || 'open', applicants: map[String(j._id)]?.n || 0, hired: map[String(j._id)]?.hired || 0, avgScore: Math.round(map[String(j._id)]?.avg || 0) })));
}));

r.post('/', wrap(async (req, res) => {
  const b = validate(jobSchema, req.body);
  const job = await Job.create({ ...b, owner: req.user._id });   // owner always comes from the token, never the body
  audit(req, 'job.create', { targetType: 'job', target: job._id });
  res.status(201).json(job);
}));

r.get('/:id', idParam('id'), wrap(async (req, res) => {
  let q = Job.findOne({ _id: req.params.id, ...scope(req.user) });
  if (req.user.role === 'admin') q = q.populate('owner', 'name email company');
  const job = await q;
  if (!job) throw new HttpError(404, 'Job not found.');
  res.json(job);
}));

// Editing requirements re-scores every candidate of the job with the existing matcher.
r.put('/:id', idParam('id'), wrap(async (req, res) => {
  const job = await findJob(req);
  const b = validate(jobSchema, req.body, { partial: true });
  const before = snapshot(job);
  job.set(b);
  await job.save();
  const rescored = REQUIREMENT_FIELDS.some(k => k in b) && snapshot(job) !== before ? await rescoreJob(job) : 0;
  audit(req, 'job.update', { targetType: 'job', target: job._id, meta: { fields: Object.keys(b), rescored } });
  res.json({ ...job.toObject(), rescored });
}));

r.post('/:id/rescore', idParam('id'), wrap(async (req, res) => {
  const job = await findJob(req);
  res.json({ rescored: await rescoreJob(job) });
}));

// Admin only: hand a job (and its candidates) to another recruiter.
r.post('/:id/reassign', idParam('id'), requireRole('admin'), wrap(async (req, res) => {
  const b = validate({ owner: v.id() }, req.body);
  const job = await findJob(req);
  const target = await User.findOne({ _id: b.owner, role: { $in: ['recruiter', 'admin'] }, isActive: true }).select('_id');
  if (!target) throw new HttpError(400, 'The new owner must be an active recruiter or admin.');
  const from = job.owner;
  job.owner = target._id;
  await job.save();
  await Candidate.updateMany({ job: job._id }, { $set: { owner: target._id } });
  audit(req, 'job.reassign', { targetType: 'job', target: job._id, meta: { from: String(from), to: String(target._id) } });
  res.json(job);
}));

r.delete('/:id', idParam('id'), wrap(async (req, res) => {
  const job = await findJob(req);
  const applications = await Candidate.countDocuments({ job: job._id, source: 'application' });
  if (applications && !(req.user.role === 'admin' && req.query.force === 'true'))
    throw new HttpError(409, `This job has ${applications} application(s) from registered candidates. Close it instead of deleting it so they keep their history.`, { code: 'HAS_APPLICATIONS' });
  await Candidate.deleteMany({ job: job._id });
  await job.deleteOne();
  audit(req, 'job.delete', { targetType: 'job', target: job._id, meta: { applications } });
  res.json({ ok: true });
}));

module.exports = r;
