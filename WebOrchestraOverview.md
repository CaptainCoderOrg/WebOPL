# WebOrchestra: OPL3 Synthesizer DAW

## Project Overview

WebOrchestra is a browser-based Digital Audio Workstation (DAW) for creating retro DOS-style music using OPL3 FM synthesis (AdLib/Sound Blaster sound). The application enables users to compose MIDI sequences, stack multiple tracks, arrange patterns, and export to audio files.

### Target Feature Set (Prototype)

**Core Functionality:**
- Multi-track MIDI sequencer with pattern-based composition
- OPL3 FM synthesis engine (2-operator and 4-operator support)
- Dual UI modes: Piano roll (modern) and tracker style (retro)
- Pattern arrangement system
- WAV audio export
- Project serialization (save/load JSON)

**Explicitly Out of Scope:**
- Real-time keyboard/MIDI input
- Advanced effects/automation
- VST plugin support

---

## Technical Architecture

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | Vite + React 18 + TypeScript | Modern build tooling and UI |
| **Audio Synthesis** | @malvineous/opl | WebAssembly OPL3 emulator |
| **Audio Timing** | Tone.js | Scheduling and transport control |
| **UI - Piano Roll** | react-piano-roll | Visual note editor |
| **UI - Virtual Piano** | react-piano (optional) | Visual reference |
| **State Management** | React Context + useReducer | Centralized app state |

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     React UI Layer                       │
├──────────────────┬──────────────────┬───────────────────┤
│  PatternEditor   │   Arrangement    │    Instruments    │
│  - Piano Roll    │   - Timeline     │    - Patch List   │
│  - Tracker View  │   - Pattern Seq  │    - Parameters   │
└────────┬─────────┴────────┬─────────┴─────────┬─────────┘
         │                  │                    │
         └──────────────────┼────────────────────┘
                            │
         ┌──────────────────▼─────────────────────┐
         │         Application State              │
         │   (Patterns, Tracks, Song, Patches)    │
         └──────────────────┬─────────────────────┘
                            │
         ┌──────────────────▼─────────────────────┐
         │          Audio Engine Layer            │
         ├────────────────┬─────────────┬─────────┤
         │ MIDISequencer  │ OPLSynth    │ Exporter│
         │ (Tone.js)      │ (opl wasm)  │ (WAV)   │
         └────────┬───────┴──────┬──────┴─────────┘
                  │              │
         ┌────────▼──────────────▼────────┐
         │      Web Audio API              │
         │   (AudioContext + Worklet)      │
         └─────────────────────────────────┘
```

---

## Data Models

### Core Type Definitions

```typescript
// ============ Note Data ============
interface Note {
  id: string;                    // UUID
  time: number;                  // Time in ticks (e.g., 480 = quarter note at 480 PPQ)
  pitch: number;                 // MIDI note number (0-127)
  duration: number;              // Duration in ticks
  velocity: number;              // Velocity (0-127)
  instrument: number;            // Patch/instrument ID (0-127)
}

// ============ Track Data ============
interface Track {
  id: string;
  name: string;
  notes: Note[];
  muted: boolean;
  solo: boolean;
  volume: number;                // 0.0 - 1.0
  pan: number;                   // -1.0 (left) to 1.0 (right)
  color: string;                 // Hex color for UI
}

// ============ Pattern Data ============
interface Pattern {
  id: string;
  name: string;
  length: number;                // Length in ticks (e.g., 1920 = 4 bars at 480 PPQ)
  tracks: Track[];
  timeSignature: {
    numerator: number;           // e.g., 4 in 4/4
    denominator: number;         // e.g., 4 in 4/4
  };
}

// ============ Song/Project Data ============
interface Song {
  version: string;               // "1.0.0" - for future compatibility
  name: string;
  bpm: number;                   // Beats per minute
  ppq: number;                   // Pulses per quarter note (480 standard)
  patterns: Pattern[];
  arrangement: ArrangementItem[];
  instrumentBank: InstrumentBank;
}

interface ArrangementItem {
  patternId: string;
  startTime: number;             // Start time in ticks (absolute)
}

// ============ OPL3 Instrument Data ============
interface OPLOperator {
  attackRate: number;            // 0-15
  decayRate: number;             // 0-15
  sustainLevel: number;          // 0-15
  releaseRate: number;           // 0-15
  frequencyMultiplier: number;   // 0-15
  keyScaleLevel: number;         // 0-3
  outputLevel: number;           // 0-63 (volume)
  amVibrato: boolean;            // Amplitude modulation
  tremolo: boolean;
  sustainingSound: boolean;      // EG type
  keyScaleRate: boolean;
  waveform: number;              // 0-7
}

interface OPLPatch {
  id: number;                    // 0-127 (GM compatible numbering)
  name: string;
  mode: '2op' | '4op';
  operators: [OPLOperator, OPLOperator] |
             [OPLOperator, OPLOperator, OPLOperator, OPLOperator];
  connection: number;            // Algorithm/connection type
  feedbackModulation: number;    // 0-7
}

