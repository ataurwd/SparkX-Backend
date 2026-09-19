import mongoose, { Document, Schema } from 'mongoose';

export interface ISelfAssessment {
  accomplishments: string;
  challenges: string;
  goalsProgressSummary: string;
  rating: number; // 1 to 5
  submittedAt?: Date;
}

export interface IManagerAssessment {
  strengths: string;
  growthAreas: string;
  feedback: string;
  leadershipRating: number; // 1 to 5
  executionRating: number; // 1 to 5
  cultureRating: number; // 1 to 5
  overallRating: number; // 1 to 5
  promotionRecommendation: 'not_ready' | 'ready' | 'promoted';
  salaryIncrementRecommendation: number; // percentage
  submittedAt?: Date;
}

export interface IPerformanceReview extends Document {
  organizationId: mongoose.Types.ObjectId;
  cycleId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  reviewerId?: mongoose.Types.ObjectId;
  status: 'self_review' | 'manager_review' | 'completed';
  selfAssessment: ISelfAssessment;
  managerAssessment: IManagerAssessment;
  finalScore: number; // 1.0 to 5.0
  performanceBand: 'needs_improvement' | 'meets_expectations' | 'exceeds_expectations' | 'exceptional';
  acknowledgedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PerformanceReviewSchema = new Schema<IPerformanceReview>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    cycleId: { type: Schema.Types.ObjectId, ref: 'ReviewCycle', required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'Employee', index: true },
    status: {
      type: String,
      enum: ['self_review', 'manager_review', 'completed'],
      default: 'self_review',
      index: true
    },
    selfAssessment: {
      accomplishments: { type: String, default: '' },
      challenges: { type: String, default: '' },
      goalsProgressSummary: { type: String, default: '' },
      rating: { type: Number, default: 3, min: 1, max: 5 },
      submittedAt: { type: Date }
    },
    managerAssessment: {
      strengths: { type: String, default: '' },
      growthAreas: { type: String, default: '' },
      feedback: { type: String, default: '' },
      leadershipRating: { type: Number, default: 3, min: 1, max: 5 },
      executionRating: { type: Number, default: 3, min: 1, max: 5 },
      cultureRating: { type: Number, default: 3, min: 1, max: 5 },
      overallRating: { type: Number, default: 3, min: 1, max: 5 },
      promotionRecommendation: {
        type: String,
        enum: ['not_ready', 'ready', 'promoted'],
        default: 'not_ready'
      },
      salaryIncrementRecommendation: { type: Number, default: 0 },
      submittedAt: { type: Date }
    },
    finalScore: { type: Number, default: 0, min: 0, max: 5 },
    performanceBand: {
      type: String,
      enum: ['needs_improvement', 'meets_expectations', 'exceeds_expectations', 'exceptional'],
      default: 'meets_expectations'
    },
    acknowledgedAt: { type: Date }
  },
  { timestamps: true }
);

PerformanceReviewSchema.index({ organizationId: 1, cycleId: 1, employeeId: 1 }, { unique: true });

export const PerformanceReview = mongoose.model<IPerformanceReview>('PerformanceReview', PerformanceReviewSchema);
