import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { MeetingSession } from '../../models/MeetingSession';
import { Organization } from '../../models/Organization';

const seedMeetingSessions = async (orgId: any) => {
  const count = await MeetingSession.countDocuments({ organizationId: orgId });
  if (count > 0) return;

  const sampleMeetings = [
    {
      organizationId: orgId,
      title: 'Weekly Executive Leadership Standup',
      department: 'Executive',
      meetingDate: new Date(Date.now() + 1 * 24 * 3600 * 1000),
      startTime: '10:00 AM',
      endTime: '11:00 AM',
      location: 'Executive Boardroom Alpha / Google Meet',
      meetingLink: 'https://meet.google.com/spk-exec-stn',
      organizerName: 'Ataur Rahman (CEO)',
      agenda: [
        'Review Q3 Revenue ARR vs Targets',
        'Headcount Expansion for AI/ML Engineering Team',
        'Review Enterprise Security Audit & SOC2 Timeline'
      ],
      notes: 'Reviewed Q3 MRR target ($24.8K achieved). Next sprint requires hiring 2 Senior DevOps engineers.',
      attendees: [
        { name: 'Ataur Rahman', role: 'CEO / Founder', present: true },
        { name: 'Sarah Jenkins', role: 'VP of Engineering', present: true },
        { name: 'Alex Morgan', role: 'Head of People & HR', present: true },
        { name: 'David Chen', role: 'Chief Product Officer', present: true }
      ],
      actionItems: [
        {
          task: 'Publish 2 Senior DevOps job posts on ATS portal',
          assignee: 'Alex Morgan',
          dueDate: new Date(Date.now() + 3 * 24 * 3600 * 1000),
          completed: false
        },
        {
          task: 'Finalize SOC2 compliance audit scope with external auditor',
          assignee: 'Sarah Jenkins',
          dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000),
          completed: false
        }
      ],
      status: 'scheduled'
    },
    {
      organizationId: orgId,
      title: 'Engineering Sprint 42 Planning & Retrospective',
      department: 'Engineering',
      meetingDate: new Date(Date.now() - 1 * 24 * 3600 * 1000),
      startTime: '02:00 PM',
      endTime: '03:30 PM',
      location: 'Dev Lab Delta / Zoom',
      meetingLink: 'https://zoom.us/j/9923812001',
      organizerName: 'Sarah Jenkins',
      agenda: [
        'Review completed sprint tickets and velocity',
        'Post-mortem on Redis caching latency spike',
        'Assign Sprint 42 epics and backend migrations'
      ],
      notes: 'Team completed 84 story points. Latency bottleneck was isolated to un-indexed MongoDB collection.',
      attendees: [
        { name: 'Sarah Jenkins', role: 'Lead Architect', present: true },
        { name: 'Karim Ahmed', role: 'Backend Engineer', present: true },
        { name: 'Jonathan Bell', role: 'Full Stack Engineer', present: true }
      ],
      actionItems: [
        {
          task: 'Add compound index on attendance collection for employeeId + date',
          assignee: 'Karim Ahmed',
          dueDate: new Date(Date.now() + 2 * 24 * 3600 * 1000),
          completed: true,
          completedAt: new Date()
        },
        {
          task: 'Upgrade frontend Turbopack cache configuration',
          assignee: 'Jonathan Bell',
          dueDate: new Date(Date.now() + 4 * 24 * 3600 * 1000),
          completed: false
        }
      ],
      status: 'completed'
    },
    {
      organizationId: orgId,
      title: 'Company-Wide Monthly Town Hall & OKR Alignment',
      department: 'All Company',
      meetingDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      startTime: '04:00 PM',
      endTime: '05:00 PM',
      location: 'Town Hall Auditorium / Global Live Stream',
      meetingLink: 'https://meet.google.com/spk-town-hall',
      organizerName: 'Alex Morgan (HR)',
      agenda: [
        'Welcome new team members and onboarding recognition',
        'Product Roadmap Reveal for SparkX 2.0',
        'Open Q&A with Senior Management'
      ],
      notes: 'Prepare presentation deck with departmental milestones.',
      attendees: [
        { name: 'Ataur Rahman', role: 'CEO', present: true },
        { name: 'All Staff', role: 'Participants', present: true }
      ],
      actionItems: [
        {
          task: 'Distribute Town Hall agenda slide deck to all departments',
          assignee: 'Alex Morgan',
          dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000),
          completed: false
        }
      ],
      status: 'scheduled'
    }
  ];

  await MeetingSession.insertMany(sampleMeetings);
};

