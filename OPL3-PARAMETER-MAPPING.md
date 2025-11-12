# OPL3 Parameter Mapping Guide

This document explains how the JSON instrument data maps to OPL3 chip parameters and VST controls.

## Overview

Our JSON instrument format stores OPL3 patches with abbreviated field names. Each instrument has two voices (voice1 and voice2), and each voice has two operators (modulator and carrier).

## JSON Structure

```json
{
  "id": 0,
  "name": "Acoustic Grand Piano",
  "type": "melodic",
  "flags": 4,
  "finetune": 128,
  "isDualVoice": true,
  "voice1": {
    "mod": { /* modulator operator */ },
    "car": { /* carrier operator */ },
    "feedback": 0,
    "additive": false,
    "baseNote": 0
  },
  "voice2": { /* same structure as voice1 */ }
}
```

---

## Operator Parameters (Modulator & Carrier)

Each operator (mod/car) has the following parameters:

### ✅ **Mapped Parameters** (Available in JSON)

| VST Parameter | JSON Field | Range | OPL3 Register | Description |
|--------------|------------|-------|---------------|-------------|
| **Wave** | `wave` | 0-7 | 0xE0-0xF5 | Waveform select (0=sine, 1=half-sine, 2=abs-sine, 3=quarter-sine, 4-7=other) |
| **Frequency Multiplier** | `multi` | 0-15 | 0x20-0x35 bits 0-3 | Multiplies the base frequency (0=×0.5, 1=×1, 2=×2, ..., 15=×15) |
| **A** (Attack) | `attack` | 0-15 | 0x60-0x75 bits 4-7 | Attack rate (0=slowest, 15=fastest) |
| **D** (Decay) | `decay` | 0-15 | 0x60-0x75 bits 0-3 | Decay rate (0=slowest, 15=fastest) |
| **S** (Sustain Level) | `sustain` | 0-15 | 0x80-0x95 bits 4-7 | Sustain level (0=loudest, 15=quietest) |
| **R** (Release) | `release` | 0-15 | 0x80-0x95 bits 0-3 | Release rate (0=slowest, 15=fastest) |
| **Attenuation** | `out` | 0-63 | 0x40-0x55 bits 0-5 | Output level/attenuation (0=loudest, 63=quietest) |
| **Vibrato** | `vib` | boolean | 0x20-0x35 bit 6 | Enable vibrato (frequency modulation) |
| **Tremolo** | `trem` | boolean | 0x20-0x35 bit 7 | Enable tremolo (amplitude modulation) |
| **Sustain** (EG-Type) | `sus` | boolean | 0x20-0x35 bit 5 | Sustaining envelope (true=hold sustain level, false=decay to zero) |
| **Keyscale Env. Rate** | `ksr` | boolean | 0x20-0x35 bit 4 | Key scale rate (makes higher notes have faster envelopes) |
| **Keyscale Attenuation** | `ksl` | 0-3 | 0x40-0x55 bits 6-7 | Key scale level (makes higher notes quieter: 0=none, 3=max) |

#### 📝 **UI Translation Note: Attenuation (Output Level)**

The `out` field stores an integer (0-63) that represents attenuation in the OPL3 chip. For user interfaces that display dB values, use this conversion:

**Formula:** `dB = -(out × 0.75)`

Each step represents **0.75 dB** of attenuation:

| `out` (JSON) | dB (VST/UI) | Description |
|-------------|-------------|-------------|
| 0 | 0.0 dB | Loudest (no attenuation) |
| 1 | -0.75 dB | |
| 6 | -4.5 dB | |
| 8 | -6.0 dB | |
| 16 | -12.0 dB | |
| 32 | -24.0 dB | |
| 63 | -47.25 dB | Quietest (maximum attenuation) |

**For UI Implementation:**
- **Display to user:** Convert `out` → dB using formula above
- **Save to JSON:** Convert dB → `out` using: `out = Math.round(-dB / 0.75)` (clamped to 0-63)
- **Slider range:** -47.25 dB (quietest) to 0.0 dB (loudest)

**Example:**
```javascript
// JSON to UI (display)
const dB = -(jsonData.out * 0.75);  // out=6 → -4.5 dB

// UI to JSON (save)
const out = Math.max(0, Math.min(63, Math.round(-dB / 0.75)));  // -4.5 dB → 6
```

