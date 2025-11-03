/**
 * DMXOPL3 GENMIDI.op2 to JSON Converter
 *
 * Converts DMXOPL3 GENMIDI.op2 binary format to our JSON format.
 *
 * Format specification: https://formats.kaitai.io/genmidi_op2/
 * Source: https://github.com/sneakernets/DMXOPL (MIT License)
 */

import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DMXOPL_URL = 'https://raw.githubusercontent.com/sneakernets/DMXOPL/DMXOPL3/GENMIDI.op2';
const CACHE_PATH = path.join(__dirname, 'GENMIDI.op2');
const OUTPUT_PATH = path.join(__dirname, '../public/instruments/GENMIDI.json');

/**
 * Parse a single operator from the binary data
 */
function parseOperator(buffer, offset) {
  const b0 = buffer.readUInt8(offset);     // tremolo/vibrato/sustain/KSR/multi
  const b1 = buffer.readUInt8(offset + 1); // attack/decay
  const b2 = buffer.readUInt8(offset + 2); // sustain/release
  const b3 = buffer.readUInt8(offset + 3); // waveform
  const b4 = buffer.readUInt8(offset + 4); // key scale level
  const b5 = buffer.readUInt8(offset + 5); // output level

  return {
    trem: (b0 & 0x80) !== 0,          // Bit 7: Tremolo (AM)
    vib: (b0 & 0x40) !== 0,           // Bit 6: Vibrato
    sus: (b0 & 0x20) !== 0,           // Bit 5: Sustaining sound
    ksr: (b0 & 0x10) !== 0,           // Bit 4: Keyboard scaling rate
    multi: b0 & 0x0F,                 // Bits 0-3: Frequency multiplier

    attack: (b1 >> 4) & 0x0F,         // Bits 4-7: Attack rate
    decay: b1 & 0x0F,                 // Bits 0-3: Decay rate

    sustain: (b2 >> 4) & 0x0F,        // Bits 4-7: Sustain level
    release: b2 & 0x0F,               // Bits 0-3: Release rate

    wave: b3 & 0x07,                  // Bits 0-2: Waveform select

    ksl: (b4 >> 6) & 0x03,            // Bits 6-7: Key scale level
    out: b5 & 0x3F,                   // Bits 0-5: Output level
  };
}

/**
 * Parse a single instrument entry
 */
function parseInstrument(buffer, offset, index, names) {
  const flags = buffer.readUInt16LE(offset);
  const finetune = buffer.readUInt8(offset + 2);
  const note = buffer.readUInt8(offset + 3);

  // First voice instrument (offset + 4)
  const mod1 = parseOperator(buffer, offset + 4);
  const feedback1 = buffer.readUInt8(offset + 10);
  const car1 = parseOperator(buffer, offset + 11);
  const unused1 = buffer.readUInt8(offset + 17);
  const baseNote1 = buffer.readInt16LE(offset + 18);

  // Second voice instrument (offset + 20)
  const mod2 = parseOperator(buffer, offset + 20);
  const feedback2 = buffer.readUInt8(offset + 26);
  const car2 = parseOperator(buffer, offset + 27);
  const unused2 = buffer.readUInt8(offset + 33);
  const baseNote2 = buffer.readInt16LE(offset + 34);

  const name = names[index] || `Unknown ${index}`;

  return {
    id: index,
    name: name,
    note: note !== 0 ? note : undefined,

    // Voice 1
    voice1: {
      mod: mod1,
      car: car1,
      feedback: (feedback1 >> 1) & 0x07,
      additive: (feedback1 & 0x01) === 0,
      baseNote: baseNote1
    },

    // Voice 2
    voice2: {
      mod: mod2,
      car: car2,
      feedback: (feedback2 >> 1) & 0x07,
      additive: (feedback2 & 0x01) === 0,
      baseNote: baseNote2
    }
  };
}

/**
 * Parse instrument names from the buffer
 */
function parseNames(buffer, offset) {
  const names = [];
  for (let i = 0; i < 175; i++) {
    const nameOffset = offset + (i * 32);
    let name = '';
    for (let j = 0; j < 32; j++) {
      const byte = buffer.readUInt8(nameOffset + j);
      if (byte === 0) break;
      name += String.fromCharCode(byte);
    }
    names.push(name);
  }
  return names;
}

/**
 * Parse the entire GENMIDI.op2 file
 */
function parseGENMIDI(buffer) {
  // Verify header
  const header = buffer.toString('ascii', 0, 8);
  if (header !== '#OPL_II#') {
    throw new Error(`Invalid header: ${header}`);
  }

  console.log('✓ Valid GENMIDI.op2 header');

  // Parse instrument names (at offset 8 + 175*36 = 6308)
  const instrumentDataSize = 175 * 36;
  const namesOffset = 8 + instrumentDataSize;
  const names = parseNames(buffer, namesOffset);

  console.log(`✓ Parsed ${names.length} instrument names`);

  // Parse instruments (first 128 are General MIDI, next 47 are percussion)
  const instruments = [];
  for (let i = 0; i < 128; i++) { // Only use first 128 (General MIDI)
    const offset = 8 + (i * 36);
    const instrument = parseInstrument(buffer, offset, i, names);
    instruments.push(instrument);
  }

  console.log(`✓ Parsed ${instruments.length} instruments`);

  return {
    name: 'DMXOPL3',
    version: '2.11d',
    source: 'https://github.com/sneakernets/DMXOPL',
    license: 'MIT',
    instruments: instruments,
  };
}

/**
 * Download GENMIDI.op2 file (with caching)
 */
async function downloadFile() {
  // Check if cached file exists
  if (fs.existsSync(CACHE_PATH)) {
    console.log('✓ Using cached GENMIDI.op2');
    return fs.readFileSync(CACHE_PATH);
  }

  console.log('Downloading DMXOPL3 GENMIDI.op2...');
  console.log(`URL: ${DMXOPL_URL}`);

  return new Promise((resolve, reject) => {
    https.get(DMXOPL_URL, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log(`✓ Downloaded ${buffer.length} bytes`);

        // Cache the downloaded file
        fs.writeFileSync(CACHE_PATH, buffer);
        console.log(`✓ Cached to ${CACHE_PATH}`);

        resolve(buffer);
      });

      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Convert DMXOPL3 GENMIDI.op2 to JSON
 */
async function downloadAndConvert() {
  try {
    const buffer = await downloadFile();
    const data = parseGENMIDI(buffer);
    const json = JSON.stringify(data, null, 2);

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_PATH, json, 'utf8');
    console.log(`✓ Wrote ${OUTPUT_PATH}`);
    console.log(`✓ Conversion complete! ${data.instruments.length} instruments converted.`);
  } catch (error) {
    throw error;
  }
}

// Run converter
downloadAndConvert()
  .then(() => {
    console.log('\n✅ DMXOPL3 patches successfully converted!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Conversion failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });

export { parseGENMIDI, downloadAndConvert };
