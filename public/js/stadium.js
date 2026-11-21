// ==========================================================================
// MATCHDAY ARENA 3D - PROCEDURAL STADIUM ENGINE
// Photorealistic 3D Football Arena with Instanced Seating, Trusses, Pitch & Screens
// ==========================================================================

import * as THREE from '/vendor/three/build/three.module.js';

export class StadiumBuilder {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.instancedSeats = new Map(); // blockId -> THREE.InstancedMesh
    this.seatMetadata = new Map();   // seatId -> { blockId, instanceIndex, position, normal, row, seat, price, status }
    this.standMeshes = new Map();    // standKey -> Mesh group
    this.blockMeshes = new Map();    // blockId -> Mesh group
    this.interactiveObjects = [];
    this.animatedTextures = [];
    this.selectedSeatId = null;
    this.activeBlockId = null;
  }

  buildAll() {
    this.createAtmosphere();
    this.createParkAndGround();
    this.createPitch();
    this.createGoalposts();
    this.createLedRibbons();
    this.createStands();
    this.createInstancedSeats();
    this.createRoofTrusses();
    this.createJumbotrons();
    this.createFloodlights();
  }

  createAtmosphere() {
    // Dusk / Night Matchday Lighting Setup
    const ambientLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.75);
    this.scene.add(ambientLight);

    // Main Sun / Stadium Spot Light
    const dirLight = new THREE.DirectionalLight(0xfffaed, 2.2);
    dirLight.position.set(70, 110, 60);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 300;
    dirLight.shadow.camera.left = -90;
    dirLight.shadow.camera.right = 90;
    dirLight.shadow.camera.top = 90;
    dirLight.shadow.camera.bottom = -90;
    dirLight.shadow.bias = -0.0004;
    this.scene.add(dirLight);

    // Subtle stadium atmospheric dusk fog
    this.scene.fog = new THREE.FogExp2(0x07090e, 0.0045);
  }

  createParkAndGround() {
    // Surrounding asphalt concourse & plaza
    const groundGeo = new THREE.PlaneGeometry(360, 360);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x111622,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Perimeter park landscaping ring
    const parkRingGeo = new THREE.RingGeometry(85, 175, 48);
    const parkMat = new THREE.MeshStandardMaterial({
      color: 0x0f291e,
      roughness: 0.85
    });
    const park = new THREE.Mesh(parkRingGeo, parkMat);
    park.rotation.x = -Math.PI / 2;
    park.position.y = -0.04;
    park.receiveShadow = true;
    this.scene.add(park);

    // Perimeter architectural trees (instanced cylinders/cones)
    const treeGeo = new THREE.ConeGeometry(2.5, 7, 5);
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x1b4332, roughness: 0.9 });
    const treeCount = 90;
    const treeMesh = new THREE.InstancedMesh(treeGeo, treeMat, treeCount);
    treeMesh.castShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2;
      const radius = 100 + Math.random() * 55;
      dummy.position.set(Math.cos(angle) * radius, 3.5, Math.sin(angle) * radius);
      const scale = 0.8 + Math.random() * 0.6;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      treeMesh.setMatrixAt(i, dummy.matrix);
    }
    treeMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(treeMesh);
  }

  createPitch() {
    // UEFA Standard Pitch: 105m x 68m
    const pitchCanvas = document.createElement('canvas');
    pitchCanvas.width = 2048;
    pitchCanvas.height = 1024;
    const ctx = pitchCanvas.getContext('2d');

    // 1. Alternating mow stripes (vivid broadcast green)
    const stripes = 18;
    const stripeWidth = pitchCanvas.width / stripes;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#1b4332' : '#2d6a4f';
      ctx.fillRect(i * stripeWidth, 0, stripeWidth, pitchCanvas.height);
    }

    // Subtle grass blade noise
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    for (let i = 0; i < 4000; i++) {
      ctx.fillRect(Math.random() * pitchCanvas.width, Math.random() * pitchCanvas.height, 2, 4);
    }

    // 2. White Football Pitch Lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.fillStyle = '#ffffff';

    const m = 50; // Margin
    const pw = pitchCanvas.width - m * 2;
    const ph = pitchCanvas.height - m * 2;

    // Outer boundary
    ctx.strokeRect(m, m, pw, ph);

    // Halfway line
    ctx.beginPath();
    ctx.moveTo(pitchCanvas.width / 2, m);
    ctx.lineTo(pitchCanvas.width / 2, pitchCanvas.height - m);
    ctx.stroke();

    // Center circle & spot
    ctx.beginPath();
    ctx.arc(pitchCanvas.width / 2, pitchCanvas.height / 2, 85, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(pitchCanvas.width / 2, pitchCanvas.height / 2, 5, 0, Math.PI * 2);
    ctx.fill();

    // Penalty Areas (Left & Right)
    const boxW = 150;
    const boxH = 340;
    const goalBoxW = 55;
    const goalBoxH = 160;

    // Left Penalty Box
    ctx.strokeRect(m, pitchCanvas.height / 2 - boxH / 2, boxW, boxH);
    ctx.strokeRect(m, pitchCanvas.height / 2 - goalBoxH / 2, goalBoxW, goalBoxH);
    ctx.beginPath();
    ctx.arc(m + 100, pitchCanvas.height / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(m + 100, pitchCanvas.height / 2, 85, -0.65, 0.65);
    ctx.stroke();

    // Right Penalty Box
    ctx.strokeRect(pitchCanvas.width - m - boxW, pitchCanvas.height / 2 - boxH / 2, boxW, boxH);
    ctx.strokeRect(pitchCanvas.width - m - goalBoxW, pitchCanvas.height / 2 - goalBoxH / 2, goalBoxW, goalBoxH);
    ctx.beginPath();
    ctx.arc(pitchCanvas.width - m - 100, pitchCanvas.height / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pitchCanvas.width - m - 100, pitchCanvas.height / 2, 85, Math.PI - 0.65, Math.PI + 0.65);
    ctx.stroke();

    // Corner arcs
    [[m, m], [pitchCanvas.width - m, m], [m, pitchCanvas.height - m], [pitchCanvas.width - m, pitchCanvas.height - m]].forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.stroke();
    });

    const pitchTexture = new THREE.CanvasTexture(pitchCanvas);
    pitchTexture.anisotropy = 16;

    const pitchGeo = new THREE.PlaneGeometry(105, 68);
    const pitchMat = new THREE.MeshStandardMaterial({
      map: pitchTexture,
      roughness: 0.65,
      metalness: 0.05
    });

    const pitch = new THREE.Mesh(pitchGeo, pitchMat);
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.y = 0;
    pitch.receiveShadow = true;
    this.scene.add(pitch);

    // Surrounding track border
    const borderGeo = new THREE.PlaneGeometry(116, 78);
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.rotation.x = -Math.PI / 2;
    border.position.y = -0.01;
    border.receiveShadow = true;
    this.scene.add(border);
  }

  createGoalposts() {
    const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.8 });
    const netMat = new THREE.MeshBasicMaterial({ color: 0xcccccc, wireframe: true, transparent: true, opacity: 0.45 });

    const createGoal = (xPos, rotationY) => {
      const goalGroup = new THREE.Group();

      // Posts & Crossbar (7.32m wide, 2.44m high)
      const postRadius = 0.08;
      const width = 7.32;
      const height = 2.44;

      const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, height, 16);
      const leftPost = new THREE.Mesh(postGeo, postMat);
      leftPost.position.set(0, height / 2, -width / 2);
      leftPost.castShadow = true;
      goalGroup.add(leftPost);

      const rightPost = new THREE.Mesh(postGeo, postMat);
      rightPost.position.set(0, height / 2, width / 2);
      rightPost.castShadow = true;
      goalGroup.add(rightPost);

      const barGeo = new THREE.CylinderGeometry(postRadius, postRadius, width, 16);
      const bar = new THREE.Mesh(barGeo, postMat);
      bar.rotation.x = Math.PI / 2;
      bar.position.set(0, height, 0);
      bar.castShadow = true;
      goalGroup.add(bar);

      // 3D Goal Net
      const netGeo = new THREE.BoxGeometry(2.0, height, width);
      const net = new THREE.Mesh(netGeo, netMat);
      net.position.set(-1.0, height / 2, 0);
      goalGroup.add(net);

      goalGroup.position.set(xPos, 0, 0);
      goalGroup.rotation.y = rotationY;
      this.scene.add(goalGroup);
    };

    createGoal(-52.5, Math.PI / 2);
    createGoal(52.5, -Math.PI / 2);
  }

  createLedRibbons() {
    // Dynamic animated advertising LED hoardings
    const ledCanvas = document.createElement('canvas');
    ledCanvas.width = 1024;
    ledCanvas.height = 64;
    const ctx = ledCanvas.getContext('2d');

    let offset = 0;
    const renderLed = () => {
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, ledCanvas.width, ledCanvas.height);

      ctx.fillStyle = '#ffb703';
      ctx.font = 'bold 24px -apple-system, sans-serif';
      ctx.fillText('⚽ APEX FC • EUROPEAN CHAMPIONS FINAL 2026 • OFFICIAL SEAT PICKER • TITAN ROVERS • MATCHDAY 3D ARENA •', -offset, 40);
      ctx.fillText('⚽ APEX FC • EUROPEAN CHAMPIONS FINAL 2026 • OFFICIAL SEAT PICKER • TITAN ROVERS • MATCHDAY 3D ARENA •', 1024 - offset, 40);

      offset = (offset + 2) % 1024;
    };

    const ledTexture = new THREE.CanvasTexture(ledCanvas);
    this.animatedTextures.push({ texture: ledTexture, update: renderLed });

    const ribbonMat = new THREE.MeshBasicMaterial({ map: ledTexture });
    const ribbonGeo = new THREE.PlaneGeometry(108, 1.2);

    // Sideline hoardings
    const northBoard = new THREE.Mesh(ribbonGeo, ribbonMat);
    northBoard.position.set(0, 0.6, -35.5);
    this.scene.add(northBoard);

    const southBoard = new THREE.Mesh(ribbonGeo, ribbonMat);
    southBoard.position.set(0, 0.6, 35.5);
    southBoard.rotation.y = Math.PI;
    this.scene.add(southBoard);
  }

  createStands() {
    // Concrete grandstand tiers for North, South, East, West
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x222a3a,
      roughness: 0.8,
      metalness: 0.15
    });

    const standData = [
      { key: 'NORTH', name: 'North Stand (The Kop)', pos: [0, 0, -42], rot: 0, width: 94, depth: 32 },
      { key: 'SOUTH', name: 'South Stand (Family & Visitors)', pos: [0, 0, 42], rot: Math.PI, width: 94, depth: 32 },
      { key: 'EAST', name: 'East Stand (Longside)', pos: [57, 0, 0], rot: -Math.PI / 2, width: 78, depth: 36 },
      { key: 'WEST', name: 'West Stand (Grand Prestige)', pos: [-57, 0, 0], rot: Math.PI / 2, width: 78, depth: 36 }
    ];

    standData.forEach(st => {
      const standGroup = new THREE.Group();
      standGroup.userData = { standKey: st.key, name: st.name };

      // Lower Tier slope
      const lowerShape = new THREE.Shape();
      lowerShape.moveTo(0, 0.5);
      lowerShape.lineTo(0, 1.2);
      lowerShape.lineTo(15, 9.5);
      lowerShape.lineTo(17, 9.5);
      lowerShape.lineTo(17, 0.5);
      lowerShape.closePath();

      const extrudeSettings = { depth: st.width, bevelEnabled: false };
      const lowerGeo = new THREE.ExtrudeGeometry(lowerShape, extrudeSettings);
      const lowerTier = new THREE.Mesh(lowerGeo, concreteMat);
      lowerTier.rotation.y = Math.PI / 2;
      lowerTier.position.set(-st.width / 2, 0, 0);
      lowerTier.receiveShadow = true;
      lowerTier.castShadow = true;
      standGroup.add(lowerTier);

      // VIP Hospitality Concourse (between tiers)
      const concourseGeo = new THREE.BoxGeometry(st.width, 3, 5);
      const concourseMat = new THREE.MeshStandardMaterial({ color: 0x171d2b, roughness: 0.5 });
      const concourse = new THREE.Mesh(concourseGeo, concourseMat);
      concourse.position.set(0, 10.5, 17.5);
      concourse.receiveShadow = true;
      standGroup.add(concourse);

      // Upper Tier slope (steeper)
      const upperShape = new THREE.Shape();
      upperShape.moveTo(0, 12);
      upperShape.lineTo(0, 13);
      upperShape.lineTo(18, 26);
      upperShape.lineTo(20, 26);
      upperShape.lineTo(20, 12);
      upperShape.closePath();

      const upperGeo = new THREE.ExtrudeGeometry(upperShape, extrudeSettings);
      const upperTier = new THREE.Mesh(upperGeo, concreteMat);
      upperTier.rotation.y = Math.PI / 2;
      upperTier.position.set(-st.width / 2, 0, 18);
      upperTier.receiveShadow = true;
      upperTier.castShadow = true;
      standGroup.add(upperTier);

      // VIP Hospitality Glass Windows (West Stand Exclusive)
      if (st.key === 'WEST') {
        const vipGlassMat = new THREE.MeshPhysicalMaterial({
          color: 0xffd166,
          transmission: 0.7,
          opacity: 0.9,
          transparent: true,
          roughness: 0.1,
          ior: 1.5,
          emissive: 0x332200,
          emissiveIntensity: 0.4
        });
        const glassGeo = new THREE.BoxGeometry(st.width * 0.85, 2.8, 0.4);
        const glassMesh = new THREE.Mesh(glassGeo, vipGlassMat);
        glassMesh.position.set(0, 10.8, 15.5);
        standGroup.add(glassMesh);
      }

      standGroup.position.set(st.pos[0], st.pos[1], st.pos[2]);
      standGroup.rotation.y = st.rot;

      this.scene.add(standGroup);
      this.standMeshes.set(st.key, standGroup);
      this.interactiveObjects.push(standGroup);
    });
  }

  createInstancedSeats() {
    // Seat Geometry (compact realistic stadium bucket chair)
    const seatBaseGeo = new THREE.BoxGeometry(0.55, 0.12, 0.5);
    const seatBackGeo = new THREE.BoxGeometry(0.55, 0.55, 0.1);
    seatBackGeo.translate(0, 0.28, -0.22);

    const mergedSeatGeo = new THREE.BufferGeometry();
    // Simplified composite seat
    const compositeSeat = new THREE.Group();
    const baseMesh = new THREE.Mesh(seatBaseGeo);
    const backMesh = new THREE.Mesh(seatBackGeo);
    compositeSeat.add(baseMesh);
    compositeSeat.add(backMesh);

    // Standard Seat Material supporting per-instance colors
    const seatMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.4,
      metalness: 0.1,
      vertexColors: true
    });

    const stands = [
      { key: 'NORTH', tierY: [1.2, 13], tierZ: [1.5, 19.5], rot: 0, pos: [0, 0, -42], blocksLower: 8, blocksUpper: 8 },
      { key: 'SOUTH', tierY: [1.2, 13], tierZ: [1.5, 19.5], rot: Math.PI, pos: [0, 0, 42], blocksLower: 8, blocksUpper: 8 },
      { key: 'EAST', tierY: [1.2, 13], tierZ: [1.5, 19.5], rot: -Math.PI / 2, pos: [57, 0, 0], blocksLower: 8, blocksUpper: 8 },
      { key: 'WEST', tierY: [1.2, 13], tierZ: [1.5, 19.5], rot: Math.PI / 2, pos: [-57, 0, 0], blocksLower: 8, blocksUpper: 8 }
    ];

    const colorAvailable = new THREE.Color(0xd90429); // Vibrant Stadium Red
    const colorTaken = new THREE.Color(0x1d3557);     // Cool Navy Blue
    const dummy = new THREE.Object3D();

    stands.forEach(stand => {
      // Lower Tier Blocks
      for (let b = 1; b <= stand.blocksLower; b++) {
        const blockId = `${stand.key.charAt(0)}10${b}`;
        const rows = 12;
        const seatsPerRow = 24;
        const totalBlockSeats = rows * seatsPerRow;

        const instanced = new THREE.InstancedMesh(seatBaseGeo, seatMaterial.clone(), totalBlockSeats);
        instanced.castShadow = true;
        instanced.receiveShadow = true;
        instanced.userData = { blockId, standKey: stand.key, tier: 'LOWER' };

        let idx = 0;
        const blockWidth = 10;
        const blockOffset = (b - (stand.blocksLower + 1) / 2) * (blockWidth + 1.2);

        for (let r = 1; r <= rows; r++) {
          const stepY = 1.2 + (r - 1) * 0.65;
          const stepZ = 1.8 + (r - 1) * 1.1;

          for (let s = 1; s <= seatsPerRow; s++) {
            const seatId = `${stand.key}-LOWER-${blockId}-R${r}-S${s}`;
            const localX = blockOffset + (s - (seatsPerRow + 1) / 2) * 0.42;
            const localY = stepY;
            const localZ = stepZ;

            dummy.position.set(localX, localY, localZ);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();

            // Transform into stand world coordinates
            const worldPos = dummy.position.clone();
            worldPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), stand.rot);
            worldPos.add(new THREE.Vector3(stand.pos[0], stand.pos[1], stand.pos[2]));

            instanced.setMatrixAt(idx, dummy.matrix);

            // Pseudo-random taken seat color
            const hash = (blockId.charCodeAt(0) * 31 + blockId.charCodeAt(1) + r * 17 + s * 7) % 100;
            const isTaken = hash < 32;
            const seatColor = isTaken ? colorTaken : colorAvailable;
            instanced.setColorAt(idx, seatColor);

            this.seatMetadata.set(seatId, {
              seatId,
              blockId,
              standKey: stand.key,
              tier: 'LOWER',
              row: r,
              seatNumber: s,
              price: stand.key === 'WEST' ? 120 : (stand.key === 'EAST' ? 85 : 50),
              status: isTaken ? 'taken' : 'available',
              instanceIndex: idx,
              worldPosition: worldPos,
              instancedMesh: instanced
            });

            idx++;
          }
        }

        instanced.instanceMatrix.needsUpdate = true;
        if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;

        // Position under stand group
        const standMesh = this.standMeshes.get(stand.key);
        if (standMesh) standMesh.add(instanced);
        this.instancedSeats.set(blockId, instanced);
      }

      // Upper Tier Blocks
      for (let b = 1; b <= stand.blocksUpper; b++) {
        const blockId = `${stand.key.charAt(0)}20${b}`;
        const rows = 16;
        const seatsPerRow = 24;
        const totalBlockSeats = rows * seatsPerRow;

        const instanced = new THREE.InstancedMesh(seatBaseGeo, seatMaterial.clone(), totalBlockSeats);
        instanced.castShadow = true;
        instanced.receiveShadow = true;
        instanced.userData = { blockId, standKey: stand.key, tier: 'UPPER' };

        let idx = 0;
        const blockWidth = 10;
        const blockOffset = (b - (stand.blocksUpper + 1) / 2) * (blockWidth + 1.2);

        for (let r = 1; r <= rows; r++) {
          const stepY = 13.0 + (r - 1) * 0.78;
          const stepZ = 19.5 + (r - 1) * 1.05;

          for (let s = 1; s <= seatsPerRow; s++) {
            const seatId = `${stand.key}-UPPER-${blockId}-R${r}-S${s}`;
            const localX = blockOffset + (s - (seatsPerRow + 1) / 2) * 0.42;
            const localY = stepY;
            const localZ = stepZ;

            dummy.position.set(localX, localY, localZ);
            dummy.updateMatrix();

            const worldPos = dummy.position.clone();
            worldPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), stand.rot);
            worldPos.add(new THREE.Vector3(stand.pos[0], stand.pos[1], stand.pos[2]));

            instanced.setMatrixAt(idx, dummy.matrix);

            const hash = (blockId.charCodeAt(0) * 31 + blockId.charCodeAt(1) + r * 17 + s * 7) % 100;
            const isTaken = hash < 32;
            const seatColor = isTaken ? colorTaken : colorAvailable;
            instanced.setColorAt(idx, seatColor);

            this.seatMetadata.set(seatId, {
              seatId,
              blockId,
              standKey: stand.key,
              tier: 'UPPER',
              row: r,
              seatNumber: s,
              price: stand.key === 'WEST' ? 150 : (stand.key === 'EAST' ? 110 : 70),
              status: isTaken ? 'taken' : 'available',
              instanceIndex: idx,
              worldPosition: worldPos,
              instancedMesh: instanced
            });

            idx++;
          }
        }

        instanced.instanceMatrix.needsUpdate = true;
        if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;

        const standMesh = this.standMeshes.get(stand.key);
        if (standMesh) standMesh.add(instanced);
        this.instancedSeats.set(blockId, instanced);
      }
    });
  }

  createRoofTrusses() {
    // Sweeping cantilevered stadium canopy & space frame steel trusses
    const trussMat = new THREE.MeshStandardMaterial({
      color: 0x374151,
      metalness: 0.85,
      roughness: 0.3
    });

    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.25,
      metalness: 0.6,
      side: THREE.DoubleSide
    });

    const roofConfigs = [
      { pos: [0, 31, -48], rot: 0, width: 108, depth: 36, slopeAngle: 0.1 },
      { pos: [0, 31, 48], rot: Math.PI, width: 108, depth: 36, slopeAngle: 0.1 },
      { pos: [62, 31, 0], rot: -Math.PI / 2, width: 88, depth: 38, slopeAngle: 0.1 },
      { pos: [-62, 31, 0], rot: Math.PI / 2, width: 88, depth: 38, slopeAngle: 0.1 }
    ];

    roofConfigs.forEach(rc => {
      const roofGroup = new THREE.Group();

      // Main Canopy Plane
      const canopyGeo = new THREE.PlaneGeometry(rc.width, rc.depth);
      const canopy = new THREE.Mesh(canopyGeo, roofMat);
      canopy.rotation.x = Math.PI / 2 - rc.slopeAngle;
      canopy.position.set(0, 0, rc.depth / 2 - 12);
      canopy.castShadow = true;
      canopy.receiveShadow = true;
      roofGroup.add(canopy);

      // Steel Trusses (Casting dynamic stripes onto seats)
      const trussCount = 9;
      for (let t = 0; t < trussCount; t++) {
        const tx = (t - (trussCount - 1) / 2) * (rc.width / (trussCount - 1));
        const trussBeamGeo = new THREE.BoxGeometry(0.6, 1.4, rc.depth);
        const trussBeam = new THREE.Mesh(trussBeamGeo, trussMat);
        trussBeam.position.set(tx, 0.8, rc.depth / 2 - 12);
        trussBeam.castShadow = true;
        roofGroup.add(trussBeam);
      }

      roofGroup.position.set(rc.pos[0], rc.pos[1], rc.pos[2]);
      roofGroup.rotation.y = rc.rot;
      this.scene.add(roofGroup);
    });

    // Massive Stadium Architectural Arch
    const archCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-75, 0, 0),
      new THREE.Vector3(-45, 48, 0),
      new THREE.Vector3(0, 58, 0),
      new THREE.Vector3(45, 48, 0),
      new THREE.Vector3(75, 0, 0)
    ]);
    const archGeo = new THREE.TubeGeometry(archCurve, 64, 1.4, 16, false);
    const archMesh = new THREE.Mesh(archGeo, trussMat);
    archMesh.castShadow = true;
    this.scene.add(archMesh);
  }

  createJumbotrons() {
    // 2 Giant Hanging Video Scoreboards above the goal ends
    const screenGeo = new THREE.PlaneGeometry(16, 9);
    const frameGeo = new THREE.BoxGeometry(17, 10, 1.2);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8 });

    const createScreen = (zPos, rotY) => {
      const jumbotronGroup = new THREE.Group();

      const frame = new THREE.Mesh(frameGeo, frameMat);
      jumbotronGroup.add(frame);

      // Animated Match Canvas Texture
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');

      let tick = 0;
      const updateScreen = () => {
        tick++;
        ctx.fillStyle = '#0a0e17';
        ctx.fillRect(0, 0, 640, 360);

        // Header tournament
        ctx.fillStyle = '#ffb703';
        ctx.font = 'bold 20px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🏆 GRAND ARENA CUP FINAL', 320, 45);

        // Live Scoreboard
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 44px -apple-system, sans-serif';
        ctx.fillText('APEX FC   2 - 1   TITAN ROVERS', 320, 140);

        // Match Time
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 32px monospace';
        const minute = 78 + Math.floor((tick / 60) % 12);
        ctx.fillText(`${minute}:24  •  2ND HALF`, 320, 200);

        // Animated visual bar
        ctx.fillStyle = 'rgba(255, 183, 3, 0.4)';
        const barW = (Math.sin(tick * 0.05) * 0.5 + 0.5) * 400;
        ctx.fillRect(120, 260, barW, 8);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px -apple-system, sans-serif';
        ctx.fillText('MATCHDAY ARENA 3D • SEAT-VIEW EXPERIENCE', 320, 310);
      };

      const texture = new THREE.CanvasTexture(canvas);
      this.animatedTextures.push({ texture, update: updateScreen });

      const screenMat = new THREE.MeshBasicMaterial({ map: texture });
      const screenMesh = new THREE.Mesh(screenGeo, screenMat);
      screenMesh.position.z = 0.65;
      jumbotronGroup.add(screenMesh);

      jumbotronGroup.position.set(0, 24, zPos);
      jumbotronGroup.rotation.y = rotY;
      this.scene.add(jumbotronGroup);
    };

    createScreen(-38, 0);
    createScreen(38, Math.PI);
  }

  createFloodlights() {
    // 4 Corner Stadium Floodlight Towers
    const pylonMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.9, roughness: 0.2 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const corners = [
      [-64, -48], [64, -48], [-64, 48], [64, 48]
    ];

    corners.forEach(([cx, cz]) => {
      const towerGroup = new THREE.Group();

      // Main structural pylon
      const pylonGeo = new THREE.CylinderGeometry(0.8, 1.8, 42, 8);
      const pylon = new THREE.Mesh(pylonGeo, pylonMat);
      pylon.position.y = 21;
      towerGroup.add(pylon);

      // Light grid head (3x4 lamps)
      const headGeo = new THREE.BoxGeometry(6, 4, 1);
      const head = new THREE.Mesh(headGeo, pylonMat);
      head.position.set(0, 42, 0);
      head.lookAt(0, 0, 0);
      towerGroup.add(head);

      // Spot light pointing towards pitch center
      const spot = new THREE.SpotLight(0xfff5e6, 1.4, 160, Math.PI / 4, 0.4, 1);
      spot.position.set(0, 42, 0);
      spot.target.position.set(0, 0, 0);
      towerGroup.add(spot);
      this.scene.add(spot.target);

      towerGroup.position.set(cx, 0, cz);
      this.scene.add(towerGroup);
    });
  }

  highlightSelectedSeat(seatId) {
    if (this.selectedSeatId && this.selectedSeatId !== seatId) {
      this.resetSeatHighlight(this.selectedSeatId);
    }

    const meta = this.seatMetadata.get(seatId);
    if (!meta) return;

    this.selectedSeatId = seatId;
    const goldColor = new THREE.Color(0xffb703);
    meta.instancedMesh.setColorAt(meta.instanceIndex, goldColor);
    if (meta.instancedMesh.instanceColor) {
      meta.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  resetSeatHighlight(seatId) {
    const meta = this.seatMetadata.get(seatId);
    if (!meta) return;

    const originalColor = meta.status === 'taken' 
      ? new THREE.Color(0x1d3557) 
      : new THREE.Color(0xd90429);

    meta.instancedMesh.setColorAt(meta.instanceIndex, originalColor);
    if (meta.instancedMesh.instanceColor) {
      meta.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  updateAnimations() {
    this.animatedTextures.forEach(item => {
      item.update();
      item.texture.needsUpdate = true;
    });
  }
}