interface InstrumentBank {
  name: string;
  patches: OPLPatch[];          // 128 instruments (GM-compatible)
}
```

---

## Core Engine Components

### 1. OPL Synthesizer Engine

**File:** `src/engine/OPLSynthesizer.ts`

**Responsibilities:**
- Initialize @malvineous/opl WebAssembly module
- Write register data for note on/off events
- Generate PCM audio samples
- Manage OPL3 voice allocation (18 channels, 9 in 4-op mode)

**Key Methods:**
```typescript
class OPLSynthesizer {
  private opl: OPL;                      // From @malvineous/opl
  private sampleRate: number = 49716;    // OPL3 native rate
  private voices: VoiceState[];          // Track 18 voices

  async init(): Promise<void>

  // Load instrument into memory
  loadPatch(patchId: number, patch: OPLPatch): void

  // Trigger note
  noteOn(channel: number, note: number, velocity: number, patchId: number): void

  // Release note
  noteOff(channel: number, note: number): void

  // Generate samples (called by AudioWorklet)
  generate(numSamples: number): Float32Array

  // Reset all voices
  reset(): void
}

interface VoiceState {
  active: boolean;
  note: number;
  channel: number;
  patchId: number;
}
```

**OPL3 Register Programming:**
- Frequency = 49716 / (2^(20-block)) / F-Number
- F-Number = Frequency * 2^(20-block) / 49716
- MIDI note to F-Number lookup table required
- Register offsets for 2-op vs 4-op modes differ

---

### 2. MIDI Sequencer

**File:** `src/engine/MIDISequencer.ts`

**Responsibilities:**
- Schedule note events using Tone.js Transport
- Handle pattern playback and looping
- Manage arrangement timeline
- Sync UI playhead position

**Key Methods:**
```typescript
class MIDISequencer {
  private transport: Tone.Transport;
  private scheduledEvents: Map<string, number>;  // Event ID -> Tone event ID
  private playheadCallbacks: Set<(position: number) => void>;

  constructor(private synthEngine: OPLSynthesizer)

  // Load arrangement into transport
  loadArrangement(song: Song): void

  // Schedule a single pattern at specific time
  schedulePattern(pattern: Pattern, startTime: number): void

  // Transport controls
  play(): void
  pause(): void
  stop(): void
  seek(position: number): void  // Position in ticks

  // Tempo control
  setBPM(bpm: number): void

  // Get current playback position
  getPosition(): number  // Returns ticks

  // Register callback for playhead updates (for UI)
  onPlayhead(callback: (position: number) => void): void
}
```

**Scheduling Strategy:**
- Convert tick-based notes to Tone.js time notation
- Use Tone.Transport.schedule() for sample-accurate timing
- Handle pattern loops via Tone.Loop
- Clear/reschedule on arrangement changes

---

### 3. Audio Engine Integration

**File:** `src/engine/AudioEngine.ts`

**Responsibilities:**
- Bridge OPL synthesizer to Web Audio API
- Manage AudioContext lifecycle
- Implement AudioWorklet for real-time synthesis
- Handle audio export (offline rendering)

**Key Methods:**
```typescript
class AudioEngine {
  private audioContext: AudioContext;
  private workletNode: AudioWorkletNode;
  private synthesizer: OPLSynthesizer;
  private sequencer: MIDISequencer;

  async init(): Promise<void>

  // Start/stop audio processing
  start(): void
  stop(): void

  // Get sub-engines
  getSynthesizer(): OPLSynthesizer
  getSequencer(): MIDISequencer

  // Export to WAV
  async exportWAV(song: Song): Promise<Blob>
}
```

**AudioWorklet Implementation:**

**File:** `src/engine/worklets/opl-processor.worklet.ts`

```typescript
class OPLProcessor extends AudioWorkletProcessor {
  private synthesizer: OPLSynthesizer;

  constructor() {
    super();
    // Handle messages from main thread (note on/off)
    this.port.onmessage = this.handleMessage.bind(this);
  }

  process(inputs: Float32Array[][],
          outputs: Float32Array[][],
          parameters: Record<string, Float32Array>): boolean {
    const output = outputs[0];
    const samples = this.synthesizer.generate(output[0].length);

    // Copy to output buffer (stereo)
    output[0].set(samples);  // Left
    output[1].set(samples);  // Right

    return true;  // Keep processor alive
  }

