import mongoose, { Document, Schema } from 'mongoose';

export interface IAttendee {
  name: string;
  role: string;
  present: boolean;
}

export interface IActionItem {
  task: string;
  assignee: string;
  dueDate?: Date;
  completed: boolean;
  completedAt?: Date;
}

export interface IMeetingSession extends Document {
  organizationId: mongoose.Types.ObjectId;
  title: string;
  department: string;
  meetingDate: Date;
  startTime: string;
  endTime: string;
  location: string;
  meetingLink?: string;
  organizerName: string;
  agenda: string[];
  notes?: string;
  attendees: IAttendee[];
  actionItems: IActionItem[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const AttendeeSchema = new Schema<IAttendee>(
  {
    name: { type: String, required: true },
    role: { type: String, default: 'Member' },
    present: { type: Boolean, default: true }
  },
  { _id: false }
);

const ActionItemSchema = new Schema<IActionItem>(
  {
    task: { type: String, required: true },
    assignee: { type: String, required: true },
    dueDate: { type: Date },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date }
  },
  { _id: false }
);

const MeetingSessionSchema = new Schema<IMeetingSession>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    title: { type: String, required: true, trim: true },
    department: { type: String, default: 'All Company' },
    meetingDate: { type: Date, required: true, index: true },
    startTime: { type: String, default: '10:00 AM' },
    endTime: { type: String, default: '11:00 AM' },
    location: { type: String, default: 'Executive Boardroom A / Virtual Meet' },
    meetingLink: { type: String, default: 'https://meet.google.com/spk-xops-syn' },
    organizerName: { type: String, default: 'Operations Admin' },
    agenda: [{ type: String }],
    notes: { type: String, default: '' },
    attendees: [AttendeeSchema],
    actionItems: [ActionItemSchema],
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true
    }
  },
  { timestamps: true }
);

MeetingSessionSchema.index({ organizationId: 1, meetingDate: -1 });

export const MeetingSession = mongoose.model<IMeetingSession>('MeetingSession', MeetingSessionSchema);
