# MIDI Polyphony Loss Analysis

## The Problem: Single MIDI Channel Playing Multiple Notes Simultaneously

### What We're Losing

**Polyphony** = Multiple notes played at the same time on the same instrument/channel (chords, layered parts).

Our current tracker format can only store **ONE note per track per row**, so when a MIDI channel plays chords or multiple simultaneous notes, we lose all but the last one!

---

## Root Cause: Single Cell Per Track

### Our Current Format

```yaml
pattern:
  - ["C-4", "D-4", "E-4"]  # Track 0, Track 1, Track 2
```

Each cell holds **one note**. If MIDI Channel 1 plays C-4 AND E-4 at the same time (a chord), we can only store one of them!

### The Overwrite Problem

**File**: `minimal-prototype/scripts/convertMIDIToPattern.js:294-300`

```javascript
// For each note-on event:
rows[currentRow][channel] = {
  note: midiNoteToName(event.note),
  instrument: channelState[channel].instrument,
  volume: Math.round((event.velocity / 127) * 64),
  effect: null,
  effectValue: null
};
```

**Problem**: This is a **single assignment**. If multiple notes arrive at the same `currentRow` and same `channel`, each one **overwrites** the previous!

### Example of Data Loss

**MIDI Input (Channel 1, Time 0):**
```
Time 0: Note On - C-4 (velocity 100)
Time 0: Note On - E-4 (velocity 100)  ← Same time!
Time 0: Note On - G-4 (velocity 100)  ← Same time!
```

**Our Output:**
```yaml
- ["G-4", ...]  # Only the LAST note survives!
```

The C-4 and E-4 were **completely lost** - overwritten by G-4!

---

## Difference From Track Conflict Issue

This is **separate** from the track conflict issue documented in [MIDI-TRACK-LOSS-ANALYSIS.md](MIDI-TRACK-LOSS-ANALYSIS.md):

| Issue | Cause | Example |
|-------|-------|---------|
| **Track Conflicts** | Multiple MIDI **tracks** use same **channel** | Track 1 (Ch 1) + Track 3 (Ch 1) → Both write to outputTrack[1] |
| **Polyphony Loss** | Single MIDI **channel** plays multiple **notes** | Channel 1 plays C-4 + E-4 + G-4 at same time → Only G-4 saved |

**Both issues result in lost notes**, but for different reasons!

---

## Impact on E1M1 (Example)

### Where Polyphony Occurs

MIDI files commonly use polyphony for:

1. **Chords** - Guitar/bass playing full chords (C-E-G)
2. **Layered parts** - Two melodies on same instrument
3. **Arpeggios** - Sustained notes overlapping with new notes
4. **Orchestration** - Multiple voices on same instrument

### Potential E1M1 Issues

User observation: "Some instruments play two notes at the same time"

**If E1M1 uses polyphony:**
- Guitar chords might become single notes
- Layered melodies would lose harmonies
- Bass notes could be missing from power chords

**Result**: Music sounds **thinner** and **harmonically simpler** than the original.

---

## How Traditional Trackers Handle Polyphony

### Option 1: Multiple Tracks (Automatic Split)

Many trackers automatically split polyphonic MIDI channels into multiple output tracks:

```
MIDI Channel 1 plays:
  Time 0: C-4, E-4, G-4 (chord)

Tracker output:
  Track 0: C-4
  Track 1: E-4
  Track 2: G-4
```

**Pros**:
- No data loss
- Works with existing single-note-per-cell format
- Transparent to user

**Cons**:
- Increases track count
- May split beyond available tracks

### Option 2: Chord Notation (Array of Notes)

Some trackers allow multiple notes per cell:

```yaml
pattern:
  - [[C-4, E-4, G-4], D-4, F-4]  # Track 0 plays chord
```

**Pros**:
- Compact representation
- True polyphony

**Cons**:
- Format change required
- Player complexity increases
- Voice allocation needed

### Option 3: Virtual Channels (Voice Allocation)

Track which voices are active and allocate new channels dynamically:

```javascript
// Allocate OPL3 voices on-demand
if (channelVoices[channel].length < maxVoices) {
  allocateNewVoice(channel, note);
}
```

**Pros**:
- Handles polyphony dynamically
- Efficient use of hardware voices

**Cons**:
- Complex voice management
- Requires voice stealing algorithm
- May exceed OPL3 voice limit (18 voices)

---

## Proposed Solution

### Recommended Approach: Automatic Track Splitting (Option 1)

**Rationale**:
- Simplest to implement
- No format changes needed
- Works with current tracker UI
- Most compatible with OPL3 hardware (which has 18 independent voices)

### Implementation Steps

#### 1. Track Active Notes Per Channel

```javascript
// In convertMIDIToPattern.js
const channelState = {
  [channel]: {
    instrument: 0,
    activeNotes: new Map(),  // note -> {outputTrack, startRow}
    allocatedTracks: []      // Array of output track indices
  }
};
```

#### 2. Detect Polyphony and Allocate Tracks