### 🔸 **Voice-Level Parameters** (Stored at voice level, not operator level)

| VST Parameter | JSON Field | Range | OPL3 Register | Description |
|--------------|------------|-------|---------------|-------------|
| **Feedback** | `feedback` | 0-7 | 0xC0-0xC8 bits 1-3 | Modulator self-feedback (0=none, 7=max) - **Note:** Only applies to FM mode |
| **Algorithm** | `additive` | boolean | 0xC0-0xC8 bit 0 | Connection type: false=FM (modulator→carrier), true=Additive (both heard) |

### ❌ **NOT Mapped** (Not available in OPL3 hardware)

| VST Parameter | Why Not Available |
|--------------|-------------------|
| **Velocity Sensitivity** | OPL3 has no built-in velocity sensitivity. This must be implemented in software by scaling the output level (`out`) based on MIDI velocity. |

---

## Global Parameters (Not Per-Instrument)

These parameters affect the entire OPL3 chip, not individual instruments:

### 🔸 **Effect Depth** (Global OPL3 Registers)

| VST Parameter | OPL3 Register | Range | Description |
|--------------|---------------|-------|-------------|
| **Tremolo Depth** | 0xBD bit 7 | 0-1 | Global tremolo depth: 0=1dB, 1=4.8dB |
| **Vibrato Depth** | 0xBD bit 6 | 0-1 | Global vibrato depth: 0=7%, 1=14% |

**Note:** Individual operators enable/disable tremolo and vibrato, but the depth is controlled globally for all operators.

### 🔸 **Percussion Mode** (Global OPL3 Feature)

| Parameter | OPL3 Register | Description |
|-----------|---------------|-------------|
| **Percussion Mode** | 0xBD bit 5 | Enables hardware percussion mode (uses channels 6-8 for 5 percussion instruments). **We don't use this** - instead we use the Percussion Kit approach with General MIDI note mapping. |

---

## Additional JSON Fields

### Top-Level Instrument Fields

| JSON Field | Type | Description |
|-----------|------|-------------|
| `id` | number | Instrument ID (0-127=melodic, 128-174=percussion) |
| `name` | string | Instrument name |
| `type` | string | "melodic" or "percussion" |
| `flags` | number | GENMIDI flags from OP2 file (bit 2 = dual-voice enable) |
| `finetune` | number | Fine-tuning value (128=no tuning, <128=flat, >128=sharp) |
| `note` | number | For percussion: General MIDI note number (35-81) |
| `isDualVoice` | boolean | Whether this instrument uses both voice1 and voice2 |

### Voice Fields

| JSON Field | Type | Description |
|-----------|------|-------------|
| `baseNote` | number | Base note offset for pitch calculation |

---

## How We Use These Parameters

### Loading an Instrument Patch

When loading a patch to an OPL3 channel, we:

1. **Program the modulator operator** (0x20-0x95, 0xE0-0xF5 registers)
   - Write `multi`, `ksr`, `sus`, `vib`, `trem` → Register 0x20+offset
   - Write `out`, `ksl` → Register 0x40+offset
   - Write `attack`, `decay` → Register 0x60+offset
   - Write `sustain`, `release` → Register 0x80+offset
   - Write `wave` → Register 0xE0+offset

2. **Program the carrier operator** (same registers, different offset)

3. **Program feedback and connection** (0xC0-0xC8 register)
   - Write `feedback` and `additive` flag
   - Set stereo output (both channels)

### Playing a Note

When playing a note:

1. Calculate F-Number and Block from MIDI note
2. Write F-Number low byte → Register 0xA0-0xA8
3. Write F-Number high + Block + Key-On → Register 0xB0-0xB8

### Dual-Voice Instruments

Some instruments (like pianos) use two voices to create richer sounds:
- Both voices use the same MIDI note
- Each voice is programmed to a separate OPL3 channel
- The `isDualVoice` flag indicates whether to enable this

---

## Key Differences from VST

1. **No Velocity Sensitivity**: OPL3 hardware doesn't support this. We could implement it in software by adjusting `out` (attenuation) based on MIDI velocity, but currently we don't.

