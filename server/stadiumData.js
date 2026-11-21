// Stadium Data & Specification

export const FIXTURE_INFO = {
  id: 'MATCH-FINAL-2026',
  title: 'Champions Arena Cup Final 2026',
  homeTeam: {
    name: 'Apex FC',
    shortName: 'APX',
    color: '#e63946',
    logo: '🔴'
  },
  awayTeam: {
    name: 'Titan Rovers',
    shortName: 'TTR',
    color: '#3a86ff',
    logo: '🔵'
  },
  date: 'Saturday, November 28, 2026',
  kickoff: '20:00 CET',
  venue: 'Matchday Grand Arena',
  city: 'Metropolis',
  gateOpening: '18:00 CET'
};

export const STANDS_CONFIG = {
  NORTH: {
    id: 'NORTH',
    name: 'North Stand (The Kop)',
    description: 'Electric atmosphere behind the home goal. Traditional fan terrace section.',
    gate: 'Gates A1 - A4',
    tiers: {
      LOWER: { name: 'Lower Tier', price: 50, blocks: ['N101', 'N102', 'N103', 'N104', 'N105', 'N106', 'N107', 'N108'] },
      UPPER: { name: 'Upper Tier', price: 70, blocks: ['N201', 'N202', 'N203', 'N204', 'N205', 'N206', 'N207', 'N208'] }
    },
    cameraAngle: { x: 0, y: 35, z: -105 },
    target: { x: 0, y: 15, z: -55 }
  },
  SOUTH: {
    id: 'SOUTH',
    name: 'South Stand (Family & Visitors)',
    description: 'Panoramic sightlines behind the south goal with dedicated family amenities.',
    gate: 'Gates C1 - C4',
    tiers: {
      LOWER: { name: 'Lower Tier', price: 45, blocks: ['S101', 'S102', 'S103', 'S104', 'S105', 'S106', 'S107', 'S108'] },
      UPPER: { name: 'Upper Tier', price: 65, blocks: ['S201', 'S202', 'S203', 'S204', 'S205', 'S206', 'S207', 'S208'] }
    },
    cameraAngle: { x: 0, y: 35, z: 105 },
    target: { x: 0, y: 15, z: 55 }
  },
  EAST: {
    id: 'EAST',
    name: 'East Stand (Broadcast Longside)',
    description: 'Direct sideline view opposite the main benches. Unmatched perspective of tactical play.',
    gate: 'Gates B1 - B4',
    tiers: {
      LOWER: { name: 'Lower Tier', price: 85, blocks: ['E101', 'E102', 'E103', 'E104', 'E105', 'E106', 'E107', 'E108'] },
      UPPER: { name: 'Upper Tier', price: 110, blocks: ['E201', 'E202', 'E203', 'E204', 'E205', 'E206', 'E207', 'E208'] }
    },
    cameraAngle: { x: 115, y: 40, z: 0 },
    target: { x: 60, y: 16, z: 0 }
  },
  WEST: {
    id: 'WEST',
    name: 'West Stand (Grand Prestige)',
    description: 'The premier stand housing the players tunnel, directors box, and luxury VIP skyboxes.',
    gate: 'Gates D1 - D4 (VIP Priority Entrance)',
    tiers: {
      LOWER: { name: 'Lower Tier', price: 120, blocks: ['W101', 'W102', 'W103', 'W104', 'W105', 'W106', 'W107', 'W108'] },
      UPPER: { name: 'Upper Tier', price: 150, blocks: ['W201', 'W202', 'W203', 'W204', 'W205', 'W206', 'W207', 'W208'] },
      VIP: { name: 'Skybox VIP Suites', price: 250, blocks: ['VIP-BOX-1', 'VIP-BOX-2', 'VIP-BOX-3', 'VIP-BOX-4'] }
    },
    cameraAngle: { x: -115, y: 40, z: 0 },
    target: { x: -60, y: 16, z: 0 }
  }
};

// In-Memory Seat State Store with Expiration & Mutex Locking
class StadiumStore {
  constructor() {
    this.seats = new Map();
    this.reservations = new Map();
    this.bookedTickets = new Map();
    this.initSeats();
  }

