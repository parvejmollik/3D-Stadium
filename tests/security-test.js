import assert from 'assert';
import { sanitizeString, validateEmail, validateSeatId } from '../server/security.js';
import { ticketService } from '../server/ticketService.js';
import { stadiumStore } from '../server/stadiumData.js';

console.log('🧪 Starting Stadium Security & Architecture Test Suite...\n');

// TEST 1: Input Sanitization & XSS Prevention
console.log('▶ Test 1: Input Sanitization & XSS Defense');
const rawXss = '<script>alert("hacked")</script><b>John</b>';
const sanitized = sanitizeString(rawXss);
assert.strictEqual(sanitized.includes('<script>'), false, 'Script tags must be escaped');
assert.strictEqual(sanitized.includes('&lt;script&gt;'), true, 'Angle brackets must be converted to HTML entities');
console.log('  ✔ XSS payloads properly neutralized:', sanitized);

// TEST 2: Email and SeatId Validation
console.log('\n▶ Test 2: Validation of IDs and Emails');
assert.strictEqual(validateEmail('fan@example.com'), true);
assert.strictEqual(validateEmail('invalid-email@'), false);
assert.strictEqual(validateEmail('injection" OR 1=1--@evil.com'), false);
assert.strictEqual(validateSeatId('EAST-LOWER-E101-R5-S12'), true);
assert.strictEqual(validateSeatId('EAST;DROP TABLE SEATS;--'), false);
console.log('  ✔ Strict schema validation passed for emails and seat IDs.');

// TEST 3: Cryptographic Ticket Signing & Tamper Detection
console.log('\n▶ Test 3: HMAC-SHA256 Ticket Digital Signatures & Anti-Tamper Verification');

// Find an available seat dynamically from store
let testSeatId = 'EAST-LOWER-E101-R2-S2';
const seatObj = stadiumStore.getSeat(testSeatId);
if (seatObj) seatObj.status = 'available';

// Book a test ticket
const booking = ticketService.bookTicket({
  seatId: testSeatId,
  sessionId: 'test-session-123',
  customerName: 'Marcus Rashford',
  customerEmail: 'marcus@manutd.com',
  upgradeSkybox: false
});

if (!booking.success) {
  console.error('Booking failed with:', booking);
}
assert.strictEqual(booking.success, true, 'Booking must succeed');
const validTicket = booking.ticket;
assert.ok(validTicket.signature, 'Ticket must contain digital signature');
assert.ok(validTicket.ticketId, 'Ticket must have ticketId');

// Verify genuine ticket
const verifyGenuine = ticketService.verifyTurnstilePass(validTicket.ticketId);
assert.strictEqual(verifyGenuine.valid, true, 'Genuine ticket must be validated');
console.log('  ✔ Genuine ticket cryptographically verified at turnstile gate:', validTicket.ticketId);

// Tamper simulation (attacker changes seat or price to pay less)
validTicket.price = 5; // Attacker changed price from 85 to 5
const verifyTampered = ticketService.verifyTurnstilePass(validTicket.ticketId);
assert.strictEqual(verifyTampered.valid, false, 'Tampered ticket must fail verification');
assert.strictEqual(verifyTampered.code, 'SIGNATURE_INVALID', 'Must report signature invalidation');
console.log('  ✔ Anti-tamper check successfully caught forged/altered ticket!');

// Restore valid price
validTicket.price = 85;

// TEST 4: Anti-Double-Booking / Race Condition Protection
console.log('\n▶ Test 4: Seat Reservation Concurrency & Double-Booking Protection');
const testSeat = 'NORTH-LOWER-N101-R3-S5';
const s4 = stadiumStore.getSeat(testSeat);
if (s4) s4.status = 'available';

// User 1 reserves the seat
const user1Reserve = stadiumStore.reserveSeat(testSeat, 'user-session-1');
assert.strictEqual(user1Reserve.success, true, 'First user reservation must succeed');

// User 2 attempts to reserve the same seat while locked
const user2Reserve = stadiumStore.reserveSeat(testSeat, 'user-session-2');
assert.strictEqual(user2Reserve.success, false, 'Second user reservation must be blocked');
assert.strictEqual(user2Reserve.code, 'SEAT_LOCKED', 'Seat must report locked status');
console.log('  ✔ Concurrency lock successfully stopped double-booking!');

console.log('\n======================================================');
console.log('✅ ALL SECURITY AND SYSTEM INTEGRITY TESTS PASSED!');
console.log('======================================================\n');
