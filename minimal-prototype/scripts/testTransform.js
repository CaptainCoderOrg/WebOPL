/**
 * Test script to verify catalogLoader transformation bug
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simulate the transformVoice function from catalogLoader.ts
function transformVoice(json) {
  return {
    modulator: {
      attackRate: json.mod.attack,
      decayRate: json.mod.decay,
      sustainLevel: json.mod.sustain,
      releaseRate: json.mod.release,
      frequencyMultiplier: json.mod.multi,
      waveform: json.mod.wave,
      outputLevel: json.mod.out,
      keyScaleLevel: json.mod.ksl,
      amplitudeModulation: json.mod.trem,
      vibrato: json.mod.vib,
      envelopeType: json.mod.sus,
      keyScaleRate: json.mod.ksr
    },
    carrier: {
      attackRate: json.car.attack,
      decayRate: json.car.decay,
      sustainLevel: json.car.sustain,
      releaseRate: json.car.release,
      frequencyMultiplier: json.car.multi,
      waveform: json.car.wave,
      outputLevel: json.car.out,
      keyScaleLevel: json.car.ksl,
      amplitudeModulation: json.car.trem,
      vibrato: json.car.vib,
      envelopeType: json.car.sus,
      keyScaleRate: json.car.ksr
    },
    feedback: json.feedback,
    connection: json.additive ? 'additive' : 'fm', // FIXED: now returns string
    noteOffset: json.baseNote || 0
  };
}

// Simulate the transformInstrument function
function transformInstrument(json) {
  const voice1 = transformVoice(json.voice1);

  return {
    id: json.id,
    name: json.name,
    modulator: voice1.modulator,
    carrier: voice1.carrier,
    feedback: voice1.feedback,
    connection: voice1.connection, // FIXED: just pass through, already transformed
    noteOffset: voice1.noteOffset,
    voice1: voice1,
    voice2: transformVoice(json.voice2),
    isDualVoice: json.isDualVoice !== undefined ? json.isDualVoice : false,
    isCustom: json.isCustom !== undefined ? json.isCustom : false
  };
}

// Load doom1.json
const doom1Path = path.join(__dirname, '../public/instruments/dmx/doom1.json');
const doom1Data = JSON.parse(fs.readFileSync(doom1Path, 'utf8'));

// Transform first instrument
console.log('Original JSON (Instrument 0):');
console.log(JSON.stringify(doom1Data.instruments[0], null, 2));

console.log('\n' + '='.repeat(80));
console.log('After transformInstrument() (what SimpleSynth receives):');
const transformed = transformInstrument(doom1Data.instruments[0]);
console.log(JSON.stringify(transformed, null, 2));

console.log('\n' + '='.repeat(80));
console.log('BUG ANALYSIS:');
console.log('='.repeat(80));
console.log('\nOriginal JSON voice1.additive:', doom1Data.instruments[0].voice1.additive);
console.log('After transformVoice, voice1.connection:', transformed.voice1.connection);
console.log('  Expected: "additive" or "fm" (STRING)');
console.log('  Got:', typeof transformed.voice1.connection, '-', transformed.voice1.connection);

console.log('\nTop-level connection field:', transformed.connection);
console.log('  This is derived from line 31: voice1.connection === 1 ? "additive" : "fm"');
console.log('  But voice1.connection is:', transformed.voice1.connection);
console.log('  So the === 1 check WORKS, producing:', transformed.connection);

console.log('\nHOWEVER, in SimpleSynth.ts line 316:');
console.log('  const feedbackByte = (patch.feedback << 1) | (patch.connection === "additive" ? 1 : 0);');
console.log('  This checks the top-level patch.connection, which IS correct.');

console.log('\nBut in SimpleSynth.ts line 364 for dual-voice:');
console.log('  const feedbackByte = (voice.feedback << 1) | (voice.connection === "additive" ? 1 : 0);');
console.log('  This checks voice.connection, which is a NUMBER!');
console.log('  voice.connection === "additive" will ALWAYS be false!');

console.log('\n' + '='.repeat(80));
console.log('CONCLUSION:');
console.log('='.repeat(80));
console.log('The bug is in catalogLoader.ts line 49:');
console.log('  connection: json.additive ? 1 : 0,');
console.log('Should be:');
console.log('  connection: json.additive ? "additive" : "fm",');
