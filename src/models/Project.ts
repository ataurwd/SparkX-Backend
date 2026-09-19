import mongoose, { Schema, Document } from 'mongoose';

export interface IMilestone {
  _id?: mongoose.Types.ObjectId;
  title: string;
  dueDate: Date;
  completed: boolean;
  completedAt?: Date;
}

export interface IProject extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  departmentId?: mongoose.Types.ObjectId;
  managerId?: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  startDate: Date;
  endDate: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  budget: number;
  currency: string;
  progress: number;
  milestones: IMilestone[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MilestoneSchema = new Schema({
  title: { type: String, required: true, trim: true },
  dueDate: { type: Date, required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date }
});

const ProjectSchema: Schema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', index: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    members: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date, required: true },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
      default: 'active',
      index: true
    },
    budget: { type: Number, default: 0 },
    currency: { type: String, default: 'USD', uppercase: true },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    milestones: [MilestoneSchema],
    tags: [{ type: String, trim: true }]
  },
  {
    timestamps: true
  }
);

ProjectSchema.index({ organizationId: 1, code: 1 }, { unique: true });

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
