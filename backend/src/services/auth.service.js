import mongoose from 'mongoose';
import User from '../models/User.model.js';
import Task from '../models/Task.model.js';
import Activity from '../models/Activity.model.js';
import FocusSession from '../models/FocusSession.model.js';
import ApiError from '../utils/ApiError.js';
import { generateAccessToken, generateRefreshToken } from '../utils/generateToken.js';
import jwt from 'jsonwebtoken';

class AuthService {
  /**
   * Register a new user
   */
  async register({ name, email, password }) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError(409, 'User with this email already exists');
    }

    const user = await User.create({ name, email, password });
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    return { user, accessToken, refreshToken };
  }

  /**
   * Login user and return user info + tokens
   */
  async login({ email, password }) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    return { user, accessToken, refreshToken };
  }

  /**
   * Verify refresh token and generate a new access token
   */
  async refreshSession(refreshToken) {
    if (!refreshToken) {
      throw new ApiError(401, 'Refresh token is missing');
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password').lean();
      if (!user) {
        throw new ApiError(401, 'Invalid session, user not found');
      }

      const newAccessToken = generateAccessToken(user._id);
      return { accessToken: newAccessToken, user };
    } catch (err) {
      throw new ApiError(401, 'Refresh token invalid or expired');
    }
  }

  /**
   * Get user profile details
   */
  async getProfile(userId) {
    const user = await User.findById(userId).select('-password').lean();
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    return user;
  }

  /**
   * Update profile details (name and email)
   */
  async updateProfile(userId, { name, email }) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new ApiError(409, 'Email is already taken');
      }
      user.email = email;
    }

    if (name) {
      user.name = name;
    }

    await user.save();
    
    // Convert to object to trigger toJSON and remove password
    return user.toJSON();
  }

  /**
   * Update password after verifying current password
   */
  async updatePassword(userId, { currentPassword, newPassword }) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const isPasswordCorrect = await user.comparePassword(currentPassword);
    if (!isPasswordCorrect) {
      throw new ApiError(400, 'Incorrect current password');
    }

    user.password = newPassword;
    await user.save();
    return { success: true };
  }

  /**
   * Delete user account and all related records inside a transaction
   */
  async deleteAccount(userId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const user = await User.findById(userId).session(session);
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      // Delete all related records in a transaction to ensure atomicity
      await Task.deleteMany({ userId }).session(session);
      await Activity.deleteMany({ userId }).session(session);
      await FocusSession.deleteMany({ userId }).session(session);
      await User.findByIdAndDelete(userId).session(session);

      await session.commitTransaction();
      session.endSession();
      return { success: true };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
}

export default new AuthService();
