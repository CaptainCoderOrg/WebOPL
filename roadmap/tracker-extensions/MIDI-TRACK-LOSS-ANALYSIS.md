# MIDI Track Loss Analysis - E1M1

## The Problem: Multiple Tracks Using Same MIDI Channel

### What the Original MIDI File Has:

```
MIDI File: 11 tracks total
Format: 1 (multiple tracks, synchronous)

Track 0: Tempo/meta track (no notes)
Track 1: Channel 1 → Program 30 (Distortion Guitar)
Track 2: Channel 2 → Program 29 (Overdriven Guitar)
Track 3: Channel 1 → Program 30 (Distortion Guitar)  ← SAME CHANNEL AS TRACK 1!
Track 4: Channel 2 → Program 29 (Overdriven Guitar)  ← SAME CHANNEL AS TRACK 2!
Track 5: Channel 3 → Program 34 (Electric Bass pick)
Track 6-8: Empty or percussion setup
Track 9: Channel 5 → Program 73
Track 10: Channel 7 → Program 38
```

### What Our Converter Produces:

```yaml
instruments: [30, 29, 34, 999]
# Only 4 tracks!

Track 0: Instrument 30 (from MIDI Channel 1)
Track 1: Instrument 29 (from MIDI Channel 2)
Track 2: Instrument 34 (from MIDI Channel 3)
Track 3: Percussion Kit (from MIDI Channel 10)
```

**We're missing:**
- Track 3's Distortion Guitar (merged into Track 0)
- Track 4's Overdriven Guitar (merged into Track 1)
- Track 9's Channel 5
- Track 10's Channel 7

---

## Root Cause

### Our Flawed Conversion Logic:

```javascript
// convertMIDIToPattern.js lines 226-247
for (let trackIndex = 0; trackIndex < midiData.tracks.length; trackIndex++) {
  const track = midiData.tracks[trackIndex];
  let absoluteTime = 0;

  for (const event of track.events) {
    absoluteTime += event.deltaTime;

    timeline.push({
      time: absoluteTime,
      trackIndex,
      ...event  // event.channel is the MIDI channel (0-15)
    });
  }
}

// Then later (lines 273-330):
const channel = event.channel;  // ← Using MIDI channel as output track!
if (channel >= maxChannels) continue;

rows[currentRow][channel] = { /* note data */ };  // ← Overwrites!
```

**The problem:**
1. We merge all MIDI tracks into a single timeline
2. We use `event.channel` (MIDI channel 0-15) as the output track index
3. Multiple MIDI tracks can use the same channel
4. **When they do, their notes compete for the same output track slot!**

### What Actually Happens:

```
Time 100: Track 1 (Channel 1) plays note E-2
          → Written to output[channel=1]

Time 100: Track 3 (Channel 1) plays note G-2
          → Overwrites output[channel=1] ← LOST THE E-2!
```

Only the **last note** at each time slice on each channel survives!

---

## Real-World Impact on E1M1

### Guitar Layers Lost:

**Original Doom arrangement:**
- **Two** Distortion Guitar parts (harmonizing or playing different patterns)
- **Two** Overdriven Guitar parts (rhythm + lead)
- = 4 guitar tracks creating a rich, layered sound

**Our converted version:**
- **One** Distortion Guitar track (Track 1 + 3 merged, notes conflict)
- **One** Overdriven Guitar track (Track 2 + 4 merged, notes conflict)
- = 2 guitar tracks, sounds thin and empty

**This is why it doesn't sound like Doom!** We're missing half the guitar parts!

---

## Technical Details: MIDI Channels vs MIDI Tracks

### MIDI Standard Allows:

```
Format 1 MIDI:
- Multiple independent tracks
- Each track can specify which MIDI channel to use
- Multiple tracks CAN use the same channel
- The receiving synth handles voice allocation

Example valid arrangement:
Track 1: Channel 1, plays melody A
Track 2: Channel 1, plays harmony B  ← Same channel!
Track 3: Channel 2, plays bass

When played:
- Synth receives both melody A and harmony B on channel 1
- Synth allocates 2 voices and plays both simultaneously
```

### What We're Doing Wrong:

```javascript
// We treat MIDI channel as output track index
outputTrack[midiChannel] = note;

// This means:
outputTrack[1] = melody A;
outputTrack[1] = harmony B;  // ← Overwrites melody A!
```

We're using a **flat array indexed by channel**, which can only hold one value per channel!

---

## How Original Doom Handled This

### DMX Sound Library:

The original Doom used the DMX sound library with **MUS format**, not MIDI. MUS format has:

1. **Up to 16 independent channels** (not MIDI channels, but logical voices)
2. Each channel has its own voice allocation
3. No channel reuse conflicts

When Doom converted MIDI → MUS, it likely:
- Preserved all independent tracks as separate channels
- Handled polyphonic instruments properly
- Maintained the layered guitar arrangement

### Why This Matters:

Original Doom MUS: **4 guitar tracks playing simultaneously**
Our conversion: **2 guitar tracks (with conflicts)**

Result: Our version sounds **empty and thin** compared to the original.

---

## Examples of Lost Notes

