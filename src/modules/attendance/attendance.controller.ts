import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AttendanceRecord, AttendanceStatus } from '../../models/AttendanceRecord';
import { Employee } from '../../models/Employee';

// Helper to get formatted YYYY-MM-DD
function getTodayString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

// Find or auto-link employee linked to authenticated user
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

export async function checkIn(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const userId = req.user!.userId;
    const email = req.user!.email;
    const { notes } = req.body;

    const employee = await getEmployeeForUser(organizationId, userId, email);
    if (!employee) {
      res.status(404).json({ success: false, error: 'Employee record not found for this account' });
      return;
    }

    const todayStr = getTodayString();
    let record = await AttendanceRecord.findOne({
      organizationId,
      employeeId: employee._id,
      date: todayStr
    });

    if (record && record.checkIn) {
      res.status(400).json({
        success: false,
        error: 'Already clocked in for today',
        data: record
      });
      return;
    }

    const now = new Date();
    const clientIp = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';

    // Standard work start threshold: 09:30 AM
    const standardStart = new Date(now);
    standardStart.setHours(9, 30, 0, 0);

    let lateMinutes = 0;
    let status: AttendanceStatus = 'present';

    if (now > standardStart) {
      lateMinutes = Math.floor((now.getTime() - standardStart.getTime()) / (1000 * 60));
      status = 'late';
    }

    if (!record) {
      record = await AttendanceRecord.create({
        organizationId,
        employeeId: employee._id,
        date: todayStr,
        checkIn: now,
        checkInIp: clientIp,
        lateMinutes,
        status,
        notes
      });
    } else {
      record.checkIn = now;
      record.checkInIp = clientIp;
      record.lateMinutes = lateMinutes;
      record.status = status;
      if (notes) record.notes = notes;
      await record.save();
    }

    res.status(200).json({
      success: true,
      message: `Clocked in successfully as ${status === 'late' ? 'Late' : 'Present'}`,
      data: record
    });
  } catch (error: any) {
    console.error('[CheckIn Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function checkOut(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const userId = req.user!.userId;
    const email = req.user!.email;
    const { notes } = req.body;

    const employee = await getEmployeeForUser(organizationId, userId, email);
    if (!employee) {
      res.status(404).json({ success: false, error: 'Employee record not found for this account' });
      return;
    }

    const todayStr = getTodayString();
    const record = await AttendanceRecord.findOne({
      organizationId,
      employeeId: employee._id,
      date: todayStr
    });

    if (!record || !record.checkIn) {
      res.status(400).json({ success: false, error: 'Must clock in before clocking out' });
      return;
    }

    if (record.checkOut) {
      res.status(400).json({ success: false, error: 'Already clocked out for today' });
      return;
    }

    const now = new Date();
    const clientIp = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';

    const workingMinutes = Math.floor((now.getTime() - record.checkIn.getTime()) / (1000 * 60));
    let overtimeMinutes = 0;
    if (workingMinutes > 8 * 60) {
      overtimeMinutes = workingMinutes - 8 * 60;
    }

    let status = record.status;
    if (workingMinutes < 4 * 60) {
      status = 'half_day';
    }

    record.checkOut = now;
    record.checkOutIp = clientIp;
    record.workingMinutes = workingMinutes;
    record.overtimeMinutes = overtimeMinutes;
    record.status = status;
    if (notes) record.notes = record.notes ? `${record.notes} | ${notes}` : notes;

    await record.save();

    res.status(200).json({
      success: true,
      message: 'Clocked out successfully',
      data: record
    });
  } catch (error: any) {
    console.error('[CheckOut Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getMyTodayAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const userId = req.user!.userId;
    const email = req.user!.email;

    const employee = await getEmployeeForUser(organizationId, userId, email);
    if (!employee) {
      res.status(200).json({ success: true, data: null });
      return;
    }

    const todayStr = getTodayString();
    const record = await AttendanceRecord.findOne({
      organizationId,
      employeeId: employee._id,
      date: todayStr
    });

    res.status(200).json({
      success: true,
      data: record,
      today: todayStr
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getMyAttendanceHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const userId = req.user!.userId;
    const email = req.user!.email;
    const { month, year } = req.query;

    const employee = await getEmployeeForUser(organizationId, userId, email);
    if (!employee) {
      res.status(200).json({ success: true, data: [] });
      return;
    }

    const query: any = { organizationId, employeeId: employee._id };

    if (year && month) {
      const monthPadded = String(month).padStart(2, '0');
      query.date = { $regex: new RegExp(`^${year}-${monthPadded}`) };
    }

    const records = await AttendanceRecord.find(query).sort({ date: -1 });

    res.status(200).json({
      success: true,
      data: records
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getAllAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const { date, status, departmentId, search } = req.query;

    const targetDate = (date as string) || getTodayString();

    const empQuery: any = { organizationId };
    if (departmentId) empQuery.departmentId = departmentId;
    if (search) {
      const s = new RegExp(String(search).trim(), 'i');
      empQuery.$or = [{ firstName: s }, { lastName: s }, { employeeCode: s }];
    }

    const allEmployees = await Employee.find(empQuery)
      .populate('departmentId', 'name code color')
      .populate('designationId', 'title')
      .select('firstName lastName employeeCode avatarUrl departmentId designationId employmentStatus');

    const empIds = allEmployees.map((e) => e._id);

    const recordsQuery: any = {
      organizationId,
      date: targetDate,
      employeeId: { $in: empIds }
    };
    if (status && status !== 'All') recordsQuery.status = status;

    const records = await AttendanceRecord.find(recordsQuery).populate('adjustedBy', 'firstName lastName');

    // Aggregate summary statistics
    const stats = {
      totalEmployees: allEmployees.length,
      present: records.filter((r) => r.status === 'present').length,
      late: records.filter((r) => r.status === 'late').length,
      halfDay: records.filter((r) => r.status === 'half_day').length,
      onLeave: records.filter((r) => r.status === 'on_leave').length,
      absent: Math.max(0, allEmployees.length - records.length)
    };

    // Merge employees with their records for display
    const mapped = allEmployees.map((emp) => {
      const rec = records.find((r) => r.employeeId.toString() === emp._id.toString());
      return {
        employee: emp,
        attendance: rec || null,
        status: rec ? rec.status : 'absent'
      };
    });

    res.status(200).json({
      success: true,
      data: mapped,
      stats,
      date: targetDate
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function manualAdjustAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const { employeeId, date, checkInTime, checkOutTime, status, adjustmentReason } = req.body;

    if (!employeeId || !date || !status || !adjustmentReason) {
      res.status(400).json({
        success: false,
        error: 'Employee, date, status, and adjustment reason are required'
      });
      return;
    }

    let checkIn: Date | undefined;
    let checkOut: Date | undefined;

    if (checkInTime) {
      checkIn = new Date(`${date}T${checkInTime}:00`);
    }
    if (checkOutTime) {
      checkOut = new Date(`${date}T${checkOutTime}:00`);
    }

    let workingMinutes = 0;
    let overtimeMinutes = 0;
    if (checkIn && checkOut) {
      workingMinutes = Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60));
      if (workingMinutes > 8 * 60) {
        overtimeMinutes = workingMinutes - 8 * 60;
      }
    }

    const record = await AttendanceRecord.findOneAndUpdate(
      { organizationId, employeeId, date },
      {
        $set: {
          checkIn,
          checkOut,
          workingMinutes,
          overtimeMinutes,
          status,
          isManualAdjustment: true,
          adjustedBy: req.user!.userId,
          adjustmentReason
        }
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: 'Attendance record adjusted successfully',
      data: record
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
