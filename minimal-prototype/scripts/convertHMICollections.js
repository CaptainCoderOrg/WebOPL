/**
 * HMI Collections Converter
 *
 * Downloads and converts HMI (Human Machine Interfaces) / .BNK format
 * files to JSON format. HMI banks were used in many classic PC games.
 * Implements caching to avoid re-downloading files.
 *
 * Format: HMI Timbre Bank (.bnk)
 * - Header with offsets to name table and instrument data
 * - Name table with instrument index and name mappings
 * - Instrument data with OPL2 register values (13-16 bytes per instrument)
 */

import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CACHE_DIR = path.join(__dirname, '.cache');
const OUTPUT_DIR = path.join(__dirname, '../public/instruments');
const CATALOG_PATH = path.join(OUTPUT_DIR, 'catalog.json');

// HMI Collection Definitions
const HMI_COLLECTIONS = [
  {
    id: 'descent',
    name: 'Descent',
    description: 'Iconic 3D space shooter soundtrack',
    category: 'hmi',
    game: 'Descent',
    author: 'Parallax Software',
    year: 1995,
    baseUrl: 'https://raw.githubusercontent.com/Wohlstand/libADLMIDI/master/fm_banks/hmi/Descent',
    melodicFile: 'melodic.bnk',
    outputPath: 'hmi/descent.json',
    tags: ['descent', 'parallax', 'space', 'shooter', '3d', 'classic']
  },
  {
    id: 'descent2',
    name: 'Descent 2',
    description: 'Sequel with enhanced soundtrack',
    category: 'hmi',
    game: 'Descent 2',
    author: 'Parallax Software',
    year: 1996,
    baseUrl: 'https://raw.githubusercontent.com/Wohlstand/libADLMIDI/master/fm_banks/hmi/Descent_2',
    melodicFile: 'melodic.bnk',
    outputPath: 'hmi/descent2.json',
    tags: ['descent', 'descent2', 'parallax', 'space', 'shooter', 'sequel']
  },
  {
    id: 'shattered-steel',
    name: 'Shattered Steel',
    description: 'BioWare\'s first game - mech combat',
    category: 'hmi',
    game: 'Shattered Steel',
    author: 'BioWare',
    year: 1996,
    baseUrl: 'https://raw.githubusercontent.com/Wohlstand/libADLMIDI/master/fm_banks/hmi/Shattered_Steel',
    melodicFile: 'melodic.bnk',
    outputPath: 'hmi/shattered-steel.json',
    tags: ['shattered-steel', 'bioware', 'mech', 'action', 'combat']
  },
  {
    id: 'theme-park',
    name: 'Theme Park',
    description: 'Theme park simulation game',
    category: 'hmi',
    game: 'Theme Park',
    author: 'Bullfrog Productions',
    year: 1994,
    baseUrl: 'https://raw.githubusercontent.com/Wohlstand/libADLMIDI/master/fm_banks/hmi/Theme_Park',
    melodicFile: 'melodic.bnk',
    outputPath: 'hmi/theme-park.json',
    tags: ['theme-park', 'bullfrog', 'simulation', 'management', 'theme-park']
  },
  {
    id: 'normality',
    name: 'Normality',
    description: 'Cyberpunk adventure game',
    category: 'hmi',
    game: 'Normality',
    author: 'Gremlin Interactive',
    year: 1996,
    baseUrl: 'https://raw.githubusercontent.com/Wohlstand/libADLMIDI/master/fm_banks/hmi/Normality',
    melodicFile: 'melodic.bnk',
    outputPath: 'hmi/normality.json',
    tags: ['normality', 'gremlin', 'adventure', 'cyberpunk', '3d']
  },
  {
    id: 'earthsiege',
    name: 'Earthsiege',
    description: 'Mech combat simulation',
    category: 'hmi',
    game: 'Earthsiege',
    author: 'Dynamix',
    year: 1994,
    baseUrl: 'https://raw.githubusercontent.com/Wohlstand/libADLMIDI/master/fm_banks/hmi/Earthsiege',
    melodicFile: 'melodic.bnk',
    outputPath: 'hmi/earthsiege.json',
    tags: ['earthsiege', 'dynamix', 'mech', 'simulation', 'starsiege']
  }
];

/**
 * Download file with HTTP redirect support and caching
 */
