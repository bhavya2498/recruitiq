const AuditLog = require('../models/AuditLog');
// Fire-and-forget security/admin audit trail. Never breaks the request.
function audit(req, action, { targetType, target, meta, actor } = {}) {
  const who = actor || req.user;
  AuditLog.create({
    actor: who?._id, actorRole: who?.role, action, targetType, target: target ? String(target) : undefined, meta, ip: req.ip
  }).catch(e => console.error('audit log failed:', e.message));
}
module.exports = audit;
