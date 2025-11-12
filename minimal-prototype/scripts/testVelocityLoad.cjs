/**
 * Test Velocity Loading
 * Verifies that the velocity test pattern loads correctly
 */

const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

// Load the pattern
const patternPath = path.join(__dirname, '..', 'public', 'patterns', 'e1m1-velocity-test.yaml');
const yamlText = fs.readFileSync(patternPath, 'utf8');
const pattern = yaml.load(yamlText);

console.log('🎵 Velocity Test Pattern Loader');
console.log('===============================\n');

console.log(`Name: ${pattern.name}`);
console.log(`Rows: ${pattern.rows}`);
console.log(`Tracks: ${pattern.tracks}`);
console.log(`BPM: ${pattern.bpm}`);
console.log(`Instruments: [${pattern.instruments.join(', ')}]\n`);

// Count velocity cells
let stringCells = 0;
let objectCells = 0;
let velocityValues = new Set();

for (let rowIdx = 0; rowIdx < pattern.pattern.length; rowIdx++) {
  const row = pattern.pattern[rowIdx];

  for (let trackIdx = 0; trackIdx < row.length; trackIdx++) {
    const cell = row[trackIdx];

    if (typeof cell === 'string') {
      if (cell !== '---') {
        stringCells++;
      }
    } else if (typeof cell === 'object' && cell !== null) {
      objectCells++;
      if (cell.v !== undefined) {
        velocityValues.add(cell.v);
      }
    }
  }
}

console.log('📊 Cell Statistics:');
console.log(`  String cells (default velocity): ${stringCells}`);
console.log(`  Object cells (custom velocity): ${objectCells}`);
console.log(`  Total notes: ${stringCells + objectCells}`);
console.log(`  Velocity range: ${Math.min(...velocityValues)} - ${Math.max(...velocityValues)}`);
console.log(`  Unique velocity values: ${velocityValues.size}\n`);

// Sample some velocity cells
console.log('🎼 Sample Velocity Cells:');
let sampleCount = 0;
for (let rowIdx = 0; rowIdx < pattern.pattern.length && sampleCount < 10; rowIdx++) {
  const row = pattern.pattern[rowIdx];

  for (let trackIdx = 0; trackIdx < row.length && sampleCount < 10; trackIdx++) {
    const cell = row[trackIdx];

    if (typeof cell === 'object' && cell !== null && cell.v !== undefined) {
      console.log(`  Row ${rowIdx}, Track ${trackIdx}: {n: "${cell.n}", v: ${cell.v}}`);
      sampleCount++;
    }
  }
}

console.log('\n✅ Pattern loads successfully with velocity support!');
