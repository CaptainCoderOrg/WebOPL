# Part 2: Core Engine - SimpleSynth & Note Conversion

## Objective

Build reusable audio engine components that handle multiple simultaneous notes and convert between note names and MIDI numbers.

**Time Estimate:** 1.5-2 hours

**Prerequisites:**
- ✅ Part 1 completed successfully
- ✅ Can hear OPL tone in browser

**Success Criteria:**
- ✅ SimpleSynth class works independently
- ✅ Can play single notes on command
- ✅ Can play chords (3+ simultaneous notes)
- ✅ Can play scales (sequence of notes)
- ✅ Note conversion works ("C-4" ↔ MIDI 60)

---

## What We're Building

### Components

1. **SimpleSynth Class** - Manages OPL3 and audio output
   - Initializes OPL + Web Audio
   - Supports 9 simultaneous voices
   - Note on/off methods
   - Channel management

2. **Note Conversion Utilities** - Converts note formats
   - "C-4" → MIDI 60
   - MIDI 60 → "C-4"
   - Validation and formatting

### Architecture

```
┌─────────────────────────────────┐
│  App.tsx (Test Buttons)         │
└───────────┬─────────────────────┘
            │
┌───────────▼─────────────────────┐
│  SimpleSynth                    │
│  - init()                       │
│  - noteOn(channel, midi)        │
│  - noteOff(channel, midi)       │
│  - allNotesOff()                │
└───────────┬─────────────────────┘
            │
┌───────────▼─────────────────────┐
│  OPL3 Emulator + Web Audio      │
└─────────────────────────────────┘
```

---

## Step-by-Step Implementation

### Step 1: Create Project Structure

**Create directories:**

```bash
cd minimal-prototype
mkdir -p src/utils
```

**Verify structure:**
```
src/
├── App.tsx
├── App.css
├── main.tsx
├── index.css
└── utils/          ← New
```

---

### Step 2: Create Note Conversion Utilities

**File:** `src/utils/noteConversion.ts`

**Full Code:**

```typescript
/**
 * Note Conversion Utilities
 *
 * Converts between note names (C-4, D#5) and MIDI numbers (0-127)
 * Format: "C-4" = Middle C = MIDI 60
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_FLAT = ['C', 'DB', 'D', 'EB', 'E', 'F', 'GB', 'G', 'AB', 'A', 'BB', 'B'];

/**
 * Convert note name to MIDI number
 * @param noteName - Format: "C-4", "C#4", "D-5", etc.
 * @returns MIDI note number (0-127) or null if invalid
 *
 * Examples:
 *   "C-4" → 60 (middle C)
 *   "A-4" → 69 (A440)
 *   "C-5" → 72 (one octave above middle C)
 *   "---" → null (rest)
 */
export function noteNameToMIDI(noteName: string): number | null {
  // Handle empty or rest notation
  if (!noteName || noteName === '---' || noteName === '...' || noteName.trim() === '') {
    return null;
  }

  // Normalize: trim whitespace and convert to uppercase
  noteName = noteName.trim().toUpperCase();

  // Parse note format: "C-4" or "C#4" or "C4"
  // Regex: ([A-G][#B]?) = note name with optional sharp/flat
  //        [-]? = optional dash
  //        (\d+) = octave number
  const match = noteName.match(/^([A-G][#B]?)[-]?(\d+)$/);

  if (!match) {
    console.warn('[noteConversion] Invalid note format:', noteName);
    return null;
  }

  const [, note, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);

  // Find note index (0-11) within octave
  let noteIndex = NOTE_NAMES.indexOf(note);

  if (noteIndex === -1) {
    // Try flat notation (Db, Eb, etc.)
    noteIndex = NOTE_NAMES_FLAT.indexOf(note);
  }

  if (noteIndex === -1) {
    console.warn('[noteConversion] Invalid note name:', note);
    return null;
  }

  // Calculate MIDI number
  // Formula: MIDI = (octave + 1) * 12 + noteIndex
  // C-4 = (4 + 1) * 12 + 0 = 60
  const midiNote = (octave + 1) * 12 + noteIndex;

  // Validate MIDI range (0-127)
  if (midiNote < 0 || midiNote > 127) {
    console.warn('[noteConversion] MIDI note out of range:', midiNote);
    return null;
  }

  return midiNote;
}

/**
 * Convert MIDI number to note name
 * @param midiNote - MIDI note number (0-127)
 * @returns Note name in "C-4" format
 *
 * Examples:
 *   60 → "C-4"
 *   69 → "A-4"
 *   72 → "C-5"
 */
export function midiToNoteName(midiNote: number): string {
  // Validate range
  if (midiNote < 0 || midiNote > 127) {
    return '---';
  }

  // Calculate octave and note index
  const octave = Math.floor(midiNote / 12) - 1;
  const noteIndex = midiNote % 12;
  const noteName = NOTE_NAMES[noteIndex];

  return `${noteName}-${octave}`;
}

/**
 * Validate note name format
 * @param noteName - Note name to validate
 * @returns True if valid note or rest
 */
export function isValidNoteName(noteName: string): boolean {
  if (!noteName || noteName === '---' || noteName === '...') {
    return true; // Rest is valid
  }

  return noteNameToMIDI(noteName) !== null;
}

/**
 * Format note name to consistent format
 * @param noteName - Note name to format
 * @returns Formatted note name or "---" if invalid
 */
export function formatNoteName(noteName: string): string {
  const midi = noteNameToMIDI(noteName);
  if (midi === null) return '---';
  return midiToNoteName(midi);
}
```

