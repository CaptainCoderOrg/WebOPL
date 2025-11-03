# WebOrchestra - Minimal Prototype

**Status:** ✅ MVP COMPLETE (Parts 1-3 finished)

**Next:** Part 4 - Polish (validation, shortcuts, error handling)

---

## Objective

Create the simplest possible working demo that proves the core technology works:
- ✅ OPL3 synthesis in the browser
- ✅ Play notes with correct timing
- ✅ Simple text-based note entry
- ✅ Basic playback controls

**Goal:** Get OPL sound working with minimal complexity, then iterate.

---

## What's Included (Minimal Viable Prototype)

### Core Features
1. **Single hardcoded OPL instrument**
2. **Text-based tracker** (simple textarea or grid)
3. **Basic playback** (play/stop only)
4. **Fixed BPM** (start with 120, make it editable later)
5. **4 tracks maximum**
6. **16 rows (1 bar at 16th note resolution)**

### NOT Included (Add Later)
- ❌ Multiple patterns
- ❌ Piano roll editor
- ❌ Instrument editor
- ❌ Multiple instrument banks
- ❌ WAV export
- ❌ Save/load projects
- ❌ Drag-and-drop arrangement
- ❌ Effects

---

## Architecture (Simplified)

```
┌─────────────────────────────────────┐
│     Simple React UI                 │
│  - Tracker Grid (16 rows x 4 cols) │
│  - Play/Stop buttons                │
│  - BPM input                        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│     Playback Engine                 │
│  - Parse tracker data               │
│  - Schedule notes with setTimeout   │
│  - Trigger OPL synth                │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│     OPL Synthesizer                 │
│  - @malvineous/opl wrapper          │
│  - ScriptProcessorNode for audio    │
│  - Note on/off                      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│     Web Audio API                   │
│  - AudioContext                     │
│  - Audio output                     │
└─────────────────────────────────────┘
```

**Key Simplification:** Skip Tone.js for now - use simple setTimeout for scheduling (less accurate but much simpler).

---

## Tracker Data Format

### Simple Text Format

```
# Track 1   Track 2   Track 3   Track 4
  C-4 00    --- --    --- --    --- --
  --- --    E-4 00    --- --    --- --
  D-4 00    --- --    G-4 00    --- --
  --- --    --- --    --- --    --- --
  E-4 00    G-4 00    --- --    C-5 00
  --- --    --- --    --- --    --- --
  F-4 00    --- --    A-4 00    --- --
  --- --    A-4 00    --- --    --- --
  G-4 00    --- --    --- --    E-5 00
  --- --    --- --    C-5 00    --- --
  A-4 00    C-5 00    --- --    --- --
  --- --    --- --    --- --    --- --
  G-4 00    --- --    B-4 00    D-5 00
  --- --    B-4 00    --- --    --- --
  F-4 00    --- --    --- --    --- --
  --- --    --- --    G-4 00    C-5 00
```

**Format:**
- `C-4` = Note name + octave (C4 = middle C, MIDI 60)
- `00` = Instrument number (always 00 for MVP)
- `---` = No note (rest)
- `--` = No instrument change

### Data Structure (Internal)

```typescript
interface TrackerNote {
  note: number | null;    // MIDI note number, null = rest
  instrument: number;     // Instrument ID
}

interface TrackerPattern {
  rows: TrackerNote[][];  // [row][track]
  bpm: number;
  stepsPerBeat: number;   // 4 = 16th notes
}
```

---

## Implementation Plan (Minimal)

### Phase 0: Proof of Concept (1-2 hours) ✅ COMPLETED
**Goal:** Just get a tone from OPL to play in the browser.

**Steps:**
1. Initialize Vite project
2. Install `@malvineous/opl` only
3. Create single HTML page with "Play Tone" button
4. Make OPL play middle C for 1 second

**Deliverable:** Button that plays an audible OPL tone.

---

### Phase 1: Basic Audio Engine (2-3 hours) ✅ COMPLETED
**Goal:** Wrap OPL in a simple class that can play notes.

**Implementation:** [Part 2: Core Engine](minimal-prototype/PART2_SUMMARY.md)

**Files to Create:**
- `src/SimpleSynth.ts` - Minimal OPL wrapper
- `src/utils/noteConversion.ts` - Note name to MIDI number

**Code Structure:**

