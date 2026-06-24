import authService from '../services/auth.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { cookieOptions } from '../utils/cookieOptions.js';

/**
 * Register a new user
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const { user, token } = await authService.register({ name, email, password });

  res
    .status(201)
    .cookie('token', token, cookieOptions)
    .json(new ApiResponse(201, 'User registered successfully', { user }));
});

/**
 * Login an existing user
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, token } = await authService.login({ email, password });

  res
    .status(200)
    .cookie('token', token, cookieOptions)
    .json(new ApiResponse(200, 'Login successful', { user }));
});

/**
 * Logout the user by clearing the JWT token cookie
 */
export const logout = asyncHandler(async (req, res) => {
  res
    .status(200)
    .clearCookie('token', cookieOptions)
    .json(new ApiResponse(200, 'Logout successful'));
});

/**
 * Get profile of the current logged-in user
 */
export const getMe = asyncHandler(async (req, res) => {
  // req.user is populated by the auth middleware
  res.status(200).json(new ApiResponse(200, 'User profile fetched successfully', { user: req.user }));
});
