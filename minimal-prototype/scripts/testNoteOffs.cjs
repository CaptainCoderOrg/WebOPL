/**
 * Test Note-Off Detection
 * Checks if MIDI conversion includes note-off markers
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Load a converted pattern (e1m1 with note-offs)
const patternPath = process.argv[2];

if (!patternPath) {
  console.log('Usage: node testNoteOffs.cjs <pattern.yaml>');
  console.log('Example: node testNoteOffs.cjs public/patterns/e1m1-noteoff-test.yaml');
  process.exit(1);
}

console.log('🎵 Note-Off Detection Test');
console.log('===========================\n');

console.log(`Loading pattern: ${patternPath}`);

const yamlText = fs.readFileSync(patternPath, 'utf8');
const pattern = yaml.load(yamlText);

console.log(`Pattern: ${pattern.name}`);
console.log(`Rows: ${pattern.rows}`);
console.log(`Tracks: ${pattern.tracks}\n`);

// Count note-offs
let noteOffCount = 0;
const noteOffsByTrack = new Array(pattern.tracks).fill(0);

for (let rowIdx = 0; rowIdx < pattern.pattern.length; rowIdx++) {
  const row = pattern.pattern[rowIdx];

  for (let trackIdx = 0; trackIdx < row.length; trackIdx++) {
    const cell = row[trackIdx];

    // Check both string and object formats
    let noteStr;
    if (typeof cell === 'object' && cell !== null) {
      noteStr = cell.n;
    } else {
      noteStr = cell;
    }

    if (noteStr === 'OFF') {
      noteOffCount++;
      noteOffsByTrack[trackIdx]++;
    }
  }
}

console.log('📊 Note-Off Statistics:');
console.log(`  Total note-offs: ${noteOffCount}`);
console.log(`  Note-offs by track:`);

for (let t = 0; t < pattern.tracks; t++) {
  if (noteOffsByTrack[t] > 0) {
    console.log(`    Track ${t}: ${noteOffsByTrack[t]} note-offs`);
  }
}

// Sample some note-offs
console.log('\n🎼 Sample Note-Off Locations:');
let sampleCount = 0;
for (let rowIdx = 0; rowIdx < pattern.pattern.length && sampleCount < 10; rowIdx++) {
  const row = pattern.pattern[rowIdx];

  for (let trackIdx = 0; trackIdx < row.length && sampleCount < 10; trackIdx++) {
    const cell = row[trackIdx];

    let noteStr;
    if (typeof cell === 'object' && cell !== null) {
      noteStr = cell.n;
    } else {
      noteStr = cell;
    }

    if (noteStr === 'OFF') {
      console.log(`  Row ${rowIdx}, Track ${trackIdx}: OFF`);
      sampleCount++;
    }
  }
}

if (noteOffCount === 0) {
  console.log('\n⚠️  WARNING: No note-offs found!');
  console.log('   This might indicate:');
  console.log('   1. The MIDI file has no note-off events (all notes sustain)');
  console.log('   2. The converter is not writing note-offs correctly');
} else {
  console.log(`\n✅ Found ${noteOffCount} note-off markers!`);
}
