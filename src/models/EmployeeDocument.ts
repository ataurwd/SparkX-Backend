import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployeeDocument extends Document {
  organizationId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  title: string;
  category: 'nid' | 'passport' | 'contract' | 'certificate' | 'resume' | 'tax' | 'other';
  fileUrl: string;
  fileSizeBytes: number;
  mimeType: string;
  isConfidential: boolean;
  uploadedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeDocumentSchema: Schema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['nid', 'passport', 'contract', 'certificate', 'resume', 'tax', 'other'],
      required: true
    },
    fileUrl: { type: String, required: true },
    fileSizeBytes: { type: Number, default: 0 },
    mimeType: { type: String, default: 'application/pdf' },
    isConfidential: { type: Boolean, default: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

EmployeeDocumentSchema.index({ organizationId: 1, employeeId: 1, category: 1 });

export const EmployeeDocument = mongoose.model<IEmployeeDocument>('EmployeeDocument', EmployeeDocumentSchema);
