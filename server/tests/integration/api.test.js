// Integration tests: need installed dependencies and a MongoDB. Use a THROWAWAY database:
//   TEST_MONGO_URI=mongodb://127.0.0.1:27017/recruitiq_test npm run test:integration
process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration-test-secret-integration-test-secret';
process.env.RATE_LIMIT = 'off'; process.env.BCRYPT_ROUNDS = '4';
const test = require('node:test'), assert = require('node:assert/strict');
const mongoose = require('mongoose'), bcrypt = require('bcryptjs');
if (!process.env.TEST_MONGO_URI) { console.log('Set TEST_MONGO_URI to run integration tests.'); process.exit(0); }
process.env.MONGO_URI = process.env.TEST_MONGO_URI;
const { app } = require('../../server');
const User = require('../../models/User'), Candidate = require('../../models/Candidate'), Job = require('../../models/Job');
const { runMigrations } = require('../../migrations');

let base, server;
const call = async (method, path, { token, body, form } = {}) => {
  const headers = {}; if (token) headers.Authorization = 'Bearer ' + token;
  let payload; if (form) payload = form; else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const r = await fetch(base + path, { method, headers, body: payload });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const pdf = text => {  // minimal single-page PDF with a text layer
  const lines = text.split('\n').map(l => `(${l.replace(/[()\\]/g, '')}) Tj T*`).join('\n');
  const stream = `BT /F1 11 Tf 50 780 Td 14 TL\n${lines}\nET`;
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let out = '%PDF-1.4\n', xref = [];
  objs.forEach((o, i) => { xref.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const at = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + xref.map(x => String(x).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${at}\n%%EOF`;
  return Buffer.from(out);
};
const RESUME = 'Jane Candidate\njane@example.com\nSkills: React, Node.js, MongoDB, Docker\n5 years of experience building web applications\nBachelor of Technology in Computer Science\nProjects\nBuilt an applicant tracking system with React and Node.js\nBuilt a dashboard using MongoDB aggregation pipelines';
const resumeForm = () => { const f = new FormData(); f.append('resume', new Blob([pdf(RESUME)], { type: 'application/pdf' }), 'jane.pdf'); return f; };
const signup = async (role, n) => (await call('POST', '/api/auth/register', { body: { name: n, email: n.toLowerCase().replace(/\s/g, '') + '@t.io', password: 'Passw0rdX', role } })).body;

test.before(async () => {
  await mongoose.connect(process.env.TEST_MONGO_URI); await mongoose.connection.dropDatabase();
  await Promise.all([User, Job, Candidate].map(M => M.init()));
  server = app.listen(0); base = 'http://127.0.0.1:' + server.address().port;
});
test.after(async () => { server.close(); await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

test('RBAC, ownership, applications, stages, privacy and deactivation', async () => {
  // registration cannot create admins or smuggle fields
  assert.equal((await call('POST', '/api/auth/register', { body: { name: 'Eve Evil', email: 'eve@t.io', password: 'Passw0rdX', role: 'admin' } })).status, 400);
  assert.equal((await call('POST', '/api/auth/register', { body: { name: 'Eve Evil', email: 'eve@t.io', password: 'Passw0rdX', isActive: true } })).status, 400);
  const recA = await signup('recruiter', 'Rec A'), recB = await signup('recruiter', 'Rec B'), cand = await signup('candidate', 'Jane Candidate');
  await User.create({ name: 'Boss', email: 'boss@t.io', role: 'admin', password: await bcrypt.hash('Passw0rdX', 4) });
  const admin = (await call('POST', '/api/auth/login', { body: { email: 'boss@t.io', password: 'Passw0rdX' } })).body;

  // candidates cannot reach recruiter/admin APIs; recruiters cannot reach admin/portal
  assert.equal((await call('GET', '/api/jobs', { token: cand.token })).status, 403);
  assert.equal((await call('GET', '/api/admin/users', { token: recA.token })).status, 403);
  assert.equal((await call('GET', '/api/portal/jobs', { token: recA.token })).status, 403);
  assert.equal((await call('GET', '/api/jobs')).status, 401);

  const job = (await call('POST', '/api/jobs', { token: recA.token, body: { title: 'Full Stack Dev', description: 'Build web apps', requiredSkills: 'React, Node.js, Docker, Kubernetes', minExperience: 3, minEducation: 'bachelor' } })).body;
  assert.equal((await call('POST', '/api/jobs', { token: recA.token, body: { title: 'X1', description: 'd', owner: recB.user.id } })).status, 400);   // owner injection
  assert.equal((await call('GET', '/api/jobs/' + job._id, { token: recB.token })).status, 404);                                                   // cross-user access
  assert.equal((await call('GET', '/api/candidates/job/' + job._id, { token: recB.token })).status, 404);

  // candidate: must have a resume, then applies once
  const jobs = (await call('GET', '/api/portal/jobs', { token: cand.token })).body;
  assert.equal(jobs.items.length, 1); assert.equal(jobs.items[0].owner, undefined);
  assert.equal((await call('POST', `/api/portal/jobs/${job._id}/apply`, { token: cand.token })).status, 400);
  assert.equal((await call('POST', '/api/portal/profile/resume', { token: cand.token, form: resumeForm() })).status, 200);
  const applied = await call('POST', `/api/portal/jobs/${job._id}/apply`, { token: cand.token });
  assert.equal(applied.status, 201); assert.equal(applied.body.stage, 'applied'); assert.equal(applied.body.score, undefined);
  assert.equal((await call('POST', `/api/portal/jobs/${job._id}/apply`, { token: cand.token })).status, 409);
  assert.equal(await Candidate.countDocuments({ job: job._id, applicant: { $exists: true } }), 1);
  const mine = (await call('GET', '/api/portal/applications', { token: cand.token })).body;
  assert.equal(mine.length, 1); assert.equal(JSON.stringify(mine).includes('score'), false); assert.equal(JSON.stringify(mine).includes('notes'), false);

  // recruiter A sees a server-scored, ranked, explainable record
  const list = (await call('GET', '/api/candidates/job/' + job._id, { token: recA.token })).body;
  assert.equal(list.length, 1); assert.equal(list[0].rank, 1); assert.ok(list[0].score > 0);
  const cid = list[0]._id;
  const detail = (await call('GET', '/api/candidates/' + cid, { token: recA.token })).body;
  assert.ok(detail.explanation.length >= 6); assert.deepEqual(detail.missingSkills, ['kubernetes']);
  assert.equal((await call('GET', '/api/candidates/' + cid, { token: recB.token })).status, 404);

  // score / ranking / owner manipulation is rejected
  for (const body of [{ stage: 'screening', score: 100 }, { stage: 'screening', rank: 1 }, { stage: 'screening', owner: recB.user.id }])
    assert.equal((await call('PATCH', `/api/candidates/${cid}/stage`, { token: recA.token, body })).status, 400);
  assert.equal((await call('PATCH', `/api/candidates/${cid}`, { token: recA.token, body: { score: 100 } })).status, 404);

  // stage validation + history
  const move = (stage, token = recA.token) => call('PATCH', `/api/candidates/${cid}/stage`, { token, body: { stage } });
  assert.equal((await move('hired')).status, 409);
  assert.equal((await move('shortlisted')).status, 409);
  assert.equal((await move('screening')).status, 200);
  assert.equal((await move('shortlisted')).status, 200);
  assert.equal((await move('interview')).status, 200);
  assert.equal((await move('hired')).status, 200);
  assert.equal((await move('rejected')).status, 409);                      // hired is final
  assert.equal((await move('screening', recB.token)).status, 404);
  assert.equal((await call('GET', '/api/candidates/' + cid, { token: recA.token })).body.history.length, 5);

  // private notes never reach the candidate
  assert.equal((await call('POST', `/api/candidates/${cid}/notes`, { token: recA.token, body: { body: 'Great communicator' } })).status, 201);
  assert.equal(JSON.stringify((await call('GET', '/api/portal/applications', { token: cand.token })).body).includes('communicator'), false);
  assert.equal((await call('POST', `/api/candidates/${cid}/notes`, { token: recB.token, body: { body: 'x' } })).status, 404);

  // rescore after requirement change keeps stage, history and notes
  const upd = await call('PUT', '/api/jobs/' + job._id, { token: recA.token, body: { requiredSkills: 'react, node.js' } });
  assert.equal(upd.body.rescored, 1);
  const after = (await call('GET', '/api/candidates/' + cid, { token: recA.token })).body;
  assert.equal(after.stage, 'hired'); assert.deepEqual(after.missingSkills, []); assert.equal(after.notes.length, 1);

  // job with registered applications cannot be hard-deleted by a recruiter
  assert.equal((await call('DELETE', '/api/jobs/' + job._id, { token: recA.token })).status, 409);

  // admin: org-wide visibility, role/deactivation controls, last-admin and self protection
  assert.equal((await call('GET', '/api/jobs', { token: admin.token })).body.length, 1);
  assert.equal((await call('GET', '/api/admin/applications', { token: admin.token })).body.total, 1);
  assert.equal((await call('GET', '/api/analytics', { token: admin.token })).body.totals.hired, 1);
  assert.equal((await call('PATCH', '/api/admin/users/' + admin.user.id, { token: admin.token, body: { role: 'recruiter' } })).status, 400);
  assert.equal((await call('PATCH', '/api/admin/users/' + recA.user.id, { token: admin.token, body: { isActive: false } })).status, 200);
  const dead = await call('GET', '/api/jobs', { token: recA.token });
  assert.equal(dead.status, 403); assert.equal(dead.body.code, 'ACCOUNT_DEACTIVATED');
  assert.equal((await call('POST', '/api/auth/login', { body: { email: 'reca@t.io', password: 'Passw0rdX' } })).status, 403);
  assert.equal((await call('GET', '/api/portal/jobs', { token: cand.token })).body.items.length, 0);   // deactivated recruiter's jobs are hidden
  assert.equal((await call('PATCH', '/api/admin/users/' + recB.user.id, { token: admin.token, body: { role: 'candidate' } })).status, 200);
  assert.equal((await call('GET', '/api/jobs', { token: recB.token })).status, 401);                    // role change invalidates old tokens
});

test('login lockout after repeated failures', async () => {
  const u = await signup('candidate', 'Lock Me');
  for (let i = 0; i < 5; i++) assert.equal((await call('POST', '/api/auth/login', { body: { email: u.user.email, password: 'wrong-pass1' } })).status, 401);
  assert.equal((await call('POST', '/api/auth/login', { body: { email: u.user.email, password: 'Passw0rdX' } })).status, 429);
});

test('migration upgrades legacy data without losing anything', async () => {
  await mongoose.connection.dropDatabase(); await Promise.all([User, Job, Candidate].map(M => M.init()));
  const uid = new mongoose.Types.ObjectId(), jid = new mongoose.Types.ObjectId();
  await User.collection.insertOne({ _id: uid, name: 'Legacy HR', email: 'hr@old.io', password: await bcrypt.hash('oldpass', 4), company: 'Old Co' });
  await Job.collection.insertOne({ _id: jid, owner: uid, title: 'Old Job', description: 'desc', requiredSkills: ['react'], minExperience: 1, minEducation: 'any' });
  await Candidate.collection.insertMany([
    { owner: uid, job: jid, name: 'A', skills: ['react'], score: 90, breakdown: { skills: 45, experience: 30, education: 10, projects: 3, keywords: 2 }, matchedSkills: ['react'], missingSkills: [], recommendation: 'Strong match', status: 'shortlisted', resumeText: 'x' },
    { owner: uid, job: jid, name: 'B', skills: [], score: 30, breakdown: { skills: 0, experience: 20, education: 10, projects: 0, keywords: 0 }, matchedSkills: [], missingSkills: ['react'], recommendation: 'Weak match', status: 'rejected', resumeText: 'y' }
  ]);
  await runMigrations(); await runMigrations();   // idempotent
  const u = await User.findById(uid).select('+password');
  assert.equal(u.role, 'recruiter'); assert.equal(u.isActive, true); assert.ok(await bcrypt.compare('oldpass', u.password));
  assert.equal((await Job.findById(jid)).status, 'open');
  const [a, b] = await Candidate.find({ job: jid }).sort('name');
  assert.equal(a.stage, 'shortlisted'); assert.equal(b.stage, 'rejected'); assert.equal(a.score, 90); assert.equal(b.score, 30);
  assert.equal(a.history.length, 1); assert.ok(a.explanation.length >= 6); assert.equal(a.source, 'recruiter_upload');
  const login = await call('POST', '/api/auth/login', { body: { email: 'hr@old.io', password: 'oldpass' } });
  assert.equal(login.status, 200); assert.equal(login.body.user.role, 'recruiter');
  assert.equal((await call('GET', '/api/candidates/job/' + jid, { token: login.body.token })).body.length, 2);
});
