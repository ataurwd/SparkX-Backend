import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getMessages,
  sendMessage,
  getUnreadMessageCounts,
  markMessagesAsRead,
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
router.get('/messages/unread-counts', authenticate, getUnreadMessageCounts);
router.post('/messages/read', authenticate, markMessagesAsRead);

// Announcements
router.get('/announcements', getAnnouncements);
router.post('/announcements', authenticate, createAnnouncement);
router.put('/announcements/:id/acknowledge', authenticate, acknowledgeAnnouncement);

// Calendar & Meetings
router.get('/calendar/events', getCalendarEvents);
router.post('/calendar/events', authenticate, createCalendarEvent);

export default router;
