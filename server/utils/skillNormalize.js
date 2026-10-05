// Skill normalisation shared by job creation/editing and validation:
// accepts "a, b" or ["a","b"], trims, lower-cases, collapses spaces and removes duplicates.
function normalizeSkills(input) {
  const arr = Array.isArray(input) ? input : String(input || '').split(',');
  return [...new Set(arr.map(s => String(s).trim().toLowerCase().replace(/\s+/g, ' ')).filter(Boolean))];
}
module.exports = { normalizeSkills };
