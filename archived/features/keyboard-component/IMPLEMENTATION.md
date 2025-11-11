# Piano Keyboard Component - Implementation Guide

**Version:** 1.0
**Last Updated:** 2025-01-04

This document provides step-by-step instructions for implementing the Piano Keyboard component.

---

## Prerequisites

Before starting implementation:
- [ ] Read [DESIGN.md](./DESIGN.md) completely
- [ ] Understand the SimpleSynth API (noteOn/noteOff)
- [ ] Familiar with React hooks (useState, useMemo, useCallback)
- [ ] Review failed previous attempt and learn from mistakes

---

## Phase 1: Core Component & Geometry (2-3 hours)

### Step 1.1: Create Utility Functions

**File:** `minimal-prototype/src/utils/keyboardUtils.ts`

```typescript
/**
 * Piano keyboard utility functions
 */

/**
 * Check if a MIDI note is a black key
 */
export function isBlackKey(midiNote: number): boolean {
  const noteInOctave = midiNote % 12;
  return [1, 3, 6, 8, 10].includes(noteInOctave);
}

/**
 * Get note name (e.g., "C4", "F#5")
 */
export function getNoteName(midiNote: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = noteNames[midiNote % 12];
  return `${noteName}${octave}`;
}

/**
 * Get white key index for positioning
 * Maps MIDI notes to sequential white key positions (0, 1, 2...)
 */
export function getWhiteKeyIndex(midiNote: number, startNote: number): number {
  // Pattern maps 12 semitones to 7 white keys per octave
  // C C# D D# E F F# G G# A A# B
  // 0  0 1  1 2 3  3 4  4 5  5 6
  const whiteKeyPattern = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];

  const notesFromStart = midiNote - startNote;
  const octavesFromStart = Math.floor(notesFromStart / 12);
  const noteInOctave = notesFromStart % 12;

  return octavesFromStart * 7 + whiteKeyPattern[noteInOctave];
}

/**
 * Count white keys in a range
 */
export function countWhiteKeys(startNote: number, endNote: number): number {
  let count = 0;
  for (let note = startNote; note <= endNote; note++) {
    if (!isBlackKey(note)) count++;
  }
  return count;
}

/**
 * Get track indicators for a specific note
 * Returns array of { trackId, color } for tracks playing this note
 */
export function getTrackIndicators(
  midiNote: number,
  activeNotesByTrack?: Map<number, { notes: Set<number>; color: string }>
): Array<{ trackId: number; color: string }> {
  if (!activeNotesByTrack) return [];

  const indicators: Array<{ trackId: number; color: string }> = [];

  activeNotesByTrack.forEach(({ notes, color }, trackId) => {
    if (notes.has(midiNote)) {
      indicators.push({ trackId, color });
    }
  });

  // Sort by track ID for consistent rendering order
  return indicators.sort((a, b) => a.trackId - b.trackId);
}

/**
 * Key geometry data
 */
export interface KeyGeometry {
  left: number;
  width: number;
  height: number;
  isBlack: boolean;
}

/**
 * Calculate position and dimensions for a key
 */
export function calculateKeyGeometry(
  midiNote: number,
  startNote: number,
  whiteKeyWidth: number,
  whiteKeyHeight: number,
  gap: number
): KeyGeometry {
  const isBlack = isBlackKey(midiNote);

  if (isBlack) {
    // Black key dimensions
    const blackKeyWidth = whiteKeyWidth * 0.6;
    const blackKeyHeight = whiteKeyHeight * 0.65;

    // Position: centered on white key boundary
    const whiteKeyIndex = getWhiteKeyIndex(midiNote, startNote);
    const left = whiteKeyIndex * (whiteKeyWidth + gap) + whiteKeyWidth - (blackKeyWidth / 2);

    return { left, width: blackKeyWidth, height: blackKeyHeight, isBlack: true };
  } else {
    // White key position
    const whiteKeyIndex = getWhiteKeyIndex(midiNote, startNote);
    const left = whiteKeyIndex * (whiteKeyWidth + gap);

    return { left, width: whiteKeyWidth, height: whiteKeyHeight, isBlack: false };
  }
}
```