```javascript
// When processing note-on events:
if (event.eventName === 'noteOn') {
  const channel = event.channel;

  // Check if this note is already playing (shouldn't be, but handle it)
  if (channelState[channel].activeNotes.has(event.note)) {
    // Release old note
    const oldInfo = channelState[channel].activeNotes.get(event.note);
    // ... write note-off
  }

  // Find an available output track for this channel
  let outputTrack = null;
  for (const trackIdx of channelState[channel].allocatedTracks) {
    // Check if this track is free at currentRow
    if (!rows[currentRow][trackIdx] || rows[currentRow][trackIdx].note === null) {
      outputTrack = trackIdx;
      break;
    }
  }

  // If no free track, allocate a new one
  if (outputTrack === null) {
    outputTrack = maxChannels;  // Next available track index
    maxChannels++;
    channelState[channel].allocatedTracks.push(outputTrack);

    console.log(`Allocated track ${outputTrack} for polyphony on MIDI channel ${channel + 1}`);
  }

  // Write note to output track
  rows[currentRow][outputTrack] = {
    note: midiNoteToName(event.note),
    instrument: channelState[channel].instrument,
    volume: Math.round((event.velocity / 127) * 64)
  };

  // Track this active note
  channelState[channel].activeNotes.set(event.note, {
    outputTrack,
    startRow: currentRow
  });
}
```

#### 3. Handle Note-Offs

```javascript
// When processing note-off events:
if (event.eventName === 'noteOff') {
  const channel = event.channel;
  const noteInfo = channelState[channel].activeNotes.get(event.note);

  if (noteInfo) {
    // Write OFF to the same output track where note started
    rows[currentRow][noteInfo.outputTrack] = {
      note: 'OFF'
    };

    channelState[channel].activeNotes.delete(event.note);
  }
}
```

### Result

**Before** (with polyphony loss):
```yaml
instruments: [30, 29, 34]
pattern:
  - ["G-4", "D-4", "C-2"]  # Lost C-4 and E-4!
```

**After** (with track splitting):
```yaml
instruments: [30, 30, 30, 29, 34]  # Multiple tracks for same instrument
pattern:
  - ["C-4", "E-4", "G-4", "D-4", "C-2"]  # All notes preserved!
```

---

## Implementation Priority

### Comparison to Other Issues

| Issue | Data Loss | Priority | Effort |
|-------|-----------|----------|--------|
| **Velocity loss** | 100% of dynamics | 🔴 Critical | 2-3 days |
| **Note-off loss** | 100% of duration | 🔴 Critical | 1-2 days |
| **Track conflicts** | ~50% of tracks | 🔴 Critical | 1-2 days |
| **Polyphony loss** | Unknown % (depends on MIDI) | 🔴 **Critical** | 2-3 days |
| Timing quantization | ~20% precision | 🟡 Moderate | 1 day |

### Recommended Implementation Order

Since we're already rewriting the track allocation logic for the track conflict fix, we should **combine both fixes**:

**Phase 3 (revised): Track Allocation Rewrite**
1. Fix track conflicts (use track index instead of channel)
2. **Add polyphony detection and track splitting**
3. Implement voice allocation for same instrument

**Effort**: 2-3 days (only slightly more than original track conflict fix)

**Benefit**: Solves **two major data loss issues** in one phase!

---

## Testing Strategy

### 1. Create Test MIDI File

Create a simple MIDI with known polyphony:

```
Channel 1:
  Time 0: C-4, E-4, G-4 (chord)
  Time 100: D-4
  Time 200: F-4, A-4 (partial chord)
```

### 2. Verify Output

```yaml
# Should produce 3 tracks for Channel 1 polyphony:
instruments: [0, 0, 0]
pattern:
  - ["C-4", "E-4", "G-4"]  # All three notes preserved
  - ["D-4", "---", "---"]
  - ["F-4", "A-4", "---"]
```

### 3. Test E1M1

Before/after analysis:
- Count total notes in MIDI
- Count total notes in YAML
- Verify no lost notes
- Listen for fuller sound (harmonies, chords)

---

## OPL3 Hardware Limitations

### Voice Limits

OPL3 has **18 independent voices** (or 36 if using 4-operator mode sparingly).

**Implication**: If a MIDI file uses more than 18 simultaneous notes across all channels, we'll need:

1. **Voice stealing** - Release quietest/oldest voice when limit reached
2. **Priority system** - Keep important notes (melody, bass)
3. **Warning messages** - Alert user if exceeding hardware capacity

### Voice Allocation Strategy

```javascript
// Pseudocode for voice management
const activeVoices = [];  // Track all 18 OPL3 voices

function allocateVoice(note, velocity, instrument) {
  if (activeVoices.length < 18) {
    // Simple case: allocate new voice
    return allocateNewVoice();
  } else {
    // Voice stealing: find quietest or oldest voice
    const voiceToSteal = findLowestPriority(activeVoices);
    releaseVoice(voiceToSteal);
    return voiceToSteal;
  }
}
```

