/**
 * AIL Collections Converter
 *
 * Downloads and converts AIL (Audio Interface Library) / Miles Sound System
 * Global Timbre Library (.opl, .ad) files to JSON format.
 * Implements caching to avoid re-downloading files.
 *
 * Format: Global Timbre Library (GTL)
 * - Header array with MIDI bank/patch indexing
 * - OPL2 register data per instrument
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

// AIL Collection Definitions
const AIL_COLLECTIONS = [
  {
    id: 'warcraft2',
    name: 'Warcraft II: Tides of Darkness',
    description: 'Epic fantasy RTS soundtrack instruments',
    category: 'ail',
    game: 'Warcraft II: Tides of Darkness',
    author: 'Blizzard Entertainment',
    year: 1995,
    url: 'https://raw.githubusercontent.com/Wohlstand/libADLMIDI/master/fm_banks/ail/warcraft2.ad',
    filename: 'warcraft2.ad',
    outputPath: 'ail/warcraft2.json',
    tags: ['warcraft', 'blizzard', 'fantasy', 'rts', 'classic']
  },
  {
    id: 'star-control-3',
    name: 'Star Control 3',
    description: 'Sci-fi space adventure soundtrack',
    category: 'ail',
    game: 'Star Control 3',
    author: 'Legend Entertainment',
    year: 1996,
    url: 'https://raw.githubusercontent.com/Wohlstand/libADLMIDI/master/fm_banks/ail/star_control_3.opl',
    filename: 'star_control_3.opl',
    outputPath: 'ail/star-control-3.json',
    tags: ['star-control', 'sci-fi', 'space', 'adventure']
  },
  {
    id: 'syndicate',
    name: 'Syndicate',
    description: 'Cyberpunk tactical game instruments',
    category: 'ail',
    game: 'Syndicate',
    author: 'Bullfrog Productions',
    year: 1993,
    url: 'https://raw.githubusercontent.com/Wohlstand/libADLMIDI/master/fm_banks/ail/Syndicate.opl',
    filename: 'Syndicate.opl',
    outputPath: 'ail/syndicate.json',
    tags: ['syndicate', 'bullfrog', 'cyberpunk', 'tactical']
  },
  {
    id: 'system-shock',
    name: 'System Shock',
    description: 'Atmospheric sci-fi horror soundtrack',
    category: 'ail',
    game: 'System Shock',
    author: 'Looking Glass Technologies',
    year: 1994,
    url: 'https://raw.githubusercontent.com/Wohlstand/libADLMIDI/master/fm_banks/ail/SystemShock.opl',
    filename: 'SystemShock.opl',
    outputPath: 'ail/system-shock.json',
    tags: ['system-shock', 'looking-glass', 'sci-fi', 'horror', 'atmospheric']
  },
  {
    id: 'discworld',
    name: 'Discworld',
    description: 'Terry Pratchett adventure game soundtrack',
    category: 'ail',
    game: 'Discworld',
    author: 'Teeny Weeny Games / Perfect 10 Productions',
    year: 1995,
    url: 'https://raw.githubusercontent.com/Wohlstand/libADLMIDI/master/fm_banks/ail/Discworld.opl',
    filename: 'Discworld.opl',
    outputPath: 'ail/discworld.json',
    tags: ['discworld', 'adventure', 'comedy', 'fantasy']
  },
  {
    id: 'theme-hospital',
    name: 'Theme Hospital',
    description: 'Hospital simulation game instruments',
    category: 'ail',
    game: 'Theme Hospital',
    author: 'Bullfrog Productions',
    year: 1997,
    url: 'https://raw.githubusercontent.com/Wohlstand/libADLMIDI/master/fm_banks/ail/ThemeHospital.opl',
    filename: 'ThemeHospital.opl',
    outputPath: 'ail/theme-hospital.json',
    tags: ['theme-hospital', 'bullfrog', 'simulation', 'management']
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
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        console.log(`  ↪ Following redirect to: ${redirectUrl}`);
        return downloadFile(redirectUrl, cachePath).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log(`  ✓ Downloaded ${buffer.length} bytes`);

        // Cache the file
        fs.writeFileSync(cachePath, buffer);
        console.log(`  ✓ Cached to: ${path.basename(cachePath)}`);

        resolve(buffer);
      });
    }).on('error', reject);
  });
}

/**
 * Parse Global Timbre Library (.opl/.ad) file
 * Format: Header array + Timbre data array
 */
