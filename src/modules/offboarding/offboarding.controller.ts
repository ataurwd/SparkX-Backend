import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Offboarding } from '../../models/Offboarding';
import { Organization } from '../../models/Organization';

const defaultClearanceItems = [
  {
    department: 'it' as const,
    title: 'Return Company Hardware & Peripherals',
    description: 'Surrender assigned MacBook/laptop, chargers, monitors, and security access keycard.',
    cleared: false
  },
  {
    department: 'it' as const,
    title: 'Revoke Cloud System & Identity Access',
    description: 'De-provision Google Workspace, Slack, GitHub org, AWS/GCP, and VPN credentials.',
    cleared: false
  },
  {
    department: 'manager' as const,
    title: 'Knowledge Transfer & Project Documentation',
    description: 'Hand over repository documentation, sprint handover notes, and client credentials.',
    cleared: false
  },
  {
    department: 'manager' as const,
    title: 'Reassign Active Jira Tasks & Project Ownership',
    description: 'Transfer all assigned tasks and lead responsibilities to peer team members.',
    cleared: false
  },
  {
    department: 'finance' as const,
    title: 'Final Settlement & Leave Encashment Audit',
    description: 'Calculate unspent earned leave, gratuity, and final month pro-rated payroll dues.',
    cleared: false
  },
  {
    department: 'finance' as const,
    title: 'Settle Corporate Cards & Expense Dues',
    description: 'Clear pending reimbursement claims and cancel corporate banking cards.',
    cleared: false
  },
  {
    department: 'hr' as const,
    title: 'Conduct Formal Exit Interview',
    description: 'Complete 30-minute structured exit feedback session with Head of HR.',
    cleared: false
  },
  {
    department: 'hr' as const,
    title: 'Issue Experience Certificate & Non-Disclosure Signoff',
    description: 'Sign departure agreement, NDA acknowledgment, and release service letter.',
    cleared: false
  }
];

const seedOffboardings = async (orgId: any) => {
  const count = await Offboarding.countDocuments({ organizationId: orgId });
  if (count > 0) return;

  const dummyEmp1 = new mongoose.Types.ObjectId();
  const dummyEmp2 = new mongoose.Types.ObjectId();

  const items1 = JSON.parse(JSON.stringify(defaultClearanceItems));
  items1[0].cleared = true;
  items1[0].clearedBy = 'IT Desk';
  items1[0].clearedAt = new Date(Date.now() - 2 * 24 * 3600 * 1000);
  items1[2].cleared = true;
  items1[2].clearedBy = 'Sarah Jenkins (Lead)';
  items1[2].clearedAt = new Date(Date.now() - 3 * 24 * 3600 * 1000);
  items1[3].cleared = true;
  items1[3].clearedBy = 'Sarah Jenkins (Lead)';
  items1[3].clearedAt = new Date(Date.now() - 3 * 24 * 3600 * 1000);
  const progress1 = Math.round((3 / items1.length) * 100);

  const items2 = JSON.parse(JSON.stringify(defaultClearanceItems));
  items2.forEach((item: any) => {
    item.cleared = true;
    item.clearedBy = 'Authorized Signer';
    item.clearedAt = new Date(Date.now() - 10 * 24 * 3600 * 1000);
  });
  const progress2 = 100;

  const sampleWorkflows = [
    {
      organizationId: orgId,
      employeeId: dummyEmp1,
      employeeName: 'Jonathan Bell',
      employeeEmail: 'jonathan.b@sparkx.io',
      department: 'Engineering',
      role: 'Senior Full Stack Engineer',
      resignationDate: new Date(Date.now() - 15 * 24 * 3600 * 1000),
      noticePeriodDays: 30,
      lastWorkingDay: new Date(Date.now() + 15 * 24 * 3600 * 1000),
      reason: 'Higher Studies (MS in CS abroad)',
      status: 'in_progress',
      progress: progress1,
      clearanceItems: items1,
      exitInterview: {
        conducted: false,
        rating: 5,
        notes: ''
      },
      notes: 'All pull requests transferred to Karim. Outstanding code review completed.'
    },
    {
      organizationId: orgId,
      employeeId: dummyEmp2,
      employeeName: 'Priya Sharma',
      employeeEmail: 'priya.s@sparkx.io',
      department: 'Design',
      role: 'Product UI/UX Designer',
      resignationDate: new Date(Date.now() - 40 * 24 * 3600 * 1000),
      noticePeriodDays: 30,
      lastWorkingDay: new Date(Date.now() - 10 * 24 * 3600 * 1000),
      reason: 'Relocation to Toronto',
      status: 'cleared',
      progress: progress2,
      clearanceItems: items2,
      exitInterview: {
        conducted: true,
        rating: 5,
        notes: 'Highly rated culture, transparent sprint retrospectives, and management support.',
        conductedBy: 'Alex Morgan (HR)',
        conductedAt: new Date(Date.now() - 11 * 24 * 3600 * 1000)
      },
      notes: 'Final settlement processed and experience letter emailed.'
    }
  ];

  await Offboarding.insertMany(sampleWorkflows);
};

