import { noteNameToMIDI, midiToNoteName, isValidNoteName } from './noteConversion';

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
