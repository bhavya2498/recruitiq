const m = require('mongoose');
const JOB_STATUS = ['open', 'closed', 'archived'];

const Job = m.model('Job', new m.Schema({
  owner: { type: m.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true }, department: String, location: String,
  description: { type: String, required: true },
  requiredSkills: [String], minExperience: { type: Number, default: 0 },
  minEducation: { type: String, enum: ['any', 'diploma', 'bachelor', 'master', 'phd'], default: 'any' },
  // open = visible to candidates and accepting applications; closed = hidden, still managed; archived = read-only history
  status: { type: String, enum: JOB_STATUS, default: 'open', index: true }
}, { timestamps: true }));
Job.JOB_STATUS = JOB_STATUS;
module.exports = Job;
