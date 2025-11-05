/**
 * Note Conversion Utilities
 *
 * Converts between note names (C-4, D#5) and MIDI numbers (0-127)
 * Format: "C-4" = Middle C = MIDI 60
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_FLAT = ['C', 'DB', 'D', 'EB', 'E', 'F', 'GB', 'G', 'AB', 'A', 'BB', 'B'];

/**
 * Convert note name to MIDI number
 * @param noteName - Format: "C-4", "C#4", "D-5", etc.
 * @returns MIDI note number (0-127), null for rest/sustain, or -1 for note off
 *
 * Examples:
 *   "C-4" → 60 (middle C)
 *   "A-4" → 69 (A440)
 *   "C-5" → 72 (one octave above middle C)
 *   "---" → null (rest/sustain previous note)
 *   "OFF" → -1 (note off command)
 */
export function noteNameToMIDI(noteName: string): number | null {
  // Handle empty or rest notation (sustain)
  if (!noteName || noteName === '---' || noteName === '...' || noteName.trim() === '') {
    return null;
  }

  // Handle note off command
  if (noteName.trim().toUpperCase() === 'OFF') {
    return -1;
  }

  // Normalize: trim whitespace and convert to uppercase
  noteName = noteName.trim().toUpperCase();

  // Parse note format: "C-4" or "C#4" or "C4"
  // Regex: ([A-G][#B]?) = note name with optional sharp/flat
  //        [-]? = optional dash
  //        (\\d+) = octave number
  const match = noteName.match(/^([A-G][#B]?)[-]?(\d+)$/);

  if (!match) {
    console.warn('[noteConversion] Invalid note format:', noteName);
    return null;
  }

  const [, note, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);

  // Find note index (0-11) within octave
  let noteIndex = NOTE_NAMES.indexOf(note);

  if (noteIndex === -1) {
    // Try flat notation (Db, Eb, etc.)
    noteIndex = NOTE_NAMES_FLAT.indexOf(note);
  }

  if (noteIndex === -1) {
    console.warn('[noteConversion] Invalid note name:', note);
    return null;
  }

  // Calculate MIDI number
  // Formula: MIDI = (octave + 1) * 12 + noteIndex
  // C-4 = (4 + 1) * 12 + 0 = 60
  const midiNote = (octave + 1) * 12 + noteIndex;

  // Validate MIDI range (0-127)
  if (midiNote < 0 || midiNote > 127) {
    console.warn('[noteConversion] MIDI note out of range:', midiNote);
    return null;
  }

  return midiNote;
}

/**
 * Convert MIDI number to note name
 * @param midiNote - MIDI note number (0-127)
 * @returns Note name in "C-4" format
 *
 * Examples:
 *   60 → "C-4"
 *   69 → "A-4"
 *   72 → "C-5"
 */
export function midiToNoteName(midiNote: number): string {
  // Validate range
  if (midiNote < 0 || midiNote > 127) {
    return '---';
  }

  // Calculate octave and note index
  const octave = Math.floor(midiNote / 12) - 1;
  const noteIndex = midiNote % 12;
  const noteName = NOTE_NAMES[noteIndex];

  return `${noteName}-${octave}`;
}

/**
 * Validate note name format
 * @param noteName - Note name to validate
 * @returns True if valid note, rest, or OFF command
 */
export function isValidNoteName(noteName: string): boolean {
  if (!noteName || noteName === '---' || noteName === '...') {
    return true; // Rest is valid
  }

  if (noteName.trim().toUpperCase() === 'OFF') {
    return true; // OFF command is valid
  }

  return noteNameToMIDI(noteName) !== null;
}

/**
 * Format note name to consistent format
 * @param noteName - Note name to format
 * @returns Formatted note name or "---" if invalid
 */
export function formatNoteName(noteName: string): string {
  const midi = noteNameToMIDI(noteName);
  if (midi === null) return '---';
  return midiToNoteName(midi);
}

/**
 * Simple console-based test suite
 */
export function testNoteConversion(): void {
  console.log('=== Note Conversion Tests ===');

  const tests: Array<[string, number | null]> = [
    // [input, expected MIDI]
    ['C-4', 60],
    ['C4', 60],   // Without dash
    ['A-4', 69],  // A440
    ['C-5', 72],  // One octave up
    ['C#4', 61],  // Sharp
    ['C#-4', 61], // Sharp with dash
    ['D-4', 62],
    ['E-4', 64],
    ['F-4', 65],
    ['G-4', 67],
    ['A-4', 69],
    ['B-4', 71],
    ['---', null], // Rest
    ['', null],    // Empty
    ['C-0', 12],   // Low note
    ['G-9', 127],  // High note
    ['X-4', null], // Invalid note
    ['C-99', null], // Invalid octave
  ];

  let passed = 0;
  let failed = 0;

  tests.forEach(([input, expected]) => {
    const result = noteNameToMIDI(input);
    const pass = result === expected;

    if (pass) {
      console.log(`✅ "${input}" → ${result}`);
      passed++;
    } else {
      console.error(`❌ "${input}" → ${result} (expected ${expected})`);
      failed++;
    }
  });

  console.log('\n--- Reverse Conversion Tests ---');

  // Test MIDI to note name
  const reverseTests: Array<[number, string]> = [
    [60, 'C-4'],
    [69, 'A-4'],
    [72, 'C-5'],
    [0, 'C--1'],
    [127, 'G-9'],
  ];

  reverseTests.forEach(([midi, expected]) => {
    const result = midiToNoteName(midi);
    const pass = result === expected;

    if (pass) {
      console.log(`✅ ${midi} → "${result}"`);
      passed++;
    } else {
      console.error(`❌ ${midi} → "${result}" (expected "${expected}")`);
      failed++;
    }
  });

  console.log('\n--- Validation Tests ---');

  const validationTests: Array<[string, boolean]> = [
    ['C-4', true],
    ['---', true],
    ['X-4', false],
    ['C-99', false],
  ];

  validationTests.forEach(([input, expected]) => {
    const result = isValidNoteName(input);
    const pass = result === expected;

    if (pass) {
      console.log(`✅ isValid("${input}") = ${result}`);
      passed++;
    } else {
      console.error(`❌ isValid("${input}") = ${result} (expected ${expected})`);
      failed++;
    }
  });

  console.log(`\n=== Test Results: ${passed} passed, ${failed} failed ===`);
}
