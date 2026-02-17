const { AuditLog } = require('../models/AuditLog');

async function writeAudit({ action, entityType, entityId, summary, meta }) {
  try {
    await AuditLog.create({
      action,
      entityType,
      entityId,
      summary: summary ?? '',
      meta: meta ?? null
    });
  } catch (e) {
    // 审计日志失败不应影响主流程
  }
}

module.exports = { writeAudit };