**Test the conversion utilities:**

Create `src/utils/noteConversion.test.ts`:

```typescript
import { noteNameToMIDI, midiToNoteName, isValidNoteName } from './noteConversion';

/**
 * Simple console-based test suite
 */
export function testNoteConversion(): void {
  console.log('=== Note Conversion Tests ===');

  const tests = [
    // [input, expected MIDI]
    ['C-4', 60],
    ['C4', 60],   // Without dash
    ['A-4', 69],  // A440
    ['C-5', 72],  // One octave up
    ['C#4', 61],  // Sharp
    ['C#-4', 61], // Sharp with dash
    ['D-4', 62],
    ['E-4', 64],
    ['F-4', 65],
    ['G-4', 67],
    ['A-4', 69],
    ['B-4', 71],
    ['---', null], // Rest
    ['', null],    // Empty
    ['C-0', 12],   // Low note
    ['G-9', 127],  // High note
    ['X-4', null], // Invalid note
    ['C-99', null], // Invalid octave
  ];

  let passed = 0;
  let failed = 0;

  tests.forEach(([input, expected]) => {
    const result = noteNameToMIDI(input);
    const pass = result === expected;

    if (pass) {
      console.log(`✅ "${input}" → ${result}`);
      passed++;
    } else {
      console.error(`❌ "${input}" → ${result} (expected ${expected})`);
      failed++;
    }
  });

  console.log('\n--- Reverse Conversion Tests ---');

  // Test MIDI to note name
  const reverseTests = [
    [60, 'C-4'],
    [69, 'A-4'],
    [72, 'C-5'],
    [0, 'C--1'],
    [127, 'G-9'],
  ];

  reverseTests.forEach(([midi, expected]) => {
    const result = midiToNoteName(midi);
    const pass = result === expected;

    if (pass) {
      console.log(`✅ ${midi} → "${result}"`);
      passed++;
    } else {
      console.error(`❌ ${midi} → "${result}" (expected "${expected}")`);
      failed++;
    }
  });

  console.log('\n--- Validation Tests ---');

  const validationTests = [
    ['C-4', true],
    ['---', true],
    ['X-4', false],
    ['C-99', false],
  ];

  validationTests.forEach(([input, expected]) => {
    const result = isValidNoteName(input);
    const pass = result === expected;

    if (pass) {
      console.log(`✅ isValid("${input}") = ${result}`);
      passed++;
    } else {
      console.error(`❌ isValid("${input}") = ${result} (expected ${expected})`);
      failed++;
    }
  });

  console.log(`\n=== Test Results: ${passed} passed, ${failed} failed ===`);
}
```

---

### Step 3: Create SimpleSynth Class

**File:** `src/SimpleSynth.ts`

**Full Code:**

