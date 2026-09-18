import rateLimit from 'express-rate-limit';

/** Public feedback form only — generous enough for normal use, blocks spam bursts. */
export const feedbackRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT',
      message: 'Too many feedback submissions. Try again in a few minutes.',
    },
  },
});
