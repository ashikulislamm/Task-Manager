import authService from '../services/auth.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { accessTokenCookieOptions, refreshTokenCookieOptions } from '../utils/cookieOptions.js';

/**
 * Register a new user and set auth cookies
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.register({ name, email, password });

  res
    .status(201)
    .cookie('accessToken', accessToken, accessTokenCookieOptions)
    .cookie('refreshToken', refreshToken, refreshTokenCookieOptions)
    .json(new ApiResponse(201, 'User registered successfully', { user, accessToken }));
});

/**
 * Login an existing user and set auth cookies
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.login({ email, password });

  res
    .status(200)
    .cookie('accessToken', accessToken, accessTokenCookieOptions)
    .cookie('refreshToken', refreshToken, refreshTokenCookieOptions)
    .json(new ApiResponse(200, 'Login successful', { user, accessToken }));
});

/**
 * Logout the user by clearing access and refresh cookies
 */
export const logout = asyncHandler(async (req, res) => {
  res
    .status(200)
    .clearCookie('accessToken', accessTokenCookieOptions)
    .clearCookie('refreshToken', refreshTokenCookieOptions)
    .json(new ApiResponse(200, 'Logout successful'));
});

/**
 * Refresh user session and issue a new access token
 */
export const refreshSession = asyncHandler(async (req, res) => {
  // Look for refresh token in cookies or body
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  const { accessToken, user } = await authService.refreshSession(token);

  res
    .status(200)
    .cookie('accessToken', accessToken, accessTokenCookieOptions)
    .json(new ApiResponse(200, 'Token refreshed successfully', { user, accessToken }));
});

/**
 * Get profile of the current logged-in user
 */
export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, 'User profile fetched successfully', { user: req.user }));
});

/**
 * Update current user's profile info (name, email)
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  const updatedUser = await authService.updateProfile(req.user._id, { name, email });

  res.status(200).json(new ApiResponse(200, 'Profile updated successfully', { user: updatedUser }));
});

/**
 * Change current user's password
 */
export const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.updatePassword(req.user._id, { currentPassword, newPassword });

  res.status(200).json(new ApiResponse(200, 'Password changed successfully'));
});

/**
 * Delete current user's account and clear cookies
 */
export const deleteAccount = asyncHandler(async (req, res) => {
  await authService.deleteAccount(req.user._id);

  res
    .status(200)
    .clearCookie('accessToken', accessTokenCookieOptions)
    .clearCookie('refreshToken', refreshTokenCookieOptions)
    .json(new ApiResponse(200, 'Account deleted successfully'));
});
