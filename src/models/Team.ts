import mongoose, { Schema, Document } from 'mongoose';

export interface ITeam extends Document {
  organizationId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  leadId?: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema: Schema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    name: { type: String, required: true, trim: true },
    description: { type: String }
  },
  { timestamps: true }
);

TeamSchema.index({ organizationId: 1, departmentId: 1, name: 1 }, { unique: true });

export const Team = mongoose.model<ITeam>('Team', TeamSchema);
