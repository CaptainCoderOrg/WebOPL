# Part 3: Tracker UI - Player & Grid Interface

## Objective

Build the tracker interface: a playback engine that schedules patterns, and an editable grid for entering notes.

**Time Estimate:** 2-3 hours

**Prerequisites:**
- ✅ Part 1 completed (OPL tone works)
- ✅ Part 2 completed (SimpleSynth + note conversion)

**Success Criteria:**
- ✅ Can play hardcoded pattern with correct timing
- ✅ Can edit notes in tracker grid
- ✅ Pattern plays what's in the grid
- ✅ Playback controls work (play/stop)
- ✅ Current row highlights during playback
- ✅ BPM control works

---

## What We're Building

### Components

1. **SimplePlayer Class** - Pattern playback engine
   - Loads tracker patterns
   - Schedules note events with `setInterval`
   - Manages playback state (playing/stopped)
   - Current row tracking

2. **TrackerGrid Component** - Note entry interface
   - 16 rows × 4 tracks grid
   - Text input cells ("C-4", "D-4", etc.)
   - Keyboard navigation (arrows, enter, tab)
   - Current row highlighting

3. **App Integration**
   - Play/Stop button
   - BPM control
   - Load example pattern
   - Clear pattern

### Architecture

```
┌─────────────────────────────────┐
│  App.tsx                        │
│  - Pattern state                │
│  - Play/Stop logic              │
│  - BPM control                  │
└───────────┬─────────────────────┘
            │
   ┌────────┴────────┐
   │                 │
┌──▼──────────┐  ┌──▼──────────┐
│ TrackerGrid │  │SimplePlayer │
│ - Edit UI   │  │ - Timing    │
│ - Input     │  │ - Schedule  │
└─────────────┘  └──┬──────────┘
                    │
              ┌─────▼─────┐
              │SimpleSynth│
              └───────────┘
```

---

## Step-by-Step Implementation

### Step 1: Create SimplePlayer Class

**File:** `src/SimplePlayer.ts`

**Full Code:**

