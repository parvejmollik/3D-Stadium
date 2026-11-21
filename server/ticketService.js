import crypto from 'crypto';
import { stadiumStore, FIXTURE_INFO } from './stadiumData.js';
import { sanitizeString, validateEmail, validateSeatId } from './security.js';

// Secret key for HMAC digital signing (in production, set via process.env.TICKET_SIGNING_SECRET)
const TICKET_SECRET = process.env.TICKET_SIGNING_SECRET || 'matchday-arena-secure-256bit-hmac-key-2026';

export class TicketService {
  constructor() {
    this.issuedTickets = new Map();
  }

  generateTicketSignature(payload) {
    const raw = `${payload.ticketId}:${payload.seatId}:${payload.matchId}:${payload.price}:${payload.issuedAt}:${payload.customerEmail}`;
    return crypto.createHmac('sha256', TICKET_SECRET).update(raw).digest('hex');
  }

  verifyTicketSignature(ticket) {
    if (!ticket || !ticket.signature) return false;
    const expected = this.generateTicketSignature({
      ticketId: ticket.ticketId,
      seatId: ticket.seatId,
      matchId: ticket.matchId,
      price: ticket.price,
      issuedAt: ticket.issuedAt,
      customerEmail: ticket.customerEmail
    });
    return crypto.timingSafeEqual(Buffer.from(ticket.signature), Buffer.from(expected));
  }

  bookTicket({ seatId, sessionId, customerName, customerEmail, upgradeSkybox = false }) {
    // 1. Validate inputs strictly
    if (!validateSeatId(seatId)) {
      return { success: false, error: 'Invalid seat identifier format.', code: 'INVALID_SEAT_ID' };
    }

    const cleanName = sanitizeString(customerName);
    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: 'Valid attendee name is required (min 2 characters).', code: 'INVALID_NAME' };
    }

    if (!validateEmail(customerEmail)) {
      return { success: false, error: 'Valid email address is required for ticket delivery.', code: 'INVALID_EMAIL' };
    }

    // 2. Lock & Confirm seat in stadium store
    const bookingResult = stadiumStore.confirmBooking(seatId, sessionId, { name: cleanName, email: customerEmail });
    if (!bookingResult.success) {
      return bookingResult;
    }

    const seat = bookingResult.seat;
    const finalPrice = upgradeSkybox ? seat.price + 205 : seat.price;
    const finalTier = upgradeSkybox ? 'VIP Skybox Suite' : seat.tierName;
    const finalGate = upgradeSkybox ? 'VIP Gate West 1 (Red Carpet)' : seat.gate;

    // 3. Generate unique cryptographically unforgeable ticket ID
    const ticketId = 'TKT-' + crypto.randomBytes(6).toString('hex').toUpperCase();
    const issuedAt = Date.now();

    const signaturePayload = {
      ticketId,
      seatId: seat.id,
      matchId: FIXTURE_INFO.id,
      price: finalPrice,
      issuedAt,
      customerEmail
    };

    const signature = this.generateTicketSignature(signaturePayload);

    // 4. Construct ticket object
    const ticket = {
      ticketId,
      serialNumber: `MDA-2026-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      matchId: FIXTURE_INFO.id,
      match: FIXTURE_INFO,
      seatId: seat.id,
      stand: seat.standName,
      tier: finalTier,
      block: seat.block,
      row: seat.row,
      seatNumber: seat.seatNumber,
      gate: finalGate,
      price: finalPrice,
      currency: 'EUR',
      customerName: cleanName,
      customerEmail,
      isVipUpgrade: Boolean(upgradeSkybox),
      issuedAt,
      issuedAtIso: new Date(issuedAt).toISOString(),
      qrPayload: JSON.stringify({
        t: ticketId,
        s: seat.id,
        sig: signature.substring(0, 16), // Short signature hash for mobile turnstile scanner
        exp: FIXTURE_INFO.date
      }),
      signature
    };

    this.issuedTickets.set(ticketId, ticket);

    return {
      success: true,
      ticket
    };
  }

  getTicket(ticketId) {
    return this.issuedTickets.get(ticketId) || null;
  }

  verifyTurnstilePass(ticketId) {
    const ticket = this.issuedTickets.get(ticketId);
    if (!ticket) {
      return {
        valid: false,
        error: 'Ticket not found in central stadium access control database.',
        code: 'TICKET_NOT_FOUND'
      };
    }

    const isSignatureValid = this.verifyTicketSignature(ticket);
    if (!isSignatureValid) {
      return {
        valid: false,
        error: 'CRYPTOGRAPHIC TAMPER DETECTED: Digital signature mismatch. Entry rejected.',
        code: 'SIGNATURE_INVALID'
      };
    }

    return {
      valid: true,
      ticket: {
        ticketId: ticket.ticketId,
        serialNumber: ticket.serialNumber,
        attendee: ticket.customerName,
        stand: ticket.stand,
        gate: ticket.gate,
        block: ticket.block,
        row: ticket.row,
        seat: ticket.seatNumber,
        isVipUpgrade: ticket.isVipUpgrade,
        verifiedAt: new Date().toISOString()
      }
    };
  }
}

export const ticketService = new TicketService();
