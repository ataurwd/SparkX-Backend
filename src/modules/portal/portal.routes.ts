import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getManagerApprovals,
  decideManagerApproval,
  resetManagerApprovals,
  getManagerStats
} from './portal.controller';

const router = Router();

// Protect all portal routes with auth
router.use(authenticate);

// Manager Hub endpoints
router.get('/manager/approvals', getManagerApprovals);
router.put('/manager/approvals/:itemType/:id', decideManagerApproval);
router.post('/manager/approvals/reset', resetManagerApprovals);
router.get('/manager/stats', getManagerStats);

export default router;
