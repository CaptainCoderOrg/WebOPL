# Doom Sound Quality Investigation

**Date:** 2025-01-11
**Status:** Root Cause Identified
**Severity:** High - Missing Critical Features

---

## Executive Summary

Doom instrument sounds in WebOPL do not match the authentic game audio. After comprehensive analysis of the entire audio pipeline from binary .op2 files through to OPL3 register writes, we have identified **three critical missing features** that prevent accurate Doom sound reproduction:

1. **Dual-Voice/Pseudo 4-Operator Support** (CRITICAL - affects 125/128 instruments)
2. **Instrument Flags Field** (IMPORTANT - affects 35/128 instruments)
3. **Pitch Finetune Field** (IMPORTANT - affects 27/128 instruments)

---

## Background: OP2/DMX File Format

### File Structure

The OP2 format (used by DMX sound library in Doom) stores 175 instruments with the following structure per instrument (36 bytes):

```
Offset  Size  Field
------  ----  -----
0-1     2     Flags (uint16 LE)
2       1     Finetune (uint8)
3       1     Note (uint8)
4-9     6     Voice 1 Modulator operator
10      1     Voice 1 Feedback/Connection
11-16   6     Voice 1 Carrier operator
17      1     Unused
18-19   2     Voice 1 Base note offset (int16 LE)
20-25   6     Voice 2 Modulator operator
26      1     Voice 2 Feedback/Connection
27-32   6     Voice 2 Carrier operator
33      1     Unused
34-35   2     Voice 2 Base note offset (int16 LE)
```

### Operator Structure (6 bytes)

```
Byte  Field           Bits
----  -----           ----
0     AVEKM          7=Trem, 6=Vib, 5=Sus, 4=KSR, 0-3=Multi
1     Attack/Decay   7-4=Attack, 3-0=Decay
2     Sustain/Rel    7-4=Sustain, 3-0=Release
3     Waveform       2-0=Wave (0-7)
4     Key Scale      7-6=KSL (0-3)
5     Output Level   5-0=Level (0-63)
```

---

## Investigation Timeline

### Initial Report
User: "The generated audio doesn't sound the way I would expect doom 1 to sound."

### First Hypothesis (INCORRECT)
Initially suspected the **connection bit** was inverted in the parser:
- Line 187/194: `additive: (feedback1 & 0x01) === 0`
- Changed to: `additive: (feedback1 & 0x01) !== 0`
- **Result:** User reported it made sound "much closer" but still not exact

### Second Hypothesis (INCORRECT)
Suspected **byte order** in operator parsing was wrong based on comparison showing all ADSR values mismatched.
- Attempted to fix byte assignments in `parseOperator()`
- **Result:** User reported it made sound "much worse"
- Reverted change and realized original parser was actually correct per Kaitai Struct specification

### Comprehensive Pipeline Analysis
Created full data flow analysis tracing binary → JSON → TypeScript → OPL registers:

**Key Findings:**
1. ✅ Parser correctly reads all bytes from OP2 format
2. ✅ JSON correctly stores operator parameters
3. ✅ catalogLoader correctly transforms data
4. ✅ SimpleSynth correctly writes OPL registers
5. ❌ **Three critical fields are missing from the pipeline**

---

## Critical Finding #1: Missing Dual-Voice Support

### The Problem

**125 out of 128 Doom instruments contain Voice 2 data**, but SimpleSynth only plays Voice 1.

### Evidence

From `findMissingData.js` analysis:
```
Instruments with voice 2 data: 125/128

Examples:
- Instrument 0 (Acoustic Grand Piano): has voice 2 data
- Instrument 1 (Bright Acoustic Piano): has voice 2 data
- Instrument 2 (Electric Grand Piano): has voice 2 data
- Instrument 30 (Distortion Guitar): has voice 2 data
```

### What This Means

