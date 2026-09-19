import mongoose, { Schema, Document } from 'mongoose';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ISubtask {
  _id?: mongoose.Types.ObjectId;
  title: string;
  completed: boolean;
}

export interface ITask extends Document {
  organizationId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  taskNumber: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignees: mongoose.Types.ObjectId[];
  reporterId?: mongoose.Types.ObjectId;
  dueDate?: Date;
  estimatedHours: number;
  loggedHours: number;
  subtasks: ISubtask[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const SubtaskSchema = new Schema({
  title: { type: String, required: true, trim: true },
  completed: { type: Boolean, default: false }
});

const TaskSchema: Schema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    taskNumber: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'review', 'completed', 'blocked'],
      default: 'todo',
      index: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true
    },
    assignees: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    reporterId: { type: Schema.Types.ObjectId, ref: 'User' },
    dueDate: { type: Date },
    estimatedHours: { type: Number, default: 0 },
    loggedHours: { type: Number, default: 0 },
    subtasks: [SubtaskSchema],
    tags: [{ type: String, trim: true }]
  },
  {
    timestamps: true
  }
);

TaskSchema.index({ organizationId: 1, projectId: 1, taskNumber: 1 }, { unique: true });

export const Task = mongoose.model<ITask>('Task', TaskSchema);
