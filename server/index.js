import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  configureSecurityHeaders,
  apiRateLimiter,
  bookingRateLimiter,
  verifyRateLimiter,
  validateSeatId,
  sanitizeString
} from './security.js';
import { FIXTURE_INFO, STANDS_CONFIG, stadiumStore } from './stadiumData.js';
import { ticketService } from './ticketService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Core Security Middlewares
app.use(configureSecurityHeaders());
app.use(cors({
  origin: '*', // For local dev & preview; in strict prod specify allowed domains
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID']
}));
app.use(express.json({ limit: '50kb' })); // Mitigate payload flooding
app.use(express.urlencoded({ extended: false, limit: '50kb' }));

// 2. Serve Three.js library modules locally
app.use('/vendor/three', express.static(path.join(rootDir, 'node_modules', 'three')));

// 3. Serve Frontend Static Assets
app.use(express.static(path.join(rootDir, 'public')));

// 4. API Endpoints (with Rate Limiting and Strict Input Validation)

// Health and Security Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    security: {
      helmet: 'ENABLED',
      csp: 'ACTIVE',
      rateLimiting: 'ACTIVE',
      hmacVerification: 'ACTIVE'
    }
  });
});

// Match Fixture Details
app.get('/api/stadium/fixture', apiRateLimiter, (req, res) => {
  res.json({
    success: true,
    fixture: FIXTURE_INFO
  });
});

// All Stands Config & Live Availability
app.get('/api/stadium/stands', apiRateLimiter, (req, res) => {
  try {
    const stands = {};
    Object.keys(STANDS_CONFIG).forEach(standKey => {
      const stats = stadiumStore.getStandStats(standKey);
      stands[standKey] = {
        ...STANDS_CONFIG[standKey],
        stats
      };
    });

    res.json({
      success: true,
      stands
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Seats for a specific Block
app.get('/api/stadium/blocks/:blockId/seats', apiRateLimiter, (req, res) => {
  try {
    const blockId = sanitizeString(req.params.blockId);
    if (!blockId || !/^[A-Z0-9\-]+$/i.test(blockId)) {
      return res.status(400).json({ success: false, error: 'Invalid block identifier' });
    }

    const seats = stadiumStore.getBlockSeats(blockId);
    res.json({
      success: true,
      blockId,
      totalSeats: seats.length,
      seats
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve seats' });
  }
});

// Reserve a Seat (Atomic lock for 5 minutes)
app.post('/api/tickets/reserve', bookingRateLimiter, (req, res) => {
  try {
    const { seatId, sessionId } = req.body;

    if (!seatId || !validateSeatId(seatId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid seatId format. Expected STAND-TIER-BLOCK-R#-S#',
        code: 'INVALID_SEAT_ID'
      });
    }

    const cleanSession = sanitizeString(sessionId) || 'anon-' + Date.now();
    const result = stadiumStore.reserveSeat(seatId, cleanSession);

    if (!result.success) {
      const statusCode = result.code === 'SEAT_NOT_FOUND' ? 404 : 409;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to reserve seat' });
  }
});

// Book Ticket and Issue Signed Digital Pass
app.post('/api/tickets/book', bookingRateLimiter, (req, res) => {
  try {
    const { seatId, sessionId, customerName, customerEmail, upgradeSkybox } = req.body;

    const result = ticketService.bookTicket({
      seatId,
      sessionId: sanitizeString(sessionId),
      customerName,
      customerEmail,
      upgradeSkybox: Boolean(upgradeSkybox)
    });

    if (!result.success) {
      const statusCode = result.code === 'SEAT_TAKEN' || result.code === 'SEAT_ALREADY_PURCHASED' ? 409 : 400;
      return res.status(statusCode).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Booking Error:', error);
    res.status(500).json({ success: false, error: 'Booking failed due to an unexpected server error.' });
  }
});

// Turnstile Gate Ticket Verification
app.get('/api/tickets/verify/:ticketId', verifyRateLimiter, (req, res) => {
  try {
    const ticketId = sanitizeString(req.params.ticketId);
    if (!ticketId || !/^TKT-[A-F0-9]+$/i.test(ticketId)) {
      return res.status(400).json({
        valid: false,
        error: 'Malformed ticket ID format',
        code: 'MALFORMED_TICKET_ID'
      });
    }

    const verification = ticketService.verifyTurnstilePass(ticketId);
    if (!verification.valid) {
      return res.status(403).json(verification);
    }

    res.json(verification);
  } catch (error) {
    res.status(500).json({ valid: false, error: 'Verification system error' });
  }
});

// Fallback to SPA index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(rootDir, 'public', 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    error: 'A secure internal server error occurred.'
  });
});

export const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🏟️  MATCHDAY ARENA 3D - PRODUCTION SERVER ONLINE`);
  console.log(`🌐  Local URL: http://localhost:${PORT}`);
  console.log(`🔒  Security Features: Helmet CSP, Rate Limiting,`);
  console.log(`    HMAC-SHA256 Signed Tickets, Input Sanitization`);
  console.log(`====================================================`);
});

export default app;