```typescript
/**
 * SimpleSynth - OPL3 Synthesizer Wrapper
 *
 * Manages OPL3 instance and Web Audio API integration.
 * Supports 9 simultaneous voices (channels 0-8).
 */

export class SimpleSynth {
  private opl: any = null;
  private audioContext: AudioContext | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private activeChannels: Map<number, number> = new Map(); // channel → MIDI note
  private isInitialized: boolean = false;

  /**
   * Initialize OPL3 and Web Audio
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      console.warn('[SimpleSynth] Already initialized');
      return;
    }

    console.log('[SimpleSynth] Initializing...');

    try {
      // Import OPL module
      console.log('[SimpleSynth] Loading OPL module...');
      const OPL = (await import('@malvineous/opl')).default;
      this.opl = await OPL.create();
      console.log('[SimpleSynth] ✅ OPL instance created');

      // Enable waveform selection
      this.opl.write(0x01, 0x20);

      // Setup default instrument on all 9 channels
      console.log('[SimpleSynth] Programming default instrument...');
      for (let channel = 0; channel < 9; channel++) {
        this.setupDefaultInstrument(channel);
      }
      console.log('[SimpleSynth] ✅ Instruments programmed');

      // Create AudioContext
      this.audioContext = new AudioContext({ sampleRate: 49716 });
      console.log('[SimpleSynth] ✅ AudioContext created');
      console.log('[SimpleSynth]    Sample rate:', this.audioContext.sampleRate);

      // Create ScriptProcessorNode
      const bufferSize = 4096;
      this.scriptNode = this.audioContext.createScriptProcessor(bufferSize, 0, 2);
      this.scriptNode.onaudioprocess = this.processAudio.bind(this);
      this.scriptNode.connect(this.audioContext.destination);
      console.log('[SimpleSynth] ✅ Audio processor connected');

      this.isInitialized = true;
      console.log('[SimpleSynth] Initialization complete!');
    } catch (error) {
      console.error('[SimpleSynth] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Setup a basic instrument on a channel
   * Uses hardcoded values for a simple sine-ish tone
   */
  private setupDefaultInstrument(channel: number): void {
    if (!this.opl) return;

    // Operator offsets for each channel (irregular pattern!)
    const operatorOffsets = [
      [0x00, 0x03], // Channel 0: modulator at 0x00, carrier at 0x03
      [0x01, 0x04], // Channel 1
      [0x02, 0x05], // Channel 2
      [0x08, 0x0B], // Channel 3
      [0x09, 0x0C], // Channel 4
      [0x0A, 0x0D], // Channel 5
      [0x10, 0x13], // Channel 6
      [0x11, 0x14], // Channel 7
      [0x12, 0x15], // Channel 8
    ];

    const [modOffset, carOffset] = operatorOffsets[channel];

    // Modulator (operator 0)
    this.opl.write(0x20 + modOffset, 0x01); // MULT=1
    this.opl.write(0x40 + modOffset, 0x10); // Output level (0x10 = moderate)
    this.opl.write(0x60 + modOffset, 0xF5); // Attack=15 (fast), Decay=5
    this.opl.write(0x80 + modOffset, 0x77); // Sustain=7, Release=7
    this.opl.write(0xE0 + modOffset, 0x00); // Waveform=sine

    // Carrier (operator 1)
    this.opl.write(0x20 + carOffset, 0x01); // MULT=1
    this.opl.write(0x40 + carOffset, 0x00); // Output level (0x00 = full volume)
    this.opl.write(0x60 + carOffset, 0xF5); // Attack=15, Decay=5
    this.opl.write(0x80 + carOffset, 0x77); // Sustain=7, Release=7
    this.opl.write(0xE0 + carOffset, 0x00); // Waveform=sine

    // Channel settings (feedback + connection)
    this.opl.write(0xC0 + channel, 0x01); // Feedback=0, Additive synthesis
  }

  /**
   * Audio processing callback (runs on audio thread)
   */
  private processAudio(event: AudioProcessingEvent): void {
    if (!this.opl) return;

    const outputL = event.outputBuffer.getChannelData(0);
    const outputR = event.outputBuffer.getChannelData(1);
    const numSamples = outputL.length;

    // Generate samples from OPL
    const samples = this.opl.generate(numSamples);

    // Convert and copy to output buffers
    for (let i = 0; i < numSamples; i++) {
      const sample = samples instanceof Int16Array
        ? samples[i] / 32768.0
        : samples[i];

      outputL[i] = sample;
      outputR[i] = sample;
    }
  }

  /**
   * Play a note on a specific channel
   * @param channel - Channel number (0-8)
   * @param midiNote - MIDI note number (0-127)
   * @param velocity - Note velocity (0-127, currently unused)
   */
  noteOn(channel: number, midiNote: number, velocity: number = 100): void {
    if (!this.opl || !this.isInitialized) {
      console.error('[SimpleSynth] Not initialized');
      return;
    }

    if (channel < 0 || channel >= 9) {
      console.error('[SimpleSynth] Invalid channel:', channel, '(must be 0-8)');
      return;
    }

    if (midiNote < 0 || midiNote > 127) {
      console.error('[SimpleSynth] Invalid MIDI note:', midiNote);
      return;
    }

    // Convert MIDI note to frequency
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

    // Calculate F-number and block
    const { fnum, block } = this.calculateFNum(freq);

    console.log(`[SimpleSynth] Note ON: ch=${channel}, midi=${midiNote}, freq=${freq.toFixed(2)}Hz, fnum=${fnum}, block=${block}`);

    // Write frequency registers
    this.opl.write(0xA0 + channel, fnum & 0xFF); // F-number low 8 bits

    // Write key-on + block + F-number high 2 bits
    const keyOnByte = 0x20 | ((block & 0x07) << 2) | ((fnum >> 8) & 0x03);
    this.opl.write(0xB0 + channel, keyOnByte);

    // Track active note
    this.activeChannels.set(channel, midiNote);
  }

  /**
   * Stop a note on a specific channel
   * @param channel - Channel number (0-8)
   * @param midiNote - MIDI note number (for verification)
   */
  noteOff(channel: number, midiNote: number): void {
    if (!this.opl || !this.isInitialized) return;

    if (channel < 0 || channel >= 9) return;

    // Verify this note is playing on this channel
    if (this.activeChannels.get(channel) === midiNote) {
      console.log(`[SimpleSynth] Note OFF: ch=${channel}, midi=${midiNote}`);

      // Key off (clear key-on bit)
      this.opl.write(0xB0 + channel, 0x00);

      // Remove from active channels
      this.activeChannels.delete(channel);
    }
  }

  /**
   * Stop all notes on all channels
   */
  allNotesOff(): void {
    if (!this.opl) return;

    console.log('[SimpleSynth] All notes off');

    for (let channel = 0; channel < 9; channel++) {
      this.opl.write(0xB0 + channel, 0x00);
    }

    this.activeChannels.clear();
  }

  /**
   * Calculate F-number and block for a frequency
   * @param freq - Frequency in Hz
   * @returns Object with fnum (0-1023) and block (0-7)
   */
  private calculateFNum(freq: number): { fnum: number; block: number } {
    // Try each block from 0 to 7
    for (let block = 0; block < 8; block++) {
      const fnum = Math.round((freq * Math.pow(2, 20 - block)) / 49716);

      // F-number must be in range 0-1023
      if (fnum >= 0 && fnum < 1024) {
        return { fnum, block };
      }
    }

    // Fallback (shouldn't happen for valid MIDI notes)
    console.warn('[SimpleSynth] Could not calculate F-number for frequency:', freq);
    return { fnum: 0, block: 0 };
  }

  /**
   * Start audio playback (resume AudioContext)
   */
  start(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      console.log('[SimpleSynth] Resuming AudioContext');
      this.audioContext.resume();
    }
  }

  /**
   * Stop audio playback (suspend AudioContext)
   */
  stop(): void {
    if (this.audioContext && this.audioContext.state === 'running') {
      console.log('[SimpleSynth] Suspending AudioContext');
      this.audioContext.suspend();
      this.allNotesOff();
    }
  }

  /**
   * Check if initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get number of active notes
   */
  getActiveNoteCount(): number {
    return this.activeChannels.size;
  }
}
```