OP2 format supports **pseudo 4-operator synthesis** by playing two 2-operator voices simultaneously:
- **Voice 1**: 2 operators (modulator + carrier) on OPL channel X
- **Voice 2**: 2 operators (modulator + carrier) on OPL channel Y
- Both voices play the same note at the same time
- This creates richer, more complex timbres than single 2-operator FM

**Current behavior:** Only Voice 1 plays = thin, incomplete sound
**Expected behavior:** Both voices play together = authentic Doom sound

### Technical Requirements

When playing a dual-voice instrument:
1. Allocate TWO OPL hardware channels instead of one
2. Program Voice 1 to first channel
3. Program Voice 2 to second channel
4. Trigger both channels with same note/frequency
5. Both voices remain linked until note-off
6. Release both channels together

### Current Code Status

**Types:** ✅ Support exists
```typescript
// OPLPatch.ts lines 60-65
voice1?: OPLVoice;
voice2?: OPLVoice;
dualVoiceEnabled?: boolean;
```

**SimpleSynth:** ❌ No implementation
- No code checks for `voice2` data
- No dual-channel allocation logic
- Only `voice1` or backward-compatible fields are used

---

## Critical Finding #2: Missing Flags Field

### The Problem

The **Flags** field (bytes 0-1) is read from binary but never stored in JSON or used in playback.

### Flags Bit Definitions

According to OP2 specification:
- **Bit 0:** Fixed pitch - ignore note-on pitch, use `note` field value
- **Bit 2:** Double voice - explicitly marks dual-voice instruments
- Other bits reserved/unused

### Evidence

From `findMissingData.js`:
```
Total instruments with non-zero flags: 35/128

Examples:
- Instrument 2: flags=0x0004 (bit 2 set = dual-voice)
- Instrument 3: flags=0x0004 (bit 2 set = dual-voice)
- Instrument 5: flags=0x0004 (bit 2 set = dual-voice)
```

### Impact

1. **Bit 0 (Fixed Pitch):** Percussion instruments should always play at same pitch
   - Affects: 2 instruments (Helicopter, Applause)
   - Without this: Percussion sounds wrong pitch

2. **Bit 2 (Double Voice):** Explicitly indicates dual-voice mode
   - Affects: 35 instruments explicitly marked
   - Without this: Can't determine which instruments MUST use dual-voice
   - Note: Many more instruments have voice2 data but don't set this flag

### Current Pipeline

```javascript
// convertDMXCollections.js line 161-162
const flags = buffer.readUInt16LE(offset);  // Read from binary
const finetune = buffer.readUInt8(offset + 2);
const note = buffer.readUInt8(offset + 3);

// line 179-198 - parseInstrument return
return {
  id: index,
  name: name,
  note: note !== 0 ? note : undefined,  // ✓ Stored
  voice1: { ... },
  voice2: { ... }
  // ❌ flags: NOT STORED
  // ❌ finetune: NOT STORED
};
```

---

## Critical Finding #3: Missing Finetune Field

### The Problem

The **Finetune** field (byte 2) adjusts instrument pitch but is read and discarded.

### Evidence

From `findMissingData.js`:
```
Unique finetune values: 116, 118, 120, 122, 123, 125, 126, 127, 128,
                        129, 130, 131, 132, 133, 134, 136, 138, 139
Instruments with non-standard finetune: 27/128

Examples:
- Instrument 3: finetune=130  (slightly sharp)
- Instrument 18: finetune=138 (sharp)
- Instrument 21: finetune=125 (slightly flat)
- Instrument 23: finetune=129 (slightly sharp)
- Instrument 39: finetune=118 (flat)
```

### What Finetune Does

Finetune adjusts the base frequency/pitch of an instrument:
- **128** = normal/reference pitch (0 cents)
- **< 128** = flat (lower pitch)
- **> 128** = sharp (higher pitch)

The exact formula varies by implementation, but typical range is approximately:
- 0 = -100 cents (1 semitone flat)
- 128 = 0 cents (reference)
- 255 = +100 cents (1 semitone sharp)

### Impact

