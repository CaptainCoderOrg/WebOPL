# Tracker Format Extension Plan

## Implementation Status

| Phase | Status | Completion Date |
|-------|--------|-----------------|
| **Phase 1: Velocity Support** | ✅ **COMPLETE** | 2025-11-12 |
| **Phase 2: Note-Off Support** | ✅ **COMPLETE** | 2025-11-12 |
| **Phase 3: Track Allocation Rewrite** | ✅ **COMPLETE** | 2025-11-12 |
| **Phase 4: Effect Commands** | 🟡 Next | - |

**Last Updated**: 2025-11-12

---

## Overview

This document outlines the plan to extend WebOPL's tracker format to support advanced musical expression features that are currently lost during MIDI conversion. The goal is to match the expressiveness of original Doom music while maintaining the tracker workflow and aesthetic.

---

## Background

### Current Limitations

As documented in [MIDI-CONVERSION-ISSUES-SUMMARY.md](MIDI-CONVERSION-ISSUES-SUMMARY.md), our current tracker format loses critical musical data:

1. **Velocity/Volume** - All notes play at identical volume (100% data loss)
2. **Note Duration** - Notes sustain incorrectly without note-offs (100% data loss)
3. **Track Conflicts** - Multiple MIDI tracks on same channel overwrite each other (~50% of E1M1 guitar tracks lost)
4. **Polyphony Loss** - Multiple simultaneous notes per channel (chords, harmonies) overwrite each other (unknown % data loss)
5. **Timing Precision** - 16th note quantization loses groove and swing (~20% precision loss)

### Research Findings

Investigation of traditional tracker formats (MOD, XM, S3M, IT) revealed that **trackers have proven solutions for all these issues**:

- **Per-note volume columns** for velocity control (S3M: 0-64, XM: 0-64)
- **ECx effect** for note cut (explicit note-off at tick precision)
- **EDx effect** for note delay (sub-row timing for swing/humanization)
- **Automatic track splitting** for polyphony (multiple notes per channel → multiple output tracks)
- **Adjustable resolution** with rows-per-beat and ticks-per-row

**Conclusion**: Extending the tracker format is more efficient than building a piano roll, maintains project aesthetic, and can handle all MIDI features including polyphony.

---

## Design Goals

1. **Backward Compatibility** - Existing simple patterns continue to work
2. **Progressive Enhancement** - Features can be adopted incrementally
3. **Human Readable** - YAML remains text-based and editable
4. **Minimal File Size** - Omit default values, support shorthand notation
5. **Proven Patterns** - Follow established tracker conventions (XM/IT/S3M)

---

## File Format Specification

### Current Format (Simple Notation)

```yaml
name: "Simple Example"
bpm: 120
instruments: [0, 1, 2, 999]
pattern:
  - ["C-4", "---", "E-4", "---"]
  - ["---", "D-4", "---", "C-1"]
  - ["E-4", "---", "G-4", "OFF"]
```

### Extended Format (Object Notation)

```yaml
name: "Extended Example"
bpm: 120
rowsPerBeat: 4        # Default: 4 (16th notes), can be 8 (32nd), 16 (64th)
ticksPerRow: 6        # Default: 6 (for timing precision)
instruments: [0, 1, 2, 999]

pattern:
  # Row 0: Various velocity levels
  - [
      {n: "C-4", v: 48},           # Note, velocity 48/64
      {n: "---"},                  # Empty cell (no note)
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
      {n: "E-4", v: 60, fx: "EC8"}, # Note cut after 8 ticks (short note)
      {n: "---"},
      {n: "G-4", v: 50, fx: "ED1"}, # Delayed start
      {n: "D-1", v: 40}
    ]
```

### Hybrid Format (Backward Compatible)

Cells can mix simple strings and objects in the same pattern:

```yaml
pattern:
  - ["C-4", {n: "D-4", v: 48}, "E-4", "---"]  # Mix simple and extended
  - ["---", "D-4", {n: "OFF"}, "C-1"]         # Simple with explicit OFF
```

---

## Cell Specification

### Note Cell Fields

| Field | Type | Range | Required | Description |
|-------|------|-------|----------|-------------|
| `n` | string | Note or `"---"` or `"OFF"` | Yes | Note name or command |
| `v` | number | 0-64 | No | Velocity/volume (default: 64 = full) |
| `fx` | string | Effect code | No | Effect command (e.g., "EC8", "ED3") |