---

### Step 4: Create Test App

**File:** `src/App.tsx` (completely replace previous version)

```typescript
import { useState, useEffect } from 'react';
import { SimpleSynth } from './SimpleSynth';
import { noteNameToMIDI, testNoteConversion } from './utils/noteConversion';
import './App.css';

function App() {
  const [synth, setSynth] = useState<SimpleSynth | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initSynth = async () => {
      try {
        console.log('=== Initializing SimpleSynth ===');

        // Run note conversion tests
        testNoteConversion();

        // Initialize synthesizer
        const s = new SimpleSynth();
        await s.init();
        setSynth(s);
        setIsReady(true);

        console.log('=== Ready to Play! ===');
      } catch (err) {
        console.error('Failed to initialize:', err);
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    initSynth();
  }, []);

  // Test 1: Single note
  const playSingleNote = () => {
    if (!synth) return;

    console.log('--- Test: Single Note ---');
    synth.start();

    // Play middle C for 1 second
    const midiNote = noteNameToMIDI('C-4')!;
    synth.noteOn(0, midiNote);

    setTimeout(() => {
      synth.noteOff(0, midiNote);
    }, 1000);
  };

  // Test 2: Chord (3 simultaneous notes)
  const playChord = () => {
    if (!synth) return;

    console.log('--- Test: C Major Chord ---');
    synth.start();

    // C major chord: C E G
    const notes = ['C-4', 'E-4', 'G-4'];
    const midiNotes = notes.map(n => noteNameToMIDI(n)!);

    // Play on channels 0, 1, 2
    midiNotes.forEach((midi, channel) => {
      synth.noteOn(channel, midi);
    });

    // Release after 2 seconds
    setTimeout(() => {
      midiNotes.forEach((midi, channel) => {
        synth.noteOff(channel, midi);
      });
    }, 2000);
  };

  // Test 3: Scale (sequence of notes)
  const playScale = () => {
    if (!synth) return;

    console.log('--- Test: C Major Scale ---');
    synth.start();

    // C major scale
    const notes = ['C-4', 'D-4', 'E-4', 'F-4', 'G-4', 'A-4', 'B-4', 'C-5'];
    const midiNotes = notes.map(n => noteNameToMIDI(n)!);

    // Play each note sequentially
    midiNotes.forEach((midi, i) => {
      setTimeout(() => {
        synth.noteOn(0, midi);

        setTimeout(() => {
          synth.noteOff(0, midi);
        }, 400); // Note duration
      }, i * 500); // Delay between notes
    });
  };

  // Test 4: Arpeggio (fast sequence)
  const playArpeggio = () => {
    if (!synth) return;

    console.log('--- Test: Arpeggio ---');
    synth.start();

    // C major arpeggio (repeating)
    const pattern = ['C-4', 'E-4', 'G-4', 'C-5', 'G-4', 'E-4'];
    const midiNotes = pattern.map(n => noteNameToMIDI(n)!);

    midiNotes.forEach((midi, i) => {
      setTimeout(() => {
        synth.noteOn(0, midi);

        setTimeout(() => {
          synth.noteOff(0, midi);
        }, 180); // Short note
      }, i * 200); // Fast tempo
    });
  };

  // Test 5: Polyphonic (multiple tracks)
  const playPolyphonic = () => {
    if (!synth) return;

    console.log('--- Test: Polyphonic Sequence ---');
    synth.start();

    // Track 1: Melody
    const melody = ['C-4', 'E-4', 'G-4', 'E-4'];
    const melodyMidi = melody.map(n => noteNameToMIDI(n)!);

    melodyMidi.forEach((midi, i) => {
      setTimeout(() => {
        synth.noteOn(0, midi);
        setTimeout(() => synth.noteOff(0, midi), 400);
      }, i * 500);
    });

    // Track 2: Bass (plays simultaneously)
    const bass = ['C-3', 'C-3', 'G-3', 'G-3'];
    const bassMidi = bass.map(n => noteNameToMIDI(n)!);

    bassMidi.forEach((midi, i) => {
      setTimeout(() => {
        synth.noteOn(1, midi);
        setTimeout(() => synth.noteOff(1, midi), 400);
      }, i * 500);
    });
  };

  return (
    <div className="app">
      <h1>🎵 SimpleSynth Test Suite</h1>

      <div className="status-section">
        <div className="status">
          <strong>Status:</strong>{' '}
          {error ? (
            <span style={{ color: '#ff4444' }}>❌ Error</span>
          ) : isReady ? (
            <span style={{ color: '#44ff44' }}>✅ Ready</span>
          ) : (
            <span style={{ color: '#ffaa00' }}>⏳ Initializing...</span>
          )}
        </div>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      <div className="test-section">
        <h3>Audio Tests:</h3>

        <div className="test-grid">
          <div className="test-card">
            <h4>Test 1: Single Note</h4>
            <p>Plays middle C for 1 second</p>
            <button onClick={playSingleNote} disabled={!isReady}>
              Play Single Note
            </button>
          </div>

          <div className="test-card">
            <h4>Test 2: Chord</h4>
            <p>C major chord (3 simultaneous notes)</p>
            <button onClick={playChord} disabled={!isReady}>
              Play Chord
            </button>
          </div>

          <div className="test-card">
            <h4>Test 3: Scale</h4>
            <p>C major scale (8 notes)</p>
            <button onClick={playScale} disabled={!isReady}>
              Play Scale
            </button>
          </div>

          <div className="test-card">
            <h4>Test 4: Arpeggio</h4>
            <p>Fast repeating pattern</p>
            <button onClick={playArpeggio} disabled={!isReady}>
              Play Arpeggio
            </button>
          </div>

          <div className="test-card">
            <h4>Test 5: Polyphonic</h4>
            <p>Melody + Bass simultaneously</p>
            <button onClick={playPolyphonic} disabled={!isReady}>
              Play Polyphonic
            </button>
          </div>
        </div>
      </div>

      <div className="instructions">
        <h3>Instructions:</h3>
        <ol>
          <li>Wait for ✅ Ready status</li>
          <li>Click any test button to hear audio</li>
          <li>Check browser console (F12) for detailed logs</li>
        </ol>

        <h4>What each test proves:</h4>
        <ul>
          <li><strong>Single Note:</strong> Basic note on/off works</li>
          <li><strong>Chord:</strong> Multiple simultaneous voices work</li>
          <li><strong>Scale:</strong> Sequential notes work</li>
          <li><strong>Arpeggio:</strong> Fast timing works</li>
          <li><strong>Polyphonic:</strong> Multiple tracks work</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
```

