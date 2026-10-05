// Allows running without installed dependencies: dotenv is only needed to read .env files.
const Module = require('module'), _load = Module._load;
Module._load = function (req, ...a) { return req === 'dotenv' ? { config() {} } : _load.call(this, req, ...a); };
process.env.JWT_SECRET = 'x'.repeat(40); process.env.RATE_LIMIT = 'on';
const test = require('node:test'), assert = require('node:assert/strict');
const { rules: v, validate, sanitizeInput, idParam } = require('../../utils/validate');
const { allowedNext, canMove, STAGES, legacyStatusToStage } = require('../../utils/stages');
const { score, explain } = require('../../utils/matcher');
const { normalizeSkills } = require('../../utils/skillNormalize');
const { rateLimit, securityHeaders } = require('../../middleware/security');

test('validate rejects unknown fields (role / score / owner injection)', () => {
  const schema = { name: v.str({ min: 2 }), email: v.email() };
  assert.throws(() => validate(schema, { name: 'Al', email: 'a@b.co', role: 'admin' }), /Unexpected field/);
  assert.throws(() => validate(schema, { name: 'Al', email: 'a@b.co', score: 100 }), /Unexpected field/);
  assert.deepEqual(validate(schema, { name: ' Al ', email: 'A@B.CO' }), { name: 'Al', email: 'a@b.co' });
});
test('validate rejects NoSQL operator objects and wrong types', () => {
  const schema = { email: v.email(), password: v.str({ trim: false }) };
  assert.throws(() => validate(schema, { email: { $ne: '' }, password: 'x' }));
  assert.throws(() => validate(schema, { email: 'a@b.co', password: ['x'] }));
});
test('validate: ints, enums, ids, passwords, skills, partial', () => {
  assert.equal(validate({ n: v.int({ min: 0, max: 5 }) }, { n: '3' }).n, 3);
  assert.throws(() => validate({ n: v.int({ min: 0, max: 5 }) }, { n: 9 }));
  assert.throws(() => validate({ r: v.oneOf(['a', 'b']) }, { r: 'c' }));
  assert.throws(() => validate({ i: v.id() }, { i: 'nope' }));
  assert.throws(() => validate({ p: v.password() }, { p: 'short1' }));
  assert.throws(() => validate({ p: v.password() }, { p: 'onlyletters' }));
  assert.equal(validate({ p: v.password() }, { p: 'goodpass1' }).p, 'goodpass1');
  assert.deepEqual(validate({ s: v.skills() }, { s: 'React, node.js ,react' }).s, ['react', 'node.js']);
  assert.throws(() => validate({ a: v.str() }, {}, { partial: true }), /No changes/);
  assert.throws(() => validate({ a: v.str() }, {}), /required/);
});
test('sanitizeInput blocks $ and dotted keys', () => {
  let err; sanitizeInput({ body: { a: { $gt: '' } }, query: {}, params: {} }, {}, e => (err = e));
  assert.equal(err.status, 400);
  err = undefined; sanitizeInput({ body: { a: 1 }, query: {}, params: {} }, {}, e => (err = e));
  assert.equal(err, undefined);
});
test('idParam answers 404 for malformed ids', () => {
  let err; idParam('id')({ params: { id: 'zzz' } }, {}, e => (err = e));
  assert.equal(err.status, 404);
});
test('stage machine only allows valid transitions', () => {
  assert.ok(canMove('applied', 'screening'));
  assert.ok(!canMove('applied', 'hired'));
  assert.ok(!canMove('screening', 'interview'));
  assert.ok(!canMove('hired', 'rejected'));
  assert.deepEqual(allowedNext('hired'), []);
  assert.ok(canMove('rejected', 'screening'));
  for (const s of STAGES) assert.ok(Array.isArray(allowedNext(s)));
  assert.equal(legacyStatusToStage('review'), 'screening');
  assert.equal(legacyStatusToStage('shortlisted'), 'shortlisted');
  assert.equal(legacyStatusToStage('rejected'), 'rejected');
});
test('matcher scoring is unchanged and explain() does not alter it', () => {
  const job = { requiredSkills: ['react', 'node.js', 'docker', 'mongodb'], minExperience: 3, minEducation: 'bachelor', description: 'Build web applications with react and node.js backend services' };
  const cand = { skills: ['react', 'node.js', 'mongodb'], yearsExperience: 2, education: 'bachelor', projectsCount: 2, resumeText: 'react node.js applications backend services mongodb' };
  const s = score(cand, job);
  assert.deepEqual(s.breakdown, { skills: 33.8, experience: 20, education: 10, projects: 6.7, keywords: 4.2 });  // golden values produced by the original matcher
  assert.equal(s.score, 75);
  assert.equal(s.status, 'shortlisted');
  assert.deepEqual(s.missingSkills, ['docker']);
  const lines = explain(cand, job, s);
  assert.ok(lines.length >= 6 && lines[0].includes('3 of 4'));
  assert.equal(score(cand, job).score, 75);
});
test('normalizeSkills', () => assert.deepEqual(normalizeSkills(['  React ', 'react', 'Node.JS']), ['react', 'node.js']));
test('rate limiter blocks after max and sets headers', () => {
  const rl = rateLimit({ windowMs: 1000, max: 2, key: () => 'k' });
  const res = { setHeader() {} }; const out = [];
  for (let i = 0; i < 3; i++) rl({}, res, e => out.push(e));
  assert.equal(out[0], undefined); assert.equal(out[1], undefined); assert.equal(out[2].status, 429);
});
test('security headers', () => {
  const h = {}; securityHeaders({}, { setHeader: (k, val) => (h[k] = val) }, () => {});
  assert.equal(h['X-Content-Type-Options'], 'nosniff'); assert.equal(h['X-Frame-Options'], 'DENY');
});