  handleMessage(event: MessageEvent) {
    const { type, data } = event.data;
    switch (type) {
      case 'noteOn':
        this.synthesizer.noteOn(data.channel, data.note, data.velocity, data.patch);
        break;
      case 'noteOff':
        this.synthesizer.noteOff(data.channel, data.note);
        break;
    }
  }
}
```

---

### 4. WAV Exporter

**File:** `src/engine/WAVExporter.ts`

**Responsibilities:**
- Render song to PCM samples offline
- Encode as WAV format
- Progress reporting for UI

**Key Methods:**
```typescript
class WAVExporter {
  async export(
    song: Song,
    synthesizer: OPLSynthesizer,
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    const totalTicks = this.calculateSongLength(song);
    const sampleRate = 49716;
    const samples: Float32Array[] = [];

    // Offline rendering loop
    for (let tick = 0; tick < totalTicks; tick += blockSize) {
      const block = this.renderBlock(song, tick, blockSize, synthesizer);
      samples.push(block);

      if (onProgress) {
        onProgress((tick / totalTicks) * 100);
      }
    }

    // Encode to WAV
    return this.encodeWAV(samples, sampleRate);
  }

  private encodeWAV(samples: Float32Array[], sampleRate: number): Blob {
    // Standard WAV file encoding:
    // - RIFF header
    // - fmt chunk (PCM, 16-bit, mono/stereo, sample rate)
    // - data chunk (samples)
  }
}
```

---

### 5. Instrument Manager

**File:** `src/engine/InstrumentManager.ts`

**Responsibilities:**
- Load pre-packaged instrument banks
- Parse SBI/IBK/GENMIDI formats (future)
- Provide patch lookup

**Key Methods:**
```typescript
class InstrumentManager {
  private banks: Map<string, InstrumentBank>;

  // Load default GENMIDI bank
  async loadDefaultBank(): Promise<InstrumentBank>

  // Get patch by GM number
  getPatch(bankName: string, patchId: number): OPLPatch

  // List available banks
  getBanks(): InstrumentBank[]
}
```

**Default Instrument Bank:**
- Include GENMIDI.json (Doom's OPL patches converted to JSON)
- 128 instruments mapped to General MIDI standard
- Store in `public/instruments/genmidi.json`

---

## UI Components

### Application Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Header: [Project Name] [BPM: 120] [Save] [Load] [Export]   │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ARRANGEMENT VIEW                                        │ │
│ │ Timeline: [Pattern 1] [Pattern 2] [Pattern 1]          │ │
│ │ Playhead: ▶                                            │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ PATTERN EDITOR                  [Piano Roll / Tracker]  │ │
│ │ ┌──────┬──────────────────────────────────────────────┐ │ │
│ │ │Track │   Grid View (Notes)                          │ │ │
│ │ │  1   │   ████  ██  ████                             │ │ │
│ │ │[M][S]│                                               │ │ │
│ │ ├──────┼──────────────────────────────────────────────┤ │ │
│ │ │Track │                                               │ │ │
│ │ │  2   │     ██    ████  ██                           │ │ │
│ │ │[M][S]│                                               │ │ │
│ │ └──────┴──────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Transport: [◀◀] [▶/⏸] [⏹] [⏺] Position: 1.1.1            │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```typescript
<App>
  <Header>
    <ProjectInfo />
    <FileMenu />
    <ExportButton />
  </Header>

  <MainContent>
    <ArrangementView>
      <Timeline />
      <PatternSequencer />
    </ArrangementView>

    <PatternEditor>
      <EditorModeToggle /> {/* Piano Roll / Tracker */}
      <TrackList />
      {mode === 'pianoroll' ? (
        <PianoRollEditor />
      ) : (
        <TrackerEditor />
      )}
    </PatternEditor>

    <InstrumentPanel>
      <InstrumentList />
      <InstrumentInfo />
    </InstrumentPanel>
  </MainContent>

  <TransportBar>
    <PlaybackControls />
    <PositionDisplay />
    <TempoControl />
  </TransportBar>
</App>
```

---

## Component Specifications

### 1. Piano Roll Editor

**File:** `src/components/PatternEditor/PianoRollEditor.tsx`

**Features:**
- Horizontal timeline (measures/beats)
- Vertical pitch axis (MIDI note numbers)
- Note rectangles (click-drag to create, resize for duration)
- Grid snapping (configurable: 1/4, 1/8, 1/16, 1/32)
- Multi-track view with color coding
- Velocity editing via note color intensity

**Integration with react-piano-roll:**
```typescript
import PianoRoll from 'react-piano-roll';

interface Note {
  time: string;      // "bars:quarters:sixteenths"
  note: string;      // "C4", "D#5"
  duration: string;  // "4n", "8n"
  velocity: number;
}

<PianoRoll
  notes={convertedNotes}
  onChange={handleNotesChange}
  resolution={16}    // 16th note resolution
  width={800}
  height={400}
/>
```

**Custom Features (may need wrapper):**
- Track selection/switching
- Instrument assignment per track
- Copy/paste functionality

---

### 2. Tracker Editor

**File:** `src/components/PatternEditor/TrackerEditor.tsx`

**Layout:**
```
   ┌─────────┬─────────┬─────────┬─────────┐
   │ Track 1 │ Track 2 │ Track 3 │ Track 4 │
   │  Inst   │  Inst   │  Inst   │  Inst   │
