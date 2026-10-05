const r = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const Job = require('../models/Job'), Candidate = require('../models/Candidate');
const { extractText } = require('../utils/parser');
const { resumeUpload, verifyResume } = require('../utils/upload');
const { screen, rescoreFields } = require('../services/screening');
const { STAGES, allowedNext, canMove } = require('../utils/stages');
const { wrap, HttpError, escapeRegex } = require('../utils/http');
const { rules: v, validate, idParam } = require('../utils/validate');
const audit = require('../utils/audit');

r.use(authenticate, requireRole('recruiter', 'admin'));

const scope = user => (user.role === 'admin' ? {} : { owner: user._id });
const LIST_FIELDS = '-resumeText -notes -history';

// Loads the job / candidate only if the caller owns it (or is admin). Otherwise 404.
const loadJob = wrap(async (req, res, next) => {
  req.job = await Job.findOne({ _id: req.params.jobId, ...scope(req.user) });
  if (!req.job) throw new HttpError(404, 'Job not found.');
  next();
});
const loadCandidate = wrap(async (req, res, next) => {
  req.candidate = await Candidate.findOne({ _id: req.params.id, ...scope(req.user) });
  if (!req.candidate) throw new HttpError(404, 'Candidate not found.');
  next();
});
const decorate = c => ({ ...c, allowedNext: allowedNext(c.stage) });

// Ranked list for a job. Rank is computed here from the server-side score, never supplied by clients.
r.get('/job/:jobId', idParam('jobId'), loadJob, wrap(async (req, res) => {
  const q = validate({ stage: v.oneOf(STAGES, { optional: true }) }, req.query);
  const all = await Candidate.find({ job: req.job._id }).select(LIST_FIELDS).sort({ score: -1, createdAt: 1 }).lean();
  const ranked = all.map((c, i) => decorate({ ...c, stage: c.stage || 'screening', rank: i + 1 }));
  res.json(q.stage ? ranked.filter(c => c.stage === q.stage) : ranked);
}));

const isDuplicate = (jobId, email) => Candidate.exists({ job: jobId, email: new RegExp('^' + escapeRegex(email) + '$', 'i') });

r.post('/job/:jobId/upload', idParam('jobId'), loadJob, resumeUpload.array('resumes', 20), wrap(async (req, res) => {
  const job = req.job;
  if (job.status === 'archived') throw new HttpError(409, 'This job is archived.');
  if (!req.files?.length) throw new HttpError(400, 'Attach at least one PDF or DOCX resume.');
  let added = 0; const failed = [];
  for (const f of req.files) {
    try {
      verifyResume(f);
      const text = await extractText(f);
      if (text.trim().length < 50) throw new Error('No readable text (scanned image?)');
      const { parsed: p, text: stored, result } = screen({ text, fileName: f.originalname }, job);
      if (p.email && await isDuplicate(job._id, p.email)) throw new Error('A candidate with this email already exists for this job');
      await Candidate.create({
        owner: job.owner, job: job._id, source: 'recruiter_upload', fileName: f.originalname, resumeText: stored,
        name: p.name, email: p.email, phone: p.phone, skills: p.skills, yearsExperience: p.yearsExperience, education: p.education, projectsCount: p.projectsCount,
        score: result.score, breakdown: result.breakdown, matchedSkills: result.matchedSkills, missingSkills: result.missingSkills,
        recommendation: result.recommendation, explanation: result.explanation, status: result.status,
        stage: 'screening', history: [{ to: 'screening', by: req.user._id, byRole: req.user.role, note: 'Resume uploaded and screened' }]
      });
      added++;
    } catch (e) { failed.push({ file: f.originalname, reason: e.message }); }
  }
  audit(req, 'candidate.upload', { targetType: 'job', target: job._id, meta: { added, failed: failed.length } });
  res.json({ added, failed });
}));

