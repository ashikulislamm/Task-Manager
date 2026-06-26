import crypto from 'crypto';
import ApiError from '../utils/ApiError.js';

export const csrfProtection = (req, res, next) => {
  // Safe methods do not require CSRF validation, but they will establish the cookie
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  
  // Create and set CSRF cookie if not present
  if (!req.cookies?.csrfToken) {
    const token = crypto.randomBytes(24).toString('hex');
    res.cookie('csrfToken', token, {
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: false, // False so client JS can read it to attach to headers
    });
    
    // Polyfill cookies for this request cycle
    if (!req.cookies) req.cookies = {};
    req.cookies.csrfToken = token;
  }

  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Exclude public authentication and health routes from CSRF checks
  const excludedPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout',
    '/api/auth/refresh',
    '/api/health',
    '/',
  ];

  if (excludedPaths.includes(req.path) || excludedPaths.includes(req.originalUrl)) {
    return next();
  }

  // Validate the double-submit token on mutating requests
  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new ApiError(403, 'CSRF verification failed. Missing or invalid X-CSRF-Token header.');
  }

  next();
};