function parseGTLFile(buffer, sourceName) {
  const instruments = [];
  let offset = 0;

  console.log(`  📖 Parsing GTL file...`);

  // Read headers until we hit the terminator (0xFFFF)
  const headers = [];
  while (offset < buffer.length - 1) {
    const marker = buffer.readUInt16LE(offset);

    // Check for terminator
    if (marker === 0xFFFF) {
      offset += 2;
      console.log(`  ✓ Found header terminator at offset ${offset}`);
      break;
    }

    // Read header (6 bytes total)
    const midiPatch = buffer.readUInt8(offset);
    const midiBank = buffer.readUInt8(offset + 1);
    const dataOffset = buffer.readUInt32LE(offset + 2);

    headers.push({ midiPatch, midiBank, dataOffset });
    offset += 6;
  }

  console.log(`  ✓ Found ${headers.length} instrument headers`);

  // Parse each instrument's timbre data
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const dataOffset = header.dataOffset;

    if (dataOffset >= buffer.length) {
      console.warn(`  ⚠ Instrument ${i}: Data offset ${dataOffset} exceeds buffer size`);
      continue;
    }

    try {
      // Read timbre structure
      const length = buffer.readUInt16LE(dataOffset);
      const transpose = buffer.readInt8(dataOffset + 2);

      // OPL2 register data (11 bytes)
      const mod_AVEKM = buffer.readUInt8(dataOffset + 3);
      const mod_KSLTL = buffer.readUInt8(dataOffset + 4);
      const mod_AD = buffer.readUInt8(dataOffset + 5);
      const mod_SR = buffer.readUInt8(dataOffset + 6);
      const mod_WS = buffer.readUInt8(dataOffset + 7);
      const fb_c = buffer.readUInt8(dataOffset + 8);
      const car_AVEKM = buffer.readUInt8(dataOffset + 9);
      const car_KSLTL = buffer.readUInt8(dataOffset + 10);
      const car_AD = buffer.readUInt8(dataOffset + 11);
      const car_SR = buffer.readUInt8(dataOffset + 12);
      const car_WS = buffer.readUInt8(dataOffset + 13);

      // Convert OPL register data to our format
      const instrument = {
        id: header.midiPatch,
        name: getGMInstrumentName(header.midiPatch),
        voice1: {
          mod: parseOperator(mod_AVEKM, mod_KSLTL, mod_AD, mod_SR, mod_WS),
          car: parseOperator(car_AVEKM, car_KSLTL, car_AD, car_SR, car_WS),
          feedback: (fb_c >> 1) & 0x07,
          additive: (fb_c & 0x01) === 1,
          baseNote: transpose
        },
        voice2: {
          mod: parseOperator(0, 0, 0, 0, 0),
          car: parseOperator(0, 0, 0, 0, 0),
          feedback: 0,
          additive: false,
          baseNote: 0
        }
      };

      instruments.push(instrument);
    } catch (error) {
      console.warn(`  ⚠ Failed to parse instrument ${i}:`, error.message);
    }
  }

  console.log(`  ✓ Parsed ${instruments.length} instruments`);

  return {
    name: sourceName,
    version: '1.0',
    instruments: instruments
  };
}

/**
 * Parse OPL operator register data
 */
function parseOperator(avekm, ksltl, ad, sr, ws) {
  return {
    trem: (avekm & 0x80) !== 0,          // Bit 7: Tremolo (AM)
    vib: (avekm & 0x40) !== 0,           // Bit 6: Vibrato
    sus: (avekm & 0x20) !== 0,           // Bit 5: Sustaining
    ksr: (avekm & 0x10) !== 0,           // Bit 4: Key scale rate
    multi: avekm & 0x0F,                 // Bits 0-3: Frequency multiplier

    ksl: (ksltl >> 6) & 0x03,            // Bits 6-7: Key scale level
    out: ksltl & 0x3F,                   // Bits 0-5: Output level

    attack: (ad >> 4) & 0x0F,            // Bits 4-7: Attack rate
    decay: ad & 0x0F,                    // Bits 0-3: Decay rate

    sustain: (sr >> 4) & 0x0F,           // Bits 4-7: Sustain level
    release: sr & 0x0F,                  // Bits 0-3: Release rate

    wave: ws & 0x07                      // Bits 0-2: Waveform
  };
}

/**
 * Get General MIDI instrument name by patch number
 */