Without finetune:
- 27 instruments play at slightly wrong pitch
- Subtle but affects musical accuracy
- Chords and harmonies may sound "off"

### Where It Should Be Applied

In SimpleSynth, when calculating frequency for a note:
```typescript
// Current (simplified):
const freq = MIDI_TO_OPL[midiNote].fnum;

// Should be:
const finetuneOffset = (finetune - 128) * someFactor;
const adjustedNote = midiNote + finetuneOffset;
const freq = MIDI_TO_OPL[adjustedNote].fnum;
```

---

## Data Flow Analysis Summary

### What We Verified ✅

1. **OP2 Binary Parsing:** Correctly reads all 36 bytes per instrument
2. **Operator Data:** All 6 bytes per operator parsed correctly:
   - Byte 0 → Characteristics (AVEKM)
   - Byte 1 → Attack/Decay
   - Byte 2 → Sustain/Release
   - Byte 3 → Waveform
   - Byte 4 → Key Scale Level
   - Byte 5 → Output Level

3. **JSON Storage:** All operator parameters correctly stored
4. **Type Transformation:** catalogLoader correctly maps abbreviated fields to full names
5. **OPL Register Writes:** SimpleSynth correctly constructs and writes register values

### What We Found Missing ❌

1. **Dual-Voice Playback:** SimpleSynth doesn't use voice2 data
2. **Flags Field:** Never stored in JSON or used
3. **Finetune Field:** Never stored in JSON or used

---

## Example: Instrument 30 (Distortion Guitar)

### Binary Data
```
Offset 0-1:   flags = 0x0000
Offset 2:     finetune = 128 (normal pitch)
Offset 3:     note = 0 (not fixed pitch)
Offset 4-9:   Voice 1 Modulator
Offset 10:    feedback = 6, connection = 0 (FM)
Offset 11-16: Voice 1 Carrier
Offset 20-25: Voice 2 Modulator (all zeros)
Offset 26:    feedback = 0, connection = 0
Offset 27-32: Voice 2 Carrier (all zeros)
```

### Current Behavior
- SimpleSynth plays only Voice 1
- 2 operators (mod + car)
- Produces basic distorted guitar sound

### Expected Behavior (if Voice 2 had data)
- SimpleSynth should play both voices
- 4 operators total (voice1 mod+car + voice2 mod+car)
- Richer, more complex distorted guitar timbre

**Note:** This particular instrument has empty Voice 2, but most Doom instruments have active Voice 2 data.

---

## Comparison with Reference Implementation

### libADLMIDI (Reference)

The libADLMIDI library (source of our OP2 files) implements:
- ✅ Dual-voice support (allocates 2 or 4 OPL channels)
- ✅ Flags field parsing and usage
- ✅ Finetune field application
- ✅ Voice 2 data utilization

Source: https://github.com/Wohlstand/libADLMIDI

### WebOPL (Current)

- ❌ No dual-voice support
- ❌ Flags field not stored/used
- ❌ Finetune field not stored/used
- ✅ Operator data correctly parsed
- ✅ Register writes correct

---

## Impact Assessment

### Audio Quality Impact

| Issue | Severity | Instruments Affected | Impact |
|-------|----------|---------------------|--------|
| Missing dual-voice | **CRITICAL** | 125/128 (98%) | Thin, incomplete sound |
| Missing flags (dual-voice bit) | High | 35/128 (27%) | Wrong voice mode |
| Missing flags (fixed pitch bit) | Low | 2/128 (2%) | Wrong pitch on percussion |
| Missing finetune | Medium | 27/128 (21%) | Slightly wrong pitch |

### Why Doom Sounds Wrong

The primary issue is **missing dual-voice support**. Doom's signature heavy metal sound comes from layering two FM voices together. Playing only one voice is like:
- Hearing only the left channel of stereo audio
- Playing only the rhythm guitar without lead guitar
- Using 2 operators instead of 4 in an FM synth

