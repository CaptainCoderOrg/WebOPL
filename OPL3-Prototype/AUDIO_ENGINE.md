# WebOrchestra - Audio Engine Documentation

**Last Updated:** 2025-01-06

---

## Table of Contents

1. [SimpleSynth Overview](#simplesynth-overview)
2. [OPL3 Basics](#opl3-basics)
3. [Initialization Process](#initialization-process)
4. [Note On/Off](#note-onoff)
5. [Channel Management](#channel-management)
6. [Instrument System](#instrument-system)
7. [Frequency Calculation](#frequency-calculation)
8. [Register Reference](#register-reference)
9. [AudioWorklet Implementation](#audioworklet-implementation)

---

## SimpleSynth Overview

`SimpleSynth` is the core audio engine class that wraps the OPL3 emulator and provides a clean, high-level API for note playback.

### File Location
[minimal-prototype/src/SimpleSynth.ts](../minimal-prototype/src/SimpleSynth.ts)

### Class Structure

```typescript
export class SimpleSynth {
  // Audio infrastructure
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private masterGainNode: GainNode | null = null;

  // Patch management
  private trackPatches: Map<number, OPLPatch> = new Map();
  private channelPatches: Map<number, OPLPatch> = new Map();

  // Note tracking
  private activeNotes: Map<number, {...}> = new Map();
  private channelManager: ChannelManager = new ChannelManager();

  // State flags
  private workletReady: boolean = false;
  private isInitialized: boolean = false;
}
```

### Public API

```typescript
// Initialization
await synth.init(): Promise<void>

// Note playback
synth.noteOn(channel, midiNote, velocity): void
synth.noteOff(channel, midiNote): void
synth.allNotesOff(): void

// Instrument management
synth.setTrackPatch(trackId, patch): void
synth.getTrackPatch(trackId): OPLPatch | null
synth.loadPatch(channel, patch): void  // Internal use

// Volume control
synth.setMasterVolume(volume): void    // 0.0 to 12.0
synth.getMasterVolume(): number

// Audio control
synth.start(): void
synth.stop(): void
await synth.resumeAudio(): Promise<void>

// State queries
synth.isReady(): boolean
synth.getActiveNoteCount(): number
synth.getChannelManagerStats(): object

// Low-level (for testing/debugging)
synth.writeRegister(register, value): void
```

---

## OPL3 Basics

### What is OPL3?

**OPL3** (Yamaha YMF262) is an FM synthesis chip used in:
- Sound Blaster 16 (1992)
- AdLib Gold (1992)
- Many DOS-era PC games

### Key Specifications

- **18 channels** (9 per bank × 2 banks)
- **2-operator FM synthesis** (modulator + carrier)
- **Sample rate:** 49,716 Hz
- **Stereo output**
- **Register-based control** (write register/value pairs)

### FM Synthesis Basics

**Two Operators per Channel:**
```
Modulator ──┐
            ├──→ Carrier ──→ Output
     ↖──────┘
   (Feedback)
```

**FM Mode:**
- Modulator modulates carrier frequency
- Creates harmonic-rich tones

**Additive Mode:**
- Modulator and carrier mixed equally
- Creates organ-like sounds

---

## Initialization Process

### Sequence

```typescript
async init() {
  // 1. Create AudioContext
  this.audioContext = new AudioContext({ sampleRate: 49716 });

  // 2. Fetch OPL3 browser bundle
  const opl3Code = await fetch('/node_modules/opl3/dist/opl3.js')
    .then(r => r.text());

  // 3. Load AudioWorklet processor
  await this.audioContext.audioWorklet.addModule(
    '/opl-worklet-processor.js'
  );

  // 4. Create AudioWorkletNode
  this.workletNode = new AudioWorkletNode(
    this.audioContext,
    'opl-worklet-processor'
  );

  // 5. Setup message handling
  this.workletNode.port.onmessage = (event) => {
    this.handleWorkletMessage(event.data);
  };

  // 6. Create master gain node
  this.masterGainNode = this.audioContext.createGain();
  this.masterGainNode.gain.value = 1.0;

  // 7. Connect audio graph
  this.workletNode
    .connect(this.masterGainNode)
    .connect(this.audioContext.destination);

  // 8. Send OPL3 code to worklet
  this.workletNode.port.postMessage({
    type: 'load-opl3',
    payload: { opl3Code }
  });

  // 9. Wait for worklet ready signal
  await this.waitForWorkletReady();

  this.isInitialized = true;
}
```

### AudioWorklet Initialization

Inside `opl-worklet-processor.js`:

```javascript
loadOPL3Code(opl3Code) {
  // Execute OPL3 browser bundle
  (0, eval)(opl3Code);

  // Create chip instance
  this.chip = new globalThis.OPL3.OPL3();

  // Initialize OPL3 mode
  this.initializeOPL3();
}

initializeOPL3() {
  // Reset sequence
  this.chipWrite(0x04, 0x60);  // Reset Timer 1 and Timer 2
  this.chipWrite(0x04, 0x80);  // Reset IRQ
  this.chipWrite(0x01, 0x20);  // Enable waveform select
  this.chipWrite(0xBD, 0x00);  // Melodic mode

  // Enable OPL3 mode (18 channels)
  this.chipWrite(0x105, 0x01); // OPL3 enable

  // Disable 4-operator mode (use 2-op only)
  this.chipWrite(0x104, 0x00);

  // Initialize C0-C8 registers to 0x00 (DOSBox workaround)
  for (let ch = 0; ch < 9; ch++) {
    this.chipWrite(0xC0 + ch, 0x00);       // Bank 0
    this.chipWrite(0x100 + 0xC0 + ch, 0x00); // Bank 1
  }

  this.isReady = true;
  this.port.postMessage({ type: 'ready' });
}
```

---

## Note On/Off

### Note On Flow

```typescript
noteOn(channel: number, midiNote: number, velocity: number = 100) {
  // 1. Get patch for this MIDI channel (track)
  const patch = this.trackPatches.get(channel);

  // 2. Apply note offset (for GENMIDI pitch correction)
  let adjustedNote = midiNote;
  if (patch.noteOffset !== undefined) {
    adjustedNote = midiNote - patch.noteOffset;
    adjustedNote = Math.max(0, Math.min(127, adjustedNote));
  }

  // 3. Generate unique note ID
  const noteId = `ch${channel}-note${midiNote}`;

  // 4. Check if dual-voice
  const isDualVoice = patch.dualVoiceEnabled &&
                      patch.voice1 && patch.voice2;

  if (isDualVoice) {
    // === DUAL-VOICE PATH ===
    const [ch1, ch2] = this.channelManager.allocateDualChannels(noteId);

    // Program Voice 1 to channel 1
    this.programVoice(ch1, patch.voice1, patch);

    // Program Voice 2 to channel 2
    this.programVoice(ch2, patch.voice2, patch);

    // Trigger both channels with same note
    const { fnum, block } = getOPLParams(adjustedNote);

    this.writeOPL(this.getChannelRegister(0xA0, ch1), fnum & 0xFF);
    const keyOnByte = 0x20 | ((block & 0x07) << 2) | ((fnum >> 8) & 0x03);
    this.writeOPL(this.getChannelRegister(0xB0, ch1), keyOnByte);

    this.writeOPL(this.getChannelRegister(0xA0, ch2), fnum & 0xFF);
    this.writeOPL(this.getChannelRegister(0xB0, ch2), keyOnByte);

    // Track active note
    this.activeNotes.set(channel, {
      noteId,
      channels: [ch1, ch2],
      note: adjustedNote,
      isDualVoice: true
    });

  } else {
    // === SINGLE-VOICE PATH ===
    const oplChannel = this.channelManager.allocateChannel(noteId);

    // Load patch to channel
    this.loadPatch(oplChannel, patch);

    // Trigger note
    const { fnum, block } = getOPLParams(adjustedNote);
    this.writeOPL(this.getChannelRegister(0xA0, oplChannel), fnum & 0xFF);
    const keyOnByte = 0x20 | ((block & 0x07) << 2) | ((fnum >> 8) & 0x03);
    this.writeOPL(this.getChannelRegister(0xB0, oplChannel), keyOnByte);

    // Track active note
    this.activeNotes.set(channel, {
      noteId,
      channels: [oplChannel],
      note: adjustedNote,
      isDualVoice: false
    });
  }
}
```

### Note Off Flow

```typescript
noteOff(channel: number, midiNote: number) {
  const activeNote = this.activeNotes.get(channel);
  if (!activeNote) return;

  // Release all allocated OPL channels
  for (const oplChannel of activeNote.channels) {
    // Write 0x00 to 0xB0 register (key off)
    this.writeOPL(this.getChannelRegister(0xB0, oplChannel), 0x00);
  }

  // Release from channel manager
  this.channelManager.releaseNote(activeNote.noteId);

  // Remove from active notes
  this.activeNotes.delete(channel);
}
```

---

## Channel Management

### ChannelManager Class

**Purpose:** Dynamically allocates OPL3 hardware channels to notes

**File:** [minimal-prototype/src/utils/ChannelManager.ts](../minimal-prototype/src/utils/ChannelManager.ts)

### Channel Allocation Strategy

```typescript
class ChannelManager {
  private noteToChannels: Map<string, number[]> = new Map();
  private channelToNote: Map<number, string> = new Map();
  private availableChannels: Set<number> = new Set([0..17]);

  // Single-voice allocation
  allocateChannel(noteId: string): number | null {
    if (this.availableChannels.size === 0) return null;

    const channel = this.availableChannels.values().next().value;
    this.availableChannels.delete(channel);

    this.noteToChannels.set(noteId, [channel]);
    this.channelToNote.set(channel, noteId);

    return channel;
  }

  // Dual-voice allocation (needs 2 adjacent channels)
  allocateDualChannels(noteId: string): [number, number] | null {
    if (this.availableChannels.size < 2) return null;

    const [ch1, ch2] = Array.from(this.availableChannels).slice(0, 2);
    this.availableChannels.delete(ch1);
    this.availableChannels.delete(ch2);

    this.noteToChannels.set(noteId, [ch1, ch2]);
    this.channelToNote.set(ch1, noteId);
    this.channelToNote.set(ch2, noteId);

    return [ch1, ch2];
  }

  // Release channels
  releaseNote(noteId: string): void {
    const channels = this.noteToChannels.get(noteId);
    if (!channels) return;

    for (const ch of channels) {
      this.availableChannels.add(ch);
      this.channelToNote.delete(ch);
    }

    this.noteToChannels.delete(noteId);
  }
}
```

### Why Dynamic Allocation?

**Problem:** MIDI has 16 channels, OPL3 has 18, but:
- Dual-voice instruments need 2 OPL channels
- Not all MIDI channels are always active
- Static mapping wastes channels

**Solution:** Allocate OPL channels on-demand when notes are played, release when done.

---

## Instrument System

### Patch Structure

```typescript
interface OPLPatch {
  id: number;                   // 0-127 (General MIDI compatible)
  name: string;                 // "Acoustic Grand Piano"
  category?: string;            // "Piano"

  // Single-voice (backward compatible)
  modulator: OPLOperator;       // Operator 1
  carrier: OPLOperator;         // Operator 2
  feedback: number;             // 0-7
  connection: 'fm' | 'additive';

  // Dual-voice (GENMIDI support)
  voice1?: OPLVoice;
  voice2?: OPLVoice;
  dualVoiceEnabled?: boolean;

  // GENMIDI-specific
  noteOffset?: number;          // Pitch correction
}
```

### Operator Parameters

```typescript
interface OPLOperator {
  // ADSR Envelope (0-15)
  attackRate: number;           // 0=slowest, 15=fastest
  decayRate: number;
  sustainLevel: number;         // 0=loudest, 15=softest
  releaseRate: number;

  // Frequency & Timbre (0-15)
  frequencyMultiplier: number;  // 0=×0.5, 1=×1, 2=×2, etc.
  waveform: number;             // 0-7 (0=sine, 1=half-sine, etc.)

  // Volume (0-63)
  outputLevel: number;          // 0=loudest, 63=silent
  keyScaleLevel: number;        // 0-3 (volume scaling with pitch)

  // Flags
  amplitudeModulation: boolean; // Tremolo
  vibrato: boolean;
  envelopeType: boolean;        // true=sustaining, false=percussive
  keyScaleRate: boolean;        // Scale envelope with pitch
}
```

### Loading a Patch

```typescript
loadPatch(channelId: number, patch: OPLPatch) {
  // Get operator offsets for this channel
  const [modOffset, carOffset] = this.getOperatorOffsets(channelId);

  // Program modulator
  this.writeOperatorRegisters(modOffset, patch.modulator);

  // Program carrier
  this.writeOperatorRegisters(carOffset, patch.carrier);

  // Program feedback + connection
  const c0Register = this.getChannelRegister(0xC0, channelId);
  this.writeOPL(c0Register, 0x00); // Reset first

  const feedbackByte = (patch.feedback << 1) |
                       (patch.connection === 'additive' ? 1 : 0);
  const regC0 = feedbackByte | 0x30; // 0x30 = stereo output
  this.writeOPL(c0Register, regC0);
}
```

### Writing Operator Registers

```typescript
writeOperatorRegisters(operatorOffset: number, operator: OPLOperator) {
  // Register 0x20: AM, VIB, EGT, KSR, MULT
  const reg20 =
    operator.frequencyMultiplier |
    (operator.keyScaleRate ? 0x10 : 0) |
    (operator.envelopeType ? 0x20 : 0) |
    (operator.vibrato ? 0x40 : 0) |
    (operator.amplitudeModulation ? 0x80 : 0);
  this.writeOPL(0x20 + operatorOffset, reg20);

  // Register 0x40: KSL, TL (Output Level)
  const reg40 = operator.outputLevel | (operator.keyScaleLevel << 6);
  this.writeOPL(0x40 + operatorOffset, reg40);

  // Register 0x60: AR, DR (Attack Rate, Decay Rate)
  const reg60 = operator.decayRate | (operator.attackRate << 4);
  this.writeOPL(0x60 + operatorOffset, reg60);

  // Register 0x80: SL, RR (Sustain Level, Release Rate)
  const reg80 = operator.releaseRate | (operator.sustainLevel << 4);
  this.writeOPL(0x80 + operatorOffset, reg80);

  // Register 0xE0: Waveform Select
  this.writeOPL(0xE0 + operatorOffset, operator.waveform);
}
```

---

## Frequency Calculation

### MIDI to Frequency

```typescript
// Formula: f = 440 × 2^((midiNote - 69) / 12)
function midiToFrequency(midiNote: number): number {
  return 440.0 * Math.pow(2, (midiNote - 69) / 12.0);
}

// Examples:
// MIDI 60 (C-4) = 261.63 Hz
// MIDI 69 (A-4) = 440.00 Hz
// MIDI 72 (C-5) = 523.25 Hz
```

### Frequency to OPL3 F-num and Block

```typescript
export function getOPLParams(midiNote: number): { fnum: number; block: number } {
  const frequency = midiToFrequency(midiNote);

  // Find optimal block (octave) [0-7]
  let block = 0;
  let testFreq = frequency;
  while (testFreq >= 1024 && block < 7) {
    testFreq /= 2;
    block++;
  }

  // Calculate F-number [0-1023]
  // Formula: F-num = frequency × 2^(20-block) / 49716
  const fnum = Math.round(
    (frequency * Math.pow(2, 20 - block)) / 49716
  );

  return {
    fnum: Math.max(0, Math.min(1023, fnum)),
    block: Math.max(0, Math.min(7, block))
  };
}
```

### Register Encoding

```typescript
// Frequency is split across two registers:
//
// Register 0xA0-0xA8: Low 8 bits of F-num
// Register 0xB0-0xB8: [KEY_ON|BLOCK|BLOCK|BLOCK|FNUM|FNUM]
//
// KEY_ON (bit 5): 1 = note on, 0 = note off
// BLOCK (bits 2-4): Octave (0-7)
// FNUM (bits 0-1): High 2 bits of F-num

const { fnum, block } = getOPLParams(midiNote);

// Write low 8 bits of F-num
this.writeOPL(0xA0 + channel, fnum & 0xFF);

// Write KEY_ON + block + high 2 bits of F-num
const keyOnByte = 0x20 | ((block & 0x07) << 2) | ((fnum >> 8) & 0x03);
this.writeOPL(0xB0 + channel, keyOnByte);
```

---

## Register Reference

### OPL3 Register Map

**Bank Selection:**
- Registers 0x000-0x0FF: Bank 0 (channels 0-8)
- Registers 0x100-0x1FF: Bank 1 (channels 9-17)

### Per-Operator Registers

| Register | Name | Description |
|----------|------|-------------|
| 0x20-0x35 | Tremolo/Vibrato/EGT/KSR/MULT | Modulation flags + frequency multiplier |
| 0x40-0x55 | KSL/Output Level | Key scale + volume |
| 0x60-0x75 | Attack Rate/Decay Rate | ADSR envelope attack/decay |
| 0x80-0x95 | Sustain Level/Release Rate | ADSR envelope sustain/release |
| 0xE0-0xF5 | Waveform Select | Waveform (0-7) |

### Per-Channel Registers

| Register | Name | Description |
|----------|------|-------------|
| 0xA0-0xA8 | F-Number Low | Frequency low 8 bits |
| 0xB0-0xB8 | Key-On/Block/F-Num High | Note on + octave + freq high 2 bits |
| 0xC0-0xC8 | Feedback/Connection | FM feedback + algorithm |

### Global Registers

| Register | Name | Description |
|----------|------|-------------|
| 0x01 | Waveform Select Enable | Enable waveform selection |
| 0x04 | Timer/IRQ Control | Timer and interrupt control |
| 0x08 | CSW/Note-Sel | Speech synthesis control |
| 0xBD | AM Depth/Vib Depth/Rhythm | Modulation depth + rhythm mode |
| 0x104 | 4-Operator Enable | Enable 4-op mode (we use 2-op) |
| 0x105 | OPL3 Mode Enable | Enable OPL3 features |

### Operator Offsets

```typescript
// Channels 0-8 (Bank 0)
const operatorMap = [
  [0x00, 0x03], // Channel 0: Operators at +0x00 and +0x03
  [0x01, 0x04], // Channel 1
  [0x02, 0x05], // Channel 2
  [0x08, 0x0B], // Channel 3 ← Jump
  [0x09, 0x0C], // Channel 4
  [0x0A, 0x0D], // Channel 5
  [0x10, 0x13], // Channel 6 ← Jump
  [0x11, 0x14], // Channel 7
  [0x12, 0x15], // Channel 8
];

// Channels 9-17 (Bank 1): Add 0x100 to all offsets
```

---

## AudioWorklet Implementation

### File Location
[minimal-prototype/public/opl-worklet-processor.js](../minimal-prototype/public/opl-worklet-processor.js)

### Worklet Class

```javascript
class OPLWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.chip = null;
    this.isReady = false;

    this.port.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  // Process audio in real-time
  process(inputs, outputs, parameters) {
    if (!this.chip || !this.isReady) {
      return true; // Output silence
    }

    const output = outputs[0];
    const numSamples = output[0].length; // Usually 128

    // Generate one sample at a time (CRITICAL!)
    const tempBuffer = new Int16Array(2); // Stereo

    for (let i = 0; i < numSamples; i++) {
      // Read one stereo sample from chip
      this.chip.read(tempBuffer);

      // Convert Int16 → Float32
      output[0][i] = tempBuffer[0] / 32768.0; // Left
      output[1][i] = tempBuffer[1] / 32768.0; // Right
    }

    return true; // Keep alive
  }
}
```

### Why One Sample at a Time?

**Critical Pattern:** The OPL3 emulator maintains internal state that advances with each `chip.read()` call. Batching samples causes timing errors.

**Correct:**
```javascript
for (let i = 0; i < 128; i++) {
  chip.read(buffer); // Read ONE sample
  output[i] = buffer[0] / 32768.0;
}
```

**Incorrect:**
```javascript
chip.read(bigBuffer); // Read 128 samples at once ❌
// Timing will be wrong!
```

---

## Next: See [TRACKER_SYSTEM.md](TRACKER_SYSTEM.md) for pattern playback documentation
