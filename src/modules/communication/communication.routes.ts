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

// Messages
router.get('/messages', authenticate, getMessages);
router.post('/messages', authenticate, sendMessage);

// Announcements
router.get('/announcements', getAnnouncements);
router.post('/announcements', authenticate, createAnnouncement);
router.put('/announcements/:id/acknowledge', authenticate, acknowledgeAnnouncement);

// Calendar & Meetings
router.get('/calendar/events', getCalendarEvents);
router.post('/calendar/events', authenticate, createCalendarEvent);

export default router;
