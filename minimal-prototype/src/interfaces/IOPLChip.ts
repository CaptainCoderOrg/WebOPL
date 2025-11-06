/**
 * Abstract interface for OPL3 chip access.
 *
 * Allows SimpleSynth to work with both real-time (AudioWorklet) and offline (direct) OPL3 instances.
 * This abstraction enables a single codebase for both playback and WAV export.
 */
export interface IOPLChip {
  /**
   * Write a value to an OPL3 register
   * @param array - Register array (0 or 1)
   * @param address - Register address (0x00-0xFF)
   * @param value - Value to write (0x00-0xFF)
   */
  write(array: number, address: number, value: number): void;

  /**
   * Read stereo samples from OPL3 chip
   * @param buffer - Int16Array[2] to receive [left, right] samples
   */
  read(buffer: Int16Array): void;
}
