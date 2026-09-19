import mongoose, { Document, Schema } from 'mongoose';

export interface IAnnouncement extends Document {
  organizationId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  title: string;
  content: string;
  category: 'general' | 'company_news' | 'policy' | 'event' | 'emergency';
  priority: 'normal' | 'important' | 'urgent';
  targetAudience: 'all' | 'department' | 'leadership';
  departmentId?: mongoose.Types.ObjectId;
  pinned: boolean;
  attachments: string[];
  acknowledgedBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['general', 'company_news', 'policy', 'event', 'emergency'],
      default: 'company_news'
    },
    priority: {
      type: String,
      enum: ['normal', 'important', 'urgent'],
      default: 'normal'
    },
    targetAudience: {
      type: String,
      enum: ['all', 'department', 'leadership'],
      default: 'all'
    },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    pinned: { type: Boolean, default: false },
    attachments: [{ type: String }],
    acknowledgedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: true }
);

AnnouncementSchema.index({ organizationId: 1, pinned: -1, createdAt: -1 });

export const Announcement = mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);
