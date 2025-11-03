/**
 * opl3-chip-wrapper.js
 *
 * Wrapper around the `opl3` npm package (Robson Cozendey's OPL3 emulator)
 * Provides a simpler API compatible with our existing code.
 *
 * This is a pure JavaScript implementation (no WASM) that should work
 * reliably in AudioWorklet and main thread.
 */

// Import is handled by build system (will be bundled)
// For browser, this will be loaded as a module

/**
 * OPL3 Chip Wrapper
 *
 * Wraps the opl3 package's OPL3 class with a simpler API
 */
class OPL3Chip {
  constructor() {
    // OPL3 class will be imported dynamically
    this.chip = null;
    this.sampleRate = 49716; // OPL3 native rate
  }

  /**
   * Initialize the chip (async to match existing API)
   */
  static async create(sampleRate = 49716) {
    const wrapper = new OPL3Chip();
    wrapper.sampleRate = sampleRate;

    // Dynamically import the OPL3 class
    // In browser build, this will be bundled
    const { OPL3 } = await import('opl3');
    wrapper.chip = new OPL3();

    return wrapper;
  }

  /**
   * Write to OPL3 register
   *
   * @param {number} register - Register address (0x00-0x1FF)
   * @param {number} value - Value to write (0x00-0xFF)
   */
  write(register, value) {
    if (!this.chip) {
      throw new Error('OPL3Chip not initialized. Call create() first.');
    }

    // Convert our register format (0x000-0x1FF) to opl3 format (array, address)
    // Registers 0x100-0x1FF are in array 1 (second bank)
    // Registers 0x000-0x0FF are in array 0 (first bank)
    const array = (register >= 0x100) ? 1 : 0;
    const address = register & 0xFF;

    this.chip.write(array, address, value);
  }

  /**
   * Generate audio samples
   *
   * @param {number} numSamples - Number of stereo sample pairs to generate
   * @param {TypedArray} outputType - Type of output array (Int16Array or Float32Array)
   * @returns {TypedArray} - Generated samples
   */
  generate(numSamples, outputType = Int16Array) {
    if (!this.chip) {
      throw new Error('OPL3Chip not initialized. Call create() first.');
    }

    // OPL3.read() expects output buffer to be numSamples * 2 (stereo)
    const output = new outputType(numSamples * 2);
    this.chip.read(output);

    return output;
  }
}

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OPL3Chip;
} else {
  // Browser global export
  globalThis.OPL3Chip = OPL3Chip;
}
