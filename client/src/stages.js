export const STAGES = ['applied', 'screening', 'shortlisted', 'interview', 'hired', 'rejected'];
export const label = s => (s ? s[0].toUpperCase() + s.slice(1) : '');
export const fmt = d => (d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '');
