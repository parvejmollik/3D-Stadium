// ==========================================================================
// MATCHDAY ARENA 3D - USER INTERFACE CONTROLLER
// Handles drawers, modals, breadcrumbs, live snapshots & ticket QR cards
// ==========================================================================

import { stadiumAudio } from './audio.js';
import { stadiumAPI } from './api.js';

export class UIController {
  constructor() {
    this.currentSeat = null;
    this.currentBlock = null;
    this.currentStand = null;
    this.standsConfig = null;
    this.fixture = null;
    this.onBreadcrumbClick = null;
    this.onUpgradeSkybox = null;
    this.onViewFromSeat = null;
    this.onConfirmTicket = null;
    this.onRefresh = null;
  }

  init({ fixture, standsConfig }) {
    this.fixture = fixture;
    this.standsConfig = standsConfig;

    this.bindDomElements();
    this.setupEventListeners();
    this.updateWalletBadge();
  }

  bindDomElements() {
    this.preloader = document.getElementById('preloader');
    this.progressFill = document.querySelector('.loader-progress-fill');
    this.topBar = document.getElementById('top-bar');
    this.breadcrumbsBar = document.getElementById('breadcrumbs-bar');
    this.soundToggleBtn = document.getElementById('sound-toggle-btn');
    this.refreshBtn = document.getElementById('refresh-btn');
    this.walletBtn = document.getElementById('wallet-btn');
    this.walletBadge = document.getElementById('wallet-badge');
    this.walletDrawer = document.getElementById('wallet-drawer');
    this.walletCloseBtn = document.getElementById('wallet-close-btn');
    this.walletList = document.getElementById('wallet-list');

    this.standTooltip = document.getElementById('stand-tooltip');
    this.blockTooltip = document.getElementById('block-tooltip');

    this.ticketDrawer = document.getElementById('ticket-drawer');
    this.drawerCloseBtn = document.getElementById('drawer-close-btn');
    this.previewCanvas = document.getElementById('seat-preview-canvas');
    this.btnUpgrade = document.getElementById('btn-upgrade-skybox');
    this.btnViewPov = document.getElementById('btn-view-pov');
    this.btnBook = document.getElementById('btn-book-ticket');

    this.seatPovHud = document.getElementById('seat-pov-hud');
    this.povExitBtn = document.getElementById('btn-pov-exit');
    this.povConfirmBtn = document.getElementById('btn-pov-confirm');

    this.checkoutModal = document.getElementById('checkout-modal');
    this.checkoutCloseBtn = document.getElementById('checkout-close-btn');
    this.checkoutForm = document.getElementById('checkout-form');
    this.ticketModal = document.getElementById('ticket-modal');
    this.ticketCloseBtn = document.getElementById('ticket-modal-close-btn');

    // Visual Showcase Modal Elements
    this.showcaseModalBtn = document.getElementById('showcase-modal-btn');
    this.showcaseModal = document.getElementById('showcase-modal');
    this.showcaseCloseBtn = document.getElementById('showcase-close-btn');
    this.tabDevLaptop = document.getElementById('tab-dev-laptop');
    this.tabDevMobile = document.getElementById('tab-dev-mobile');
    this.showcaseFrame = document.getElementById('showcase-frame');
    this.showcaseMainImg = document.getElementById('showcase-main-img');
    this.showcaseCaption = document.getElementById('showcase-caption');

    // HD Reference Preview Elements
    this.btnToggleHdPreview = document.getElementById('btn-toggle-hd-preview');
    this.seatHdPreviewImg = document.getElementById('seat-hd-preview-img');
    this.previewModeLabel = document.getElementById('preview-mode-label');
    this.btnToggleHdPov = document.getElementById('btn-toggle-hd-pov');
    this.povHdBackdrop = document.getElementById('pov-hd-backdrop');
    this.povHdBackdropImg = document.getElementById('pov-hd-backdrop-img');

    // Active showcase state
    this.showcaseDevice = 'laptop';
    this.showcaseStep = '01';
  }