export const getMeetings = async (req: Request, res: Response) => {
  try {
    let org = await Organization.findOne();
    if (!org) {
      org = await Organization.create({
        name: 'SparkX Global Tech',
        slug: 'sparkx-global',
        contactEmail: 'admin@sparkx.io'
      });
    }

    await seedMeetingSessions(org._id);

    const { department, search } = req.query;
    const query: any = { organizationId: org._id };

    if (department && department !== 'all') {
      query.department = department;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search as string, $options: 'i' } },
        { organizerName: { $regex: search as string, $options: 'i' } },
        { location: { $regex: search as string, $options: 'i' } }
      ];
    }

    const meetings = await MeetingSession.find(query).sort({ meetingDate: 1 });

    const allMeetings = await MeetingSession.find({ organizationId: org._id });
    const allActionItems = allMeetings.flatMap((m) => m.actionItems);
    const pendingActionItems = allActionItems.filter((a) => !a.completed).length;
    const completedActionItems = allActionItems.filter((a) => a.completed).length;

    return res.status(200).json({
      success: true,
      data: meetings,
      metrics: {
        totalMeetings: allMeetings.length,
        totalActionItems: allActionItems.length,
        pendingActionItems,
        completedActionItems
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createMeeting = async (req: Request, res: Response) => {
  try {
    let org = await Organization.findOne();
    if (!org) {
      org = await Organization.create({
        name: 'SparkX Global Tech',
        slug: 'sparkx-global',
        contactEmail: 'admin@sparkx.io'
      });
    }

    const {
      title,
      department,
      meetingDate,
      startTime,
      endTime,
      location,
      meetingLink,
      organizerName,
      agenda,
      notes
    } = req.body;

    const agendaArray = Array.isArray(agenda)
      ? agenda
      : typeof agenda === 'string'
      ? agenda.split('\n').filter((item) => item.trim().length > 0)
      : ['General Team Sync'];

    const meeting = await MeetingSession.create({
      organizationId: org._id,
      title,
      department: department || 'General',
      meetingDate: meetingDate ? new Date(meetingDate) : new Date(),
      startTime: startTime || '10:00 AM',
      endTime: endTime || '11:00 AM',
      location: location || 'Conference Room / Google Meet',
      meetingLink: meetingLink || 'https://meet.google.com/spk-sync-live',
      organizerName: organizerName || 'Meeting Lead',
      agenda: agendaArray,
      notes: notes || '',
      attendees: [
        { name: organizerName || 'Meeting Lead', role: 'Organizer', present: true },
        { name: 'Team Members', role: 'Participants', present: true }
      ],
      actionItems: [],
      status: 'scheduled'
    });

    return res.status(201).json({ success: true, data: meeting });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleActionItem = async (req: Request, res: Response) => {
  try {
    const { id, itemIndex } = req.params;

    const meeting = await MeetingSession.findById(id);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting session not found' });
    }

    const idx = parseInt(itemIndex, 10);
    if (idx < 0 || idx >= meeting.actionItems.length) {
      return res.status(400).json({ success: false, message: 'Invalid action item index' });
    }

    const item = meeting.actionItems[idx];
    item.completed = !item.completed;
    if (item.completed) {
      item.completedAt = new Date();
    } else {
      item.completedAt = undefined;
    }

    await meeting.save();
    return res.status(200).json({ success: true, data: meeting });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addActionItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { task, assignee, dueDate } = req.body;

    const meeting = await MeetingSession.findById(id);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting session not found' });
    }

    meeting.actionItems.push({
      task,
      assignee: assignee || 'Unassigned',
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 3 * 24 * 3600 * 1000),
      completed: false
    });

    await meeting.save();
    return res.status(200).json({ success: true, data: meeting });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
