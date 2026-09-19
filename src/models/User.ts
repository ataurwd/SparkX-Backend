import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  organizationId: mongoose.Types.ObjectId;
  email: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: string;
  roleId?: mongoose.Types.ObjectId;
  status: 'active' | 'invited' | 'suspended';
  isEmailVerified: boolean;
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    avatarUrl: { type: String },
    role: { type: String, default: 'Employee' },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role' },
    status: { type: String, enum: ['active', 'invited', 'suspended'], default: 'active' },
    isEmailVerified: { type: Boolean, default: false },
    googleId: { type: String }
  },
  { timestamps: true }
);

// Compound Unique Index: One email per organization
UserSchema.index({ organizationId: 1, email: 1 }, { unique: true });

export const User = mongoose.model<IUser>('User', UserSchema);
