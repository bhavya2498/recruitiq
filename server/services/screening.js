// Single place where resumes are parsed, scored and re-scored. It only calls the existing
// parser and matcher, so scoring behaviour is identical for uploads, applications and rescoring.
const Candidate = require('../models/Candidate');
const { parseResume, detectSkills } = require('../utils/parser');
const { score, explain } = require('../utils/matcher');

const MAX_TEXT = 100000;

// Parse + score a resume against a job. Returns the fields to store on a Candidate record.
function screen({ text, fileName }, job) {
  text = String(text || '').slice(0, MAX_TEXT);
  const p = parseResume(text, { originalname: fileName || 'resume' }, job.requiredSkills);
  const s = score({ ...p, resumeText: text }, job);
  return { parsed: p, text, result: { ...s, explanation: explain(p, job, s) } };
}

// Re-run matching for a stored record against the job's CURRENT requirements.
// Skills are re-detected from the stored resume text (so newly added required skills are found).
// Pipeline stage, history and notes are never touched.
function rescoreFields(c, job) {
  const skills = detectSkills(c.resumeText || '', job.requiredSkills);
  const cand = {
    skills, yearsExperience: c.yearsExperience || 0, education: c.education || 'none',
    projectsCount: c.projectsCount || 0, resumeText: c.resumeText || ''
  };
  const s = score(cand, job);
  return { skills, ...s, explanation: explain(cand, job, s), rescoredAt: new Date() };
}

async function rescoreJob(job) {
  let n = 0, ops = [];
  const flush = async () => { if (ops.length) { await Candidate.bulkWrite(ops); ops = []; } };
  for await (const c of Candidate.find({ job: job._id }).lean().cursor()) {
    ops.push({ updateOne: { filter: { _id: c._id }, update: { $set: rescoreFields(c, job) } } });
    n++;
    if (ops.length >= 200) await flush();
  }
  await flush();
  return n;
}

module.exports = { screen, rescoreFields, rescoreJob };
