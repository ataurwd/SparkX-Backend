import { Request, Response } from 'express';
import { Notification } from '../../models/Notification';

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const organizationId = user?.organizationId || '650000000000000000000001';

    const query: any = { organizationId };
    if (user?._id) {
      query.$or = [{ userId: user._id }, { userId: null }];
    }

    let notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    // If database has 0 notifications, seed a realistic enterprise batch
    if (notifications.length === 0) {
      const demoNotifications = [
        {
          organizationId,
          title: 'Leave Request Approved',
          message: 'Your 2-day casual leave starting next Monday was approved by Sarah Jenkins.',
          type: 'leave' as const,
          link: '/leave',
          isRead: false
        },
        {
          organizationId,
          title: 'New Sprint Task Assigned',
          message: 'Alex Rivera assigned you to task SPX-102: Audit WCAG 2.1 Contrast ratios.',
          type: 'task' as const,
          link: '/tasks',
          isRead: false
        },
        {
          organizationId,
          title: 'September Payroll Generated',
          message: 'Your September 2026 salary breakdown and payslip have been published.',
          type: 'payroll' as const,
          link: '/payroll/my-payslips',
          isRead: false
        },
        {
          organizationId,
          title: 'Company Notice: Q3 All-Hands',
          message: 'Alex Rivera posted: SparkX Global Q3 All-Hands Meeting this Thursday.',
          type: 'announcement' as const,
          link: '/announcements',
          isRead: true
        },
        {
          organizationId,
          title: 'Performance Review Window Open',
          message: 'Quarterly OKR calibration cycle is now active. Please submit self-appraisal.',
          type: 'performance' as const,
          link: '/performance/reviews',
          isRead: true
        }
      ];

      try {
        await Notification.insertMany(demoNotifications);
        notifications = (await Notification.find(query).sort({ createdAt: -1 }).limit(30).lean()) as any;
      } catch (e) {
        console.warn('Could not seed demo notifications:', e);
      }
    }

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.json({
      success: true,
      data: notifications,
      unreadCount
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const markNotificationRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const markAllNotificationsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const organizationId = user?.organizationId || '650000000000000000000001';

    const query: any = { organizationId, isRead: false };
    if (user?._id) {
      query.$or = [{ userId: user._id }, { userId: null }];
    }

    await Notification.updateMany(query, { isRead: true });

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const organizationId = user?.organizationId || '650000000000000000000001';
    const { title, message, type = 'system', link = '', userId } = req.body;

    if (!title || !message) {
      res.status(400).json({ success: false, message: 'Title and message are required' });
      return;
    }

    const notification = await Notification.create({
      organizationId,
      userId: userId || undefined,
      title,
      message,
      type,
      link,
      isRead: false
    });

    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
