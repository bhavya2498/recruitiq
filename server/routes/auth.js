const r = require('express').Router(), bcrypt = require('bcryptjs');
const User = require('../models/User'), config = require('../config');
const { authenticate, signToken } = require('../middleware/auth');
const { rateLimit } = require('../middleware/security');
const { wrap, HttpError } = require('../utils/http');
const { rules: v, validate } = require('../utils/validate');
const audit = require('../utils/audit');

const publicUser = u => ({ id: u._id, name: u.name, email: u.email, company: u.company, role: u.role, isActive: u.isActive });
const session = u => ({ token: signToken(u), user: publicUser(u) });
const SELF_ROLES = ['candidate', 'recruiter'];   // the ONLY roles anyone can pick for themselves; admin is never self-assignable
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-1', 10);  // equalises timing when the email is unknown

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: 'Too many attempts. Please wait a few minutes and try again.' });

r.post('/register', authLimiter, wrap(async (req, res) => {
  const b = validate({
    name: v.str({ min: 2, max: 80 }), email: v.email(), password: v.password(),
    company: v.str({ max: 120, optional: true }), role: v.oneOf(SELF_ROLES, { optional: true })
  }, req.body);
  const role = b.role || 'candidate';
  if (role === 'recruiter' && !config.allowRecruiterSignup) throw new HttpError(403, 'Recruiter accounts are created by an administrator.');
  if (await User.exists({ email: b.email })) throw new HttpError(409, 'An account with this email already exists.');
  const user = await User.create({
    name: b.name, email: b.email, company: b.company || undefined, role, isActive: true,
    password: await bcrypt.hash(b.password, config.bcryptRounds), lastLoginAt: new Date()
  });
  audit(req, 'auth.register', { actor: user, targetType: 'user', target: user._id, meta: { role } });
  res.status(201).json(session(user));
}));

r.post('/login', authLimiter, wrap(async (req, res) => {
  const b = validate({ email: v.email(), password: v.str({ trim: false, min: 1, max: 128 }) }, req.body);
  const u = await User.findOne({ email: b.email }).select('+password name email company role isActive tokenVersion lockUntil');
  if (u?.lockUntil && u.lockUntil > new Date()) throw new HttpError(429, 'Too many failed sign-in attempts. Please try again in a few minutes.');
  const ok = await bcrypt.compare(b.password, u ? u.password : DUMMY_HASH);
  if (!u || !ok) {
    if (u) {
      const upd = await User.findByIdAndUpdate(u._id, { $inc: { failedLogins: 1 } }, { new: true }).select('failedLogins');
      if (upd && upd.failedLogins >= config.maxLoginAttempts) {
        await User.updateOne({ _id: u._id }, { $set: { lockUntil: new Date(Date.now() + config.lockMinutes * 60000), failedLogins: 0 } });
        audit(req, 'auth.lockout', { actor: u, targetType: 'user', target: u._id });
      }
    }
    throw new HttpError(401, 'Email or password is incorrect.');
  }
  if (!u.isActive) throw new HttpError(403, 'This account has been deactivated. Please contact your administrator.', { code: 'ACCOUNT_DEACTIVATED' });
  if (!User.ROLES.includes(u.role)) throw new HttpError(403, 'This account has no valid role.');
  await User.updateOne({ _id: u._id }, { $set: { failedLogins: 0, lastLoginAt: new Date() }, $unset: { lockUntil: 1 } });
  res.json(session(u));
}));

r.get('/me', authenticate, (req, res) => res.json({ user: publicUser(req.user) }));

r.patch('/me', authenticate, wrap(async (req, res) => {
  const b = validate({ name: v.str({ min: 2, max: 80 }), company: v.str({ max: 120 }) }, req.body, { partial: true });
  Object.assign(req.user, b);
  await req.user.save();
  res.json({ user: publicUser(req.user) });
}));

r.post('/change-password', authenticate, authLimiter, wrap(async (req, res) => {
  const b = validate({ currentPassword: v.str({ trim: false, min: 1, max: 128 }), newPassword: v.password() }, req.body);
  const u = await User.findById(req.user._id).select('+password tokenVersion name email company role isActive');
  if (!(await bcrypt.compare(b.currentPassword, u.password))) throw new HttpError(400, 'Current password is incorrect.');
  u.password = await bcrypt.hash(b.newPassword, config.bcryptRounds);
  u.tokenVersion = (u.tokenVersion || 0) + 1;   // signs out every other session
  u.passwordChangedAt = new Date();
  await u.save();
  audit(req, 'auth.password_change', { targetType: 'user', target: u._id });
  res.json(session(u));
}));

module.exports = r;
