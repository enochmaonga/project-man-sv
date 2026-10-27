import { Schema, model, Document } from 'mongoose';

export interface IAttachment {
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
  uploadedAt?: Date;
}

export interface ITransaction extends Document {
  projectId: Schema.Types.ObjectId;
  type: 'expense' | 'income';
  category: string;
  amount: number;
  description: string;
  date: Date;
  attachments: IAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      default: '',
      trim: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const transactionSchema = new Schema<ITransaction>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    type: {
      type: String,
      enum: ['expense', 'income'],
      required: [true, 'Transaction type (expense or income) is required'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be greater than or equal to 0'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const Transaction = model<ITransaction>('Transaction', transactionSchema);
