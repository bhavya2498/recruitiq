// Small strict validator. Every API input goes through it, so only known fields with the right
// primitive type ever reach the database (blocks mass-assignment such as role/score/owner and
// NoSQL operator objects like {"$ne": null}).
const { HttpError } = require('./http');
const { normalizeSkills } = require('./skillNormalize');

const ID_RE = /^[a-f0-9]{24}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const rules = {
  str: (o = {}) => ({ kind: 'str', ...o }),
  email: (o = {}) => ({ kind: 'str', lower: true, max: 254, pattern: EMAIL_RE, patternMsg: 'must be a valid email address', ...o }),
  password: (o = {}) => ({
    kind: 'str', trim: false, min: 8, max: 128,
    custom: pw => (/[A-Za-z]/.test(pw) && /\d/.test(pw) ? null : 'must contain at least one letter and one number'), ...o
  }),
  int: (o = {}) => ({ kind: 'int', ...o }),
  oneOf: (list, o = {}) => ({ kind: 'enum', list, ...o }),
  id: (o = {}) => ({ kind: 'id', ...o }),
  skills: (o = {}) => ({ kind: 'skills', ...o })
};

// Returns { value } or { error }.
function check(rule, raw) {
  switch (rule.kind) {
    case 'str': {
      if (typeof raw !== 'string') return { error: 'must be text' };
      if (CONTROL_RE.test(raw)) return { error: 'contains invalid characters' };
      let s = rule.trim === false ? raw : raw.trim();
      if (rule.lower) s = s.toLowerCase();
      if (s === '' && rule.optional) return { value: '' };
      const min = rule.min ?? 1;
      if (s.length < min) return { error: min === 1 ? 'is required' : `must be at least ${min} characters` };
      if (rule.max && s.length > rule.max) return { error: `must be at most ${rule.max} characters` };
      if (rule.pattern && !rule.pattern.test(s)) return { error: rule.patternMsg || 'is invalid' };
      if (rule.custom) { const e = rule.custom(s); if (e) return { error: e }; }
      return { value: s };
    }
    case 'int': {
      const n = typeof raw === 'number' ? raw : (typeof raw === 'string' && /^-?\d+$/.test(raw.trim()) ? Number(raw) : NaN);
      if (!Number.isInteger(n)) return { error: 'must be a whole number' };
      if (rule.min !== undefined && n < rule.min) return { error: `must be at least ${rule.min}` };
      if (rule.max !== undefined && n > rule.max) return { error: `must be at most ${rule.max}` };
      return { value: n };
    }
    case 'bool': return typeof raw === 'boolean' ? { value: raw } : { error: 'must be true or false' };
    case 'enum': return typeof raw === 'string' && rule.list.includes(raw) ? { value: raw } : { error: `must be one of: ${rule.list.join(', ')}` };
    case 'id': return typeof raw === 'string' && ID_RE.test(raw) ? { value: raw } : { error: 'is not a valid id' };
    case 'skills': {
      if (!(typeof raw === 'string' || (Array.isArray(raw) && raw.every(x => typeof x === 'string')))) return { error: 'must be a list of skills' };
      const list = normalizeSkills(raw);
      if (list.length > 40) return { error: 'can contain at most 40 skills' };
      if (list.some(s => s.length > 50 || CONTROL_RE.test(s))) return { error: 'contains an invalid skill' };
      return { value: list };
    }
    default: return { error: 'is invalid' };
  }
}
rules.bool = (o = {}) => ({ kind: 'bool', ...o });

// validate(schema, data, { partial }) -> cleaned object. Unknown fields are rejected.
function validate(schema, data, { partial = false } = {}) {
  if (data === undefined || data === null) data = {};
  if (typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'Invalid request body.');
  const unknown = Object.keys(data).filter(k => !Object.prototype.hasOwnProperty.call(schema, k));
  if (unknown.length) throw new HttpError(400, `Unexpected field(s): ${unknown.slice(0, 5).join(', ')}.`);
  const out = {}, details = [];
  for (const [key, rule] of Object.entries(schema)) {
    const raw = data[key];
    if (raw === undefined || raw === null) {
      if (!partial && !rule.optional) details.push({ field: key, message: 'is required' });
      continue;
    }
    const r = check(rule, raw);
    if (r.error) details.push({ field: key, message: r.error }); else out[key] = r.value;
  }
  if (details.length) throw new HttpError(400, details.map(d => `${rule_label(d.field)} ${d.message}.`).join(' '), { details });
  if (partial && !Object.keys(out).length) throw new HttpError(400, 'No changes supplied.');
  return out;
}
const rule_label = k => k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());

// Route param guard: rejects malformed ObjectIds with 404 instead of a CastError/500.
const idParam = (...names) => (req, res, next) => {
  for (const n of names) if (!ID_RE.test(String(req.params[n] || ''))) return next(new HttpError(404, 'Not found.'));
  next();
};

// Rejects MongoDB operator injection ({"$gt": ""}) and dotted keys anywhere in body/query/params.
function hasUnsafeKeys(v, depth = 0) {
  if (v === null || typeof v !== 'object') return false;
  if (depth > 10) return true;
  for (const k of Object.keys(v)) {
    if (k.startsWith('$') || k.includes('.') || k === '__proto__') return true;
    if (hasUnsafeKeys(v[k], depth + 1)) return true;
  }
  return false;
}
const sanitizeInput = (req, res, next) =>
  [req.body, req.query, req.params].some(x => hasUnsafeKeys(x)) ? next(new HttpError(400, 'Request contains invalid characters.')) : next();

module.exports = { rules, validate, idParam, sanitizeInput, check, ID_RE };
