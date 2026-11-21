// ==========================================================================
// MATCHDAY ARENA 3D - MAIN APPLICATION ORCHESTRATOR
// Coordinates Photoreal Flow (Laptop/Mobile Screenshots) & WebGL 3D Engine
// ==========================================================================

import * as THREE from '/vendor/three/build/three.module.js';
import { StadiumBuilder } from './stadium.js';
import { CameraController } from './camera.js';
import { UIController } from './ui.js';
import { stadiumAPI } from './api.js';
import { stadiumAudio } from './audio.js';

class MatchdayArenaApp {
  constructor() {
    this.canvas = document.getElementById('webgl-viewport');
    this.stageViewport = document.getElementById('photoreal-stage-viewport');
    this.stageVisualImg = document.getElementById('stage-visual-img');
    this.stageHotspotsLayer = document.getElementById('stage-hotspots-layer');
    this.flowStageStepper = document.getElementById('flow-stage-stepper');

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.stadiumBuilder = null;
    this.cameraController = null;
    this.ui = new UIController();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.isPhotorealMode = true; // Primary mode using the requested laptop & mobile screenshots
    this.currentDevice = window.innerWidth <= 768 ? 'mobile' : 'laptop';
    this.currentStep = 1; // 1: Aerial, 2: Stand, 3: Block, 4: Seat Ticket, 5: POV

    this.currentMode = 'AERIAL';
    this.selectedStandKey = 'EAST';
    this.selectedBlockId = 'E231';
    this.selectedSeatMeta = {
      seatId: 'EAST-UPPER-E231-R13-S29',
      standKey: 'EAST',
      blockId: 'E231',
      row: 13,
      seatNumber: 29,
      tier: 'UPPER',
      price: 45
    };

    this.standsConfig = null;
    this.fixture = null;
  }

  async init() {
    this.ui.setPreloaderProgress(20);

    // 1. Fetch Backend Data
    try {
      this.fixture = await stadiumAPI.getFixture();
      this.standsConfig = await stadiumAPI.getStands();
      this.ui.setPreloaderProgress(40);
    } catch (e) {
      console.warn('Backend running in local offline mode');
    }

    // 2. Setup Photoreal Stage Viewport (Uses Screenshots directly)
    this.setupPhotorealEngine();
    this.ui.setPreloaderProgress(60);

    // 3. Setup WebGL 3D Scene in background for toggle
    this.setupRenderer();
    this.stadiumBuilder = new StadiumBuilder(this.scene, this.renderer);
    this.stadiumBuilder.buildAll();
    this.cameraController = new CameraController(this.camera, this.renderer.domElement, this.scene, this.renderer);
    this.ui.setPreloaderProgress(90);

    // 4. Setup UI & Event Handlers
    this.setupUI();
    this.setupInteractions();
    this.ui.setPreloaderProgress(100);

    // Hide preloader
    setTimeout(() => {
      this.ui.hidePreloader();
      this.setPhotorealStep(1);
    }, 600);

    // Animation Loop
    this.animate();
  }

