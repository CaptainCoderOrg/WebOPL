/**
 * Deep analysis of Doom instrument parsing
 * Compare our parsing with expected values
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the binary .op2 file
const binaryPath = path.join(__dirname, '.cache', 'doom1.op2');
const buffer = fs.readFileSync(binaryPath);

// Read our generated JSON
const jsonPath = path.join(__dirname, '../public/instruments/dmx/doom1.json');
const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log('Deep Analysis of Doom 1 Instrument Parsing\n');
console.log('='.repeat(80));

// Analyze a few key instruments in detail
const instrumentsToCheck = [
  0,   // Acoustic Grand Piano
  30,  // Overdrive Guitar (important for Doom)
  29,  // Distortion Guitar
  34   // Electric Bass (finger)
];

for (const idx of instrumentsToCheck) {
  const offset = 8 + (idx * 36);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`Instrument ${idx}: ${jsonData.instruments[idx].name}`);
  console.log('='.repeat(80));

  // Read raw bytes
  console.log('\nRaw Binary Data (36 bytes):');
  const rawBytes = [];
  for (let i = 0; i < 36; i++) {
    rawBytes.push(buffer.readUInt8(offset + i));
  }

  // Display in hex
  for (let i = 0; i < 36; i += 16) {
    const hex = rawBytes.slice(i, i + 16).map(b => b.toString(16).padStart(2, '0')).join(' ');
    console.log(`  ${i.toString().padStart(2)}: ${hex}`);
  }

  // Parse manually
  console.log('\nManual Parse:');
  const flags = buffer.readUInt16LE(offset);
  const finetune = buffer.readUInt8(offset + 2);
  const note = buffer.readUInt8(offset + 3);

  console.log(`  Flags: 0x${flags.toString(16).padStart(4, '0')} (${flags})`);
  console.log(`  Finetune: ${finetune} (0x${finetune.toString(16)})`);
  console.log(`  Note: ${note}`);

  console.log('\n  VOICE 1 (bytes 4-19):');

  // Modulator operator (bytes 4-9)
  const mod1_b0 = buffer.readUInt8(offset + 4);   // AVEKM
  const mod1_b1 = buffer.readUInt8(offset + 5);   // KSLTL
  const mod1_b2 = buffer.readUInt8(offset + 6);   // AD
  const mod1_b3 = buffer.readUInt8(offset + 7);   // SR
  const mod1_b4 = buffer.readUInt8(offset + 8);   // Wave
  const mod1_b5 = buffer.readUInt8(offset + 9);   // (unused in some formats)

  console.log(`    Modulator bytes: ${mod1_b0.toString(16).padStart(2,'0')} ${mod1_b1.toString(16).padStart(2,'0')} ${mod1_b2.toString(16).padStart(2,'0')} ${mod1_b3.toString(16).padStart(2,'0')} ${mod1_b4.toString(16).padStart(2,'0')} ${mod1_b5.toString(16).padStart(2,'0')}`);
  console.log(`      AVEKM (0x${mod1_b0.toString(16)}): trem=${(mod1_b0&0x80)?1:0} vib=${(mod1_b0&0x40)?1:0} sus=${(mod1_b0&0x20)?1:0} ksr=${(mod1_b0&0x10)?1:0} multi=${mod1_b0&0x0F}`);
  console.log(`      KSLTL (0x${mod1_b1.toString(16)}): ksl=${mod1_b1>>6} out=${mod1_b1&0x3F}`);
  console.log(`      AD (0x${mod1_b2.toString(16)}): attack=${mod1_b2>>4} decay=${mod1_b2&0x0F}`);
  console.log(`      SR (0x${mod1_b3.toString(16)}): sustain=${mod1_b3>>4} release=${mod1_b3&0x0F}`);
  console.log(`      Wave (0x${mod1_b4.toString(16)}): ${mod1_b4&0x07}`);

  const feedback1 = buffer.readUInt8(offset + 10);
  console.log(`    Feedback byte (0x${feedback1.toString(16)}): feedback=${feedback1>>1} connection=${feedback1&0x01}`);

  // Carrier operator (bytes 11-16)
  const car1_b0 = buffer.readUInt8(offset + 11);
  const car1_b1 = buffer.readUInt8(offset + 12);
  const car1_b2 = buffer.readUInt8(offset + 13);
  const car1_b3 = buffer.readUInt8(offset + 14);
  const car1_b4 = buffer.readUInt8(offset + 15);
  const car1_b5 = buffer.readUInt8(offset + 16);

  console.log(`    Carrier bytes: ${car1_b0.toString(16).padStart(2,'0')} ${car1_b1.toString(16).padStart(2,'0')} ${car1_b2.toString(16).padStart(2,'0')} ${car1_b3.toString(16).padStart(2,'0')} ${car1_b4.toString(16).padStart(2,'0')} ${car1_b5.toString(16).padStart(2,'0')}`);
  console.log(`      AVEKM (0x${car1_b0.toString(16)}): trem=${(car1_b0&0x80)?1:0} vib=${(car1_b0&0x40)?1:0} sus=${(car1_b0&0x20)?1:0} ksr=${(car1_b0&0x10)?1:0} multi=${car1_b0&0x0F}`);
  console.log(`      KSLTL (0x${car1_b1.toString(16)}): ksl=${car1_b1>>6} out=${car1_b1&0x3F}`);
  console.log(`      AD (0x${car1_b2.toString(16)}): attack=${car1_b2>>4} decay=${car1_b2&0x0F}`);
  console.log(`      SR (0x${car1_b3.toString(16)}): sustain=${car1_b3>>4} release=${car1_b3&0x0F}`);
  console.log(`      Wave (0x${car1_b4.toString(16)}): ${car1_b4&0x07}`);

  const unused1 = buffer.readUInt8(offset + 17);
  const baseNote1 = buffer.readInt16LE(offset + 18);
  console.log(`    Unused: 0x${unused1.toString(16)}`);
  console.log(`    BaseNote: ${baseNote1}`);

  console.log('\n  JSON Output (voice1):');
  console.log(`    Modulator: ${JSON.stringify(jsonData.instruments[idx].voice1.mod)}`);
  console.log(`    Carrier: ${JSON.stringify(jsonData.instruments[idx].voice1.car)}`);
  console.log(`    Feedback: ${jsonData.instruments[idx].voice1.feedback}`);
  console.log(`    Additive: ${jsonData.instruments[idx].voice1.additive}`);
  console.log(`    BaseNote: ${jsonData.instruments[idx].voice1.baseNote}`);

  // Check for discrepancies
  console.log('\n  Verification:');
  const json = jsonData.instruments[idx].voice1;

  const checks = [
    ['Mod attack', (mod1_b2>>4)&0x0F, json.mod.attack],
    ['Mod decay', mod1_b2&0x0F, json.mod.decay],
    ['Mod sustain', (mod1_b3>>4)&0x0F, json.mod.sustain],
    ['Mod release', mod1_b3&0x0F, json.mod.release],
    ['Mod multi', mod1_b0&0x0F, json.mod.multi],
    ['Mod wave', mod1_b4&0x07, json.mod.wave],
    ['Mod ksl', mod1_b1>>6, json.mod.ksl],
    ['Mod out', mod1_b1&0x3F, json.mod.out],
    ['Car attack', (car1_b2>>4)&0x0F, json.car.attack],
    ['Car decay', car1_b2&0x0F, json.car.decay],
    ['Car sustain', (car1_b3>>4)&0x0F, json.car.sustain],
    ['Car release', car1_b3&0x0F, json.car.release],
    ['Car multi', car1_b0&0x0F, json.car.multi],
    ['Car wave', car1_b4&0x07, json.car.wave],
    ['Car ksl', car1_b1>>6, json.car.ksl],
    ['Car out', car1_b1&0x3F, json.car.out],
    ['Feedback', (feedback1>>1)&0x07, json.feedback],
    ['Connection', feedback1&0x01, json.additive ? 1 : 0],
  ];

  let allMatch = true;
  for (const [name, expected, actual] of checks) {
    const match = expected === actual ? '✓' : '✗';
    if (expected !== actual) {
      console.log(`    ${match} ${name}: expected ${expected}, got ${actual}`);
      allMatch = false;
    }
  }
  if (allMatch) {
    console.log('    ✓ All values match!');
  }
}

console.log('\n' + '='.repeat(80));
console.log('Analysis complete');
console.log('='.repeat(80));
