import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getMessages,
  sendMessage,
  getAnnouncements,
  createAnnouncement,
  acknowledgeAnnouncement,
  getCalendarEvents,
  createCalendarEvent
} from './communication.controller';

const router = Router();

router.use(authenticate);

// Messages
router.get('/messages', getMessages);
router.post('/messages', sendMessage);

// Announcements
router.get('/announcements', getAnnouncements);
router.post('/announcements', createAnnouncement);
router.put('/announcements/:id/acknowledge', acknowledgeAnnouncement);

// Calendar & Meetings
router.get('/calendar/events', getCalendarEvents);
router.post('/calendar/events', createCalendarEvent);

export default router;