```typescript
// SimpleSynth.ts
import OPL from '@malvineous/opl';

export class SimpleSynth {
  private opl: any;
  private audioContext: AudioContext;
  private scriptNode: ScriptProcessorNode;
  private activeNotes: Set<number> = new Set();

  async init() {
    // Create OPL
    this.opl = await OPL.create();

    // Setup basic instrument (hardcoded for now)
    this.setupDefaultInstrument();

    // Create audio context
    this.audioContext = new AudioContext({ sampleRate: 49716 });

    // Use ScriptProcessorNode (simple, works everywhere)
    this.scriptNode = this.audioContext.createScriptProcessor(4096, 0, 2);
    this.scriptNode.onaudioprocess = (e) => this.fillAudioBuffer(e);
    this.scriptNode.connect(this.audioContext.destination);
  }

  private setupDefaultInstrument() {
    // Write a simple test instrument to OPL registers
    // TODO: Replace with proper instrument loading
    this.opl.write(0x01, 0x20); // Enable waveform selection
    // ... minimal operator setup ...
  }

  noteOn(midiNote: number) {
    // Calculate F-number and block
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
    const { fnum, block } = this.calcFrequency(freq);

    // Write to OPL registers (channel 0 for simplicity)
    this.opl.write(0xA0, fnum & 0xFF);
    this.opl.write(0xB0, 0x20 | (block << 2) | ((fnum >> 8) & 0x03));

    this.activeNotes.add(midiNote);
  }

  noteOff(midiNote: number) {
    // Key off
    this.opl.write(0xB0, 0x00);
    this.activeNotes.delete(midiNote);
  }

  private fillAudioBuffer(event: AudioProcessEvent) {
    const outL = event.outputBuffer.getChannelData(0);
    const outR = event.outputBuffer.getChannelData(1);

    const samples = this.opl.generate(outL.length);

    // Convert Int16 to Float32 and copy
    for (let i = 0; i < outL.length; i++) {
      const sample = samples[i] / 32768.0;
      outL[i] = sample;
      outR[i] = sample;
    }
  }

  private calcFrequency(freq: number) {
    // Convert frequency to OPL F-number and block
    for (let block = 0; block < 8; block++) {
      const fnum = Math.round((freq * Math.pow(2, 20 - block)) / 49716);
      if (fnum < 1024) {
        return { fnum, block };
      }
    }
    return { fnum: 0, block: 0 };
  }

  start() {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  stop() {
    this.audioContext.suspend();
  }
}
```

```typescript
// noteConversion.ts
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function noteNameToMIDI(noteName: string): number | null {
  // Parse "C-4" format
  if (noteName === '---' || noteName === '') return null;

  const match = noteName.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) return null;

  const [, note, octaveStr] = match;
  const octave = parseInt(octaveStr);
  const noteIndex = NOTE_NAMES.indexOf(note.toUpperCase());

  if (noteIndex === -1) return null;

  // MIDI note = (octave + 1) * 12 + noteIndex
  // C4 = 60 in our system
  return (octave + 1) * 12 + noteIndex;
}

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}
```

**Test:** Button that plays C4, D4, E4 in sequence.

---

### Phase 2: Simple Playback Engine (2-3 hours) ✅ COMPLETED
**Goal:** Play a hardcoded pattern with timing.

**Implementation:** [Part 3: Tracker UI](minimal-prototype/PART3_SUMMARY.md)

**Files to Create:**
- `src/SimplePlayer.ts` - Basic sequencer