async function downloadFile(url, cachePath) {
  // Check if file already cached
  if (fs.existsSync(cachePath)) {
    console.log(`  ✓ Using cached file: ${path.basename(cachePath)}`);
    return fs.readFileSync(cachePath);
  }

  console.log(`  ⬇ Downloading: ${url}`);

  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        const redirectUrl = response.headers.location;
        console.log(`  ↪ Following redirect to: ${redirectUrl}`);
        https.get(redirectUrl, (redirectResponse) => {
          const chunks = [];
          redirectResponse.on('data', (chunk) => chunks.push(chunk));
          redirectResponse.on('end', () => {
            const buffer = Buffer.concat(chunks);
            fs.writeFileSync(cachePath, buffer);
            console.log(`  ✓ Downloaded ${buffer.length} bytes`);
            console.log(`  ✓ Cached to: ${path.basename(cachePath)}`);
            resolve(buffer);
          });
          redirectResponse.on('error', reject);
        }).on('error', reject);
      } else if (response.statusCode === 200) {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          fs.writeFileSync(cachePath, buffer);
          console.log(`  ✓ Downloaded ${buffer.length} bytes`);
          console.log(`  ✓ Cached to: ${path.basename(cachePath)}`);
          resolve(buffer);
        });
      } else {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
      }
      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Parse HMI BNK file format
 *
 * Format:
 * - Header (28 bytes): version, signature, offsets
 * - Name table: list of (index, name) pairs
 * - Instrument data: OPL2 register values (13-16 bytes per instrument)
 */
function parseHMIFile(buffer, sourceName) {
  const instruments = [];

  try {
    // Read header
    const version = buffer.readUInt16LE(0);
    const signature = buffer.toString('ascii', 2, 10).replace(/\0/g, '');
    const nameOffset = buffer.readUInt16LE(12);
    const dataOffset = buffer.readUInt16LE(16);

    console.log(`  ✓ Signature: ${signature}`);
    console.log(`  ✓ Name table at: 0x${nameOffset.toString(16)}`);
    console.log(`  ✓ Data at: 0x${dataOffset.toString(16)}`);

    // Read name table to count instruments
    const nameCount = Math.floor((dataOffset - nameOffset) / 12);
    console.log(`  ✓ Found ${nameCount} instrument entries`);

    // Parse each instrument (13-16 bytes of OPL2 data per instrument)
    const INST_SIZE = 13;  // Minimum size, some formats use 16
    let offset = dataOffset;

    for (let i = 0; i < nameCount && offset + INST_SIZE <= buffer.length; i++) {
      // HMI format stores OPL2 register values directly
      // Correct layout (13 bytes per instrument):
      // 0: Modulator characteristic (AVEKM)
      // 1: Modulator key scale / output level (KSLTL)
      // 2: Modulator AD (attack in upper nibble, decay in lower nibble)
      // 3: Modulator SR (sustain in upper nibble, release in lower nibble)
      // 4: Modulator waveform
      // 5: Carrier characteristic (AVEKM)
      // 6: Carrier key scale / output level (KSLTL)
      // 7: Carrier AD (attack in upper nibble, decay in lower nibble)
      // 8: Carrier SR (sustain in upper nibble, release in lower nibble)
      // 9: Carrier waveform
      // 10: Feedback/connection

      const mod_char = buffer.readUInt8(offset);
      const mod_scale = buffer.readUInt8(offset + 1);
      const mod_ad = buffer.readUInt8(offset + 2);   // Single byte: attack/decay nibbles
      const mod_sr = buffer.readUInt8(offset + 3);   // Single byte: sustain/release nibbles
      const mod_wave = buffer.readUInt8(offset + 4);

      const car_char = buffer.readUInt8(offset + 5);
      const car_scale = buffer.readUInt8(offset + 6);
      const car_ad = buffer.readUInt8(offset + 7);   // Single byte: attack/decay nibbles
      const car_sr = buffer.readUInt8(offset + 8);   // Single byte: sustain/release nibbles
      const car_wave = buffer.readUInt8(offset + 9);
      const fb_conn = buffer.readUInt8(offset + 10);

      const instrument = {
        id: i,
        name: getGMInstrumentName(i),
        voice1: {
          mod: parseOperator(mod_char, mod_scale, mod_ad, mod_sr, mod_wave),
          car: parseOperator(car_char, car_scale, car_ad, car_sr, car_wave),
          feedback: (fb_conn >> 1) & 0x07,
          additive: (fb_conn & 0x01) === 1,
          baseNote: 0
        },
        voice2: {
          mod: { trem: false, vib: false, sus: false, ksr: false, multi: 0, ksl: 0, out: 0, attack: 0, decay: 0, sustain: 0, release: 0, wave: 0 },
          car: { trem: false, vib: false, sus: false, ksr: false, multi: 0, ksl: 0, out: 0, attack: 0, decay: 0, sustain: 0, release: 0, wave: 0 },
          feedback: 0,
          additive: false,
          baseNote: 0
        },
        isDualVoice: false
      };

      instruments.push(instrument);
      offset += INST_SIZE;
    }

    console.log(`  ✓ Parsed ${instruments.length} instruments`);

    return {
      name: sourceName,
      version: '1.0',
      instruments
    };

  } catch (error) {
    console.error(`  ✗ Error parsing HMI file: ${error.message}`);
    throw error;
  }
}

