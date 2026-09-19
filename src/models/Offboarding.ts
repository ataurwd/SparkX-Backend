import mongoose, { Document, Schema } from 'mongoose';

export interface IClearanceItem {
  department: 'it' | 'hr' | 'finance' | 'manager';
  title: string;
  description?: string;
  cleared: boolean;
  clearedBy?: string;
  clearedAt?: Date;
}

export interface IOffboarding extends Document {
  organizationId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  employeeName: string;
  employeeEmail: string;
  department: string;
  role: string;
  resignationDate: Date;
  noticePeriodDays: number;
  lastWorkingDay: Date;
  reason: string;
  status: 'initiated' | 'in_progress' | 'cleared' | 'archived';
  progress: number;
  clearanceItems: IClearanceItem[];
  exitInterview?: {
    conducted: boolean;
    rating: number;
    notes?: string;
    conductedBy?: string;
    conductedAt?: Date;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClearanceItemSchema = new Schema<IClearanceItem>(
  {
    department: {
      type: String,
      enum: ['it', 'hr', 'finance', 'manager'],
      required: true
    },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    cleared: { type: Boolean, default: false },
    clearedBy: { type: String, default: '' },
    clearedAt: { type: Date }
  },
  { _id: false }
);

const OffboardingSchema = new Schema<IOffboarding>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    employeeName: { type: String, required: true },
    employeeEmail: { type: String, required: true },
    department: { type: String, required: true },
    role: { type: String, required: true },
    resignationDate: { type: Date, default: Date.now },
    noticePeriodDays: { type: Number, default: 30 },
    lastWorkingDay: { type: Date, required: true },
    reason: { type: String, default: 'Career Growth' },
    status: {
      type: String,
      enum: ['initiated', 'in_progress', 'cleared', 'archived'],
      default: 'initiated',
      index: true
    },
    progress: { type: Number, default: 0 },
    clearanceItems: [ClearanceItemSchema],
    exitInterview: {
      conducted: { type: Boolean, default: false },
      rating: { type: Number, default: 5 },
      notes: { type: String, default: '' },
      conductedBy: { type: String, default: '' },
      conductedAt: { type: Date }
    },
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

OffboardingSchema.index({ organizationId: 1, status: 1 });

export const Offboarding = mongoose.model<IOffboarding>('Offboarding', OffboardingSchema);
