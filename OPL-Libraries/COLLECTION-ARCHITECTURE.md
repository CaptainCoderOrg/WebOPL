# Instrument Collection Architecture

**Last Updated:** 2025-01-11

This document describes the recommended architecture for organizing multiple OPL3 instrument collections in WebOrchestra.

---

## Current Architecture

**Status:** Single monolithic file

```
minimal-prototype/
└── public/
    └── instruments/
        └── GENMIDI.json          # Single file with 128 instruments
```

**Issues with Current Approach:**
- Only one collection available at a time
- Large file size (loads all instruments even if not needed)
- No way to organize instruments by theme/game/source
- Difficult to add new collections without conflicts
- No metadata about collection origin

---

## Proposed Architecture

**Status:** Multi-collection with catalog

```
minimal-prototype/
└── public/
    └── instruments/
        ├── catalog.json                    # Master catalog of all collections
        │
        ├── dmx/                            # DMX format collections
        │   ├── doom1.json                  # Original Doom (Bobby Prince v1)
        │   ├── doom2.json                  # Doom 2 (Bobby Prince v2)
        │   ├── heretic.json                # Heretic (Cygnus Studios)
        │   ├── hexen.json                  # Hexen
        │   ├── raptor.json                 # Raptor: Call of the Shadows
        │   └── strife.json                 # Strife
        │
        ├── ail/                            # AIL Sound System collections
        │   ├── starcontrol3.json           # Star Control 3 (The Fat Man)
        │   ├── warcraft2.json              # Warcraft 2
        │   ├── syndicate.json              # Syndicate
        │   └── discworld.json              # Discworld
        │
        ├── hmi/                            # HMI collections
        │   ├── descent.json                # Descent
        │   ├── descent2.json               # Descent 2
        │   ├── shattered-steel.json        # Shattered Steel
        │   └── theme-park.json             # Theme Park
        │
        ├── community/                      # Community-created collections
        │   ├── bisqwit.json                # Bisqwit's collection
        │   └── custom.json                 # User custom instruments
        │
        └── legacy/                         # Keep for backwards compatibility
            └── GENMIDI.json                # Original GENMIDI (default)
```

---

## Catalog Format

### Structure

The `catalog.json` file serves as the master index of all available instrument collections.

**File:** `public/instruments/catalog.json`

```json
{
  "version": "1.0",
  "lastUpdated": "2025-01-11",
  "defaultCollection": "legacy/GENMIDI.json",
  "collections": [
    {
      "id": "genmidi-dmxopl3",
      "name": "GENMIDI (DMXOPL3)",
      "description": "Original GENMIDI bank from Doom - 128 General MIDI compatible instruments",
      "category": "legacy",
      "path": "legacy/GENMIDI.json",
      "source": "https://github.com/sneakernets/DMXOPL",
      "license": "MIT",
      "author": "DMXOPL3 Project",
      "instrumentCount": 128,
      "tags": ["doom", "default", "general-midi"],
      "isDefault": true
    },
    {
      "id": "doom1-bobby-prince-v1",
      "name": "Doom (Bobby Prince v1)",
      "description": "Original Doom instrument bank by Bobby Prince",
      "category": "dmx",
      "path": "dmx/doom1.json",
      "source": "https://github.com/Wohlstand/libADLMIDI",
      "license": "MIT",
      "author": "Bobby Prince",
      "instrumentCount": 128,
      "tags": ["doom", "id-software", "bobby-prince", "classic"]
    },
    {
      "id": "doom2-bobby-prince-v2",
      "name": "Doom 2 (Bobby Prince v2)",
      "description": "Doom 2 instrument bank with improved patches",
      "category": "dmx",
      "path": "dmx/doom2.json",
      "source": "https://github.com/Wohlstand/libADLMIDI",
      "license": "MIT",
      "author": "Bobby Prince",
      "instrumentCount": 128,
      "tags": ["doom", "doom2", "id-software", "bobby-prince"]
    }
    // ... more collections
  ]
}
```

### Catalog Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (kebab-case) |
| `name` | string | Yes | Display name for UI |
| `description` | string | Yes | Brief description of collection |
| `category` | string | Yes | Category: `dmx`, `ail`, `hmi`, `community`, `legacy` |
| `path` | string | Yes | Relative path to JSON file |
| `source` | string | No | Source URL (GitHub, etc.) |
| `license` | string | No | License type |
| `author` | string | No | Original author/creator |
| `instrumentCount` | number | Yes | Number of instruments in collection |
| `tags` | string[] | No | Searchable tags |
| `isDefault` | boolean | No | Is this the default collection? |