// Full detail incl. explainable score, private notes and application history.
r.get('/:id', idParam('id'), wrap(async (req, res) => {
  const c = await Candidate.findOne({ _id: req.params.id, ...scope(req.user) }).select('-resumeText')
    .populate('history.by', 'name role').populate('job', 'title status').lean();
  if (!c) throw new HttpError(404, 'Candidate not found.');
  const rank = !c.job ? null : await Candidate.countDocuments({ job: c.job._id, $or: [{ score: { $gt: c.score } }, { score: c.score, createdAt: { $lt: c.createdAt } }] }) + 1;
  res.json(decorate({ ...c, stage: c.stage || 'screening', rank }));
}));

r.patch('/:id/stage', idParam('id'), loadCandidate, wrap(async (req, res) => {
  const b = validate({ stage: v.oneOf(STAGES), note: v.str({ max: 1000, optional: true }) }, req.body);
  const c = req.candidate, from = c.stage || 'screening';
  if (b.stage === from) throw new HttpError(400, `Candidate is already in the ${from} stage.`);
  if (!canMove(from, b.stage)) {
    const next = allowedNext(from);
    throw new HttpError(409, `Cannot move from ${from} to ${b.stage}.` + (next.length ? ` Allowed: ${next.join(', ')}.` : ' This stage is final.'), { code: 'INVALID_STAGE_TRANSITION' });
  }
  const entry = { from, to: b.stage, by: req.user._id, byRole: req.user.role, at: new Date(), ...(b.note ? { note: b.note } : {}) };
  // Compare-and-set on the current stage so two simultaneous changes cannot both succeed.
  const updated = await Candidate.findOneAndUpdate({ _id: c._id, stage: c.stage }, { $set: { stage: b.stage }, $push: { history: entry } }, { new: true })
    .select(LIST_FIELDS).lean();
  if (!updated) throw new HttpError(409, 'This application was just updated by someone else. Refresh and try again.');
  audit(req, 'candidate.stage', { targetType: 'candidate', target: c._id, meta: { from, to: b.stage } });
  res.json(decorate(updated));
}));

// Re-run the existing matcher against the job's current requirements.
r.post('/:id/rescore', idParam('id'), loadCandidate, wrap(async (req, res) => {
  const job = await Job.findById(req.candidate.job);
  if (!job) throw new HttpError(404, 'Job not found.');
  const updated = await Candidate.findByIdAndUpdate(req.candidate._id, { $set: rescoreFields(req.candidate.toObject(), job) }, { new: true }).select(LIST_FIELDS).lean();
  res.json(decorate(updated));
}));

r.post('/:id/notes', idParam('id'), loadCandidate, wrap(async (req, res) => {
  const b = validate({ body: v.str({ max: 2000 }) }, req.body);
  req.candidate.notes.push({ author: req.user._id, authorName: req.user.name, body: b.body });
  await req.candidate.save();
  res.status(201).json(req.candidate.notes);
}));

r.delete('/:id/notes/:noteId', idParam('id', 'noteId'), loadCandidate, wrap(async (req, res) => {
  const note = req.candidate.notes.id(req.params.noteId);
  if (!note) throw new HttpError(404, 'Note not found.');
  if (String(note.author) !== String(req.user._id) && req.user.role !== 'admin') throw new HttpError(403, 'You can only delete your own notes.');
  req.candidate.notes.pull(note._id);
  await req.candidate.save();
  res.json(req.candidate.notes);
}));

r.delete('/:id', idParam('id'), loadCandidate, wrap(async (req, res) => {
  if (req.candidate.source === 'application' && req.user.role !== 'admin')
    throw new HttpError(403, 'Applications submitted by candidates cannot be deleted. Move them to Rejected instead.');
  await req.candidate.deleteOne();
  audit(req, 'candidate.delete', { targetType: 'candidate', target: req.candidate._id });
  res.json({ ok: true });
}));

module.exports = r;
