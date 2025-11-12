/**
 * Comprehensive Pipeline Analysis
 * Traces data from .op2 binary → JSON → TypeScript → OPL registers
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('='.repeat(80));
console.log('COMPREHENSIVE PIPELINE ANALYSIS');
console.log('='.repeat(80));

// Read binary file
const binaryPath = path.join(__dirname, '.cache', 'doom1.op2');
const buffer = fs.readFileSync(binaryPath);

// Read generated JSON
const jsonPath = path.join(__dirname, '../public/instruments/dmx/doom1.json');
const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log('\n' + '='.repeat(80));
console.log('STEP 1: OP2 Binary File Format');
console.log('='.repeat(80));

console.log('\nOP2 File Structure (from libADLMIDI):');
console.log('  Header: 8 bytes "#OPL_II#"');
console.log('  Instrument data: 175 instruments × 36 bytes each');
console.log('  Name table: 175 names × 32 bytes each');
console.log('');
console.log('Each instrument (36 bytes):');
console.log('  Offset 0-1:  Flags (uint16 LE)');
console.log('  Offset 2:    Fine tune (uint8)');
console.log('  Offset 3:    Note (uint8)');
console.log('  Offset 4-9:  Modulator operator (6 bytes)');
console.log('  Offset 10:   Feedback/Connection byte');
console.log('  Offset 11-16: Carrier operator (6 bytes)');
console.log('  Offset 17:   Unused');
console.log('  Offset 18-19: Base note offset voice 1 (int16 LE)');
console.log('  Offset 20-25: Modulator operator voice 2 (6 bytes)');
console.log('  Offset 26:   Feedback/Connection byte voice 2');
console.log('  Offset 27-32: Carrier operator voice 2 (6 bytes)');
console.log('  Offset 33:   Unused');
console.log('  Offset 34-35: Base note offset voice 2 (int16 LE)');
console.log('');
console.log('Each operator (6 bytes):');
console.log('  Byte 0: Characteristics (AVEKM)');
console.log('    Bit 7: Tremolo (AM)');
console.log('    Bit 6: Vibrato');
console.log('    Bit 5: Sustain flag (EG Type)');
console.log('    Bit 4: Key Scale Rate');
console.log('    Bits 0-3: Frequency Multiplier');
console.log('  Byte 1: Scale/Level (KSLTL)');
console.log('    Bits 6-7: Key Scale Level');
console.log('    Bits 0-5: Total Level (output level)');
console.log('  Byte 2: Attack/Decay (AD)');
console.log('    Bits 4-7: Attack Rate');
console.log('    Bits 0-3: Decay Rate');
console.log('  Byte 3: Sustain/Release (SR)');
console.log('    Bits 4-7: Sustain Level');
console.log('    Bits 0-3: Release Rate');
console.log('  Byte 4: Waveform');
console.log('    Bits 0-2: Waveform select');
console.log('  Byte 5: (varies by implementation, often unused)');

console.log('\n' + '='.repeat(80));
console.log('STEP 2: Example Instrument - Instrument 30 (Distortion Guitar)');
console.log('='.repeat(80));

const inst30Offset = 8 + (30 * 36);
console.log('\nRaw bytes (36 bytes):');
for (let i = 0; i < 36; i += 8) {
  const bytes = [];
  for (let j = 0; j < 8 && i + j < 36; j++) {
    bytes.push(buffer.readUInt8(inst30Offset + i + j).toString(16).padStart(2, '0'));
  }
  console.log(`  ${i.toString().padStart(2)}-${(i+7).toString().padStart(2)}: ${bytes.join(' ')}`);
}

console.log('\nManual parse of Voice 1:');
const flags = buffer.readUInt16LE(inst30Offset);
const finetune = buffer.readUInt8(inst30Offset + 2);
const note = buffer.readUInt8(inst30Offset + 3);

console.log(`  Flags: 0x${flags.toString(16)} (${flags})`);
console.log(`  Finetune: ${finetune}`);
console.log(`  Note: ${note}`);

// Voice 1 modulator (bytes 4-9)
console.log('\n  Modulator (bytes 4-9):');
for (let i = 0; i < 6; i++) {
  const b = buffer.readUInt8(inst30Offset + 4 + i);
  console.log(`    Byte ${i}: 0x${b.toString(16).padStart(2, '0')} (${b})`);
}

const mod_avekm = buffer.readUInt8(inst30Offset + 4);
const mod_ksltl = buffer.readUInt8(inst30Offset + 5);
const mod_ad = buffer.readUInt8(inst30Offset + 6);
const mod_sr = buffer.readUInt8(inst30Offset + 7);
const mod_ws = buffer.readUInt8(inst30Offset + 8);

console.log(`\n    Parsed modulator:`);
console.log(`      trem=${(mod_avekm&0x80)?1:0}, vib=${(mod_avekm&0x40)?1:0}, sus=${(mod_avekm&0x20)?1:0}, ksr=${(mod_avekm&0x10)?1:0}, multi=${mod_avekm&0x0F}`);
console.log(`      ksl=${mod_ksltl>>6}, out=${mod_ksltl&0x3F}`);
console.log(`      attack=${mod_ad>>4}, decay=${mod_ad&0x0F}`);
console.log(`      sustain=${mod_sr>>4}, release=${mod_sr&0x0F}`);
console.log(`      wave=${mod_ws&0x07}`);

const feedback1 = buffer.readUInt8(inst30Offset + 10);
console.log(`\n  Feedback byte (offset 10): 0x${feedback1.toString(16).padStart(2, '0')} (${feedback1})`);
console.log(`    Feedback: ${(feedback1>>1)&0x07}`);
console.log(`    Connection: ${feedback1&0x01} (${(feedback1&0x01) ? 'Additive' : 'FM'})`);

// Voice 1 carrier (bytes 11-16)
console.log('\n  Carrier (bytes 11-16):');
for (let i = 0; i < 6; i++) {
  const b = buffer.readUInt8(inst30Offset + 11 + i);
  console.log(`    Byte ${i}: 0x${b.toString(16).padStart(2, '0')} (${b})`);
}

const car_avekm = buffer.readUInt8(inst30Offset + 11);
const car_ksltl = buffer.readUInt8(inst30Offset + 12);
const car_ad = buffer.readUInt8(inst30Offset + 13);
const car_sr = buffer.readUInt8(inst30Offset + 14);
const car_ws = buffer.readUInt8(inst30Offset + 15);

console.log(`\n    Parsed carrier:`);
console.log(`      trem=${(car_avekm&0x80)?1:0}, vib=${(car_avekm&0x40)?1:0}, sus=${(car_avekm&0x20)?1:0}, ksr=${(car_avekm&0x10)?1:0}, multi=${car_avekm&0x0F}`);
console.log(`      ksl=${car_ksltl>>6}, out=${car_ksltl&0x3F}`);
console.log(`      attack=${car_ad>>4}, decay=${car_ad&0x0F}`);
console.log(`      sustain=${car_sr>>4}, release=${car_sr&0x0F}`);
console.log(`      wave=${car_ws&0x07}`);

const baseNote1 = buffer.readInt16LE(inst30Offset + 18);
console.log(`\n  Base note offset: ${baseNote1}`);

console.log('\n' + '='.repeat(80));
console.log('STEP 3: Our Parser Output (JSON)');
console.log('='.repeat(80));

const inst30Json = jsonData.instruments[30];
console.log('\nInstrument 30 from JSON:');
console.log(JSON.stringify(inst30Json, null, 2));

console.log('\n' + '='.repeat(80));
console.log('STEP 4: Comparison - Binary vs JSON');
console.log('='.repeat(80));

console.log('\nModulator:');
console.log(`  trem:    binary=${(mod_avekm&0x80)?true:false}, json=${inst30Json.voice1.mod.trem}`);
console.log(`  vib:     binary=${(mod_avekm&0x40)?true:false}, json=${inst30Json.voice1.mod.vib}`);
console.log(`  sus:     binary=${(mod_avekm&0x20)?true:false}, json=${inst30Json.voice1.mod.sus}`);
console.log(`  ksr:     binary=${(mod_avekm&0x10)?true:false}, json=${inst30Json.voice1.mod.ksr}`);
console.log(`  multi:   binary=${mod_avekm&0x0F}, json=${inst30Json.voice1.mod.multi}`);
console.log(`  ksl:     binary=${mod_ksltl>>6}, json=${inst30Json.voice1.mod.ksl}`);
console.log(`  out:     binary=${mod_ksltl&0x3F}, json=${inst30Json.voice1.mod.out}`);
console.log(`  attack:  binary=${mod_ad>>4}, json=${inst30Json.voice1.mod.attack}`);
console.log(`  decay:   binary=${mod_ad&0x0F}, json=${inst30Json.voice1.mod.decay}`);
console.log(`  sustain: binary=${mod_sr>>4}, json=${inst30Json.voice1.mod.sustain}`);
console.log(`  release: binary=${mod_sr&0x0F}, json=${inst30Json.voice1.mod.release}`);
console.log(`  wave:    binary=${mod_ws&0x07}, json=${inst30Json.voice1.mod.wave}`);

console.log('\nCarrier:');
console.log(`  trem:    binary=${(car_avekm&0x80)?true:false}, json=${inst30Json.voice1.car.trem}`);
console.log(`  vib:     binary=${(car_avekm&0x40)?true:false}, json=${inst30Json.voice1.car.vib}`);
console.log(`  sus:     binary=${(car_avekm&0x20)?true:false}, json=${inst30Json.voice1.car.sus}`);
console.log(`  ksr:     binary=${(car_avekm&0x10)?true:false}, json=${inst30Json.voice1.car.ksr}`);
console.log(`  multi:   binary=${car_avekm&0x0F}, json=${inst30Json.voice1.car.multi}`);
console.log(`  ksl:     binary=${car_ksltl>>6}, json=${inst30Json.voice1.car.ksl}`);
console.log(`  out:     binary=${car_ksltl&0x3F}, json=${inst30Json.voice1.car.out}`);
console.log(`  attack:  binary=${car_ad>>4}, json=${inst30Json.voice1.car.attack}`);
console.log(`  decay:   binary=${car_ad&0x0F}, json=${inst30Json.voice1.car.decay}`);
console.log(`  sustain: binary=${car_sr>>4}, json=${inst30Json.voice1.car.sustain}`);
console.log(`  release: binary=${car_sr&0x0F}, json=${inst30Json.voice1.car.release}`);
console.log(`  wave:    binary=${car_ws&0x07}, json=${inst30Json.voice1.car.wave}`);

console.log('\nFeedback/Connection:');
console.log(`  feedback: binary=${(feedback1>>1)&0x07}, json=${inst30Json.voice1.feedback}`);
console.log(`  additive: binary=${(feedback1&0x01)!==0}, json=${inst30Json.voice1.additive}`);

console.log('\n' + '='.repeat(80));
console.log('STEP 5: What SimpleSynth Should Write to OPL Registers');
console.log('='.repeat(80));

console.log('\nFor OPL channel X, modulator operator offset M, carrier operator offset C:');
console.log('\nModulator:');
console.log(`  Reg 0x20+M: ${((inst30Json.voice1.mod.trem?0x80:0) | (inst30Json.voice1.mod.vib?0x40:0) | (inst30Json.voice1.mod.sus?0x20:0) | (inst30Json.voice1.mod.ksr?0x10:0) | inst30Json.voice1.mod.multi).toString(16).padStart(2,'0')}`);
console.log(`  Reg 0x40+M: ${((inst30Json.voice1.mod.ksl<<6) | inst30Json.voice1.mod.out).toString(16).padStart(2,'0')}`);
console.log(`  Reg 0x60+M: ${((inst30Json.voice1.mod.attack<<4) | inst30Json.voice1.mod.decay).toString(16).padStart(2,'0')}`);
console.log(`  Reg 0x80+M: ${((inst30Json.voice1.mod.sustain<<4) | inst30Json.voice1.mod.release).toString(16).padStart(2,'0')}`);
console.log(`  Reg 0xE0+M: ${(inst30Json.voice1.mod.wave&0x07).toString(16).padStart(2,'0')}`);

console.log('\nCarrier:');
console.log(`  Reg 0x20+C: ${((inst30Json.voice1.car.trem?0x80:0) | (inst30Json.voice1.car.vib?0x40:0) | (inst30Json.voice1.car.sus?0x20:0) | (inst30Json.voice1.car.ksr?0x10:0) | inst30Json.voice1.car.multi).toString(16).padStart(2,'0')}`);
console.log(`  Reg 0x40+C: ${((inst30Json.voice1.car.ksl<<6) | inst30Json.voice1.car.out).toString(16).padStart(2,'0')}`);
console.log(`  Reg 0x60+C: ${((inst30Json.voice1.car.attack<<4) | inst30Json.voice1.car.decay).toString(16).padStart(2,'0')}`);
console.log(`  Reg 0x80+C: ${((inst30Json.voice1.car.sustain<<4) | inst30Json.voice1.car.release).toString(16).padStart(2,'0')}`);
console.log(`  Reg 0xE0+C: ${(inst30Json.voice1.car.wave&0x07).toString(16).padStart(2,'0')}`);

console.log('\nFeedback/Connection:');
const connectionBit = inst30Json.voice1.additive ? 1 : 0;
console.log(`  Reg 0xC0+X: ${((inst30Json.voice1.feedback<<1) | connectionBit | 0x30).toString(16).padStart(2,'0')}`);

console.log('\n' + '='.repeat(80));
console.log('Analysis Complete');
console.log('='.repeat(80));
