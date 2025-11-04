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

  /** Currently active notes (highlighted) */
  activeNotes?: Set<number>;

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
  activeNotes = new Set(),
  onNoteOn,
  onNoteOff,
  disabled = false,
  showLabels = false,
  compact = false
}: PianoKeyboardProps) {
  // Local state for mouse-pressed keys
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());

  // Dimensions
  const whiteKeyWidth = compact ? 30 : 40;
  const gap = compact ? 1 : 2;
  const whiteKeyCount = useMemo(
    () => countWhiteKeys(startNote, endNote),
    [startNote, endNote]
  );
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
          </button>
        );
      })}

      {/* Black keys (render last, higher z-index) */}
      {blackNotes.map(note => {
        const geometry = keyGeometries.get(note)!;
        const isActive = displayedActiveKeys.has(note);

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
          />
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

### Step 1.5: Test Basic Rendering

Create a simple test page:

**File:** `minimal-prototype/src/components/PianoKeyboardTest.tsx`

```typescript
import { PianoKeyboard } from './PianoKeyboard';

export function PianoKeyboardTest() {
  return (
    <div style={{ padding: 40 }}>
      <h2>Piano Keyboard Tests</h2>

      <h3>1 Octave (C-4 to C-5)</h3>
      <PianoKeyboard
        startNote={60}
        endNote={72}
        height={100}
        showLabels={true}
      />

      <h3>2 Octaves (C-4 to C-6) - Compact</h3>
      <PianoKeyboard
        startNote={60}
        endNote={84}
        height={60}
        compact={true}
      />

      <h3>Custom Range (F-3 to A-4)</h3>
      <PianoKeyboard
        startNote={53}
        endNote={69}
        showLabels={true}
      />
    </div>
  );
}
```

Add route to App.tsx:
```typescript
<Route path="/keyboard-test">
  <PianoKeyboardTest />
</Route>
```

**Checkpoint:** Navigate to `/keyboard-test` and verify:
- [ ] Keys render in correct positions
- [ ] Black keys are properly aligned between white keys
- [ ] No flexbox alignment issues
- [ ] Labels display correctly (if enabled)

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

  <PianoKeyboard
    startNote={60}   // C-4
    endNote={72}     // C-5
    height={100}
    showLabels={true}
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
