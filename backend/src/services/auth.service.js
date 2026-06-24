import User from '../models/User.model.js';
import ApiError from '../utils/ApiError.js';
import generateToken from '../utils/generateToken.js';

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
    const token = generateToken(user._id);

    return { user, token };
  }

  /**
   * Login user and return user info + token
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

    const token = generateToken(user._id);

    return { user, token };
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
}

export default new AuthService();