### Note Values

- **Pitched notes**: `"C-4"`, `"D#3"`, `"Gb5"` - Standard note names
- **Empty cell**: `"---"` - No event (default)
- **Note-off**: `"OFF"` - Explicit note release

### Velocity Range

- **0-64**: Linear volume scale (matches S3M/XM conventions)
- **0** = Silent (note cut)
- **32** = Half volume (-6 dB)
- **64** = Full volume (0 dB, default if omitted)
- Maps to OPL3 attenuation: `attenuation = 63 - velocity`

### Effect Commands (Initial Set)

| Effect | Parameters | Description | Example |
|--------|------------|-------------|---------|
| `ECx` | x = 0-F (hex) | **Note cut** at tick x | `"EC8"` = Cut after 8 ticks |
| `EDx` | x = 0-F (hex) | **Note delay** by x ticks | `"ED4"` = Delay by 4 ticks |

**Future extensions**: Could add pitch slide, vibrato, arpeggio, etc.

---

## Implementation Phases

### Phase 1: Velocity Support ✅ COMPLETE

**Goal**: Per-note volume control for dynamics and accents

**Impact**: Restores 100% of lost velocity data, makes drums sound alive

**Status**: ✅ **COMPLETE** (2025-11-12)
- All TypeScript/JavaScript code updated
- MIDI converter writes velocity to YAML
- Real-time playback and WAV export support velocity
- Test patterns created and verified
- Backward compatibility maintained

#### 1.1 Update Pattern Loader

**File**: `minimal-prototype/src/utils/patternLoader.ts`

**Changes**:
- Parse cell as either `string` or `{n, v?, fx?}` object
- Extract velocity field, default to 64 if omitted
- Pass velocity to player

```typescript
// Add to PatternCell type
export interface PatternCell {
  note: string;
  velocity?: number;  // 0-64, default 64
  effect?: string;    // Effect command (e.g., "EC8")
}

// Update parsePattern to handle objects
function parseCell(cell: string | object): PatternCell {
  if (typeof cell === 'string') {
    return { note: cell, velocity: 64 };
  }
  return {
    note: cell.n || '---',
    velocity: cell.v !== undefined ? cell.v : 64,
    effect: cell.fx
  };
}
```

#### 1.2 Update Pattern Player

**File**: `minimal-prototype/src/PatternPlayer.ts`

**Changes**:
- Accept velocity parameter from pattern
- Pass velocity to `SimpleSynth.noteOn()`

```typescript
// In playRow():
const cell = pattern[row][channel];
const velocity = cell.velocity || 64;

if (cell.note !== '---' && cell.note !== 'OFF') {
  synth.noteOn(channel, midiNote, velocity);
}
```

#### 1.3 Update SimpleSynth

**File**: `minimal-prototype/src/SimpleSynth.ts`

**Changes**:
- Add velocity parameter to `noteOn()` method
- Scale carrier attenuation based on velocity
- Preserve original instrument attenuation, apply velocity as modifier

```typescript
// Update signature
public noteOn(channel: number, midiNote: number, velocity: number = 64): void {
  // ... existing code ...

  // Scale attenuation based on velocity
  // velocity 64 = full (0 dB), velocity 32 = -6 dB, velocity 0 = -48 dB
  const velocityAttenuation = Math.round((64 - velocity) * 0.75);
  const baseAttenuation = carrier.out;
  const finalAttenuation = Math.min(63, baseAttenuation + velocityAttenuation);

  this.writeOPL(0x40 + carrierOffset,
    (carrier.ksl << 6) | finalAttenuation
  );

  // ... rest of note-on logic ...
}
```

#### 1.4 Update MIDI Converter

**File**: `minimal-prototype/scripts/convertMIDIToPattern.js`

**Changes**:
- Line 472: Write velocity to YAML instead of discarding
- Output object notation when velocity ≠ 64

```javascript
// Current (line 472):
notes.push(row[trackIdx].note || '---');

// New:
const cell = row[trackIdx];
if (!cell) {
  notes.push('---');
} else if (cell.volume === 64) {
  notes.push(cell.note);  // Simple string for default velocity
} else {
  notes.push({ n: cell.note, v: cell.volume });  // Object for custom velocity
}
```

#### 1.5 Testing

1. Create test pattern with varying velocities
2. Verify volume scaling in WAV export
3. Test MIDI conversion preserves velocity data
4. Compare E1M1 drums with/without velocity
5. Verify backward compatibility with simple string patterns

