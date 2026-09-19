import mongoose, { Document, Schema } from 'mongoose';

export interface IMeetingEvent extends Document {
  organizationId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  eventType: 'meeting' | 'holiday' | 'company_event' | 'deadline' | 'performance_review';
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  organizerId: mongoose.Types.ObjectId;
  organizerName: string;
  participants: mongoose.Types.ObjectId[];
  meetingLink?: string;
  roomLocation?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MeetingEventSchema = new Schema<IMeetingEvent>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    eventType: {
      type: String,
      enum: ['meeting', 'holiday', 'company_event', 'deadline', 'performance_review'],
      default: 'meeting'
    },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true },
    allDay: { type: Boolean, default: false },
    organizerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    organizerName: { type: String, required: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    meetingLink: { type: String, default: '' },
    roomLocation: { type: String, default: 'Conference Room Alpha / Virtual' },
    color: { type: String, default: '#6C5CE7' }
  },
  { timestamps: true }
);

MeetingEventSchema.index({ organizationId: 1, startDate: 1 });

export const MeetingEvent = mongoose.model<IMeetingEvent>('MeetingEvent', MeetingEventSchema);
