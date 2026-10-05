const m = require('mongoose');
const ROLES = ['candidate', 'recruiter', 'admin'];

const profileSchema = new m.Schema({
  headline: { type: String, maxlength: 150 },
  phone: { type: String, maxlength: 40 },
  location: { type: String, maxlength: 120 },
  summary: { type: String, maxlength: 2000 },
  resumeFileName: String,
  resumeUpdatedAt: Date,
  resumeText: { type: String, select: false },   // never returned unless explicitly requested
  skills: [String], yearsExperience: Number, education: String, projectsCount: Number
}, { _id: false });

const schema = new m.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  company: { type: String, trim: true, maxlength: 120 },
  // No schema default for role on purpose: legacy users get theirs from the migration, and a
  // user without a valid role is denied by the auth middleware.
  role: { type: String, enum: ROLES, index: true },
  isActive: { type: Boolean, default: true, index: true },
  tokenVersion: { type: Number, default: 0 },      // bump to invalidate every issued JWT
  failedLogins: { type: Number, default: 0 },
  lockUntil: Date,
  lastLoginAt: Date,
  passwordChangedAt: Date,
  profile: { type: profileSchema, default: undefined }
}, { timestamps: true });

const User = m.model('User', schema);
User.ROLES = ROLES;
module.exports = User;
