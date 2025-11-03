/**
 * OPL3 AudioWorklet Processor
 *
 * Runs in the audio thread (AudioWorkletGlobalScope)
 * Generates audio samples from the OPL3 emulator
 *
 * Note: AudioWorklet has no access to fetch, importScripts, or DOM.
 * WASM modules must be loaded in main thread and passed via messages.
 */

class OPLWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.opl = null;
    this.isReady = false;

    // Listen for messages from main thread
    this.port.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    console.log('[OPLWorkletProcessor] Constructed');
  }

  /**
   * Handle messages from main thread
   */
  handleMessage(data) {
    const { type, payload } = data;

    switch (type) {
      case 'load-wasm':
        this.loadWASMModules(payload);
        break;

      case 'init':
        this.initOPL(payload);
        break;

      case 'write':
        if (this.opl && this.isReady) {
          const { register, value } = payload;
          this.opl.write(register, value);
        }
        break;

      default:
        console.warn('[OPLWorkletProcessor] Unknown message type:', type);
    }
  }

  /**
   * Load WASM modules from code passed by main thread
   */
  loadWASMModules(payload) {
    try {
      const { oplCode, wrapperCode } = payload;

      console.log('[OPLWorkletProcessor] Loading WASM modules from main thread...');

      // Execute opl.js in global scope
      // This creates the 'opl' global function
      (0, eval)(oplCode);
      console.log('[OPLWorkletProcessor] ✅ opl.js loaded');

      // Execute opl-wrapper.js in global scope
      // This creates the 'OPL' class on globalThis
      (0, eval)(wrapperCode);
      console.log('[OPLWorkletProcessor] ✅ opl-wrapper.js loaded');

      // Notify main thread that WASM is loaded
      this.port.postMessage({ type: 'wasm-loaded' });
    } catch (error) {
      console.error('[OPLWorkletProcessor] Failed to load WASM modules:', error);
      this.port.postMessage({
        type: 'error',
        payload: { message: `WASM load failed: ${error.message}` }
      });
    }
  }

  /**
   * Initialize OPL instance
   */
  async initOPL(payload) {
    try {
      const { sampleRate } = payload;

      console.log('[OPLWorkletProcessor] Initializing OPL3...');

      // Check if OPL class is available (should be loaded via 'load-wasm' message)
      if (typeof globalThis.OPL === 'undefined') {
        throw new Error('OPL class not available. Send "load-wasm" message first.');
      }

      console.log('[OPLWorkletProcessor] Creating OPL instance...');

      // Create OPL instance
      this.opl = await globalThis.OPL.create(sampleRate, 2); // stereo

      // Proper OPL3 initialization sequence
      console.log('[OPLWorkletProcessor] Starting OPL3 initialization sequence...');

      // Step 1: Reset Timer 1 and Timer 2
      this.opl.write(0x04, 0x60);

      // Step 2: Reset IRQ
      this.opl.write(0x04, 0x80);

      // Step 3: Turn off CSW mode and enable waveform select
      this.opl.write(0x01, 0x20);

      // Step 4: Set melodic mode (disable rhythm mode)
      this.opl.write(0xBD, 0x00);

      // Step 5: Enable OPL3 mode
      console.log('[OPLWorkletProcessor] Enabling OPL3 mode (register 0x105)...');
      this.opl.write(0x105, 0x01);

      // Step 6: Disable 4-operator mode (all channels in 2-op mode)
      console.log('[OPLWorkletProcessor] Disabling 4-op mode (register 0x104)...');
      this.opl.write(0x104, 0x00);

      // Step 7: Write to feedback/connection registers to activate the 4-op change
      // (DOSBox bug workaround: register 0x104 changes ignored until 0xC0-0xC8 written)
      for (let ch = 0; ch < 9; ch++) {
        this.opl.write(0xC0 + ch, 0x00);        // Bank 0 channels 0-8
        this.opl.write(0x100 + 0xC0 + ch, 0x00); // Bank 1 channels 9-17
      }

      console.log('[OPLWorkletProcessor] ✅ OPL3 mode enabled with all channels in 2-op mode');

      this.isReady = true;

      console.log('[OPLWorkletProcessor] ✅ OPL3 initialized successfully');

      // Notify main thread
      this.port.postMessage({ type: 'ready' });

    } catch (error) {
      console.error('[OPLWorkletProcessor] Initialization failed:', error);
      this.port.postMessage({
        type: 'error',
        payload: { message: error.message }
      });
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
    if (!this.opl || !this.isReady) {
      // Output silence if not ready
      return true;
    }

    const output = outputs[0];
    const numChannels = output.length;
    const numSamples = output[0].length;

    if (numChannels === 0) {
      return true;
    }

    // OPL can only generate 512 samples per call
    const maxChunkSize = 512;
    let offset = 0;

    while (offset < numSamples) {
      const chunkSize = Math.min(maxChunkSize, numSamples - offset);

      // Generate samples from OPL (returns Int16Array)
      const samples = this.opl.generate(chunkSize, Int16Array);

      // Convert Int16 to Float32 and copy to output
      for (let i = 0; i < chunkSize; i++) {
        const sample = samples[i] / 32768.0;

        // Copy to all output channels (stereo)
        for (let ch = 0; ch < numChannels; ch++) {
          output[ch][offset + i] = sample;
        }
      }

      offset += chunkSize;
    }

    // Return true to keep processor alive
    return true;
  }
}

// Register the processor
registerProcessor('opl-worklet-processor', OPLWorkletProcessor);
