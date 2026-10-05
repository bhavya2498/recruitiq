// Candidate-facing API. Everything here is scoped to the signed-in candidate; no recruiter data
// (scores, rankings, notes, other applicants) is ever returned.
const r = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const User = require('../models/User'), Job = require('../models/Job'), Candidate = require('../models/Candidate');
const { extractText, parseResume } = require('../utils/parser');
const { profileUpload, verifyResume } = require('../utils/upload');
const { screen } = require('../services/screening');
const { wrap, HttpError, escapeRegex } = require('../utils/http');
const { rules: v, validate, idParam } = require('../utils/validate');

r.use(authenticate, requireRole('candidate'));

const profileView = u => {
  const p = u.profile || {};
  return {
    name: u.name, email: u.email,
    profile: { headline: p.headline || '', phone: p.phone || '', location: p.location || '', summary: p.summary || '',
      resumeFileName: p.resumeFileName || null, resumeUpdatedAt: p.resumeUpdatedAt || null, skills: p.skills || [],
      yearsExperience: p.yearsExperience ?? null, education: p.education || null, projectsCount: p.projectsCount ?? null },
    hasResume: !!p.resumeFileName
  };
};

r.get('/profile', wrap(async (req, res) => res.json(profileView(await User.findById(req.user._id)))));

r.put('/profile', wrap(async (req, res) => {
  const b = validate({
    name: v.str({ min: 2, max: 80 }), headline: v.str({ max: 150, optional: true }), phone: v.str({ max: 40, optional: true }),
    location: v.str({ max: 120, optional: true }), summary: v.str({ max: 2000, optional: true })
  }, req.body, { partial: true });
  const set = {};
  for (const [k, val] of Object.entries(b)) set[k === 'name' ? 'name' : 'profile.' + k] = val;
  res.json(profileView(await User.findByIdAndUpdate(req.user._id, { $set: set }, { new: true, runValidators: true })));
}));

r.post('/profile/resume', profileUpload.single('resume'), wrap(async (req, res) => {
  const f = req.file;
  if (!f) throw new HttpError(400, 'Attach a PDF or DOCX resume.');
  verifyResume(f);
  const text = (await extractText(f)).slice(0, 100000);
  if (text.trim().length < 50) throw new HttpError(400, 'No readable text found in this file (scanned image?).');
  const p = parseResume(text, { originalname: f.originalname }, []);
  const set = {
    'profile.resumeText': text, 'profile.resumeFileName': f.originalname, 'profile.resumeUpdatedAt': new Date(),
    'profile.skills': p.skills, 'profile.yearsExperience': p.yearsExperience, 'profile.education': p.education, 'profile.projectsCount': p.projectsCount
  };
  const me = await User.findById(req.user._id);
  if (!me.profile?.phone && p.phone) set['profile.phone'] = p.phone.slice(0, 40);
  res.json(profileView(await User.findByIdAndUpdate(req.user._id, { $set: set }, { new: true })));
}));

// ---- Jobs ---------------------------------------------------------------------------------
const publicJob = (j, applied) => ({
  id: j._id, title: j.title, department: j.department || '', location: j.location || '', description: j.description,
  requiredSkills: j.requiredSkills, minExperience: j.minExperience || 0, minEducation: j.minEducation,
  company: j.owner?.company || null, postedAt: j.createdAt, applied: !!applied
});
const openJobFilter = async () => {
  const inactive = await User.find({ isActive: false, role: { $in: ['recruiter', 'admin'] } }).distinct('_id');
  return { status: 'open', owner: { $nin: inactive } };
};

