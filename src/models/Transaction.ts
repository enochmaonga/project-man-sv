import { Schema, model } from 'mongoose';

const transactionSchema = new Schema(
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
  },
  {
    timestamps: true,
  }
);

export const Transaction = model('Transaction', transactionSchema);
