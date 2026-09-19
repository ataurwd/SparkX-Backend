import mongoose, { Document, Schema } from 'mongoose';

export interface IInterview extends Document {
  organizationId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  interviewers: mongoose.Types.ObjectId[];
  title: string;
  type: 'video' | 'in_person' | 'phone';
  scheduledDate: Date;
  startTime: string;
  endTime: string;
  meetingLink?: string;
  location?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  feedback?: {
    rating: number;
    comments: string;
    recommendation: 'strong_yes' | 'yes' | 'neutral' | 'no';
    submittedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const InterviewSchema = new Schema<IInterview>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true, index: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'JobOpening', required: true, index: true },
    interviewers: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['video', 'in_person', 'phone'],
      default: 'video'
    },
    scheduledDate: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    meetingLink: { type: String, default: '' },
    location: { type: String, default: 'Virtual / Google Meet' },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'no_show'],
      default: 'scheduled',
      index: true
    },
    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comments: { type: String, default: '' },
      recommendation: {
        type: String,
        enum: ['strong_yes', 'yes', 'neutral', 'no'],
        default: 'yes'
      },
      submittedAt: { type: Date }
    }
  },
  { timestamps: true }
);

InterviewSchema.index({ organizationId: 1, scheduledDate: 1 });

export const Interview = mongoose.model<IInterview>('Interview', InterviewSchema);
