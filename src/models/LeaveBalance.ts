import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaveBalance extends Document {
  organizationId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  leaveTypeId: mongoose.Types.ObjectId;
  year: number;
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveBalanceSchema = new Schema<ILeaveBalance>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true
    },
    leaveTypeId: {
      type: Schema.Types.ObjectId,
      ref: 'LeaveType',
      required: true
    },
    year: {
      type: Number,
      required: true,
      default: () => new Date().getFullYear()
    },
    totalDays: {
      type: Number,
      required: true,
      default: 10
    },
    usedDays: {
      type: Number,
      default: 0
    },
    pendingDays: {
      type: Number,
      default: 0
    },
    remainingDays: {
      type: Number,
      default: 10
    }
  },
  { timestamps: true }
);

LeaveBalanceSchema.index(
  { organizationId: 1, employeeId: 1, leaveTypeId: 1, year: 1 },
  { unique: true }
);

export const LeaveBalance = mongoose.model<ILeaveBalance>('LeaveBalance', LeaveBalanceSchema);
