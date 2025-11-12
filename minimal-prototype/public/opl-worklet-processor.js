/**
 * OPL3 AudioWorklet Processor (Rebuilt from Working Test)
 *
 * Rebuilt using the exact patterns from opl3-chip-test.html
 * Runs in the audio thread (AudioWorkletGlobalScope)
 * Generates audio samples from the OPL3 emulator
 */

/**
 * Sound Blaster 16 Audio Filter
 * Emulates the analog output stage of Creative Labs Sound Blaster 16
 *
 * Filter Chain:
 * 1. High-shelf filter (-2 dB @ 8 kHz) for analog warmth
 * 2. Low-pass filter (cutoff @ 16 kHz) for anti-aliasing
 * 3. Optional subtle saturation for analog character
 */
class SB16Filter {
  constructor(sampleRate) {
    this.sampleRate = sampleRate;

    // High-shelf filter state
    this.hsA1 = 0;
    this.hsA2 = 0;
    this.hsB0 = 0;
    this.hsB1 = 0;
    this.hsB2 = 0;
    this.hsX1L = 0;
    this.hsX2L = 0;
    this.hsY1L = 0;
    this.hsY2L = 0;
    this.hsX1R = 0;
    this.hsX2R = 0;
    this.hsY1R = 0;
    this.hsY2R = 0;

    // Low-pass filter state
    this.lpA1 = 0;
    this.lpA2 = 0;
    this.lpB0 = 0;
    this.lpB1 = 0;
    this.lpB2 = 0;
    this.lpX1L = 0;
    this.lpX2L = 0;
    this.lpY1L = 0;
    this.lpY2L = 0;
    this.lpX1R = 0;
    this.lpX2R = 0;
    this.lpY1R = 0;
    this.lpY2R = 0;

    this.calculateCoefficients();
  }

  calculateCoefficients() {
    // High-shelf filter: -2 dB @ 8000 Hz, Q = 0.707
    this.calculateHighShelfCoefficients(8000, 0.707, -2);

    // Low-pass filter: Cutoff @ 16000 Hz, Q = 0.707
    this.calculateLowPassCoefficients(16000, 0.707);
  }

  calculateHighShelfCoefficients(freq, q, gainDB) {
    const w0 = (2 * Math.PI * freq) / this.sampleRate;
    const cosW0 = Math.cos(w0);
    const sinW0 = Math.sin(w0);
    const A = Math.pow(10, gainDB / 40);
    const beta = Math.sqrt(A) / q;

    const b0 = A * ((A + 1) + (A - 1) * cosW0 + beta * sinW0);
    const b1 = -2 * A * ((A - 1) + (A + 1) * cosW0);
    const b2 = A * ((A + 1) + (A - 1) * cosW0 - beta * sinW0);
    const a0 = (A + 1) - (A - 1) * cosW0 + beta * sinW0;
    const a1 = 2 * ((A - 1) - (A + 1) * cosW0);
    const a2 = (A + 1) - (A - 1) * cosW0 - beta * sinW0;

    this.hsB0 = b0 / a0;
    this.hsB1 = b1 / a0;
    this.hsB2 = b2 / a0;
    this.hsA1 = a1 / a0;
    this.hsA2 = a2 / a0;
  }

  calculateLowPassCoefficients(freq, q) {
    const w0 = (2 * Math.PI * freq) / this.sampleRate;
    const cosW0 = Math.cos(w0);
    const sinW0 = Math.sin(w0);
    const alpha = sinW0 / (2 * q);

    const b0 = (1 - cosW0) / 2;
    const b1 = 1 - cosW0;
    const b2 = (1 - cosW0) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cosW0;
    const a2 = 1 - alpha;

    this.lpB0 = b0 / a0;
    this.lpB1 = b1 / a0;
    this.lpB2 = b2 / a0;
    this.lpA1 = a1 / a0;
    this.lpA2 = a2 / a0;
  }

  processSampleLeft(input) {
    // Stage 1: High-shelf filter
    const hs = this.hsB0 * input + this.hsB1 * this.hsX1L + this.hsB2 * this.hsX2L
              - this.hsA1 * this.hsY1L - this.hsA2 * this.hsY2L;

    this.hsX2L = this.hsX1L;
    this.hsX1L = input;
    this.hsY2L = this.hsY1L;
    this.hsY1L = hs;

    // Stage 2: Low-pass filter
    const lp = this.lpB0 * hs + this.lpB1 * this.lpX1L + this.lpB2 * this.lpX2L
              - this.lpA1 * this.lpY1L - this.lpA2 * this.lpY2L;

    this.lpX2L = this.lpX1L;
    this.lpX1L = hs;
    this.lpY2L = this.lpY1L;
    this.lpY1L = lp;

    // Stage 3: Subtle saturation
    return this.softClip(lp);
  }