---

### Phase 2: Note-Off Support ✅ COMPLETE

**Goal**: Proper note duration control and articulation

**Impact**: Restores 100% of lost duration data, percussion sounds crisp

**Status**: ✅ **COMPLETE** (2025-11-12)
- MIDI converter writes "OFF" markers to YAML
- E1M1 conversion includes 1,123 note-offs
- Test pattern created (noteoff-test.yaml)
- Note-off pipeline already functional (CellProcessor, SimplePlayer)

#### 2.1 Update Pattern Loader

**File**: `minimal-prototype/src/utils/patternLoader.ts`

**Changes**:
- Recognize `"OFF"` as explicit note-off command
- Pass to player

(Already handled by Phase 1 parser)

#### 2.2 Update Pattern Player

**File**: `minimal-prototype/src/PatternPlayer.ts`

**Changes**:
- Detect `"OFF"` notes and call `noteOff()`

```typescript
// In playRow():
if (cell.note === 'OFF') {
  synth.noteOff(channel);
} else if (cell.note !== '---') {
  const velocity = cell.velocity || 64;
  synth.noteOn(channel, midiNote, velocity);
}
```

#### 2.3 Update MIDI Converter

**File**: `minimal-prototype/scripts/convertMIDIToPattern.js`

**Changes**:
- Lines 302-308: Write note-off events to YAML
- Track active notes and insert `"OFF"` at note-off time

```javascript
// When processing note-off events:
if (event.eventName === 'noteOff') {
  const row = noteOffToRow(event.time);
  if (!rows[row]) rows[row] = {};

  rows[row][channel] = { note: 'OFF' };
}
```

#### 2.4 SimpleSynth Enhancement (Optional)

**File**: `minimal-prototype/src/SimpleSynth.ts`

**Changes**:
- Improve `noteOff()` to trigger release phase properly
- Ensure envelopes complete release cycle

(May already work correctly, verify in testing)

#### 2.5 Testing

1. Create pattern with explicit note-offs
2. Verify notes stop at correct time
3. Test percussion durations (short kicks, sustained cymbals)
4. Convert E1M1 MIDI and verify note-offs present
5. Test WAV export captures correct durations

---

### Phase 3: Track Allocation Rewrite ✅ COMPLETE

**Goal**: Preserve all MIDI tracks AND handle polyphony without conflicts

**Status**: ✅ **COMPLETE** (2025-11-12)
- Dynamic track allocation implemented
- Polyphony detection and overflow track allocation working
- E1M1 test: 11 tracks, 2,332 notes, 805 polyphonic events preserved
- Pattern created: [e1m1-polyphony.yaml](../../minimal-prototype/public/patterns/e1m1-polyphony.yaml)

**Impact**:
- ✅ Restored ALL guitar tracks in E1M1 (2 channels → 4 tracks)
- ✅ Restored ALL chord notes, harmonies, and layered parts (805 polyphonic events)
- ✅ Percussion channel expanded from 1 → 5 tracks (up to 5 simultaneous notes)

**Details**: [MIDI-TRACK-LOSS-ANALYSIS.md](MIDI-TRACK-LOSS-ANALYSIS.md) and [MIDI-POLYPHONY-LOSS-ANALYSIS.md](MIDI-POLYPHONY-LOSS-ANALYSIS.md)

#### 3.1 Update MIDI Converter - Dynamic Track Allocation

**File**: `minimal-prototype/scripts/convertMIDIToPattern.js`

**Changes**:
- Track active notes per MIDI channel (for polyphony detection)
- Dynamically allocate output tracks as needed
- Support multiple simultaneous notes per channel (chords, harmonies)
- Preserve all original MIDI tracks without conflicts

