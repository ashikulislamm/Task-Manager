import mongoose from 'mongoose';
import { TASK_STATUS, TASK_STATUS_LIST } from '../constants/taskStatus.js';

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: TASK_STATUS_LIST,
      default: TASK_STATUS.TODO,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    dueDate: {
      type: Date,
    },
    category: {
      type: String,
      enum: ['work', 'personal', 'study', 'health'],
      default: 'personal',
    },
    completedAt: {
      type: Date,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrenceType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
    },
    recurrenceEndDate: {
      type: Date,
    },
    logs: [
      {
        content: {
          type: String,
          required: [true, 'Log content is required'],
          trim: true,
          maxlength: [500, 'Log content must be at most 500 characters'],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query performance
taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, priority: 1 });
taskSchema.index({ userId: 1, category: 1 });
taskSchema.index({ userId: 1, dueDate: 1 });

const Task = mongoose.model('Task', taskSchema);

export default Task;
