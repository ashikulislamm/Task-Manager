import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

const protect = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.accessToken;

  // Fallback to Authorization header if cookies are not used (e.g. for testing)
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Not authorized, access token is missing');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user, select fields excluding password, and use lean for performance
    const user = await User.findById(decoded.id).select('-password').lean();
    if (!user) {
      throw new ApiError(401, 'Not authorized, user not found');
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, 'Not authorized, access token invalid or expired');
  }
});

export default protect;
