/**
 * Count notes in a pattern file
 * Compares to original MIDI polyphony analysis
 */

const fs = require('fs');
const yaml = require('js-yaml');

if (process.argv.length < 3) {
  console.log('Usage: node countPatternNotes.cjs <pattern.yaml>');
  process.exit(1);
}

const patternPath = process.argv[2];

console.log('\n📊 Pattern Note Analysis\n');
console.log(`Loading: ${patternPath}\n`);

const yamlText = fs.readFileSync(patternPath, 'utf8');
const pattern = yaml.load(yamlText);

console.log(`Pattern: ${pattern.name}`);
console.log(`Rows: ${pattern.rows}`);
console.log(`Tracks: ${pattern.tracks}\n`);

// Count notes (excluding rests, OFF markers)
let totalNotes = 0;
const notesByTrack = new Array(pattern.tracks).fill(0);
const polyphonicRows = [];  // Rows where multiple tracks have notes

for (let rowIdx = 0; rowIdx < pattern.pattern.length; rowIdx++) {
  const row = pattern.pattern[rowIdx];
  let notesInRow = 0;
  const tracksWithNotes = [];

  for (let trackIdx = 0; trackIdx < row.length; trackIdx++) {
    const cell = row[trackIdx];

    // Extract note string
    let noteStr;
    if (typeof cell === 'object' && cell !== null) {
      noteStr = cell.n;
    } else {
      noteStr = cell;
    }

    // Count actual notes (not rests or OFF markers)
    if (noteStr && noteStr !== '---' && noteStr !== 'OFF') {
      totalNotes++;
      notesByTrack[trackIdx]++;
      notesInRow++;
      tracksWithNotes.push(trackIdx);
    }
  }

  // Record rows with polyphony (multiple simultaneous notes)
  if (notesInRow > 1) {
    polyphonicRows.push({
      row: rowIdx,
      count: notesInRow,
      tracks: tracksWithNotes
    });
  }
}

console.log('📈 Note Statistics:');
console.log(`   Total notes: ${totalNotes}`);
console.log(`   Notes by track:`);
for (let t = 0; t < pattern.tracks; t++) {
  if (notesByTrack[t] > 0) {
    console.log(`     Track ${t}: ${notesByTrack[t]} notes`);
  }
}

console.log(`\n🎵 Polyphony Statistics:`);
console.log(`   Rows with polyphony: ${polyphonicRows.length}`);

// Show polyphony examples
console.log(`   Examples (first 10):`);
for (let i = 0; i < Math.min(10, polyphonicRows.length); i++) {
  const p = polyphonicRows[i];
  console.log(`     Row ${p.row}: ${p.count} simultaneous notes on tracks [${p.tracks.join(', ')}]`);
}

if (polyphonicRows.length > 10) {
  console.log(`     ... and ${polyphonicRows.length - 10} more rows with polyphony`);
}

console.log(`\n✅ Analysis complete!\n`);
