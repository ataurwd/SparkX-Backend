import mongoose, { Document, Schema } from 'mongoose';

export interface IAsset extends Document {
  organizationId: mongoose.Types.ObjectId;
  assetTag: string;
  name: string;
  category: 'laptop' | 'monitor' | 'mobile' | 'peripherals' | 'license' | 'furniture' | 'vehicle';
  serialNumber: string;
  assignedTo?: {
    employeeId?: mongoose.Types.ObjectId;
    employeeName?: string;
    department?: string;
  };
  assignedDate?: Date;
  purchaseDate: Date;
  purchaseCost: number;
  currency: string;
  warrantyExpiry?: Date;
  condition: 'new' | 'good' | 'fair' | 'damaged';
  status: 'assigned' | 'available' | 'maintenance' | 'retired';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssetSchema = new Schema<IAsset>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    assetTag: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['laptop', 'monitor', 'mobile', 'peripherals', 'license', 'furniture', 'vehicle'],
      default: 'laptop',
      index: true
    },
    serialNumber: { type: String, default: '' },
    assignedTo: {
      employeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
      employeeName: { type: String, default: '' },
      department: { type: String, default: '' }
    },
    assignedDate: { type: Date },
    purchaseDate: { type: Date, default: Date.now },
    purchaseCost: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    warrantyExpiry: { type: Date },
    condition: {
      type: String,
      enum: ['new', 'good', 'fair', 'damaged'],
      default: 'good'
    },
    status: {
      type: String,
      enum: ['assigned', 'available', 'maintenance', 'retired'],
      default: 'available',
      index: true
    },
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

AssetSchema.index({ organizationId: 1, status: 1 });

export const Asset = mongoose.model<IAsset>('Asset', AssetSchema);
