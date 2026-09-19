import mongoose, { Schema, Document } from 'mongoose';

export type AttendanceStatus = 'present' | 'late' | 'half_day' | 'absent' | 'on_leave';

export interface IAttendanceRecord extends Document {
  organizationId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  date: string; // 'YYYY-MM-DD'
  checkIn?: Date;
  checkOut?: Date;
  workingMinutes: number;
  lateMinutes: number;
  overtimeMinutes: number;
  status: AttendanceStatus;
  checkInIp?: string;
  checkOutIp?: string;
  notes?: string;
  isManualAdjustment: boolean;
  adjustedBy?: mongoose.Types.ObjectId;
  adjustmentReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceRecordSchema = new Schema<IAttendanceRecord>(
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
    date: {
      type: String,
      required: true,
      index: true
    },
    checkIn: {
      type: Date
    },
    checkOut: {
      type: Date
    },
    workingMinutes: {
      type: Number,
      default: 0
    },
    lateMinutes: {
      type: Number,
      default: 0
    },
    overtimeMinutes: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['present', 'late', 'half_day', 'absent', 'on_leave'],
      default: 'present',
      index: true
    },
    checkInIp: {
      type: String
    },
    checkOutIp: {
      type: String
    },
    notes: {
      type: String
    },
    isManualAdjustment: {
      type: Boolean,
      default: false
    },
    adjustedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    adjustmentReason: {
      type: String
    }
  },
  { timestamps: true }
);

// One record per employee per day
AttendanceRecordSchema.index({ organizationId: 1, employeeId: 1, date: 1 }, { unique: true });

export const AttendanceRecord = mongoose.model<IAttendanceRecord>('AttendanceRecord', AttendanceRecordSchema);