r.get('/jobs', wrap(async (req, res) => {
  const q = validate({ q: v.str({ max: 100, optional: true }), page: v.int({ min: 1, max: 1000, optional: true }) }, req.query);
  const filter = await openJobFilter();
  if (q.q) { const re = new RegExp(escapeRegex(q.q), 'i'); filter.$or = [{ title: re }, { department: re }, { location: re }]; }
  const page = q.page || 1, limit = 20;
  const [jobs, total] = await Promise.all([
    Job.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit).populate('owner', 'company').lean(),
    Job.countDocuments(filter)
  ]);
  const mine = await Candidate.find({ applicant: req.user._id, job: { $in: jobs.map(j => j._id) } }).select('job').lean();
  const applied = new Set(mine.map(a => String(a.job)));
  res.json({ items: jobs.map(j => publicJob(j, applied.has(String(j._id)))), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}));

r.get('/jobs/:id', idParam('id'), wrap(async (req, res) => {
  const j = await Job.findOne({ _id: req.params.id, ...(await openJobFilter()) }).populate('owner', 'company').lean();
  if (!j) throw new HttpError(404, 'Job not found.');
  res.json(publicJob(j, await Candidate.exists({ applicant: req.user._id, job: j._id })));
}));

r.post('/jobs/:id/apply', idParam('id'), wrap(async (req, res) => {
  validate({}, req.body);
  const job = await Job.findOne({ _id: req.params.id, ...(await openJobFilter()) });
  if (!job) throw new HttpError(404, 'This job is not open for applications.');
  const me = await User.findById(req.user._id).select('+profile.resumeText');
  if (!me.profile?.resumeText) throw new HttpError(400, 'Upload your resume to your profile before applying.');
  const dup = await Candidate.exists({ job: job._id, $or: [{ applicant: me._id }, { email: new RegExp('^' + escapeRegex(me.email) + '$', 'i') }] });
  if (dup) throw new HttpError(409, 'You have already applied to this job.');
  // Scoring happens here, on the server, from the stored resume. The client supplies nothing but the job id.
  const { parsed: p, text, result } = screen({ text: me.profile.resumeText, fileName: me.profile.resumeFileName || me.name }, job);
  try {
    const c = await Candidate.create({
      owner: job.owner, job: job._id, applicant: me._id, source: 'application', fileName: me.profile.resumeFileName, resumeText: text,
      name: me.name, email: me.email, phone: me.profile.phone || p.phone,
      skills: p.skills, yearsExperience: p.yearsExperience, education: p.education, projectsCount: p.projectsCount,
      score: result.score, breakdown: result.breakdown, matchedSkills: result.matchedSkills, missingSkills: result.missingSkills,
      recommendation: result.recommendation, explanation: result.explanation, status: result.status,
      stage: 'applied', history: [{ to: 'applied', by: me._id, byRole: 'candidate', note: 'Application submitted' }]
    });
    res.status(201).json(publicApplication(await Candidate.findById(c._id).populate('job', 'title department location status').lean()));
  } catch (e) {
    if (e.code === 11000) throw new HttpError(409, 'You have already applied to this job.');
    throw e;
  }
}));

// ---- Own applications ------------------------------------------------------------------------
// Candidates see the stage and its timeline only: no score, ranking, breakdown or recruiter notes.
const publicApplication = c => ({
  id: c._id,
  job: c.job ? { id: c.job._id, title: c.job.title, department: c.job.department || '', location: c.job.location || '', status: c.job.status } : null,
  stage: c.stage, appliedAt: c.createdAt, updatedAt: c.updatedAt,
  timeline: (c.history || []).map(h => ({ from: h.from || null, to: h.to, at: h.at }))
});
const MINE = '-resumeText -notes -score -breakdown -matchedSkills -missingSkills -recommendation -explanation -status -owner';

r.get('/applications', wrap(async (req, res) => {
  const list = await Candidate.find({ applicant: req.user._id }).select(MINE).populate('job', 'title department location status').sort('-createdAt').lean();
  res.json(list.map(publicApplication));
}));

r.get('/applications/:id', idParam('id'), wrap(async (req, res) => {
  const c = await Candidate.findOne({ _id: req.params.id, applicant: req.user._id }).select(MINE).populate('job', 'title department location status').lean();
  if (!c) throw new HttpError(404, 'Application not found.');
  res.json(publicApplication(c));
}));

module.exports = r;