  setupPhotorealEngine() {
    // Bind Device Selector Buttons
    const btnLaptop = document.getElementById('btn-device-laptop');
    const btnMobile = document.getElementById('btn-device-mobile');
    const btnToggleEngine = document.getElementById('btn-toggle-engine');

    btnLaptop?.addEventListener('click', () => {
      stadiumAudio.playClick();
      this.setDevice('laptop');
    });

    btnMobile?.addEventListener('click', () => {
      stadiumAudio.playClick();
      this.setDevice('mobile');
    });

    btnToggleEngine?.addEventListener('click', () => {
      stadiumAudio.playClick();
      this.toggleEngineMode();
    });

    // Bind Flow Stage Stepper Buttons
    if (this.flowStageStepper) {
      this.flowStageStepper.querySelectorAll('.stepper-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          stadiumAudio.playClick();
          const step = parseInt(btn.dataset.step, 10);
          if (step) this.setPhotorealStep(step);
        });
      });
    }

    this.setDevice(this.currentDevice);
  }

  setDevice(device) {
    this.currentDevice = device;

    const btnLaptop = document.getElementById('btn-device-laptop');
    const btnMobile = document.getElementById('btn-device-mobile');

    btnLaptop?.classList.toggle('active', device === 'laptop');
    btnMobile?.classList.toggle('active', device === 'mobile');

    if (this.stageViewport) {
      this.stageViewport.className = `stage-viewport ${device}-mode`;
    }

    // Refresh current stage image
    this.setPhotorealStep(this.currentStep, false);
  }

  toggleEngineMode() {
    this.isPhotorealMode = !this.isPhotorealMode;

    const engineIcon = document.getElementById('engine-mode-icon');
    const engineText = document.getElementById('engine-mode-text');

    if (this.isPhotorealMode) {
      this.stageViewport?.classList.remove('hidden');
      this.canvas.style.display = 'none';
      if (this.flowStageStepper) this.flowStageStepper.style.display = 'flex';
      if (engineIcon) engineIcon.textContent = '🎮';
      if (engineText) engineText.textContent = '3D WebGL';
      this.setPhotorealStep(this.currentStep);
    } else {
      this.stageViewport?.classList.add('hidden');
      this.canvas.style.display = 'block';
      if (this.flowStageStepper) this.flowStageStepper.style.display = 'none';
      if (engineIcon) engineIcon.textContent = '📸';
      if (engineText) engineText.textContent = 'HD Flow';
      this.cameraController.flyToAerial();
    }
  }

  setPhotorealStep(step, playSound = true) {
    this.currentStep = step;
    if (playSound) stadiumAudio.playClick();

    const stageFiles = {
      1: '01-aerial.jpg',
      2: '02-stand.jpg',
      3: '03-block.jpg',
      4: '04-seat-ticket.jpg',
      5: '05-view-from-seat.jpg'
    };

    const fileName = stageFiles[step] || '01-aerial.jpg';
    const imagePath = `/screenshots/${this.currentDevice}/${fileName}`;

    if (this.stageVisualImg) {
      this.stageVisualImg.src = imagePath;
    }

    // Update Stepper active button
    if (this.flowStageStepper) {
      this.flowStageStepper.querySelectorAll('.stepper-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.step, 10) === step);
      });
    }

    // Update Breadcrumbs
    const breadcrumbMap = {
      1: { level: 'AERIAL' },
      2: { level: 'STAND', data: { standName: 'East Stand' } },
      3: { level: 'BLOCK', data: { standName: 'East Stand', blockId: '231' } },
      4: { level: 'SEAT', data: { standName: 'East Stand', blockId: '231', row: 13, seatNumber: 29 } },
      5: { level: 'VIEW', data: { standName: 'East Stand', blockId: '231', row: 13, seatNumber: 29 } }
    };

    const b = breadcrumbMap[step];
    if (b) this.ui.updateBreadcrumbs(b.level, b.data || {});

    // Manage Drawers & HUDs per stage
    if (step === 4) {
      this.ui.hideSeatPovHud();
      this.ui.openTicketDrawer(this.selectedSeatMeta);
    } else if (step === 5) {
      this.ui.closeTicketDrawer();
      this.ui.showSeatPovHud(this.selectedSeatMeta);
    } else {
      this.ui.closeTicketDrawer();
      this.ui.hideSeatPovHud();
    }

    // Render Hotspots for Step
    this.renderHotspotsForStep(step);
  }

  renderHotspotsForStep(step) {
    if (!this.stageHotspotsLayer) return;
    this.stageHotspotsLayer.innerHTML = '';

    if (step === 1) {
      // Step 1: Aerial View Stand Hotspots
      const stands = [
        { name: 'East Stand', sub: '8,935 left • from €45', top: '34%', left: '56%' },
        { name: 'West Stand', sub: '7,420 left • from €120', top: '64%', left: '44%' },
        { name: 'North Stand', sub: '5,100 left • from €50', top: '48%', left: '26%' },
        { name: 'South Stand', sub: '4,850 left • from €45', top: '48%', left: '74%' }
      ];

      stands.forEach(st => {
        const el = document.createElement('div');
        el.className = 'stage-hotspot';
        el.style.top = st.top;
        el.style.left = st.left;
        el.innerHTML = `
          <div class="hotspot-beacon"></div>
          <div class="hotspot-chip">
            <strong>${st.name}</strong>
            <span style="opacity: 0.7;">•</span>
            <span style="color: var(--accent-gold);">${st.sub}</span>
          </div>
        `;
        el.addEventListener('click', () => {
          stadiumAudio.playClick();
          this.setPhotorealStep(2);
        });
        this.stageHotspotsLayer.appendChild(el);
      });
    } else if (step === 2) {
      // Step 2: Stand View Block Hotspots
      const blocks = [
        { label: 'Block 231 (Upper Tier)', sub: '783 left • €45', top: '42%', left: '50%' },
        { label: 'Block 104 (Lower Tier)', sub: '412 left • €65', top: '68%', left: '50%' }
      ];

      blocks.forEach(bk => {
        const el = document.createElement('div');
        el.className = 'stage-hotspot';
        el.style.top = bk.top;
        el.style.left = bk.left;
        el.innerHTML = `
          <div class="hotspot-beacon"></div>
          <div class="hotspot-chip">
            <strong>${bk.label}</strong>
            <span style="opacity: 0.7;">•</span>
            <span style="color: var(--accent-gold);">${bk.sub}</span>
          </div>
        `;
        el.addEventListener('click', () => {
          stadiumAudio.playClick();
          this.setPhotorealStep(3);
        });
        this.stageHotspotsLayer.appendChild(el);
      });
    } else if (step === 3) {
      // Step 3: Block Close-Up Seat Hotspots
      const seats = [
        { label: 'Row 13 • Seat 29', status: 'available', price: '€45', top: '52%', left: '53%' },
        { label: 'Row 14 • Seat 30', status: 'taken', price: 'Taken', top: '44%', left: '60%' }
      ];

      seats.forEach(s => {
        const el = document.createElement('div');
        el.className = 'stage-hotspot';
        el.style.top = s.top;
        el.style.left = s.left;
        const color = s.status === 'available' ? 'var(--accent-gold)' : 'var(--accent-blue)';
        el.innerHTML = `
          <div class="hotspot-beacon" style="background: ${color};"></div>
          <div class="hotspot-chip">
            <strong>${s.label}</strong>
            <span style="opacity: 0.7;">•</span>
            <span style="color: ${color};">${s.price}</span>
          </div>
        `;
        el.addEventListener('click', () => {
          if (s.status === 'taken') {
            alert('This seat is taken. Please select an available seat.');
            return;
          }
          stadiumAudio.playSeatSelect();
          this.setPhotorealStep(4);
        });
        this.stageHotspotsLayer.appendChild(el);
      });
    }
  }

  setupRenderer() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07090e);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.5, 800);
    this.camera.position.set(0, 75, 145);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupUI() {
    this.ui.init({
      fixture: this.fixture,
      standsConfig: this.standsConfig
    });

    // Breadcrumb navigation routing
    this.ui.onBreadcrumbClick = (level) => {
      if (this.isPhotorealMode) {
        if (level === 'AERIAL') this.setPhotorealStep(1);
        else if (level === 'STAND') this.setPhotorealStep(2);
        else if (level === 'BLOCK') this.setPhotorealStep(3);
        else if (level === 'SEAT') this.setPhotorealStep(4);
        return;
      }

      if (level === 'AERIAL') {
        this.goAerial();
      } else if (level === 'STAND' && this.selectedStandKey) {
        this.goStand(this.selectedStandKey);
      } else if (level === 'BLOCK' && this.selectedBlockId) {
        this.goBlock(this.selectedBlockId, this.selectedStandKey);
      }
    };

    // Upgrade to Skybox VIP
    this.ui.onUpgradeSkybox = (seatMeta) => {
      if (this.isPhotorealMode) {
        alert('VIP Skybox Upgrade applied (+€205)! Proceeding to confirmation.');
        this.selectedSeatMeta.isVip = true;
        this.selectedSeatMeta.price += 205;
        this.ui.openCheckoutModal(this.selectedSeatMeta);
        return;
      }
      this.goSkybox(seatMeta);
    };

    // First person POV
    this.ui.onViewFromSeat = (seatMeta) => {
      if (this.isPhotorealMode) {
        this.setPhotorealStep(5);
        return;
      }
      this.goViewFromSeat(seatMeta);
    };

    // Refresh button
    this.ui.onRefresh = () => {
      this.ui.preloader.classList.remove('fade-out');
      this.ui.setPreloaderProgress(20);
      setTimeout(() => {
        if (this.isPhotorealMode) this.setPhotorealStep(1);
        else this.goAerial();
        this.ui.setPreloaderProgress(100);
        setTimeout(() => this.ui.hidePreloader(), 400);
      }, 500);
    };
  }

  setupInteractions() {
    // 3D Raycasting and Selection for WebGL mode
    window.addEventListener('pointermove', (e) => {
      if (this.isPhotorealMode) return;
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      if (this.cameraController.isFlying || this.cameraController.isDragging) {
        this.ui.hideStandTooltip();
        this.ui.hideBlockTooltip();
        return;
      }

      this.raycaster.setFromCamera(this.mouse, this.camera);

      if (this.currentMode === 'AERIAL') {
        const intersects = this.raycaster.intersectObjects(this.stadiumBuilder.interactiveObjects, true);
        if (intersects.length > 0) {
          let target = intersects[0].object;
          while (target && target.parent && !target.userData?.standKey) {
            target = target.parent;
          }

          if (target && target.userData?.standKey) {
            this.ui.showStandTooltip(target.userData.standKey, e.clientX, e.clientY);
            this.canvas.style.cursor = 'pointer';
            return;
          }
        }
        this.ui.hideStandTooltip();
        this.canvas.style.cursor = 'default';
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.isPhotorealMode) {
          if (this.currentStep > 1) this.setPhotorealStep(this.currentStep - 1);
        } else {
          this.goAerial();
        }
      }
    });
  }

  goAerial() {
    this.currentMode = 'AERIAL';
    this.ui.updateBreadcrumbs('AERIAL');
    this.cameraController.flyToAerial();
  }

  goStand(standKey) {
    this.currentMode = 'STAND';
    this.selectedStandKey = standKey;
    this.ui.updateBreadcrumbs('STAND', { standName: `${standKey} Stand` });
    this.cameraController.flyToStand(standKey);
  }

  goBlock(blockId, standKey) {
    this.currentMode = 'BLOCK';
    this.selectedBlockId = blockId;
    this.selectedStandKey = standKey;
    this.ui.updateBreadcrumbs('BLOCK', { standName: `${standKey} Stand`, blockId });
    this.cameraController.flyToBlock(blockId, standKey);
  }

  goViewFromSeat(seatMeta) {
    this.currentMode = 'VIEW';
    this.ui.showSeatPovHud(seatMeta);
    this.cameraController.flyToViewFromSeat(seatMeta);
  }

  goSkybox(seatMeta) {
    this.currentMode = 'SKYBOX';
    this.cameraController.flyToSkybox();
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (!this.isPhotorealMode) {
      const time = performance.now();
      this.cameraController.update(time);
      this.stadiumBuilder.updateAnimations();
      this.renderer.render(this.scene, this.camera);
    }
  }
}

// Start App when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  const app = new MatchdayArenaApp();
  app.init();
});
