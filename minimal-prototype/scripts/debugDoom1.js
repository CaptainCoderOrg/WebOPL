/**
 * Debug script to examine Doom 1 instrument parsing
 * Compares raw binary data with parsed JSON output
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse a single operator from the binary data
function parseOperator(buffer, offset) {
  const b0 = buffer.readUInt8(offset);
  const b1 = buffer.readUInt8(offset + 1);
  const b2 = buffer.readUInt8(offset + 2);
  const b3 = buffer.readUInt8(offset + 3);
  const b4 = buffer.readUInt8(offset + 4);
  const b5 = buffer.readUInt8(offset + 5);

  return {
    trem: (b0 & 0x80) !== 0,
    vib: (b0 & 0x40) !== 0,
    sus: (b0 & 0x20) !== 0,
    ksr: (b0 & 0x10) !== 0,
    multi: b0 & 0x0F,
    attack: (b1 >> 4) & 0x0F,
    decay: b1 & 0x0F,
    sustain: (b2 >> 4) & 0x0F,
    release: b2 & 0x0F,
    wave: b3 & 0x07,
    ksl: (b4 >> 6) & 0x03,
    out: b5 & 0x3F,
  };
}

// Read the binary file
const binaryPath = path.join(__dirname, '.cache', 'doom1.op2');
const jsonPath = path.join(__dirname, '../public/instruments/dmx/doom1.json');

console.log('🔍 Debugging Doom 1 Instrument Parsing\n');
console.log('Reading files:');
console.log(`  Binary: ${binaryPath}`);
console.log(`  JSON:   ${jsonPath}\n`);

const buffer = fs.readFileSync(binaryPath);
const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Verify header
const header = buffer.toString('ascii', 0, 8);
console.log(`Header: "${header}"`);
if (header !== '#OPL_II#') {
  console.error('ERROR: Invalid header!');
  process.exit(1);
}

// Examine first 5 instruments in detail
console.log('\n' + '='.repeat(80));
console.log('Examining First 5 Instruments (Raw Binary vs Parsed JSON)');
console.log('='.repeat(80));

for (let i = 0; i < 5; i++) {
  const offset = 8 + (i * 36);

  console.log(`\n📌 Instrument ${i}: ${jsonData.instruments[i].name}`);
  console.log('-'.repeat(80));

  // Parse raw bytes
  const flags = buffer.readUInt16LE(offset);
  const finetune = buffer.readUInt8(offset + 2);
  const note = buffer.readUInt8(offset + 3);

  const mod1 = parseOperator(buffer, offset + 4);
  const feedback1 = buffer.readUInt8(offset + 10);
  const car1 = parseOperator(buffer, offset + 11);
  const unused1 = buffer.readUInt8(offset + 17);
  const baseNote1 = buffer.readInt16LE(offset + 18);

  const mod2 = parseOperator(buffer, offset + 20);
  const feedback2 = buffer.readUInt8(offset + 26);
  const car2 = parseOperator(buffer, offset + 27);
  const unused2 = buffer.readUInt8(offset + 33);
  const baseNote2 = buffer.readInt16LE(offset + 34);

  // Show raw hex bytes
  console.log('\nRaw Bytes (36 bytes):');
  let hexLine = '';
  for (let j = 0; j < 36; j++) {
    const byte = buffer.readUInt8(offset + j);
    hexLine += byte.toString(16).padStart(2, '0') + ' ';
    if ((j + 1) % 16 === 0) {
      console.log('  ' + hexLine);
      hexLine = '';
    }
  }
  if (hexLine) console.log('  ' + hexLine);

  console.log('\nParsed Data:');
  console.log(`  Flags: 0x${flags.toString(16).padStart(4, '0')}`);
  console.log(`  Finetune: ${finetune}`);
  console.log(`  Note: ${note}`);

  console.log('\n  VOICE 1:');
  console.log(`    Modulator: ${JSON.stringify(mod1, null, 6)}`);
  console.log(`    Carrier:   ${JSON.stringify(car1, null, 6)}`);
  console.log(`    Feedback byte: 0x${feedback1.toString(16).padStart(2, '0')} -> feedback=${(feedback1 >> 1) & 0x07}, additive=${(feedback1 & 0x01) === 0}`);
  console.log(`    BaseNote: ${baseNote1}`);

  console.log('\n  VOICE 2:');
  console.log(`    Modulator: ${JSON.stringify(mod2, null, 6)}`);
  console.log(`    Carrier:   ${JSON.stringify(car2, null, 6)}`);
  console.log(`    Feedback byte: 0x${feedback2.toString(16).padStart(2, '0')} -> feedback=${(feedback2 >> 1) & 0x07}, additive=${(feedback2 & 0x01) === 0}`);
  console.log(`    BaseNote: ${baseNote2}`);

  console.log('\nJSON Output:');
  console.log(JSON.stringify(jsonData.instruments[i], null, 2));
}

// Check if any instruments have non-zero voice2
console.log('\n' + '='.repeat(80));
console.log('Checking Voice 2 Usage');
console.log('='.repeat(80));

let voice2Count = 0;
for (let i = 0; i < 128; i++) {
  const offset = 8 + (i * 36);
  const mod2 = parseOperator(buffer, offset + 20);
  const car2 = parseOperator(buffer, offset + 27);
  const feedback2 = buffer.readUInt8(offset + 26);

  // Check if voice2 has any non-zero values
  const hasVoice2 = mod2.attack !== 0 || mod2.decay !== 0 || mod2.sustain !== 0 || mod2.release !== 0 ||
                    car2.attack !== 0 || car2.decay !== 0 || car2.sustain !== 0 || car2.release !== 0 ||
                    feedback2 !== 0;

  if (hasVoice2) {
    voice2Count++;
    if (voice2Count <= 5) {
      console.log(`Instrument ${i} (${jsonData.instruments[i].name}): Voice 2 active`);
    }
  }
}

console.log(`\nTotal instruments with Voice 2 data: ${voice2Count}/128`);

console.log('\n' + '='.repeat(80));
console.log('Analysis Complete');
console.log('='.repeat(80));
