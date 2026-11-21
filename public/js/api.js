// ==========================================================================
// MATCHDAY ARENA 3D - API CLIENT
// Secure frontend communication with backend endpoints
// ==========================================================================

export class StadiumAPI {
  constructor() {
    this.sessionId = this.getOrCreateSessionId();
  }

  getOrCreateSessionId() {
    let sid = localStorage.getItem('mda_session_id');
    if (!sid) {
      sid = 'usr_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      localStorage.setItem('mda_session_id', sid);
    }
    return sid;
  }

  async getFixture() {
    try {
      const res = await fetch('/api/stadium/fixture');
      const data = await res.json();
      return data.fixture;
    } catch (err) {
      console.error('Failed to load fixture:', err);
      return null;
    }
  }

  async getStands() {
    try {
      const res = await fetch('/api/stadium/stands');
      const data = await res.json();
      return data.stands;
    } catch (err) {
      console.error('Failed to load stands:', err);
      return null;
    }
  }

  async getBlockSeats(blockId) {
    try {
      const res = await fetch(`/api/stadium/blocks/${encodeURIComponent(blockId)}/seats`);
      const data = await res.json();
      return data.seats;
    } catch (err) {
      console.error(`Failed to load seats for block ${blockId}:`, err);
      return [];
    }
  }

  async reserveSeat(seatId) {
    try {
      const res = await fetch('/api/tickets/reserve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': this.sessionId
        },
        body: JSON.stringify({
          seatId,
          sessionId: this.sessionId
        })
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: 'Network communication failure' };
    }
  }

  async bookTicket({ seatId, customerName, customerEmail, upgradeSkybox = false }) {
    try {
      const res = await fetch('/api/tickets/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': this.sessionId
        },
        body: JSON.stringify({
          seatId,
          sessionId: this.sessionId,
          customerName,
          customerEmail,
          upgradeSkybox
        })
      });
      const data = await res.json();
      if (data.success && data.ticket) {
        this.saveTicketToWallet(data.ticket);
      }
      return data;
    } catch (err) {
      return { success: false, error: 'Checkout request failed' };
    }
  }

  async verifyTurnstile(ticketId) {
    try {
      const res = await fetch(`/api/tickets/verify/${encodeURIComponent(ticketId)}`);
      return await res.json();
    } catch (err) {
      return { valid: false, error: 'Turnstile gate offline' };
    }
  }

  saveTicketToWallet(ticket) {
    try {
      const current = this.getMyTickets();
      current.unshift(ticket);
      localStorage.setItem('mda_wallet_tickets', JSON.stringify(current));
    } catch (e) {
      console.warn('Wallet save failed:', e);
    }
  }

  getMyTickets() {
    try {
      const saved = localStorage.getItem('mda_wallet_tickets');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }
}

export const stadiumAPI = new StadiumAPI();