```javascript
/**
 * Enhanced channel state tracking with polyphony support
 */
function createChannelState() {
  return {
    instrument: 0,
    isPercussionChannel: false,
    activeNotes: new Map(),      // midiNote -> {outputTrack, startRow, trackIndex}
    allocatedTracks: []           // Array of output track indices for this channel
  };
}

/**
 * Find or allocate an output track for a note
 */
function allocateOutputTrack(channel, midiNote, currentRow, channelState, rows) {
  // Check if this specific note is already playing (shouldn't happen, but handle it)
  if (channelState[channel].activeNotes.has(midiNote)) {
    const existing = channelState[channel].activeNotes.get(midiNote);
    console.warn(`Note ${midiNote} on channel ${channel} already active on track ${existing.outputTrack}`);
    // Release old note (write OFF if Phase 2 implemented)
    // rows[currentRow][existing.outputTrack] = { note: 'OFF' };
  }

  // Find a free output track for this channel
  // A track is "free" if it has no note at currentRow, or the note has been released
  let outputTrack = null;

  for (const trackIdx of channelState[channel].allocatedTracks) {
    // Check if this track is available at currentRow
    const cellAtRow = rows[currentRow] && rows[currentRow][trackIdx];

    if (!cellAtRow || cellAtRow.note === null || cellAtRow.note === '---') {
      // This track is free
      outputTrack = trackIdx;
      break;
    }
  }

  // If no free track found, allocate a new one
  if (outputTrack === null) {
    outputTrack = rows[0] ? rows[0].length : 0;  // Next available track index
    channelState[channel].allocatedTracks.push(outputTrack);

    console.log(`[Track Allocation] Channel ${channel + 1}: Allocated track ${outputTrack} for polyphony (${channelState[channel].allocatedTracks.length} tracks total)`);

    // Ensure all rows have this track slot
    for (let r = 0; r < rows.length; r++) {
      if (rows[r]) {
        while (rows[r].length <= outputTrack) {
          rows[r].push({ note: null, instrument: null, volume: null });
        }
      }
    }
  }

  return outputTrack;
}

/**
 * Main conversion function (updated)
 */
function convertToPattern(midiData, options) {
  const rows = [];
  const channelState = {};
  const percussionChannel = 9;  // MIDI channel 10 (0-indexed as 9)
  const percussionKitId = 999;

  // Initialize channel states
  for (let ch = 0; ch < 16; ch++) {
    channelState[ch] = createChannelState();

    if (ch === percussionChannel) {
      channelState[ch].isPercussionChannel = true;
      channelState[ch].instrument = percussionKitId;
    }
  }

  // Build timeline (existing code)
  const timeline = buildTimeline(midiData);

  // Process events with new allocation logic
  for (const event of timeline) {
    const channel = event.channel;
    const currentRow = calculateRow(event.time, ticksPerRow);

    // Ensure row exists
    while (rows.length <= currentRow) {
      rows.push([]);
    }

    // Process note-on events
    if (event.eventName === 'noteOn') {
      // Allocate output track (handles polyphony)
      const outputTrack = allocateOutputTrack(channel, event.note, currentRow, channelState, rows);

      // Write note to output track
      rows[currentRow][outputTrack] = {
        note: midiNoteToName(event.note),
        instrument: channelState[channel].instrument,
        volume: Math.round((event.velocity / 127) * 64),
        effect: null,
        effectValue: null
      };

      // Track this active note
      channelState[channel].activeNotes.set(event.note, {
        outputTrack,
        startRow: currentRow,
        trackIndex: event.trackIndex  // Preserve original MIDI track
      });

    } else if (event.eventName === 'noteOff') {
      // Find where this note is playing
      const noteInfo = channelState[channel].activeNotes.get(event.note);

      if (noteInfo) {
        // Write note-off to same output track (if Phase 2 implemented)
        // rows[currentRow][noteInfo.outputTrack] = { note: 'OFF' };

        // Mark note as released
        channelState[channel].activeNotes.delete(event.note);
      }

    } else if (event.eventName === 'programChange') {
      // Handle program changes (existing logic)
      if (!channelState[channel].isPercussionChannel) {
        channelState[channel].instrument = event.program;
      }
    }
  }

  // Filter empty tracks
  const nonEmptyTracks = filterEmptyTracks(rows);

  return {
    name: 'Converted from MIDI',
    tempo: globalTempo,
    rowsPerBeat: rowsPerBeat,
    channels: nonEmptyTracks.length,
    rows: nonEmptyTracks
  };
}

/**
 * Filter out completely empty tracks
 */
function filterEmptyTracks(rows) {
  if (rows.length === 0) return [];

  const trackCount = rows[0].length;
  const trackHasNotes = new Array(trackCount).fill(false);

  // Check which tracks have any notes
  for (const row of rows) {
    for (let t = 0; t < row.length; t++) {
      if (row[t] && row[t].note && row[t].note !== '---' && row[t].note !== null) {
        trackHasNotes[t] = true;
      }
    }
  }

  // Build mapping of old track index -> new track index
  const trackMapping = [];
  let newIndex = 0;
  for (let t = 0; t < trackCount; t++) {
    if (trackHasNotes[t]) {
      trackMapping[t] = newIndex++;
    } else {
      trackMapping[t] = -1;  // Track will be removed
    }
  }

  // Rebuild rows with only non-empty tracks
  const filteredRows = rows.map(row => {
    const newRow = [];
    for (let t = 0; t < row.length; t++) {
      if (trackMapping[t] !== -1) {
        newRow.push(row[t]);
      }
    }
    return newRow;
  });

  console.log(`[Track Filtering] Reduced from ${trackCount} to ${newIndex} tracks (removed ${trackCount - newIndex} empty tracks)`);

  return filteredRows;
}
```