```typescript
/**
 * SimplePlayer - Basic tracker pattern playback engine
 *
 * Plays tracker patterns using simple setTimeout scheduling.
 * Good enough for prototype, will be replaced with Tone.js later.
 */

import { SimpleSynth } from './SimpleSynth';

/**
 * Single note in a track
 */
export interface TrackerNote {
  note: number | null;    // MIDI note number, null = rest
  instrument: number;     // Instrument ID (unused for now)
}

/**
 * Complete pattern data
 */
export interface TrackerPattern {
  rows: TrackerNote[][];  // [row][track] - grid of notes
  bpm: number;            // Beats per minute
  stepsPerBeat: number;   // Rows per beat (4 = 16th notes)
}

export class SimplePlayer {
  private synth: SimpleSynth;
  private pattern: TrackerPattern | null = null;
  private isPlaying: boolean = false;
  private currentRow: number = 0;
  private intervalId: number | null = null;
  private onRowChange?: (row: number) => void;

  constructor(synth: SimpleSynth) {
    this.synth = synth;
  }

  /**
   * Load a pattern for playback
   */
  loadPattern(pattern: TrackerPattern): void {
    console.log('[SimplePlayer] Loading pattern...');
    console.log('[SimplePlayer]   Rows:', pattern.rows.length);
    console.log('[SimplePlayer]   Tracks:', pattern.rows[0]?.length || 0);
    console.log('[SimplePlayer]   BPM:', pattern.bpm);

    this.pattern = pattern;
  }

  /**
   * Start playback
   */
  play(): void {
    if (this.isPlaying) {
      console.warn('[SimplePlayer] Already playing');
      return;
    }

    if (!this.pattern) {
      console.error('[SimplePlayer] No pattern loaded');
      return;
    }

    console.log('[SimplePlayer] ▶ Starting playback');

    this.isPlaying = true;
    this.synth.start();

    // Calculate timing
    const msPerRow = this.calculateMsPerRow();
    console.log(`[SimplePlayer] Timing: ${msPerRow.toFixed(2)}ms per row at ${this.pattern.bpm} BPM`);

    // Play first row immediately
    this.playRow();

    // Schedule subsequent rows
    this.intervalId = window.setInterval(() => {
      this.playRow();
    }, msPerRow);
  }

  /**
   * Pause playback (keeps position)
   */
  pause(): void {
    if (!this.isPlaying) return;

    console.log('[SimplePlayer] ⏸ Pausing');
    this.isPlaying = false;

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Stop all currently playing notes
    this.synth.allNotesOff();
  }

  /**
   * Stop playback and reset to beginning
   */
  stop(): void {
    this.pause();
    this.currentRow = 0;
    console.log('[SimplePlayer] ⏹ Stopped and reset');

    // Notify UI of position reset
    if (this.onRowChange) {
      this.onRowChange(this.currentRow);
    }
  }

  /**
   * Check if currently playing
   */
  playing(): boolean {
    return this.isPlaying;
  }

  /**
   * Get current row number
   */
  getCurrentRow(): number {
    return this.currentRow;
  }

  /**
   * Set callback for row changes (for UI updates)
   */
  setOnRowChange(callback: (row: number) => void): void {
    this.onRowChange = callback;
  }

  /**
   * Play current row
   * @private
   */
  private playRow(): void {
    if (!this.pattern) return;

    // Loop back to start if at end
    if (this.currentRow >= this.pattern.rows.length) {
      this.currentRow = 0;
      console.log('[SimplePlayer] 🔁 Looping to row 0');
    }

    const row = this.pattern.rows[this.currentRow];

    // Play notes in each track
    row.forEach((trackNote, trackIndex) => {
      if (trackNote.note !== null) {
        // Use track index as channel (0-3 for 4 tracks)
        this.synth.noteOn(trackIndex, trackNote.note, 100);

        // Schedule note off before next row
        const msPerRow = this.calculateMsPerRow();
        const noteOffTime = msPerRow * 0.85; // 85% duration, 15% gap

        setTimeout(() => {
          if (trackNote.note !== null) {
            this.synth.noteOff(trackIndex, trackNote.note);
          }
        }, noteOffTime);
      }
    });

    // Advance to next row
    this.currentRow++;

    // Notify UI callback
    if (this.onRowChange) {
      this.onRowChange(this.currentRow);
    }
  }

  /**
   * Calculate milliseconds per row based on BPM
   * @private
   */
  private calculateMsPerRow(): number {
    if (!this.pattern) return 500;

    // BPM = beats per minute
    // stepsPerBeat = rows per beat (4 for 16th notes)
    //
    // Example: 120 BPM, 4 steps/beat
    // → 120 beats/min = 2 beats/sec
    // → 2 beats/sec × 4 steps/beat = 8 steps/sec
    // → 1000ms / 8 steps = 125ms per step

    const beatsPerSecond = this.pattern.bpm / 60;
    const stepsPerSecond = beatsPerSecond * this.pattern.stepsPerBeat;
    const msPerStep = 1000 / stepsPerSecond;

    return msPerStep;
  }
}
```

---

### Step 2: Create TrackerGrid Component

**Create directory:**

```bash
mkdir src/components
```

**File:** `src/components/TrackerGrid.tsx`

**Full Code:**

