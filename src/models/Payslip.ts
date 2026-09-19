import mongoose, { Schema, Document } from 'mongoose';

export interface IPayslip extends Document {
  organizationId: mongoose.Types.ObjectId;
  payrollBatchId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  payslipNumber: string;
  month: number;
  year: number;
  attendanceSummary: {
    daysInMonth: number;
    presentDays: number;
    paidLeaveDays: number;
    unpaidLeaveDays: number;
    absentDays: number;
    lateDays: number;
    overtimeMinutes: number;
  };
  earnings: {
    basic: number;
    houseRent: number;
    medical: number;
    transport: number;
    specialAllowance: number;
    bonus: number;
    overtimePay: number;
    totalEarnings: number;
  };
  deductions: {
    providentFund: number;
    tax: number;
    unpaidLeaveDeduction: number;
    lateDeduction: number;
    otherDeduction: number;
    totalDeductions: number;
  };
  netSalary: number;
  currency: string;
  paymentMethod: 'bank_transfer' | 'cheque' | 'cash';
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
  };
  status: 'draft' | 'processed' | 'approved' | 'paid';
  paidAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayslipSchema: Schema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    payrollBatchId: { type: Schema.Types.ObjectId, ref: 'PayrollBatch', required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    payslipNumber: { type: String, required: true, trim: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    attendanceSummary: {
      daysInMonth: { type: Number, default: 30 },
      presentDays: { type: Number, default: 0 },
      paidLeaveDays: { type: Number, default: 0 },
      unpaidLeaveDays: { type: Number, default: 0 },
      absentDays: { type: Number, default: 0 },
      lateDays: { type: Number, default: 0 },
      overtimeMinutes: { type: Number, default: 0 }
    },
    earnings: {
      basic: { type: Number, default: 0 },
      houseRent: { type: Number, default: 0 },
      medical: { type: Number, default: 0 },
      transport: { type: Number, default: 0 },
      specialAllowance: { type: Number, default: 0 },
      bonus: { type: Number, default: 0 },
      overtimePay: { type: Number, default: 0 },
      totalEarnings: { type: Number, required: true, default: 0 }
    },
    deductions: {
      providentFund: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      unpaidLeaveDeduction: { type: Number, default: 0 },
      lateDeduction: { type: Number, default: 0 },
      otherDeduction: { type: Number, default: 0 },
      totalDeductions: { type: Number, required: true, default: 0 }
    },
    netSalary: { type: Number, required: true, default: 0 },
    currency: { type: String, default: 'USD', uppercase: true },
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'cheque', 'cash'],
      default: 'bank_transfer'
    },
    bankDetails: {
      bankName: { type: String },
      accountNumber: { type: String }
    },
    status: {
      type: String,
      enum: ['draft', 'processed', 'approved', 'paid'],
      default: 'processed',
      index: true
    },
    paidAt: { type: Date },
    notes: { type: String }
  },
  {
    timestamps: true
  }
);

PayslipSchema.index({ organizationId: 1, employeeId: 1, month: 1, year: 1 }, { unique: true });

export const Payslip = mongoose.model<IPayslip>('Payslip', PayslipSchema);