---

### Step 5: Update Styling

**File:** `src/App.css` (add to existing)

```css
.test-section {
  margin: 30px 0;
}

.test-section h3 {
  color: #00ff00;
  margin-bottom: 20px;
}

.test-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.test-card {
  padding: 20px;
  background-color: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  transition: border-color 0.2s;
}

.test-card:hover {
  border-color: #00aa00;
}

.test-card h4 {
  margin: 0 0 10px 0;
  color: #ffaa00;
}

.test-card p {
  margin: 0 0 15px 0;
  font-size: 14px;
  color: #aaa;
}

.test-card button {
  width: 100%;
  padding: 10px;
  font-size: 14px;
  background-color: #00aa00;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.test-card button:hover:not(:disabled) {
  background-color: #00cc00;
}

.test-card button:disabled {
  background-color: #333;
  color: #666;
  cursor: not-allowed;
}

.instructions h4 {
  color: #ffaa00;
  margin-top: 20px;
}

.instructions ul {
  margin-top: 10px;
}

.instructions li {
  margin: 8px 0;
}
```

---

### Step 6: Run and Test

**Commands:**

```bash
npm run dev
```

**Testing Checklist:**

1. **Page loads:**
   - [ ] See "🎵 SimpleSynth Test Suite" heading
   - [ ] Status shows "⏳ Initializing..."
   - [ ] Check console for initialization logs
   - [ ] Status changes to "✅ Ready"
   - [ ] All 5 test buttons appear