───┼─────────┼─────────┼─────────┼─────────┤
00 │ C-4 01  │ ... ..  │ D#3 05  │ ... ..  │
01 │ ... ..  │ E-4 02  │ ... ..  │ ... ..  │
02 │ G-4 01  │ ... ..  │ F-3 05  │ G-5 12  │
03 │ ... ..  │ ... ..  │ ... ..  │ ... ..  │
```

**Features:**
- Vertical scrolling grid
- Cells show: Note + Instrument number
- Keyboard navigation (arrow keys, edit mode)
- Row highlighting for playback position
- Row numbers for reference

**Implementation:**
- Custom React component with virtualized scrolling
- Use `<table>` or CSS Grid for layout
- Track keyboard events for navigation
- Convert internal Note[] to row-based format

---

### 3. Arrangement Timeline

**File:** `src/components/Arrangement/Timeline.tsx`

**Features:**
- Horizontal timeline showing pattern sequence
- Drag-and-drop to rearrange patterns
- Pattern blocks with labels
- Loop markers (future enhancement)
- Zoom controls

**Visual Design:**
```
┌──────────────────────────────────────────────────────┐
│ ┌───────────┐ ┌───────────┐ ┌───────────┐           │
│ │ Pattern 1 │ │ Pattern 2 │ │ Pattern 1 │           │
│ └───────────┘ └───────────┘ └───────────┘           │
│      4 bars        4 bars        4 bars              │
│ ▶ [Playhead]                                         │
└──────────────────────────────────────────────────────┘
```

**Drag-and-Drop Implementation:**
- Use HTML5 Drag and Drop API or react-beautiful-dnd
- Allow inserting new pattern instances
- Allow reordering and deleting

---

### 4. Track List

**File:** `src/components/PatternEditor/TrackList.tsx`

**Features:**
- Track name display/editing
- Mute/Solo buttons
- Volume sliders (future)
- Color indicators
- Add/remove track buttons

**Layout:**
```
┌──────────────────────┐
│ Track 1              │
│ Piano   [M] [S]  🔊  │
├──────────────────────┤
│ Track 2              │
│ Bass    [M] [S]  🔊  │
├──────────────────────┤
│ Track 3              │
│ Drums   [M] [S]  🔊  │
├──────────────────────┤
│ [+ Add Track]        │
└──────────────────────┘
```

---

### 5. Transport Controls

**File:** `src/components/Transport/TransportBar.tsx`

**Controls:**
- Previous Pattern (◀◀)
- Play/Pause (▶/⏸)
- Stop (⏹)
- Record (⏺) - Disabled in prototype
- Position display (measures:beats:ticks)
- BPM input

**State Integration:**
```typescript
const TransportBar: React.FC = () => {
  const { sequencer } = useAudioEngine();
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);

  const handlePlay = () => {
    if (isPlaying) {
      sequencer.pause();
    } else {
      sequencer.play();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    sequencer.onPlayhead((pos) => {
      setPosition(pos);
    });
  }, [sequencer]);

  return (
    <div>
      <button onClick={handlePlay}>
        {isPlaying ? '⏸' : '▶'}
      </button>
      <span>{formatPosition(position)}</span>
    </div>
  );
};
```

---

### 6. Instrument Panel

**File:** `src/components/Instruments/InstrumentPanel.tsx`

**Features:**
- List of 128 GM instruments
- Search/filter
- Currently selected instrument highlight
- Basic parameter display (read-only for prototype)

**Layout:**
```
┌────────────────────────────┐
│ INSTRUMENTS    [Search...]  │
├────────────────────────────┤
│ 001 Acoustic Piano         │
│ 002 Bright Piano           │
│ 003 Electric Piano      ◀  │  (selected)
│ 004 Honky-tonk Piano       │
│ ...                        │
├────────────────────────────┤
│ Patch: Electric Piano      │
│ Mode: 4-operator           │
│ Algorithm: FM→FM→FM→FM     │
└────────────────────────────┘
```

---

## State Management

### Application State Structure

```typescript
interface AppState {
  // Project data
  song: Song;

  // UI state
  ui: {
    currentPatternId: string | null;
    currentTrackId: string | null;
    editorMode: 'pianoroll' | 'tracker';
    zoom: number;
    scrollPosition: { x: number; y: number };
    selectedNotes: Set<string>;  // Note IDs
  };

  // Playback state
  playback: {
    isPlaying: boolean;
    position: number;  // Ticks
    loop: boolean;
  };

  // Audio engine
  audioEngine: AudioEngine | null;
}

// Actions
type Action =
  | { type: 'LOAD_SONG'; payload: Song }
  | { type: 'UPDATE_PATTERN'; payload: { patternId: string; pattern: Pattern } }
  | { type: 'ADD_NOTE'; payload: { patternId: string; trackId: string; note: Note } }
  | { type: 'DELETE_NOTE'; payload: { patternId: string; trackId: string; noteId: string } }
  | { type: 'SET_BPM'; payload: number }
  | { type: 'TOGGLE_TRACK_MUTE'; payload: { patternId: string; trackId: string } }
  | { type: 'SET_EDITOR_MODE'; payload: 'pianoroll' | 'tracker' }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'STOP' }
  | { type: 'SET_POSITION'; payload: number };
