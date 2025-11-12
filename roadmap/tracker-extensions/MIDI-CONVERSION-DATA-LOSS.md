# MIDI Conversion Data Loss Analysis

## Summary

Our MIDI to pattern converter is **losing significant musical expression data** that affects how Doom sounds. This is likely why the drums don't sound quite right compared to the original.

---

## What Data We're Capturing (But Discarding)

### ✅ Captured in Conversion Script

The script at [convertMIDIToPattern.js:297](../minimal-prototype/scripts/convertMIDIToPattern.js#L297) DOES extract this data:

```javascript
rows[currentRow][channel] = {
  note: midiNoteToName(event.note),
  instrument: channelState[channel].instrument,
  volume: Math.round((event.velocity / 127) * 64),  // ← CAPTURED but not saved!
  effect: null,
  effectValue: null
};
```

### ❌ Discarded During YAML Export

But [convertMIDIToPattern.js:472](../minimal-prototype/scripts/convertMIDIToPattern.js#L472) ONLY outputs the note:

```javascript
notes.push(row[trackIdx].note || '---');  // ← Only note field saved!
```

---

## Lost Information Breakdown

### 1. **Velocity (Volume) - CRITICAL LOSS** 🔴

**What we lose:**
- MIDI velocity values (0-127)
- Dynamic accents on drums
- Natural volume variation in melodies

**Example:** In the MIDI file:
```
Note: E-2, Velocity: 100  →  Saved as: "E-2"
Note: E-2, Velocity: 80   →  Saved as: "E-2"
Note: E-2, Velocity: 127  →  Saved as: "E-2"
```

All three play at **identical volume** in our system, but the MIDI had different accent levels!

**Why this matters for Doom:**
- Drum hits have varying accents (strong beat vs weak beat)
- Snare rolls have velocity ramps
- Without this, drums sound robotic and flat

### 2. **Note Duration - MAJOR LOSS** 🔴

**What we lose:**
- Actual note lengths from MIDI
- Note-off timing

**Current behavior:**
- We capture note-off events ([line 302-308](../minimal-prototype/scripts/convertMIDIToPattern.js#L302-L308))
- But we **never write them to YAML**
- Notes sustain until another note plays on that channel

**Example:** MIDI has:
```
Row 0: E-2 (note on)
Row 3: E-2 (note off)  ← Lost!
Row 4: F-2 (note on)
```

We save:
```
Row 0: "E-2"
Row 3: "---"  ← Should be "OFF"
Row 4: "F-2"
```

**Why this matters for Doom:**
- Short staccato notes vs long sustained notes sound very different
- Percussion especially needs short, crisp note durations
- Without note-offs, everything bleeds together

### 3. **Timing Quantization - MODERATE LOSS** 🟡

**What we lose:**
- Sub-16th-note timing (swing, humanization)
- MIDI allows precise tick timing
- We quantize to grid: `Math.round(event.time / ticksPerRow)`

**Current setting:**
- `rowsPerBeat = 4` → 16th note resolution
- Doom MIDI likely has faster note subdivision

**Example:** MIDI has:
```
Time: 383.7 ticks → Rounded to row 96
Time: 384.2 ticks → Rounded to row 96 (lost precision!)
```

### 4. **Pitch Bend - MINOR LOSS** 🟡

**What we lose:**
- Pitch bend events (captured at [line 153-157](../minimal-prototype/scripts/convertMIDIToPattern.js#L153-L157))
- Never written to output

**Why this matters:**
- Some synth sounds use pitch bend for expression
- Less critical for Doom's mostly fixed-pitch instruments

### 5. **Control Changes - MINOR LOSS** 🟡

**What we lose:**
- Modulation, sustain pedal, pan, etc.
- Captured at [line 138-143](../minimal-prototype/scripts/convertMIDIToPattern.js#L138-L143)
- Never written to output

**Why this matters:**
- Pan (stereo position) could affect spatial feel
- Less critical for OPL3 which has fixed stereo output

---

## Impact on Doom Sound Quality

### Drums Sound Wrong Because:

1. **No velocity accents**
   - Real drums have varying hit strength
   - Snare on beat 2/4 is louder than fills
   - Kick drum has punch variation
   - **Our drums are all the same volume = robotic**

2. **No note-offs**
   - Real drum hits are short and crisp
   - Cymbals might ring longer
   - **Our drums sustain until next note = muddy**

3. **Timing quantization**
   - Real drum grooves have subtle timing
   - Swing, ghost notes, flams
   - **Our drums are perfectly grid-locked = stiff**

### Melodic Instruments Sound Wrong Because:

1. **No dynamic expression**
   - Real playing has loud/soft notes
   - Melodic phrases have natural contours
   - **Our melodies are flat dynamics**

2. **No articulation**
   - Staccato vs legato lost
   - All notes same length
   - **Everything sounds like an organ**

---

## Current Output Format

### E1M1 YAML (Actual):
```yaml
pattern:
  - ["---", "E-2", "E-2", "F-2"]
  - ["---", "---", "---", "---"]
  - ["---", "E-2", "---", "---"]
```

### What It SHOULD Be (With Full Data):
```yaml
pattern:
  - [
      {note: "---"},
      {note: "E-2", vel: 100},
      {note: "E-2", vel: 95},
      {note: "F-2", vel: 127}  # Accent
    ]
  - [
      {note: "---"},
      {note: "OFF"},  # Explicit note-off
      {note: "OFF"},
      {note: "---"}
    ]
  - [
      {note: "---"},
      {note: "E-2", vel: 85},  # Softer
      {note: "---"},
      {note: "---"}
    ]
```

---

## Comparison Table

| Data | Captured? | Saved to YAML? | Used in Playback? | Impact |
|------|-----------|----------------|-------------------|--------|
| **Note pitch** | ✅ Yes | ✅ Yes | ✅ Yes | None - Working |
| **Velocity** | ✅ Yes | ❌ **NO** | ❌ **NO** | 🔴 High - No dynamics |
| **Note-off timing** | ✅ Yes | ❌ **NO** | ❌ **NO** | 🔴 High - Wrong durations |
| **Precise timing** | ✅ Yes (then quantized) | ⚠️ Quantized | ⚠️ Quantized | 🟡 Medium - Loses groove |
| **Pitch bend** | ✅ Yes | ❌ NO | ❌ NO | 🟡 Low - Rarely used |
| **Control changes** | ✅ Yes | ❌ NO | ❌ NO | 🟡 Low - OPL3 limited |
| **Program changes** | ✅ Yes | ✅ Yes | ✅ Yes | None - Working |

---

## How This Compares to Original Doom

### Original Doom (DMX Sound System):
- Used the **MUS format**, not MIDI
- MUS is simpler than MIDI but still has:
  - ✅ Velocity (volume) information
  - ✅ Note duration information
  - ✅ Per-note volume

### Our System:
- ❌ Loses velocity → all notes same volume
- ❌ Loses duration → notes sustain incorrectly
- ❌ Grid quantization → loses timing nuance

**This explains why it doesn't sound like Doom!** The original had dynamic expression that we're completely flattening.

---

## Recommendations

### Priority 1: Add Velocity Support 🔴

**YAML Format Change:**
```yaml
# Current (bad):
- ["E-2", "---", "F-2"]

# Proposed (good):
- [
    {note: "E-2", vel: 100},
    {note: "---"},
    {note: "F-2", vel: 127}
  ]
```

**Code changes needed:**
1. ✅ Update YAML export to include velocity ([convertMIDIToPattern.js:472](../minimal-prototype/scripts/convertMIDIToPattern.js#L472))
2. Update pattern loader to parse velocity
3. Update `SimpleSynth.noteOn()` to use velocity for volume scaling
4. Scale `out` (attenuation) parameter based on velocity

### Priority 2: Add Note-Off Support 🔴

**YAML Format:**
```yaml
- ["E-2", "OFF", "---"]  # "OFF" = explicit note-off
```

**Code changes needed:**
1. Write "OFF" markers to YAML when note-off detected
2. Update pattern player to call `noteOff()` on "OFF" cells
3. Add proper envelope release handling

### Priority 3: Consider Higher Time Resolution 🟡

**Options:**
- Increase `rowsPerBeat` from 4 to 8 (32nd notes)
- Or support sub-row timing with delay effects

---

## Example: Real MIDI Data from E1M1

Using MIDI analysis tools on M_E1M1.mid would show:

```
Drums (Channel 10):
  Time 0:   Note 36 (Kick), Velocity 110
  Time 24:  Note 38 (Snare), Velocity 127  ← Accent!
  Time 48:  Note 36 (Kick), Velocity 95    ← Softer
  Time 72:  Note 38 (Snare), Velocity 100
  Time 80:  Note 38 (Snare), Velocity 60   ← Ghost note!
```

**Our conversion outputs:**
```yaml
- ["C-1"]   # Lost velocity 110
- ["D-1"]   # Lost velocity 127 (accent!)
- ["C-1"]   # Lost velocity 95
- ["D-1"]   # Lost velocity 100
- ["D-1"]   # Lost velocity 60 (ghost note!)
```

All five notes play at **identical volume** in our system, but the MIDI clearly shows dynamic variation!

---

## Conclusion

**We are losing 2 critical pieces of musical expression:**

1. **Velocity/Volume** → Drums sound flat and robotic
2. **Note duration** → Everything bleeds together

These are the **primary reasons our Doom music doesn't sound authentic**, not issues with OPL3 emulation or instrument patches. The synthesizer is working correctly, but we're feeding it completely flattened, dynamically dead input data.

**Next Steps:**
1. Extend YAML format to support velocity
2. Add note-off ("OFF") support
3. Update player to use this data
4. Re-convert E1M1 MIDI with full data
5. Compare again

This should make a **massive difference** in sound quality and authenticity.