export const getOffboardings = async (req: Request, res: Response) => {
  try {
    let org = await Organization.findOne();
    if (!org) {
      org = await Organization.create({
        name: 'SparkX Global Tech',
        slug: 'sparkx-global',
        contactEmail: 'admin@sparkx.io'
      });
    }

    await seedOffboardings(org._id);

    const { status, search } = req.query;
    const query: any = { organizationId: org._id };

    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { employeeName: { $regex: search as string, $options: 'i' } },
        { department: { $regex: search as string, $options: 'i' } },
        { role: { $regex: search as string, $options: 'i' } }
      ];
    }

    const workflows = await Offboarding.find(query).sort({ lastWorkingDay: 1 });

    const allWorkflows = await Offboarding.find({ organizationId: org._id });
    const inProgressCount = allWorkflows.filter((w) => w.status === 'in_progress' || w.status === 'initiated').length;
    const clearedCount = allWorkflows.filter((w) => w.status === 'cleared').length;

    return res.status(200).json({
      success: true,
      data: workflows,
      metrics: {
        totalDepartures: allWorkflows.length,
        inProgressCount,
        clearedCount
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createOffboarding = async (req: Request, res: Response) => {
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
      employeeName,
      employeeEmail,
      department,
      role,
      noticePeriodDays,
      reason,
      notes
    } = req.body;

    const noticeDays = Number(noticePeriodDays) || 30;
    const lastWorkingDay = new Date(Date.now() + noticeDays * 24 * 3600 * 1000);

    const offboarding = await Offboarding.create({
      organizationId: org._id,
      employeeId: new mongoose.Types.ObjectId(),
      employeeName,
      employeeEmail: employeeEmail || `${employeeName.toLowerCase().replace(/\s+/g, '.')}@sparkx.io`,
      department: department || 'Engineering',
      role: role || 'Software Specialist',
      resignationDate: new Date(),
      noticePeriodDays: noticeDays,
      lastWorkingDay,
      reason: reason || 'Career Growth',
      status: 'in_progress',
      progress: 0,
      clearanceItems: JSON.parse(JSON.stringify(defaultClearanceItems)),
      notes: notes || ''
    });

    return res.status(201).json({ success: true, data: offboarding });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleClearanceItem = async (req: Request, res: Response) => {
  try {
    const { id, itemIndex } = req.params;
    const { clearedBy } = req.body;

    const offboarding = await Offboarding.findById(id);
    if (!offboarding) {
      return res.status(404).json({ success: false, message: 'Offboarding workflow not found' });
    }

    const idx = parseInt(itemIndex, 10);
    if (idx < 0 || idx >= offboarding.clearanceItems.length) {
      return res.status(400).json({ success: false, message: 'Invalid clearance item index' });
    }

    const item = offboarding.clearanceItems[idx];
    item.cleared = !item.cleared;
    if (item.cleared) {
      item.clearedBy = clearedBy || 'HR Admin';
      item.clearedAt = new Date();
    } else {
      item.clearedBy = '';
      item.clearedAt = undefined;
    }

    // Recalculate progress
    const clearedTotal = offboarding.clearanceItems.filter((it) => it.cleared).length;
    offboarding.progress = Math.round((clearedTotal / offboarding.clearanceItems.length) * 100);

    if (offboarding.progress === 100) {
      offboarding.status = 'cleared';
    } else if (offboarding.status === 'cleared') {
      offboarding.status = 'in_progress';
    }

    await offboarding.save();
    return res.status(200).json({ success: true, data: offboarding });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const submitExitInterview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, feedback, conductedBy } = req.body;

    const offboarding = await Offboarding.findById(id);
    if (!offboarding) {
      return res.status(404).json({ success: false, message: 'Offboarding workflow not found' });
    }

    offboarding.exitInterview = {
      conducted: true,
      rating: Number(rating) || 5,
      notes: feedback || '',
      conductedBy: conductedBy || 'HR Lead',
      conductedAt: new Date()
    };

    await offboarding.save();
    return res.status(200).json({ success: true, data: offboarding });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
