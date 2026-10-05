const r = require('express').Router(), { authenticate, requireRole } = require('../middleware/auth');
const User = require('../models/User'), Job = require('../models/Job'), Candidate = require('../models/Candidate');
const { STAGES } = require('../utils/stages');
const { wrap } = require('../utils/http');

r.use(authenticate, requireRole('recruiter', 'admin'));

// Recruiters see analytics for their own jobs only; admins see the whole organisation.
r.get('/', wrap(async (req, res) => {
  const admin = req.user.role === 'admin';
  const own = admin ? {} : { owner: req.user._id };
  const top = (arr) => arr.map(x => ({ name: x._id, value: x.n }));
  const bucket = (lo, hi) => Candidate.countDocuments({ ...own, score: { $gte: lo, $lte: hi } });

  const [stageAgg, verdictAgg, overall, skills, gaps, jobs, byJobAgg, topCands, b1, b2, b3, b4, sources] = await Promise.all([
    Candidate.aggregate([{ $match: own }, { $group: { _id: '$stage', n: { $sum: 1 } } }]),
    Candidate.aggregate([{ $match: own }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Candidate.aggregate([{ $match: own }, { $group: { _id: null, n: { $sum: 1 }, avg: { $avg: '$score' } } }]),
    Candidate.aggregate([{ $match: own }, { $unwind: '$skills' }, { $group: { _id: '$skills', n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }, { $limit: 8 }]),
    Candidate.aggregate([{ $match: own }, { $unwind: '$missingSkills' }, { $group: { _id: '$missingSkills', n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }, { $limit: 8 }]),
    Job.find(own).select('title status').lean(),
    Candidate.aggregate([{ $match: own }, { $group: { _id: '$job', n: { $sum: 1 } } }]),
    Candidate.find(own).select('name score job stage').sort({ score: -1 }).limit(5).populate('job', 'title').lean(),
    bucket(0, 39), bucket(40, 59), bucket(60, 79), bucket(80, 100),
    Candidate.aggregate([{ $match: own }, { $group: { _id: '$source', n: { $sum: 1 } } }])
  ]);

  const stageN = Object.fromEntries(stageAgg.map(s => [s._id || 'screening', s.n]));
  const verdict = Object.fromEntries(verdictAgg.map(s => [s._id, s.n]));
  const jobCount = Object.fromEntries(byJobAgg.map(j => [String(j._id), j.n]));
  const out = {
    role: req.user.role,
    totals: {
      applicants: overall[0]?.n || 0, jobs: jobs.filter(j => (j.status || 'open') === 'open').length, allJobs: jobs.length,
      // automatic screening verdict (matcher) - existing keys preserved
      shortlisted: verdict.shortlisted || 0, review: verdict.review || 0, rejected: verdict.rejected || 0,
      avgScore: Math.round(overall[0]?.avg || 0),
      // hiring pipeline (recruiter-managed stage)
      interviews: stageN.interview || 0, hired: stageN.hired || 0
    },
    pipeline: STAGES.map(s => ({ name: s, value: stageN[s] || 0 })),
    byJob: jobs.map(j => ({ name: j.title, value: jobCount[String(j._id)] || 0 })),
    skills: top(skills), skillGaps: top(gaps),
    scoreBuckets: [{ name: '0-39', value: b1 }, { name: '40-59', value: b2 }, { name: '60-79', value: b3 }, { name: '80-100', value: b4 }],
    sources: Object.fromEntries(sources.map(s => [s._id || 'recruiter_upload', s.n])),
    topCandidates: topCands.map(c => ({ _id: c._id, name: c.name, score: c.score, stage: c.stage, job: c.job?.title }))
  };

  if (admin) {
    const [roleAgg, perRecruiter, jobsPer] = await Promise.all([
      User.aggregate([{ $group: { _id: { role: '$role', active: '$isActive' }, n: { $sum: 1 } } }]),
      Candidate.aggregate([{ $group: { _id: '$owner', applicants: { $sum: 1 }, avg: { $avg: '$score' }, hired: { $sum: { $cond: [{ $eq: ['$stage', 'hired'] }, 1, 0] } } } }]),
      Job.aggregate([{ $group: { _id: '$owner', jobs: { $sum: 1 } } }])
    ]);
    const users = { admin: 0, recruiter: 0, candidate: 0, inactive: 0 };
    roleAgg.forEach(x => { if (users[x._id.role] !== undefined) users[x._id.role] += x.n; if (x._id.active === false) users.inactive += x.n; });
    const stats = {};
    jobsPer.forEach(j => { stats[String(j._id)] = { jobs: j.jobs, applicants: 0, hired: 0, avgScore: 0 }; });
    perRecruiter.forEach(p => { const s = stats[String(p._id)] || (stats[String(p._id)] = { jobs: 0 }); Object.assign(s, { applicants: p.applicants, hired: p.hired, avgScore: Math.round(p.avg || 0) }); });
    const owners = await User.find({ _id: { $in: Object.keys(stats) } }).select('name email').lean();
    out.org = {
      users,
      recruiters: owners.map(o => ({ id: o._id, name: o.name, email: o.email, ...stats[String(o._id)] })).sort((a, b) => (b.applicants || 0) - (a.applicants || 0))
    };
  }
  res.json(out);
}));

module.exports = r;
