# WebOrchestra - Instrument System Documentation

**Last Updated:** 2025-01-06

---

## Table of Contents

1. [OPL3 FM Synthesis Basics](#opl3-fm-synthesis-basics)
2. [Patch Format](#patch-format)
3. [GENMIDI Bank](#genmidi-bank)
4. [Instrument Editor](#instrument-editor)
5. [Creating Custom Instruments](#creating-custom-instruments)

---

## OPL3 FM Synthesis Basics

### What is FM Synthesis?

**FM (Frequency Modulation)** synthesis creates sound by using one oscillator (modulator) to modulate the frequency of another (carrier).

### 2-Operator FM

```
Modulator ──┐
            ├──→ Carrier ──→ Output
     ↖──────┘
   (Feedback)
```

**Components:**
1. **Modulator** - Oscillator that modulates the carrier
2. **Carrier** - Oscillator that produces the final sound
3. **Feedback** - Modulator can modulate itself (0-7)
4. **Connection** - FM (modulated) or Additive (mixed)

### FM vs Additive Mode

**FM Mode (connection = 'fm'):**
```
Modulator → Carrier → Output
```
- Rich, harmonic timbres
- Bell-like, metallic sounds
- Most common mode

**Additive Mode (connection = 'additive'):**
```
Modulator ──┐
            ├→ Mix → Output
Carrier  ───┘
```
- Organ-like sounds
- Simpler timbres
- Both operators heard directly

---

## Patch Format

### OPLPatch Type

```typescript
export interface OPLPatch {
  // Identity
  id: number;                   // 0-127 (General MIDI compatible)
  name: string;                 // "Acoustic Grand Piano"
  category?: string;            // "Piano", "Bass", "Lead", etc.

  // Single-voice format (always present)
  modulator: OPLOperator;       // Operator 1
  carrier: OPLOperator;         // Operator 2
  feedback: number;             // 0-7: Self-modulation depth
  connection: 'fm' | 'additive'; // Algorithm

  // Dual-voice format (GENMIDI support)
  voice1?: OPLVoice;            // Voice 1 (detailed format)
  voice2?: OPLVoice;            // Voice 2 (detailed format)
  dualVoiceEnabled?: boolean;   // Use both voices (default: false)

  // GENMIDI-specific
  noteOffset?: number;          // MIDI note offset (pitch correction)

  // Metadata
  isCustom?: boolean;           // True if user-edited
  basePresetId?: number;        // If custom, which preset it was based on
}
```

### OPLOperator Type

```typescript
export interface OPLOperator {
  // === ADSR Envelope (0-15) ===
  attackRate: number;           // 0=slowest, 15=fastest attack
  decayRate: number;            // 0=slowest, 15=fastest decay
  sustainLevel: number;         // 0=loudest, 15=softest sustain
  releaseRate: number;          // 0=slowest, 15=fastest release

  // === Frequency & Timbre ===
  frequencyMultiplier: number;  // 0-15: 0=×0.5, 1=×1, 2=×2, etc.
  waveform: number;             // 0-7: 0=sine, 1=half-sine, etc.

  // === Volume & Scaling ===
  outputLevel: number;          // 0-63: 0=loudest, 63=silent
  keyScaleLevel: number;        // 0-3: Volume scaling with pitch

  // === Modulation Flags ===
  amplitudeModulation: boolean; // Tremolo effect on/off
  vibrato: boolean;             // Pitch vibrato on/off
  envelopeType: boolean;        // true=sustaining, false=percussive
  keyScaleRate: boolean;        // Scale envelope speed with pitch
}
```

### OPLVoice Type (Dual-Voice)

```typescript
export interface OPLVoice {
  modulator: OPLOperator;       // Modulator operator
  carrier: OPLOperator;         // Carrier operator
  feedback: number;             // 0-7
  connection: 'fm' | 'additive';
  baseNote?: number;            // Base note offset (cents)
}
```

---

## GENMIDI Bank

### Overview

**GENMIDI** is the instrument bank from **Doom** (1993) containing 175 high-quality OPL3 patches.

### File Location
[minimal-prototype/public/instruments/GENMIDI.json](../minimal-prototype/public/instruments/GENMIDI.json)

### Format

The GENMIDI bank was converted from the binary `GENMIDI.OP2` format using a custom parser.

**Original format:** [DMXOPL documentation](https://doomwiki.org/wiki/DMXOPL)

### Loading Process

```typescript
// 1. Fetch GENMIDI.json
const response = await fetch('/instruments/GENMIDI.json');
const data = await response.json();

// 2. Parse into InstrumentBank
export interface InstrumentBank {
  name: string;           // "GENMIDI"
  version: string;        // "1.0"
  patches: OPLPatch[];    // 175 instruments
}

// 3. Set as instrument bank
setInstrumentBank(bank.patches);
```

### Instrument Categories

GENMIDI instruments follow **General MIDI** standard:

| Range | Category | Examples |
|-------|----------|----------|
| 0-7 | Piano | Acoustic Grand, Bright Piano |
| 8-15 | Chromatic Percussion | Celesta, Glockenspiel |
| 16-23 | Organ | Drawbar Organ, Church Organ |
| 24-31 | Guitar | Acoustic Guitar, Electric Guitar |
| 32-39 | Bass | Acoustic Bass, Electric Bass |
| 40-47 | Strings | Violin, Cello, String Ensemble |
| 48-55 | Ensemble | String Ensemble, Choir |
| 56-63 | Brass | Trumpet, Trombone, French Horn |
| 64-71 | Reed | Saxophone, Oboe, Clarinet |
| 72-79 | Pipe | Flute, Piccolo, Recorder |
| 80-87 | Synth Lead | Square Lead, Sawtooth Lead |
| 88-95 | Synth Pad | Warm Pad, Polysynth Pad |
| 96-103 | Synth Effects | Rain, Soundtrack, Crystal |
| 104-111 | Ethnic | Sitar, Banjo, Shamisen |
| 112-119 | Percussive | Tinkle Bell, Agogo, Steel Drums |
| 120-127 | Sound Effects | Helicopter, Applause, Gunshot |
| 128-175 | Extended | Additional variations |

### Dual-Voice Support

GENMIDI patches can have **two voices** played simultaneously:

```typescript
patch.dualVoiceEnabled = true;
patch.voice1 = { modulator, carrier, feedback, connection };
patch.voice2 = { modulator, carrier, feedback, connection };
```

**Benefits:**
- Richer, layered sound
- Detuning for chorus effect
- Different timbres combined

**Cost:**
- Uses 2 OPL channels instead of 1
- Reduces polyphony

---

## Instrument Editor

### Component

**File:** [minimal-prototype/src/components/InstrumentEditor.tsx](../minimal-prototype/src/components/InstrumentEditor.tsx)

### Features

**Operator Editors:**
- Separate controls for Modulator and Carrier
- ADSR envelope sliders (Attack, Decay, Sustain, Release)
- Frequency multiplier (0.5×, 1×, 2×, 3×, etc.)
- Output level (volume)
- Waveform selector (sine, half-sine, abs-sine, etc.)

**Global Controls:**
- Feedback (0-7)
- Connection mode (FM / Additive)
- Modulation flags (AM, Vibrato, KSR, EGT)

**Real-time Preview:**
- Test note button
- Live audio feedback as you edit

**Save/Cancel:**
- Save changes to instrument bank
- Mark as custom instrument
- Cancel to discard changes

### UI Layout

```
┌──────────────────────────────────────────────────┐
│  Instrument Editor                          [X]  │
├──────────────────────────────────────────────────┤
│  Name: [Acoustic Grand Piano        ]            │
│  ID: 0       Category: Piano                     │
├──────────────────────────────────────────────────┤
│  ┌─ Modulator ─────────────┐ ┌─ Carrier ──────┐ │
│  │ Attack:    [======--]  10│ │ Attack:  [===] │ │
│  │ Decay:     [========]  15│ │ Decay:   [===] │ │
│  │ Sustain:   [====----]   7│ │ Sustain: [===] │ │
│  │ Release:   [======--]  10│ │ Release: [===] │ │
│  │                          │ │                 │ │
│  │ Freq Mult: [2.0×]        │ │ Freq Mult: [1×] │ │
│  │ Waveform:  [Sine ▼]     │ │ Waveform: [Sine]│ │
│  │ Output Lvl:[====----] 30│ │ Out Lvl:  [===] │ │
│  └──────────────────────────┘ └─────────────────┘ │
├──────────────────────────────────────────────────┤
│  Feedback:   [===-----]  3                       │
│  Connection: ⚫ FM    ⚪ Additive                 │
├──────────────────────────────────────────────────┤
│  [Test Note C-4]                                 │
│  [Save Changes]  [Cancel]                        │
└──────────────────────────────────────────────────┘
```

---

## Creating Custom Instruments

### Method 1: Edit Existing Instrument

1. Select instrument from bank
2. Click "Edit" button
3. Adjust parameters in editor
4. Click "Test Note" to preview
5. Click "Save Changes"
6. Instrument marked as custom

### Method 2: JSON Format

Create a JSON file:

```json
{
  "id": 200,
  "name": "My Custom Sound",
  "category": "Custom",
  "modulator": {
    "attackRate": 10,
    "decayRate": 8,
    "sustainLevel": 5,
    "releaseRate": 7,
    "frequencyMultiplier": 2,
    "waveform": 0,
    "outputLevel": 20,
    "keyScaleLevel": 0,
    "amplitudeModulation": false,
    "vibrato": false,
    "envelopeType": true,
    "keyScaleRate": false
  },
  "carrier": {
    "attackRate": 15,
    "decayRate": 12,
    "sustainLevel": 2,
    "releaseRate": 10,
    "frequencyMultiplier": 1,
    "waveform": 0,
    "outputLevel": 0,
    "keyScaleLevel": 0,
    "amplitudeModulation": false,
    "vibrato": false,
    "envelopeType": true,
    "keyScaleRate": false
  },
  "feedback": 3,
  "connection": "fm"
}
```

Load into bank:
```typescript
const customPatch = await fetch('/instruments/my-custom.json')
  .then(r => r.json());

instrumentBank.push(customPatch);
```

---

## Parameter Guide

### ADSR Envelope

```
Volume
  ^
  │     ┌─────────────┐  Sustain Level
  │    ╱│             │╲
  │   ╱ │             │ ╲
  │  ╱  │             │  ╲
  │ ╱   │             │   ╲
  └────────────────────────────→ Time
    A   D    Sustain   R

A = Attack Rate (0-15)
D = Decay Rate (0-15)
S = Sustain Level (0-15)
R = Release Rate (0-15)
```

**Attack Rate:**
- 0 = Very slow (smooth fade-in)
- 15 = Instant (sharp attack)
- Use high values for percussive sounds
- Use low values for pads/strings

**Decay Rate:**
- Speed of decay from peak to sustain
- 0 = Very slow
- 15 = Instant

**Sustain Level:**
- Volume while key is held
- 0 = Loudest (no decay)
- 15 = Silent (percussive envelope)

**Release Rate:**
- Speed of fade-out after key release
- 0 = Very slow (long tail)
- 15 = Instant (sharp cutoff)

### Frequency Multiplier

| Value | Multiplier | Use Case |
|-------|------------|----------|
| 0 | 0.5× | Sub-bass, low harmonics |
| 1 | 1× | Fundamental frequency |
| 2 | 2× | First harmonic (octave up) |
| 3 | 3× | Perfect fifth + octave |
| 4 | 4× | Two octaves up |
| 5-15 | Higher | Bright, metallic timbres |

**Tips:**
- Modulator: Try 2-4 for rich tones
- Carrier: Usually 1 for clean pitch
- Higher values = brighter, harsher sound

### Output Level

- **0-63** (0 = loudest, 63 = silent)
- Controls operator volume
- **Carrier:** Set low (0-20) for loud sound
- **Modulator:** Set higher (20-40) to control brightness

### Waveform

| Value | Shape | Sound |
|-------|-------|-------|
| 0 | Sine | Pure, smooth |
| 1 | Half-sine | Softer |
| 2 | Abs-sine | Hollow, reed-like |
| 3 | Quarter-sine | Thin, nasal |
| 4-7 | Various | Experimental |

**Tips:**
- **Sine (0):** Most common, clean tone
- **Half-sine (1):** Softer than sine
- **Abs-sine (2):** Good for brass, reeds

### Feedback

- **0-7** (0 = none, 7 = maximum)
- Modulator modulates itself
- Creates harmonics and noise
- **0-2:** Clean, simple tones
- **3-5:** Rich, complex tones
- **6-7:** Harsh, noisy (use sparingly)

### Connection

**FM Mode:**
- Modulator → Carrier (frequency modulation)
- Rich, evolving timbres
- Most versatile

**Additive Mode:**
- Modulator + Carrier (amplitude mixing)
- Organ-like sounds
- Simpler timbres

---

## Preset Templates

### Piano Sound

```typescript
{
  modulator: {
    attackRate: 15, decayRate: 10, sustainLevel: 4, releaseRate: 8,
    frequencyMultiplier: 1, outputLevel: 25,
    waveform: 0, // Sine
  },
  carrier: {
    attackRate: 15, decayRate: 12, sustainLevel: 2, releaseRate: 10,
    frequencyMultiplier: 1, outputLevel: 0,
    waveform: 0, // Sine
  },
  feedback: 2,
  connection: 'fm'
}
```

### Organ Sound

```typescript
{
  modulator: {
    attackRate: 15, decayRate: 0, sustainLevel: 0, releaseRate: 8,
    frequencyMultiplier: 2, outputLevel: 15,
    waveform: 0,
  },
  carrier: {
    attackRate: 15, decayRate: 0, sustainLevel: 0, releaseRate: 8,
    frequencyMultiplier: 1, outputLevel: 5,
    waveform: 0,
  },
  feedback: 0,
  connection: 'additive' // Mix both operators
}
```

### Bass Sound

```typescript
{
  modulator: {
    attackRate: 12, decayRate: 10, sustainLevel: 5, releaseRate: 6,
    frequencyMultiplier: 1, outputLevel: 30,
    waveform: 0,
  },
  carrier: {
    attackRate: 15, decayRate: 8, sustainLevel: 4, releaseRate: 8,
    frequencyMultiplier: 1, outputLevel: 0,
    waveform: 1, // Half-sine for warmth
  },
  feedback: 1,
  connection: 'fm'
}
```

### Lead Synth

```typescript
{
  modulator: {
    attackRate: 10, decayRate: 8, sustainLevel: 6, releaseRate: 7,
    frequencyMultiplier: 3, outputLevel: 20, // Bright harmonics
    waveform: 0,
  },
  carrier: {
    attackRate: 12, decayRate: 10, sustainLevel: 3, releaseRate: 9,
    frequencyMultiplier: 1, outputLevel: 5,
    waveform: 0,
  },
  feedback: 4, // Rich harmonics
  connection: 'fm'
}
```

---

## Next: See [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) for development instructions
