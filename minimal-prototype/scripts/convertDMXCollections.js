/**
 * DMX Collections Converter
 *
 * Downloads and converts multiple DMX .op2 files to JSON format.
 * Implements caching to avoid re-downloading files.
 *
 * Phase 1 & 2 Implementation:
 * - Creates catalog.json
 * - Downloads DMX collections from libADLMIDI
 * - Converts to WebOrchestra JSON format
 * - Organizes into directory structure
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

// DMX Collection Definitions
const DMX_COLLECTIONS = [
  {
    id: 'genmidi-dmxopl3',
    name: 'GENMIDI (DMXOPL3)',
    description: 'Original GENMIDI bank from Doom - 128 General MIDI compatible instruments',
    category: 'legacy',
    game: 'Doom',
    author: 'DMXOPL3 Project',
    year: 1993,
    url: 'https://raw.githubusercontent.com/sneakernets/DMXOPL/DMXOPL3/GENMIDI.op2',
    filename: 'GENMIDI.op2',
    outputPath: 'legacy/GENMIDI.json',
    tags: ['doom', 'default', 'general-midi'],
    isDefault: true
  },
  {
    id: 'doom1-bobby-prince-v1',
    name: 'Doom (Bobby Prince v1)',
    description: 'Original Doom instrument bank by Bobby Prince',
    category: 'dmx',
    game: 'Doom',
    author: 'Bobby Prince',
    year: 1993,
    url: 'https://raw.githubusercontent.com/Wohlstand/libADLMIDI/master/fm_banks/dmx/doom1.op2',
    filename: 'doom1.op2',
    outputPath: 'dmx/doom1.json',
    tags: ['doom', 'id-software', 'bobby-prince', 'classic']
  },
  {
    id: 'doom2-bobby-prince-v2',
    name: 'Doom 2 (Bobby Prince v2)',
    description: 'Doom 2 instrument bank with improved patches',
    category: 'dmx',
    game: 'Doom 2',
    author: 'Bobby Prince',
    year: 1994,
    url: 'https://raw.githubusercontent.com/Wohlstand/libADLMIDI/master/fm_banks/dmx/doom2.op2',
    filename: 'doom2.op2',
    outputPath: 'dmx/doom2.json',
    tags: ['doom', 'doom2', 'id-software', 'bobby-prince']
  },
  {
    id: 'heretic-cygnus',
    name: 'Heretic (Cygnus Studios)',
    description: 'Heretic instrument bank - default DMX sound',
    category: 'dmx',
    game: 'Heretic',
    author: 'Cygnus Studios',
    year: 1994,
    url: 'https://raw.githubusercontent.com/Wohlstand/libADLMIDI/master/fm_banks/dmx/heretic.op2',
    filename: 'heretic.op2',
    outputPath: 'dmx/heretic.json',
    tags: ['heretic', 'id-software', 'raven-software', 'fantasy']
  },
  {
    id: 'hexen',
    name: 'Hexen',
    description: 'Hexen: Beyond Heretic instrument bank',
    category: 'dmx',
    game: 'Hexen',
    author: 'Raven Software',
    year: 1995,
    url: 'https://raw.githubusercontent.com/Wohlstand/libADLMIDI/master/fm_banks/dmx/hexen.op2',
    filename: 'hexen.op2',
    outputPath: 'dmx/hexen.json',
    tags: ['hexen', 'id-software', 'raven-software', 'fantasy', 'medieval']
  },
  {
    id: 'raptor',
    name: 'Raptor: Call of the Shadows',
    description: 'Raptor: Call of the Shadows instrument bank',
    category: 'dmx',
    game: 'Raptor: Call of the Shadows',
    author: 'Apogee Software',
    year: 1994,
    url: 'https://raw.githubusercontent.com/Wohlstand/libADLMIDI/master/fm_banks/dmx/raptor.op2',
    filename: 'raptor.op2',
    outputPath: 'dmx/raptor.json',
    tags: ['raptor', 'apogee', 'shooter', 'action']
  },
  {
    id: 'strife',
    name: 'Strife',
    description: 'Strife: Quest for the Sigil instrument bank',
    category: 'dmx',
    game: 'Strife',
    author: 'Rogue Entertainment',
    year: 1996,
    url: 'https://raw.githubusercontent.com/Wohlstand/libADLMIDI/master/fm_banks/dmx/strife.op2',
    filename: 'strife.op2',
    outputPath: 'dmx/strife.json',
    tags: ['strife', 'id-software', 'rogue-entertainment', 'rpg']
  }
];

// Source information
const SOURCE_INFO = {
  source: 'https://github.com/Wohlstand/libADLMIDI',
  license: 'MIT',
  format: 'DMXOPL2/OP2'
};

/**
 * Parse a single operator from the binary data
 */
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

/**
 * Parse a single instrument entry
 */
