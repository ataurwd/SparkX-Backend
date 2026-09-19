import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaveType extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  daysAllowed: number;
  isPaid: boolean;
  requiresAttachment: boolean;
  color: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveTypeSchema = new Schema<ILeaveType>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    daysAllowed: {
      type: Number,
      required: true,
      default: 10
    },
    isPaid: {
      type: Boolean,
      default: true
    },
    requiresAttachment: {
      type: Boolean,
      default: false
    },
    color: {
      type: String,
      default: '#6C5CE7'
    },
    description: {
      type: String
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

LeaveTypeSchema.index({ organizationId: 1, code: 1 }, { unique: true });

export const LeaveType = mongoose.model<ILeaveType>('LeaveType', LeaveTypeSchema);