/**
 * Parse operator from HMI register values
 * @param char - AVEKM byte (AM/Vib/EG-Type/KSR/Multiplier)
 * @param scale - KSLTL byte (Key Scale Level / Total Level)
 * @param ad - AD byte (Attack in upper nibble, Decay in lower nibble)
 * @param sr - SR byte (Sustain in upper nibble, Release in lower nibble)
 * @param wave - Waveform select byte
 */
function parseOperator(char, scale, ad, sr, wave) {
  return {
    trem: (char & 0x80) !== 0,
    vib: (char & 0x40) !== 0,
    sus: (char & 0x20) !== 0,
    ksr: (char & 0x10) !== 0,
    multi: char & 0x0F,
    ksl: (scale >> 6) & 0x03,
    out: scale & 0x3F,
    attack: (ad >> 4) & 0x0F,   // Upper nibble
    decay: ad & 0x0F,            // Lower nibble
    sustain: (sr >> 4) & 0x0F,  // Upper nibble
    release: sr & 0x0F,          // Lower nibble
    wave: wave & 0x07
  };
}

/**
 * Get General MIDI instrument name by patch number
 */
function getGMInstrumentName(patchNumber) {
  const gmNames = [
    'Acoustic Grand Piano', 'Bright Acoustic Piano', 'Electric Grand Piano', 'Honky-tonk Piano',
    'Electric Piano 1', 'Electric Piano 2', 'Harpsichord', 'Clavinet',
    'Celesta', 'Glockenspiel', 'Music Box', 'Vibraphone',
    'Marimba', 'Xylophone', 'Tubular Bells', 'Dulcimer',
    'Drawbar Organ', 'Percussive Organ', 'Rock Organ', 'Church Organ',
    'Reed Organ', 'Accordion', 'Harmonica', 'Tango Accordion',
    'Acoustic Guitar (nylon)', 'Acoustic Guitar (steel)', 'Electric Guitar (jazz)', 'Electric Guitar (clean)',
    'Electric Guitar (muted)', 'Overdriven Guitar', 'Distortion Guitar', 'Guitar Harmonics',
    'Acoustic Bass', 'Electric Bass (finger)', 'Electric Bass (pick)', 'Fretless Bass',
    'Slap Bass 1', 'Slap Bass 2', 'Synth Bass 1', 'Synth Bass 2',
    'Violin', 'Viola', 'Cello', 'Contrabass',
    'Tremolo Strings', 'Pizzicato Strings', 'Orchestral Harp', 'Timpani',
    'String Ensemble 1', 'String Ensemble 2', 'Synth Strings 1', 'Synth Strings 2',
    'Choir Aahs', 'Voice Oohs', 'Synth Choir', 'Orchestra Hit',
    'Trumpet', 'Trombone', 'Tuba', 'Muted Trumpet',
    'French Horn', 'Brass Section', 'Synth Brass 1', 'Synth Brass 2',
    'Soprano Sax', 'Alto Sax', 'Tenor Sax', 'Baritone Sax',
    'Oboe', 'English Horn', 'Bassoon', 'Clarinet',
    'Piccolo', 'Flute', 'Recorder', 'Pan Flute',
    'Blown Bottle', 'Shakuhachi', 'Whistle', 'Ocarina',
    'Lead 1 (square)', 'Lead 2 (sawtooth)', 'Lead 3 (calliope)', 'Lead 4 (chiff)',
    'Lead 5 (charang)', 'Lead 6 (voice)', 'Lead 7 (fifths)', 'Lead 8 (bass + lead)',
    'Pad 1 (new age)', 'Pad 2 (warm)', 'Pad 3 (polysynth)', 'Pad 4 (choir)',
    'Pad 5 (bowed)', 'Pad 6 (metallic)', 'Pad 7 (halo)', 'Pad 8 (sweep)',
    'FX 1 (rain)', 'FX 2 (soundtrack)', 'FX 3 (crystal)', 'FX 4 (atmosphere)',
    'FX 5 (brightness)', 'FX 6 (goblins)', 'FX 7 (echoes)', 'FX 8 (sci-fi)',
    'Sitar', 'Banjo', 'Shamisen', 'Koto',
    'Kalimba', 'Bagpipe', 'Fiddle', 'Shanai',
    'Tinkle Bell', 'Agogo', 'Steel Drums', 'Woodblock',
    'Taiko Drum', 'Melodic Tom', 'Synth Drum', 'Reverse Cymbal',
    'Guitar Fret Noise', 'Breath Noise', 'Seashore', 'Bird Tweet',
    'Telephone Ring', 'Helicopter', 'Applause', 'Gunshot'
  ];

  return gmNames[patchNumber] || `Instrument ${patchNumber}`;
}

