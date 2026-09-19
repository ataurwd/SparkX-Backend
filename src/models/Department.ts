import mongoose, { Schema, Document } from 'mongoose';

export interface IDepartment extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  code?: string;
  managerId?: mongoose.Types.ObjectId;
  parentDepartmentId?: mongoose.Types.ObjectId;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema: Schema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'User' },
    parentDepartmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    color: { type: String, default: '#6C5CE7' }
  },
  { timestamps: true }
);

DepartmentSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const Department = mongoose.model<IDepartment>('Department', DepartmentSchema);
