import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  organizationId: mongoose.Types.ObjectId;
  conversationType: 'direct' | 'channel';
  channelName?: string; // e.g. '#general', '#engineering'
  participants: mongoose.Types.ObjectId[];
  senderId: mongoose.Types.ObjectId;
  senderName: string;
  senderAvatar?: string;
  content: string;
  attachments: string[];
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    conversationType: {
      type: String,
      enum: ['direct', 'channel'],
      default: 'channel',
      index: true
    },
    channelName: { type: String, default: '#general', index: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    senderAvatar: { type: String, default: '' },
    content: { type: String, required: true, trim: true },
    attachments: [{ type: String }],
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: true }
);

MessageSchema.index({ organizationId: 1, channelName: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
