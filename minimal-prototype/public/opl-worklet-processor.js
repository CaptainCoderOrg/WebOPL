/**
 * OPL3 AudioWorklet Processor (Pure JavaScript Edition)
 *
 * Runs in the audio thread (AudioWorkletGlobalScope)
 * Generates audio samples from the OPL3 emulator
 *
 * This version uses the pure JavaScript opl3 package instead of WASM,
 * simplifying initialization and improving reliability.
 */

class OPLWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.chip = null;
    this.isReady = false;
    this.OPL3Class = null;

    // Listen for messages from main thread
    this.port.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    console.log('[OPLWorkletProcessor] Constructed, waiting for OPL3 code...');
  }

  /**
   * Load OPL3 code from main thread
   */
  loadOPL3Code(opl3Code) {
    try {
      console.log('[OPLWorkletProcessor] Loading OPL3 code...');

      // Execute the OPL3 code in global scope
      // This will define the OPL3 class
      (0, eval)(opl3Code);

      // Check if OPL3 is now available
      if (typeof globalThis.OPL3 === 'undefined') {
        throw new Error('OPL3 class not found after code execution');
      }

      console.log('[OPLWorkletProcessor] ✅ OPL3 code loaded');

      // Create OPL3 chip instance
      this.chip = new globalThis.OPL3();
      console.log('[OPLWorkletProcessor] ✅ OPL3 chip created');

      // Initialize OPL3 mode
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
   * Initialize OPL3 mode with proper sequence
   */
  initializeOPL3() {
    console.log('[OPLWorkletProcessor] Starting OPL3 initialization sequence...');

    // Reset sequence
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

    // Initialize output routing for all channels
    // 0x30 = 0b00110000 = CHA (left) + CHB (right) enabled = stereo output
    for (let ch = 0; ch < 9; ch++) {
      this.chipWrite(0xC0 + ch, 0x30);        // Bank 0 channels 0-8: stereo output
      this.chipWrite(0x100 + 0xC0 + ch, 0x30); // Bank 1 channels 9-17: stereo output
    }

    console.log('[OPLWorkletProcessor] ✅ OPL3 mode enabled with all channels in 2-op mode');

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
        }
        break;

      default:
        console.warn('[OPLWorkletProcessor] Unknown message type:', type);
    }
  }

  /**
   * Process audio samples
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

    // Generate samples directly into a temporary buffer
    // The chip.read() method fills the buffer with interleaved stereo samples [L, R, L, R, ...]
    const tempBuffer = new Int16Array(2);

    for (let i = 0; i < numSamples; i++) {
      this.chip.read(tempBuffer);

      // Convert Int16 to Float32 and write to output channels
      const left = tempBuffer[0] / 32768.0;
      const right = tempBuffer[1] / 32768.0;

      // Write to all output channels (usually 2 for stereo)
      if (numChannels >= 1) output[0][i] = left;
      if (numChannels >= 2) output[1][i] = right;
    }

    // Return true to keep processor alive
    return true;
  }
}

// Register the processor
registerProcessor('opl-worklet-processor', OPLWorkletProcessor);
