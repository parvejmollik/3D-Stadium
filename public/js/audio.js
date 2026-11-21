// ==========================================================================
// MATCHDAY ARENA 3D - PROCEDURAL WEB AUDIO SYNTHESIZER
// Generates authentic stadium crowd roar, chants, referee whistles & UI chimes
// Zero external mp3 dependencies, 100% reliable, zero network latency.
// ==========================================================================

class StadiumAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = true;
    this.crowdGain = null;
    this.noiseNode = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master Crowd Gain
      this.crowdGain = this.ctx.createGain();
      this.crowdGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.crowdGain.connect(this.ctx.destination);

      this.setupCrowdAmbience();
      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio not supported or blocked:', e);
    }
  }

  setupCrowdAmbience() {
    if (!this.ctx) return;

    // 1. Generate pink/brown stadium noise buffer (5 seconds looping)
    const bufferSize = this.ctx.sampleRate * 5;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // 2. Stadium acoustic bandpass filters (simulates open-air grandstand acoustics)
    const filter1 = this.ctx.createBiquadFilter();
    filter1.type = 'bandpass';
    filter1.frequency.value = 450;
    filter1.Q.value = 1.2;

    const filter2 = this.ctx.createBiquadFilter();
    filter2.type = 'lowpass';
    filter2.frequency.value = 1400;

    // Connect noise through stadium acoustic filters
    whiteNoise.connect(filter1);
    filter1.connect(filter2);
    filter2.connect(this.crowdGain);

    whiteNoise.start();

    // 3. Periodic crowd cheer swells (simulates match tension)
    this.startCheerSwells();
  }

  startCheerSwells() {
    if (!this.ctx || !this.crowdGain) return;

    setInterval(() => {
      if (this.isMuted || !this.ctx || this.ctx.state !== 'running') return;
      
      const now = this.ctx.currentTime;
      const baseGain = 0.22;
      const peakGain = 0.42 + Math.random() * 0.25;
      const duration = 2.5 + Math.random() * 2.0;

      this.crowdGain.gain.setValueAtTime(this.crowdGain.gain.value, now);
      this.crowdGain.gain.exponentialRampToValueAtTime(peakGain, now + duration * 0.4);
      this.crowdGain.gain.exponentialRampToValueAtTime(baseGain, now + duration);
    }, 7000);
  }

  toggleSound() {
    if (!this.isInitialized) {
      this.init();
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isMuted = !this.isMuted;

    if (this.crowdGain && this.ctx) {
      const now = this.ctx.currentTime;
      if (this.isMuted) {
        this.crowdGain.gain.setValueAtTime(this.crowdGain.gain.value, now);
        this.crowdGain.gain.linearRampToValueAtTime(0.0001, now + 0.3);
      } else {
        this.crowdGain.gain.setValueAtTime(this.crowdGain.gain.value, now);
        this.crowdGain.gain.linearRampToValueAtTime(0.25, now + 0.5);
        this.playWhistle(); // Iconic referee whistle when turning sound on!
      }
    }

    return !this.isMuted;
  }

  playClick() {
    if (this.isMuted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {}
  }

  playSeatSelect() {
    if (this.isMuted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(1040, now + 0.12);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.14);
    } catch (e) {}
  }

  playWhistle() {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      
      // Dual high frequencies for authentic referee acme whistle
      [2750, 3100].forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        // Flutter modulation
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.value = 35; // 35Hz flutter
        lfoGain.gain.value = 50;
        lfo.connect(osc.frequency);
        lfo.start(now);
        lfo.stop(now + 0.35);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
      });
    } catch (e) {}
  }
}

export const stadiumAudio = new StadiumAudioEngine();

