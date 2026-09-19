import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { LeaveType, ILeaveType } from '../../models/LeaveType';
import { LeaveBalance } from '../../models/LeaveBalance';
import { LeaveRequest } from '../../models/LeaveRequest';
import { Employee } from '../../models/Employee';

// Default leave types seed template
const DEFAULT_LEAVE_TYPES = [
  { name: 'Annual / Paid Vacation', code: 'ANN', daysAllowed: 15, isPaid: true, color: '#6C5CE7' },
  { name: 'Casual Leave', code: 'CAS', daysAllowed: 10, isPaid: true, color: '#10B981' },
  { name: 'Medical / Sick Leave', code: 'SCK', daysAllowed: 10, isPaid: true, color: '#F59E0B' },
  { name: 'Emergency Leave', code: 'EMG', daysAllowed: 3, isPaid: true, color: '#EF4444' },
  { name: 'Maternity / Paternity', code: 'MAT', daysAllowed: 90, isPaid: true, color: '#0EA5E9' },
  { name: 'Unpaid Leave (LWP)', code: 'UNP', daysAllowed: 30, isPaid: false, color: '#5F6480' }
];

async function getEmployeeForUser(organizationId: string, userId: string, email?: string) {
  let employee = await Employee.findOne({ organizationId, userId });
  if (!employee && email) {
    employee = await Employee.findOne({ organizationId, email: email.toLowerCase().trim() });
    if (employee) {
      employee.userId = userId as any;
      await employee.save();
    }
  }
  if (!employee && email) {
    const count = await Employee.countDocuments({ organizationId });
    const namePart = email.split('@')[0];
    employee = await Employee.create({
      organizationId,
      userId,
      email: email.toLowerCase().trim(),
      firstName: namePart.charAt(0).toUpperCase() + namePart.slice(1),
      lastName: 'Leader',
      employeeCode: `SPX-${String(count + 1).padStart(4, '0')}`,
      joiningDate: new Date(),
      employmentStatus: 'active',
      workLocation: 'office'
    });
  }
  return employee;
}

// Auto-seed default leave types if none exist
export async function ensureDefaultLeaveTypes(organizationId: string): Promise<any[]> {
  let types = await LeaveType.find({ organizationId });
  if (types.length === 0) {
    const docs = DEFAULT_LEAVE_TYPES.map((t) => ({
      ...t,
      organizationId: new mongoose.Types.ObjectId(organizationId)
    }));
    types = (await LeaveType.insertMany(docs)) as any;
  }
  return types;
}

// Ensure employee has leave balances for the given year
async function ensureLeaveBalances(organizationId: string, employeeId: mongoose.Types.ObjectId, year: number) {
  const types = await ensureDefaultLeaveTypes(organizationId);
  const balances = [];

  for (const t of types) {
    let bal = await LeaveBalance.findOne({
      organizationId,
      employeeId,
      leaveTypeId: t._id,
      year
    });

    if (!bal) {
      bal = await LeaveBalance.create({
        organizationId,
        employeeId,
        leaveTypeId: t._id,
        year,
        totalDays: t.daysAllowed,
        usedDays: 0,
        pendingDays: 0,
        remainingDays: t.daysAllowed
      });
    }
    balances.push(bal);
  }
  return balances;
}