```typescript
// SimplePlayer.ts
import { SimpleSynth } from './SimpleSynth';
import { noteNameToMIDI } from './utils/noteConversion';

interface TrackerNote {
  note: number | null;
  instrument: number;
}

export class SimplePlayer {
  private synth: SimpleSynth;
  private pattern: TrackerNote[][] = [];
  private bpm: number = 120;
  private stepsPerBeat: number = 4; // 16th notes
  private isPlaying: boolean = false;
  private currentRow: number = 0;
  private intervalId: number | null = null;

  constructor(synth: SimpleSynth) {
    this.synth = synth;
  }

  loadPattern(pattern: TrackerNote[][], bpm: number) {
    this.pattern = pattern;
    this.bpm = bpm;
  }

  play() {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.synth.start();

    // Calculate time per row
    const beatsPerSecond = this.bpm / 60;
    const stepsPerSecond = beatsPerSecond * this.stepsPerBeat;
    const msPerStep = 1000 / stepsPerSecond;

    console.log(`Playing at ${this.bpm} BPM, ${msPerStep.toFixed(2)}ms per row`);

    this.playRow();
    this.intervalId = window.setInterval(() => this.playRow(), msPerStep);
  }

  stop() {
    if (!this.isPlaying) return;

    this.isPlaying = false;

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Stop all notes
    this.synth.stop();
    this.currentRow = 0;
  }

  private playRow() {
    if (this.currentRow >= this.pattern.length) {
      // Loop back to start
      this.currentRow = 0;
      return;
    }

    const row = this.pattern[this.currentRow];

    // Play notes in each track
    row.forEach((trackNote, trackIndex) => {
      if (trackNote.note !== null) {
        console.log(`Row ${this.currentRow}, Track ${trackIndex}: Note ${trackNote.note}`);
        this.synth.noteOn(trackNote.note);

        // Note off after 90% of step duration (simple legato)
        const beatsPerSecond = this.bpm / 60;
        const stepsPerSecond = beatsPerSecond * this.stepsPerBeat;
        const msPerStep = 1000 / stepsPerSecond;

        setTimeout(() => {
          this.synth.noteOff(trackNote.note!);
        }, msPerStep * 0.9);
      }
    });

    this.currentRow++;
  }
}
```

**Test:** Play a hardcoded pattern (C major scale).

---

### Phase 3: Basic UI (2-3 hours) ✅ COMPLETED
**Goal:** Simple tracker grid for entering notes.

**Implementation:** [Part 3: Tracker UI](minimal-prototype/PART3_SUMMARY.md)

**Files to Create:**
- `src/App.tsx` - Main UI
- `src/components/TrackerGrid.tsx` - Note entry grid

```typescript
// TrackerGrid.tsx
interface TrackerGridProps {
  rows: number;
  tracks: number;
  pattern: string[][];  // [row][track] = "C-4" or "---"
  onUpdate: (pattern: string[][]) => void;
}

export function TrackerGrid({ rows, tracks, pattern, onUpdate }: TrackerGridProps) {
  const handleCellChange = (row: number, track: number, value: string) => {
    const newPattern = pattern.map(r => [...r]);
    newPattern[row][track] = value.toUpperCase();
    onUpdate(newPattern);
  };

  return (
    <table className="tracker-grid">
      <thead>
        <tr>
          <th>Row</th>
          {Array.from({ length: tracks }, (_, i) => (
            <th key={i}>Track {i + 1}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, row) => (
          <tr key={row}>
            <td className="row-number">{row.toString().padStart(2, '0')}</td>
            {Array.from({ length: tracks }, (_, track) => (
              <td key={track}>
                <input
                  type="text"
                  value={pattern[row][track]}
                  onChange={(e) => handleCellChange(row, track, e.target.value)}
                  maxLength={3}
                  className="note-input"
                  placeholder="---"
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

```typescript
// App.tsx
import { useState, useEffect } from 'react';
import { TrackerGrid } from './components/TrackerGrid';
import { SimpleSynth } from './SimpleSynth';
import { SimplePlayer } from './SimplePlayer';
import { noteNameToMIDI } from './utils/noteConversion';
import './App.css';

function App() {
  const [synth, setSynth] = useState<SimpleSynth | null>(null);
  const [player, setPlayer] = useState<SimplePlayer | null>(null);
  const [pattern, setPattern] = useState<string[][]>(() =>
    Array(16).fill(null).map(() => Array(4).fill('---'))
  );
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const initAudio = async () => {
      const s = new SimpleSynth();
      await s.init();
      setSynth(s);

      const p = new SimplePlayer(s);
      setPlayer(p);
    };

    initAudio();
  }, []);

  const handlePlay = () => {
    if (!player || !synth) return;

    if (isPlaying) {
      player.stop();
      setIsPlaying(false);
    } else {
      // Convert pattern to internal format
      const trackerPattern = pattern.map(row =>
        row.map(cell => ({
          note: noteNameToMIDI(cell),
          instrument: 0
        }))
      );

      player.loadPattern(trackerPattern, bpm);
      player.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>WebOrchestra - Minimal Tracker</h1>
      </header>

      <div className="controls">
        <button onClick={handlePlay} disabled={!player}>
          {isPlaying ? '⏹ Stop' : '▶ Play'}
        </button>

        <label>
          BPM:
          <input
            type="number"
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value))}
            min={60}
            max={240}
          />
        </label>
      </div>

      <div className="tracker-container">
        <TrackerGrid
          rows={16}
          tracks={4}
          pattern={pattern}
          onUpdate={setPattern}
        />
      </div>

      <div className="help">
        <h3>How to use:</h3>
        <ul>
          <li>Enter notes: C-4, D-4, E-4, etc.</li>
          <li>C-4 = Middle C (MIDI 60)</li>
          <li>Use --- for rests</li>
          <li>16 rows = 1 bar at 16th notes</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
