import mongoose, { Schema, Document } from 'mongoose';

export type LeaveRequestStatus =
  | 'pending_manager'
  | 'pending_hr'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface IApprovalStep {
  approverId?: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected';
  decidedAt?: Date;
  comment?: string;
}

export interface ILeaveRequest extends Document {
  organizationId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  leaveTypeId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  attachmentUrl?: string;
  status: LeaveRequestStatus;
  managerApproval: IApprovalStep;
  hrApproval: IApprovalStep;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApprovalStepSchema = new Schema<IApprovalStep>(
  {
    approverId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    decidedAt: {
      type: Date
    },
    comment: {
      type: String
    }
  },
  { _id: false }
);

const LeaveRequestSchema = new Schema<ILeaveRequest>(
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
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    totalDays: {
      type: Number,
      required: true,
      min: 0.5
    },
    reason: {
      type: String,
      required: true
    },
    attachmentUrl: {
      type: String
    },
    status: {
      type: String,
      enum: ['pending_manager', 'pending_hr', 'approved', 'rejected', 'cancelled'],
      default: 'pending_manager',
      index: true
    },
    managerApproval: {
      type: ApprovalStepSchema,
      default: () => ({ status: 'pending' })
    },
    hrApproval: {
      type: ApprovalStepSchema,
      default: () => ({ status: 'pending' })
    },
    rejectionReason: {
      type: String
    }
  },
  { timestamps: true }
);

LeaveRequestSchema.index({ organizationId: 1, employeeId: 1, status: 1 });
LeaveRequestSchema.index({ organizationId: 1, startDate: 1, endDate: 1 });

export const LeaveRequest = mongoose.model<ILeaveRequest>('LeaveRequest', LeaveRequestSchema);
