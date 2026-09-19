import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { LeaveRequest } from '../../models/LeaveRequest';
import { ExpenseClaim } from '../../models/ExpenseClaim';
import { Employee } from '../../models/Employee';
import { LeaveType } from '../../models/LeaveType';
import { Task } from '../../models/Task';
import { AttendanceRecord } from '../../models/AttendanceRecord';
import { Department } from '../../models/Department';
import { Designation } from '../../models/Designation';

// Ensure demo employees and pending requests exist in MongoDB Atlas
export async function ensureDemoPortalData(organizationId: string): Promise<void> {
  const orgObjId = new mongoose.Types.ObjectId(organizationId);

  // 1. Ensure Engineering & Design Departments exist
  let engDept = await Department.findOne({ organizationId: orgObjId, code: 'ENG' });
  if (!engDept) {
    engDept = await Department.create({
      organizationId: orgObjId,
      name: 'Engineering & Technology',
      code: 'ENG',
      color: '#6C5CE7',
      description: 'Core software engineering and architecture'
    });
  }

  let designDept = await Department.findOne({ organizationId: orgObjId, code: 'DSN' });
  if (!designDept) {
    designDept = await Department.create({
      organizationId: orgObjId,
      name: 'Product Design & UX',
      code: 'DSN',
      color: '#00B894',
      description: 'UI/UX and product design team'
    });
  }

  // 2. Ensure Designations exist
  let techLeadDesig = await Designation.findOne({ organizationId: orgObjId, title: 'Frontend Tech Lead' });
  if (!techLeadDesig) {
    techLeadDesig = await Designation.create({
      organizationId: orgObjId,
      departmentId: engDept._id,
      title: 'Frontend Tech Lead',
      level: 4
    });
  }

  let designerDesig = await Designation.findOne({ organizationId: orgObjId, title: 'Senior Product Designer' });
  if (!designerDesig) {
    designerDesig = await Designation.create({
      organizationId: orgObjId,
      departmentId: designDept._id,
      title: 'Senior Product Designer',
      level: 3
    });
  }

  let backendDesig = await Designation.findOne({ organizationId: orgObjId, title: 'Staff Backend Architect' });
  if (!backendDesig) {
    backendDesig = await Designation.create({
      organizationId: orgObjId,
      departmentId: engDept._id,
      title: 'Staff Backend Architect',
      level: 5
    });
  }

  let peopleDesig = await Designation.findOne({ organizationId: orgObjId, title: 'People Ops Lead' });
  if (!peopleDesig) {
    peopleDesig = await Designation.create({
      organizationId: orgObjId,
      departmentId: engDept._id,
      title: 'People Ops Lead',
      level: 4
    });
  }

  // 3. Ensure Employees exist in MongoDB
  let marcus = await Employee.findOne({ organizationId: orgObjId, email: 'marcus.vance@sparkx.io' });
  if (!marcus) {
    marcus = await Employee.create({
      organizationId: orgObjId,
      firstName: 'Marcus',
      lastName: 'Vance',
      email: 'marcus.vance@sparkx.io',
      employeeCode: 'SPX-0101',
      departmentId: engDept._id,
      designationId: techLeadDesig._id,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      employmentStatus: 'active',
      workLocation: 'office',
      joiningDate: new Date('2024-01-15')
    });
  }

  let sophia = await Employee.findOne({ organizationId: orgObjId, email: 'sophia.chen@sparkx.io' });
  if (!sophia) {
    sophia = await Employee.create({
      organizationId: orgObjId,
      firstName: 'Sophia',
      lastName: 'Chen',
      email: 'sophia.chen@sparkx.io',
      employeeCode: 'SPX-0102',
      departmentId: designDept._id,
      designationId: designerDesig._id,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      employmentStatus: 'active',
      workLocation: 'remote',
      joiningDate: new Date('2024-03-01')
    });
  }

  let alex = await Employee.findOne({ organizationId: orgObjId, email: 'alex.rivera@sparkx.io' });
  if (!alex) {
    alex = await Employee.create({
      organizationId: orgObjId,
      firstName: 'Alex',
      lastName: 'Rivera',
      email: 'alex.rivera@sparkx.io',
      employeeCode: 'SPX-0103',
      departmentId: engDept._id,
      designationId: backendDesig._id,
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
      employmentStatus: 'active',
      workLocation: 'office',
      joiningDate: new Date('2023-11-20')
    });
  }

  let elena = await Employee.findOne({ organizationId: orgObjId, email: 'elena.rostova@sparkx.io' });
  if (!elena) {
    elena = await Employee.create({
      organizationId: orgObjId,
      firstName: 'Elena',
      lastName: 'Rostova',
      email: 'elena.rostova@sparkx.io',
      employeeCode: 'SPX-0104',
      departmentId: engDept._id,
      designationId: peopleDesig._id,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      employmentStatus: 'active',
      workLocation: 'hybrid',
      joiningDate: new Date('2024-02-10')
    });
  }

  // 4. Ensure Leave Types exist
  let casualLeave = await LeaveType.findOne({ organizationId: orgObjId, code: 'CAS' });
  if (!casualLeave) {
    casualLeave = await LeaveType.create({
      organizationId: orgObjId,
      name: 'Casual Leave',
      code: 'CAS',
      daysAllowed: 10,
      isPaid: true,
      color: '#10B981'
    });
  }

  let medicalLeave = await LeaveType.findOne({ organizationId: orgObjId, code: 'SCK' });
  if (!medicalLeave) {
    medicalLeave = await LeaveType.create({
      organizationId: orgObjId,
      name: 'Medical / Sick Leave',
      code: 'SCK',
      daysAllowed: 10,
      isPaid: true,
      color: '#F59E0B'
    });
  }

  // 5. Seed initial pending leave requests only if neither Marcus nor Alex have any pending leave
  const pendingLeavesCount = await LeaveRequest.countDocuments({
    organizationId: orgObjId,
    employeeId: { $in: [marcus._id, alex._id] },
    status: { $in: ['pending_manager', 'pending'] }
  });

  const allUserLeavesCount = await LeaveRequest.countDocuments({
    organizationId: orgObjId,
    employeeId: { $in: [marcus._id, alex._id] }
  });

  // If no leave requests exist at all for them, seed the 2 demo leaves
  if (allUserLeavesCount === 0) {
    await LeaveRequest.create([
      {
        organizationId: orgObjId,
        employeeId: marcus._id,
        leaveTypeId: casualLeave._id,
        startDate: new Date('2026-09-23'),
        endDate: new Date('2026-09-24'),
        totalDays: 2,
        reason: 'Family event out of town',
        status: 'pending_manager',
        managerApproval: { status: 'pending' },
        hrApproval: { status: 'pending' }
      },
      {
        organizationId: orgObjId,
        employeeId: alex._id,
        leaveTypeId: medicalLeave._id,
        startDate: new Date('2026-09-21'),
        endDate: new Date('2026-09-21'),
        totalDays: 1,
        reason: 'Routine annual health checkup',
        status: 'pending_manager',
        managerApproval: { status: 'pending' },
        hrApproval: { status: 'pending' }
      }
    ]);
  }

  // 6. Seed initial pending expense claim for Sophia Chen if none exists
  const sophiaExpensesCount = await ExpenseClaim.countDocuments({
    organizationId: orgObjId,
    employeeEmail: 'sophia.chen@sparkx.io'
  });

  if (sophiaExpensesCount === 0) {
    await ExpenseClaim.create({
      organizationId: orgObjId,
      employeeId: sophia._id,
      employeeName: 'Sophia Chen',
      employeeEmail: 'sophia.chen@sparkx.io',
      department: 'Product Design',
      title: 'Home Office Equipment Claim',
      category: 'hardware',
      amount: 240.0,
      currency: 'USD',
      notes: 'Ergonomic keyboard and monitor riser stipend',
      expenseDate: new Date('2026-09-19'),
      status: 'pending'
    });
  }
}

