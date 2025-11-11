# HMI Format Issue - TO BE RESOLVED

**Date:** 2025-11-11
**Status:** ⚠️ Temporarily Disabled

---

## Summary

HMI/BNK format collections were temporarily removed from the catalog due to audio output issues. The parser was created and appears to correctly extract ADSR values from the binary format, but the resulting instruments still don't produce proper audio output.

---

## What Was Done

### 1. HMI Parser Created
- Created [convertHMICollections.js](../minimal-prototype/scripts/convertHMICollections.js)
- Implemented binary BNK format parsing
- Correctly reads 13-byte instrument data structure
- Extracts nibbles from AD/SR bytes properly

### 2. Collections Converted
Successfully converted 6 HMI collections (768 instruments total):
1. **Descent** (Parallax, 1995) - 128 instruments
2. **Descent 2** (Parallax, 1996) - 128 instruments
3. **Shattered Steel** (BioWare, 1996) - 128 instruments
4. **Theme Park** (Bullfrog, 1994) - 128 instruments
5. **Normality** (Gremlin, 1996) - 128 instruments
6. **Earthsiege** (Dynamix, 1994) - 128 instruments

### 3. Bug Fix Applied
Fixed the initial parser bug where attack/decay/sustain/release were being read as separate bytes instead of nibbles:

**Before (Incorrect):**
```javascript
const mod_ad1 = buffer.readUInt8(offset + 2);
const mod_ad2 = buffer.readUInt8(offset + 3);
// Wrong offsets and logic
```

**After (Correct):**
```javascript
const mod_ad = buffer.readUInt8(offset + 2);   // Single byte
const mod_sr = buffer.readUInt8(offset + 3);   // Single byte
// Extract nibbles:
attack: (ad >> 4) & 0x0F
decay: ad & 0x0F
```

---

## Current Problem

**User Report:** "When I load any of the HMI collections, there is no audio output from them."

### What We Know:
1. ✅ ADSR values are now being extracted correctly (verified in JSON)
2. ✅ Values are non-zero and varied (attack=1, decay=12, etc.)
3. ✅ JSON structure matches the expected format
4. ❌ **Still no audio output when loaded in WebOrchestra**

### Possible Causes (To Investigate):

1. **Field Mapping Issue**
   - HMI JSON uses abbreviated field names (`multi`, `attack`, `wave`, etc.)
   - catalogLoader.ts transforms these to full names (`frequencyMultiplier`, `attackRate`, etc.)
   - Possible mismatch in transformation?

2. **Byte Interpretation Issue**
   - OPL2 register values might need different interpretation
   - Possible endianness issue?
   - Bit ordering within registers?

3. **Missing Fields**
   - HMI instruments might need additional fields
   - Connection/feedback values might be incorrect
   - baseNote/noteOffset might be wrong

4. **OPL2 vs OPL3 Compatibility**
   - HMI banks are OPL2 format
   - WebOrchestra uses OPL3 synth
   - Possible compatibility issue despite backward compatibility claims?

---

## HMI/BNK Format Specification

### File Structure:
```
Header (28 bytes):
  0x00: Version (2 bytes, LE)
  0x02: Signature (8 bytes, "ADLIB-" or "AMLIB-")
  0x0C: Name table offset (2 bytes, LE)
  0x10: Data offset (2 bytes, LE)

Name Table (12 bytes per entry):
  0x00: Index (2 bytes)
  0x02: Name (10 bytes, null-padded)

Instrument Data (13 bytes per instrument):
  Byte 0:  Modulator AVEKM (AM/Vib/EG-Type/KSR/Multiplier)
  Byte 1:  Modulator KSLTL (Key Scale Level / Total Level)
  Byte 2:  Modulator AD (Attack upper nibble, Decay lower nibble)
  Byte 3:  Modulator SR (Sustain upper nibble, Release lower nibble)
  Byte 4:  Modulator Waveform
  Byte 5:  Carrier AVEKM
  Byte 6:  Carrier KSLTL
  Byte 7:  Carrier AD
  Byte 8:  Carrier SR
  Byte 9:  Carrier Waveform
  Byte 10: Feedback/Connection
```

