import { Router } from 'express';
import {
  getLeaveTypes,
  createLeaveType,
  getMyLeaveBalances,
  applyLeave,
  getMyLeaveRequests,
  getLeaveApprovalQueue,
  reviewLeaveRequest
} from './leave.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

// Types & Balances
router.get('/types', getLeaveTypes);
router.post('/types', requirePermission('org.manage'), createLeaveType);
router.get('/balances', getMyLeaveBalances);

// Requests (Self-Service)
router.post('/apply', requirePermission('leave.apply'), applyLeave);
router.get('/my-requests', requirePermission('leave.apply'), getMyLeaveRequests);

// Two-Tier Approvals (Tier 1 Manager or Tier 2 HR)
router.get('/approvals', getLeaveApprovalQueue);
router.put('/approvals/:id', reviewLeaveRequest);

export default router;