#### 3.2 Detect Instrument Per Track

**File**: `minimal-prototype/scripts/convertMIDIToPattern.js`

**Changes**:
- Build instrument list from allocated tracks
- Track which instrument each output track uses

```javascript
/**
 * Build instrument list for YAML output
 */
function buildInstrumentList(rows, channelState) {
  const trackInstruments = [];

  // Determine instrument for each output track
  for (let t = 0; t < rows[0].length; t++) {
    // Find first non-empty cell in this track
    let instrument = null;
    for (const row of rows) {
      if (row[t] && row[t].instrument !== null) {
        instrument = row[t].instrument;
        break;
      }
    }
    trackInstruments.push(instrument || 0);
  }

  return trackInstruments;
}
```

#### 3.3 Update YAML Output

**File**: `minimal-prototype/scripts/convertMIDIToPattern.js`

**Changes**:
- Write all allocated tracks to YAML
- Include instrument list

```javascript
// Build instruments array
const instruments = buildInstrumentList(nonEmptyTracks, channelState);

// Write YAML
const yamlContent = `name: "${patternData.name}"
bpm: ${patternData.tempo}
instruments: [${instruments.join(', ')}]

pattern:
${nonEmptyTracks.map(row => formatRow(row)).join('\n')}
`;
```

#### 3.4 Testing

**Test Cases**:

1. **Track Conflict Test**
   - Convert E1M1 MIDI
   - Verify track count increases from 4 to 6-8
   - Verify all guitar parts present
   - Compare sound quality (should be much richer)

2. **Polyphony Test**
   - Create test MIDI with chords (C-4 + E-4 + G-4 at same time)
   - Verify all three notes appear in output
   - Verify they're on separate tracks
   - Listen for full chord sound

3. **Combined Test**
   - Create MIDI with both track conflicts AND polyphony
   - Example: Track 1 (Ch 1) plays chords, Track 2 (Ch 1) plays melody
   - Verify both tracks preserved
   - Verify chords split into multiple output tracks
   - Verify no data loss

4. **Empty Track Filtering**
   - Verify empty tracks are removed
   - Verify track count is minimal but complete

**Expected Results**:
- E1M1 has 6-8 output tracks (not 4)
- All guitar parts audible
- Chords sound full (not single notes)
- Music sounds richer and fuller
- No lost notes or harmonies

---

### Phase 4: Effect Commands (PRIORITY 2)

**Goal**: Sub-row timing precision for swing and humanization

**Impact**: Restores ~20% of timing precision, adds groove

#### 4.1 Implement Tick System

**File**: `minimal-prototype/src/PatternPlayer.ts`

**Changes**:
- Add tick counter and tick interval
- Process effects at tick resolution

```typescript
private ticksPerRow: number = 6;  // From pattern metadata
private currentTick: number = 0;
private tickInterval: number;

// Calculate tick interval from BPM
this.tickInterval = (60000 / this.bpm) / (this.rowsPerBeat * this.ticksPerRow);

// Update timer to tick resolution
setInterval(() => this.processTick(), this.tickInterval);
```

#### 4.2 Implement EDx (Note Delay)

**File**: `minimal-prototype/src/PatternPlayer.ts`

**Changes**:
- Parse EDx effect
- Queue note-on for future tick

```typescript
// In playRow():
if (cell.effect && cell.effect.startsWith('ED')) {
  const delayTicks = parseInt(cell.effect.substring(2), 16);
  this.scheduleNoteOn(channel, midiNote, velocity, delayTicks);
} else if (cell.note !== '---' && cell.note !== 'OFF') {
  synth.noteOn(channel, midiNote, velocity);
}
```

