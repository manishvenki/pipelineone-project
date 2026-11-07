import rateLimit from 'express-rate-limit';

// Standard API rate limiter: 120 requests per minute
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again in a minute.',
  },
});

// Stricter rate limiter for authentication: 15 attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

// Upload rate limiter: 10 uploads per 10 minutes
export const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Upload limit reached. Please wait a few minutes before uploading another archive.',
  },
});

export default {
  apiLimiter,
  authLimiter,
  uploadLimiter,
};

