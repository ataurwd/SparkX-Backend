import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { Message } from '../../models/Message';
import { Announcement } from '../../models/Announcement';
import { MeetingEvent } from '../../models/MeetingEvent';
import { User } from '../../models/User';

// ----------------- MESSAGING -----------------

const seedChatMessages = async (orgId: any, userId: any) => {
  const count = await Message.countDocuments({ organizationId: orgId });
  if (count > 0) return;

  const demoMessages = [
    {
      organizationId: orgId,
      conversationType: 'channel',
      channelName: '#general',
      participants: [userId],
      senderId: userId,
      senderName: 'Ataur Rahman',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      content: 'Welcome everyone to the SparkX Company Operating System workspace! All Q3 milestones are tracking on target.',
      readBy: [userId],
      createdAt: new Date(Date.now() - 4 * 3600 * 1000)
    },
    {
      organizationId: orgId,
      conversationType: 'channel',
      channelName: '#general',
      participants: [userId],
      senderId: userId,
      senderName: 'Alex Morgan',
      senderAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100',
      content: 'Reminder: New onboarding checklists and asset management desks are live under the HR Operations tab.',
      readBy: [userId],
      createdAt: new Date(Date.now() - 2 * 3600 * 1000)
    },
    {
      organizationId: orgId,
      conversationType: 'channel',
      channelName: '#engineering',
      participants: [userId],
      senderId: userId,
      senderName: 'Sarah Jenkins',
      senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
      content: 'Sprint 42 deployed cleanly. All 43 frontend routes and API endpoints passed CI test suites.',
      readBy: [userId],
      createdAt: new Date(Date.now() - 1 * 3600 * 1000)
    },
    {
      organizationId: orgId,
      conversationType: 'channel',
      channelName: '#product-design',
      participants: [userId],
      senderId: userId,
      senderName: 'David Chen',
      senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
      content: 'Strict solid color design system with zero gradients has been verified on both light and dark modes.',
      readBy: [userId],
      createdAt: new Date(Date.now() - 30 * 60 * 1000)
    }
  ];

  await Message.insertMany(demoMessages);
};

