import mongoose, { Document, Schema } from 'mongoose';

export interface IReviewCycle extends Document {
  organizationId: mongoose.Types.ObjectId;
  title: string;
  period: string; // e.g. '2026-Q3'
  cycleType: 'quarterly' | 'semi_annual' | 'annual';
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'active' | 'evaluating' | 'completed';
  totalReviews: number;
  completedReviews: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewCycleSchema = new Schema<IReviewCycle>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    title: { type: String, required: true, trim: true },
    period: { type: String, required: true, index: true },
    cycleType: {
      type: String,
      enum: ['quarterly', 'semi_annual', 'annual'],
      default: 'quarterly'
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['draft', 'active', 'evaluating', 'completed'],
      default: 'active',
      index: true
    },
    totalReviews: { type: Number, default: 0 },
    completedReviews: { type: Number, default: 0 }
  },
  { timestamps: true }
);

ReviewCycleSchema.index({ organizationId: 1, period: 1 });

export const ReviewCycle = mongoose.model<IReviewCycle>('ReviewCycle', ReviewCycleSchema);
