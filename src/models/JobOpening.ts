import mongoose, { Document, Schema } from 'mongoose';

export interface IJobOpening extends Document {
  organizationId: mongoose.Types.ObjectId;
  title: string;
  code: string; // e.g. 'JOB-2026-01'
  departmentId?: mongoose.Types.ObjectId;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'remote';
  location: string;
  openingsCount: number;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  experienceLevel: 'junior' | 'mid' | 'senior' | 'lead';
  description: string;
  requirements: string[];
  status: 'draft' | 'published' | 'closed';
  deadline?: Date;
  totalApplicants: number;
  hiredCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const JobOpeningSchema = new Schema<IJobOpening>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    title: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    employmentType: {
      type: String,
      enum: ['full_time', 'part_time', 'contract', 'remote'],
      default: 'full_time'
    },
    location: { type: String, default: 'Headquarters / Hybrid' },
    openingsCount: { type: Number, default: 1 },
    salaryMin: { type: Number, default: 0 },
    salaryMax: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    experienceLevel: {
      type: String,
      enum: ['junior', 'mid', 'senior', 'lead'],
      default: 'mid'
    },
    description: { type: String, default: '' },
    requirements: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ['draft', 'published', 'closed'],
      default: 'published',
      index: true
    },
    deadline: { type: Date },
    totalApplicants: { type: Number, default: 0 },
    hiredCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

JobOpeningSchema.index({ organizationId: 1, status: 1 });
JobOpeningSchema.index({ organizationId: 1, code: 1 }, { unique: true });

export const JobOpening = mongoose.model<IJobOpening>('JobOpening', JobOpeningSchema);