```typescript
/**
 * TrackerGrid - Editable tracker note grid
 *
 * Displays a grid of note inputs with keyboard navigation.
 */

import React from 'react';
import './TrackerGrid.css';

interface TrackerGridProps {
  rows: number;               // Number of rows (e.g., 16)
  tracks: number;             // Number of tracks (e.g., 4)
  pattern: string[][];        // [row][track] = "C-4" or "---"
  onUpdate: (pattern: string[][]) => void;
  currentRow?: number;        // Current playback row (for highlighting)
}

export function TrackerGrid({
  rows,
  tracks,
  pattern,
  onUpdate,
  currentRow,
}: TrackerGridProps) {
  /**
   * Handle cell value change
   */
  const handleCellChange = (row: number, track: number, value: string) => {
    // Create new pattern array (immutable update)
    const newPattern = pattern.map((r) => [...r]);

    // Normalize input
    let normalized = value.trim().toUpperCase();

    // If empty, set to rest
    if (normalized === '') {
      normalized = '---';
    }

    newPattern[row][track] = normalized;
    onUpdate(newPattern);
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (
    e: React.KeyboardEvent,
    row: number,
    track: number
  ) => {
    let nextRow = row;
    let nextTrack = track;

    switch (e.key) {
      case 'ArrowUp':
        if (row > 0) {
          nextRow = row - 1;
          e.preventDefault();
        }
        break;

      case 'ArrowDown':
      case 'Enter':
        if (row < rows - 1) {
          nextRow = row + 1;
          e.preventDefault();
        }
        break;

      case 'ArrowLeft':
        if (track > 0) {
          nextTrack = track - 1;
          e.preventDefault();
        }
        break;

      case 'ArrowRight':
      case 'Tab':
        if (track < tracks - 1) {
          nextTrack = track + 1;
          e.preventDefault();
        }
        break;

      case 'Delete':
        // Clear cell on delete key
        handleCellChange(row, track, '---');
        e.preventDefault();
        break;

      default:
        return; // Allow normal input
    }

    // Focus next cell if navigation occurred
    if (nextRow !== row || nextTrack !== track) {
      const nextInput = document.querySelector(
        `input[data-row="${nextRow}"][data-track="${nextTrack}"]`
      ) as HTMLInputElement;

      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  };

  return (
    <div className="tracker-grid-container">
      <table className="tracker-grid">
        <thead>
          <tr>
            <th className="row-header">Row</th>
            {Array.from({ length: tracks }, (_, i) => (
              <th key={i} className="track-header">
                Track {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, row) => (
            <tr
              key={row}
              className={
                row === currentRow ? 'tracker-row current-row' : 'tracker-row'
              }
            >
              <td className="row-number">
                {row.toString().padStart(2, '0')}
              </td>
              {Array.from({ length: tracks }, (_, track) => (
                <td key={track} className="note-cell">
                  <input
                    type="text"
                    value={pattern[row][track]}
                    onChange={(e) =>
                      handleCellChange(row, track, e.target.value)
                    }
                    onKeyDown={(e) => handleKeyDown(e, row, track)}
                    onFocus={(e) => e.target.select()}
                    maxLength={4}
                    className="note-input"
                    placeholder="---"
                    data-row={row}
                    data-track={track}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**File:** `src/components/TrackerGrid.css`

```css
.tracker-grid-container {
  overflow: auto;
  max-height: 600px;
  border: 2px solid #333;
  border-radius: 8px;
  background-color: #0a0a0a;
}

.tracker-grid {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Courier New', 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  background-color: #1a1a1a;
  color: #00ff00;
}

/* Sticky header */
.tracker-grid thead {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: #2a2a2a;
}

.tracker-grid th {
  padding: 10px;
  border: 1px solid #444;
  font-weight: bold;
  text-align: center;
}

.row-header {
  width: 60px;
  background-color: #2a2a2a;
  color: #888;
}

.track-header {
  background-color: #2a2a2a;
  color: #ffaa00;
  min-width: 80px;
}

/* Row styling */
.tracker-row {
  transition: background-color 0.1s;
}

.tracker-row:hover {
  background-color: #252525;
}

.tracker-row.current-row {
  background-color: #2a3a2a !important;
}

.tracker-row.current-row .row-number {
  background-color: #3a4a3a;
  color: #00ff00;
  font-weight: bold;
}

/* Cell styling */
.tracker-grid td {
  border: 1px solid #333;
  padding: 0;
}

.row-number {
  background-color: #1f1f1f;
  text-align: center;
  font-weight: bold;
  color: #666;
  padding: 6px 8px;
  user-select: none;
  border-right: 2px solid #444;
}