/**
 * Process a single HMI collection
 */
async function processCollection(collection) {
  console.log(`\n📦 Processing: ${collection.name}`);

  try {
    // Download melodic bank
    const melodicUrl = `${collection.baseUrl}/${collection.melodicFile}`;
    const cachePath = path.join(CACHE_DIR, `${collection.id}_melodic.bnk`);
    const buffer = await downloadFile(melodicUrl, cachePath);

    // Parse HMI file
    console.log('  📖 Parsing HMI file...');
    const parsed = parseHMIFile(buffer, collection.name);

    // Add metadata
    parsed.source = melodicUrl;
    parsed.license = 'MIT';
    parsed.author = collection.author;
    parsed.game = collection.game;
    parsed.year = collection.year;

    // Write JSON output
    const outputPath = path.join(OUTPUT_DIR, collection.outputPath);
    const outputDir = path.dirname(outputPath);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2));
    console.log(`  ✓ Wrote: ${collection.outputPath}`);

    return {
      success: true,
      collection: collection.id,
      instrumentCount: parsed.instruments.length
    };

  } catch (error) {
    console.error(`  ✗ Error processing ${collection.name}: ${error.message}`);
    return {
      success: false,
      collection: collection.id,
      error: error.message
    };
  }
}

/**
 * Update catalog.json with new HMI collections
 */
function updateCatalog(results) {
  let catalog;

  // Load existing catalog or create new one
  if (fs.existsSync(CATALOG_PATH)) {
    console.log('\n✓ Loaded existing catalog');
    catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  } else {
    console.log('\n✓ Creating new catalog');
    catalog = {
      version: '1.0',
      lastUpdated: new Date().toISOString().split('T')[0],
      defaultCollection: 'legacy/GENMIDI.json',
      collections: []
    };
  }

  // Add/update HMI collections
  for (const result of results) {
    if (!result.success) continue;

    const collection = HMI_COLLECTIONS.find(c => c.id === result.collection);
    if (!collection) continue;

    // Remove existing entry if present
    catalog.collections = catalog.collections.filter(c => c.id !== collection.id);

    // Add new entry
    catalog.collections.push({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      category: collection.category,
      path: collection.outputPath,
      source: `${collection.baseUrl}/${collection.melodicFile}`,
      license: 'MIT',
      author: collection.author,
      game: collection.game,
      year: collection.year,
      instrumentCount: result.instrumentCount,
      tags: collection.tags,
      isDefault: false
    });
  }

  // Update metadata
  catalog.lastUpdated = new Date().toISOString().split('T')[0];

  // Write catalog
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
  console.log(`\n📋 Updated catalog.json`);
  console.log(`  ✓ ${catalog.collections.length} collections in catalog`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🎵 HMI Collections Converter');
  console.log('============================\n');
  console.log(`Processing ${HMI_COLLECTIONS.length} collections...\n`);

  // Create cache directory if needed
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  // Process all collections
  const results = [];
  for (const collection of HMI_COLLECTIONS) {
    const result = await processCollection(collection);
    results.push(result);
  }

  // Update catalog
  updateCatalog(results);

  // Print summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('\n==================================================');
  console.log('📊 Conversion Summary');
  console.log('==================================================');
  console.log(`✅ Successful: ${successful}`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}`);
  }
  console.log('==================================================');
}

main().catch(console.error);
