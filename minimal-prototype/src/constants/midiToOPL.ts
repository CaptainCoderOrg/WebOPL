/**
 * Pre-calculated MIDI note to OPL3 frequency parameter mappings
 *
 * For OPL3 at 49716 Hz sample rate:
 * frequency = (fnum × 49716) / 2^(20 - block)
 *
 * Each MIDI note (0-127) is mapped to:
 * - freq: frequency in Hz
 * - fnum: F-number (0-1023, 10-bit)
 * - block: octave selector (0-7, 3-bit)
 *
 * Reference: YM3812 MIDI implementation
 * https://www.thingsmadesimple.com/2023/02/11/ym3812-part-4-midi-journey/
 */

export interface OPLFrequencyParams {
  freq: number;
  fnum: number;
  block: number;
}

/**
 * Pre-calculated F-Number lookup table (31 entries)
 * Covers MIDI notes 0-30, with higher notes using block scaling
 *
 * Decimal values: 173, 183, 194, 205, 217, 230, 244, 258, 274, 290, 307, 325,
 * 345, 365, 387, 410, 434, 460, 488, 517, 548, 580, 615, 651, 690, 731, 774,
 * 820, 869, 921, 975
 */
const FNUM_TABLE: ReadonlyArray<number> = [
  0x0AD, 0x0B7, 0x0C2, 0x0CD, 0x0D9, 0x0E6, 0x0F4, 0x102, 0x112, 0x122, 0x133,
  0x145, 0x159, 0x16D, 0x183, 0x19A, 0x1B2, 0x1CC, 0x1E8, 0x205, 0x224, 0x244,
  0x267, 0x28B, 0x2B2, 0x2DB, 0x306, 0x334, 0x365, 0x399, 0x3CF
];

/**
 * Calculate OPL3 parameters for a single MIDI note using lookup table
 *
 * The FNUM_TABLE contains 31 entries covering notes 0-30.
 * For higher notes, we use block shifting (octaves) and repeat the 12-note chromatic pattern.
 */
function calculateOPLParams(midiNote: number): OPLFrequencyParams {
  const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

  let block: number;
  let fnumIndex: number;

  if (midiNote < 12) {
    // First octave (C-0 to B-0)
    block = 0;
    fnumIndex = midiNote;
  } else {
    // Higher octaves: use chromatic pattern with block shifting
    // Each block represents one octave higher
    block = Math.floor(midiNote / 12);
    fnumIndex = (midiNote % 12) + 12; // Use entries 12-23 for chromatic scale
  }

  // Clamp block to valid range (0-7)
  if (block > 7) {
    block = 7;
  }

  // Clamp fnumIndex to valid range
  if (fnumIndex >= FNUM_TABLE.length) {
    fnumIndex = FNUM_TABLE.length - 1;
  }

  const fnum = FNUM_TABLE[fnumIndex];

  return { freq, fnum, block };
}

/**
 * Pre-calculated lookup table for all MIDI notes (0-127)
 * Generated at module load time
 */
export const MIDI_TO_OPL: ReadonlyArray<OPLFrequencyParams> = Array.from(
  { length: 128 },
  (_, midiNote) => calculateOPLParams(midiNote)
);

/**
 * Get OPL3 frequency parameters for a MIDI note
 * @param midiNote MIDI note number (0-127)
 * @returns OPL frequency parameters (freq, fnum, block)
 */
export function getOPLParams(midiNote: number): OPLFrequencyParams {
  if (midiNote < 0 || midiNote > 127) {
    console.warn(`[midiToOPL] Invalid MIDI note: ${midiNote}, clamping to 0-127`);
    midiNote = Math.max(0, Math.min(127, midiNote));
  }

  return MIDI_TO_OPL[midiNote];
}