---

## Collection File Format

### Standard Format

Each collection JSON file follows this structure:

```json
{
  "name": "Doom (Bobby Prince v1)",
  "version": "1.0",
  "source": "https://github.com/Wohlstand/libADLMIDI",
  "license": "MIT",
  "author": "Bobby Prince",
  "game": "Doom",
  "year": 1993,
  "instruments": [
    {
      "id": 0,
      "name": "Acoustic Grand Piano",
      "voice1": {
        "mod": { /* operator data */ },
        "car": { /* operator data */ },
        "feedback": 7,
        "additive": true,
        "baseNote": -12
      },
      "voice2": {
        "mod": { /* operator data */ },
        "car": { /* operator data */ },
        "feedback": 7,
        "additive": true,
        "baseNote": -12
      }
    }
    // ... more instruments
  ]
}
```

### Metadata Fields

**Collection Metadata:**
- `name` - Display name
- `version` - Collection version
- `source` - Source URL
- `license` - License information
- `author` - Original creator
- `game` - Associated game (optional)
- `year` - Year of creation (optional)

**Instrument Array:**
- Same format as current GENMIDI.json
- `id` should be 0-127 for General MIDI compatibility
- Maintains dual-voice support

---

## Implementation Plan

### Phase 1: Catalog System

**Goal:** Add catalog support without breaking existing code

1. **Create catalog.json**
   - Define catalog structure
   - Add entry for existing GENMIDI.json
   - Set as default collection

2. **Update Instrument Loader**
   - Add `loadCatalog()` function
   - Keep `loadInstrumentBank()` backward compatible
   - Add `loadCollection(collectionId)` function

3. **Test Backward Compatibility**
   - Ensure existing code still works
   - GENMIDI.json loads as default
   - No breaking changes

### Phase 2: Add DMX Collections (Option 1)

**Goal:** Add 6 DMX collections from libADLMIDI

1. **Download DMX .op2 files**
   - doom1.op2, doom2.op2, heretic.op2, hexen.op2, raptor.op2, strife.op2

2. **Convert to JSON**
   - Use existing convertDMXOPL.js script
   - Generate separate JSON files

3. **Organize Files**
   - Create `dmx/` subdirectory
   - Move converted JSON files

4. **Update Catalog**
   - Add entries for all DMX collections
   - Set metadata, tags, descriptions

### Phase 3: UI Integration

**Goal:** Allow users to select collections

1. **Add Collection Selector**
   - Dropdown or modal for selecting collections
   - Show collection name, description, instrument count
   - Filter by category/tags

2. **Update Instrument Selector**
   - Show current collection name
   - Allow switching between collections
   - Persist selection in localStorage

3. **Add Collection Info Display**
   - Show metadata (author, game, year)
   - Link to source
   - Display license information

### Phase 4: Additional Collections

**Goal:** Expand library with more collections

1. **Add AIL Collections** (Option 1)
   - Warcraft 2, Star Control 3, etc.

2. **Add WOPL Collections** (Option 2)
   - Parse WOPL format
   - Convert to JSON
   - Add to catalog

3. **Add SBI Collections** (Option 3)
   - Parse individual SBI files
   - Group into themed collections
   - Add to catalog

---

## UI/UX Considerations

### Collection Selector UI

**Location Options:**
1. **Dropdown in Tracker Header**
   - Quick access
   - Doesn't take much space
   - Good for frequently switching

2. **Modal Dialog**
   - More space for metadata
   - Search and filter options
   - Better for browsing

3. **Dedicated Settings Panel**
   - Persistent UI
   - Room for advanced options
   - Better for configuration

**Recommended:** Combination of dropdown for quick access + modal for browsing

### User Flow

1. **Default Experience**
   - App loads with default collection (GENMIDI)
   - User can start creating immediately
   - No breaking changes

2. **Discovering Collections**
   - Prominent "Browse Collections" button
   - Visual cards with collection info
   - Preview/demo for each collection

3. **Switching Collections**
   - Easy dropdown in header
   - Preserves pattern data
   - Re-loads instruments from new collection

4. **Per-Track Collections** (Advanced)
   - Each track can use different collection
   - More complex but very powerful
   - Future enhancement

---

## File Naming Conventions

### Collection Files

**Format:** `{game-or-source}.json`

**Examples:**
- `doom1.json` - Doom 1
- `doom2.json` - Doom 2
- `warcraft2.json` - Warcraft 2
- `descent.json` - Descent
- `bisqwit.json` - Bisqwit's collection

**Rules:**
- Lowercase
- Hyphenate multi-word names
- No spaces or special characters
- Use full name if no abbreviation is standard

