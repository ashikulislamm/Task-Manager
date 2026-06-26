const commonOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
};

// 15 minutes cookie lifespan for Access Token
export const accessTokenCookieOptions = {
  ...commonOptions,
  maxAge: 15 * 60 * 1000,
};

// 7 days cookie lifespan for Refresh Token
export const refreshTokenCookieOptions = {
  ...commonOptions,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
