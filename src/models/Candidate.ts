import mongoose, { Document, Schema } from 'mongoose';

export type CandidateStage =
  | 'applied'
  | 'screening'
  | 'interview'
  | 'technical'
  | 'final'
  | 'offer'
  | 'hired'
  | 'rejected';

export interface ICandidateNote {
  _id?: mongoose.Types.ObjectId;
  authorName: string;
  text: string;
  createdAt: Date;
}

export interface IOfferDetails {
  salary?: number;
  currency?: string;
  joiningDate?: Date;
  status: 'draft' | 'sent' | 'accepted' | 'declined';
  sentAt?: Date;
}

export interface ICandidate extends Document {
  organizationId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  coverLetter?: string;
  portfolioUrl?: string;
  stage: CandidateStage;
  rating: number; // 1 to 5
  notes: ICandidateNote[];
  offerDetails?: IOfferDetails;
  createdAt: Date;
  updatedAt: Date;
}

const CandidateSchema = new Schema<ICandidate>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'JobOpening', required: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: '' },
    resumeUrl: { type: String, default: '' },
    coverLetter: { type: String, default: '' },
    portfolioUrl: { type: String, default: '' },
    stage: {
      type: String,
      enum: ['applied', 'screening', 'interview', 'technical', 'final', 'offer', 'hired', 'rejected'],
      default: 'applied',
      index: true
    },
    rating: { type: Number, default: 3, min: 1, max: 5 },
    notes: [
      {
        authorName: { type: String, default: 'Interviewer' },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    offerDetails: {
      salary: { type: Number },
      currency: { type: String, default: 'USD' },
      joiningDate: { type: Date },
      status: {
        type: String,
        enum: ['draft', 'sent', 'accepted', 'declined'],
        default: 'draft'
      },
      sentAt: { type: Date }
    }
  },
  { timestamps: true }
);

CandidateSchema.index({ organizationId: 1, stage: 1 });
CandidateSchema.index({ organizationId: 1, jobId: 1 });

export const Candidate = mongoose.model<ICandidate>('Candidate', CandidateSchema);
