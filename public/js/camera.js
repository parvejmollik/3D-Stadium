// ==========================================================================
// MATCHDAY ARENA 3D - CAMERA CONTROLLER & FLIGHT DIRECTOR
// Smooth cubic easing flights, 360° POV look-around & live view snapshots
// ==========================================================================

import * as THREE from '/vendor/three/build/three.module.js';

export class CameraController {
  constructor(camera, domElement, scene, renderer) {
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;
    this.renderer = renderer;

    // Flight animation state
    this.isFlying = false;
    this.flightStart = 0;
    this.flightDuration = 1800; // ms
    this.startPos = new THREE.Vector3();
    this.endPos = new THREE.Vector3();
    this.startTarget = new THREE.Vector3();
    this.endTarget = new THREE.Vector3();
    this.currentTarget = new THREE.Vector3(0, 5, 0);

    // Orbit / Look-around state
    this.mode = 'AERIAL'; // AERIAL, STAND, BLOCK, SEAT, VIEW, SKYBOX
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.aerialAngle = 0;
    this.aerialRadius = 140;
    this.aerialHeight = 65;

    // POV Euler look-around angles
    this.povYaw = 0;
    this.povPitch = 0;
    this.seatEyePosition = new THREE.Vector3();

    this.setupPointerEvents();
  }