```

### Context Providers

**File:** `src/contexts/AppContext.tsx`

```typescript
const AppContext = React.createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export const AppProvider: React.FC = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppState must be used within AppProvider');
  return context;
};
```

**File:** `src/contexts/AudioEngineContext.tsx`

```typescript
const AudioEngineContext = React.createContext<AudioEngine | null>(null);

export const AudioEngineProvider: React.FC = ({ children }) => {
  const [engine, setEngine] = useState<AudioEngine | null>(null);

  useEffect(() => {
    const initEngine = async () => {
      const audioEngine = new AudioEngine();
      await audioEngine.init();
      setEngine(audioEngine);
    };
    initEngine();
  }, []);

  return (
    <AudioEngineContext.Provider value={engine}>
      {children}
    </AudioEngineContext.Provider>
  );
};

export const useAudioEngine = () => {
  const engine = useContext(AudioEngineContext);
  if (!engine) throw new Error('Audio engine not initialized');
  return engine;
};
```

---

## File Serialization

### Save Project

**File:** `src/utils/serialization.ts`

```typescript
export function serializeSong(song: Song): string {
  return JSON.stringify(song, null, 2);
}

export function saveProject(song: Song, filename: string): void {
  const json = serializeSong(song);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  link.click();

  URL.revokeObjectURL(url);
}
```

### Load Project

```typescript
export function deserializeSong(json: string): Song {
  const data = JSON.parse(json);

  // Validation
  if (!data.version || !data.patterns || !data.arrangement) {
    throw new Error('Invalid project file format');
  }

  // Version migration (future-proofing)
  if (data.version !== '1.0.0') {
    return migrateSong(data);
  }

  return data as Song;
}