**Testing Step 1.1:**
```typescript
// In browser console or test file
import { getWhiteKeyIndex, isBlackKey, getNoteName } from './utils/keyboardUtils';

// Test white key indices
console.assert(getWhiteKeyIndex(60, 60) === 0, 'C-4 should be index 0');
console.assert(getWhiteKeyIndex(62, 60) === 1, 'D-4 should be index 1');
console.assert(getWhiteKeyIndex(64, 60) === 2, 'E-4 should be index 2');

// Test black key detection
console.assert(isBlackKey(61) === true, 'C#-4 is black');
console.assert(isBlackKey(60) === false, 'C-4 is white');

// Test note names
console.assert(getNoteName(60) === 'C4', 'MIDI 60 is C4');
console.assert(getNoteName(61) === 'C#4', 'MIDI 61 is C#4');
```

---

### Step 1.2: Create Component Structure

**File:** `minimal-prototype/src/components/PianoKeyboard/PianoKeyboard.tsx`

```typescript
import { useState, useMemo, useCallback } from 'react';
import {
  isBlackKey,
  getNoteName,
  countWhiteKeys,
  calculateKeyGeometry,
  getTrackIndicators,
  type KeyGeometry
} from '../../utils/keyboardUtils';
import './PianoKeyboard.css';

export interface PianoKeyboardProps {
  /** Starting MIDI note (0-127) */
  startNote: number;

  /** Ending MIDI note (0-127) */
  endNote: number;

  /** Height in pixels (default: 80) */
  height?: number;

  /** Maximum width in pixels (keyboard will scale to fit) */
  maxWidth?: number;

  /** Currently active notes from user interaction (highlighted in default color) */
  activeNotes?: Set<number>;

  /**
   * Active notes by track with color mapping
   * Map of track ID -> { notes: Set<number>, color: string }
   * Each track's notes are rendered with its specified color
   * Useful for multi-track playback visualization
   */
  activeNotesByTrack?: Map<number, { notes: Set<number>; color: string }>;

  /** Called when user presses a key */
  onNoteOn?: (midiNote: number) => void;

  /** Called when user releases a key */
  onNoteOff?: (midiNote: number) => void;

  /** Disable interaction */
  disabled?: boolean;

  /** Show note labels on white keys */
  showLabels?: boolean;

  /** Use compact sizing */
  compact?: boolean;
}

export function PianoKeyboard({
  startNote,
  endNote,
  height = 80,
  maxWidth,
  activeNotes = new Set(),
  activeNotesByTrack,
  onNoteOn,
  onNoteOff,
  disabled = false,
  showLabels = false,
  compact = false
}: PianoKeyboardProps) {
  // Local state for mouse-pressed keys
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());

  // Calculate track indicators for each note
  // Each note can have multiple track indicators (4px tall colored bars)
  const noteTrackIndicators = useMemo(() => {
    const indicatorMap = new Map<number, Array<{ trackId: number; color: string }>>();

    for (let note = startNote; note <= endNote; note++) {
      const indicators = getTrackIndicators(note, activeNotesByTrack);
      if (indicators.length > 0) {
        indicatorMap.set(note, indicators);
      }
    }

    return indicatorMap;
  }, [startNote, endNote, activeNotesByTrack]);

  // Dimensions
  const gap = compact ? 1 : 2;
  const whiteKeyCount = useMemo(
    () => countWhiteKeys(startNote, endNote),
    [startNote, endNote]
  );

  // Calculate white key width - scale to fit maxWidth if provided
  const whiteKeyWidth = useMemo(() => {
    const defaultWidth = compact ? 30 : 40;

    if (maxWidth) {
      // Calculate the maximum key width that fits within maxWidth
      // Formula: maxWidth = whiteKeyCount * keyWidth + (whiteKeyCount - 1) * gap
      // Solving for keyWidth: keyWidth = (maxWidth - (whiteKeyCount - 1) * gap) / whiteKeyCount
      const calculatedWidth = (maxWidth - (whiteKeyCount - 1) * gap) / whiteKeyCount;

      // Use the smaller of calculated width or default width (never scale up)
      return Math.min(calculatedWidth, defaultWidth);
    }

    return defaultWidth;
  }, [compact, maxWidth, whiteKeyCount, gap]);

  const containerWidth = whiteKeyCount * whiteKeyWidth + (whiteKeyCount - 1) * gap;

  // Pre-calculate all key geometries (memoized)
  const keyGeometries = useMemo(() => {
    const geometries = new Map<number, KeyGeometry>();
    for (let note = startNote; note <= endNote; note++) {
      geometries.set(
        note,
        calculateKeyGeometry(note, startNote, whiteKeyWidth, height, gap)
      );
    }
    return geometries;
  }, [startNote, endNote, whiteKeyWidth, height, gap]);

  // Combine pressed keys with externally active notes
  const displayedActiveKeys = useMemo(() => {
    return new Set([...pressedKeys, ...activeNotes]);
  }, [pressedKeys, activeNotes]);

  // Generate all notes in range
  const allNotes = useMemo(() => {
    const notes: number[] = [];
    for (let note = startNote; note <= endNote; note++) {
      notes.push(note);
    }
    return notes;
  }, [startNote, endNote]);

  // Separate white and black keys for rendering order
  const whiteNotes = useMemo(() => allNotes.filter(n => !isBlackKey(n)), [allNotes]);
  const blackNotes = useMemo(() => allNotes.filter(n => isBlackKey(n)), [allNotes]);

  const handleMouseDown = useCallback((midiNote: number) => {
    if (disabled) return;
    setPressedKeys(prev => new Set(prev).add(midiNote));
    onNoteOn?.(midiNote);
  }, [disabled, onNoteOn]);

  const handleMouseUp = useCallback((midiNote: number) => {
    if (disabled) return;
    setPressedKeys(prev => {
      const next = new Set(prev);
      next.delete(midiNote);
      return next;
    });
    onNoteOff?.(midiNote);
  }, [disabled, onNoteOff]);

  const handleMouseLeave = useCallback((midiNote: number) => {
    // Auto-release if mouse leaves while pressed
    if (pressedKeys.has(midiNote)) {
      handleMouseUp(midiNote);
    }
  }, [pressedKeys, handleMouseUp]);

  return (
    <div
      className="piano-keyboard-container"
      style={{ width: containerWidth, height }}
    >
      {/* White keys (render first, lower z-index) */}
      {whiteNotes.map(note => {
        const geometry = keyGeometries.get(note)!;
        const isActive = displayedActiveKeys.has(note);
        const trackIndicators = noteTrackIndicators.get(note) || [];

        return (
          <button
            key={note}
            className={`piano-key white ${isActive ? 'active' : ''}`}
            style={{
              left: geometry.left,
              width: geometry.width,
              height: geometry.height
            }}
            onMouseDown={() => handleMouseDown(note)}
            onMouseUp={() => handleMouseUp(note)}
            onMouseLeave={() => handleMouseLeave(note)}
            disabled={disabled}
            aria-label={`${getNoteName(note)} key`}
            aria-pressed={isActive}
          >
            {showLabels && <span className="key-label">{getNoteName(note)}</span>}

            {/* Track indicator bars (stacked at bottom of key) */}
            {trackIndicators.length > 0 && (
              <div className="track-indicators">
                {trackIndicators.map(({ trackId, color }) => (
                  <div
                    key={trackId}
                    className="track-indicator"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          </button>
        );
      })}

      {/* Black keys (render last, higher z-index) */}
      {blackNotes.map(note => {
        const geometry = keyGeometries.get(note)!;
        const isActive = displayedActiveKeys.has(note);
        const trackIndicators = noteTrackIndicators.get(note) || [];

        return (
          <button
            key={note}
            className={`piano-key black ${isActive ? 'active' : ''}`}
            style={{
              left: geometry.left,
              width: geometry.width,
              height: geometry.height
            }}
            onMouseDown={() => handleMouseDown(note)}
            onMouseUp={() => handleMouseUp(note)}
            onMouseLeave={() => handleMouseLeave(note)}
            disabled={disabled}
            aria-label={`${getNoteName(note)} key`}
            aria-pressed={isActive}
          >
            {/* Track indicator bars (stacked at bottom of key) */}
            {trackIndicators.length > 0 && (
              <div className="track-indicators">
                {trackIndicators.map(({ trackId, color }) => (
                  <div
                    key={trackId}
                    className="track-indicator"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

---

### Step 1.3: Create Stylesheet

**File:** `minimal-prototype/src/components/PianoKeyboard/PianoKeyboard.css`

```css
/**
 * Piano Keyboard Component Styles
 */