  setupPointerEvents() {
    this.domElement.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isDragging || this.isFlying) return;

      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      if (this.mode === 'VIEW' || this.mode === 'SKYBOX') {
        // First-person eye-level look-around
        const sensitivity = 0.0035;
        this.povYaw -= deltaX * sensitivity;
        this.povPitch -= deltaY * sensitivity;

        // Clamp pitch to prevent gimbal flip
        this.povPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.povPitch));

        const lookDirection = new THREE.Vector3(
          Math.sin(this.povYaw) * Math.cos(this.povPitch),
          Math.sin(this.povPitch),
          Math.cos(this.povYaw) * Math.cos(this.povPitch)
        );

        const lookAt = this.camera.position.clone().add(lookDirection);
        this.camera.lookAt(lookAt);
      } else if (this.mode === 'AERIAL') {
        // Orbit around stadium
        this.aerialAngle -= deltaX * 0.004;
        this.aerialHeight = Math.max(30, Math.min(100, this.aerialHeight + deltaY * 0.15));
      }

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
    });

    // Zoom on wheel
    this.domElement.addEventListener('wheel', (e) => {
      if (this.mode === 'AERIAL') {
        this.aerialRadius = Math.max(80, Math.min(220, this.aerialRadius + e.deltaY * 0.08));
      }
    }, { passive: true });
  }

  flyTo(targetPos, targetLookAt, duration = 1800, callback = null) {
    this.isFlying = true;
    this.flightStart = performance.now();
    this.flightDuration = duration;

    this.startPos.copy(this.camera.position);
    this.endPos.copy(targetPos);

    this.startTarget.copy(this.currentTarget);
    this.endTarget.copy(targetLookAt);

    this.onFlightEnd = callback;
  }

  // Cubic Ease-In-Out
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  update(time) {
    if (this.isFlying) {
      const elapsed = performance.now() - this.flightStart;
      const progress = Math.min(1, elapsed / this.flightDuration);
      const ease = this.easeInOutCubic(progress);

      this.camera.position.lerpVectors(this.startPos, this.endPos, ease);
      this.currentTarget.lerpVectors(this.startTarget, this.endTarget, ease);
      this.camera.lookAt(this.currentTarget);

      if (progress >= 1) {
        this.isFlying = false;
        if (this.onFlightEnd) {
          this.onFlightEnd();
          this.onFlightEnd = null;
        }
      }
      return;
    }

    if (this.mode === 'AERIAL' && !this.isDragging) {
      // Gentle cinematic orbit
      this.aerialAngle += 0.0008;
      this.camera.position.x = Math.sin(this.aerialAngle) * this.aerialRadius;
      this.camera.position.z = Math.cos(this.aerialAngle) * this.aerialRadius;
      this.camera.position.y = this.aerialHeight;
      this.camera.lookAt(0, 4, 0);
      this.currentTarget.set(0, 4, 0);
    }
  }

  // Camera preset flights
  flyToAerial() {
    this.mode = 'AERIAL';
    const targetPos = new THREE.Vector3(
      Math.sin(this.aerialAngle) * this.aerialRadius,
      this.aerialHeight,
      Math.cos(this.aerialAngle) * this.aerialRadius
    );
    this.flyTo(targetPos, new THREE.Vector3(0, 4, 0), 2000);
  }

  flyToStand(standKey) {
    this.mode = 'STAND';
    let targetPos, targetLookAt;

    switch (standKey) {
      case 'NORTH':
        targetPos = new THREE.Vector3(0, 36, -95);
        targetLookAt = new THREE.Vector3(0, 14, -42);
        break;
      case 'SOUTH':
        targetPos = new THREE.Vector3(0, 36, 95);
        targetLookAt = new THREE.Vector3(0, 14, 42);
        break;
      case 'EAST':
        targetPos = new THREE.Vector3(105, 38, 0);
        targetLookAt = new THREE.Vector3(56, 14, 0);
        break;
      case 'WEST':
        targetPos = new THREE.Vector3(-105, 38, 0);
        targetLookAt = new THREE.Vector3(-56, 14, 0);
        break;
      default:
        return;
    }

    this.flyTo(targetPos, targetLookAt, 1600);
  }

  flyToBlock(blockId, standKey) {
    this.mode = 'BLOCK';
    // Position camera facing directly into that block
    const isNorth = standKey === 'NORTH';
    const isSouth = standKey === 'SOUTH';
    const isEast = standKey === 'EAST';
    const isWest = standKey === 'WEST';

    let targetPos, targetLookAt;
    if (isNorth) {
      targetPos = new THREE.Vector3(0, 22, -72);
      targetLookAt = new THREE.Vector3(0, 8, -45);
    } else if (isSouth) {
      targetPos = new THREE.Vector3(0, 22, 72);
      targetLookAt = new THREE.Vector3(0, 8, 45);
    } else if (isEast) {
      targetPos = new THREE.Vector3(82, 22, 0);
      targetLookAt = new THREE.Vector3(56, 8, 0);
    } else {
      targetPos = new THREE.Vector3(-82, 22, 0);
      targetLookAt = new THREE.Vector3(-56, 8, 0);
    }

    this.flyTo(targetPos, targetLookAt, 1500);
  }

  flyToSeat(worldPos, standKey) {
    this.mode = 'SEAT';
    // Approach seat framing
    const offset = new THREE.Vector3(0, 3, 5);
    if (standKey === 'NORTH') offset.set(0, 3, 5);
    else if (standKey === 'SOUTH') offset.set(0, 3, -5);
    else if (standKey === 'EAST') offset.set(-5, 3, 0);
    else offset.set(5, 3, 0);

    const targetPos = worldPos.clone().add(offset);
    this.flyTo(targetPos, worldPos, 1400);
  }

  flyToViewFromSeat(seatMeta) {
    this.mode = 'VIEW';
    const eyeHeight = 1.35; // Human eye height in seat
    const eyePos = seatMeta.worldPosition.clone().add(new THREE.Vector3(0, eyeHeight, 0));
    this.seatEyePosition.copy(eyePos);

    // Initial look vector towards pitch center (0, 0.5, 0)
    const pitchCenter = new THREE.Vector3(0, 0.5, 0);
    const lookDir = pitchCenter.clone().sub(eyePos).normalize();

    this.povYaw = Math.atan2(lookDir.x, lookDir.z);
    this.povPitch = Math.asin(lookDir.y);

    this.flyTo(eyePos, pitchCenter, 1600, () => {
      // Once flight ends, activate full 360 look-around
      this.camera.position.copy(eyePos);
      this.camera.lookAt(pitchCenter);
    });
  }

  flyToSkybox() {
    this.mode = 'SKYBOX';
    // Inside VIP Suite in West Stand
    const skyboxEyePos = new THREE.Vector3(-55, 11.8, 0);
    const pitchCenter = new THREE.Vector3(0, 2, 0);

    const lookDir = pitchCenter.clone().sub(skyboxEyePos).normalize();
    this.povYaw = Math.atan2(lookDir.x, lookDir.z);
    this.povPitch = Math.asin(lookDir.y);

    this.flyTo(skyboxEyePos, pitchCenter, 1800);
  }

  // Live Snapshot generator from seat eye-height looking towards pitch
  renderSeatViewSnapshot(seatMeta, targetCanvas) {
    if (!seatMeta || !targetCanvas) return;

    const ctx = targetCanvas.getContext('2d');
    const eyePos = seatMeta.worldPosition.clone().add(new THREE.Vector3(0, 1.35, 0));
    const pitchCenter = new THREE.Vector3(0, 0.5, 0);

    // Save current camera transform
    const origPos = this.camera.position.clone();
    const origTarget = this.currentTarget.clone();

    // Setup snapshot camera view
    this.camera.position.copy(eyePos);
    this.camera.lookAt(pitchCenter);

    // Render 1 frame to renderer canvas
    this.renderer.render(this.scene, this.camera);

    // Copy to ticket preview target canvas
    ctx.drawImage(this.renderer.domElement, 0, 0, targetCanvas.width, targetCanvas.height);

    // Restore camera
    this.camera.position.copy(origPos);
    this.camera.lookAt(origTarget);
  }
}

