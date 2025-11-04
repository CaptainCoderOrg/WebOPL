/**
 * OPL3 AudioWorklet Processor (Rebuilt from Working Test)
 *
 * Rebuilt using the exact patterns from opl3-chip-test.html
 * Runs in the audio thread (AudioWorkletGlobalScope)
 * Generates audio samples from the OPL3 emulator
 */

class OPLWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.chip = null;
    this.isReady = false;
    this.sampleCount = 0;
    this.nonZeroSampleCount = 0;

    // Listen for messages from main thread
    this.port.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    console.log('[OPLWorkletProcessor] Constructed, waiting for OPL3 code...');
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
    // IMPORTANT: Initialize to 0x00 first, THEN program them later
    console.log('[OPLWorkletProcessor] Initializing C0-C8 registers to 0x00...');
    for (let ch = 0; ch < 9; ch++) {
      this.chipWrite(0xC0 + ch, 0x00);        // Bank 0 channels 0-8
      this.chipWrite(0x100 + 0xC0 + ch, 0x00); // Bank 1 channels 9-17
    }

    // Now program default instrument on channel 0 for testing
    // (Simple sine wave like in opl3-chip-test.html)
    console.log('[OPLWorkletProcessor] Programming default instrument on channel 0...');

    // Modulator (operator 0x00)
    this.chipWrite(0x20, 0x01); // AM=0, VIB=0, EGT=0, KSR=0, MULT=1
    this.chipWrite(0x40, 0x10); // KSL=0, TL=16
    this.chipWrite(0x60, 0xF0); // AR=15, DR=0
    this.chipWrite(0x80, 0x77); // SL=7, RR=7
    this.chipWrite(0xE0, 0x00); // Waveform=0 (sine)

    // Carrier (operator 0x03)
    this.chipWrite(0x23, 0x01); // AM=0, VIB=0, EGT=0, KSR=0, MULT=1
    this.chipWrite(0x43, 0x00); // KSL=0, TL=0 (max volume)
    this.chipWrite(0x63, 0xF0); // AR=15, DR=0
    this.chipWrite(0x83, 0x77); // SL=7, RR=7
    this.chipWrite(0xE3, 0x00); // Waveform=0 (sine)

    // Channel 0 settings: 0x30 = stereo output (left + right)
    this.chipWrite(0xC0, 0x30);

    console.log('[OPLWorkletProcessor] ✅ OPL3 mode enabled and channel 0 programmed');

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

      case 'write':
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
      const left = tempBuffer[0] / 32768.0;
      const right = tempBuffer[1] / 32768.0;

      // Write to output channels (usually 2 for stereo)
      if (numChannels >= 1) output[0][i] = left;
      if (numChannels >= 2) output[1][i] = right;

      if (left !== 0 || right !== 0) {
        hasNonZero = true;
      }
    }

    // Debug logging
    this.sampleCount++;
    if (hasNonZero) {
      this.nonZeroSampleCount++;
      if (this.nonZeroSampleCount === 1) {
        console.log('[OPLWorkletProcessor] ✅ First non-zero samples generated!');
      }
    }

    // Log stats every 1000 buffers (about every 21 seconds at 48kHz with 128 sample buffers)
    if (this.sampleCount % 1000 === 0) {
      console.log(`[OPLWorkletProcessor] Stats: ${this.nonZeroSampleCount}/${this.sampleCount} buffers with audio`);
    }

    // Return true to keep processor alive
    return true;
  }
}

// Register the processor
registerProcessor('opl-worklet-processor', OPLWorkletProcessor);