/* Container */
.piano-keyboard-container {
  position: relative;
  display: inline-block;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none; /* Prevent scrolling on touch */
}

/* Base key styles */
.piano-key {
  position: absolute;
  bottom: 0;
  border: 1px solid #3d3d3d;
  border-radius: 0 0 4px 4px;
  cursor: pointer;
  transition: all 0.1s ease;
  padding: 0;
  margin: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  font-size: 10px;
  font-family: 'Courier New', monospace;
}

.piano-key:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* White keys */
.piano-key.white {
  background: linear-gradient(to bottom, #ffffff 0%, #f5f5f5 100%);
  color: #333;
  z-index: 1;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.piano-key.white:hover:not(:disabled) {
  background: linear-gradient(to bottom, #f8f8f8 0%, #e8e8e8 100%);
}

.piano-key.white:active:not(:disabled) {
  background: linear-gradient(to bottom, #e8e8e8 0%, #d8d8d8 100%);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.piano-key.white.active {
  background: linear-gradient(to bottom, #4a9eff 0%, #3d8ee6 100%);
  color: #ffffff;
  box-shadow: 0 0 10px rgba(74, 158, 255, 0.5);
}

/* Black keys */
.piano-key.black {
  background: linear-gradient(to bottom, #1a1a1a 0%, #000000 100%);
  color: #ffffff;
  z-index: 10;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.piano-key.black:hover:not(:disabled) {
  background: linear-gradient(to bottom, #2a2a2a 0%, #1a1a1a 100%);
}

.piano-key.black:active:not(:disabled) {
  background: linear-gradient(to bottom, #0a0a0a 0%, #000000 100%);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
}

.piano-key.black.active {
  background: linear-gradient(to bottom, #ffc800 0%, #e6b800 100%);
  color: #000000;
  box-shadow: 0 0 10px rgba(255, 200, 0, 0.6);
}

/* Key labels */
.key-label {
  padding: 2px 4px;
  margin-bottom: 4px;
  font-size: 10px;
  font-weight: 600;
  pointer-events: none;
}

/* Track indicator bars (for multi-track visualization) */
.track-indicators {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  pointer-events: none;
  z-index: 5;
}

.track-indicator {
  height: 4px;
  width: 100%;
  /* Background color set dynamically via inline style */
}

/* Default track colors (CSS variables) */
:root {
  --track-0-color: #ff5555; /* Red - typically bass/low */
  --track-1-color: #55ff55; /* Green - typically lead/melody */
  --track-2-color: #5555ff; /* Blue - typically chords/harmony */
  --track-3-color: #ffff55; /* Yellow - typically percussion/effects */
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .piano-key {
    font-size: 9px;
  }

  .key-label {
    font-size: 8px;
  }
}
```

---

### Step 1.4: Create Index File

**File:** `minimal-prototype/src/components/PianoKeyboard/index.ts`

```typescript
export { PianoKeyboard } from './PianoKeyboard';
export type { PianoKeyboardProps } from './PianoKeyboard';
```

---

### Step 1.5: Create Comprehensive Test Page

Create a full-featured test page with configuration controls:

**File:** `minimal-prototype/src/components/PianoKeyboardTest.tsx`

```typescript
import { useState } from 'react';
import { PianoKeyboard } from './PianoKeyboard';
import type { SimpleSynth } from '../SimpleSynth';
import './PianoKeyboardTest.css';

export interface PianoKeyboardTestProps {
  synth?: SimpleSynth;
}

export function PianoKeyboardTest({ synth }: PianoKeyboardTestProps) {
  // Configuration state
  const [startNote, setStartNote] = useState(60); // C-4
  const [endNote, setEndNote] = useState(72);     // C-5
  const [height, setHeight] = useState(100);
  const [showLabels, setShowLabels] = useState(true);
  const [compact, setCompact] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [playSound, setPlaySound] = useState(true);
  const [channel, setChannel] = useState(8);

  // Observe channels (for visualization testing)
  const [observeChannels, setObserveChannels] = useState<number[]>([]);
  const [allChannels, setAllChannels] = useState(true);

  // Active notes (for visualization testing)
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());

  // Handlers
  const handleNoteOn = (note: number) => {
    if (playSound && synth) {
      synth.noteOn(channel, note);
    }
    setActiveNotes(prev => new Set(prev).add(note));
  };

  const handleNoteOff = (note: number) => {
    if (playSound && synth) {
      synth.noteOff(channel, note);
    }
    setActiveNotes(prev => {
      const next = new Set(prev);
      next.delete(note);
      return next;
    });
  };

  // Test scenario presets
  const loadPreset = (preset: string) => {
    switch (preset) {
      case 'instrument-editor':
        setStartNote(60);
        setEndNote(72);
        setHeight(100);
        setShowLabels(true);
        setCompact(false);
        setDisabled(false);
        setPlaySound(true);
        break;
      case 'pattern-viz-all':
        setStartNote(48);
        setEndNote(84);
        setHeight(60);
        setShowLabels(false);
        setCompact(true);
        setDisabled(true);
        setAllChannels(true);
        setObserveChannels([]);
        break;
      case 'pattern-viz-tracks':
        setStartNote(48);
        setEndNote(84);
        setHeight(60);
        setShowLabels(false);
        setCompact(true);
        setDisabled(true);
        setAllChannels(false);
        setObserveChannels([0, 2]);
        break;
      case 'note-input':
        setStartNote(60);
        setEndNote(84);
        setHeight(100);
        setShowLabels(true);
        setCompact(false);
        setDisabled(false);
        setPlaySound(false);
        break;
      case 'full-range':
        setStartNote(21);
        setEndNote(108);
        setHeight(80);
        setShowLabels(false);
        setCompact(true);
        setDisabled(false);
        setPlaySound(true);
        break;
    }
  };

  // Simulate random notes (for testing visualization)
  const simulatePlayback = () => {
    const notes = [60, 64, 67, 72, 76];
    const randomNote = notes[Math.floor(Math.random() * notes.length)];

    setActiveNotes(prev => new Set(prev).add(randomNote));

    setTimeout(() => {
      setActiveNotes(prev => {
        const next = new Set(prev);
        next.delete(randomNote);
        return next;
      });
    }, 500);
  };

  // Toggle channel observation
  const toggleChannel = (ch: number) => {
    setObserveChannels(prev =>
      prev.includes(ch)
        ? prev.filter(c => c !== ch)
        : [...prev, ch]
    );
  };

  const keyCount = endNote - startNote + 1;

  return (
    <div className="keyboard-test">
      <h1>Piano Keyboard Test</h1>

      {/* Configuration Panel */}
      <div className="test-config">
        {/* Range Configuration */}
        <div className="config-section">
          <h3>Range</h3>
          <label>
            Start Note (MIDI):
            <input
              type="number"
              value={startNote}
              onChange={(e) => setStartNote(Number(e.target.value))}
              min={0}
              max={127}
            />
          </label>
          <label>
            End Note (MIDI):
            <input
              type="number"
              value={endNote}
              onChange={(e) => setEndNote(Number(e.target.value))}
              min={0}
              max={127}
            />
          </label>
        </div>

        {/* Visual Options */}
        <div className="config-section">
          <h3>Visual</h3>
          <label>
            Height (px):
            <input
              type="range"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              min={40}
              max={200}
            />
            <span>{height}px</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
            />
            Show Labels
          </label>
          <label>
            <input
              type="checkbox"
              checked={compact}
              onChange={(e) => setCompact(e.target.checked)}
            />
            Compact Mode
          </label>
        </div>

        {/* Interaction Options */}
        <div className="config-section">
          <h3>Interaction</h3>
          <label>
            <input
              type="checkbox"
              checked={disabled}
              onChange={(e) => setDisabled(e.target.checked)}
            />
            Disabled (visualization only)
          </label>
          <label>
            <input
              type="checkbox"
              checked={playSound}
              onChange={(e) => setPlaySound(e.target.checked)}
              disabled={disabled}
            />
            Play Sound
          </label>
          <label>
            Channel:
            <select
              value={channel}
              onChange={(e) => setChannel(Number(e.target.value))}
              disabled={!playSound}
            >
              {[0,1,2,3,4,5,6,7,8].map(ch => (
                <option key={ch} value={ch}>Channel {ch}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Observe Channels */}
        <div className="config-section">
          <h3>Observe Channels</h3>
          <label>
            <input
              type="checkbox"
              checked={allChannels}
              onChange={(e) => {
                setAllChannels(e.target.checked);
                if (e.target.checked) setObserveChannels([]);
              }}
            />
            All Channels
          </label>
          {!allChannels && (
            <div className="channel-checkboxes">
              {[0,1,2,3,4,5,6,7].map(ch => (
                <label key={ch}>
                  <input
                    type="checkbox"
                    checked={observeChannels.includes(ch)}
                    onChange={() => toggleChannel(ch)}
                  />
                  Track {ch}
                </label>
              ))}
            </div>
          )}
          <button onClick={simulatePlayback}>Simulate Playback</button>
        </div>

        {/* Test Scenario Presets */}
        <div className="config-section">
          <h3>Test Scenarios</h3>
          <button onClick={() => loadPreset('instrument-editor')}>Instrument Editor</button>
          <button onClick={() => loadPreset('pattern-viz-all')}>Pattern Viz (All)</button>
          <button onClick={() => loadPreset('pattern-viz-tracks')}>Pattern Viz (Tracks 0,2)</button>
          <button onClick={() => loadPreset('note-input')}>Note Input</button>
          <button onClick={() => loadPreset('full-range')}>Full Range</button>
        </div>
      </div>

      {/* Keyboard Component */}
      <div className="test-keyboard-container">
        <PianoKeyboard
          startNote={startNote}
          endNote={endNote}
          height={height}
          showLabels={showLabels}
          compact={compact}
          disabled={disabled}
          activeNotes={activeNotes}
          observeChannels={allChannels ? undefined : observeChannels}
          onNoteOn={disabled ? undefined : handleNoteOn}
          onNoteOff={disabled ? undefined : handleNoteOff}
        />
      </div>

      {/* Current Configuration Display */}
      <div className="test-info">
        <h3>Current Configuration</h3>
        <ul>
          <li>Range: {startNote}-{endNote} ({keyCount} keys)</li>
          <li>Height: {height}px</li>
          <li>Compact: {compact ? 'Yes' : 'No'}</li>
          <li>Labels: {showLabels ? 'Yes' : 'No'}</li>
          <li>Disabled: {disabled ? 'Yes' : 'No'}</li>
          <li>Play Sound: {playSound ? 'Yes' : 'No'}</li>
          <li>Observing: {allChannels ? 'All Channels' : `Tracks [${observeChannels.join(', ')}]`}</li>
        </ul>
        <p>Active Notes: [{Array.from(activeNotes).join(', ')}]</p>
      </div>
    </div>
  );
}
```

**File:** `minimal-prototype/src/components/PianoKeyboardTest.css`

```css
.keyboard-test {
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.keyboard-test h1 {
  margin-bottom: 30px;
  color: #fff;
}

.test-config {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
  padding: 20px;
  background: #2a2a2a;
  border-radius: 8px;
}

.config-section {
  padding: 15px;
  background: #1e1e1e;
  border-radius: 6px;
}

.config-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #4a9eff;
  font-size: 14px;
  text-transform: uppercase;
}

.config-section label {
  display: block;
  margin-bottom: 10px;
  color: #ccc;
  font-size: 13px;
}

.config-section input[type="number"],
.config-section select {
  width: 100%;
  padding: 6px;
  margin-top: 4px;
  background: #2a2a2a;
  border: 1px solid #4d4d4d;
  border-radius: 4px;
  color: #fff;
}

.config-section input[type="range"] {
  width: 100%;
  margin-right: 10px;
}

.config-section button {
  margin: 5px 5px 5px 0;
  padding: 8px 12px;
  background: #3d3d3d;
  border: 1px solid #4d4d4d;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  font-size: 12px;
}

.config-section button:hover {
  background: #4d4d4d;
}

.channel-checkboxes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 10px;
}

.test-keyboard-container {
  margin: 40px 0;
  padding: 40px;
  background: #2a2a2a;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  overflow-x: auto;
}

.test-info {
  padding: 20px;
  background: #2a2a2a;
  border-radius: 8px;
  color: #ccc;
}

.test-info h3 {
  margin-top: 0;
  color: #4a9eff;
}

.test-info ul {
  list-style: none;
  padding: 0;
}

.test-info li {
  padding: 5px 0;
  font-size: 14px;
}

.test-info p {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #3d3d3d;
  font-family: 'Courier New', monospace;
  color: #4a9eff;
}
```

Add route to App.tsx:
```typescript
import { PianoKeyboardTest } from './components/PianoKeyboardTest';

// In the routes section:
<Route path="/test-keyboard">
  {synth && <PianoKeyboardTest synth={synth} />}
</Route>
```

**Checkpoint:** Navigate to `/test-keyboard` and verify:
- [ ] Configuration panel displays all options
- [ ] Keys render in correct positions
- [ ] Black keys are properly aligned between white keys
- [ ] No flexbox alignment issues
- [ ] Labels display correctly (if enabled)
- [ ] Configuration changes update keyboard immediately
- [ ] Test scenario buttons load correct presets
- [ ] "Simulate Playback" highlights notes temporarily

---

## Phase 2: Interaction (1-2 hours)

### Step 2.1: Add Audio Integration

Modify test component to connect with synth:

```typescript
export function PianoKeyboardTest({ synth }: { synth?: SimpleSynth }) {
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());

  const handleNoteOn = (note: number) => {
    console.log('[Keyboard] Note ON:', note);
    if (synth) {
      synth.noteOn(8, note); // Use channel 8 for testing
    }
    setActiveNotes(prev => new Set(prev).add(note));
  };

  const handleNoteOff = (note: number) => {
    console.log('[Keyboard] Note OFF:', note);
    if (synth) {
      synth.noteOff(8, note);
    }
    setActiveNotes(prev => {
      const next = new Set(prev);
      next.delete(note);
      return next;
    });
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Piano Keyboard - Interactive Test</h2>

      <PianoKeyboard
        startNote={60}
        endNote={72}
        height={100}
        showLabels={true}
        activeNotes={activeNotes}
        onNoteOn={handleNoteOn}
        onNoteOff={handleNoteOff}
      />
    </div>
  );
}
```

**Checkpoint:**
- [ ] Clicking white keys plays sound
- [ ] Clicking black keys plays sound
- [ ] Keys highlight when pressed
- [ ] Mouse up releases note
- [ ] Mouse leave releases note

---

## Phase 3: Visual Polish (1-2 hours)

### Step 3.1: Refine Active State Animations

Update CSS:
```css
/* Add smooth glow transition */
.piano-key {
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.piano-key.active {
  transform: translateY(2px);
}
```

### Step 3.2: Add Touch Support

Update event handlers:
```typescript
<button
  /* ...existing props */
  onTouchStart={(e) => {
    e.preventDefault();
    handleMouseDown(note);
  }}
  onTouchEnd={(e) => {
    e.preventDefault();
    handleMouseUp(note);
  }}
/>
```

---

## Phase 4: Integration (1-2 hours)

### Step 4.1: Add to InstrumentEditor

Update `InstrumentEditor.tsx`:

```typescript
import { PianoKeyboard } from './PianoKeyboard';

// In render, after ADSR controls:
<div className="editor-section">
  <h3 className="editor-section-title">Preview Keyboard</h3>
  <p className="editor-section-desc">
    Click keys to test the current instrument
  </p>

  <div className="editor-keyboard-with-arrows">
    <button
      className="editor-octave-arrow"
      onClick={handleOctaveDown}
      disabled={!canShiftDown}
    >
      ◀
    </button>
    <PianoKeyboard
      startNote={keyboardStartNote}
      endNote={keyboardEndNote}
      height={90}
      maxWidth={411}
      showLabels={true}
      compact={true}
      onNoteOn={(note) => {
        if (synth) {
          synth.setTrackPatch(8, editedPatch);
          synth.noteOn(8, note);
        }
      }}
      onNoteOff={(note) => {
        if (synth) {
          synth.noteOff(8, note);
        }
      }}
    />
    <button
      className="editor-octave-arrow"
      onClick={handleOctaveUp}
      disabled={!canShiftUp}
    >
      ▶
    </button>
  </div>
</div>
```

**Checkpoint:**
- [ ] Keyboard appears in InstrumentEditor
- [ ] Plays edited patch (not saved patch)
- [ ] Updates work while keyboard is active
- [ ] Modal styling doesn't break keyboard

---

## Phase 5: Testing & Refinement (1-2 hours)

### Step 5.1: Browser Testing

Test in:
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (if available)

### Step 5.2: Responsive Testing

Test at widths:
- [ ] 320px (mobile)
- [ ] 768px (tablet)
- [ ] 1024px+ (desktop)

### Step 5.3: Edge Cases

- [ ] Single note range (startNote === endNote)
- [ ] Very large range (3+ octaves)
- [ ] Notes at extreme ranges (MIDI 0-20, 100-127)
- [ ] Rapid clicking
- [ ] Multiple simultaneous notes

---

## Common Issues & Solutions

### Issue: Black keys not aligned
**Solution:** Verify `getWhiteKeyIndex()` logic and positioning formula

### Issue: Keys don't play sound
**Solution:** Check synth initialization, ensure channel 8 is available

### Issue: Mouse leave doesn't release note
**Solution:** Verify `onMouseLeave` handler and `pressedKeys` state

### Issue: Performance lag with many notes
**Solution:** Ensure `useMemo` is wrapping geometry calculations

---

## Completion Checklist

### Core Functionality
- [ ] Renders correct number of keys for any range
- [ ] Black keys properly positioned between white keys
- [ ] Click plays note (onNoteOn fires)
- [ ] Release stops note (onNoteOff fires)
- [ ] Active notes highlighted correctly
- [ ] Disabled mode prevents interaction

### Visual Quality
- [ ] Smooth hover transitions
- [ ] Active state clearly visible
- [ ] Labels readable on white keys
- [ ] Responsive scaling works
- [ ] No layout shift/jank

### Integration
- [ ] Works in InstrumentEditor
- [ ] Plays current edited patch
- [ ] No conflicts with existing modal styles
- [ ] Touch works on mobile devices

### Code Quality
- [ ] TypeScript: No errors
- [ ] ESLint: No warnings
- [ ] Console: No errors during interaction
- [ ] Build: Successful

---

## Next Steps (Future)

After V1 is complete:
1. Add keyboard navigation (arrow keys, space)
2. Add velocity sensitivity
3. Create pattern player visualization mode
4. Add sustain pedal simulation
5. Create note input tool for tracker

---

## Questions During Implementation?

Refer back to:
- [DESIGN.md](./DESIGN.md) for architectural decisions
- [README.md](./README.md) for API reference
- SimpleSynth.ts for audio integration details

If stuck, test each utility function in isolation first, then component rendering, then interaction.