#### 4.3 Implement ECx (Note Cut)

**File**: `minimal-prototype/src/PatternPlayer.ts`

**Changes**:
- Parse ECx effect
- Schedule note-off for future tick

```typescript
// In playRow():
if (cell.effect && cell.effect.startsWith('EC')) {
  const cutTicks = parseInt(cell.effect.substring(2), 16);
  this.scheduleNoteCut(channel, cutTicks);
}
```

#### 4.4 Update MIDI Converter (Optional)

**File**: `minimal-prototype/scripts/convertMIDIToPattern.js`

**Changes**:
- Detect sub-row timing
- Generate EDx effects for notes between rows

(Lower priority - can be added later)

#### 4.5 Testing

1. Create pattern with EDx delays (swing rhythm)
2. Verify timing accuracy
3. Test ECx note cuts (staccato notes)
4. Test combined effects (delay + cut)

---

### Phase 5: Higher Resolution (PRIORITY 3)

**Goal**: Increase grid resolution for complex rhythms

**Impact**: Reduces need for delay effects, easier editing

#### 5.1 Update Pattern Metadata

Add `rowsPerBeat` field to pattern YAML:

```yaml
name: "High Resolution Example"
bpm: 120
rowsPerBeat: 8    # 32nd notes instead of 16th
ticksPerRow: 6
```

#### 5.2 Update Pattern Player

**File**: `minimal-prototype/src/PatternPlayer.ts`

**Changes**:
- Read `rowsPerBeat` from pattern
- Calculate row interval dynamically

```typescript
// From pattern:
this.rowsPerBeat = pattern.rowsPerBeat || 4;

// Calculate timing:
const beatsPerSecond = this.bpm / 60;
const rowsPerSecond = beatsPerSecond * this.rowsPerBeat;
this.rowInterval = 1000 / rowsPerSecond;
```

#### 5.3 Update MIDI Converter

**File**: `minimal-prototype/scripts/convertMIDIToPattern.js`

**Changes**:
- Add CLI parameter for rows-per-beat
- Detect optimal resolution from MIDI data

```javascript
// Auto-detect resolution
const minDelta = findMinimumNoteDelta(timeline);
const optimalRowsPerBeat = calculateOptimalResolution(minDelta, ticksPerBeat);

console.log(`Optimal resolution: ${optimalRowsPerBeat} rows per beat`);
```

#### 5.4 Testing

1. Convert MIDI at different resolutions (4, 8, 16)
2. Compare file sizes
3. Verify timing accuracy
4. Test UI performance with higher resolution

---

## UI Enhancements

### Phase 6: Add Volume Column

**File**: `minimal-prototype/src/components/Tracker.tsx`

**Changes**:
- Add velocity column between note and instrument
- Display as 0-64 or percentage
- Allow keyboard entry

```tsx
<div className="tracker-cell">
  <span className="note">{cell.note}</span>
  <span className="velocity">{cell.velocity || '--'}</span>
  <span className="instrument">{cell.instrument}</span>
  <span className="effect">{cell.effect || '---'}</span>
</div>
```

### Phase 7: Add Effect Column

**File**: `minimal-prototype/src/components/Tracker.tsx`

**Changes**:
- Add effect command column
- Auto-complete effect names
- Validate hex parameters

### Phase 8: Visual Feedback

**Changes**:
- Highlight current playback row
- Show velocity as bar graph or color intensity
- Preview effect timing (delay/cut) visually

---

## Migration & Backward Compatibility

### Backward Compatibility Strategy

1. **Simple strings remain valid** - No breaking changes
2. **Default values omitted** - Velocity defaults to 64
3. **Progressive parsing** - Try object, fall back to string
4. **Version detection** - Infer format from cell types

### Pattern Loader Logic

```typescript
function parseCell(cell: any): PatternCell {
  // Handle null/undefined
  if (!cell) return { note: '---', velocity: 64 };

  // Handle simple string format (backward compatible)
  if (typeof cell === 'string') {
    return { note: cell, velocity: 64 };
  }

  // Handle object format (new)
  if (typeof cell === 'object') {
    return {
      note: cell.n || '---',
      velocity: cell.v !== undefined ? cell.v : 64,
      effect: cell.fx
    };
  }

  console.warn('[Pattern] Unknown cell format:', cell);
  return { note: '---', velocity: 64 };
}
```