function parseInstrument(buffer, offset, index, names) {
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

  const name = names[index] || `Unknown ${index}`;

  return {
    id: index,
    name: name,
    note: note !== 0 ? note : undefined,
    voice1: {
      mod: mod1,
      car: car1,
      feedback: (feedback1 >> 1) & 0x07,
      additive: (feedback1 & 0x01) !== 0, // Bit 0: 0=FM, 1=Additive
      baseNote: baseNote1
    },
    voice2: {
      mod: mod2,
      car: car2,
      feedback: (feedback2 >> 1) & 0x07,
      additive: (feedback2 & 0x01) !== 0, // Bit 0: 0=FM, 1=Additive
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
function parseOP2File(buffer, metadata) {
  // Verify header
  const header = buffer.toString('ascii', 0, 8);
  if (header !== '#OPL_II#') {
    throw new Error(`Invalid OP2 header: ${header}`);
  }

  // Parse instrument names
  const instrumentDataSize = 175 * 36;
  const namesOffset = 8 + instrumentDataSize;
  const names = parseNames(buffer, namesOffset);

  // Parse instruments (first 128 are General MIDI)
  const instruments = [];
  for (let i = 0; i < 128; i++) {
    const offset = 8 + (i * 36);
    const instrument = parseInstrument(buffer, offset, i, names);
    instruments.push(instrument);
  }

  return {
    name: metadata.name,
    version: '1.0',
    source: SOURCE_INFO.source,
    license: SOURCE_INFO.license,
    author: metadata.author,
    game: metadata.game,
    year: metadata.year,
    instruments: instruments,
  };
}

/**
 * Download file with caching
 */
async function downloadFile(url, cachePath) {
  // Check cache first
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
        console.log(`  ↪ Redirecting to: ${redirectUrl}`);
        downloadFile(redirectUrl, cachePath).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log(`  ✓ Downloaded ${buffer.length} bytes`);

        // Cache the file
        fs.writeFileSync(cachePath, buffer);
        console.log(`  ✓ Cached to: ${path.basename(cachePath)}`);

        resolve(buffer);
      });

      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Convert a single collection
 */
async function convertCollection(collection) {
  console.log(`\n📦 Processing: ${collection.name}`);

  try {
    // Download with caching
    const cachePath = path.join(CACHE_DIR, collection.filename);
    const buffer = await downloadFile(collection.url, cachePath);

    // Parse OP2 file
    const data = parseOP2File(buffer, collection);
    console.log(`  ✓ Parsed ${data.instruments.length} instruments`);

    // Write JSON output
    const outputPath = path.join(OUTPUT_DIR, collection.outputPath);
    const outputDir = path.dirname(outputPath);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(outputPath, json, 'utf8');
    console.log(`  ✓ Wrote: ${collection.outputPath}`);

    return {
      success: true,
      instrumentCount: data.instruments.length
    };
  } catch (error) {
    console.error(`  ❌ Failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate catalog.json
 */
function generateCatalog(collections, results) {
  console.log('\n📋 Generating catalog.json...');

  const catalog = {
    version: '1.0',
    lastUpdated: new Date().toISOString().split('T')[0],
    defaultCollection: collections.find(c => c.isDefault)?.outputPath || collections[0].outputPath,
    collections: collections.map((collection, index) => {
      const result = results[index];

      return {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        category: collection.category,
        path: collection.outputPath,
        source: SOURCE_INFO.source,
        license: SOURCE_INFO.license,
        author: collection.author,
        game: collection.game,
        year: collection.year,
        instrumentCount: result?.success ? result.instrumentCount : 0,
        tags: collection.tags || [],
        isDefault: collection.isDefault || false
      };
    }).filter(c => c.instrumentCount > 0) // Only include successful conversions
  };

  const json = JSON.stringify(catalog, null, 2);
  fs.writeFileSync(CATALOG_PATH, json, 'utf8');
  console.log(`  ✓ Wrote: catalog.json`);
  console.log(`  ✓ ${catalog.collections.length} collections in catalog`);
}

/**
 * Main conversion process
 */
async function convertAllCollections() {
  console.log('🎵 DMX Collections Converter');
  console.log('============================\n');
  console.log(`Processing ${DMX_COLLECTIONS.length} collections...\n`);

  // Ensure directories exist
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log(`✓ Created cache directory: ${CACHE_DIR}`);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✓ Created output directory: ${OUTPUT_DIR}`);
  }

  // Convert all collections
  const results = [];
  for (const collection of DMX_COLLECTIONS) {
    const result = await convertCollection(collection);
    results.push(result);
  }

  // Generate catalog
  generateCatalog(DMX_COLLECTIONS, results);

  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('\n' + '='.repeat(50));
  console.log('📊 Conversion Summary');
  console.log('='.repeat(50));
  console.log(`✅ Successful: ${successful}`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}`);
  }
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  console.log(`💾 Cache directory: ${CACHE_DIR}`);

  if (failed > 0) {
    console.log('\n⚠️  Some collections failed to convert. Check errors above.');
    process.exit(1);
  } else {
    console.log('\n✨ All collections converted successfully!');
    process.exit(0);
  }
}

// Run converter
convertAllCollections().catch((error) => {
  console.error('\n❌ Conversion process failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
