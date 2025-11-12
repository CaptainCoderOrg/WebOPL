/**
 * Find what data from OP2 files we're not using
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('='.repeat(80));
console.log('FINDING MISSING/UNUSED DATA IN OP2 PIPELINE');
console.log('='.repeat(80));

// Read the binary and JSON
const binaryPath = path.join(__dirname, '.cache', 'doom1.op2');
const buffer = fs.readFileSync(binaryPath);

const jsonPath = path.join(__dirname, '../public/instruments/dmx/doom1.json');
const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log('\n1. CHECKING INSTRUMENT FIELDS\n');
console.log('Fields read from OP2:');
console.log('  - Flags (uint16)');
console.log('  - Finetune (uint8)');
console.log('  - Note (uint8)');
console.log('  - Voice 1 data');
console.log('  - Voice 2 data');

console.log('\nFields stored in JSON:');
const inst0 = jsonData.instruments[0];
console.log('  - id');
console.log('  - name');
console.log('  - note');
console.log('  - voice1');
console.log('  - voice2');

console.log('\n❌ MISSING: Flags field is not stored in JSON!');
console.log('❌ MISSING: Finetune field is not stored in JSON!');

console.log('\n2. CHECKING FLAGS FIELD USAGE\n');

// Check how many instruments have non-zero flags
let nonZeroFlags = 0;
for (let i = 0; i < 128; i++) {
  const offset = 8 + (i * 36);
  const flags = buffer.readUInt16LE(offset);
  if (flags !== 0) {
    nonZeroFlags++;
    if (nonZeroFlags <= 5) {
      console.log(`Instrument ${i}: flags=0x${flags.toString(16).padStart(4, '0')} (${flags})`);
    }
  }
}
console.log(`Total instruments with non-zero flags: ${nonZeroFlags}/128`);

if (nonZeroFlags > 0) {
  console.log('\n⚠️  FLAGS FIELD MAY BE IMPORTANT! According to OP2 spec:');
  console.log('   Bit 0: Fixed pitch (ignore note-on pitch)');
  console.log('   Bit 2: Double voice (use voice 2 for dual-voice)');
}

console.log('\n3. CHECKING FINETUNE FIELD\n');

// Check finetune values
let nonZeroFinetune = 0;
let finetuneValues = new Set();
for (let i = 0; i < 128; i++) {
  const offset = 8 + (i * 36);
  const finetune = buffer.readUInt8(offset + 2);
  finetuneValues.add(finetune);
  if (finetune !== 0 && finetune !== 128) {
    nonZeroFinetune++;
    if (nonZeroFinetune <= 5) {
      console.log(`Instrument ${i}: finetune=${finetune}`);
    }
  }
}

console.log(`\nUnique finetune values: ${Array.from(finetuneValues).sort((a,b)=>a-b).join(', ')}`);
console.log(`Instruments with non-standard finetune: ${nonZeroFinetune}/128`);

if (nonZeroFinetune > 0 || finetuneValues.size > 1) {
  console.log('\n⚠️  FINETUNE FIELD IS USED! This affects pitch/frequency.');
  console.log('   Finetune adjusts the base frequency of the instrument.');
  console.log('   Common values: 0=down, 128=normal, 255=up');
}

console.log('\n4. CHECKING NOTE FIELD\n');

// Check note values
let nonZeroNote = 0;
for (let i = 0; i < 128; i++) {
  const offset = 8 + (i * 36);
  const note = buffer.readUInt8(offset + 3);
  if (note !== 0) {
    nonZeroNote++;
    if (nonZeroNote <= 5) {
      const noteName = jsonData.instruments[i].name;
      console.log(`Instrument ${i} (${noteName}): note=${note}`);
    }
  }
}

console.log(`\nInstruments with non-zero note: ${nonZeroNote}/128`);

if (nonZeroNote > 0) {
  console.log('\n⚠️  NOTE FIELD IS USED! This is for fixed-pitch instruments.');
  console.log('   When flags bit 0 is set, this note is always used.');
  console.log('   Common for percussion instruments.');
}

console.log('\n5. CHECKING VOICE 2 USAGE\n');

let activeVoice2 = 0;
for (let i = 0; i < 128; i++) {
  const inst = jsonData.instruments[i];

  // Check if voice2 has any non-zero operator data
  const hasVoice2 =
    inst.voice2.mod.attack !== 0 ||
    inst.voice2.mod.decay !== 0 ||
    inst.voice2.mod.sustain !== 0 ||
    inst.voice2.mod.release !== 0 ||
    inst.voice2.car.attack !== 0 ||
    inst.voice2.car.decay !== 0 ||
    inst.voice2.car.sustain !== 0 ||
    inst.voice2.car.release !== 0 ||
    inst.voice2.feedback !== 0;

  if (hasVoice2) {
    activeVoice2++;
    if (activeVoice2 <= 3) {
      console.log(`Instrument ${i} (${inst.name}): has voice 2 data`);
    }
  }
}

console.log(`\nInstruments with voice 2 data: ${activeVoice2}/128`);

if (activeVoice2 > 0) {
  console.log('\n⚠️  DUAL-VOICE INSTRUMENTS ARE PRESENT!');
  console.log('   These should be played with both voices simultaneously.');
  console.log('   Need to check if SimpleSynth handles dual-voice mode.');
}

console.log('\n' + '='.repeat(80));
console.log('SUMMARY OF MISSING/UNUSED DATA');
console.log('='.repeat(80));

console.log('\n❌ CRITICAL MISSING:');
console.log('   1. Flags field - determines fixed pitch and dual-voice mode');
console.log('   2. Finetune field - affects pitch accuracy');

console.log('\n✓ POTENTIALLY OK:');
console.log('   1. Note field - stored in JSON, may be used somewhere');
console.log('   2. Voice 2 data - stored in JSON, but may not be utilized');

console.log('\n📋 RECOMMENDATIONS:');
console.log('   1. Add flags field to JSON and use in SimpleSynth');
console.log('   2. Add finetune field to JSON and apply to frequency calculation');
console.log('   3. Verify dual-voice instruments are being used (check flags bit 2)');
console.log('   4. Verify fixed-pitch mode is respected (check flags bit 0)');

console.log('\n' + '='.repeat(80));
