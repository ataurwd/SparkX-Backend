import { Router } from 'express';
import { getAuditLogs, exportAuditLogsCSV } from './audit.controller';

const router = Router();

router.get('/', getAuditLogs);
router.get('/export', exportAuditLogsCSV);

export default router;
