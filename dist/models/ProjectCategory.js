import { Schema, model } from "mongoose";

const projectCategorySchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["expense", "income"],
      required: true,
    },

    color: {
      type: String,
      default: "#1976d2",
    },

    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate category names of the same type within a project
projectCategorySchema.index(
  {
    projectId: 1,
    type: 1,
    name: 1,
  },
  {
    unique: true,
  }
);

export const ProjectCategory = model(
  "ProjectCategory",
  projectCategorySchema
);