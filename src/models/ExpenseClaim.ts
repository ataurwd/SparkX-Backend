import mongoose, { Document, Schema } from 'mongoose';

export interface IExpenseClaim extends Document {
  organizationId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  employeeName: string;
  employeeEmail: string;
  department: string;
  title: string;
  category: 'travel' | 'hardware' | 'software' | 'meals' | 'office_supplies' | 'other';
  amount: number;
  currency: string;
  receiptUrl?: string;
  status: 'pending' | 'approved' | 'rejected' | 'reimbursed';
  expenseDate: Date;
  submittedDate: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseClaimSchema = new Schema<IExpenseClaim>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    employeeName: { type: String, required: true },
    employeeEmail: { type: String, required: true },
    department: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['travel', 'hardware', 'software', 'meals', 'office_supplies', 'other'],
      default: 'travel'
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'BDT' },
    receiptUrl: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'reimbursed'],
      default: 'pending',
      index: true
    },
    expenseDate: { type: Date, default: Date.now },
    submittedDate: { type: Date, default: Date.now },
    reviewedBy: { type: String, default: '' },
    reviewedAt: { type: Date },
    rejectionReason: { type: String, default: '' },
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

ExpenseClaimSchema.index({ organizationId: 1, status: 1 });

export const ExpenseClaim = mongoose.model<IExpenseClaim>('ExpenseClaim', ExpenseClaimSchema);