  setupEventListeners() {
    // Sound Toggle
    this.soundToggleBtn?.addEventListener('click', () => {
      const isAudible = stadiumAudio.toggleSound();
      this.soundToggleBtn.innerHTML = isAudible ? '🔊' : '🔇';
      this.soundToggleBtn.title = isAudible ? 'Sound: ON' : 'Sound: OFF';
    });

    // Refresh / Reset Button (Prompt 6)
    this.refreshBtn?.addEventListener('click', () => {
      stadiumAudio.playClick();
      if (this.onRefresh) this.onRefresh();
      else window.location.reload();
    });

    // Wallet Drawer
    this.walletBtn?.addEventListener('click', () => {
      stadiumAudio.playClick();
      this.openWallet();
    });
    this.walletCloseBtn?.addEventListener('click', () => this.closeWallet());

    // Drawer close
    this.drawerCloseBtn?.addEventListener('click', () => {
      stadiumAudio.playClick();
      this.closeTicketDrawer();
    });

    // Drawer action buttons
    this.btnUpgrade?.addEventListener('click', () => {
      stadiumAudio.playClick();
      if (this.onUpgradeSkybox) this.onUpgradeSkybox(this.currentSeat);
    });

    this.btnViewPov?.addEventListener('click', () => {
      stadiumAudio.playClick();
      if (this.onViewFromSeat) this.onViewFromSeat(this.currentSeat);
    });

    this.btnBook?.addEventListener('click', () => {
      stadiumAudio.playClick();
      this.openCheckoutModal(this.currentSeat);
    });

    // POV HUD action buttons
    this.povExitBtn?.addEventListener('click', () => {
      stadiumAudio.playClick();
      this.hideSeatPovHud();
      if (this.onBreadcrumbClick) this.onBreadcrumbClick('BLOCK');
    });

    this.povConfirmBtn?.addEventListener('click', () => {
      stadiumAudio.playClick();
      this.hideSeatPovHud();
      this.openCheckoutModal(this.currentSeat);
    });

    // Checkout Modal
    this.checkoutCloseBtn?.addEventListener('click', () => this.closeCheckoutModal());
    this.checkoutForm?.addEventListener('submit', (e) => this.handleCheckoutSubmit(e));

    // Ticket Modal Close
    this.ticketCloseBtn?.addEventListener('click', () => {
      this.closeTicketModal();
      if (this.onBreadcrumbClick) this.onBreadcrumbClick('AERIAL');
    });

    // Showcase Modal Listeners
    this.showcaseModalBtn?.addEventListener('click', () => {
      stadiumAudio.playClick();
      this.openShowcaseModal();
    });

    this.showcaseCloseBtn?.addEventListener('click', () => {
      this.closeShowcaseModal();
    });

    this.tabDevLaptop?.addEventListener('click', () => {
      stadiumAudio.playClick();
      this.switchShowcaseDevice('laptop');
    });

    this.tabDevMobile?.addEventListener('click', () => {
      stadiumAudio.playClick();
      this.switchShowcaseDevice('mobile');
    });

    document.querySelectorAll('.showcase-step-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        stadiumAudio.playClick();
        const step = btn.dataset.step;
        if (step) this.switchShowcaseStep(step);
      });
    });

    // HD Sightline Toggle in Ticket Drawer
    this.btnToggleHdPreview?.addEventListener('click', (e) => {
      e.stopPropagation();
      stadiumAudio.playClick();
      this.toggleHdPreview();
    });

    // HD Fullscreen Sightline Backdrop Toggle in POV Mode
    this.btnToggleHdPov?.addEventListener('click', () => {
      stadiumAudio.playClick();
      this.toggleHdPovBackdrop();
    });
  }

  setPreloaderProgress(percent) {
    if (this.progressFill) {
      this.progressFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    }
  }

  hidePreloader() {
    if (this.preloader) {
      this.preloader.classList.add('fade-out');
    }
  }

  showStandTooltip(standKey, x, y) {
    if (!this.standTooltip || !this.standsConfig) return;
    const stand = this.standsConfig[standKey];
    if (!stand) return;

    this.standTooltip.innerHTML = `
      <div class="chip-title">🏟️ ${stand.name}</div>
      <div class="chip-meta">
        <span>Available: <strong>${stand.stats?.available?.toLocaleString() || '8,940'}</strong> seats</span>
        <span>•</span>
        <span class="chip-price">From €${stand.stats?.minPrice || 45}</span>
      </div>
      <div class="chip-cta">Click to enter stand ➔</div>
    `;

    this.standTooltip.style.left = `${x}px`;
    this.standTooltip.style.top = `${y}px`;
    this.standTooltip.classList.add('visible');
  }

  hideStandTooltip() {
    this.standTooltip?.classList.remove('visible');
  }

  showBlockTooltip(blockId, standKey, x, y) {
    if (!this.blockTooltip) return;
    const tier = blockId.includes('10') ? 'Lower Tier' : 'Upper Tier';
    const price = standKey === 'WEST' ? (tier.includes('Lower') ? '€120' : '€150') : (standKey === 'EAST' ? (tier.includes('Lower') ? '€85' : '€110') : (tier.includes('Lower') ? '€50' : '€70'));

    this.blockTooltip.innerHTML = `
      <div class="chip-title">🎟️ Block ${blockId}</div>
      <div class="chip-meta">
        <span>${tier}</span>
        <span>•</span>
        <span class="chip-price">${price}</span>
      </div>
      <div class="chip-cta">Click to view seats ➔</div>
    `;

    this.blockTooltip.style.left = `${x}px`;
    this.blockTooltip.style.top = `${y}px`;
    this.blockTooltip.classList.add('visible');
  }

  hideBlockTooltip() {
    this.blockTooltip?.classList.remove('visible');
  }

  updateBreadcrumbs(level, data = {}) {
    if (!this.breadcrumbsBar) return;
    let html = `<span class="crumb-item" data-level="AERIAL">Arena Orbit</span>`;

    if (level === 'STAND' || level === 'BLOCK' || level === 'SEAT' || level === 'VIEW' || level === 'SKYBOX') {
      html += `<span class="crumb-separator">›</span><span class="crumb-item" data-level="STAND">${data.standName || this.currentStand || 'Stand'}</span>`;
    }

    if (level === 'BLOCK' || level === 'SEAT' || level === 'VIEW') {
      html += `<span class="crumb-separator">›</span><span class="crumb-item" data-level="BLOCK">Block ${data.blockId || this.currentBlock || ''}</span>`;
    }

    if (level === 'SEAT' || level === 'VIEW') {
      html += `<span class="crumb-separator">›</span><span class="crumb-item active">Row ${data.row || ''}, Seat ${data.seatNumber || ''}</span>`;
    } else if (level === 'SKYBOX') {
      html += `<span class="crumb-separator">›</span><span class="crumb-item active">Skybox VIP Suite</span>`;
    }

    this.breadcrumbsBar.innerHTML = html;

    // Attach click events
    this.breadcrumbsBar.querySelectorAll('.crumb-item').forEach(el => {
      el.addEventListener('click', () => {
        const lvl = el.dataset.level;
        if (lvl && this.onBreadcrumbClick) {
          stadiumAudio.playClick();
          this.onBreadcrumbClick(lvl);
        }
      });
    });
  }

  openTicketDrawer(seatMeta) {
    this.currentSeat = seatMeta;
    stadiumAudio.playSeatSelect();

    // Populate drawer elements
    document.getElementById('drawer-stand-name').textContent = seatMeta.standKey + ' Stand';
    document.getElementById('drawer-seat-loc').textContent = `Block ${seatMeta.blockId} • Row ${seatMeta.row} • Seat ${seatMeta.seatNumber}`;
    document.getElementById('drawer-val-tier').textContent = seatMeta.tier === 'LOWER' ? 'Lower Tier' : 'Upper Tier';
    document.getElementById('drawer-val-gate').textContent = seatMeta.standKey === 'WEST' ? 'Gate D1 (Priority)' : 'Gate B2';
    document.getElementById('drawer-val-row').textContent = `Row ${seatMeta.row}`;
    document.getElementById('drawer-val-seat').textContent = `Seat ${seatMeta.seatNumber}`;
    document.getElementById('drawer-val-price').textContent = `€${seatMeta.price}`;

    this.ticketDrawer?.classList.add('open');
  }

  closeTicketDrawer() {
    this.ticketDrawer?.classList.remove('open');
  }

  showSeatPovHud(seatMeta) {
    this.currentSeat = seatMeta;
    this.closeTicketDrawer();
    document.getElementById('pov-seat-label').textContent = `${seatMeta.standKey} Stand • Block ${seatMeta.blockId} • Row ${seatMeta.row}, Seat ${seatMeta.seatNumber}`;
    this.seatPovHud?.classList.add('active');
  }

  hideSeatPovHud() {
    this.seatPovHud?.classList.remove('active');
  }

  openCheckoutModal(seatMeta) {
    if (!seatMeta) return;
    this.currentSeat = seatMeta;
    this.closeTicketDrawer();
    this.hideSeatPovHud();

    document.getElementById('checkout-seat-summary').textContent = `${seatMeta.standKey} Stand • Block ${seatMeta.blockId} • Row ${seatMeta.row}, Seat ${seatMeta.seatNumber}`;
    document.getElementById('checkout-total-price').textContent = `€${seatMeta.price}`;

    this.checkoutModal?.classList.add('active');
  }

  closeCheckoutModal() {
    this.checkoutModal?.classList.remove('active');
  }

  async handleCheckoutSubmit(e) {
    e.preventDefault();
    const nameInput = document.getElementById('customer-name');
    const emailInput = document.getElementById('customer-email');
    const submitBtn = document.getElementById('btn-submit-order');

    const customerName = nameInput.value.trim();
    const customerEmail = emailInput.value.trim();

    if (!customerName || !customerEmail) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Securing Reservation...';

    // 1. Reserve seat
    const reserveRes = await stadiumAPI.reserveSeat(this.currentSeat.seatId);
    if (!reserveRes.success) {
      alert(`Reservation Failed: ${reserveRes.error || 'Seat is no longer available.'}`);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm & Pay Securely';
      return;
    }

    submitBtn.textContent = 'Issuing Cryptographic Pass...';

    // 2. Book & Generate Signed Ticket
    const bookRes = await stadiumAPI.bookTicket({
      seatId: this.currentSeat.seatId,
      customerName,
      customerEmail,
      upgradeSkybox: this.currentSeat.isVip || false
    });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirm & Pay Securely';

    if (!bookRes.success) {
      alert(`Booking Failed: ${bookRes.error}`);
      return;
    }

    this.closeCheckoutModal();
    this.renderDigitalTicketModal(bookRes.ticket);
    this.updateWalletBadge();
    stadiumAudio.playWhistle();
  }

  renderDigitalTicketModal(ticket) {
    if (!ticket) return;

    document.getElementById('pass-ticket-id').textContent = ticket.ticketId;
    document.getElementById('pass-serial').textContent = ticket.serialNumber;
    document.getElementById('pass-attendee').textContent = ticket.customerName;
    document.getElementById('pass-stand').textContent = ticket.stand;
    document.getElementById('pass-gate').textContent = ticket.gate;
    document.getElementById('pass-block').textContent = ticket.block;
    document.getElementById('pass-row').textContent = ticket.row;
    document.getElementById('pass-seat').textContent = ticket.seatNumber;
    document.getElementById('pass-price').textContent = `€${ticket.price}`;

    // Render Procedural QR Code Canvas
    const qrCanvas = document.getElementById('ticket-qr-canvas');
    if (qrCanvas) {
      this.drawProceduralQr(qrCanvas, ticket.qrPayload);
    }

    // Attach Turnstile Gate Verification Simulation
    const verifyBtn = document.getElementById('btn-verify-turnstile');
    const verifyStatus = document.getElementById('turnstile-status-box');

    verifyStatus.className = 'turnstile-verify-box';
    verifyStatus.innerHTML = '<span>Scan ticket at turnstile scanner to simulate stadium admission.</span>';

    verifyBtn.onclick = async () => {
      verifyBtn.disabled = true;
      verifyBtn.textContent = 'Validating Signature with Gate...';

      const res = await stadiumAPI.verifyTurnstile(ticket.ticketId);
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Simulate Gate Admission Scan';

      if (res.valid) {
        verifyStatus.className = 'turnstile-verify-box verified';
        verifyStatus.innerHTML = `<strong>✅ ADMISSION GRANTED (Gate ${ticket.gate})</strong><br>HMAC-SHA256 signature verified • Turnstile Barrier Open`;
        stadiumAudio.playWhistle();
      } else {
        verifyStatus.className = 'turnstile-verify-box';
        verifyStatus.style.borderColor = '#ef4444';
        verifyStatus.style.color = '#ef4444';
        verifyStatus.innerHTML = `<strong>❌ ADMISSION REJECTED</strong><br>${res.error}`;
      }
    };

    this.ticketModal?.classList.add('active');
  }

  closeTicketModal() {
    this.ticketModal?.classList.remove('active');
  }

  drawProceduralQr(canvas, payloadText) {
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Draw authentic QR code position markers
    const drawMarker = (x, y) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x, y, 32, 32);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 5, y + 5, 22, 22);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x + 9, y + 9, 14, 14);
    };

    drawMarker(8, 8);
    drawMarker(size - 40, 8);
    drawMarker(8, size - 40);

    // Draw deterministic payload pattern
    ctx.fillStyle = '#0f172a';
    const gridSize = 24;
    const cellSize = (size - 20) / gridSize;

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if ((r < 7 && c < 7) || (r < 7 && c > gridSize - 8) || (r > gridSize - 8 && c < 7)) {
          continue; // Skip markers
        }
        const charCode = payloadText.charCodeAt((r * gridSize + c) % payloadText.length) || 0;
        if ((charCode + r * 7 + c * 13) % 3 === 0) {
          ctx.fillRect(10 + c * cellSize, 10 + r * cellSize, cellSize - 0.5, cellSize - 0.5);
        }
      }
    }
  }

  openWallet() {
    const tickets = stadiumAPI.getMyTickets();
    if (!this.walletList) return;

    if (tickets.length === 0) {
      this.walletList.innerHTML = `
        <div style="text-align:center; padding: 40px 10px; color: var(--text-muted); font-size: 0.85rem;">
          <div style="font-size: 2.2rem; margin-bottom: 12px;">🎟️</div>
          No tickets in your wallet yet.<br>Choose an available seat in the stadium to book.
        </div>
      `;
    } else {
      this.walletList.innerHTML = tickets.map(t => `
        <div style="background: var(--bg-surface-elevated); border: 1px solid var(--glass-border); border-radius: var(--radius-md); padding: 14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
            <strong style="color: var(--accent-gold); font-size: 0.85rem;">${t.ticketId}</strong>
            <span style="font-size: 0.72rem; color: var(--text-secondary);">${t.isVipUpgrade ? 'VIP PASS' : 'MATCH PASS'}</span>
          </div>
          <div style="font-size: 0.82rem; color: #fff; font-weight: 700;">${t.stand}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Block ${t.block} • Row ${t.row} • Seat ${t.seatNumber} • ${t.gate}</div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 10px;">
            <span style="color: var(--accent-emerald); font-weight: 800; font-size: 0.9rem;">€${t.price}</span>
            <span style="color: var(--text-secondary); font-size: 0.7rem;">Verified HMAC-SHA256</span>
          </div>
        </div>
      `).join('');
    }

    this.walletDrawer?.classList.add('open');
  }

  closeWallet() {
    this.walletDrawer?.classList.remove('open');
  }

  updateWalletBadge() {
    const count = stadiumAPI.getMyTickets().length;
    if (this.walletBadge) {
      this.walletBadge.textContent = count;
      this.walletBadge.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  // ==========================================
  // Visual Showcase & Device Previews Methods
  // ==========================================
  openShowcaseModal() {
    this.showcaseModal?.classList.add('active');
    this.updateShowcaseDisplay();
  }

  closeShowcaseModal() {
    this.showcaseModal?.classList.remove('active');
  }

  switchShowcaseDevice(device) {
    this.showcaseDevice = device;
    this.tabDevLaptop?.classList.toggle('active', device === 'laptop');
    this.tabDevMobile?.classList.toggle('active', device === 'mobile');
    
    if (this.showcaseFrame) {
      this.showcaseFrame.className = `showcase-frame ${device}-frame`;
    }
    this.updateShowcaseDisplay();
  }

  switchShowcaseStep(step) {
    this.showcaseStep = step;
    document.querySelectorAll('.showcase-step-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.step === step);
    });
    this.updateShowcaseDisplay();
  }

  updateShowcaseDisplay() {
    const stageMap = {
      '01': {
        file: '01-aerial.jpg',
        title: 'Step 01 — Aerial View:',
        desc: 'An orbital flyover over the arena and its park. Hovering or tapping a stand lights it up and shows an availability chip.'
      },
      '02': {
        file: '02-stand.jpg',
        title: 'Step 02 — Stand View:',
        desc: 'Fly into the chosen stand. Every block displays its tier level, starting ticket price, and remaining seat count.'
      },
      '03': {
        file: '03-block.jpg',
        title: 'Step 03 — Block View:',
        desc: 'Zoom into individual seating terraces. Taken seats are marked in dark blue; free seats are glowing red and ready to pick.'
      },
      '04': {
        file: '04-seat-ticket.jpg',
        title: 'Step 04 — Seat Chosen & Ticket:',
        desc: 'The chosen seat is highlighted in radiant gold, and an official matchday ticket appears with a live rendered sightline preview.'
      },
      '05': {
        file: '05-view-from-seat.jpg',
        title: 'Step 05 — View From Seat:',
        desc: 'The camera drops to eye level in that seat under the stadium roof. Fans can look around 360° before confirming their ticket.'
      }
    };

    const current = stageMap[this.showcaseStep] || stageMap['01'];
    const imagePath = `/screenshots/${this.showcaseDevice}/${current.file}`;

    if (this.showcaseMainImg) {
      this.showcaseMainImg.src = imagePath;
    }
    if (this.showcaseCaption) {
      this.showcaseCaption.innerHTML = `<strong>${current.title}</strong> ${current.desc}`;
    }
  }

  toggleHdPreview() {
    if (!this.seatHdPreviewImg || !this.previewCanvas) return;
    const isShowingHd = this.seatHdPreviewImg.style.display !== 'none';
    const isMobile = window.innerWidth <= 768;
    const folder = isMobile ? 'mobile' : 'laptop';

    if (isShowingHd) {
      // Revert to 3D Canvas
      this.seatHdPreviewImg.style.display = 'none';
      this.previewCanvas.style.display = 'block';
      this.btnToggleHdPreview.textContent = 'HD Photo';
      if (this.previewModeLabel) this.previewModeLabel.textContent = '3D Engine';
    } else {
      // Show Photo Reference
      this.seatHdPreviewImg.src = `/screenshots/${folder}/04-seat-ticket.jpg`;
      this.seatHdPreviewImg.style.display = 'block';
      this.previewCanvas.style.display = 'none';
      this.btnToggleHdPreview.textContent = '3D View';
      if (this.previewModeLabel) this.previewModeLabel.textContent = 'HD Photo';
    }
  }

  toggleHdPovBackdrop() {
    if (!this.povHdBackdrop) return;
    const isVisible = this.povHdBackdrop.style.display === 'block';
    const isMobile = window.innerWidth <= 768;
    const folder = isMobile ? 'mobile' : 'laptop';

    if (isVisible) {
      this.povHdBackdrop.style.display = 'none';
      if (this.btnToggleHdPov) this.btnToggleHdPov.querySelector('span').textContent = '📸 HD Stadium Photo View';
    } else {
      if (this.povHdBackdropImg) {
        this.povHdBackdropImg.src = `/screenshots/${folder}/05-view-from-seat.jpg`;
      }
      this.povHdBackdrop.style.display = 'block';
      if (this.btnToggleHdPov) this.btnToggleHdPov.querySelector('span').textContent = '🌐 Return to 3D View';
    }
  }
}

