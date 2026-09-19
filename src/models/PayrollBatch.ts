import mongoose, { Schema, Document } from 'mongoose';

export interface IPayrollBatch extends Document {
  organizationId: mongoose.Types.ObjectId;
  title: string;
  month: number;
  year: number;
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalBonus: number;
  totalOvertime: number;
  totalNet: number;
  currency: string;
  status: 'draft' | 'processed' | 'approved' | 'paid';
  processedBy?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  paidAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollBatchSchema: Schema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    title: { type: String, required: true, trim: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    totalEmployees: { type: Number, default: 0 },
    totalGross: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    totalBonus: { type: Number, default: 0 },
    totalOvertime: { type: Number, default: 0 },
    totalNet: { type: Number, default: 0 },
    currency: { type: String, default: 'USD', uppercase: true },
    status: {
      type: String,
      enum: ['draft', 'processed', 'approved', 'paid'],
      default: 'processed',
      index: true
    },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    paidAt: { type: Date },
    notes: { type: String }
  },
  {
    timestamps: true
  }
);

PayrollBatchSchema.index({ organizationId: 1, month: 1, year: 1 }, { unique: true });

export const PayrollBatch = mongoose.model<IPayrollBatch>('PayrollBatch', PayrollBatchSchema);
