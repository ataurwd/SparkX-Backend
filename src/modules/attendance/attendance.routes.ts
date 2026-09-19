import { Router } from 'express';
import {
  checkIn,
  checkOut,
  getMyTodayAttendance,
  getMyAttendanceHistory,
  getAllAttendance,
  manualAdjustAttendance
} from './attendance.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

// Personal Self-Service
router.post('/check-in', requirePermission('attendance.checkin'), checkIn);
router.post('/check-out', requirePermission('attendance.checkin'), checkOut);
router.get('/today', getMyTodayAttendance);
router.get('/my-history', getMyAttendanceHistory);

// Management / HR
router.get('/all', requirePermission('attendance.read'), getAllAttendance);
router.post('/adjust', requirePermission('attendance.manage'), manualAdjustAttendance);

export default router;
