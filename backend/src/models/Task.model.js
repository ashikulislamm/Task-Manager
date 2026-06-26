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
    dueTime: {
      type: String,
      trim: true,
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
    subtasks: [
      {
        title: {
          type: String,
          required: [true, 'Subtask title is required'],
          trim: true,
        },
        completed: {
          type: Boolean,
          default: false,
        },
        dueDate: {
          type: Date,
        },
        completedAt: {
          type: Date,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    progressPercentage: {
      type: Number,
      default: 0,
    },
    priorityWeight: {
      type: Number,
      default: 2, // Default to medium priority weight (2)
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to automatically calculate progressPercentage and priorityWeight
taskSchema.pre('save', function () {
  // 1. Calculate progressPercentage
  if (!this.subtasks || this.subtasks.length === 0) {
    this.progressPercentage = this.status === 'done' ? 100 : 0;
  } else {
    const completedCount = this.subtasks.filter((s) => s.completed).length;
    this.progressPercentage = Math.round((completedCount / this.subtasks.length) * 100);
  }

  // 2. Map priority string to priorityWeight number for DB sorting
  const priorityWeights = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };
  this.priorityWeight = priorityWeights[this.priority] || 2;
});

// Indexes for query performance
taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, priorityWeight: -1 }); // Index for sorting by priority descending
taskSchema.index({ userId: 1, category: 1 });
taskSchema.index({ userId: 1, dueDate: 1 });
taskSchema.index({ userId: 1, isRecurring: 1 }); // Index for checking recurring tasks

const Task = mongoose.model('Task', taskSchema);

export default Task;
