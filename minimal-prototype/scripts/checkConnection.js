/**
 * Check the actual connection bit values in Doom 1 instruments
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read doom1.json
const doom1Path = path.join(__dirname, '../public/instruments/dmx/doom1.json');
const doom1Data = JSON.parse(fs.readFileSync(doom1Path, 'utf8'));

console.log('Checking connection values in Doom 1 instruments:\n');

// Check first 20 instruments
for (let i = 0; i < 20; i++) {
  const inst = doom1Data.instruments[i];
  const additive = inst.voice1.additive;
  const feedbackByte = inst.voice1.feedback;

  console.log(`${i.toString().padStart(3)}: ${inst.name.padEnd(30)} | voice1.additive=${additive} feedback=${feedbackByte}`);
}

console.log('\n' + '='.repeat(80));
console.log('Reading raw binary to verify feedback byte interpretation:');
console.log('='.repeat(80) + '\n');

const binaryPath = path.join(__dirname, '.cache', 'doom1.op2');
const buffer = fs.readFileSync(binaryPath);

for (let i = 0; i < 5; i++) {
  const offset = 8 + (i * 36);

  // Voice 1 feedback byte is at offset + 10
  const feedbackByte1 = buffer.readUInt8(offset + 10);

  // According to DMX format:
  // Bits 1-3: Feedback (0-7)
  // Bit 0: Connection (0=FM/serial, 1=Additive/parallel)
  const connection1 = feedbackByte1 & 0x01;
  const feedback1 = (feedbackByte1 >> 1) & 0x07;

  console.log(`Instrument ${i} (${doom1Data.instruments[i].name}):`);
  console.log(`  Raw feedback byte: 0x${feedbackByte1.toString(16).padStart(2, '0')} (${feedbackByte1})`);
  console.log(`  Bit 0 (connection): ${connection1} (${connection1 === 0 ? 'FM/serial' : 'Additive/parallel'})`);
  console.log(`  Bits 1-3 (feedback): ${feedback1}`);
  console.log(`  JSON says additive: ${doom1Data.instruments[i].voice1.additive}`);
  console.log(`  JSON says feedback: ${doom1Data.instruments[i].voice1.feedback}`);
  console.log();
}

console.log('='.repeat(80));
console.log('OPL3 Register 0xC0-0xC8 format:');
console.log('='.repeat(80));
console.log('Bit 0: Connection (CNT)');
console.log('  0 = FM synthesis (modulator -> carrier)');
console.log('  1 = Additive synthesis (modulator + carrier)');
console.log('Bits 1-3: Feedback modulation (FB)');
console.log('  0-7 = Feedback level');
console.log('Bits 4-5: Output to channels (CHD, CHC, CHB, CHA)');
console.log('  We use 0x30 = both channels for stereo');
console.log();
console.log('So if additive=true in JSON, we should write bit 0 = 1');
console.log('And if additive=false in JSON, we should write bit 0 = 0');