// GET /api/portal/manager/approvals
export async function getManagerApprovals(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const orgId = req.user!.organizationId;
    const orgObjId = new mongoose.Types.ObjectId(orgId);

    // Auto-ensure initial demo data exists in MongoDB
    await ensureDemoPortalData(orgId);

    // 1. Fetch pending leave requests
    const leaves = await LeaveRequest.find({
      organizationId: orgObjId,
      status: { $in: ['pending_manager', 'pending'] }
    })
      .populate('employeeId')
      .populate('leaveTypeId')
      .sort({ createdAt: -1 });

    // 2. Fetch pending expense claims
    const expenses = await ExpenseClaim.find({
      organizationId: orgObjId,
      status: 'pending'
    }).sort({ createdAt: -1 });

    // 3. Format into unified pending queue
    const mappedLeaves = leaves.map((l: any) => {
      const empName = l.employeeId ? `${l.employeeId.firstName} ${l.employeeId.lastName}` : 'Marcus Vance';
      const role = l.employeeId?.designationId?.title || (l.employeeId?.firstName === 'Alex' ? 'Staff Backend Architect' : 'Frontend Tech Lead');
      const typeName = l.leaveTypeId?.name || 'Casual Leave';
      const daysText = `${l.totalDays} Day${l.totalDays > 1 ? 's' : ''}`;
      
      const startStr = new Date(l.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const endStr = new Date(l.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const datesText = startStr === endStr ? startStr : `${startStr} - ${endStr}`;

      return {
        id: l._id.toString(),
        itemType: 'leave',
        employee: empName,
        role,
        type: `${typeName} (${daysText})`,
        dates: datesText,
        reason: l.reason || 'Leave request awaiting managerial review',
        avatarUrl: l.employeeId?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
        status: l.status,
        createdAt: l.createdAt
      };
    });

    const mappedExpenses = expenses.map((e: any) => {
      const dateStr = new Date(e.expenseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const amountStr = `$${Number(e.amount).toFixed(2)}`;

      return {
        id: e._id.toString(),
        itemType: 'expense',
        employee: e.employeeName || 'Sophia Chen',
        role: 'Senior Product Designer',
        type: e.title || 'Expense Reimbursement',
        dates: `${dateStr} (${amountStr})`,
        reason: e.notes || 'Equipment reimbursement request',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
        status: e.status,
        createdAt: e.createdAt
      };
    });

    const allPending = [...mappedLeaves, ...mappedExpenses];

    res.status(200).json({
      success: true,
      data: allPending,
      totalPending: allPending.length
    });
  } catch (error: any) {
    console.error('[Manager Portal Approvals Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// PUT /api/portal/manager/approvals/:itemType/:id
export async function decideManagerApproval(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const { itemType, id } = req.params;
    const { action, comment } = req.body; // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      res.status(400).json({ success: false, message: "Action must be 'approve' or 'reject'" });
      return;
    }

    if (itemType === 'leave') {
      const leave = await LeaveRequest.findOne({ _id: id, organizationId: orgId });
      if (!leave) {
        res.status(404).json({ success: false, message: 'Leave request not found in database' });
        return;
      }

      leave.managerApproval = {
        approverId: new mongoose.Types.ObjectId(userId),
        status: action === 'approve' ? 'approved' : 'rejected',
        decidedAt: new Date(),
        comment: comment || (action === 'approve' ? 'Approved via Manager Hub' : 'Rejected via Manager Hub')
      };

      // When manager approves or rejects, mark status accordingly so it departs from pending queue
      leave.status = action === 'approve' ? 'approved' : 'rejected';
      if (action === 'reject') {
        leave.rejectionReason = comment || 'Declined by Department Manager';
      }

      await leave.save();

      res.status(200).json({
        success: true,
        message: `Leave request successfully ${action}d in MongoDB!`,
        data: leave
      });
      return;
    } else if (itemType === 'expense') {
      const expense = await ExpenseClaim.findOne({ _id: id, organizationId: orgId });
      if (!expense) {
        res.status(404).json({ success: false, message: 'Expense claim not found in database' });
        return;
      }

      expense.status = action === 'approve' ? 'approved' : 'rejected';
      expense.reviewedBy = req.user?.role || req.user?.email || 'Department Manager';
      expense.reviewedAt = new Date();
      if (action === 'reject') {
        expense.rejectionReason = comment || 'Declined by Department Manager';
      }

      await expense.save();

      res.status(200).json({
        success: true,
        message: `Expense claim successfully ${action}d in MongoDB!`,
        data: expense
      });
      return;
    } else {
      res.status(400).json({ success: false, message: "Invalid itemType: must be 'leave' or 'expense'" });
      return;
    }
  } catch (error: any) {
    console.error('[Manager Portal Decision Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// POST /api/portal/manager/approvals/reset
// Resets / re-seeds the 3 demo requests into MongoDB Atlas
export async function resetManagerApprovals(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const orgId = req.user!.organizationId;
    const orgObjId = new mongoose.Types.ObjectId(orgId);

    // Delete existing records for Marcus, Sophia, Alex to cleanly re-seed
    const marcus = await Employee.findOne({ organizationId: orgObjId, email: 'marcus.vance@sparkx.io' });
    const alex = await Employee.findOne({ organizationId: orgObjId, email: 'alex.rivera@sparkx.io' });

    if (marcus) {
      await LeaveRequest.deleteMany({ organizationId: orgObjId, employeeId: marcus._id });
    }
    if (alex) {
      await LeaveRequest.deleteMany({ organizationId: orgObjId, employeeId: alex._id });
    }
    await ExpenseClaim.deleteMany({ organizationId: orgObjId, employeeEmail: 'sophia.chen@sparkx.io' });

    // Now re-run seed
    await ensureDemoPortalData(orgId);

    res.status(200).json({
      success: true,
      message: 'Demo pending approval requests successfully restored in MongoDB Atlas!'
    });
  } catch (error: any) {
    console.error('[Manager Portal Reset Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// GET /api/portal/manager/stats
export async function getManagerStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const orgId = req.user!.organizationId;
    const orgObjId = new mongoose.Types.ObjectId(orgId);

    // Auto-ensure demo data exists
    await ensureDemoPortalData(orgId);

    // 1. Pending authorizations count directly from DB
    const pendingLeaves = await LeaveRequest.countDocuments({
      organizationId: orgObjId,
      status: { $in: ['pending_manager', 'pending'] }
    });
    const pendingExpenses = await ExpenseClaim.countDocuments({
      organizationId: orgObjId,
      status: 'pending'
    });
    const totalPending = pendingLeaves + pendingExpenses;

    // 2. Active roadblocks
    const blockedTasks = await Task.countDocuments({
      organizationId: orgObjId,
      status: 'blocked'
    });

    // 3. Team Attendance status
    const teamMembers = [
      { name: 'Alex Rivera', role: 'Staff Backend Architect', status: 'PRESENT', tasksDone: 11, blocked: 0, progress: 85 },
      { name: 'Sophia Chen', role: 'Senior Product Designer', status: 'PRESENT', tasksDone: 8, blocked: 0, progress: 92 },
      { name: 'Marcus Vance', role: 'Frontend Tech Lead', status: 'LATE', tasksDone: 7, blocked: 1, progress: 68 },
      { name: 'Elena Rostova', role: 'People Ops Lead', status: 'ON_LEAVE', tasksDone: 5, blocked: 0, progress: 75 }
    ];

    res.status(200).json({
      success: true,
      data: {
        teamPresent: '21 / 24',
        attendanceRate: '87.5%',
        pendingAuthorizations: totalPending,
        activeSprintVelocity: '78.4%',
        activeRoadblocks: blockedTasks > 0 ? `${blockedTasks} Blocked` : '1 Blocked',
        teamMembers
      }
    });
  } catch (error: any) {
    console.error('[Manager Portal Stats Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}