### Migration Tools

Create utility to convert old patterns to new format:

```javascript
// scripts/migratePatterns.js
function migratePattern(oldPattern) {
  return oldPattern.pattern.map(row =>
    row.map(cell => {
      if (cell === '---' || cell === 'OFF') return cell;
      return { n: cell, v: 64 };  // Explicit full velocity
    })
  );
}
```

---

## Testing Strategy

### Unit Tests

1. **Pattern Parser Tests** (`patternLoader.test.ts`)
   - Parse simple string cells
   - Parse object cells with velocity
   - Parse object cells with effects
   - Handle mixed format rows
   - Validate velocity range (0-64)
   - Validate effect command format

2. **Pattern Player Tests** (`PatternPlayer.test.ts`)
   - Play notes with varying velocity
   - Execute note-off commands
   - Process EDx delay effects
   - Process ECx cut effects
   - Handle tick timing
   - Verify schedule queue

3. **SimpleSynth Tests** (`SimpleSynth.test.ts`)
   - Velocity scaling formula
   - Attenuation calculation
   - Note-off envelope behavior

### Integration Tests

1. **MIDI Conversion Tests**
   - Convert MIDI with velocity data
   - Verify velocity preserved in YAML
   - Verify note-offs generated correctly
   - Test track mapping (no conflicts)
   - Compare output to original MIDI

2. **WAV Export Tests**
   - Export pattern with velocity variation
   - Analyze WAV amplitude levels
   - Verify note durations match pattern
   - Test effect command execution

3. **End-to-End Tests**
   - Load E1M1 MIDI → Convert → Play → Export WAV
   - Compare to original Doom sound
   - Verify all guitar tracks present
   - Verify drum dynamics present

### Manual Testing Checklist

- [ ] Create pattern with velocities 0, 16, 32, 48, 64
- [ ] Verify volume differences audible
- [ ] Create pattern with note-offs
- [ ] Verify notes stop at correct time
- [ ] Create pattern with EDx delays (swing)
- [ ] Verify timing sounds correct
- [ ] Create pattern with ECx cuts (staccato)
- [ ] Verify notes are short
- [ ] Convert E1M1 MIDI with all features
- [ ] Compare to original Doom (should sound similar)
- [ ] Test backward compatibility with old patterns
- [ ] Verify UI displays velocity/effects correctly

---

## File Changes Summary

### Core Changes (Required)

| File | Phase | Changes |
|------|-------|---------|
| `patternLoader.ts` | 1, 2 | Parse object cells, extract velocity/effects |
| `PatternPlayer.ts` | 1, 2, 4 | Pass velocity to synth, handle OFF, implement ticks |
| `SimpleSynth.ts` | 1 | Add velocity parameter, scale attenuation |
| `convertMIDIToPattern.js` | 1, 2, 3 | Write velocity, write note-offs, fix track mapping |

### UI Changes (Optional)

| File | Phase | Changes |
|------|-------|---------|
| `Tracker.tsx` | 6, 7 | Add velocity and effect columns |
| `TrackerCell.tsx` | 6, 7 | Display velocity/effect data |
| `TrackerEditor.tsx` | 6, 7 | Edit velocity/effect values |

### Export Changes

| File | Phase | Changes |
|------|-------|---------|
| `exportPattern.ts` | 1 | Pass velocity to offline synth |
| `OfflineAudioRenderer.ts` | 1, 2 | Handle velocity and note-offs |

### Type Definitions

| File | Phase | Changes |
|------|-------|---------|
| `types/Pattern.ts` | 1 | Add PatternCell interface |
| `types/OPLPatch.ts` | - | No changes needed |

---

## Timeline Estimate

### Phase 1: Velocity Support
**Effort**: 2-3 days
- Day 1: Update pattern loader and player
- Day 2: Update SimpleSynth and MIDI converter
- Day 3: Testing and bug fixes

### Phase 2: Note-Off Support
**Effort**: 1-2 days
- Day 1: Implement OFF handling and MIDI conversion
- Day 2: Testing

### Phase 3: Track Allocation Rewrite (Conflicts + Polyphony)
**Effort**: 2-3 days
- Day 1: Implement dynamic track allocation with polyphony detection
- Day 2: Implement empty track filtering and instrument detection
- Day 3: Testing with E1M1 (track conflicts and chord tests)

