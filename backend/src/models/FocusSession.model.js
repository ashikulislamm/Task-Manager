import mongoose from 'mongoose';

const focusSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: [true, 'Task ID is required'],
      index: true,
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required in minutes'],
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query speed
focusSessionSchema.index({ userId: 1, status: 1 });
focusSessionSchema.index({ userId: 1, startedAt: -1 });

const FocusSession = mongoose.model('FocusSession', focusSessionSchema);

export default FocusSession;
