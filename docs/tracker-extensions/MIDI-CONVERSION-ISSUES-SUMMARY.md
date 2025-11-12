# MIDI Conversion Issues - Master Summary

## Overview

Our MIDI to pattern conversion process is losing significant musical data, which explains why E1M1 and other converted MIDI files don't sound like the original Doom music.

---

## Critical Issues Identified

### 1. 🔴 **Velocity/Volume Data Loss** - CRITICAL

**Status:** Captured but discarded
**Impact:** All notes play at identical volume
**Details:** [MIDI-CONVERSION-DATA-LOSS.md](MIDI-CONVERSION-DATA-LOSS.md)

**Problem:**
- MIDI velocity values (0-127) are captured during conversion
- But only note names are saved to YAML
- Result: No dynamic accents, robotic drum patterns, flat melodies

**Location:**
- Captured: [convertMIDIToPattern.js:297](minimal-prototype/scripts/convertMIDIToPattern.js#L297)
- Discarded: [convertMIDIToPattern.js:472](minimal-prototype/scripts/convertMIDIToPattern.js#L472)

**Fix Required:**
- Extend YAML format to include velocity per note
- Update pattern loader to parse velocity
- Modify `SimpleSynth.noteOn()` to scale attenuation based on velocity

---

### 2. 🔴 **Note Duration Loss** - CRITICAL

**Status:** Captured but discarded
**Impact:** Wrong note lengths, no articulation
**Details:** [MIDI-CONVERSION-DATA-LOSS.md](MIDI-CONVERSION-DATA-LOSS.md)

**Problem:**
- Note-off events are captured but never written to output
- Notes sustain until next note on that channel (incorrect)
- Percussion especially needs short, crisp durations

**Location:**
- Captured: [convertMIDIToPattern.js:302-308](minimal-prototype/scripts/convertMIDIToPattern.js#L302-L308)
- Never written to YAML

**Fix Required:**
- Write "OFF" markers to YAML for note-off events
- Update pattern player to handle "OFF" commands
- Call `SimpleSynth.noteOff()` on "OFF" cells

---

### 3. 🔴 **Track Conflicts/Loss** - CRITICAL

**Status:** Multiple MIDI tracks merged incorrectly
**Impact:** Missing ~50% of E1M1's guitar parts
**Details:** [MIDI-TRACK-LOSS-ANALYSIS.md](MIDI-TRACK-LOSS-ANALYSIS.md)

**Problem:**
- Converter uses MIDI channel number as output track index
- Multiple MIDI tracks can use the same channel
- When they do, notes overwrite each other
- E1M1 has 11 MIDI tracks but we output only 4

**Example:**
```
MIDI Track 1: Channel 1 → Distortion Guitar
MIDI Track 3: Channel 1 → Distortion Guitar (harmony)
Both write to outputTrack[1] → CONFLICT!
```

**Location:**
- [convertMIDIToPattern.js:273-330](minimal-prototype/scripts/convertMIDIToPattern.js#L273-L330)
- Uses `event.channel` as array index

**Fix Required:**
- Use MIDI track number instead of channel number as output track index
- Filter empty tracks after conversion
- Preserve all original tracks without conflicts

---

### 4. 🔴 **Polyphony Loss** - CRITICAL

**Status:** Single MIDI channel playing multiple notes simultaneously
**Impact:** Lost chord notes, harmonies, and layered parts
**Details:** [MIDI-POLYPHONY-LOSS-ANALYSIS.md](MIDI-POLYPHONY-LOSS-ANALYSIS.md)

**Problem:**
- MIDI channels can play multiple notes at once (chords, layers)
- Our tracker format: one note per track per row
- When channel plays C-4 + E-4 + G-4 simultaneously, only G-4 is saved
- Earlier notes are overwritten by later ones at same time

**Example:**
```
MIDI Channel 1, Time 0:
  Note On: C-4
  Note On: E-4  ← Overwrites C-4!
  Note On: G-4  ← Overwrites E-4!

Output: Only "G-4" saved, C-4 and E-4 lost
```

**Location:**
- [convertMIDIToPattern.js:294-300](minimal-prototype/scripts/convertMIDIToPattern.js#L294-L300)
- Single assignment overwrites previous notes

**Fix Required:**
- Detect polyphony (multiple simultaneous notes per channel)
- Automatically split into multiple output tracks
- Allocate tracks dynamically as needed
- **Combine with track conflict fix** (same rewrite needed)

---

### 5. 🟡 **Timing Quantization** - MODERATE

**Status:** Working as designed but loses precision
**Impact:** Robotic timing, no swing/groove
**Details:** [MIDI-CONVERSION-DATA-LOSS.md](MIDI-CONVERSION-DATA-LOSS.md)

**Problem:**
- MIDI has precise tick-level timing
- We quantize to 16th note grid (`rowsPerBeat = 4`)
- Loses subtle timing variations (swing, humanization)

**Location:**
- [convertMIDIToPattern.js:250](minimal-prototype/scripts/convertMIDIToPattern.js#L250)
- `Math.round(event.time / ticksPerRow)`

**Fix Options:**
- Increase resolution to 32nd notes (`rowsPerBeat = 8`)
- Add sub-row delay effects
- Accept limitation for now (lowest priority)

---

### 6. 🟡 **Pitch Bend & Control Changes** - LOW

**Status:** Captured but not used
**Impact:** Minor - OPL3 has limited support anyway
**Details:** [MIDI-CONVERSION-DATA-LOSS.md](MIDI-CONVERSION-DATA-LOSS.md)

**Problem:**
- Pitch bend and CC events are parsed but not exported
- OPL3 doesn't support pitch bend in hardware anyway
- Could potentially be used for effect commands

**Location:**
- Pitch bend: [convertMIDIToPattern.js:153-157](minimal-prototype/scripts/convertMIDIToPattern.js#L153-L157)
- Control changes: [convertMIDIToPattern.js:138-143](minimal-prototype/scripts/convertMIDIToPattern.js#L138-L143)

**Fix Priority:** Low (hardware limitation)

---

## Impact Analysis: E1M1 Example

### Original MIDI File:
- 11 tracks total
- 4 guitar tracks (2 distortion, 2 overdriven)
- Velocity range: 60-127 (dynamic accents)
- Precise note durations for drums and staccato passages
- Natural timing variations

### Our Converted Output:
- 4 tracks (3 melodic + percussion)
- 2 guitar tracks (other 2 lost in conflicts)
- All velocity = constant (no dynamics)
- No note-offs (everything sustains)
- Grid-locked timing

### Data Loss Percentages:
- **~50%** of guitar tracks (2 of 4 lost to track conflicts)
- **Unknown %** of chord/harmony notes (lost to polyphony overwrite)
- **100%** of velocity information
- **100%** of note duration information
- **~20%** of timing precision

**Result:** Sounds completely different from original Doom

---

## Why This Matters

### Original Doom (DMX/MUS Format):
✅ Dynamic velocity per note
✅ Note duration information
✅ Multiple independent voices
✅ Natural timing

### Our Current Implementation:
❌ All notes same volume
❌ No articulation control
❌ Track conflicts lose notes
❌ Robotic grid timing

**The combined effect makes our music sound:**
- Flat (no dynamics)
- Muddy (no note-offs)
- Thin (missing tracks)
- Robotic (quantized timing)

---

## Comparison to Emulation Accuracy

### OPL3 Chip Emulation:
✅ **Confirmed accurate** - Output matches OPL3 VST exactly
✅ All register values correctly mapped
✅ Frequency calculation correct (octave tested)
✅ Waveforms, envelopes, feedback all working

### MIDI Conversion:
❌ **Major data loss** - Missing critical musical information
❌ Track conflicts lose entire parts
❌ No dynamic expression
❌ Wrong note durations

**Conclusion:** The synthesizer is fine. The problem is the input data we're feeding it.

---

## Priority Order for Fixes

### Phase 1: Restore Missing Notes (Highest Impact)
1. **Fix track conflicts + polyphony** → Dynamic track allocation with polyphony detection
2. **Add velocity support** → Scale volume per note
3. **Add note-off support** → "OFF" markers in YAML

**Expected improvement:** Massive - will restore missing guitar parts, chords, harmonies, and add dynamics

**Note**: Track conflicts and polyphony fixes should be **combined** since both require rewriting track allocation logic.

### Phase 2: Refinement (Lower Impact)
4. **Increase timing resolution** → 32nd notes instead of 16th
5. **Consider pitch bend/CC** → If time permits

**Expected improvement:** Minor polish

---

## Implementation Roadmap

### Step 1: Fix Track Conflicts + Polyphony (Combined)
```javascript
// Track active notes per channel for polyphony detection
const channelState = {
  [channel]: {
    instrument: 0,
    activeNotes: new Map(),  // note -> {outputTrack, startRow}
    allocatedTracks: []      // Array of output track indices
  }
};

// When note-on arrives:
// 1. Find free output track for this channel (polyphony support)
let outputTrack = findFreeTrack(channel, currentRow);
if (outputTrack === null) {
  // Allocate new track
  outputTrack = allocateNewTrack(channel);
}

// 2. Write note to output track
rows[currentRow][outputTrack] = noteData;

// 3. Track active note
channelState[channel].activeNotes.set(event.note, {outputTrack, startRow: currentRow});
```

### Step 2: Add Velocity to YAML
```yaml
# Current format:
pattern:
  - ["E-2", "---", "F-2"]

# New format:
pattern:
  - [
      {note: "E-2", vel: 100},
      {note: "---"},
      {note: "F-2", vel: 127}
    ]
```

### Step 3: Add Note-Off Support
```yaml
pattern:
  - [{note: "E-2", vel: 100}]
  - [{note: "OFF"}]  # Explicit note-off
```

### Step 4: Update Player
- Parse new YAML format
- Scale attenuation based on velocity
- Handle "OFF" commands

---

## Related Files

### Analysis Documents:
- [MIDI-CONVERSION-DATA-LOSS.md](MIDI-CONVERSION-DATA-LOSS.md) - Velocity and duration issues
- [MIDI-TRACK-LOSS-ANALYSIS.md](MIDI-TRACK-LOSS-ANALYSIS.md) - Track conflict issues
- [MIDI-POLYPHONY-LOSS-ANALYSIS.md](MIDI-POLYPHONY-LOSS-ANALYSIS.md) - Polyphony/chord issues
- [OPL3-PARAMETER-MAPPING.md](OPL3-PARAMETER-MAPPING.md) - Chip parameters (confirmed working)

### Code Files:
- [convertMIDIToPattern.js](minimal-prototype/scripts/convertMIDIToPattern.js) - MIDI converter
- [SimpleSynth.ts](minimal-prototype/src/SimpleSynth.ts) - OPL3 synth (working correctly)
- [patternLoader.ts](minimal-prototype/src/utils/patternLoader.ts) - YAML pattern loader

### Test Files:
- [M_E1M1.mid](minimal-prototype/midis/M_E1M1.mid) - Original MIDI (11 tracks)
- [e1m1-doom.yaml](minimal-prototype/public/patterns/e1m1-doom.yaml) - Converted (4 tracks, data loss)

---

## Status: DOCUMENTED - AWAITING IMPLEMENTATION

All issues have been identified and documented. The root causes are understood. Implementation of fixes is pending user approval.

**Last Updated:** 2025-11-12
**Documented By:** Claude (Analysis), User (Discovery)
**Severity:** High - Major impact on audio quality