### Phase 4: Effect Commands (Optional)
**Effort**: 3-4 days
- Day 1-2: Implement tick system and effect scheduling
- Day 3: Implement EDx and ECx effects
- Day 4: Testing

### Phase 5: Higher Resolution (Optional)
**Effort**: 1 day
- Implement variable rowsPerBeat

### Phase 6-8: UI Enhancements (Optional)
**Effort**: 3-5 days
- Depends on UI complexity desired

**Total Core Implementation**: 5-8 days (Phases 1-3)
**Total With Effects**: 8-12 days (Phases 1-4)
**Total With UI**: 11-17 days (All phases)

---

## Success Criteria

### Phase 1 Success ✅ COMPLETE (2025-11-12)
- [x] E1M1 drums have dynamic accents (loud/soft hits)
- [x] WAV export shows amplitude variation
- [x] MIDI conversion preserves velocity data
- [x] Backward compatible with old patterns
- [x] Test patterns verified: velocity-ramp-test.yaml, velocity-multi-test.yaml

### Phase 2 Success ✅ COMPLETE (2025-11-12)
- [x] Percussion sounds crisp (short notes)
- [x] Note-offs export correctly to WAV
- [x] MIDI conversion includes OFF markers (1,123 in E1M1)
- [x] Test pattern created: noteoff-test.yaml

### Phase 3 Success ✅ COMPLETE (2025-11-12)
- [x] E1M1 has 10 tracks (not 4) - **track conflicts resolved**
- [x] All guitar parts preserved (2 guitar channels → 4 tracks with polyphony)
- [x] Chords sound full - **2,332 total notes preserved, 690 rows with polyphony**
- [x] Percussion channel expanded to 5 tracks (was 1) - **335 polyphonic events preserved**
- [x] No missing notes/instruments/harmonies - **805 polyphonic events fully restored**

**Results**:
- E1M1 conversion: **11 output tracks** allocated dynamically
- MIDI ch 2: 2 tracks (224 polyphonic events)
- MIDI ch 3: 2 tracks (246 polyphonic events)
- MIDI ch 10 (percussion): **5 tracks** (335 polyphonic events, max 5 simultaneous)
- Pattern file: [e1m1-polyphony.yaml](../../minimal-prototype/public/patterns/e1m1-polyphony.yaml)

### Overall Success
- [ ] E1M1 sounds **much closer** to original Doom
- [ ] Drums sound alive (not robotic)
- [ ] Music has depth (not thin/flat)
- [ ] Groove and dynamics present

---

## Risk Assessment

### Low Risk
- **Backward compatibility** - Simple string format preserved
- **File format** - YAML supports both formats natively
- **Performance** - No significant overhead expected

### Medium Risk
- **Timing precision** - Tick system may need tuning
- **Effect complexity** - May need multiple iterations
- **UI responsiveness** - Higher resolution patterns may lag

### Mitigation Strategies
1. **Extensive testing** - Unit and integration tests
2. **Incremental rollout** - Phase by phase
3. **Feature flags** - Allow disabling effects if needed
4. **Performance profiling** - Monitor frame rates
5. **User feedback** - Test with real users early

---

## Future Enhancements (Out of Scope)

These are NOT part of the current plan but could be considered later:

1. **Additional effect commands**
   - `Exx` - Vibrato
   - `Fxx` - Pitch slide
   - `00x` - Arpeggio
   - `Cxx` - Volume slide

2. **Pattern compression**
   - Run-length encoding for repeated rows
   - Delta encoding for similar cells

3. **Live performance features**
   - Pattern chaining
   - Loop points
   - BPM automation

4. **Advanced editing**
   - Copy/paste with velocity
   - Velocity humanization tools
   - Effect wizards

5. **Import/export**
   - Export to XM/IT formats
   - Import from tracker formats

---

## Conclusion

This tracker extension plan provides a clear path to restore all lost musical data while maintaining the tracker aesthetic and workflow. The phased approach allows for incremental development and testing, with early phases providing the highest impact improvements.

**Next Steps**:
1. Review and approve this plan
2. Begin Phase 1 implementation (velocity support)
3. Test with E1M1 after each phase
4. Iterate based on results

**Expected Outcome**: WebOPL will produce authentic-sounding Doom music with proper dynamics, articulation, and musical expression, while remaining efficient and maintainable.

---

**Document Status**: READY FOR IMPLEMENTATION
**Last Updated**: 2025-11-12
**Author**: Claude (with user direction)
