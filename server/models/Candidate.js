const m = require('mongoose');
const { STAGES } = require('../utils/stages');
const ObjectId = m.Schema.Types.ObjectId;

// One entry per stage change; this is the application history.
const historySchema = new m.Schema({
  from: { type: String, enum: STAGES },
  to: { type: String, enum: STAGES, required: true },
  by: { type: ObjectId, ref: 'User' },
  byRole: { type: String, enum: ['candidate', 'recruiter', 'admin', 'system'] },
  note: { type: String, maxlength: 1000 },
  at: { type: Date, default: Date.now }
}, { _id: false });

// Private recruiter/admin notes. Never exposed to candidates.
const noteSchema = new m.Schema({
  author: { type: ObjectId, ref: 'User', required: true },
  authorName: String,
  body: { type: String, required: true, maxlength: 2000 },
  createdAt: { type: Date, default: Date.now }
});

// A Candidate document is one application/screening record: a person evaluated against one job.
const schema = new m.Schema({
  owner: { type: ObjectId, ref: 'User', required: true },      // the job's recruiter (kept in sync with Job.owner)
  job: { type: ObjectId, ref: 'Job', required: true },
  applicant: { type: ObjectId, ref: 'User' },                  // set only when a registered candidate applied
  source: { type: String, enum: ['recruiter_upload', 'application'], default: 'recruiter_upload' },
  name: String, email: String, phone: String, fileName: String,
  skills: [String], yearsExperience: Number, education: String, projectsCount: Number,
  // Server-computed only. No API accepts these from a client.
  score: Number,
  breakdown: { skills: Number, experience: Number, education: Number, projects: Number, keywords: Number },
  matchedSkills: [String], missingSkills: [String], recommendation: String, explanation: [String],
  rescoredAt: Date,
  // status = automatic screening verdict from the matcher (shortlisted/review/rejected).
  // stage  = the hiring pipeline position managed by recruiters.
  status: { type: String, enum: ['shortlisted', 'review', 'rejected'], default: 'review' },
  stage: { type: String, enum: STAGES, default: 'screening' },
  history: [historySchema],
  notes: [noteSchema],
  resumeText: String
}, { timestamps: true });

// One application per registered candidate per job, enforced by the database.
schema.index({ job: 1, applicant: 1 }, { unique: true, partialFilterExpression: { applicant: { $exists: true } } });
schema.index({ owner: 1, job: 1 });
schema.index({ job: 1, score: -1 });
schema.index({ applicant: 1, createdAt: -1 });

module.exports = m.model('Candidate', schema);
