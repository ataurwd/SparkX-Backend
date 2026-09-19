import mongoose, { Schema, Document } from 'mongoose';

export interface ISalaryStructure extends Document {
  organizationId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  currency: string;
  basic: number;
  houseRent: number;
  medical: number;
  transport: number;
  specialAllowance: number;
  grossSalary: number;
  providentFund: number;
  tax: number;
  otherDeduction: number;
  totalDeduction: number;
  netSalary: number;
  paymentMethod: 'bank_transfer' | 'cheque' | 'cash';
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    routingNumber?: string;
    branch?: string;
  };
  effectiveDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SalaryStructureSchema: Schema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    currency: { type: String, default: 'USD', uppercase: true, trim: true },
    basic: { type: Number, required: true, default: 0 },
    houseRent: { type: Number, default: 0 },
    medical: { type: Number, default: 0 },
    transport: { type: Number, default: 0 },
    specialAllowance: { type: Number, default: 0 },
    grossSalary: { type: Number, required: true, default: 0 },
    providentFund: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    otherDeduction: { type: Number, default: 0 },
    totalDeduction: { type: Number, required: true, default: 0 },
    netSalary: { type: Number, required: true, default: 0 },
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'cheque', 'cash'],
      default: 'bank_transfer'
    },
    bankDetails: {
      bankName: { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      routingNumber: { type: String, trim: true },
      branch: { type: String, trim: true }
    },
    effectiveDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: true
  }
);

SalaryStructureSchema.index({ organizationId: 1, employeeId: 1 }, { unique: true });

export const SalaryStructure = mongoose.model<ISalaryStructure>('SalaryStructure', SalaryStructureSchema);
