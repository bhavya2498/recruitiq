// Application pipeline: Applied -> Screening -> Shortlisted -> Interview -> Hired / Rejected
const STAGES = ['applied', 'screening', 'shortlisted', 'interview', 'hired', 'rejected'];

// Allowed transitions. "hired" is final. A rejected application can be re-opened to screening.
const TRANSITIONS = {
  applied: ['screening', 'rejected'],
  screening: ['shortlisted', 'rejected'],
  shortlisted: ['interview', 'screening', 'rejected'],
  interview: ['hired', 'shortlisted', 'rejected'],
  hired: [],
  rejected: ['screening']
};

const allowedNext = stage => TRANSITIONS[stage] || [];
const canMove = (from, to) => allowedNext(from).includes(to);

// Legacy screening decision (Candidate.status) -> pipeline stage, used by the data migration.
const legacyStatusToStage = status => (status === 'shortlisted' ? 'shortlisted' : status === 'rejected' ? 'rejected' : 'screening');

module.exports = { STAGES, TRANSITIONS, allowedNext, canMove, legacyStatusToStage };