2. **Global Effect Depth**: Tremolo and vibrato depth are global settings, not per-instrument. We set these once during initialization.

3. **No Aftertouch/Modulation**: OPL3 doesn't have hardware support for these MIDI features.

4. **Fixed Waveforms**: Only 8 waveforms available (4 in OPL2 mode, 8 in OPL3 mode), unlike modern synths with arbitrary waveforms.

5. **Integer Parameters**: All OPL3 parameters are integers with limited ranges (0-15 for most envelopes, 0-63 for attenuation). Modern VSTs often use floating-point values.

---

## Data Flow Summary

```
OP2 Binary File (GENMIDI format)
    ↓ (convertDMXCollections.js)
doom1.json (abbreviated field names)
    ↓ (catalogLoader.ts: transformInstrument/transformOperator)
OPLPatch TypeScript object (full field names)
    ↓ (SimpleSynth.ts: loadPatch/writeOperatorRegisters)
OPL3 Hardware Registers
    ↓
Audio Output
```

---

## Complete Field Mapping Table

| JSON Field | TypeScript Field | VST Parameter | OPL3 Register | Notes |
|-----------|-----------------|---------------|---------------|-------|
| `wave` | `waveform` | Wave | 0xE0-0xF5 | ✅ Fully mapped |
| `multi` | `frequencyMultiplier` | Frequency Multiplier | 0x20-0x35 bits 0-3 | ✅ Fully mapped |
| `attack` | `attackRate` | A (Attack) | 0x60-0x75 bits 4-7 | ✅ Fully mapped |
| `decay` | `decayRate` | D (Decay) | 0x60-0x75 bits 0-3 | ✅ Fully mapped |
| `sustain` | `sustainLevel` | S (Sustain Level) | 0x80-0x95 bits 4-7 | ✅ Fully mapped |
| `release` | `releaseRate` | R (Release) | 0x80-0x95 bits 0-3 | ✅ Fully mapped |
| `out` | `outputLevel` | Attenuation | 0x40-0x55 bits 0-5 | ✅ Fully mapped |
| `vib` | `vibrato` | Vibrato | 0x20-0x35 bit 6 | ✅ Fully mapped |
| `trem` | `amplitudeModulation` | Tremolo | 0x20-0x35 bit 7 | ✅ Fully mapped |
| `sus` | `envelopeType` | Sustain (EG-Type) | 0x20-0x35 bit 5 | ✅ Fully mapped |
| `ksr` | `keyScaleRate` | Keyscale Env. Rate | 0x20-0x35 bit 4 | ✅ Fully mapped |
| `ksl` | `keyScaleLevel` | Keyscale Attenuation | 0x40-0x55 bits 6-7 | ✅ Fully mapped |
| `feedback` | `feedback` | Feedback | 0xC0-0xC8 bits 1-3 | ✅ Fully mapped |
| `additive` | `connection` | Algorithm | 0xC0-0xC8 bit 0 | ✅ Fully mapped |
| N/A | N/A | Velocity Sensitivity | N/A | ❌ Not in OPL3 hardware |
| N/A (global) | N/A | Effect Depth (Tremolo) | 0xBD bit 7 | 🔸 Global setting |
| N/A (global) | N/A | Effect Depth (Vibrato) | 0xBD bit 6 | 🔸 Global setting |
| N/A (global) | N/A | Percussion Mode | 0xBD bit 5 | 🔸 Not used (we use GM percussion instead) |

---

## Conclusion

**All OPL3 hardware parameters are fully extracted and mapped** from the OP2 files. The only "missing" features are those that don't exist in OPL3 hardware:

- ✅ All operator parameters are captured
- ✅ All voice-level parameters are captured
- ✅ Global effect depth could be set (but is currently fixed in initialization)
- ❌ Velocity sensitivity doesn't exist in OPL3 (software-only feature)
- ❌ Aftertouch/mod wheel don't exist in OPL3 (MIDI-only features)

The sound quality issues you're experiencing are likely due to other factors:
1. Accurate emulation of the OPL3 chip behavior
2. Correct timing and note scheduling
3. Proper handling of dual-voice instruments
4. Sample rate and audio buffer settings
