const pdf = require('pdf-parse'), mammoth = require('mammoth'), path = require('path');
const SKILLS = require('./skills');
const esc = s => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');

async function extractText(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.pdf') return (await pdf(file.buffer)).text;
  if (ext === '.docx') return (await mammoth.extractRawText({ buffer: file.buffer })).value;
  throw Object.assign(new Error('Only PDF and DOCX resumes are supported.'), { status: 400 });
}
function detectSkills(text, extra = []) {
  const t = ' ' + text.toLowerCase().replace(/[,;|•()]/g, ' ') + ' ';
  return [...new Set([...SKILLS, ...extra.map(s => s.toLowerCase())])]
    .filter(s => new RegExp('(^|[^a-z0-9+#])' + esc(s) + '([^a-z0-9+#]|$)', 'i').test(t));
}
function detectYears(text) {
  let best = 0, sum = 0; const now = new Date().getFullYear();
  for (const m of text.matchAll(/(\d{1,2})\+?\s*(?:years|yrs)/gi)) best = Math.max(best, +m[1]);
  for (const m of text.matchAll(/((?:19|20)\d{2})\s*(?:-|–|to)\s*((?:19|20)\d{2}|present|current)/gi)) {
    const a = +m[1], b = /^\d/.test(m[2]) ? +m[2] : now; if (b >= a && b - a < 30) sum += b - a;
  }
  return Math.min(Math.max(best, sum), 40);
}
function detectEducation(text) {
  const t = text.toLowerCase();
  if (/ph\.?d|doctorate/.test(t)) return 'phd';
  if (/master|m\.?tech|m\.?sc|mba/.test(t)) return 'master';
  if (/bachelor|b\.?tech|\bb\.?e\b|b\.?sc|b\.?com|b\.?ca/.test(t)) return 'bachelor';
  if (/diploma/.test(t)) return 'diploma';
  return 'none';
}
function detectProjects(text) {
  const i = text.search(/\bprojects?\b/i);
  if (i < 0) return 0;
  return Math.min(text.slice(i, i + 1500).split('\n').filter(l => l.trim().length > 25).length, 6);
}
function parseResume(text, file, jobSkills) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const email = (text.match(/[\w.+-]+@[\w-]+\.[\w.]+/) || [])[0] || '';
  const phone = (text.match(/(\+?\d[\d\s().-]{8,14}\d)/) || [])[0] || '';
  const name = lines.find(l => /^[A-Za-z][A-Za-z .'-]{2,40}$/.test(l) && l.split(' ').length <= 4) || file.originalname.replace(/\.[^.]+$/, '');
  return { name, email, phone, skills: detectSkills(text, jobSkills), yearsExperience: detectYears(text), education: detectEducation(text), projectsCount: detectProjects(text) };
}
module.exports = { extractText, parseResume, detectSkills };
