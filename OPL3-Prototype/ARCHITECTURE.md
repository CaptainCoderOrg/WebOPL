# WebOrchestra - System Architecture

**Last Updated:** 2025-01-06

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Diagram](#component-diagram)
3. [Audio Pipeline](#audio-pipeline)
4. [Data Flow](#data-flow)
5. [Threading Model](#threading-model)
6. [State Management](#state-management)
7. [Key Design Decisions](#key-design-decisions)

---

## Architecture Overview

WebOrchestra uses a **layered architecture** separating concerns:

```
┌─────────────────────────────────────────────────────┐
│                   UI Layer (React)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   Tracker    │  │  Instrument  │  │   Tests   │ │
│  │   Component  │  │   Editor     │  │           │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│              Business Logic Layer                   │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ SimplePlayer │  │ SimpleSynth  │  │  Channel  │ │
│  │  (Playback)  │  │  (Engine)    │  │  Manager  │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│            Web Audio API Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │AudioWorklet  │  │  AudioContext│  │   Gain    │ │
│  │   Node       │  │              │  │   Node    │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│          AudioWorklet Thread (opl-worklet)          │
│  ┌──────────────┐  ┌──────────────┐                │
│  │   OPL3 Chip  │  │Sample Buffer │                │
│  │   Emulator   │  │  Generation  │                │
│  └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────┘
```

---

## Component Diagram

### Core Components

```
App.tsx
├── SimpleSynth (Audio Engine)
│   ├── AudioContext
│   ├── AudioWorkletNode (opl-worklet-processor)
│   ├── GainNode (master volume)
│   └── ChannelManager (channel allocation)
│
├── SimplePlayer (Pattern Playback)
│   ├── Pattern timing (BPM → ms per row)
│   ├── Note scheduling (setInterval)
│   └── Active note tracking
│
├── Tracker (Main UI)
│   ├── TrackerGrid (Note Editor)
│   ├── InstrumentSelector (Per-track)
│   ├── VolumeControl
│   └── Pattern controls
│
├── InstrumentEditor (FM Patch Editor)
│   ├── Operator editors (modulator, carrier)
│   ├── Waveform selector
│   └── ADSR envelope controls
│
└── Utilities
    ├── noteConversion (C-4 ↔ MIDI 60)
    ├── patternValidation (Error checking)
    ├── patternLoader (JSON import)
    ├── genmidiParser (Bank loading)
    └── ChannelManager (Allocation logic)
```

---

## Audio Pipeline

### Signal Flow

```
User Input (Note C-4)
    ↓
noteNameToMIDI('C-4') → 60
    ↓
SimpleSynth.noteOn(channel, 60)
    ↓
ChannelManager allocates OPL channel
    ↓
Load instrument patch to channel
    ↓
Calculate frequency (F-num, block)
    ↓
Write OPL3 registers via AudioWorklet
    ↓
AudioWorklet: chip.write(array, address, value)
    ↓
OPL3 Emulator updates internal state
    ↓
AudioWorklet: chip.read(buffer) in process()
    ↓
Convert Int16 samples → Float32
    ↓
Output to Web Audio destination
    ↓
Speaker output
```

### Register Writing

```typescript
// SimpleSynth (Main Thread)
writeOPL(register: number, value: number) {
  workletNode.port.postMessage({
    type: 'write',
    payload: { register, value }
  });
}

// AudioWorklet (Audio Thread)
chipWrite(register, value) {
  const array = (register >= 0x100) ? 1 : 0;
  const address = register & 0xFF;
  chip.write(array, address, value);
}
```

### Sample Generation

```typescript
// AudioWorklet process() method
process(inputs, outputs, parameters) {
  const output = outputs[0];
  const numSamples = output[0].length; // Usually 128

  // Generate ONE SAMPLE AT A TIME (critical for OPL3!)
  for (let i = 0; i < numSamples; i++) {
    const tempBuffer = new Int16Array(2); // Stereo
    chip.read(tempBuffer);

    // Convert Int16 (-32768 to +32767) → Float32 (-1.0 to +1.0)
    output[0][i] = tempBuffer[0] / 32768.0; // Left
    output[1][i] = tempBuffer[1] / 32768.0; // Right
  }

  return true; // Keep processor alive
}
```

---

## Data Flow

### Pattern Playback Flow

```
1. User clicks "Play"
   ↓
2. App.tsx → player.play()
   ↓
3. SimplePlayer calculates ms per row (BPM-based)
   ↓
4. setInterval(() => playRow(), msPerRow)
   ↓
5. For each track in current row:
   - Convert note string → MIDI
   - Get instrument for track
   - synth.noteOn(track, midiNote)
   ↓
6. SimpleSynth:
   - Allocate channel (single or dual-voice)
   - Load patch to channel
   - Write frequency registers
   - Write key-on register
   ↓
7. AudioWorklet receives register writes
   ↓
8. OPL3 chip updates state
   ↓
9. Audio samples generated
   ↓
10. Output to speakers
```

### Instrument Selection Flow

```
1. User selects instrument from dropdown
   ↓
2. Tracker.tsx → setTrackInstruments([...])
   ↓
3. synth.setTrackPatch(trackId, patch)
   ↓
4. Stored in trackPatches Map
   ↓
5. On next noteOn():
   - Retrieve patch from trackPatches
   - Allocate OPL channel
   - Program patch to channel
   - Trigger note
```

### Instrument Editing Flow

```
1. User clicks "Edit" button
   ↓
2. App.tsx → setEditorOpen(true)
   ↓
3. InstrumentEditor modal opens
   ↓
4. User adjusts sliders (attack, decay, etc.)
   ↓
5. onChange → updateOperator()
   ↓
6. Real-time preview via InstrumentTester
   ↓
7. User clicks "Save"
   ↓
8. Patch saved to instrumentBank
   ↓
9. Marked as custom (isCustom: true)
```

---

## Threading Model

### Main Thread (UI Thread)

**Responsibilities:**
- React component rendering
- User input handling
- Pattern state management
- SimpleSynth API calls
- SimplePlayer timing (setInterval)

**Tasks:**
- Pattern editing
- Instrument selection
- BPM changes
- Register write messages to AudioWorklet

### Audio Thread (AudioWorklet)

**Responsibilities:**
- OPL3 sample generation
- Register writes to chip
- Buffer management
- Real-time audio processing

**Tasks:**
- Receive register writes via postMessage
- Call chip.read() for each sample
- Convert Int16 → Float32
- Fill output buffers

### Communication

```
Main Thread                 Audio Thread
    │                           │
    │─── postMessage({ ──────→  │
    │    type: 'write',          │
    │    payload: {register,val} │
    │   })                       │
    │                           │
    │                       chip.write()
    │                           │
    │  ←────── postMessage({ ───│
    │    type: 'ready'           │
    │   })                       │
    │                           │
```

**Important:** Communication is **asynchronous** and **one-way** for writes. The audio thread never blocks waiting for the main thread.

---

## State Management

### React State (App.tsx)

```typescript
// Audio engine instances
const [synth, setSynth] = useState<SimpleSynth | null>(null);
const [player, setPlayer] = useState<SimplePlayer | null>(null);

// Initialization state
const [isReady, setIsReady] = useState(false);
const [initError, setInitError] = useState<string | null>(null);

// Instrument bank
const [instrumentBank, setInstrumentBank] = useState<OPLPatch[]>([]);
const [bankLoaded, setBankLoaded] = useState(false);

// UI state
const [editorOpen, setEditorOpen] = useState(false);
const [editingTrackId, setEditingTrackId] = useState<number>(0);
```

### Tracker State (Tracker.tsx)

```typescript
// Playback state
const [isPlaying, setIsPlaying] = useState(false);
const [currentRow, setCurrentRow] = useState(0);
const [bpm, setBpm] = useState(120);

// Pattern state
const [numTracks, setNumTracks] = useState(4);
const [numRows, setNumRows] = useState(16);
const [pattern, setPattern] = useState<string[][]>([...]);

// Instrument assignments
const [trackInstruments, setTrackInstruments] = useState<number[]>([]);

// UI preferences
const [guideCollapsed, setGuideCollapsed] = useState(false);
const [compactMode, setCompactMode] = useState(false);
```

### SimpleSynth Internal State

```typescript
class SimpleSynth {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private masterGainNode: GainNode | null = null;

  // Patch assignments
  private trackPatches: Map<number, OPLPatch> = new Map();
  private channelPatches: Map<number, OPLPatch> = new Map();

  // Active notes
  private activeNotes: Map<number, {
    noteId: string;
    channels: number[];
    note: number;
    isDualVoice: boolean;
  }> = new Map();

  // Channel allocation
  private channelManager: ChannelManager = new ChannelManager();
}
```

### SimplePlayer Internal State

```typescript
class SimplePlayer {
  private synth: SimpleSynth;
  private pattern: TrackerPattern | null = null;
  private isPlaying: boolean = false;
  private currentRow: number = 0;
  private intervalId: number | null = null;
  private activeNotes: Map<number, number> = new Map();
  private onRowChange?: (row: number) => void;
}
```

---

## Key Design Decisions

### 1. AudioWorklet vs ScriptProcessorNode

**Decision:** Use AudioWorklet

**Rationale:**
- Lower latency (3-5ms vs 20-50ms)
- Runs in separate thread (no UI blocking)
- Modern standard (ScriptProcessorNode deprecated)
- Better performance for real-time audio

**Trade-off:** Slightly more complex setup

### 2. One Sample at a Time

**Decision:** Call `chip.read()` once per sample frame

**Rationale:**
- OPL3 emulator maintains internal state
- State advances with each sample
- Batching samples causes timing errors
- Required for accurate emulation

**Pattern from opl3-chip-test.html:**
```javascript
for (let i = 0; i < numSamples; i++) {
  chip.read(tempBuffer); // CRITICAL: one at a time
  output[0][i] = tempBuffer[0] / 32768.0;
  output[1][i] = tempBuffer[1] / 32768.0;
}
```

### 3. Channel Manager for Dynamic Allocation

**Decision:** Allocate OPL channels dynamically per note

**Rationale:**
- MIDI has 16 channels, OPL3 has 18
- Dual-voice instruments need 2 channels
- Static mapping wastes channels
- Dynamic allocation maximizes polyphony

**Implementation:** `ChannelManager` class tracks:
- Available channels (0-17)
- Active notes per channel
- Dual-voice pair allocation

### 4. Track-based Patch Assignment

**Decision:** Assign instruments to tracks, not channels

**Rationale:**
- Users think in terms of "tracks"
- Tracks map to MIDI channels
- OPL channels are implementation detail
- Allows flexible channel reuse

**Flow:**
```
Track 0 → Piano patch → allocate OPL channel 0 → program patch → play note
Track 1 → Bass patch → allocate OPL channel 1 → program patch → play note
```

### 5. setInterval for Timing

**Decision:** Use `setInterval()` for pattern playback

**Rationale:**
- Simple and sufficient for prototype
- Accuracy is "good enough" (~1-5ms jitter)
- Easy to understand and debug

**Future:** May migrate to Tone.js for better timing

### 6. React for UI

**Decision:** Use React with TypeScript

**Rationale:**
- Fast development
- Component reusability
- Type safety with TypeScript
- Large ecosystem
- Easy state management

**Trade-off:** Larger bundle size (~300KB)

### 7. GENMIDI as Default Bank

**Decision:** Use Doom's GENMIDI.OP2 instruments

**Rationale:**
- 175 high-quality instruments
- Well-documented format
- Nostalgic appeal (Doom music!)
- Dual-voice support built-in

**Source:** [DMXOPL format documentation](https://doomwiki.org/wiki/DMXOPL)

---

## Performance Characteristics

### Latency Breakdown

| Component | Latency | Notes |
|-----------|---------|-------|
| AudioWorklet buffer | 2-3 ms | 128 samples @ 49,716 Hz |
| Browser audio stack | 1-2 ms | OS-dependent |
| **Total** | **3-5 ms** | Imperceptible |

### CPU Usage

| Operation | Cost | Notes |
|-----------|------|-------|
| OPL3 sample generation | Low | Efficient C++ emulator |
| React UI updates | Medium | Only during editing |
| Pattern playback | Low | Simple setInterval |
| Instrument loading | Minimal | One-time cost |

### Memory Usage

| Component | Size | Notes |
|-----------|------|-------|
| OPL3 emulator | ~500 KB | JavaScript bundle |
| React app | ~300 KB | Minified + gzipped |
| GENMIDI bank | ~50 KB | JSON format |
| Pattern data | ~1-5 KB | Per pattern |
| **Total** | **~1 MB** | Reasonable for web app |

---

## Scalability Considerations

### Current Limits

- **18 OPL channels** (hardware limit)
- **4-16 tracks** (UI practical limit)
- **128 rows max** (timing precision limit)
- **175 instruments** (GENMIDI bank size)

### Potential Scaling

**Multi-chip Support:**
- Could instantiate multiple OPL3 chips
- Mix outputs in Web Audio graph
- Would enable 36, 54+ channels

**Pattern Size:**
- Currently limited by setInterval accuracy
- Could use Tone.js Transport for larger patterns
- Could implement pattern chaining

**Instrument Bank:**
- Could load multiple banks
- Could support user-created instruments
- Could save/load custom patches

---

## Next: See [AUDIO_ENGINE.md](AUDIO_ENGINE.md) for detailed audio engine documentation