**Note**: This is a **playback concern**, not a conversion concern. The YAML should preserve all notes, and the player handles voice limits.

---

## Expected Impact

### If E1M1 Uses Polyphony (Likely)

**Before** (current):
- ❌ Chords become single notes
- ❌ Harmonies lost
- ❌ Power chords missing bass notes
- ❌ Layered parts thin
- **Sound**: Empty, harmonically simple

**After** (with fix):
- ✅ Full chords preserved
- ✅ Harmonies intact
- ✅ Complete bass lines
- ✅ Layered richness
- **Sound**: Full, harmonically rich

### Data Recovery

If E1M1 has polyphony, we could recover:
- **Unknown % of notes** (depends on how much polyphony is used)
- **Harmonic complexity** (chords vs single notes)
- **Texture and depth** (layered parts)

**Combined with other fixes:**
- Track conflicts: ~50% of tracks restored
- Polyphony: Additional notes within tracks restored
- Velocity: Dynamics restored
- Note-offs: Articulation restored

**Result**: E1M1 should sound **dramatically** closer to original Doom!

---

## Related Issues

This issue compounds with:

1. **Track Conflict Issue** ([MIDI-TRACK-LOSS-ANALYSIS.md](MIDI-TRACK-LOSS-ANALYSIS.md))
   - Both cause note loss
   - Can occur simultaneously
   - Combined fix is optimal

2. **Velocity Loss** ([MIDI-CONVERSION-DATA-LOSS.md](MIDI-CONVERSION-DATA-LOSS.md))
   - Chords lose individual note velocities
   - Compounds harmonic flattening

3. **Note-Off Loss** ([MIDI-CONVERSION-DATA-LOSS.md](MIDI-CONVERSION-DATA-LOSS.md))
   - Sustained chord notes bleed together
   - Compounds muddiness

---

## E1M1 Polyphony Analysis Results

**Analysis Date**: 2025-11-12

**Findings**: E1M1 has **MASSIVE polyphony loss**!

```
📊 SUMMARY

   Channels with polyphony: 3/16
   Total polyphonic events: 805

⚠️  WARNING: This MIDI file uses polyphony (multiple notes per channel).
   Our current tracker format can only store ONE note per channel per row.
   We are LOSING 805 polyphonic note events during conversion!
```

### Detailed Breakdown

**Channel 2 - Overdriven Guitar**: 224 polyphonic events
- Max simultaneous notes: 2
- Pattern: Playing **power chords** (root + octave or fifth)
- Examples: E-2 + E-3, E-2 + D-3, E-2 + C-3
- **Impact**: Guitar power chords become single notes!

**Channel 3 - Electric Bass**: 246 polyphonic events
- Max simultaneous notes: 2
- Pattern: Playing **bass octaves** (root + octave)
- Examples: E-2 + E-3, E-2 + D-3
- **Impact**: Bass loses its thickness and power!

**Channel 10 - Percussion**: 335 polyphonic events
- Max simultaneous notes: **5** (!)
- Pattern: **Multiple drums hit simultaneously** (kick + snare + hi-hat + cymbals)
- Examples: C-2 + E-2 + F-2 (kick + snare + hi-hat)
- **Impact**: Drum grooves become single hits instead of full kit!

### Data Loss Impact

- **~805 notes lost** from polyphony (in addition to track conflicts!)
- **100% of power chords** reduced to single notes
- **100% of simultaneous drum hits** reduced to one drum
- **Bass loses octave doubling** that gives it power

**This explains why E1M1 sounds so thin and weak!** The guitar power chords, bass octaves, and simultaneous drum hits are all being reduced to single notes.

---

## Action Items

### Immediate
1. ✅ **Document polyphony issue** (this document)
2. ✅ **Analyze E1M1 for actual polyphony usage** ← **CONFIRMED CRITICAL**
3. ✅ **Update implementation plan** to include polyphony in Phase 3

### Implementation
4. ⏸️ Combine track conflict + polyphony fixes in single phase
5. ⏸️ Implement track splitting algorithm
6. ⏸️ Test with polyphonic MIDI file
7. ⏸️ Re-convert E1M1 and verify improvement

---

## Conclusion

**Polyphony loss is a critical data loss issue** that causes:
- Lost chord notes
- Lost harmonies
- Lost layered parts
- Thin, harmonically simple output

**The fix** (automatic track splitting) should be **combined with the track conflict fix** in Phase 3, as they both involve rewriting track allocation logic.

**Expected impact**: If E1M1 uses polyphony (very likely for guitar chords, bass, etc.), fixing this will make the music sound **significantly fuller and more harmonic**.

---

**Status**: DOCUMENTED - AWAITING ANALYSIS AND IMPLEMENTATION
**Priority**: 🔴 CRITICAL (same as track conflicts)
**Related To**: Track conflicts, velocity loss, note-off loss
**Next Step**: Analyze E1M1 MIDI to confirm polyphony usage and quantify impact

**Last Updated**: 2025-11-12
**Documented By**: Claude (based on user observation)
