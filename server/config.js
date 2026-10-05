require('dotenv').config();

const env = process.env;
const isProd = env.NODE_ENV === 'production';
const WEAK_SECRETS = ['', 'change_me_to_a_long_random_string', 'secret', 'changeme', 'password'];

const secret = env.JWT_SECRET || '';
if (!secret) throw new Error('JWT_SECRET is required. Set it in server/.env');
const weak = WEAK_SECRETS.includes(secret) || secret.length < 32;
if (weak && isProd) throw new Error('JWT_SECRET must be a random string of at least 32 characters in production.');
if (weak) console.warn('[security] JWT_SECRET is weak. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');

const list = v => String(v || '').split(',').map(s => s.trim()).filter(Boolean);
const trust = env.TRUST_PROXY;

module.exports = {
  isProd,
  port: Number(env.PORT) || 5000,
  mongoUri: env.MONGO_URI,
  jwtSecret: secret,
  jwtIssuer: 'recruitiq',
  jwtExpiresIn: env.JWT_EXPIRES_IN || '1d',
  clientUrls: list(env.CLIENT_URL || 'http://localhost:5173'),
  // Public self-registration of recruiter accounts. Set to "false" to make recruiters admin-created only.
  allowRecruiterSignup: env.ALLOW_RECRUITER_SIGNUP !== 'false',
  adminEmails: list(env.ADMIN_EMAILS).map(e => e.toLowerCase()),
  adminBootstrap: { email: (env.ADMIN_EMAIL || '').toLowerCase(), password: env.ADMIN_PASSWORD || '', name: env.ADMIN_NAME || 'Administrator' },
  trustProxy: trust === undefined || trust === '' ? null : (/^\d+$/.test(trust) ? Number(trust) : trust === 'true'),
  bcryptRounds: Number(env.BCRYPT_ROUNDS) || 12,
  maxLoginAttempts: Number(env.MAX_LOGIN_ATTEMPTS) || 5,
  lockMinutes: Number(env.LOCK_MINUTES) || 15,
  rateLimitEnabled: env.RATE_LIMIT !== 'off'
};
