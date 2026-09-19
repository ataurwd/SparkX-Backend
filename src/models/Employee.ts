import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployee extends Document {
  organizationId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  departmentId?: mongoose.Types.ObjectId;
  teamId?: mongoose.Types.ObjectId;
  designationId?: mongoose.Types.ObjectId;
  managerId?: mongoose.Types.ObjectId;
  gender?: string;
  dateOfBirth?: Date;
  joiningDate: Date;
  employmentType: 'full_time' | 'part_time' | 'contractor' | 'intern';
  employmentStatus: 'active' | 'probation' | 'notice' | 'terminated';
  workLocation: 'remote' | 'office' | 'hybrid';
  salary?: {
    base: number;
    currency: string;
  };
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema: Schema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    employeeCode: { type: String, required: true, trim: true, uppercase: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    avatarUrl: { type: String },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', index: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    designationId: { type: Schema.Types.ObjectId, ref: 'Designation' },
    managerId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    dateOfBirth: { type: Date },
    joiningDate: { type: Date, required: true, default: Date.now },
    employmentType: {
      type: String,
      enum: ['full_time', 'part_time', 'contractor', 'intern'],
      default: 'full_time'
    },
    employmentStatus: {
      type: String,
      enum: ['active', 'probation', 'notice', 'terminated'],
      default: 'active',
      index: true
    },
    workLocation: {
      type: String,
      enum: ['remote', 'office', 'hybrid'],
      default: 'office'
    },
    salary: {
      base: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' }
    },
    emergencyContact: {
      name: { type: String },
      relation: { type: String },
      phone: { type: String }
    },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      zip: { type: String },
      country: { type: String }
    }
  },
  { timestamps: true }
);

// Compound indexes for multi-tenant isolation and fast lookup
EmployeeSchema.index({ organizationId: 1, employeeCode: 1 }, { unique: true });
EmployeeSchema.index({ organizationId: 1, email: 1 });
EmployeeSchema.index({ organizationId: 1, departmentId: 1, employmentStatus: 1 });

export const Employee = mongoose.model<IEmployee>('Employee', EmployeeSchema);
