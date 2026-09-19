import mongoose, { Schema, Document } from 'mongoose';

export interface IDesignation extends Document {
  organizationId: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  title: string;
  level?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DesignationSchema: Schema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    title: { type: String, required: true, trim: true },
    level: { type: String, default: 'Mid' },
    description: { type: String }
  },
  { timestamps: true }
);

DesignationSchema.index({ organizationId: 1, title: 1 }, { unique: true });

export const Designation = mongoose.model<IDesignation>('Designation', DesignationSchema);
