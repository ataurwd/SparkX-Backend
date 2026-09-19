import { Router } from 'express';
import {
  getMeetings,
  createMeeting,
  toggleActionItem,
  addActionItem
} from './meeting.controller';

const router = Router();

router.get('/', getMeetings);
router.post('/', createMeeting);
router.put('/:id/action-items/:itemIndex/toggle', toggleActionItem);
router.post('/:id/action-items', addActionItem);

export default router;
