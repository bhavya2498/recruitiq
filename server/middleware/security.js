const config = require('../config');
const { HttpError } = require('../utils/http');

// Security headers for a JSON API (the API never serves HTML).
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  res.setHeader('Cache-Control', 'no-store');
  if (config.isProd) res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  next();
};

// Fixed-window in-memory limiter (per process). Put a shared limiter in front when running several instances.
function rateLimit({ windowMs, max, message = 'Too many requests. Please try again later.', key = req => req.ip }) {
  const hits = new Map();
  const timer = setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset <= now) hits.delete(k); }, windowMs);
  if (timer.unref) timer.unref();
  return (req, res, next) => {
    if (!config.rateLimitEnabled) return next();
    const k = String(key(req)), now = Date.now();
    let e = hits.get(k);
    if (!e || e.reset <= now) {
      if (hits.size > 100000) hits.clear();
      e = { count: 0, reset: now + windowMs }; hits.set(k, e);
    }
    e.count++;
    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', Math.max(0, max - e.count));
    if (e.count > max) {
      res.setHeader('Retry-After', Math.ceil((e.reset - now) / 1000));
      return next(new HttpError(429, message));
    }
    next();
  };
}

module.exports = { securityHeaders, rateLimit };