export async function loadProject(file: File): Promise<Song> {
  const text = await file.text();
  return deserializeSong(text);
}
```

### File Format Example

```json
{
  "version": "1.0.0",
  "name": "My OPL Song",
  "bpm": 120,
  "ppq": 480,
  "patterns": [
    {
      "id": "pat-1",
      "name": "Intro",
      "length": 1920,
      "timeSignature": { "numerator": 4, "denominator": 4 },
      "tracks": [
        {
          "id": "trk-1",
          "name": "Lead",
          "notes": [
            {
              "id": "note-1",
              "time": 0,
              "pitch": 60,
              "duration": 240,
              "velocity": 100,
              "instrument": 0
            }
          ],
          "muted": false,
          "solo": false,
          "volume": 1.0,
          "pan": 0.0,
          "color": "#FF5733"
        }
      ]
    }
  ],
  "arrangement": [
    { "patternId": "pat-1", "startTime": 0 },
    { "patternId": "pat-1", "startTime": 1920 }
  ],
  "instrumentBank": {
    "name": "GENMIDI",
    "patches": []
  }
}
```

---

## Implementation Roadmap

### Phase 1: Project Setup & Foundation (Week 1)

**Tasks:**
1. ✅ Initialize Vite + React + TypeScript project
   ```bash
   npm create vite@latest weborchestra -- --template react-ts
   cd weborchestra
   npm install
   ```

2. ✅ Install core dependencies
   ```bash
   npm install tone @malvineous/opl
   npm install -D @types/node
   ```

3. ✅ Create project structure
   - `src/engine/` - Audio engine code
   - `src/components/` - React components
   - `src/types/` - TypeScript interfaces
   - `src/contexts/` - React contexts
   - `src/utils/` - Utility functions
   - `public/instruments/` - Instrument banks

4. ✅ Define core data types (`src/types/Song.ts`, etc.)

5. ✅ Set up basic React app shell
   - App.tsx with layout structure
   - Basic routing (if needed)

**Milestone:** Project compiles and runs with "Hello World"

---

### Phase 2: Audio Engine Core (Week 2)

**Tasks:**
1. ✅ Implement OPLSynthesizer class
   - Initialize @malvineous/opl
   - Basic register writes (note on/off)
   - Test with single tone generation

2. ✅ Create AudioWorklet processor
   - `opl-processor.worklet.ts`
   - Message passing for note events
   - Buffer management

3. ✅ Implement AudioEngine class
   - AudioContext initialization
   - Worklet registration and connection
   - Basic start/stop

4. ✅ Test audio output
   - Simple test page: click button → play tone
   - Verify OPL3 synthesis works

**Milestone:** Can play individual OPL3 tones on command

---

### Phase 3: Sequencing & Timing (Week 3)

**Tasks:**
1. ✅ Implement MIDISequencer class
   - Tone.js Transport integration
   - Schedule single note events
   - Playhead position tracking

2. ✅ Create simple Pattern/Track data
   - Hardcode test pattern with notes
   - Load into sequencer

3. ✅ Implement playback controls
   - Play/pause/stop functionality
   - BPM control

4. ✅ Test pattern playback
   - Verify timing accuracy
   - Multiple tracks playing simultaneously

**Milestone:** Can play back hardcoded multi-track patterns with correct timing

---

### Phase 4: Instrument System (Week 3-4)

**Tasks:**
1. ✅ Create GENMIDI instrument bank JSON
   - Convert Doom GENMIDI data
   - Store in `public/instruments/genmidi.json`
   - 128 patches with full OPL parameters

2. ✅ Implement InstrumentManager
   - Load instrument bank
   - getPatch() method

3. ✅ Integrate instruments with synthesizer
   - loadPatch() implementation
   - Register programming for 2-op and 4-op modes

4. ✅ Test different instruments
   - Verify all 128 patches load
   - Audition each sound

**Milestone:** Can play patterns with different OPL instruments

---

### Phase 5: UI - Pattern Editor (Week 4-5)

**Tasks:**
1. ✅ Implement basic TrackList component
   - Display track names
   - Mute/solo buttons (UI only)

2. ✅ Integrate react-piano-roll
   - PianoRollEditor component
   - Note display from pattern data
   - Convert between formats (Tone.js ↔ internal)

3. ✅ Implement note editing
   - Add notes (click/drag)
   - Delete notes (selection + delete key)
   - Move notes (drag)
   - Resize notes (drag edges)

4. ✅ Connect editor to state
   - Update pattern data on edit
   - Trigger sequencer refresh

**Milestone:** Can visually edit patterns and hear changes on playback

---

### Phase 6: UI - Tracker Editor (Week 5-6)

**Tasks:**
1. ✅ Design TrackerEditor component
   - Grid layout (rows x tracks)
   - Cell rendering (note + instrument)

2. ✅ Implement keyboard navigation
   - Arrow keys to move cursor
   - Enter to edit cell
   - Tab to switch tracks

3. ✅ Implement cell editing
   - Note entry (keyboard input)
   - Instrument selection
   - Clear cell (Delete key)

4. ✅ Mode toggle
   - Switch between Piano Roll and Tracker
   - Preserve data

**Milestone:** Both editor modes functional and interchangeable

---

### Phase 7: Arrangement System (Week 6-7)

**Tasks:**
1. ✅ Implement Timeline component
   - Display pattern sequence
   - Visual blocks with labels

2. ✅ Implement pattern sequencing logic
   - Add pattern instances to arrangement
   - Calculate absolute timing

3. ✅ Implement drag-and-drop
   - Reorder patterns
   - Insert/delete pattern instances

4. ✅ Update sequencer for arrangements
   - Load full arrangement (not just single pattern)
   - Handle pattern transitions

**Milestone:** Can arrange multiple patterns into a song and play back

---

### Phase 8: Export & Serialization (Week 7-8)

**Tasks:**
1. ✅ Implement WAVExporter
   - Offline rendering loop
   - PCM to WAV encoding
   - Progress reporting

2. ✅ Create export UI
   - Export button
   - Progress modal/indicator
   - Download trigger

3. ✅ Implement save project
   - serializeSong() function
   - Download JSON file

4. ✅ Implement load project
   - File input UI
   - deserializeSong() function
   - Load into app state

**Milestone:** Can export songs to WAV and save/load projects as JSON

---

### Phase 9: Polish & Bug Fixes (Week 8)

**Tasks:**
1. ✅ UI/UX improvements
   - Responsive layout
   - Loading states
   - Error handling

2. ✅ Performance optimization
   - Memo components
   - Debounce UI updates
   - Optimize re-renders

3. ✅ Testing
   - Manual testing of all features
   - Edge cases (empty patterns, invalid data)
   - Browser compatibility (Chrome, Firefox, Safari)

4. ✅ Documentation
   - README with usage instructions
   - Code comments
   - Architecture diagram

**Milestone:** Production-ready prototype

---

## Technical Challenges & Solutions

### Challenge 1: OPL3 Voice Allocation

**Problem:** OPL3 has limited polyphony (18 voices for 2-op, 9 for 4-op). Need to handle voice stealing when all channels are in use.

**Solution:**
- Implement voice allocation algorithm (oldest-note-first or lowest-priority)
- Track voice states (active, note, start time)
- When all voices busy, stop oldest note and reuse voice

```typescript
allocateVoice(note: number, priority: number): number {
  // Try to find free voice
  const freeVoice = this.voices.findIndex(v => !v.active);
  if (freeVoice !== -1) return freeVoice;

  // Find oldest active voice
  const oldestVoice = this.voices.reduce((oldest, v, i) =>
    v.startTime < this.voices[oldest].startTime ? i : oldest
  , 0);

  this.noteOff(this.voices[oldestVoice].channel, this.voices[oldestVoice].note);
  return oldestVoice;
}
```

---

### Challenge 2: MIDI Note → F-Number Conversion

**Problem:** OPL3 uses F-Number + Block for pitch, not MIDI note numbers.

**Solution:**
- Pre-calculate lookup table for all 128 MIDI notes
- Formula: `fnum = freq * 2^(20-block) / 49716`

```typescript
const MIDI_TO_FNUM: Array<{ fnum: number; block: number }> = [];