  initSeats() {
    // Generate deterministic seats for 64 blocks
    // Approx 30% are pre-marked as taken (blue) to simulate real matchday demand
    Object.keys(STANDS_CONFIG).forEach(standKey => {
      const stand = STANDS_CONFIG[standKey];
      Object.keys(stand.tiers).forEach(tierKey => {
        const tier = stand.tiers[tierKey];
        tier.blocks.forEach(blockId => {
          const rowsCount = tierKey === 'VIP' ? 4 : (tierKey === 'LOWER' ? 12 : 16);
          const seatsPerRow = tierKey === 'VIP' ? 8 : 24;

          for (let r = 1; r <= rowsCount; r++) {
            for (let s = 1; s <= seatsPerRow; s++) {
              const seatId = `${standKey}-${tierKey}-${blockId}-R${r}-S${s}`;
              // Deterministic pseudo-randomness for taken seats (approx 32% taken)
              const hash = (blockId.charCodeAt(0) * 31 + blockId.charCodeAt(1) + r * 17 + s * 7) % 100;
              const isTaken = hash < 32;

              this.seats.set(seatId, {
                id: seatId,
                stand: standKey,
                standName: stand.name,
                tier: tierKey,
                tierName: tier.name,
                block: blockId,
                row: r,
                seatNumber: s,
                gate: stand.gate,
                price: tier.price,
                status: isTaken ? 'taken' : 'available',
                reservedBy: null,
                reservationExpires: null
              });
            }
          }
        });
      });
    });
  }

  cleanExpiredReservations() {
    const now = Date.now();
    for (const [seatId, seat] of this.seats.entries()) {
      if (seat.status === 'reserved' && seat.reservationExpires && seat.reservationExpires < now) {
        seat.status = 'available';
        seat.reservedBy = null;
        seat.reservationExpires = null;
      }
    }
  }

  getBlockSeats(blockId) {
    this.cleanExpiredReservations();
    const result = [];
    for (const seat of this.seats.values()) {
      if (seat.block === blockId) {
        result.push({
          id: seat.id,
          block: seat.block,
          row: seat.row,
          seat: seat.seatNumber,
          price: seat.price,
          status: seat.status
        });
      }
    }
    return result;
  }

  getStandStats(standKey) {
    this.cleanExpiredReservations();
    let total = 0;
    let available = 0;
    let minPrice = Infinity;

    for (const seat of this.seats.values()) {
      if (seat.stand === standKey) {
        total++;
        if (seat.status === 'available') {
          available++;
          if (seat.price < minPrice) minPrice = seat.price;
        }
      }
    }

    return {
      stand: standKey,
      total,
      available,
      minPrice: minPrice === Infinity ? 45 : minPrice
    };
  }

  getSeat(seatId) {
    this.cleanExpiredReservations();
    return this.seats.get(seatId);
  }

  reserveSeat(seatId, sessionId) {
    this.cleanExpiredReservations();
    const seat = this.seats.get(seatId);
    if (!seat) {
      return { success: false, error: 'Seat not found', code: 'SEAT_NOT_FOUND' };
    }

    if (seat.status === 'taken') {
      return { success: false, error: 'Seat is already occupied by another fan', code: 'SEAT_TAKEN' };
    }

    if (seat.status === 'reserved' && seat.reservedBy !== sessionId) {
      return { success: false, error: 'Seat is currently being reserved by another customer. Please choose another seat.', code: 'SEAT_LOCKED' };
    }

    // Lock seat for 5 minutes (300,000 ms)
    const holdDurationMs = 5 * 60 * 1000;
    seat.status = 'reserved';
    seat.reservedBy = sessionId;
    seat.reservationExpires = Date.now() + holdDurationMs;

    return {
      success: true,
      seat: {
        id: seat.id,
        stand: seat.stand,
        tier: seat.tier,
        block: seat.block,
        row: seat.row,
        seat: seat.seatNumber,
        price: seat.price,
        gate: seat.gate,
        expiresInSeconds: Math.floor(holdDurationMs / 1000)
      }
    };
  }

  confirmBooking(seatId, sessionId, customerData) {
    this.cleanExpiredReservations();
    const seat = this.seats.get(seatId);
    if (!seat) {
      return { success: false, error: 'Seat not found', code: 'SEAT_NOT_FOUND' };
    }

    if (seat.status === 'taken') {
      return { success: false, error: 'Seat has already been purchased.', code: 'SEAT_ALREADY_PURCHASED' };
    }

    if (seat.status === 'reserved' && seat.reservedBy && seat.reservedBy !== sessionId) {
      return { success: false, error: 'Seat reservation held by another session.', code: 'SEAT_RESERVED_BY_OTHER' };
    }

    // Permanently mark as taken
    seat.status = 'taken';
    seat.reservedBy = null;
    seat.reservationExpires = null;

    return {
      success: true,
      seat
    };
  }
}

export const stadiumStore = new StadiumStore();