.note-cell {
  padding: 2px;
}

/* Input field */
.note-input {
  width: 100%;
  min-width: 70px;
  padding: 6px 8px;
  background: transparent;
  border: none;
  color: #00ff00;
  font-family: inherit;
  font-size: inherit;
  text-align: center;
  text-transform: uppercase;
  outline: none;
}

.note-input:focus {
  background-color: #2a2a2a;
  outline: 2px solid #00ff00;
  outline-offset: -2px;
}

.note-input::placeholder {
  color: #444;
}

/* Invalid note styling (can add validation later) */
.note-input.invalid {
  color: #ff4444 !important;
  background-color: #3a0000 !important;
}
```

---

### Step 3: Update App to Use Player and Grid

**File:** `src/App.tsx` (complete replacement)

```typescript
import { useState, useEffect } from 'react';
import { SimpleSynth } from './SimpleSynth';
import { SimplePlayer, TrackerPattern, TrackerNote } from './SimplePlayer';
import { noteNameToMIDI } from './utils/noteConversion';
import { TrackerGrid } from './components/TrackerGrid';
import './App.css';

function App() {
  const [synth, setSynth] = useState<SimpleSynth | null>(null);
  const [player, setPlayer] = useState<SimplePlayer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentRow, setCurrentRow] = useState(0);
  const [bpm, setBpm] = useState(120);

  // Pattern state: 16 rows × 4 tracks
  const [pattern, setPattern] = useState<string[][]>(() =>
    Array(16)
      .fill(null)
      .map(() => Array(4).fill('---'))
  );

  // Initialize audio engine
  useEffect(() => {
    const init = async () => {
      try {
        console.log('=== Initializing WebOrchestra ===');

        // Initialize synthesizer
        const s = new SimpleSynth();
        await s.init();
        setSynth(s);

        // Initialize player
        const p = new SimplePlayer(s);
        p.setOnRowChange((row) => {
          setCurrentRow(row);
        });
        setPlayer(p);

        setIsReady(true);
        console.log('=== Ready! ===');
      } catch (error) {
        console.error('Initialization failed:', error);
        alert('Failed to initialize audio engine. Check console for details.');
      }
    };

    init();
  }, []);

  /**
   * Play/Stop toggle
   */
  const handlePlayStop = () => {
    if (!player) return;

    if (isPlaying) {
      // Stop
      player.stop();
      setIsPlaying(false);
      setCurrentRow(0);
    } else {
      // Play
      console.log('--- Converting pattern to tracker format ---');

      // Convert string pattern to TrackerPattern
      const trackerPattern: TrackerPattern = {
        bpm: bpm,
        stepsPerBeat: 4, // 16th notes
        rows: pattern.map((row) =>
          row.map((cell) => {
            const note = noteNameToMIDI(cell);
            return {
              note: note,
              instrument: 0,
            } as TrackerNote;
          })
        ),
      };

      player.loadPattern(trackerPattern);
      player.play();
      setIsPlaying(true);
    }
  };

  /**
   * Load example pattern
   */
  const loadExample = () => {
    console.log('Loading example pattern...');

    const example: string[][] = Array(16)
      .fill(null)
      .map(() => Array(4).fill('---'));

    // Track 0: C major scale
    example[0][0] = 'C-4';
    example[1][0] = 'D-4';
    example[2][0] = 'E-4';
    example[3][0] = 'F-4';
    example[4][0] = 'G-4';
    example[5][0] = 'A-4';
    example[6][0] = 'B-4';
    example[7][0] = 'C-5';

    // Track 1: Bass notes
    example[0][1] = 'C-3';
    example[4][1] = 'G-3';
    example[8][1] = 'C-3';
    example[12][1] = 'G-3';

    // Track 2: Chords (every 4 rows)
    example[0][2] = 'E-4';
    example[4][2] = 'G-4';
    example[8][2] = 'E-4';
    example[12][2] = 'G-4';

    setPattern(example);
    console.log('Example pattern loaded!');
  };

  /**
   * Clear pattern
   */
  const clearPattern = () => {
    setPattern(
      Array(16)
        .fill(null)
        .map(() => Array(4).fill('---'))
    );
    console.log('Pattern cleared');
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1>🎵 WebOrchestra</h1>
          <div className="subtitle">Minimal Tracker Prototype</div>
        </div>
        <div className="status">
          {isReady ? '✅ Ready' : '⏳ Initializing...'}
        </div>
      </header>

      <div className="controls">
        <div className="control-group">
          <button
            onClick={handlePlayStop}
            disabled={!isReady}
            className={isPlaying ? 'btn-stop' : 'btn-play'}
          >
            {isPlaying ? '⏹ Stop' : '▶ Play'}
          </button>

          <label className="control-label">
            BPM:
            <input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
              onBlur={() => {
                // Clamp to valid range
                if (bpm < 60) setBpm(60);
                if (bpm > 240) setBpm(240);
              }}
              min={60}
              max={240}
              disabled={isPlaying}
              className="bpm-input"
            />
          </label>

          <div className="position-display">
            Row: {currentRow.toString().padStart(2, '0')} / 16
          </div>
        </div>

        <div className="control-group">
          <button onClick={loadExample} disabled={isPlaying}>
            📝 Load Example
          </button>
          <button onClick={clearPattern} disabled={isPlaying}>
            🗑️ Clear
          </button>
        </div>
      </div>

      <div className="tracker-section">
        <TrackerGrid
          rows={16}
          tracks={4}
          pattern={pattern}
          onUpdate={setPattern}
          currentRow={isPlaying ? currentRow : undefined}
        />
      </div>

      <div className="help-section">
        <h3>How to use:</h3>
        <div className="help-columns">
          <div>
            <h4>Note Entry:</h4>
            <ul>
              <li>
                <strong>Format:</strong> C-4, D-4, E-4, F-4, G-4, A-4, B-4
              </li>
              <li>
                <strong>Sharps:</strong> C#4, D#4, F#4, G#4, A#4
              </li>
              <li>
                <strong>Rest:</strong> --- (or leave empty)
              </li>
              <li>
                <strong>Middle C:</strong> C-4 = MIDI 60
              </li>
            </ul>
          </div>
          <div>
            <h4>Navigation:</h4>
            <ul>
              <li>
                <strong>Arrow keys:</strong> Move between cells
              </li>
              <li>
                <strong>Enter:</strong> Move down
              </li>
              <li>
                <strong>Tab:</strong> Move right
              </li>
              <li>
                <strong>Delete:</strong> Clear cell
              </li>
              <li>
                <strong>Click cell:</strong> Select for editing
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
```

---

### Step 4: Update Styling

**File:** `src/App.css` (complete replacement)

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
    sans-serif;
  background-color: #0a0a0a;
  color: #e0e0e0;
}

.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #333;
}

.header-left h1 {
  margin: 0;
  font-size: 28px;
  color: #00ff00;
}

.subtitle {
  font-size: 14px;
  color: #888;
  margin-top: 5px;
}

.status {
  font-size: 16px;
  padding: 8px 16px;
  background-color: #2a2a2a;
  border-radius: 6px;
  border: 1px solid #444;
}

/* Controls */
.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background-color: #1a1a1a;
  border-radius: 8px;
  border: 1px solid #333;
}

.control-group {
  display: flex;
  gap: 15px;
  align-items: center;
}

.control-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
}

.position-display {
  font-family: 'Courier New', monospace;
  font-size: 16px;
  padding: 8px 12px;
  background-color: #0a0a0a;
  border: 1px solid #444;
  border-radius: 4px;
  color: #00ff00;
}

/* Buttons */
button {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid #444;
  border-radius: 6px;
  background-color: #2a2a2a;
  color: #e0e0e0;
  cursor: pointer;
  transition: all 0.2s;
}

button:hover:not(:disabled) {
  background-color: #3a3a3a;
  border-color: #555;
  transform: translateY(-1px);
}

button:active:not(:disabled) {
  transform: translateY(0);
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-play {
  background-color: #00aa00;
  color: white;
  border-color: #00aa00;
  font-size: 16px;
  padding: 12px 24px;
}

.btn-play:hover:not(:disabled) {
  background-color: #00cc00;
}

.btn-stop {
  background-color: #cc0000;
  color: white;
  border-color: #cc0000;
  font-size: 16px;
  padding: 12px 24px;
}

.btn-stop:hover:not(:disabled) {
  background-color: #ff0000;
}

/* BPM Input */
.bpm-input {
  width: 80px;
  padding: 8px 12px;
  font-size: 16px;
  font-weight: bold;
  font-family: 'Courier New', monospace;
  background-color: #0a0a0a;
  border: 1px solid #444;
  border-radius: 4px;
  color: #00ff00;
  text-align: center;
}

.bpm-input:focus {
  outline: 2px solid #00ff00;
  outline-offset: 1px;
}

/* Tracker Section */
.tracker-section {
  margin-bottom: 30px;
}

/* Help Section */
.help-section {
  padding: 20px;
  background-color: #1a1a1a;
  border-radius: 8px;
  border: 1px solid #333;
}

.help-section h3 {
  margin-top: 0;
  color: #00ff00;
  font-size: 20px;
}

.help-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-top: 15px;
}

.help-columns h4 {
  margin: 0 0 10px 0;
  color: #ffaa00;
  font-size: 16px;
}

.help-columns ul {
  margin: 0;
  padding-left: 20px;
}

.help-columns li {
  margin: 8px 0;
  line-height: 1.6;
}

.help-columns strong {
  color: #ffaa00;
}

/* Responsive */
@media (max-width: 768px) {
  .controls {
    flex-direction: column;
    gap: 15px;
  }

  .help-columns {
    grid-template-columns: 1fr;
  }
}
```

---

### Step 5: Run and Test

**Commands:**

```bash
npm run dev
```

**Complete Testing Checklist:**

#### Initial State
- [ ] Page loads without errors
- [ ] Header shows "🎵 WebOrchestra"
- [ ] Status shows "⏳ Initializing..." then "✅ Ready"
- [ ] Tracker grid displays (16 rows × 4 tracks)
- [ ] All cells show "---"
- [ ] Play button is green
- [ ] BPM shows 120

#### Load Example Pattern
- [ ] Click "Load Example" button
- [ ] Grid populates with notes
- [ ] Track 0 shows: C-4, D-4, E-4, F-4, G-4, A-4, B-4, C-5
- [ ] Track 1 shows bass notes (C-3, G-3)
- [ ] Track 2 shows chord notes (E-4, G-4)
- [ ] Track 3 remains empty

#### Playback
- [ ] Click "▶ Play" button
- [ ] Button changes to "⏹ Stop" (red)
- [ ] Hear melody (C major scale)
- [ ] Hear bass simultaneously
- [ ] Hear chords simultaneously
- [ ] Row counter increments (00/16 → 01/16 → ...)
- [ ] Current row highlights in green
- [ ] Pattern loops after row 16
- [ ] Console shows note on/off messages

#### Stop Playback
- [ ] Click "⏹ Stop" button
- [ ] Audio stops
- [ ] Button changes to "▶ Play" (green)
- [ ] Row counter resets to "00 / 16"
- [ ] Green highlight disappears

#### Edit Notes
- [ ] Click cell in row 0, track 0
- [ ] Cell highlights and selects text
- [ ] Type "G-4"
- [ ] Press Enter
- [ ] Cursor moves to row 1
- [ ] Click "▶ Play"
- [ ] Hear G instead of C at start

#### Keyboard Navigation
- [ ] Click any cell
- [ ] Press Arrow Down → cursor moves down
- [ ] Press Arrow Up → cursor moves up
- [ ] Press Arrow Right → cursor moves right
- [ ] Press Arrow Left → cursor moves left
- [ ] Press Tab → cursor moves to next track
- [ ] Press Enter → cursor moves down
- [ ] Press Delete → cell clears to "---"

#### BPM Control
- [ ] Change BPM to 180
- [ ] Click Play
- [ ] Pattern plays faster
- [ ] Stop
- [ ] Change BPM to 80
- [ ] Click Play
- [ ] Pattern plays slower

#### Clear Pattern
- [ ] Click "Clear" button
- [ ] All cells return to "---"
- [ ] Can still play (hear silence)

#### Multiple Play/Stop Cycles
- [ ] Load example
- [ ] Play → Stop → Play → Stop (repeat 3x)
- [ ] No errors
- [ ] Always resets to row 0
- [ ] Audio starts/stops cleanly

---

## Success Criteria

✅ **Part 3 is complete when:**

1. ✅ Can load example pattern
2. ✅ Can play pattern with correct timing
3. ✅ Hear 3 simultaneous tracks (melody, bass, chords)
4. ✅ Current row highlights during playback
5. ✅ Row counter updates
6. ✅ Pattern loops automatically
7. ✅ Stop button works and resets position
8. ✅ Can edit notes in grid
9. ✅ Edited notes are heard on next play
10. ✅ Keyboard navigation works (arrows, enter, tab, delete)
11. ✅ BPM control works (faster/slower tempo)
12. ✅ Clear button works
13. ✅ No errors in console
14. ✅ Can play/stop multiple times without issues

---

## Troubleshooting

### Problem: Pattern doesn't play

**Check:**
- Console for errors
- Pattern loaded: check `player.loadPattern()` called
- Notes valid: check noteNameToMIDI returns numbers

**Debug:**
```typescript
console.log('Pattern:', trackerPattern);
console.log('Row 0:', trackerPattern.rows[0]);
```

---

### Problem: Wrong timing

**Check:**
- BPM calculation
- Log `msPerRow` value
- Expected at 120 BPM: 125ms per row

**Debug:**
```typescript
console.log('BPM:', bpm);
console.log('Steps per beat:', 4);
console.log('Ms per row:', msPerRow);
```

---

### Problem: Notes overlap/don't stop

**Check:**
- Note off timing (85% of row duration)
- Channel allocation

**Fix:** Adjust `noteOffTime` in playRow()

---

### Problem: Can't type in grid

**Check:**
- Input not disabled
- Click focuses cell
- onChange handler fires

**Debug:** Add console.log in handleCellChange

---

### Problem: Navigation doesn't work

**Check:**
- KeyDown handler attached
- data-row and data-track attributes set
- querySelector finds next input

**Debug:** Log key presses and next cell

---

## What We Built

If all tests pass:
- ✅ Complete working tracker interface
- ✅ Pattern playback with timing
- ✅ Editable note grid
- ✅ Keyboard navigation
- ✅ BPM control
- ✅ Playback visualization
- ✅ **Core functionality complete!**

---

## Next Steps

**After Part 3 succeeds:**
→ Proceed to **Part 4: Polish** (validation, shortcuts, UX improvements)

---

## Files Created

```
minimal-prototype/
├── src/
│   ├── SimplePlayer.ts          ← New (playback engine)
│   ├── components/
│   │   ├── TrackerGrid.tsx      ← New (UI component)
│   │   └── TrackerGrid.css      ← New (styling)
│   ├── App.tsx                   ← Updated (full integration)
│   └── App.css                   ← Updated (complete styles)
```

**Total New Lines:** ~700 lines

---

## Time Log

| Task | Estimated | Actual |
|------|-----------|--------|
| SimplePlayer class | 40 min | ___ |
| TrackerGrid component | 50 min | ___ |
| App integration | 30 min | ___ |
| Testing and debugging | 40 min | ___ |
| **TOTAL** | **~2.5 hours** | ___ |

---

**Part 3 complete! You now have a fully functional tracker. Part 4 adds the final polish!** 🎹