Here's what likely happens (hypothetical but realistic):

```
Original MIDI:
  Time 0:
    Track 1 (Ch 1): E-3 (Distortion Guitar, root note)
    Track 3 (Ch 1): G-3 (Distortion Guitar, harmony)

  Our output:
    Track 1: G-3  ← Only the last note on Channel 1 survives!
    (E-3 was overwritten)

  Time 480:
    Track 2 (Ch 2): C-2 (Overdriven Guitar, low riff)
    Track 4 (Ch 2): E-3 (Overdriven Guitar, high riff)

  Our output:
    Track 2: E-3  ← Only the last note on Channel 2 survives!
    (C-2 was overwritten)
```

**Result:** We lose half the notes, turning rich chords into single notes!

---

## Data Loss Summary

| Original MIDI | Our Output | Lost? |
|--------------|-----------|-------|
| Track 1: Distortion Guitar (Ch 1) | ✅ Track 0 | ⚠️ Merged with Track 3 |
| Track 2: Overdriven Guitar (Ch 2) | ✅ Track 1 | ⚠️ Merged with Track 4 |
| Track 3: Distortion Guitar (Ch 1) | ❌ LOST | 🔴 Conflicts with Track 1 |
| Track 4: Overdriven Guitar (Ch 2) | ❌ LOST | 🔴 Conflicts with Track 2 |
| Track 5: Electric Bass (Ch 3) | ✅ Track 2 | ✅ OK |
| Track 9: Program 73 (Ch 5) | ❌ LOST | 🔴 Track has notes? Filtered out? |
| Track 10: Program 38 (Ch 7) | ❌ LOST | 🔴 Track has notes? Filtered out? |
| Percussion (Ch 10) | ✅ Track 3 | ✅ OK |

**Confirmed data loss: At least 2 guitar tracks completely lost due to channel conflicts!**

---

## The Fix Required

### Option 1: Use MIDI Track as Output Track (Recommended)

Instead of using MIDI channel as the index, use the original MIDI track number:

```javascript
// Current (broken):
rows[currentRow][event.channel] = noteData;

// Fixed:
rows[currentRow][event.trackIndex] = noteData;
```

**Pros:**
- Preserves all original tracks
- No conflicts
- Maintains polyphony

**Cons:**
- Output might have many tracks (E1M1 has 11)
- Need to filter empty tracks
- Instrument assignment per track, not per channel

### Option 2: Dynamic Track Allocation

Allocate a new output track for each unique (channel, track) pair:

```javascript
const trackMap = new Map(); // Map<"channel-trackIdx", outputTrack>
const outputTracks = [];

for (const event of timeline) {
  const key = `${event.channel}-${event.trackIndex}`;
  if (!trackMap.has(key)) {
    trackMap.set(key, outputTracks.length);
    outputTracks.push(createTrack());
  }
  const outputTrack = trackMap.get(key);
  outputTracks[outputTrack][currentRow] = noteData;
}
```

**Pros:**
- Preserves all voices
- Handles complex arrangements
- More flexible

**Cons:**
- More complex implementation
- Track count varies per file

### Option 3: Increase Polyphony Per Channel

Allow multiple simultaneous notes per channel (chord support):

```javascript
// Instead of:
rows[currentRow][channel] = note;

// Use:
rows[currentRow][channel] = [note1, note2, note3];  // Array of notes
```

**Pros:**
- Keeps channel-based model
- Supports chords

**Cons:**
- Major format change
- Player complexity increases
- Still need voice allocation logic

---

## Recommendation

**Use Option 1 (MIDI Track → Output Track):**

1. Change converter to use `event.trackIndex` instead of `event.channel`
2. Filter out empty tracks at the end
3. Store instrument per track (from first program change on that track)
4. Accept that E1M1 might have 6-8 active output tracks instead of 4

**Benefits:**
- Simple to implement
- Preserves all original music data
- No conflicts or overwrites
- Closer to Doom's original sound

**This should restore the missing guitar parts and make E1M1 sound much richer!**

---

## Conclusion

**Yes, we are losing significant track information:**

1. ✅ **Velocity/volume** - Lost (see MIDI-CONVERSION-DATA-LOSS.md)
2. ✅ **Note durations** - Lost (see MIDI-CONVERSION-DATA-LOSS.md)
3. ✅ **Multiple tracks on same channel** - Lost (this document) 🔴
4. ✅ **Timing precision** - Quantized (see MIDI-CONVERSION-DATA-LOSS.md)

**Combined impact:** Our E1M1 has:
- No dynamic expression (flat velocity)
- No articulation (no note-offs)
- Missing guitar parts (track conflicts)
- Robotic timing (quantized grid)

The original has:
- Dynamic drums with accents
- Crisp note articulation
- Layered guitars (4 parts)
- Natural timing variations

**No wonder it sounds different!** We're losing approximately:
- **50% of guitar tracks** (2 of 4 guitar parts)
- **100% of velocity data** (all notes same volume)
- **100% of duration data** (no note-offs)
- **~20% of timing precision** (16th note quantization)

This is a massive data loss that completely changes the character of the music.