// --- LEAVE TYPES ---
export async function getLeaveTypes(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const types = await ensureDefaultLeaveTypes(organizationId);
    res.status(200).json({ success: true, data: types });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function createLeaveType(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const { name, code, daysAllowed, isPaid, color, description, requiresAttachment } = req.body;

    if (!name || !code) {
      res.status(400).json({ success: false, error: 'Name and code are required' });
      return;
    }

    const type = await LeaveType.create({
      organizationId,
      name,
      code: code.toUpperCase().trim(),
      daysAllowed: Number(daysAllowed) || 10,
      isPaid: isPaid !== undefined ? isPaid : true,
      color: color || '#6C5CE7',
      description,
      requiresAttachment: Boolean(requiresAttachment)
    });

    res.status(201).json({ success: true, data: type });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// --- LEAVE BALANCES ---
export async function getMyLeaveBalances(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const userId = req.user!.userId;
    const email = req.user!.email;
    const currentYear = new Date().getFullYear();

    const employee = await getEmployeeForUser(organizationId, userId, email);
    if (!employee) {
      res.status(200).json({ success: true, data: [] });
      return;
    }

    await ensureLeaveBalances(organizationId, employee._id as mongoose.Types.ObjectId, currentYear);

    const balances = await LeaveBalance.find({
      organizationId,
      employeeId: employee._id,
      year: currentYear
    }).populate('leaveTypeId');

    res.status(200).json({ success: true, data: balances });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// --- APPLY LEAVE ---
export async function applyLeave(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const userId = req.user!.userId;
    const email = req.user!.email;
    const { leaveTypeId, startDate, endDate, reason, attachmentUrl } = req.body;

    if (!leaveTypeId || !startDate || !endDate || !reason) {
      res.status(400).json({ success: false, error: 'Leave type, start date, end date, and reason are required' });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      res.status(400).json({ success: false, error: 'End date cannot be earlier than start date' });
      return;
    }

    // Calculate total days inclusive
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const employee = await getEmployeeForUser(organizationId, userId, email);
    if (!employee) {
      res.status(404).json({ success: false, error: 'Employee record not found' });
      return;
    }

    const currentYear = start.getFullYear();
    await ensureLeaveBalances(organizationId, employee._id as mongoose.Types.ObjectId, currentYear);

    const balance = await LeaveBalance.findOne({
      organizationId,
      employeeId: employee._id,
      leaveTypeId,
      year: currentYear
    });

    if (balance && balance.remainingDays < totalDays) {
      res.status(400).json({
        success: false,
        error: `Insufficient leave balance. You have ${balance.remainingDays} days remaining for this category.`
      });
      return;
    }

    const request = await LeaveRequest.create({
      organizationId,
      employeeId: employee._id,
      leaveTypeId,
      startDate: start,
      endDate: end,
      totalDays,
      reason,
      attachmentUrl,
      status: 'pending_manager' // Tier 1 starts here!
    });

    // Update pending balance
    if (balance) {
      balance.pendingDays += totalDays;
      balance.remainingDays = balance.totalDays - (balance.usedDays + balance.pendingDays);
      await balance.save();
    }

    const populated = await LeaveRequest.findById(request._id)
      .populate('leaveTypeId')
      .populate('employeeId', 'firstName lastName employeeCode');

    res.status(201).json({
      success: true,
      message: 'Leave application submitted for Manager (Tier 1) review',
      data: populated
    });
  } catch (error: any) {
    console.error('[Apply Leave Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// --- MY LEAVE REQUESTS ---
export async function getMyLeaveRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const userId = req.user!.userId;

    const employee = await getEmployeeForUser(organizationId, userId);
    if (!employee) {
      res.status(200).json({ success: true, data: [] });
      return;
    }

    const requests = await LeaveRequest.find({ organizationId, employeeId: employee._id })
      .populate('leaveTypeId')
      .populate('managerApproval.approverId', 'firstName lastName')
      .populate('hrApproval.approverId', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: requests });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// --- TWO-TIER APPROVAL QUEUE ---
export async function getLeaveApprovalQueue(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const role = req.user!.role;
    const { status = 'all' } = req.query;

    const query: any = { organizationId };

    if (status === 'pending') {
      if (role === 'HR Admin') {
        query.status = 'pending_hr';
      } else if (role === 'Department Manager' || role === 'Team Lead') {
        query.status = 'pending_manager';
      } else {
        query.status = { $in: ['pending_manager', 'pending_hr'] };
      }
    } else if (status !== 'all') {
      query.status = status;
    }

    const requests = await LeaveRequest.find(query)
      .populate('leaveTypeId')
      .populate({
        path: 'employeeId',
        select: 'firstName lastName employeeCode avatarUrl departmentId designationId',
        populate: [
          { path: 'departmentId', select: 'name code color' },
          { path: 'designationId', select: 'title' }
        ]
      })
      .populate('managerApproval.approverId', 'firstName lastName')
      .populate('hrApproval.approverId', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: requests });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// --- REVIEW (APPROVE / REJECT) TWO-TIER STEP ---
export async function reviewLeaveRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const userId = req.user!.userId;
    const role = req.user!.role;
    const { id } = req.params;
    const { decision, comment } = req.body; // decision: 'approve' | 'reject'

    if (!decision || !['approve', 'reject'].includes(decision)) {
      res.status(400).json({ success: false, error: "Decision must be 'approve' or 'reject'" });
      return;
    }

    const request = await LeaveRequest.findOne({ _id: id, organizationId });
    if (!request) {
      res.status(404).json({ success: false, error: 'Leave request not found' });
      return;
    }

    const year = request.startDate.getFullYear();
    const balance = await LeaveBalance.findOne({
      organizationId,
      employeeId: request.employeeId,
      leaveTypeId: request.leaveTypeId,
      year
    });

    const isHrOrOwner = ['Owner', 'HR Admin', 'Super Admin'].includes(role);
    const isManager = ['Department Manager', 'Team Lead'].includes(role);

    // --- STEP 1: Manager Tier 1 Review ---
    if (request.status === 'pending_manager') {
      if (decision === 'approve') {
        request.managerApproval = {
          approverId: new mongoose.Types.ObjectId(userId),
          status: 'approved',
          decidedAt: new Date(),
          comment
        };
        request.status = 'pending_hr'; // Advance to Tier 2!
      } else {
        request.managerApproval = {
          approverId: new mongoose.Types.ObjectId(userId),
          status: 'rejected',
          decidedAt: new Date(),
          comment
        };
        request.status = 'rejected';
        request.rejectionReason = comment || 'Rejected by Manager (Tier 1)';

        // Refund pending balance
        if (balance) {
          balance.pendingDays = Math.max(0, balance.pendingDays - request.totalDays);
          balance.remainingDays = balance.totalDays - (balance.usedDays + balance.pendingDays);
          await balance.save();
        }
      }
      await request.save();

      res.status(200).json({
        success: true,
        message: decision === 'approve'
          ? 'Manager approval granted. Request forwarded to HR (Tier 2).'
          : 'Leave request rejected by Manager.',
        data: request
      });
      return;
    }

    // --- STEP 2: HR Tier 2 Final Review ---
    if (request.status === 'pending_hr') {
      if (!isHrOrOwner) {
        res.status(403).json({ success: false, error: 'Only HR Admin or Executive Authority can finalize Tier 2 approvals' });
        return;
      }

      if (decision === 'approve') {
        request.hrApproval = {
          approverId: new mongoose.Types.ObjectId(userId),
          status: 'approved',
          decidedAt: new Date(),
          comment
        };
        request.status = 'approved';

        // Finalize balance: move from pending to used
        if (balance) {
          balance.pendingDays = Math.max(0, balance.pendingDays - request.totalDays);
          balance.usedDays += request.totalDays;
          balance.remainingDays = balance.totalDays - (balance.usedDays + balance.pendingDays);
          await balance.save();
        }
      } else {
        request.hrApproval = {
          approverId: new mongoose.Types.ObjectId(userId),
          status: 'rejected',
          decidedAt: new Date(),
          comment
        };
        request.status = 'rejected';
        request.rejectionReason = comment || 'Rejected by HR Admin (Tier 2)';

        // Refund pending balance
        if (balance) {
          balance.pendingDays = Math.max(0, balance.pendingDays - request.totalDays);
          balance.remainingDays = balance.totalDays - (balance.usedDays + balance.pendingDays);
          await balance.save();
        }
      }
      await request.save();

      res.status(200).json({
        success: true,
        message: decision === 'approve'
          ? 'Leave request fully approved by HR Admin!'
          : 'Leave request rejected by HR Admin.',
        data: request
      });
      return;
    }

    res.status(400).json({
      success: false,
      error: `Cannot review request currently in '${request.status}' status`
    });
  } catch (error: any) {
    console.error('[Review Leave Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
