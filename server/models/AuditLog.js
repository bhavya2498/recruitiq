const m = require('mongoose');
module.exports = m.model('AuditLog', new m.Schema({
  actor: { type: m.Schema.Types.ObjectId, ref: 'User' },
  actorRole: String,
  action: { type: String, required: true, index: true },
  targetType: String,
  target: String,
  meta: m.Schema.Types.Mixed,
  ip: String
}, { timestamps: { createdAt: true, updatedAt: false } }));