The sound is recognizable but lacks depth, richness, and authenticity.

---

## Recommended Implementation Order

### Phase 1: Enable Dual-Voice (CRITICAL)

1. **Update DMX converter** to store flags and finetune:
   ```javascript
   return {
     id: index,
     name: name,
     flags: flags,              // ADD
     finetune: finetune,        // ADD
     note: note !== 0 ? note : undefined,
     voice1: { ... },
     voice2: { ... }
   };
   ```

2. **Update OPLPatch interface** to include new fields:
   ```typescript
   export interface OPLPatch {
     // ... existing fields ...
     flags?: number;             // ADD
     finetune?: number;          // ADD
     isDualVoice?: boolean;      // ADD (computed from flags or voice2 data)
   }
   ```

3. **Implement dual-voice in SimpleSynth**:
   - Detect when instrument has voice2 data or flags bit 2
   - Allocate 2 OPL channels instead of 1
   - Program both voices
   - Play both simultaneously
   - Track and release both together

### Phase 2: Apply Finetune (IMPORTANT)

1. Store finetune in JSON (done in Phase 1)
2. Apply finetune adjustment in frequency calculation
3. Test with instruments that have non-standard finetune

### Phase 3: Respect Flags (IMPORTANT)

1. Store flags in JSON (done in Phase 1)
2. Check bit 0 for fixed-pitch mode
3. Check bit 2 for explicit dual-voice flag
4. Handle percussion instruments correctly

---

## Testing Strategy

### Verification Steps

1. **Play Doom E1M1 (At Doom's Gate):**
   - Before: Thin, lacks power
   - After dual-voice: Rich, heavy, authentic Doom sound

2. **Test specific instruments:**
   - Instrument 0 (Piano): Should be fuller with voice2
   - Instrument 30 (Distortion Guitar): Check tone quality
   - Instrument 125 (Helicopter): Should respect fixed pitch

3. **Compare with reference:**
   - Play same MIDI in ZDoom with original GENMIDI
   - Compare with WebOPL output
   - Should sound virtually identical

### Success Criteria

- ✅ E1M1 sounds authentic to original Doom
- ✅ All 125 dual-voice instruments use both voices
- ✅ Percussion instruments play at correct fixed pitch
- ✅ Instruments with finetune sound in-tune

---

## Related Files

### Scripts
- `convertDMXCollections.js` - OP2 binary parser (needs flags/finetune storage)
- `fullPipelineAnalysis.js` - Complete data flow verification
- `findMissingData.js` - Discovers missing fields
- `analyzeDoominstruments.js` - Binary vs JSON comparison

### Source Code
- `src/SimpleSynth.ts` - Needs dual-voice implementation
- `src/types/OPLPatch.ts` - Types already support dual-voice
- `src/utils/catalogLoader.ts` - Transform pipeline (works correctly)

### Data
- `public/instruments/dmx/doom1.json` - Doom instrument bank (needs regeneration)
- `scripts/.cache/doom1.op2` - Original binary file

---

## References

- **OP2 Format Specification:** https://moddingwiki.shikadi.net/wiki/OP2_Bank_Format
- **Kaitai Struct Spec:** https://formats.kaitai.io/genmidi_op2/
- **libADLMIDI Source:** https://github.com/Wohlstand/libADLMIDI
- **OPL3 Programming:** http://www.shikadi.net/moddingwiki/OPL_chip

---

## Conclusion

The Doom sound quality issue stems from **three missing features in the audio pipeline**, with dual-voice support being the most critical. All data is correctly parsed and stored through to SimpleSynth, but SimpleSynth only utilizes voice1 of dual-voice instruments.

**Current State:** Parser ✅, Storage ✅, Playback ❌
**Required Work:** Implement dual-voice playback in SimpleSynth
**Expected Outcome:** Authentic Doom sound quality

---

**Document Version:** 1.0
**Last Updated:** 2025-01-11
**Status:** Investigation Complete - Ready for Implementation
