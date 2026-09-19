import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemSetting extends Document {
  organizationId: mongoose.Types.ObjectId;
  companyName: string;
  supportEmail: string;
  timezone: string;
  currency: string;
  twoFactorRequired: boolean;
  sessionTimeoutMinutes: number;
  emailAlerts: boolean;
  slackAlerts: boolean;
  slackWebhookUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingSchema: Schema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true,
      index: true
    },
    companyName: {
      type: String,
      default: 'SparkX Global Tech',
      trim: true
    },
    supportEmail: {
      type: String,
      default: 'support@sparkx.corp',
      trim: true,
      lowercase: true
    },
    timezone: {
      type: String,
      default: 'America/New_York (UTC-05:00)'
    },
    currency: {
      type: String,
      default: 'USD ($)'
    },
    twoFactorRequired: {
      type: Boolean,
      default: true
    },
    sessionTimeoutMinutes: {
      type: Number,
      default: 60
    },
    emailAlerts: {
      type: Boolean,
      default: true
    },
    slackAlerts: {
      type: Boolean,
      default: false
    },
    slackWebhookUrl: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

export const SystemSetting = mongoose.model<ISystemSetting>('SystemSetting', SystemSettingSchema);
export default SystemSetting;
