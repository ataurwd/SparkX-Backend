import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { SalaryStructure } from '../../models/SalaryStructure';
import { PayrollBatch } from '../../models/PayrollBatch';
import { Payslip } from '../../models/Payslip';
import { Employee } from '../../models/Employee';
import { AttendanceRecord } from '../../models/AttendanceRecord';
import { LeaveRequest } from '../../models/LeaveRequest';

// Helper to find Employee for currently logged-in user
async function getEmployeeForUser(userId: string, orgId: string) {
  let employee = await Employee.findOne({
    organizationId: orgId,
    userId: userId
  });
  if (!employee) {
    const { User } = await import('../../models/User');
    const user = await User.findById(userId);
    if (user) {
      employee = await Employee.findOne({
        organizationId: orgId,
        email: user.email.toLowerCase()
      });
      if (employee && !employee.userId) {
        employee.userId = user._id as any;
        await employee.save();
      }
    }
  }
  return employee;
}

// 1. Get or initialize salary structure for employee
export const getSalaryStructure = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const orgId = req.user?.organizationId;

    let structure = await SalaryStructure.findOne({
      organizationId: orgId,
      employeeId
    });

    if (!structure) {
      const employee = await Employee.findOne({ _id: employeeId, organizationId: orgId });
      if (!employee) {
        res.status(404).json({ success: false, message: 'Employee not found' });
        return;
      }

      const baseSalary = employee.salary?.base || 4000;
      const basic = Math.round(baseSalary * 0.55);
      const houseRent = Math.round(baseSalary * 0.25);
      const medical = Math.round(baseSalary * 0.10);
      const transport = Math.round(baseSalary * 0.10);
      const grossSalary = basic + houseRent + medical + transport;
      const providentFund = Math.round(basic * 0.08);
      const tax = Math.round(grossSalary * 0.07);
      const totalDeduction = providentFund + tax;
      const netSalary = grossSalary - totalDeduction;

      structure = await SalaryStructure.create({
        organizationId: orgId,
        employeeId,
        currency: employee.salary?.currency || 'USD',
        basic,
        houseRent,
        medical,
        transport,
        specialAllowance: 0,
        grossSalary,
        providentFund,
        tax,
        otherDeduction: 0,
        totalDeduction,
        netSalary,
        paymentMethod: 'bank_transfer',
        bankDetails: {
          bankName: 'Silicon City Bank',
          accountNumber: '••••••••4892',
          routingNumber: '021000021',
          branch: 'Main Branch'
        }
      });
    }

    res.status(200).json({ success: true, data: structure });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Update employee salary structure
