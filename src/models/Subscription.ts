import mongoose, { Document, Schema } from 'mongoose';

export interface IInvoice {
  invoiceNumber: string;
  date: Date;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  paymentMethod: string;
  pdfUrl?: string;
}

export interface ISubscription extends Document {
  organizationId: mongoose.Types.ObjectId;
  plan: 'starter' | 'growth' | 'enterprise';
  status: 'active' | 'trial' | 'past_due' | 'cancelled';
  seatsTotal: number;
  seatsAssigned: number;
  billingCycle: 'monthly' | 'yearly';
  price: number;
  currency: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  invoices: IInvoice[];
  paymentMethod: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema: Schema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true,
      index: true
    },
    plan: {
      type: String,
      enum: ['starter', 'growth', 'enterprise'],
      default: 'growth'
    },
    status: {
      type: String,
      enum: ['active', 'trial', 'past_due', 'cancelled'],
      default: 'active'
    },
    seatsTotal: {
      type: Number,
      default: 100
    },
    seatsAssigned: {
      type: Number,
      default: 1
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },
    price: {
      type: Number,
      default: 299
    },
    currency: {
      type: String,
      default: 'USD'
    },
    currentPeriodStart: {
      type: Date,
      default: Date.now
    },
    currentPeriodEnd: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    invoices: [
      {
        invoiceNumber: { type: String, required: true },
        date: { type: Date, default: Date.now },
        amount: { type: Number, required: true },
        currency: { type: String, default: 'USD' },
        status: { type: String, enum: ['paid', 'pending', 'failed'], default: 'paid' },
        paymentMethod: { type: String, default: 'Visa ending 4242' },
        pdfUrl: { type: String }
      }
    ],
    paymentMethod: {
      brand: { type: String, default: 'Visa' },
      last4: { type: String, default: '4242' },
      expMonth: { type: Number, default: 12 },
      expYear: { type: Number, default: 2028 }
    }
  },
  {
    timestamps: true
  }
);

export const Subscription = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
export default Subscription;