export const getMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const userId = req.user?.userId;
    const { channelName, conversationType, recipientId } = req.query;

    if (orgId && userId) {
      await seedChatMessages(orgId, userId);
    }

    const filter: any = { organizationId: orgId };
    if (channelName && String(channelName).startsWith('dm_')) {
      filter.channelName = String(channelName);
    } else if (conversationType === 'direct' && recipientId) {
      filter.conversationType = 'direct';
      filter.participants = { $all: [req.user?.userId, recipientId] };
    } else {
      filter.conversationType = 'channel';
      filter.channelName = channelName || '#general';
    }

    const messages = await Message.find(filter)
      .sort({ createdAt: 1 })
      .limit(150);

    res.status(200).json({ success: true, data: messages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const userId = req.user?.userId;
    const { conversationType, channelName, recipientId, content, attachments } = req.body;

    if (!content || !content.trim()) {
      res.status(400).json({ success: false, message: 'Message content is required' });
      return;
    }

    // Role check for #announcements channel: only management and HR can broadcast
    if (channelName === '#announcements') {
      const userRole = (req.user?.role || '').toLowerCase();
      const isPrivileged =
        userRole.includes('owner') ||
        userRole.includes('hr') ||
        userRole.includes('admin') ||
        userRole.includes('manager') ||
        userRole.includes('lead') ||
        userRole.includes('director') ||
        userRole.includes('ceo');

      if (!isPrivileged) {
        res.status(403).json({
          success: false,
          message: 'Only Executives, HR Administrators, and Managers can post in #announcements.'
        });
        return;
      }
    }

    const user = await User.findById(userId);
    const senderName = user ? `${user.firstName} ${user.lastName}` : 'Team Member';
    const senderAvatar = user?.avatarUrl || '';

    const isDirect = conversationType === 'direct' || (channelName && String(channelName).startsWith('dm_'));
    const participants = [userId];
    if (recipientId && String(recipientId) !== String(userId)) {
      try {
        participants.push(recipientId);
      } catch {}
    }

    const message = new Message({
      organizationId: orgId,
      conversationType: isDirect ? 'direct' : 'channel',
      channelName: channelName || '#general',
      participants,
      senderId: userId,
      senderName,
      senderAvatar,
      content: content.trim(),
      attachments: attachments || [],
      readBy: [userId]
    });

    await message.save();
    res.status(201).json({ success: true, data: message });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ----------------- ANNOUNCEMENTS -----------------

export const getAnnouncements = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { category, priority } = req.query;

    const filter: any = { organizationId: orgId };
    if (category && category !== 'all') filter.category = category;
    if (priority && priority !== 'all') filter.priority = priority;

    const announcements = await Announcement.find(filter)
      .populate('departmentId', 'name color')
      .sort({ pinned: -1, createdAt: -1 });

    res.status(200).json({ success: true, data: announcements });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createAnnouncement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const userId = req.user?.userId;
    const { title, content, category, priority, targetAudience, departmentId, pinned, attachments } = req.body;

    if (!title || !content) {
      res.status(400).json({ success: false, message: 'Title and content are required' });
      return;
    }

    // Role verification: only management and HR can broadcast official announcements
    const userRole = (req.user?.role || '').toLowerCase();
    const isPrivileged =
      userRole.includes('owner') ||
      userRole.includes('hr') ||
      userRole.includes('admin') ||
      userRole.includes('manager') ||
      userRole.includes('lead') ||
      userRole.includes('director') ||
      userRole.includes('ceo');

    if (!isPrivileged) {
      res.status(403).json({
        success: false,
        message: 'Only Executives, HR Administrators, and Managers can create company announcements.'
      });
      return;
    }

    const user = await User.findById(userId);
    const authorName = user ? `${user.firstName} ${user.lastName}` : 'Company Leadership';

    const announcement = new Announcement({
      organizationId: orgId,
      authorId: userId,
      authorName,
      title,
      content,
      category: category || 'company_news',
      priority: priority || 'normal',
      targetAudience: targetAudience || 'all',
      departmentId: departmentId || undefined,
      pinned: !!pinned,
      attachments: attachments || [],
      acknowledgedBy: [userId]
    });

    await announcement.save();
    res.status(201).json({ success: true, data: announcement });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const acknowledgeAnnouncement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const userId = req.user?.userId;
    const { id } = req.params;

    const announcement = await Announcement.findOneAndUpdate(
      { _id: id, organizationId: orgId },
      { $addToSet: { acknowledgedBy: userId } },
      { new: true }
    );

    if (!announcement) {
      res.status(404).json({ success: false, message: 'Announcement not found' });
      return;
    }

    res.status(200).json({ success: true, data: announcement });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ----------------- CALENDAR & MEETINGS -----------------

export const getCalendarEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { start, end, eventType } = req.query;

    const filter: any = { organizationId: orgId };
    if (eventType && eventType !== 'all') filter.eventType = eventType;

    if (start && end) {
      filter.startDate = { $gte: new Date(start as string), $lte: new Date(end as string) };
    }

    const events = await MeetingEvent.find(filter).sort({ startDate: 1 });
    res.status(200).json({ success: true, data: events });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCalendarEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const userId = req.user?.userId;
    const {
      title,
      description,
      eventType,
      startDate,
      endDate,
      allDay,
      meetingLink,
      roomLocation,
      color,
      participants
    } = req.body;

    if (!title || !startDate || !endDate) {
      res.status(400).json({ success: false, message: 'Title, start date, and end date are required' });
      return;
    }

    const user = await User.findById(userId);
    const organizerName = user ? `${user.firstName} ${user.lastName}` : 'Event Organizer';

    const event = new MeetingEvent({
      organizationId: orgId,
      title,
      description: description || '',
      eventType: eventType || 'meeting',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      allDay: !!allDay,
      organizerId: userId,
      organizerName,
      meetingLink: meetingLink || (eventType === 'meeting' ? 'https://meet.sparkx.io/' + Math.random().toString(36).substring(7) : ''),
      roomLocation: roomLocation || 'Main Conference Room / Virtual',
      color: color || '#6C5CE7',
      participants: participants || [userId]
    });

    await event.save();
    res.status(201).json({ success: true, data: event });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