function initMIDITable() {
  for (let midi = 0; midi < 128; midi++) {
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    let block = 0;
    let fnum = 0;

    // Find optimal block (0-7)
    for (let b = 0; b < 8; b++) {
      const f = Math.round(freq * Math.pow(2, 20 - b) / 49716);
      if (f < 1024) {
        block = b;
        fnum = f;
        break;
      }
    }

    MIDI_TO_FNUM[midi] = { fnum, block };
  }
}
```

---

### Challenge 3: Audio Timing Synchronization

**Problem:** JavaScript timers (setTimeout) are not accurate enough for musical timing. Can drift significantly.

**Solution:**
- Use Tone.js Transport (already solved)
- Transport uses Web Audio clock (AudioContext.currentTime)
- Schedule events ahead of time using lookahead
- Never rely on setTimeout for audio events

---

### Challenge 4: Real-time Performance

**Problem:** OPL3 emulation in WebAssembly may cause audio glitches if main thread is blocked.

**Solution:**
- Run synthesis in AudioWorklet (audio thread, high priority)
- Minimize work on main thread during playback
- Use requestAnimationFrame for UI updates (60fps max)
- Buffer audio samples in worklet

---

### Challenge 5: WAV Export Duration

**Problem:** Long songs take significant time to render offline.

**Solution:**
- Show progress bar during export
- Render in chunks (e.g., 1 second at a time)
- Use Web Worker for encoding (keep UI responsive)

```typescript
async exportWAV(song: Song): Promise<Blob> {
  const worker = new Worker('./export-worker.js');

  return new Promise((resolve, reject) => {
    worker.postMessage({ song });

    worker.onmessage = (e) => {
      if (e.data.type === 'progress') {
        this.updateProgress(e.data.percent);
      } else if (e.data.type === 'complete') {
        resolve(e.data.blob);
      }
    };

    worker.onerror = reject;
  });
}
```

---

## Development Guidelines

### Code Style

- **TypeScript:** Strict mode enabled
- **Linting:** ESLint with React + TypeScript rules
- **Formatting:** Prettier (2 spaces, single quotes, trailing commas)
- **Naming:**
  - Components: PascalCase
  - Functions/variables: camelCase
  - Constants: UPPER_SNAKE_CASE
  - Files: Match export name

### Performance Best Practices

1. **React Optimization:**
   - Use `React.memo()` for pure components
   - Use `useMemo()` for expensive calculations
   - Use `useCallback()` for event handlers passed to children
   - Avoid inline object/array literals in JSX

2. **Audio Thread:**
   - Keep AudioWorklet code minimal
   - No heap allocations in `process()` method
   - Pre-allocate buffers

3. **Large Data:**
   - Virtualize long lists (react-window)
   - Paginate pattern display
   - Lazy load instrument banks

### Error Handling

```typescript
// Engine initialization
try {
  await audioEngine.init();
} catch (error) {
  console.error('Failed to initialize audio:', error);
  // Show user-friendly error modal
  showError('Audio initialization failed. Please check browser compatibility.');
}

