import mongoose, { Document, Schema } from 'mongoose';

export interface IOnboardingTask {
  _id?: string;
  title: string;
  category: 'it_setup' | 'documentation' | 'introduction' | 'training' | 'compliance';
  completed: boolean;
  completedAt?: Date;
  dueDate?: Date;
  assignedRole?: string;
}

export interface IOnboardingChecklist extends Document {
  organizationId: mongoose.Types.ObjectId;
  employeeId?: mongoose.Types.ObjectId;
  employeeName: string;
  employeeEmail: string;
  department: string;
  role: string;
  startDate: Date;
  targetCompletionDate: Date;
  tasks: IOnboardingTask[];
  progress: number;
  status: 'in_progress' | 'completed' | 'overdue';
  createdAt: Date;
  updatedAt: Date;
}

const OnboardingChecklistSchema: Schema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee'
    },
    employeeName: {
      type: String,
      required: true,
      trim: true
    },
    employeeEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    department: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    targetCompletionDate: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    },
    tasks: [
      {
        title: { type: String, required: true },
        category: {
          type: String,
          enum: ['it_setup', 'documentation', 'introduction', 'training', 'compliance'],
          default: 'it_setup'
        },
        completed: { type: Boolean, default: false },
        completedAt: { type: Date },
        dueDate: { type: Date },
        assignedRole: { type: String, default: 'Employee' }
      }
    ],
    progress: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'overdue'],
      default: 'in_progress'
    }
  },
  {
    timestamps: true
  }
);

export const OnboardingChecklist = mongoose.model<IOnboardingChecklist>('OnboardingChecklist', OnboardingChecklistSchema);
export default OnboardingChecklist;
