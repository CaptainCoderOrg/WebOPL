# WebOrchestra Conversion Scripts

This directory contains scripts for downloading and converting OPL3 instrument banks.

---

## Available Scripts

### `convertDMXCollections.js` ⭐ RECOMMENDED

**Purpose:** Download and convert multiple DMX instrument collections

**Features:**
- Downloads 7 DMX collections from GitHub
- Implements file caching (no re-downloads)
- Generates organized directory structure
- Creates master catalog.json
- Progress feedback and error handling

**Usage:**
```bash
cd minimal-prototype
node scripts/convertDMXCollections.js
```

**Output:**
- `public/instruments/catalog.json` - Master catalog
- `public/instruments/legacy/GENMIDI.json` - Default collection
- `public/instruments/dmx/*.json` - Game-specific collections
- `scripts/.cache/*.op2` - Cached binary files

**Runtime:**
- First run: ~10 seconds (downloads files)
- Subsequent runs: <1 second (uses cache)

---

### `convertDMXOPL.js` (Legacy)

**Purpose:** Convert single GENMIDI.op2 file

**Status:** Legacy script (kept for reference)

**Usage:**
```bash
node scripts/convertDMXOPL.js
```

**Note:** Use `convertDMXCollections.js` instead for multi-collection support.

---

## Collections Downloaded

| Collection | File | Status |
|------------|------|--------|
| GENMIDI (Default) | legacy/GENMIDI.json | ✅ |
| Doom 1 | dmx/doom1.json | ✅ |
| Doom 2 | dmx/doom2.json | ✅ |
| Heretic | dmx/heretic.json | ✅ |
| Raptor | dmx/raptor.json | ✅ |
| Strife | dmx/strife.json | ✅ |
| Hexen | dmx/hexen.json | ❌ (404) |

---

## Cache Management

### Cache Location

```
scripts/.cache/
├── GENMIDI.op2
├── doom1.op2
├── doom2.op2
├── heretic.op2
├── raptor.op2
└── strife.op2
```

### Clear Cache

```bash
# Remove all cached files
rm -rf scripts/.cache

# Remove specific file
rm scripts/.cache/doom1.op2
```

### Cache Behavior

- Files are downloaded once and cached
- Subsequent runs use cached files
- Manual deletion required to re-download

---

## Troubleshooting

### "HTTP 404: Not Found"

**Cause:** File doesn't exist at specified URL

**Solution:**
- Check if file exists in repository
- Try alternative URL
- Comment out collection in script

### "Cannot find module"

**Cause:** Script run from wrong directory

**Solution:**
```bash
# Run from minimal-prototype directory
cd minimal-prototype
node scripts/convertDMXCollections.js
```

### "Permission denied"

**Cause:** Missing write permissions

**Solution:**
```bash
# Check directory permissions
ls -l public/instruments
chmod -R u+w public/instruments
```

---

## Adding New Collections

### Step 1: Add to DMX_COLLECTIONS array

```javascript
{
  id: 'new-collection',
  name: 'New Collection',
  description: 'Description here',
  category: 'dmx',
  game: 'Game Name',
  author: 'Author Name',
  year: 1995,
  url: 'https://raw.githubusercontent.com/.../file.op2',
  filename: 'file.op2',
  outputPath: 'dmx/new-collection.json',
  tags: ['tag1', 'tag2']
}
```

### Step 2: Run converter

```bash
node scripts/convertDMXCollections.js
```

### Step 3: Verify output

```bash
# Check JSON file exists
ls -l public/instruments/dmx/new-collection.json

# Verify catalog entry
cat public/instruments/catalog.json | grep "new-collection"
```

---

## Script Architecture

### Flow Diagram

```
Start
  ↓
Create directories
  ↓
For each collection:
  ├─ Check cache
  │   ├─ Exists? → Load from cache
  │   └─ Missing? → Download from URL
  ↓
  Parse OP2 file
  ↓
  Convert to JSON
  ↓
  Write to output directory
  ↓
Generate catalog.json
  ↓
Print summary
  ↓
End
```

### Key Functions

- `downloadFile()` - Download with caching
- `parseOP2File()` - Parse binary OP2 format
- `convertCollection()` - Convert single collection
- `generateCatalog()` - Create master catalog
- `convertAllCollections()` - Main orchestration

---

## File Formats

### Input: OP2 Format

- Magic: `#OPL_II#`
- Size: 11,908 bytes
- Instruments: 175 (128 melodic + 47 percussion)
- Structure: 36 bytes per instrument

### Output: JSON Format

```json
{
  "name": "Collection Name",
  "version": "1.0",
  "source": "https://...",
  "license": "MIT",
  "author": "Author",
  "game": "Game",
  "year": 1993,
  "instruments": [
    {
      "id": 0,
      "name": "Instrument Name",
      "voice1": { /* operator data */ },
      "voice2": { /* operator data */ }
    }
  ]
}
```

---

## Performance

### First Run (with downloads)
- Per collection: 1-2 seconds
- Total: ~10 seconds
- Network: ~70 KB downloaded

### Cached Run
- Per collection: <100ms
- Total: <1 second
- Network: 0 bytes

---

## License

Scripts are part of WebOrchestra project.

Source data from:
- libADLMIDI (MIT License)
- DMXOPL Project (MIT License)

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review [OPL-Libraries/README.md](../../OPL-Libraries/README.md)
3. Check GitHub repository issues

---

**Last Updated:** 2025-01-11
