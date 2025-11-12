// Check flags field in doom1.json
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const data = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../public/instruments/dmx/doom1.json'),
  'utf8'
));

console.log('Checking flags field in doom1.json:\n');

let withBit2Set = 0;
for (let i = 0; i < data.instruments.length; i++) {
  const inst = data.instruments[i];
  const bit2 = (inst.flags & 0x04) !== 0;

  if (i < 10 || bit2) {
    console.log(`[${i}] ${inst.name}`);
    console.log(`  flags: 0x${inst.flags.toString(16).padStart(4, '0')} (${inst.flags})`);
    console.log(`  bit 2 (double-voice flag): ${bit2}`);
    console.log(`  isDualVoice (computed): ${inst.isDualVoice}`);
    console.log('');
  }

  if (bit2) withBit2Set++;
}

console.log(`\nTotal instruments with bit 2 set: ${withBit2Set}/${data.instruments.length}`);