function getGMInstrumentName(patch) {
  const gmNames = [
    'Acoustic Grand Piano', 'Bright Acoustic Piano', 'Electric Grand Piano', 'Honky-tonk Piano',
    'Electric Piano 1', 'Electric Piano 2', 'Harpsichord', 'Clavi',
    'Celesta', 'Glockenspiel', 'Music Box', 'Vibraphone',
    'Marimba', 'Xylophone', 'Tubular Bells', 'Dulcimer',
    'Drawbar Organ', 'Percussive Organ', 'Rock Organ', 'Church Organ',
    'Reed Organ', 'Accordion', 'Harmonica', 'Tango Accordion',
    'Acoustic Guitar (nylon)', 'Acoustic Guitar (steel)', 'Electric Guitar (jazz)', 'Electric Guitar (clean)',
    'Electric Guitar (muted)', 'Overdriven Guitar', 'Distortion Guitar', 'Guitar harmonics',
    'Acoustic Bass', 'Electric Bass (finger)', 'Electric Bass (pick)', 'Fretless Bass',
    'Slap Bass 1', 'Slap Bass 2', 'Synth Bass 1', 'Synth Bass 2',
    'Violin', 'Viola', 'Cello', 'Contrabass',
    'Tremolo Strings', 'Pizzicato Strings', 'Orchestral Harp', 'Timpani',
    'String Ensemble 1', 'String Ensemble 2', 'SynthStrings 1', 'SynthStrings 2',
    'Choir Aahs', 'Voice Oohs', 'Synth Voice', 'Orchestra Hit',
    'Trumpet', 'Trombone', 'Tuba', 'Muted Trumpet',
    'French Horn', 'Brass Section', 'SynthBrass 1', 'SynthBrass 2',
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
    'Kalimba', 'Bag pipe', 'Fiddle', 'Shanai',
    'Tinkle Bell', 'Agogo', 'Steel Drums', 'Woodblock',
    'Taiko Drum', 'Melodic Tom', 'Synth Drum', 'Reverse Cymbal',
    'Guitar Fret Noise', 'Breath Noise', 'Seashore', 'Bird Tweet',
    'Telephone Ring', 'Helicopter', 'Applause', 'Gunshot'
  ];
  return gmNames[patch] || `Instrument ${patch}`;
}

/**
 * Convert collection to JSON and write to file
 */
async function convertCollection(collection) {
  console.log(`\n📦 Processing: ${collection.name}`);

  try {
    // Download (or load cached) file
    const cachePath = path.join(CACHE_DIR, collection.filename);
    const buffer = await downloadFile(collection.url, cachePath);

    // Parse the GTL file
    const bank = parseGTLFile(buffer, collection.name);

    // Add metadata
    bank.source = collection.url;
    bank.license = 'MIT';
    bank.author = collection.author;
    bank.game = collection.game;
    bank.year = collection.year;

    // Write JSON file
    const outputPath = path.join(OUTPUT_DIR, collection.outputPath);
    const outputDir = path.dirname(outputPath);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(bank, null, 2));
    console.log(`  ✓ Wrote: ${collection.outputPath}`);

    return {
      success: true,
      instrumentCount: bank.instruments.length
    };
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Main conversion function
 */
async function convertAllCollections() {
  console.log('🎵 AIL Collections Converter');
  console.log('============================\n');
  console.log(`Processing ${AIL_COLLECTIONS.length} collections...\n`);

  // Create directories
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log('✓ Created cache directory');
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log('✓ Created output directory');
  }

  // Convert each collection
  const results = [];
  for (const collection of AIL_COLLECTIONS) {
    const result = await convertCollection(collection);
    results.push({ collection, result });
  }

  // Load existing catalog
  let catalog;
  if (fs.existsSync(CATALOG_PATH)) {
    catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
    console.log('\n✓ Loaded existing catalog');
  } else {
    catalog = {
      version: '1.0',
      lastUpdated: new Date().toISOString().split('T')[0],
      defaultCollection: 'legacy/GENMIDI.json',
      collections: []
    };
  }

  // Add new AIL collections to catalog
  for (let i = 0; i < AIL_COLLECTIONS.length; i++) {
    const collection = AIL_COLLECTIONS[i];
    const result = results[i].result;

    if (!result.success) continue;

    // Check if collection already exists
    const existingIndex = catalog.collections.findIndex(c => c.id === collection.id);

    const catalogEntry = {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      category: collection.category,
      path: collection.outputPath,
      source: collection.url,
      license: 'MIT',
      author: collection.author,
      game: collection.game,
      year: collection.year,
      instrumentCount: result.instrumentCount,
      tags: collection.tags,
      isDefault: false
    };

    if (existingIndex >= 0) {
      catalog.collections[existingIndex] = catalogEntry;
    } else {
      catalog.collections.push(catalogEntry);
    }
  }

  // Update last updated date
  catalog.lastUpdated = new Date().toISOString().split('T')[0];

  // Write updated catalog
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
  console.log('\n📋 Updated catalog.json');
  console.log(`  ✓ ${catalog.collections.length} collections in catalog`);

  // Print summary
  console.log('\n==================================================');
  console.log('📊 Conversion Summary');
  console.log('==================================================');

  const successful = results.filter(r => r.result.success).length;
  const failed = results.filter(r => !r.result.success).length;

  console.log(`✅ Successful: ${successful}`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}`);
    results.filter(r => !r.result.success).forEach(({ collection, result }) => {
      console.log(`   - ${collection.name}: ${result.error}`);
    });
  }
  console.log('==================================================\n');
}

// Run the converter
convertAllCollections().catch(console.error);
