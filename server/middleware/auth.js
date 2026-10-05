const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');
const { HttpError, wrap } = require('../utils/http');

const ID_RE = /^[a-f0-9]{24}$/i;

// Verifies the JWT, then loads the user from the database on EVERY request so that role changes,
// deactivation and password resets take effect immediately. The role is never read from the token.
const authenticate = wrap(async (req, res, next) => {
  const m = /^Bearer (\S+)$/.exec(req.headers.authorization || '');
  if (!m) throw new HttpError(401, 'Please sign in.');
  let payload;
  try { payload = jwt.verify(m[1], config.jwtSecret, { algorithms: ['HS256'], issuer: config.jwtIssuer }); }
  catch { throw new HttpError(401, 'Your session has expired. Please sign in again.'); }
  if (!ID_RE.test(String(payload.sub))) throw new HttpError(401, 'Please sign in again.');
  const user = await User.findById(payload.sub).select('name email company role isActive tokenVersion');
  if (!user || (user.tokenVersion || 0) !== payload.tv) throw new HttpError(401, 'Your session has expired. Please sign in again.');
  if (!user.isActive) throw new HttpError(403, 'This account has been deactivated. Please contact your administrator.', { code: 'ACCOUNT_DEACTIVATED' });
  if (!User.ROLES.includes(user.role)) throw new HttpError(403, 'This account has no valid role.');
  req.user = user;
  req.userId = String(user._id);
  next();
});

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : next(new HttpError(403, 'You do not have permission to perform this action.'));

const signToken = user => jwt.sign({ tv: user.tokenVersion || 0 }, config.jwtSecret, {
  algorithm: 'HS256', issuer: config.jwtIssuer, subject: String(user._id), expiresIn: config.jwtExpiresIn
});

module.exports = authenticate;
module.exports.authenticate = authenticate;
module.exports.requireRole = requireRole;
module.exports.signToken = signToken;
