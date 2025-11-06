import type { IOPLChip } from '../interfaces/IOPLChip';

/**
 * OPL3 chip adapter for direct offline rendering.
 * Provides direct access to OPL3 instance for sample capture.
 */
export class DirectOPLChip implements IOPLChip {
  private chip: any;

  constructor(chip: any) {
    this.chip = chip;
  }

  write(array: number, address: number, value: number): void {
    this.chip.write(array, address, value);
  }

  read(buffer: Int16Array): void {
    this.chip.read(buffer);
  }
}
