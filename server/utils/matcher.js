const RANK = { none: 0, any: 0, diploma: 1, bachelor: 2, master: 3, phd: 4 };
const STOP = new Set('about above after again being below between could doing during each from have having here into just more most other over same should some such than that their them then there these they this those through under until very were what when where which while will with would your you our and the for are but not all can has had its who how work team role candidate looking ability strong good experience skills required preferred years'.split(' '));
const kw = t => [...new Set(t.toLowerCase().match(/[a-z][a-z+#.]{3,}/g) || [])].filter(w => !STOP.has(w));

function score(cand, job) {
  const req = job.requiredSkills.map(s => s.toLowerCase());
  const have = new Set(cand.skills);
  const matched = req.filter(s => have.has(s)), missing = req.filter(s => !have.has(s));
  const skills = req.length ? matched.length / req.length * 45 : 45;
  const experience = job.minExperience ? Math.min(1, cand.yearsExperience / job.minExperience) * 30 : 30;
  const education = RANK[job.minEducation] === 0 ? 10 : Math.min(1, RANK[cand.education] / RANK[job.minEducation]) * 10;
  const projects = Math.min(cand.projectsCount, 3) / 3 * 10;
  const jd = kw(job.description).slice(0, 40), rt = cand.resumeText.toLowerCase();
  const keywords = jd.length ? jd.filter(w => rt.includes(w)).length / jd.length * 5 : 5;
  const r = n => Math.round(n * 10) / 10;
  const breakdown = { skills: r(skills), experience: r(experience), education: r(education), projects: r(projects), keywords: r(keywords) };
  const total = Math.round(Object.values(breakdown).reduce((a, b) => a + b, 0));
  const status = total >= 75 ? 'shortlisted' : total >= 50 ? 'review' : 'rejected';
  const recommendation = total >= 85 ? 'Strong match' : total >= 75 ? 'Good match' : total >= 50 ? 'Partial match: review manually' : 'Weak match';
  return { score: total, breakdown, matchedSkills: matched, missingSkills: missing, status, recommendation };
}

// Plain-language reasons behind a score. Purely descriptive: it never changes the score itself.
function explain(cand, job, result) {
  const b = result.breakdown, req = job.requiredSkills || [];
  const lines = [];
  lines.push(req.length
    ? `Skills (${b.skills}/45): matched ${result.matchedSkills.length} of ${req.length} required skills` + (result.missingSkills.length ? `; missing ${result.missingSkills.join(', ')}.` : '.')
    : `Skills (${b.skills}/45): the job lists no required skills, so full points were given.`);
  lines.push(job.minExperience
    ? `Experience (${b.experience}/30): ${cand.yearsExperience || 0} year(s) detected against ${job.minExperience} required.`
    : `Experience (${b.experience}/30): no minimum experience set, so full points were given.`);
  lines.push(RANK[job.minEducation] === 0
    ? `Education (${b.education}/10): no minimum education set, so full points were given.`
    : `Education (${b.education}/10): ${cand.education && cand.education !== 'none' ? cand.education : 'no recognised degree'} detected against ${job.minEducation} required.`);
  lines.push(`Projects (${b.projects}/10): ${cand.projectsCount || 0} project entr${cand.projectsCount === 1 ? 'y' : 'ies'} detected (full points at 3).`);
  lines.push(`Keywords (${b.keywords}/5): overlap between the job description and the resume text.`);
  lines.push(`Result: ${result.score}% - ${result.recommendation}.`);
  return lines;
}
module.exports = { score, explain };
