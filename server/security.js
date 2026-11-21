import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Security Headers Configuration
export const configureSecurityHeaders = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Needed for inline module imports & workers
          'https://cdnjs.cloudflare.com',
          'https://unpkg.com'
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://cdnjs.cloudflare.com'
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
          'data:'
        ],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https:'
        ],
        connectSrc: [
          "'self'",
          'data:',
          'blob:'
        ],
        mediaSrc: ["'self'", 'data:', 'blob:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false, // Allows cross-origin textures & audio buffers if needed
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  });
};

// General API rate limiter (protects against scrapers and denial-of-service)
export const apiRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 200, // Max 200 requests per 10 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP address, please try again in a few minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// Sensitive endpoints rate limiter (Seat reservations & Checkout)
export const bookingRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Max 20 booking/reservation attempts per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Reservation velocity exceeded. Please slow down to prevent bot detection.',
    code: 'BOOKING_RATE_LIMIT_EXCEEDED'
  }
});

// Ticket verification gate rate limiter
export const verifyRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Verification rate limit exceeded.',
    code: 'VERIFY_RATE_LIMIT_EXCEEDED'
  }
});

// Input Sanitizer and Validation Utilities
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[<>'"&]/g, (char) => {
      switch (char) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case "'": return '&#39;';
        case '"': return '&quot;';
        case '&': return '&amp;';
        default: return char;
      }
    })
    .trim()
    .slice(0, 100); // Enforce max length
};

export const validateEmail = (email) => {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email) && email.length <= 120;
};

export const validateSeatId = (seatId) => {
  if (typeof seatId !== 'string') return false;
  // Format: STAND-TIER-BLOCK-ROW-SEAT (e.g. EAST-LOWER-101-R12-S24)
  const seatIdRegex = /^(NORTH|SOUTH|EAST|WEST)-(LOWER|UPPER|VIP)-[A-Z0-9]+-R\d+-S\d+$/;
  return seatIdRegex.test(seatId);
};