// File loading
try {
  const song = await loadProject(file);
  dispatch({ type: 'LOAD_SONG', payload: song });
} catch (error) {
  console.error('Failed to load project:', error);
  showError('Invalid project file format.');
}
```

### Testing Strategy

**Manual Testing Checklist:**
- [ ] Create new pattern with notes
- [ ] Play/pause/stop transport
- [ ] Edit notes in both editor modes
- [ ] Switch between patterns in arrangement
- [ ] Mute/unmute tracks
- [ ] Change BPM
- [ ] Change instruments
- [ ] Export to WAV
- [ ] Save project
- [ ] Load project
- [ ] Browser compatibility (Chrome, Firefox, Safari)

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Web Audio API | ✅ | ✅ | ✅ | ✅ |
| AudioWorklet | ✅ | ✅ | ✅ (14.1+) | ✅ |
| WebAssembly | ✅ | ✅ | ✅ | ✅ |
| ES Modules | ✅ | ✅ | ✅ | ✅ |

**Minimum Versions:**
- Chrome 66+
- Firefox 76+
- Safari 14.1+
- Edge 79+

---

## Resources & References

### Libraries Documentation
- [@malvineous/opl](https://github.com/malvineous/opl3-wasm)
- [Tone.js](https://tonejs.github.io/)
- [react-piano-roll](https://github.com/unkleho/react-piano-roll)
- [Vite](https://vitejs.dev/)

### OPL3 Technical References
- [OPL3 Programming Guide](http://shipbrook.net/jeff/sb.html)
- [ModdingWiki: SBI/IBK Formats](https://moddingwiki.shikadi.net/wiki/IBK_Format)
- [GENMIDI Patch Format](https://doomwiki.org/wiki/GENMIDI)
- [OPL3 Register Map](https://www.fit.vutbr.cz/~arnost/opl/opl3.html)

### Web Audio Resources
- [MDN: Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- ["A Tale of Two Clocks"](https://www.html5rocks.com/en/tutorials/audio/scheduling/) - Audio timing article
- [AudioWorklet Design Pattern](https://developers.google.com/web/updates/2017/12/audio-worklet)

### Inspiration Projects
- [BassoonTracker](https://github.com/steffest/BassoonTracker) - Web-based tracker
- [Liberty Beats](https://github.com/LibberateBeat/LibbertyBeats) - React + Tone.js DAW

---

## Future Enhancements (Post-Prototype)

### Phase 10+: Advanced Features
- **Real-time keyboard input** (computer keyboard → notes)
- **MIDI device support** (Web MIDI API)
- **Advanced instrument editor** (visual FM parameter controls)
- **Effects system** (reverb, delay, chorus)
- **Automation lanes** (tempo changes, volume automation)
- **Sample import** (PCM samples for drums)
- **MIDI file import/export**
- **Collaboration features** (share projects online)
- **Plugin system** (user extensions)
- **Mobile support** (touch interface)

---

## Appendix A: OPL3 Register Quick Reference

```
Register offsets (2-operator mode):
- Operator 1: 0x00-0x15
- Operator 2: 0x03-0x18

Register types:
0x20-0x35: AM/VIB/EG/KSR/MULT (per operator)
0x40-0x55: KSL/OUTPUT LEVEL (per operator)
0x60-0x75: ATTACK/DECAY (per operator)
0x80-0x95: SUSTAIN/RELEASE (per operator)
0xA0-0xA8: F-Number low 8 bits (per channel)
0xB0-0xB8: KEY-ON/BLOCK/F-Number high 2 bits (per channel)
0xC0-0xC8: FEEDBACK/CONNECTION (per channel)
0xE0-0xF5: WAVEFORM (per operator)

4-operator mode:
- Channels 0-2 + 9-11 paired (6 channels total)
- Enabled via 0x104 register
```

---

## Appendix B: Project File Structure

```
weborchestra/
├── public/
│   ├── instruments/
│   │   ├── genmidi.json           # Doom instrument bank (128 patches)
│   │   └── patches/               # Additional SBI/IBK files
│   └── examples/
│       └── demo-song.json         # Example project
├── src/
│   ├── components/
│   │   ├── App.tsx
│   │   ├── Header/
│   │   │   ├── Header.tsx
│   │   │   ├── FileMenu.tsx
│   │   │   └── ExportButton.tsx
│   │   ├── Arrangement/
│   │   │   ├── Timeline.tsx
│   │   │   └── PatternSequencer.tsx
│   │   ├── PatternEditor/
│   │   │   ├── PatternEditor.tsx
│   │   │   ├── PianoRollEditor.tsx
│   │   │   ├── TrackerEditor.tsx
│   │   │   ├── TrackList.tsx
│   │   │   └── EditorModeToggle.tsx
│   │   ├── Instruments/
│   │   │   ├── InstrumentPanel.tsx
│   │   │   ├── InstrumentList.tsx
│   │   │   └── InstrumentInfo.tsx
│   │   └── Transport/
│   │       ├── TransportBar.tsx
│   │       ├── PlaybackControls.tsx
│   │       └── PositionDisplay.tsx
│   ├── engine/
│   │   ├── AudioEngine.ts
│   │   ├── OPLSynthesizer.ts
│   │   ├── MIDISequencer.ts
│   │   ├── InstrumentManager.ts
│   │   ├── WAVExporter.ts
│   │   └── worklets/
│   │       └── opl-processor.worklet.ts
│   ├── types/
│   │   ├── Song.ts
│   │   ├── Pattern.ts
│   │   ├── Track.ts
│   │   ├── Note.ts
│   │   ├── Instrument.ts
│   │   └── index.ts
│   ├── contexts/
│   │   ├── AppContext.tsx
│   │   └── AudioEngineContext.tsx
│   ├── hooks/
│   │   ├── useAudioEngine.ts
│   │   ├── useSequencer.ts
│   │   └── useInstruments.ts
│   ├── utils/
│   │   ├── serialization.ts
│   │   ├── timeConversion.ts
│   │   ├── midiUtils.ts
│   │   └── oplRegisterMap.ts
│   ├── styles/
│   │   ├── App.css
│   │   └── components/
│   ├── main.tsx
│   └── vite-env.d.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .eslintrc.json
├── .prettierrc
└── README.md
```

---

This comprehensive overview provides the complete blueprint for building WebOrchestra. The project is structured in clear phases, with well-defined data models, component specifications, and technical solutions to anticipated challenges.
