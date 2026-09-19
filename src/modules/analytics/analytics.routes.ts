import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getExecutiveOverview,
  getReportData,
  exportReportCSV
} from './analytics.controller';

const router = Router();

router.use(authenticate);

router.get('/executive', getExecutiveOverview);
router.get('/reports', getReportData);
router.get('/export', exportReportCSV);

export default router;
