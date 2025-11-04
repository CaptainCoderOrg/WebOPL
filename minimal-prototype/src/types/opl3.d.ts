/**
 * Type declarations for opl3 package
 */

declare module 'opl3/lib/opl3' {
  export default class OPL3 {
    constructor();

    /**
     * Write to OPL3 register
     * @param array Register bank (0 or 1)
     * @param address Register address (0x00-0xFF)
     * @param value Data byte (0x00-0xFF)
     */
    write(array: number, address: number, value: number): void;

    /**
     * Generate audio samples
     * @param output Int16Array buffer to fill with stereo samples [L, R, L, R, ...]
     */
    read(output: Int16Array): void;

    /**
     * OPL3 mode flag (0=OPL2, 1=OPL3)
     */
    _new: number;
  }
}
