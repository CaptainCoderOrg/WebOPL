# WebOrchestra - Tracker System Documentation

**Last Updated:** 2025-11-12

---

## Table of Contents

1. [SimplePlayer Overview](#simpleplayer-overview)
2. [Pattern Format](#pattern-format)
3. [Extended Tracker Format](#extended-tracker-format)
4. [Timing System](#timing-system)
5. [Tracker UI Components](#tracker-ui-components)
6. [Pattern Loading](#pattern-loading)
7. [Pattern Validation](#pattern-validation)

---

## SimplePlayer Overview

`SimplePlayer` handles pattern playback with accurate BPM-based timing.

### File Location
[minimal-prototype/src/SimplePlayer.ts](../minimal-prototype/src/SimplePlayer.ts)

### Class Structure

```typescript
export class SimplePlayer {
  private synth: SimpleSynth;
  private pattern: TrackerPattern | null = null;
  private isPlaying: boolean = false;
  private currentRow: number = 0;
  private intervalId: number | null = null;
  private onRowChange?: (row: number) => void;
  private activeNotes: Map<number, number> = new Map();

  constructor(synth: SimpleSynth) {
    this.synth = synth;
  }
}
```

### Public API

```typescript
// Pattern management
player.loadPattern(pattern: TrackerPattern): void

// Playback control
player.play(): void           // Start playback
player.pause(): void          // Pause (keeps position)
player.stop(): void           // Stop and reset to row 0

// State queries
player.playing(): boolean
player.getCurrentRow(): number

// BPM control
player.setBPM(newBPM: number): void

// UI updates
player.setOnRowChange(callback: (row: number) => void): void
```

---

## Pattern Format

### TrackerPattern Type

```typescript
export interface TrackerPattern {
  rows: TrackerNote[][];  // [row][track] - 2D array
  bpm: number;            // Beats per minute (60-240)
  stepsPerBeat: number;   // Rows per beat (4 = 16th notes)
}
```

### TrackerNote Type

```typescript
export interface TrackerNote {
  note: number | null;    // MIDI note number, null = rest
  instrument: number;     // Instrument ID (currently unused)
}
```

### Example Pattern

```typescript
const pattern: TrackerPattern = {
  bpm: 120,
  stepsPerBeat: 4, // 16th notes
  rows: [
    // Row 0: All tracks play notes
    [
      { note: 60, instrument: 0 }, // Track 0: C-4
      { note: 64, instrument: 1 }, // Track 1: E-4
      { note: 67, instrument: 2 }, // Track 2: G-4
      { note: 48, instrument: 3 }, // Track 3: C-3 (bass)
    ],
    // Row 1: Sustain (all nulls)
    [
      { note: null, instrument: 0 },
      { note: null, instrument: 0 },
      { note: null, instrument: 0 },
      { note: null, instrument: 0 },
    ],
    // ... more rows
  ]
};
```

### Special Note Values

| Value | Meaning | Symbol |
|-------|---------|--------|
| `null` | Rest/Sustain | `---` |
| `-1` | Note Off | `OFF` |
| `0-127` | MIDI note | `C-4`, `D#5`, etc. |

---

## Extended Tracker Format

**Added:** 2025-11-12 (All phases complete)

WebOPL now supports an extended tracker format that preserves full musical expression from MIDI files, including velocity, note-off timing, polyphony, and effect commands.

### Overview

The extended format addresses critical data loss that occurred during MIDI-to-tracker conversion:

- **Velocity Control** - Per-note volume for dynamics and accents
- **Note-Off Markers** - Explicit note duration control
- **Dynamic Polyphony** - Multiple simultaneous notes per MIDI channel
- **Effect Commands** - Sub-row timing precision (note delay, note cut)

### YAML Pattern Format

#### Simple Format (Backward Compatible)

```yaml
name: "Simple Example"
bpm: 120
instruments: [0, 1, 2, 999]
pattern:
  - ["C-4", "---", "E-4", "---"]
  - ["---", "D-4", "---", "C-1"]
  - ["E-4", "---", "G-4", "OFF"]
```

#### Extended Format (Object Notation)

```yaml
name: "Extended Example"
bpm: 120
rowsPerBeat: 4        # Default: 4 (16th notes), can be 8, 16, etc.
ticksPerRow: 6        # Default: 6 (for timing precision)
instruments: [0, 1, 2, 999]

pattern:
  # Row 0: Various velocity levels
  - [
      {n: "C-4", v: 48},           # Note with velocity 48/64
      {n: "---"},                  # Empty cell
      {n: "E-4", v: 64},           # Full velocity
      {n: "C-1", v: 32}            # Quiet note
    ]

  # Row 1: Note-off and delay effects
  - [
      {n: "---"},
      {n: "D-4", v: 56, fx: "ED3"}, # Delay by 3 ticks (swing)
      {n: "OFF"},                    # Explicit note-off
      {n: "---"}
    ]

  # Row 2: Note cut effect
  - [
      {n: "E-4", v: 60, fx: "EC8"}, # Note cut after 8 ticks
      {n: "---"},
      {n: "G-4", v: 50, fx: "ED1"}, # Delayed start
      {n: "D-1", v: 40}
    ]
```

#### Hybrid Format

Cells can mix simple strings and objects in the same pattern:

```yaml
pattern:
  - ["C-4", {n: "D-4", v: 48}, "E-4", "---"]
  - ["---", "D-4", {n: "OFF"}, "C-1"]
```

### Cell Specification

#### Note Cell Fields

| Field | Type | Range | Required | Description |
|-------|------|-------|----------|-------------|
| `n` | string | Note or `"---"` or `"OFF"` | Yes | Note name or command |
| `v` | number | 0-64 | No | Velocity/volume (default: 64 = full) |
| `fx` | string | Effect code | No | Effect command (e.g., "EC8", "ED3") |

#### Velocity Range

- **0-64**: Linear volume scale (matches S3M/XM conventions)
- **0** = Silent (note cut)
- **32** = Half volume (-6 dB)
- **64** = Full volume (0 dB, default if omitted)
- Maps to OPL3 attenuation: `attenuation = 63 - velocity`

#### Effect Commands

| Effect | Parameters | Description | Example |
|--------|------------|-------------|---------|
| `ECx` | x = 0-F (hex) | **Note cut** at tick x | `"EC8"` = Cut after 8 ticks |
| `EDx` | x = 0-F (hex) | **Note delay** by x ticks | `"ED4"` = Delay by 4 ticks |

### Dynamic Polyphony

The MIDI converter automatically allocates multiple output tracks when it detects:

1. **Track conflicts** - Multiple MIDI tracks writing to the same channel
2. **Polyphonic events** - Multiple simultaneous notes on one MIDI channel (chords, harmonies)

**Example:** Doom E1M1 conversion results:
- 11 output tracks (from 4 MIDI channels)
- Percussion channel: 1 → 5 tracks (up to 5 simultaneous drum hits)
- Guitar channels: 2 → 4 tracks (preserves all harmonies)
- Total polyphonic events preserved: 805

### Pattern Metadata

Extended patterns can include additional metadata fields:

```yaml
name: "Pattern Name"
bpm: 120              # Beats per minute
rowsPerBeat: 4        # Rows per beat (4 = 16th notes, 8 = 32nd notes)
ticksPerRow: 6        # Ticks per row (for effect timing)
instruments: [0, 1, 2, 999]  # Instrument ID for each track
```

### Implementation Details

#### Files Modified

**Core Implementation:**
- [minimal-prototype/src/utils/patternLoader.ts](../minimal-prototype/src/utils/patternLoader.ts) - Parse object cells, extract velocity/effects
- [minimal-prototype/src/SimplePlayer.ts](../minimal-prototype/src/SimplePlayer.ts) - Handle velocity, note-offs, effect commands
- [minimal-prototype/src/SimpleSynth.ts](../minimal-prototype/src/SimpleSynth.ts) - Apply velocity to OPL3 attenuation
- [minimal-prototype/scripts/convertMIDIToPattern.js](../minimal-prototype/scripts/convertMIDIToPattern.js) - Dynamic track allocation, write velocity/note-offs

#### Backward Compatibility

The extended format is fully backward compatible:

1. **Simple strings remain valid** - No breaking changes to existing patterns
2. **Default values omitted** - Velocity defaults to 64 (full volume)
3. **Progressive parsing** - Parser tries object notation, falls back to string
4. **Version detection** - Infer format from cell types

### Test Patterns

Example test patterns demonstrating the extended format:

- **velocity-ramp-test.yaml** - Velocity levels 16, 32, 48, 64
- **velocity-multi-test.yaml** - Multiple tracks with varying dynamics
- **noteoff-test.yaml** - Explicit note-off markers for short/long notes
- **e1m1-polyphony.yaml** - Full Doom E1M1 with polyphony preserved (2,332 notes, 11 tracks)

### Success Metrics

The extended format successfully restores musical data lost during MIDI conversion:

- ✅ **Velocity**: 100% of velocity data preserved (was 100% loss)
- ✅ **Duration**: 100% of note-off timing preserved (was 100% loss)
- ✅ **Polyphony**: 805 polyphonic events preserved in E1M1 (was total loss)
- ✅ **Track conflicts**: All MIDI tracks preserved (was ~50% loss)
- ✅ **Timing**: Sub-row precision via effect commands

**Result**: WebOPL can now produce authentic-sounding Doom music with proper dynamics, articulation, and musical expression.

---

## Timing System

### BPM to Milliseconds

```typescript
private calculateMsPerRow(): number {
  // BPM = beats per minute
  // stepsPerBeat = rows per beat (4 for 16th notes)
  //
  // Example: 120 BPM, 4 steps/beat
  // → 120 beats/min = 2 beats/sec
  // → 2 beats/sec × 4 steps/beat = 8 steps/sec
  // → 1000ms / 8 steps = 125ms per step

  const beatsPerSecond = this.pattern.bpm / 60;
  const stepsPerSecond = beatsPerSecond * this.pattern.stepsPerBeat;
  const msPerStep = 1000 / stepsPerSecond;

  return msPerStep;
}
```

### Timing Examples

| BPM | Steps/Beat | Steps/Sec | ms/Row |
|-----|------------|-----------|--------|
| 60  | 4          | 4         | 250ms  |
| 90  | 4          | 6         | 167ms  |
| 120 | 4          | 8         | 125ms  |
| 150 | 4          | 10        | 100ms  |
| 180 | 4          | 12        | 83ms   |
| 240 | 4          | 16        | 63ms   |

### Playback Loop

```typescript
play() {
  this.isPlaying = true;
  this.synth.start();

  const msPerRow = this.calculateMsPerRow();
  console.log(`Timing: ${msPerRow.toFixed(2)}ms per row at ${this.pattern.bpm} BPM`);

  // Play first row immediately
  this.playRow();

  // Schedule subsequent rows
  this.intervalId = window.setInterval(() => {
    this.playRow();
  }, msPerRow);
}
```

### Row Processing

```typescript
private playRow() {
  // Loop back to start if at end
  if (this.currentRow >= this.pattern.rows.length) {
    this.currentRow = 0;
  }

  const row = this.pattern.rows[this.currentRow];

  // Process each track
  row.forEach((trackNote, trackIndex) => {
    const note = trackNote.note;

    if (note === null) {
      // null = sustain previous note, do nothing
      return;
    }

    if (note === -1) {
      // -1 = note off
      const activeNote = this.activeNotes.get(trackIndex);
      if (activeNote !== undefined) {
        this.synth.noteOff(trackIndex, activeNote);
        this.activeNotes.delete(trackIndex);
      }
      return;
    }

    // note >= 0 = play new note
    // First stop previous note on this track
    const activeNote = this.activeNotes.get(trackIndex);
    if (activeNote !== undefined) {
      this.synth.noteOff(trackIndex, activeNote);
    }

    // Then play new note
    this.synth.noteOn(trackIndex, note, 100);
    this.activeNotes.set(trackIndex, note);
  });

  // Notify UI
  if (this.onRowChange) {
    this.onRowChange(this.currentRow);
  }

  // Advance to next row
  this.currentRow++;
}
```

---

## Tracker UI Components

### Tracker Component

**File:** [minimal-prototype/src/components/Tracker.tsx](../minimal-prototype/src/components/Tracker.tsx)

**Purpose:** Main tracker interface integrating all sub-components

**State:**
```typescript
const [isPlaying, setIsPlaying] = useState(false);
const [currentRow, setCurrentRow] = useState(0);
const [bpm, setBpm] = useState(120);
const [numTracks, setNumTracks] = useState(4);
const [numRows, setNumRows] = useState(16);
const [pattern, setPattern] = useState<string[][]>([...]);
const [trackInstruments, setTrackInstruments] = useState<number[]>([...]);
```

**Key Features:**
- Play/Stop/Pause controls
- BPM slider (60-240)
- Row counter display
- Pattern load/clear buttons
- Track count selector (4, 8, 16)
- Row count selector (8, 16, 32, 64, 128)
- Compact mode toggle

### TrackerGrid Component

**File:** [minimal-prototype/src/components/TrackerGrid.tsx](../minimal-prototype/src/components/TrackerGrid.tsx)

**Purpose:** Editable note grid with keyboard navigation

**Props:**
```typescript
interface TrackerGridProps {
  rows: number;             // Number of rows (8-128)
  tracks: number;           // Number of tracks (4-16)
  pattern: string[][];      // Current pattern data
  onUpdate: (pattern: string[][]) => void;
  currentRow?: number;      // Highlight row during playback
  compactMode?: boolean;    // Narrow column mode
}
```

**Features:**
- Cell-based editing (input elements)
- Keyboard navigation:
  - Arrow keys: Move between cells
  - Enter: Move down
  - Tab: Move right
  - Delete: Clear cell to "---"
- Auto-focus first cell on mount
- Auto-select text on focus
- Real-time validation highlighting
- Current row highlighting (green background)

**Validation:**
```typescript
function isInvalidNote(note: string): boolean {
  if (note === '---' || note === '' || note === 'OFF') {
    return false;
  }
  return noteNameToMIDI(note) === null;
}
```

### InstrumentSelector Component

**File:** [minimal-prototype/src/components/InstrumentSelector.tsx](../minimal-prototype/src/components/InstrumentSelector.tsx)

**Purpose:** Dropdown to select instrument for a track

**Props:**
```typescript
interface InstrumentSelectorProps {
  trackId: number;
  selectedPatchId: number;
  instrumentBank: OPLPatch[];
  onSelect: (trackId: number, patchId: number) => void;
  onEdit: (trackId: number) => void;
}
```

**Features:**
- Dropdown with all instruments
- Shows patch name and ID
- Edit button to open instrument editor
- Real-time patch changes

---

## Pattern Loading

### Pattern File Format

**File:** [minimal-prototype/src/types/PatternFile.ts](../minimal-prototype/src/types/PatternFile.ts)

```typescript
export interface PatternFile {
  name: string;           // Pattern name
  description?: string;   // Optional description
  author?: string;        // Optional author
  bpm: number;           // Beats per minute
  stepsPerBeat: number;  // Rows per beat (usually 4)
  rows: PatternRow[];    // Array of rows
}

export interface PatternRow {
  [trackIndex: string]: string; // "0": "C-4", "1": "E-4", etc.
}
```

### Example JSON Pattern

```json
{
  "name": "Major Scale",
  "description": "C major scale demonstration",
  "author": "WebOrchestra",
  "bpm": 120,
  "stepsPerBeat": 4,
  "rows": [
    { "0": "C-4" },
    { "0": "D-4" },
    { "0": "E-4" },
    { "0": "F-4" },
    { "0": "G-4" },
    { "0": "A-4" },
    { "0": "B-4" },
    { "0": "C-5" }
  ]
}
```

### Pattern Catalog

**File:** `public/patterns/catalog.json`

```json
{
  "patterns": [
    {
      "id": "major-scale",
      "name": "Major Scale",
      "description": "C major scale",
      "file": "major-scale.json"
    },
    {
      "id": "chord-progression",
      "name": "Chord Progression",
      "description": "I-IV-V-I progression",
      "file": "chord-progression.json"
    }
  ]
}
```

### Loading Process

```typescript
// 1. Load catalog
const catalog = await loadPatternCatalog();

// 2. Load specific pattern
const patternFile = await loadPattern(catalog[0].file);

// 3. Convert to TrackerPattern
const pattern: TrackerPattern = {
  bpm: patternFile.bpm,
  stepsPerBeat: patternFile.stepsPerBeat,
  rows: patternFile.rows.map(row => {
    const track: TrackerNote[] = [];
    for (let t = 0; t < numTracks; t++) {
      const noteStr = row[t.toString()] || '---';
      const midiNote = noteNameToMIDI(noteStr);
      track.push({
        note: midiNote,
        instrument: 0
      });
    }
    return track;
  })
};

// 4. Load into player
player.loadPattern(pattern);
```

---

## Pattern Validation

### Validation System

**File:** [minimal-prototype/src/utils/patternValidation.ts](../minimal-prototype/src/utils/patternValidation.ts)

### Validation Functions

```typescript
// Validate entire pattern
export function validatePattern(pattern: string[][]): ValidationResult {
  const errors: ValidationError[] = [];

  pattern.forEach((row, rowIndex) => {
    row.forEach((note, trackIndex) => {
      if (!validateNote(note)) {
        errors.push({
          row: rowIndex,
          track: trackIndex,
          note,
          message: `Invalid note: "${note}"`
        });
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Validate single note
export function validateNote(note: string): boolean {
  // Valid rest notations
  if (note === '---' || note === '' || note === 'OFF') {
    return true;
  }

  // Check if valid note name
  const midiNote = noteNameToMIDI(note);
  return midiNote !== null;
}

// Format errors for display
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return 'Pattern is valid';
  }

  const lines = errors.map(err =>
    `Row ${err.row}, Track ${err.track}: ${err.message}`
  );

  return lines.join('\n');
}
```

### UI Integration

```typescript
// In Tracker component
function handlePlay() {
  // Convert pattern to TrackerPattern
  const converted = convertToTrackerPattern(pattern);

  // Validate
  const validation = validatePattern(pattern);

  if (!validation.isValid) {
    const errorMsg = formatValidationErrors(validation.errors);
    alert(`Cannot play: Pattern has errors\n\n${errorMsg}`);
    return;
  }

  // Play
  player.loadPattern(converted);
  player.play();
  setIsPlaying(true);
}
```

### Visual Feedback

```typescript
// In TrackerGrid component
<input
  value={cell}
  onChange={handleChange}
  className={isInvalidNote(cell) ? 'invalid' : ''}
  title={isInvalidNote(cell) ? 'Invalid note' : ''}
/>
```

**CSS:**
```css
.tracker-grid input.invalid {
  color: #ff4444;
  background-color: #ffeeee;
}

.tracker-grid input.invalid:focus {
  outline-color: #ff4444;
}
```

---

## Note Conversion

### File Location
[minimal-prototype/src/utils/noteConversion.ts](../minimal-prototype/src/utils/noteConversion.ts)

### Functions

```typescript
// Convert note name to MIDI number
export function noteNameToMIDI(noteName: string): number | null {
  // Supports: "C-4", "C4", "C#4", "Db4"
  // Returns: MIDI number (0-127) or null if invalid
}

// Convert MIDI number to note name
export function midiToNoteName(midiNote: number): string {
  // Returns: "C-4", "C#4", etc.
}

// Validate note name format
export function isValidNoteName(noteName: string): boolean {
  return noteNameToMIDI(noteName) !== null;
}

// Normalize note name format
export function formatNoteName(noteName: string): string {
  // "c4" → "C-4"
  // "C#4" → "C#4"
  // "db5" → "Db5"
}
```

### Octave Range

- **Lowest:** C-0 (MIDI 12)
- **Middle C:** C-4 (MIDI 60)
- **Highest:** G-9 (MIDI 127)

### Note Name Formats

| Format | Example | Supported |
|--------|---------|-----------|
| Standard | `C-4` | ✅ |
| No dash | `C4` | ✅ |
| Sharp | `C#4` | ✅ |
| Flat | `Db4` | ✅ |
| Rest | `---` | ✅ |
| Empty | `` | ✅ (treated as `---`) |
| Note Off | `OFF` | ✅ |

---

## Next: See [INSTRUMENT_SYSTEM.md](INSTRUMENT_SYSTEM.md) for instrument documentation