### Register Bit Layout:
```
AVEKM (Characteristic):
  Bit 7: Tremolo (AM)
  Bit 6: Vibrato
  Bit 5: Envelope Type (Sustain)
  Bit 4: Key Scale Rate
  Bits 0-3: Frequency Multiplier

KSLTL (Scale/Level):
  Bits 6-7: Key Scale Level
  Bits 0-5: Total Level (Output Level)

AD (Attack/Decay):
  Bits 4-7: Attack Rate (upper nibble)
  Bits 0-3: Decay Rate (lower nibble)

SR (Sustain/Release):
  Bits 4-7: Sustain Level (upper nibble)
  Bits 0-3: Release Rate (lower nibble)

Waveform:
  Bits 0-2: Waveform select (0-7)

Feedback/Connection:
  Bits 1-3: Feedback level
  Bit 0: Connection (0=FM, 1=Additive)
```

---

## Example Binary Data

From [descent_melodic.bnk](../minimal-prototype/scripts/.cache/descent_melodic.bnk):

**Instrument 0 (Acoustic Grand Piano):**
```
Raw bytes: 00 00 01 03 04 09 01 01 05 09 08 00 00

Parsed:
  Mod AVEKM: 0x00 (trem=false, vib=false, sus=false, ksr=false, multi=0)
  Mod KSLTL: 0x00 (ksl=0, out=0)
  Mod AD:    0x01 (attack=0, decay=1)
  Mod SR:    0x03 (sustain=0, release=3)
  Mod Wave:  0x04 (wave=4)

  Car AVEKM: 0x09 (trem=false, vib=false, sus=false, ksr=false, multi=9)
  Car KSLTL: 0x01 (ksl=0, out=1)
  Car AD:    0x05 (attack=0, decay=5)
  Car SR:    0x09 (sustain=0, release=9)
  Car Wave:  0x08 (wave=0, masked to 0-7)
```

---

## Files Created

### Converter Script:
- [minimal-prototype/scripts/convertHMICollections.js](../minimal-prototype/scripts/convertHMICollections.js)

### JSON Output Files:
- minimal-prototype/public/instruments/hmi/descent.json
- minimal-prototype/public/instruments/hmi/descent2.json
- minimal-prototype/public/instruments/hmi/shattered-steel.json
- minimal-prototype/public/instruments/hmi/theme-park.json
- minimal-prototype/public/instruments/hmi/normality.json
- minimal-prototype/public/instruments/hmi/earthsiege.json

### Cached Binary Files:
- minimal-prototype/scripts/.cache/descent_melodic.bnk
- minimal-prototype/scripts/.cache/descent2_melodic.bnk
- minimal-prototype/scripts/.cache/shattered-steel_melodic.bnk
- minimal-prototype/scripts/.cache/theme-park_melodic.bnk
- minimal-prototype/scripts/.cache/normality_melodic.bnk
- minimal-prototype/scripts/.cache/earthsiege_melodic.bnk

---

## Next Steps To Resolve

### 1. Debug Audio Output
- Test HMI instruments in isolation
- Compare with working AIL/DMX instruments
- Check if synth is receiving correct parameters

### 2. Verify Field Transformation
- Print transformed data before sending to synth
- Verify all fields match expected OPLPatch interface
- Check if backward-compatible fields are populated

### 3. Compare with libADLMIDI
- Look at how libADLMIDI interprets HMI format
- Check if there's additional processing needed
- Verify register value interpretation

### 4. Test OPL2 Compatibility
- Create minimal test case with single HMI instrument
- Try loading same instrument as AIL/DMX format
- Isolate whether it's format-specific or parser-specific

---

## References

- **libADLMIDI HMI banks:** https://github.com/Wohlstand/libADLMIDI/tree/master/fm_banks/hmi
- **OPL2 Programming:** http://www.shikadi.net/moddingwiki/OPL_chip
- **HMI Format Docs:** http://www.shikadi.net/moddingwiki/HMI_Timbre_Library

---

## Status Update Required

Once the audio issue is resolved:
1. Re-enable HMI collections in [catalog.json](../minimal-prototype/public/instruments/catalog.json)
2. Update this document with the solution
3. Test all 6 collections for audio output
4. Consider adding more HMI collections from libADLMIDI

---

**Last Updated:** 2025-11-11
**Issue Owner:** To be assigned
