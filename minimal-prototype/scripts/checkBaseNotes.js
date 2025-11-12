// Check baseNote values in doom1.json
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const data = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../public/instruments/dmx/doom1.json'),
  'utf8'
));

console.log('Instruments with non-zero baseNote offsets:\n');

let found = 0;
for (let i = 0; i < data.instruments.length; i++) {
  const inst = data.instruments[i];
  if (inst.voice1.baseNote !== 0 || inst.voice2.baseNote !== 0) {
    console.log(`[${i}] ${inst.name}`);
    console.log(`  Voice 1 baseNote: ${inst.voice1.baseNote}`);
    console.log(`  Voice 2 baseNote: ${inst.voice2.baseNote}`);
    found++;
  }
}

if (found === 0) {
  console.log('No instruments found with non-zero baseNote values.');
}

console.log(`\nTotal: ${found}/${data.instruments.length} instruments`);
