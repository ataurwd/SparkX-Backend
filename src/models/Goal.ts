import mongoose, { Document, Schema } from 'mongoose';

export interface IKeyResult {
  _id?: mongoose.Types.ObjectId;
  title: string;
  metricType: 'percentage' | 'numeric' | 'currency' | 'boolean';
  initialValue: number;
  targetValue: number;
  currentValue: number;
  unit: string;
  confidenceLevel: 'on_track' | 'needs_attention' | 'at_risk';
  progress: number;
  updatedAt?: Date;
}

export interface IGoal extends Document {
  organizationId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  category: 'company' | 'department' | 'individual';
  departmentId?: mongoose.Types.ObjectId;
  ownerId?: mongoose.Types.ObjectId;
  period: string; // e.g. '2026-Q3', '2026-Annual'
  startDate: Date;
  endDate: Date;
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  progress: number;
  weight: number;
  keyResults: IKeyResult[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const KeyResultSchema = new Schema<IKeyResult>({
  title: { type: String, required: true, trim: true },
  metricType: {
    type: String,
    enum: ['percentage', 'numeric', 'currency', 'boolean'],
    default: 'percentage'
  },
  initialValue: { type: Number, default: 0 },
  targetValue: { type: Number, required: true },
  currentValue: { type: Number, default: 0 },
  unit: { type: String, default: '%' },
  confidenceLevel: {
    type: String,
    enum: ['on_track', 'needs_attention', 'at_risk'],
    default: 'on_track'
  },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  updatedAt: { type: Date, default: Date.now }
});

const GoalSchema = new Schema<IGoal>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: {
      type: String,
      enum: ['company', 'department', 'individual'],
      default: 'company',
      index: true
    },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    ownerId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    period: { type: String, required: true, index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'cancelled'],
      default: 'in_progress',
      index: true
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    weight: { type: Number, default: 1 },
    keyResults: [KeyResultSchema],
    tags: [{ type: String, trim: true }]
  },
  { timestamps: true }
);

GoalSchema.index({ organizationId: 1, period: 1 });
GoalSchema.index({ organizationId: 1, category: 1 });

export const Goal = mongoose.model<IGoal>('Goal', GoalSchema);