2. **Test 1 - Single Note:**
   - [ ] Click "Play Single Note"
   - [ ] Hear 1-second tone (middle C)
   - [ ] Tone stops cleanly
   - [ ] Console shows: "Note ON: ch=0, midi=60..."
   - [ ] Console shows: "Note OFF: ch=0, midi=60"

3. **Test 2 - Chord:**
   - [ ] Click "Play Chord"
   - [ ] Hear 3 simultaneous tones (sounds like a chord)
   - [ ] Lasts 2 seconds
   - [ ] Console shows 3 "Note ON" messages (channels 0, 1, 2)
   - [ ] Console shows 3 "Note OFF" messages

4. **Test 3 - Scale:**
   - [ ] Click "Play Scale"
   - [ ] Hear 8 notes in sequence (C D E F G A B C)
   - [ ] Notes sound smooth, no overlap
   - [ ] Takes ~4 seconds total
   - [ ] Console shows 8 note on/off pairs

5. **Test 4 - Arpeggio:**
   - [ ] Click "Play Arpeggio"
   - [ ] Hear fast repeating pattern (C E G C G E)
   - [ ] Notes are shorter and faster
   - [ ] Takes ~1.2 seconds total

6. **Test 5 - Polyphonic:**
   - [ ] Click "Play Polyphonic"
   - [ ] Hear melody AND bass simultaneously
   - [ ] Two distinct pitches playing together
   - [ ] Console shows notes on channels 0 and 1