export const updateSalaryStructure = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const orgId = req.user?.organizationId;
    const {
      basic = 0,
      houseRent = 0,
      medical = 0,
      transport = 0,
      specialAllowance = 0,
      providentFund = 0,
      tax = 0,
      otherDeduction = 0,
      paymentMethod = 'bank_transfer',
      bankDetails,
      currency = 'USD'
    } = req.body;

    const grossSalary = Number(basic) + Number(houseRent) + Number(medical) + Number(transport) + Number(specialAllowance);
    const totalDeduction = Number(providentFund) + Number(tax) + Number(otherDeduction);
    const netSalary = grossSalary - totalDeduction;

    const structure = await SalaryStructure.findOneAndUpdate(
      { organizationId: orgId, employeeId },
      {
        basic: Number(basic),
        houseRent: Number(houseRent),
        medical: Number(medical),
        transport: Number(transport),
        specialAllowance: Number(specialAllowance),
        grossSalary,
        providentFund: Number(providentFund),
        tax: Number(tax),
        otherDeduction: Number(otherDeduction),
        totalDeduction,
        netSalary,
        paymentMethod,
        bankDetails,
        currency: currency.toUpperCase(),
        isActive: true
      },
      { new: true, upsert: true }
    );

    // Also update employee base salary cache
    await Employee.findByIdAndUpdate(employeeId, {
      'salary.base': grossSalary,
      'salary.currency': currency.toUpperCase()
    });

    res.status(200).json({
      success: true,
      message: 'Salary structure updated successfully',
      data: structure
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Generate or recalculate monthly payroll batch
export const generateMonthlyPayroll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { month, year, title } = req.body;

    if (!month || !year) {
      res.status(400).json({ success: false, message: 'Month (1-12) and year are required' });
      return;
    }

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    // Check existing batch
    let batch = await PayrollBatch.findOne({
      organizationId: orgId,
      month: monthNum,
      year: yearNum
    });

    if (batch && batch.status === 'paid') {
      res.status(400).json({
        success: false,
        message: 'This monthly payroll batch has already been marked as paid and cannot be regenerated.'
      });
      return;
    }

    // Days in month
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const batchTitle = title || `${monthNames[monthNum - 1]} ${yearNum} Payroll Batch`;

    // Fetch all active employees
    const employees = await Employee.find({
      organizationId: orgId,
      employmentStatus: { $in: ['active', 'probation', 'notice'] }
    });

    if (!employees || employees.length === 0) {
      res.status(400).json({ success: false, message: 'No active employees found to process payroll.' });
      return;
    }

    // Create or update batch container
    if (!batch) {
      batch = await PayrollBatch.create({
        organizationId: orgId,
        title: batchTitle,
        month: monthNum,
        year: yearNum,
        status: 'processed',
        processedBy: req.user?.userId
      });
    } else {
      batch.title = batchTitle;
      batch.status = 'processed';
      batch.processedBy = req.user?.userId as any;
      await batch.save();
    }

    // Date range string for attendance records (YYYY-MM)
    const monthStr = String(monthNum).padStart(2, '0');
    const datePrefix = `${yearNum}-${monthStr}`;

    let totalGross = 0;
    let totalDeductions = 0;
    let totalBonus = 0;
    let totalOvertime = 0;
    let totalNet = 0;
    const payslipDocs: any[] = [];

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];

      // 1. Get or auto-init salary structure
      let structure = await SalaryStructure.findOne({
        organizationId: orgId,
        employeeId: emp._id
      });

      if (!structure) {
        const baseSalary = emp.salary?.base || 4000;
        const basic = Math.round(baseSalary * 0.55);
        const houseRent = Math.round(baseSalary * 0.25);
        const medical = Math.round(baseSalary * 0.10);
        const transport = Math.round(baseSalary * 0.10);
        const grossSalary = basic + houseRent + medical + transport;
        const pf = Math.round(basic * 0.08);
        const taxVal = Math.round(grossSalary * 0.07);
        const totDed = pf + taxVal;

        structure = await SalaryStructure.create({
          organizationId: orgId,
          employeeId: emp._id,
          currency: emp.salary?.currency || 'USD',
          basic,
          houseRent,
          medical,
          transport,
          specialAllowance: 0,
          grossSalary,
          providentFund: pf,
          tax: taxVal,
          otherDeduction: 0,
          totalDeduction: totDed,
          netSalary: grossSalary - totDed,
          paymentMethod: 'bank_transfer',
          bankDetails: {
            bankName: 'Silicon City Bank',
            accountNumber: `••••••••${Math.floor(1000 + Math.random() * 9000)}`
          }
        });
      }

      // 2. Query Phase 5 Attendance Records for this month
      const attendance = await AttendanceRecord.find({
        organizationId: orgId,
        employeeId: emp._id,
        date: { $regex: `^${datePrefix}` }
      });

      const presentDays = attendance.filter((a) => a.status === 'present' || a.status === 'late').length;
      const lateDays = attendance.filter((a) => a.status === 'late' || (a.lateMinutes && a.lateMinutes > 0)).length;
      const totalOvertimeMins = attendance.reduce((acc, curr) => acc + (curr.overtimeMinutes || 0), 0);

      // 3. Query Phase 5 Approved Leave Requests for this month
      const startOfMonth = new Date(yearNum, monthNum - 1, 1);
      const endOfMonth = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

      const leaves = await LeaveRequest.find({
        organizationId: orgId,
        employeeId: emp._id,
        status: 'approved',
        startDate: { $lte: endOfMonth },
        endDate: { $gte: startOfMonth }
      }).populate('leaveTypeId');

      let paidLeaveDays = 0;
      let unpaidLeaveDays = 0;

      leaves.forEach((l: any) => {
        if (l.leaveTypeId?.isPaid === false || l.leaveTypeId?.code === 'UL') {
          unpaidLeaveDays += l.totalDays || 1;
        } else {
          paidLeaveDays += l.totalDays || 1;
        }
      });

      // Absent days = days passed in month - present - leaves
      const absentDays = Math.max(0, daysInMonth - (presentDays + paidLeaveDays + unpaidLeaveDays));

      // 4. Financial computations
      const dailyRate = structure.grossSalary / daysInMonth;
      const hourlyRate = dailyRate / 8;

      // Unpaid leave deduction
      const unpaidLeaveDeduction = Math.round(dailyRate * unpaidLeaveDays);

      // Late penalty: if more than 3 late punches, deduct 25% daily rate for each extra late day
      const latePenaltyDays = Math.max(0, lateDays - 3);
      const lateDeduction = Math.round(latePenaltyDays * (dailyRate * 0.25));

      // Overtime Pay (1.5x hourly rate)
      const overtimePay = Math.round((totalOvertimeMins / 60) * hourlyRate * 1.5);

      const empTotalEarnings = structure.grossSalary + overtimePay;
      const empTotalDeductions = structure.providentFund + structure.tax + structure.otherDeduction + unpaidLeaveDeduction + lateDeduction;
      const empNetSalary = Math.max(0, empTotalEarnings - empTotalDeductions);

      // Payslip Number (e.g. PAY-202609-001)
      const payslipNumber = `PAY-${yearNum}${monthStr}-${String(i + 1).padStart(3, '0')}`;

      // Upsert payslip
      const payslip = await Payslip.findOneAndUpdate(
        {
          organizationId: orgId,
          employeeId: emp._id,
          month: monthNum,
          year: yearNum
        },
        {
          payrollBatchId: batch._id,
          payslipNumber,
          attendanceSummary: {
            daysInMonth,
            presentDays,
            paidLeaveDays,
            unpaidLeaveDays,
            absentDays,
            lateDays,
            overtimeMinutes: totalOvertimeMins
          },
          earnings: {
            basic: structure.basic,
            houseRent: structure.houseRent,
            medical: structure.medical,
            transport: structure.transport,
            specialAllowance: structure.specialAllowance,
            bonus: 0,
            overtimePay,
            totalEarnings: empTotalEarnings
          },
          deductions: {
            providentFund: structure.providentFund,
            tax: structure.tax,
            unpaidLeaveDeduction,
            lateDeduction,
            otherDeduction: structure.otherDeduction,
            totalDeductions: empTotalDeductions
          },
          netSalary: empNetSalary,
          currency: structure.currency || 'USD',
          paymentMethod: structure.paymentMethod,
          bankDetails: structure.bankDetails,
          status: batch.status,
          notes: `Monthly payroll processed for ${monthNames[monthNum - 1]} ${yearNum}`
        },
        { new: true, upsert: true }
      );

      payslipDocs.push(payslip);

      totalGross += empTotalEarnings;
      totalDeductions += empTotalDeductions;
      totalOvertime += overtimePay;
      totalNet += empNetSalary;
    }

    // Finalize batch stats
    batch.totalEmployees = employees.length;
    batch.totalGross = totalGross;
    batch.totalDeductions = totalDeductions;
    batch.totalOvertime = totalOvertime;
    batch.totalNet = totalNet;
    batch.currency = 'USD';
    await batch.save();

    res.status(200).json({
      success: true,
      message: `Payroll batch for ${monthNames[monthNum - 1]} ${yearNum} generated successfully`,
      data: {
        batch,
        processedCount: employees.length
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Get all payroll batches
export const getPayrollBatches = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const batches = await PayrollBatch.find({ organizationId: orgId })
      .populate('processedBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .sort({ year: -1, month: -1 });

    res.status(200).json({ success: true, data: batches });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Get batch details by ID with populated payslips
export const getPayrollBatchById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = req.user?.organizationId;

    const batch = await PayrollBatch.findOne({ _id: id, organizationId: orgId })
      .populate('processedBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email');

    if (!batch) {
      res.status(404).json({ success: false, message: 'Payroll batch not found' });
      return;
    }

    const payslips = await Payslip.find({
      organizationId: orgId,
      payrollBatchId: id
    })
      .populate({
        path: 'employeeId',
        select: 'firstName lastName employeeCode avatarUrl email departmentId designationId',
        populate: [
          { path: 'departmentId', select: 'name' },
          { path: 'designationId', select: 'title' }
        ]
      })
      .sort({ payslipNumber: 1 });

    res.status(200).json({
      success: true,
      data: {
        batch,
        payslips
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Approve payroll batch
export const approvePayrollBatch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = req.user?.organizationId;

    const batch = await PayrollBatch.findOne({ _id: id, organizationId: orgId });
    if (!batch) {
      res.status(404).json({ success: false, message: 'Payroll batch not found' });
      return;
    }

    batch.status = 'approved';
    batch.approvedBy = req.user?.userId as any;
    batch.approvedAt = new Date();
    await batch.save();

    await Payslip.updateMany(
      { organizationId: orgId, payrollBatchId: id },
      { status: 'approved' }
    );

    res.status(200).json({
      success: true,
      message: 'Payroll batch approved successfully',
      data: batch
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Disburse / Mark payroll batch as paid
export const payPayrollBatch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = req.user?.organizationId;

    const batch = await PayrollBatch.findOne({ _id: id, organizationId: orgId });
    if (!batch) {
      res.status(404).json({ success: false, message: 'Payroll batch not found' });
      return;
    }

    const paidDate = new Date();
    batch.status = 'paid';
    batch.paidAt = paidDate;
    await batch.save();

    await Payslip.updateMany(
      { organizationId: orgId, payrollBatchId: id },
      { status: 'paid', paidAt: paidDate }
    );

    res.status(200).json({
      success: true,
      message: 'Payroll batch disbursed and marked as paid',
      data: batch
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 8. Get individual payslip by ID (with full populated data for printing)
export const getPayslipById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = req.user?.organizationId;

    const payslip = await Payslip.findOne({ _id: id, organizationId: orgId })
      .populate({
        path: 'employeeId',
        select: 'firstName lastName employeeCode email phone joiningDate departmentId designationId address',
        populate: [
          { path: 'departmentId', select: 'name code' },
          { path: 'designationId', select: 'title' }
        ]
      })
      .populate('payrollBatchId', 'title month year status paidAt')
      .populate('organizationId', 'name logo');

    if (!payslip) {
      res.status(404).json({ success: false, message: 'Payslip not found' });
      return;
    }

    res.status(200).json({ success: true, data: payslip });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 9. Employee self-service: View my payslips
export const getMyPayslips = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const userId = req.user?.userId;

    const employee = await getEmployeeForUser(userId!, orgId!);
    if (!employee) {
      res.status(200).json({ success: true, data: [] });
      return;
    }

    const payslips = await Payslip.find({
      organizationId: orgId,
      employeeId: employee._id
    })
      .populate('payrollBatchId', 'title status')
      .sort({ year: -1, month: -1 });

    res.status(200).json({ success: true, data: payslips });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