```

```css
/* App.css */
.app {
  padding: 20px;
  font-family: 'Courier New', monospace;
}

.controls {
  margin: 20px 0;
  display: flex;
  gap: 20px;
  align-items: center;
}

button {
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
}

.tracker-container {
  overflow-x: auto;
  margin: 20px 0;
}

.tracker-grid {
  border-collapse: collapse;
  background: #1a1a1a;
  color: #00ff00;
}

.tracker-grid th {
  background: #2a2a2a;
  padding: 8px;
  border: 1px solid #333;
}

.tracker-grid td {
  border: 1px solid #333;
  padding: 2px;
}

.row-number {
  background: #252525;
  text-align: center;
  font-weight: bold;
}

.note-input {
  width: 60px;
  background: transparent;
  border: none;
  color: #00ff00;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  text-align: center;
  text-transform: uppercase;
}

.note-input:focus {
  outline: 2px solid #00ff00;
  background: #2a2a2a;
}

.help {
  margin-top: 30px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 5px;
}
```

**Test:** Type notes into grid, click play, hear them with correct timing.

---

## Minimal File Structure

```
weborchestra-minimal/
├── public/
├── src/
│   ├── components/
│   │   └── TrackerGrid.tsx
│   ├── utils/
│   │   └── noteConversion.ts
│   ├── SimpleSynth.ts
│   ├── SimplePlayer.ts
│   ├── App.tsx
│   ├── App.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

---

## Step-by-Step Setup

### 1. Create Project

```bash
npm create vite@latest weborchestra-minimal -- --template react-ts
cd weborchestra-minimal
npm install
npm install @malvineous/opl
```

### 2. Create Files

Follow the code examples above to create:
- `src/SimpleSynth.ts`
- `src/SimplePlayer.ts`
- `src/utils/noteConversion.ts`
- `src/components/TrackerGrid.tsx`
- `src/App.tsx`
- `src/App.css`

### 3. Test Incrementally

**Test 1: OPL Tone**
- Create button in App.tsx
- Call `synth.noteOn(60)` on click
- Should hear tone

**Test 2: Hardcoded Pattern**
- Create pattern in code: `[[60, null, null, null], [62, null, null, null], ...]`
- Play with SimplePlayer
- Should hear sequence

**Test 3: Tracker Grid**
- Add TrackerGrid component
- Type "C-4" in first cell
- Click play
- Should hear that note

### 4. Debug Common Issues

**No Sound:**
- Check browser console for errors
- Verify AudioContext is not suspended (click to start)
- Check OPL initialization succeeded
- Verify register writes with console.log

**Wrong Timing:**
- Log `msPerStep` calculation
- Verify BPM calculation
- Check if setTimeout is executing

**Wrong Pitch:**
- Log F-number and block values
- Verify MIDI note calculation
- Check noteNameToMIDI function

---

## Research Needed

### Critical Items

1. **OPL3 Instrument Setup**
   - **Question:** What's the absolute minimum register writes for audible tone?
   - **Action:** Test with known good instrument data
   - **Resources:**
     - AdLib Tracker examples
     - DOSBox OPL emulator source
     - Test with single operator (simplest case)

2. **Register Offsets**
   - **Question:** Exact register addresses for channel 0?
   - **Action:** Study OPL3 register map carefully
   - **Resources:**
     - YMF262 datasheet
     - ModdingWiki OPL reference

3. **@malvineous/opl API**
   - **Question:** What sample format does generate() return?
   - **Action:** Test and log sample data
   - **Test Code:**
     ```typescript
     const samples = opl.generate(100);
     console.log('Type:', samples.constructor.name);
     console.log('First samples:', samples.slice(0, 10));
     ```

### Nice-to-Have

4. **Better Instrument**
   - Start with sine wave (simplest)
   - Add piano sound later
   - Test different waveforms (0-7)

5. **Polyphony**
   - MVP: 4 voices (one per track)
   - Each track uses a different channel
   - Voice allocation can come later

---

## Success Criteria (MVP)