  processSampleRight(input) {
    // Stage 1: High-shelf filter
    const hs = this.hsB0 * input + this.hsB1 * this.hsX1R + this.hsB2 * this.hsX2R
              - this.hsA1 * this.hsY1R - this.hsA2 * this.hsY2R;

    this.hsX2R = this.hsX1R;
    this.hsX1R = input;
    this.hsY2R = this.hsY1R;
    this.hsY1R = hs;

    // Stage 2: Low-pass filter
    const lp = this.lpB0 * hs + this.lpB1 * this.lpX1R + this.lpB2 * this.lpX2R
              - this.lpA1 * this.lpY1R - this.lpA2 * this.lpY2R;

    this.lpX2R = this.lpX1R;
    this.lpX1R = hs;
    this.lpY2R = this.lpY1R;
    this.lpY1R = lp;

    // Stage 3: Subtle saturation
    return this.softClip(lp);
  }

  softClip(input) {
    const threshold = 0.95;
    const amount = 0.1;

    if (Math.abs(input) < threshold) {
      return input;
    }

    return Math.tanh(input * (1 + amount));
  }

  reset() {
    this.hsX1L = this.hsX2L = this.hsY1L = this.hsY2L = 0;
    this.hsX1R = this.hsX2R = this.hsY1R = this.hsY2R = 0;
    this.lpX1L = this.lpX2L = this.lpY1L = this.lpY2L = 0;
    this.lpX1R = this.lpX2R = this.lpY1R = this.lpY2R = 0;
  }
}

class OPLWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.chip = null;
    this.isReady = false;
    this.sampleCount = 0;
    this.nonZeroSampleCount = 0;

    // Initialize SB16 filter (assume 48kHz, will work for 44.1kHz too)
    this.sb16Filter = new SB16Filter(sampleRate);
    this.sb16Enabled = false; // Default: off

    // Listen for messages from main thread
    this.port.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    console.log('[OPLWorkletProcessor] Constructed, waiting for OPL3 code...');
    console.log('[OPLWorkletProcessor] SB16 Filter initialized (disabled by default)');
  }

  /**
   * Load OPL3 code from main thread (browser bundle)
   * Uses exact pattern from opl3-chip-test.html
   */
  loadOPL3Code(opl3Code) {
    try {
      console.log('[OPLWorkletProcessor] Loading OPL3 browser bundle...');

      // Execute the browser bundle code in global scope
      // The browser bundle exposes globalThis.OPL3.OPL3 as a global
      (0, eval)(opl3Code);

      // Check if OPL3 is now available (browser bundle exposes OPL3.OPL3)
      if (typeof globalThis.OPL3 === 'undefined' || typeof globalThis.OPL3.OPL3 === 'undefined') {
        throw new Error('OPL3 class not found after browser bundle execution');
      }

      console.log('[OPLWorkletProcessor] ✅ OPL3 browser bundle loaded');

      // Create OPL3 chip instance (browser bundle exposes it as OPL3.OPL3)
      this.chip = new globalThis.OPL3.OPL3();
      console.log('[OPLWorkletProcessor] ✅ OPL3 chip created');

      // Initialize OPL3 mode using exact sequence from working test
      this.initializeOPL3();

    } catch (error) {
      console.error('[OPLWorkletProcessor] Failed to load OPL3 code:', error);
      this.port.postMessage({
        type: 'error',
        payload: { message: `OPL3 load failed: ${error.message}` }
      });
    }
  }

  /**
   * Initialize OPL3 mode with exact sequence from opl3-chip-test.html
   */
  initializeOPL3() {
    console.log('[OPLWorkletProcessor] Starting OPL3 initialization sequence...');

    // Reset sequence (from working test)
    this.chipWrite(0x04, 0x60);  // Reset Timer 1 and Timer 2
    this.chipWrite(0x04, 0x80);  // Reset IRQ
    this.chipWrite(0x01, 0x20);  // Enable waveform select
    this.chipWrite(0xBD, 0x00);  // Melodic mode (disable rhythm mode)

    // Enable OPL3 mode (register 0x105)
    console.log('[OPLWorkletProcessor] Enabling OPL3 mode (register 0x105)...');
    this.chipWrite(0x105, 0x01);

    // Disable 4-operator mode (all channels in 2-op mode)
    console.log('[OPLWorkletProcessor] Disabling 4-op mode (register 0x104)...');
    this.chipWrite(0x104, 0x00);

    // Initialize C0-C8 registers (DOSBox workaround from working test)
    // IMPORTANT: Initialize to 0x00 first, THEN program them later via loadPatch()
    console.log('[OPLWorkletProcessor] Initializing C0-C8 registers to 0x00...');
    for (let ch = 0; ch < 9; ch++) {
      this.chipWrite(0xC0 + ch, 0x00);        // Bank 0 channels 0-8
      this.chipWrite(0x100 + 0xC0 + ch, 0x00); // Bank 1 channels 9-17
    }

    console.log('[OPLWorkletProcessor] ✅ OPL3 mode enabled, ready for patch loading');

    this.isReady = true;

    // Notify main thread
    this.port.postMessage({ type: 'ready' });
    console.log('[OPLWorkletProcessor] ✅ Initialization complete, ready to generate audio');
  }

  /**
   * Convert register format and write to chip
   * Converts 0x000-0x1FF format to (array, address) format
   *
   * @param register Register address (0x000-0x1FF)
   * @param value Data byte to write (0x00-0xFF)
   */
  chipWrite(register, value) {
    if (!this.chip) {
      console.warn('[OPLWorkletProcessor] Cannot write, chip not initialized');
      return;
    }

    const array = (register >= 0x100) ? 1 : 0;
    const address = register & 0xFF;
    this.chip.write(array, address, value);
  }

  /**
   * Handle messages from main thread
   */
  handleMessage(data) {
    const { type, payload } = data;

    switch (type) {
      case 'load-opl3':
        this.loadOPL3Code(payload.opl3Code);
        break;

      case 'setSB16Mode':
        this.sb16Enabled = data.enabled;
        if (this.sb16Enabled) {
          this.sb16Filter.reset(); // Reset filter state
        }
        console.log('[OPLWorkletProcessor] SB16 Mode:', this.sb16Enabled ? 'ON' : 'OFF');
        break;

      case 'write-register':
        // New IOPLChip format: { array, address, value }
        if (this.isReady) {
          const { array, address, value } = payload;
          this.chip.write(array, address, value);

          // Debug: log key-on register writes (0xB0-0xB8)
          if (address >= 0xB0 && address <= 0xB8) {
            const register = array === 1 ? 0x100 + address : address;
            console.log(`[OPLWorkletProcessor] Key-on write: reg=0x${register.toString(16)}, val=0x${value.toString(16)}`);
          }
        } else {
          console.warn('[OPLWorkletProcessor] Received write before ready');
        }
        break;

      case 'write':
        // Legacy format: { register, value } (for backward compatibility)
        if (this.isReady) {
          const { register, value } = payload;
          this.chipWrite(register, value);

          // Debug: log key-on register writes (0xB0-0xB8 and 0x1B0-0x1B8)
          if ((register >= 0xB0 && register <= 0xB8) || (register >= 0x1B0 && register <= 0x1B8)) {
            console.log(`[OPLWorkletProcessor] Key-on write: reg=0x${register.toString(16)}, val=0x${value.toString(16)}`);
          }
        } else {
          console.warn('[OPLWorkletProcessor] Received write before ready');
        }
        break;

      default:
        console.warn('[OPLWorkletProcessor] Unknown message type:', type);
    }
  }

  /**
   * Process audio samples
   * Uses exact pattern from opl3-chip-test.html: ONE SAMPLE AT A TIME
   *
   * @param {Float32Array[][]} inputs - Input audio (unused)
   * @param {Float32Array[][]} outputs - Output audio buffers
   * @param {Object} parameters - Audio parameters (unused)
   * @returns {boolean} - true to keep processor alive
   */
  process(inputs, outputs, parameters) {
    if (!this.chip || !this.isReady) {
      // Output silence if not ready
      return true;
    }

    const output = outputs[0];
    const numChannels = output.length;
    const numSamples = output[0].length;

    if (numChannels === 0) {
      return true;
    }

    // Generate samples ONE AT A TIME (critical pattern from working test!)
    // The chip.read() method generates samples sequentially, advancing
    // internal state with each call. We must call it once per sample frame.
    const tempBuffer = new Int16Array(2); // Single stereo frame
    let hasNonZero = false;

    for (let i = 0; i < numSamples; i++) {
      // Read one stereo sample
      this.chip.read(tempBuffer);

      // Convert Int16 to Float32
      let left = tempBuffer[0] / 32768.0;
      let right = tempBuffer[1] / 32768.0;

      // Apply SB16 filtering if enabled
      if (this.sb16Enabled) {
        left = this.sb16Filter.processSampleLeft(left);
        right = this.sb16Filter.processSampleRight(right);
      }

      // Write to output channels (usually 2 for stereo)
      if (numChannels >= 1) output[0][i] = left;
      if (numChannels >= 2) output[1][i] = right;

      if (left !== 0 || right !== 0) {
        hasNonZero = true;
      }
    }

    // Debug logging (reduced verbosity)
    this.sampleCount++;
    if (hasNonZero) {
      this.nonZeroSampleCount++;
      if (this.nonZeroSampleCount === 1) {
        console.log('[OPLWorkletProcessor] ✅ First non-zero samples generated!');
      }
    }

    // Only log stats when audio is actually playing (not when idle)
    // This prevents console spam when the synth is idle
    if (hasNonZero && this.sampleCount % 5000 === 0) {
      console.log(`[OPLWorkletProcessor] Stats: ${this.nonZeroSampleCount}/${this.sampleCount} buffers with audio`);
    }

    // Return true to keep processor alive
    return true;
  }
}

// Register the processor
registerProcessor('opl-worklet-processor', OPLWorkletProcessor);