### Directory Names

**Format:** `{category}/`

**Standard Categories:**
- `dmx/` - DMX format collections
- `ail/` - AIL Sound System
- `hmi/` - HMI Sound System
- `apogee/` - Apogee Sound System
- `community/` - Community-created
- `legacy/` - Backward compatibility

---

## Backward Compatibility

### Maintaining Compatibility

**Requirements:**
- Existing code must continue to work
- GENMIDI.json remains in place (or moved to legacy/)
- Default behavior unchanged
- No breaking API changes

**Strategy:**
1. Keep `public/instruments/GENMIDI.json` or move to `legacy/GENMIDI.json`
2. Update `loadInstrumentBank()` to check catalog first
3. Fall back to direct file load if catalog not found
4. Log deprecation warnings for old approach

### Migration Path

**For Users:**
- No action required
- App continues to work as before
- New features available when ready

**For Developers:**
- Old API still works
- New catalog API preferred
- Documentation updated
- Migration guide provided

---

## Performance Considerations

### Lazy Loading

**Strategy:** Only load collections when needed

```typescript
// Load catalog immediately (small file)
const catalog = await loadCatalog();

// Load collection on demand
async function selectCollection(collectionId: string) {
  const collection = catalog.collections.find(c => c.id === collectionId);
  const instruments = await fetch(collection.path).then(r => r.json());
  return instruments;
}
```

### Caching

**Strategy:** Cache loaded collections in memory

```typescript
const collectionCache = new Map<string, InstrumentCollection>();

async function loadCollection(collectionId: string) {
  if (collectionCache.has(collectionId)) {
    return collectionCache.get(collectionId);
  }

  const collection = await fetchCollection(collectionId);
  collectionCache.set(collectionId, collection);
  return collection;
}
```

### File Size

**Per Collection:**
- GENMIDI.json: ~200 KB (128 instruments)
- Average collection: ~150-250 KB
- Catalog.json: ~5-10 KB

**Total Library:**
- 20 collections × 200 KB = ~4 MB total
- Only default collection loaded initially
- Others loaded on demand

---

## Testing Strategy

### Unit Tests

1. **Catalog Loading**
   - Test catalog.json parsing
   - Test collection lookup by ID
   - Test default collection selection

2. **Collection Loading**
   - Test individual collection loading
   - Test instrument data validation
   - Test cache behavior

3. **Backward Compatibility**
   - Test legacy GENMIDI.json loading
   - Test fallback behavior
   - Test migration scenarios

### Integration Tests

1. **UI Integration**
   - Test collection selector
   - Test switching between collections
   - Test instrument playback from different collections

2. **Performance**
   - Measure load times
   - Test with 20+ collections
   - Test cache effectiveness

---

## Future Enhancements

### Per-Track Collections

**Concept:** Each track can use a different collection

```typescript
interface TrackConfiguration {
  trackId: number;
  collectionId: string;
  instrumentId: number;
}
```

**Benefits:**
- Mix Doom bass with Warcraft melody
- More creative freedom
- Unique soundscapes

**Challenges:**
- More complex UI
- More memory usage
- Potential for confusion

### User-Created Collections

**Concept:** Users can create and share custom collections

**Features:**
- Export custom instruments as collection
- Import user collections
- Share via URL/file
- Community marketplace

### Collection Bundles

**Concept:** Download multiple related collections as a bundle

**Examples:**
- "id Software Bundle" (Doom, Doom 2, Hexen)
- "Sierra Games Bundle" (Space Quest, King's Quest)
- "Epic Games Bundle" (Unreal, Jazz Jackrabbit)

---

## Summary

### Benefits of Multi-Collection Architecture

✅ **Organization** - Collections grouped by theme/game/source
✅ **Performance** - Load only what you need
✅ **Scalability** - Easy to add new collections
✅ **User Choice** - Users can select their preferred sounds
✅ **Discovery** - Browse and explore different collections
✅ **Metadata** - Rich information about each collection
✅ **Backward Compatible** - Existing code still works

### Implementation Phases

1. **Phase 1:** Catalog system (1-2 days)
2. **Phase 2:** DMX collections (2-3 days)
3. **Phase 3:** UI integration (3-5 days)
4. **Phase 4:** Additional collections (ongoing)

### Recommended First Steps

1. Create catalog.json with current GENMIDI entry
2. Implement catalog loader in App.tsx
3. Test backward compatibility
4. Add first 2-3 DMX collections
5. Build collection selector UI
6. Expand library gradually

---

**Last Updated:** 2025-01-11
