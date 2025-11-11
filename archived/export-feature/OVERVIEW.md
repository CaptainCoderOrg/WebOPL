# WAV Export Feature - Overview & Prototype Plan

**Created:** 2025-01-06
**Status:** Planning Phase

---

## Table of Contents

1. [Goal](#goal)
2. [Requirements](#requirements)
3. [Previous Attempt Issues](#previous-attempt-issues)
4. [Ideal Solution Architecture](#ideal-solution-architecture)
5. [Prototype Roadmap](#prototype-roadmap)
6. [Technical Challenges](#technical-challenges)
7. [Success Criteria](#success-criteria)

---

## Goal

**Export tracker patterns to WAV audio files that sound identical to what the user hears in the browser.**

### User Experience

1. User creates/loads a pattern in the tracker
2. User clicks **"Export WAV"** button above the grid
3. Modal opens with export options (filename, loops, etc.)
4. User clicks **"Generate"**
5. Progress bar shows generation progress (0-100%)
6. When complete, **"Download WAV"** button appears
7. User clicks download → WAV file saves to disk

---

## Requirements

### 1. Reuse Existing Audio Generation

**Critical:** The export must use the **exact same audio pipeline** as real-time playback.

#### 1a. Same Instrument Patches

- Must load patches from the same instrument bank
- Must use `SimpleSynth.setTrackPatch()` correctly
- Must support both single-voice and dual-voice patches
- Must respect `noteOffset` from GENMIDI patches

**Why this matters:**
- Previous attempt had instrument loading issues
- Export sounded different from playback
- Users expect bit-identical output

#### 1b. OPL3 Synthesis

- Must use the same OPL3 chip emulator
- Must write the same registers
- Must generate samples at 49,716 Hz
- Must maintain chip state correctly

**Why this matters:**
- OPL3 is stateful (envelope generators, phase accumulators)
- Different synthesis = different sound
- Must preserve the authentic OPL3 character

#### 1c. Sustained Notes

**Critical capability:** Notes must sustain across rows when `---` is used.

Example pattern:
```
Row 0: C-4  (note on)
Row 1: ---  (sustain, keep playing)
Row 2: ---  (sustain, keep playing)
Row 3: OFF  (note off)
```

**Previous attempt issue:**
- Retriggered envelope on every row
- Caused "machine gun" effect
- Made sustained pads/strings impossible

**Correct behavior:**
- Note on → Start envelope
- Sustain → No action (note keeps playing)
- Note off → Release envelope

### 2. Offline Rendering

**Generate audio without real-time playback.**

Requirements:
- No audio output to speakers during generation
- Faster than real-time (if possible)
- Progress tracking (% complete)
- Cancelable (user can abort)

**Benefits:**
- Don't force user to listen to entire song
- Can export long patterns (minutes)
- Can show progress feedback

---

## Previous Attempt Issues

### Issue 1: Instrument Loading
- Patches not loaded correctly
- Wrong register writes
- Different sound than playback

**Root cause:** Not using `SimpleSynth` correctly or at all.

### Issue 2: Note Sustain
- Every row retriggered envelopes
- Couldn't hold notes across beats
- Broken pads/strings/bass lines

**Root cause:** Not tracking active notes, or regenerating audio per-row instead of continuously.

### Issue 3: Timing/Sync
- Audio didn't match pattern timing
- BPM not respected
- Wrong duration

**Root cause:** Not using same timing calculations as `SimplePlayer`.

---

## Ideal Solution Architecture

### High-Level Flow

```
User clicks "Export"
    ↓
Create offline audio context
    ↓
Create SimpleSynth instance (offline mode)
    ↓
Load instruments to tracks
    ↓
Generate audio samples:
  - Calculate total duration from pattern
  - For each sample:
    - Check if row boundary
    - Process note events (on/off/sustain)
    - Read sample from OPL3 chip
    - Store in buffer
    - Update progress
    ↓
Convert samples to WAV format
    ↓
Create Blob and download link
    ↓
User downloads file
```

### Key Components

#### 1. OfflineAudioRenderer

**Purpose:** Generate audio samples without playback

```typescript
class OfflineAudioRenderer {
  private chip: OPL3;
  private synth: SimpleSynth;
  private pattern: TrackerPattern;

  async render(
    pattern: TrackerPattern,
    trackPatches: Map<number, OPLPatch>,
    onProgress: (percent: number) => void
  ): Promise<Float32Array[]> {
    // Generate all samples
    // Return [leftChannel, rightChannel]
  }
}
```

**Key features:**
- Uses OPL3 chip directly (like SimpleSynth)
- No AudioContext/speakers involved
- Tracks active notes (for sustain)
- Reports progress

#### 2. WAVEncoder

**Purpose:** Convert Float32 samples to WAV file format

```typescript
class WAVEncoder {
  static encode(
    leftChannel: Float32Array,
    rightChannel: Float32Array,
    sampleRate: number
  ): ArrayBuffer {
    // Build WAV header
    // Convert Float32 → Int16
    // Return WAV file buffer
  }
}
```

**Format:** WAV PCM
- Sample rate: 49,716 Hz (OPL3 native)
- Bit depth: 16-bit signed integer
- Channels: 2 (stereo)

#### 3. ExportModal Component

**Purpose:** UI for export process

```typescript
interface ExportModalProps {
  pattern: TrackerPattern;
  trackPatches: Map<number, OPLPatch>;
  onClose: () => void;
}
```

**States:**
- `idle` - Ready to export
- `generating` - Progress bar visible
- `complete` - Download button visible
- `error` - Error message shown

### Critical: Reusing SimpleSynth Logic

**DO NOT reimplement synthesis!**

Instead, extract the core logic:

```typescript
// Option A: Use SimpleSynth directly in "offline mode"
class SimpleSynth {
  // Existing methods...

  // New method for offline rendering
  renderOffline(
    pattern: TrackerPattern,
    onProgress: (percent: number) => void
  ): Promise<Float32Array[]> {
    // Same note scheduling logic as SimplePlayer
    // Same patch loading logic
    // But capture samples instead of playing them
  }
}

// Option B: Shared "NoteScheduler" class
class NoteScheduler {
  scheduleNotes(pattern: TrackerPattern, msPerRow: number): NoteEvent[] {
    // Return list of {time, track, note, action} events
  }
}

// Both SimplePlayer and OfflineRenderer use this
```

---

## Prototype Roadmap

### Prototype 1: Single Tone WAV

**Goal:** Generate a 1-second C-4 note as WAV file

**Requirements:**
- Create OPL3 chip instance
- Load a simple patch (e.g., piano)
- Trigger C-4 (MIDI 60)
- Generate 49,716 samples (1 second)
- Encode to WAV
- Download file

**Success criteria:**
- ✅ WAV file plays in media player
- ✅ Sounds like a piano C-4 note
- ✅ 1 second duration
- ✅ No clicks/pops at start/end

**Files to create:**
- `prototype-1-single-tone.ts`
- `prototype-1-single-tone.html` (test page)

### Prototype 2: Instrument Switch

**Goal:** Play C-4 for 1 second, switch to different instrument, play D-4 for 1 second

**Requirements:**
- Load patch 1 (piano) to channel 0
- Play C-4 for 1 second
- Load patch 2 (organ) to channel 0
- Play D-4 for 1 second
- Total: 2 seconds

**Success criteria:**
- ✅ First note sounds like piano
- ✅ Second note sounds like organ
- ✅ Smooth transition (no glitches)
- ✅ Correct pitches

**Files to create:**
- `prototype-2-instrument-switch.ts`
- `prototype-2-instrument-switch.html`

### Prototype 3: Polyphonic with Sustain

**Goal:** Sustained bass note + repeating chord pattern

**Pattern:**
```
Track 0 (Bass):    C-3 --- --- --- --- --- --- ---
Track 1 (Chord 1): C-4 --- --- --- C-4 --- --- ---
Track 2 (Chord 2): E-4 --- --- --- E-4 --- --- ---
Track 3 (Chord 3): G-4 --- --- --- G-4 --- --- ---
```

**Requirements:**
- Track 0: Single C-3 held for entire duration
- Tracks 1-3: C major chord played twice
- Must use channel allocation (like SimpleSynth)
- Must track active notes
- Sustain (`---`) must NOT retrigger envelopes

**Success criteria:**
- ✅ Bass note plays continuously (no retriggering)
- ✅ Chord notes play twice
- ✅ All 4 tracks sound simultaneously
- ✅ Sounds identical to real-time playback

**Files to create:**
- `prototype-3-polyphonic-sustain.ts`
- `prototype-3-polyphonic-sustain.html`

### Prototype 4: Tempo Changes

**Goal:** Same as Prototype 3, but at different BPMs

**Requirements:**
- Export at 60 BPM → 2 seconds duration
- Export at 120 BPM → 1 second duration
- Export at 240 BPM → 0.5 seconds duration
- Pattern sounds identical, just faster/slower

**Success criteria:**
- ✅ Timing matches BPM exactly
- ✅ Note durations scale correctly
- ✅ No timing drift
- ✅ Formula matches SimplePlayer timing

**Files to create:**
- `prototype-4-tempo-changes.ts`
- `prototype-4-tempo-changes.html`

---

## Technical Challenges

### Challenge 1: Direct OPL3 Access

**Problem:** SimpleSynth uses AudioWorklet. Can't easily capture samples.

**Solutions:**

**Option A: Create separate OPL3 instance**
```typescript
// In Node.js-like environment (or browser with import)
import { OPL3 } from 'opl3';

const chip = new OPL3();
chip.write(array, address, value);
const samples = chip.read(buffer);
```

**Option B: Message passing to AudioWorklet**
```typescript
// Send "start recording" message
workletNode.port.postMessage({ type: 'start-record' });

// Worklet buffers samples and sends back
workletNode.port.onmessage = (event) => {
  if (event.data.type === 'samples') {
    // Store samples
  }
};
```

**Recommended:** Option A - Create dedicated OPL3 instance for export.

### Challenge 2: Note Sustain Tracking

**Problem:** Must remember which notes are active

**Solution:** Same as SimplePlayer

```typescript
class OfflineRenderer {
  private activeNotes: Map<number, number> = new Map(); // track → MIDI note

  processRow(row: TrackerNote[]) {
    row.forEach((trackNote, trackIndex) => {
      if (trackNote.note === null) {
        // Sustain - do nothing
        return;
      }

      if (trackNote.note === -1) {
        // Note off
        const activeNote = this.activeNotes.get(trackIndex);
        if (activeNote !== undefined) {
          this.noteOff(trackIndex, activeNote);
          this.activeNotes.delete(trackIndex);
        }
        return;
      }

      // New note - stop previous, start new
      const activeNote = this.activeNotes.get(trackIndex);
      if (activeNote !== undefined) {
        this.noteOff(trackIndex, activeNote);
      }

      this.noteOn(trackIndex, trackNote.note);
      this.activeNotes.set(trackIndex, trackNote.note);
    });
  }
}
```

### Challenge 3: Progress Tracking

**Problem:** Need to report progress without blocking UI

**Solution:** Use `requestIdleCallback` or Web Worker

```typescript
async function renderWithProgress(
  renderer: OfflineRenderer,
  totalSamples: number,
  onProgress: (percent: number) => void
): Promise<Float32Array[]> {
  const chunkSize = 4096; // Process in chunks
  const leftChannel = new Float32Array(totalSamples);
  const rightChannel = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i += chunkSize) {
    // Generate chunk
    const chunk = renderer.generateChunk(chunkSize);
    leftChannel.set(chunk[0], i);
    rightChannel.set(chunk[1], i);

    // Report progress
    const percent = (i / totalSamples) * 100;
    onProgress(percent);

    // Yield to UI
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return [leftChannel, rightChannel];
}
```

### Challenge 4: WAV File Format

**Problem:** Need to encode raw samples as WAV

**Solution:** Build WAV header + data

```typescript
function encodeWAV(
  leftChannel: Float32Array,
  rightChannel: Float32Array,
  sampleRate: number
): ArrayBuffer {
  const numChannels = 2;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const numSamples = leftChannel.length;
  const dataSize = numSamples * blockAlign;

  // WAV file structure:
  // - RIFF header (12 bytes)
  // - fmt chunk (24 bytes)
  // - data chunk (8 bytes + data)

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true);  // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write samples (interleaved L/R)
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    // Convert Float32 (-1.0 to 1.0) → Int16 (-32768 to 32767)
    const left = Math.max(-1, Math.min(1, leftChannel[i]));
    const right = Math.max(-1, Math.min(1, rightChannel[i]));

    view.setInt16(offset, left * 32767, true);
    offset += 2;
    view.setInt16(offset, right * 32767, true);
    offset += 2;
  }

  return buffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
```

---

## Success Criteria

### For Each Prototype

**Must pass:**
1. ✅ Generates valid WAV file
2. ✅ Plays in standard media players (VLC, Windows Media Player, etc.)
3. ✅ Sounds correct (correct pitch, timbre, timing)
4. ✅ No audio artifacts (clicks, pops, glitches)
5. ✅ File size is correct (sampleRate × duration × 4 bytes + 44 byte header)

### For Final Integration

**Must pass:**
1. ✅ Export matches real-time playback (bit-identical if possible)
2. ✅ All instruments work correctly
3. ✅ Sustained notes work correctly
4. ✅ Polyphony works (all tracks play)
5. ✅ BPM respected
6. ✅ Pattern loops correctly (if export includes loops)
7. ✅ Progress bar updates smoothly
8. ✅ Can cancel export mid-generation
9. ✅ Works with patterns of any length (1 second to 10 minutes)
10. ✅ No memory leaks

---

## Next Steps

### Phase 1: Setup (Now)

- [x] Create `features/export-audio` directory
- [x] Write this overview document
- [ ] Create prototype directory structure
- [ ] Setup test HTML pages

### Phase 2: Prototype 1 (Single Tone)

- [ ] Create basic OPL3 instance
- [ ] Load simple patch
- [ ] Generate 1 second of audio
- [ ] Encode to WAV
- [ ] Test download

### Phase 3: Prototype 2-4 (Incremental)

- [ ] Add instrument switching
- [ ] Add polyphony and sustain
- [ ] Add tempo/BPM support

### Phase 4: Integration

- [ ] Create `ExportModal` component
- [ ] Create `OfflineAudioRenderer` class
- [ ] Integrate with `Tracker` component
- [ ] Add progress tracking
- [ ] Add error handling
- [ ] User testing

---

## File Structure

```
features/export-audio/
├── OVERVIEW.md (this file)
├── prototypes/
│   ├── prototype-1-single-tone.html
│   ├── prototype-1-single-tone.ts
│   ├── prototype-2-instrument-switch.html
│   ├── prototype-2-instrument-switch.ts
│   ├── prototype-3-polyphonic-sustain.html
│   ├── prototype-3-polyphonic-sustain.ts
│   ├── prototype-4-tempo-changes.html
│   └── prototype-4-tempo-changes.ts
├── src/
│   ├── OfflineAudioRenderer.ts
│   ├── WAVEncoder.ts
│   └── ExportModal.tsx
├── tests/
│   └── test-export.ts
└── INTEGRATION_PLAN.md (to be created)
```

---

## Questions to Answer During Prototyping

1. **Can we use OPL3 library directly in main thread?**
   - Or do we need to stay in AudioWorklet?

2. **What's the maximum pattern length we can export?**
   - Memory constraints? Time constraints?

3. **Should we offer export options?**
   - Number of loops?
   - Fade out?
   - Sample rate (44.1kHz vs 49.716kHz)?

4. **How to handle very long exports?**
   - Web Worker?
   - Streaming to file?

5. **Should we add silence at start/end?**
   - Prevent cutoff of release envelopes?

---

**This document will be updated as we learn from the prototypes.**
