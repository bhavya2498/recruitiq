const config = require('./config');
const express = require('express'), cors = require('cors'), mongoose = require('mongoose');
const { securityHeaders, rateLimit } = require('./middleware/security');
const { sanitizeInput } = require('./utils/validate');
const errorHandler = require('./middleware/errors');

const app = express();
app.disable('x-powered-by');
if (config.trustProxy !== null) app.set('trust proxy', config.trustProxy);   // set TRUST_PROXY when behind a load balancer so rate limits see real IPs
app.use(securityHeaders);
app.use(cors({ origin: config.clientUrls, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'], maxAge: 600 }));
app.use(express.json({ limit: '100kb' }));
app.use(sanitizeInput);
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));

app.get('/api/health', (_, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/candidates', require('./routes/candidates'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/portal', require('./routes/portal'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found.' }));
app.use(errorHandler);

async function start() {
  await mongoose.connect(config.mongoUri);
  console.log('MongoDB connected');
  const models = ['User', 'Job', 'Candidate', 'AuditLog'].map(n => require('./models/' + n));
  await Promise.all(models.map(M => M.init()));           // build indexes (incl. the one-application-per-job rule) before serving
  const { runMigrations, ensureAdmin } = require('./migrations');
  await runMigrations();
  await ensureAdmin();
  const server = app.listen(config.port, () => console.log('API on port ' + config.port));
  const stop = () => server.close(() => mongoose.disconnect().then(() => process.exit(0)));
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
  return server;
}

if (require.main === module) start().catch(e => { console.error('Startup failed:', e.message); process.exit(1); });
module.exports = { app, start };
