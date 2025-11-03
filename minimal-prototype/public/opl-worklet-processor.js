/**
 * OPL3 AudioWorklet Processor
 *
 * Runs in the audio thread (AudioWorkletGlobalScope)
 * Generates audio samples from the OPL3 emulator
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
   * Initialize OPL instance
   */
  async initOPL(payload) {
    try {
      const { sampleRate } = payload;

      console.log('[OPLWorkletProcessor] Initializing OPL3...');

      // Access global OPL class (loaded in main thread)
      if (typeof globalThis.OPL === 'undefined') {
        throw new Error('OPL class not available in AudioWorklet scope');
      }

      // Create OPL instance
      this.opl = await globalThis.OPL.create(sampleRate, 2); // stereo

      // Enable waveform selection
      this.opl.write(0x01, 0x20);

      this.isReady = true;

      console.log('[OPLWorkletProcessor] OPL3 initialized successfully');

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