**Note Conversion Tests:**

Check console on page load for:
```
=== Note Conversion Tests ===
✅ "C-4" → 60
✅ "C4" → 60
✅ "A-4" → 69
... (should see all ✅)
=== Test Results: X passed, 0 failed ===
```

---

## Success Criteria

✅ **Part 2 is complete when:**

1. ✅ SimpleSynth class initializes without errors
2. ✅ Note conversion tests all pass (0 failures)
3. ✅ Test 1: Can play single note
4. ✅ Test 2: Can play chord (3 simultaneous notes)
5. ✅ Test 3: Can play scale (sequential notes)
6. ✅ Test 4: Can play fast arpeggio
7. ✅ Test 5: Can play multiple tracks simultaneously
8. ✅ All notes sound correct (right pitch)
9. ✅ Notes stop cleanly (no hanging tones)
10. ✅ Console logs show correct note on/off messages
11. ✅ Can click multiple test buttons without errors

---

## Troubleshooting

### Problem: Chord sounds like single note

**Cause:** Multiple notes on same channel

**Check:** Console logs should show different channels:
```
Note ON: ch=0, midi=60...
Note ON: ch=1, midi=64...
Note ON: ch=2, midi=67...
```

**If all show ch=0:** Check noteOn calls pass different channel numbers

---

### Problem: Notes don't stop

**Cause:** Note off not being called or wrong channel

**Debug:**
- Check setTimeout executes
- Verify channel matches note on
- Check activeChannels map

**Fix:** Ensure noteOff uses same channel as noteOn

---

### Problem: Scale notes overlap

**Cause:** Note off timing

**Fix:** Adjust note duration (currently 400ms with 500ms spacing = 100ms gap)

---

### Problem: Polyphonic test sounds monophonic

**Cause:** Notes on same channel, voice stealing

**Verify:** Console should show both ch=0 and ch=1

---

## What We Proved

If all tests pass:
- ✅ SimpleSynth class is reusable
- ✅ Can control 9 independent voices
- ✅ Note on/off works reliably
- ✅ Timing is accurate
- ✅ Multiple simultaneous notes work
- ✅ Note conversion utilities work
- ✅ **Ready to build playback engine on top**

---

## Next Steps

**After Part 2 succeeds:**
→ Proceed to **Part 3: Tracker UI** (Pattern player, grid interface)

---

## Files Created

```
minimal-prototype/
├── src/
│   ├── SimpleSynth.ts                 ← New (core engine)
│   ├── utils/
│   │   ├── noteConversion.ts          ← New (utilities)
│   │   └── noteConversion.test.ts     ← New (tests)
│   ├── App.tsx                         ← Updated (test suite)
│   └── App.css                         ← Updated (test grid)
```

**Total New Lines:** ~600 lines

---

## Time Log

| Task | Estimated | Actual |
|------|-----------|--------|
| Note conversion utils | 20 min | ___ |
| SimpleSynth class | 40 min | ___ |
| Test app | 20 min | ___ |
| Testing and debugging | 30 min | ___ |
| **TOTAL** | **~2 hours** | ___ |

---

**With Part 2 complete, you have a solid audio engine! Next: build the player and UI on top.** 🎸
