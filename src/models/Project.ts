import { Schema, model, Types } from 'mongoose';

const projectSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      default: 'general',
      trim: true,
    },
    collaborators: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    customExpenseCategories: {
      type: [String],
      default: [],
    },
    customIncomeCategories: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const Project = model('Project', projectSchema);
