/**
 * OPL3Wrapper - Adapter for opl3 package
 *
 * Provides a simplified API that converts our register format (0x000-0x1FF)
 * to the opl3 package's format (array, address).
 *
 * This wrapper allows the rest of the codebase to continue using the simple
 * writeOPL(register, value) interface without needing to know about the
 * underlying array/address split required by the opl3 package.
 */

// Load util polyfill FIRST (before importing opl3)
import './util-polyfill';

// Import directly from lib/opl3 to avoid Node.js dependencies in index.js
import OPL3 from 'opl3/lib/opl3';

export class OPL3Wrapper {
  private chip: OPL3;

  constructor() {
    this.chip = new OPL3();
    this.initializeOPL3();
  }

  /**
   * Write to OPL3 register
   * Converts 0x000-0x1FF format to (array, address) format
   *
   * @param register Register address (0x000-0x1FF)
   *                 0x000-0x0FF: array 0 (first bank)
   *                 0x100-0x1FF: array 1 (second bank)
   * @param value Data byte to write (0x00-0xFF)
   */
  write(register: number, value: number): void {
    const array = (register >= 0x100) ? 1 : 0;
    const address = register & 0xFF;
    this.chip.write(array, address, value);
  }

  /**
   * Generate audio samples (for ScriptProcessor mode)
   *
   * @param numSamples Number of sample frames to generate
   * @returns Int16Array with interleaved stereo samples [L, R, L, R, ...]
   */
  generate(numSamples: number): Int16Array {
    const output = new Int16Array(numSamples * 2); // Stereo
    this.chip.read(output);
    return output;
  }

  /**
   * Get direct access to the chip for AudioWorklet
   * (AudioWorklet will use chip.read() directly for efficiency)
   */
  getChip(): OPL3 {
    return this.chip;
  }

  /**
   * Initialize OPL3 mode with proper sequence
   *
   * This sequence:
   * 1. Resets the chip
   * 2. Enables OPL3 extended features
   * 3. Configures all channels for 2-operator mode
   * 4. Sets stereo output routing for all 18 channels
   */
  private initializeOPL3(): void {
    // Reset sequence
    this.write(0x04, 0x60);  // Reset Timer 1 and Timer 2
    this.write(0x04, 0x80);  // Reset IRQ
    this.write(0x01, 0x20);  // Enable waveform select
    this.write(0xBD, 0x00);  // Melodic mode (disable rhythm mode)

    // Enable OPL3 mode (register 0x105)
    this.write(0x105, 0x01);

    // Disable 4-operator mode (all channels in 2-op mode)
    this.write(0x104, 0x00);

    // Initialize output routing for all channels
    // 0x30 = 0b00110000 = CHA (left) + CHB (right) enabled = stereo output
    for (let ch = 0; ch < 9; ch++) {
      this.write(0xC0 + ch, 0x30);        // Bank 0 channels 0-8: stereo output
      this.write(0x100 + 0xC0 + ch, 0x30); // Bank 1 channels 9-17: stereo output
    }
  }
}