✅ **Minimal prototype is successful if:**
1. Can hear OPL sound in browser
2. Can enter notes in tracker grid (C-4 format)
3. Can play pattern with play/stop button
4. Timing is approximately correct (doesn't have to be perfect)
5. Can change BPM
6. 4 simultaneous notes work

---

## What to Build Next (After MVP Works)

### Iteration 1: Better Instrument
- Load one good OPL patch
- Proper register programming
- Better sound quality

### Iteration 2: Better Timing
- Replace setTimeout with requestAnimationFrame
- Look-ahead scheduling
- More accurate timing

### Iteration 3: More Features
- Multiple patterns
- Pattern length adjustment
- Note velocity
- Instrument selection (2-3 instruments)

### Iteration 4: Better UI
- Keyboard navigation in tracker
- Copy/paste
- Undo/redo
- Current row highlighting

### Iteration 5: Export
- WAV export
- Save/load as JSON

Then proceed to full implementation plan!

---

## Time Estimate vs Actual

| Phase | Task | Estimated | Status |
|-------|------|-----------|---------|
| 0 | Proof of concept (single tone) | 1-2 hours | ✅ DONE |
| 1 | Basic audio engine | 2-3 hours | ✅ DONE |
| 2 | Simple playback | 2-3 hours | ✅ DONE |
| 3 | Tracker UI | 2-3 hours | ✅ DONE |
| Debug | Getting it all working | 2-4 hours | ✅ DONE |
| **Total** | **Phases 0-3** | **9-15 hours** | **✅ COMPLETE** |

**Actual implementation:** All phases completed successfully over 2 days.

---

## Implementation Status

### ✅ Completed Phases

- **Phase 0: Proof of Concept** - OPL3 tone playback working ([Part 1](minimal-prototype/IMPLEMENTATION_NOTES.md))
- **Phase 1: Basic Audio Engine** - SimpleSynth class with 9-channel polyphony ([Part 2](minimal-prototype/PART2_SUMMARY.md))
- **Phase 2: Simple Playback Engine** - SimplePlayer with BPM-based timing ([Part 3](minimal-prototype/PART3_SUMMARY.md))
- **Phase 3: Basic UI** - TrackerGrid with keyboard navigation ([Part 3](minimal-prototype/PART3_SUMMARY.md))

### 🎉 MVP Complete!

The minimal prototype is **fully functional** with:
- ✅ 16 rows × 4 tracks editable grid
- ✅ Real-time pattern playback with correct timing
- ✅ BPM control (60-240)
- ✅ Keyboard navigation (arrows, enter, tab, delete)
- ✅ Visual row highlighting during playback
- ✅ 9-channel polyphony (4 tracks playing simultaneously)

**Try it:** `cd minimal-prototype && npm run dev`

### Next Steps

**Part 4: Polish (Optional enhancements)**
- [ ] Pattern validation (highlight invalid notes)
- [ ] Keyboard shortcuts (Space = play/stop, Escape = stop)
- [ ] Better error handling and loading states
- [ ] Visual feedback improvements
- [ ] Mobile responsiveness

**Goal achieved:** Core OPL synthesis technology proven and working!

---

## Reference: Minimal Hardcoded Instrument

If you need a working instrument to start, here's a very simple one:

```typescript
private setupDefaultInstrument() {
  const channel = 0;

  // Enable waveform selection
  this.opl.write(0x01, 0x20);

  // Modulator (operator 0)
  this.opl.write(0x20 + 0, 0x21); // MULT=1, sustain mode
  this.opl.write(0x40 + 0, 0x10); // Output level (volume)
  this.opl.write(0x60 + 0, 0xF5); // Attack=fast, Decay=medium
  this.opl.write(0x80 + 0, 0x77); // Sustain=medium, Release=medium
  this.opl.write(0xE0 + 0, 0x00); // Waveform=sine

  // Carrier (operator 1)
  this.opl.write(0x20 + 3, 0x21); // MULT=1, sustain mode
  this.opl.write(0x40 + 3, 0x00); // Output level (full volume)
  this.opl.write(0x60 + 3, 0xF5); // Attack=fast, Decay=medium
  this.opl.write(0x80 + 3, 0x77); // Sustain=medium, Release=medium
  this.opl.write(0xE0 + 3, 0x00); // Waveform=sine

  // Channel configuration
  this.opl.write(0xC0 + 0, 0x01); // Feedback=0, Additive synthesis
}
```

This should produce a simple sine-ish tone. Not pretty, but audible!

---

*Start here, then expand to the full implementation once the core tech is proven!*
