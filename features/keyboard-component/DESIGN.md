# Piano Keyboard Component - Design Document

**Created:** 2025-01-04
**Status:** Design Phase
**Version:** 1.0

---

## 1. Overview

### Purpose
Create a reusable, interactive piano keyboard component that can:
- Display any range of keys (e.g., C-4 to C-5, C-3 to C-6)
- Accept user input via mouse/touch
- Visualize notes being played (highlight mode)
- Dynamically resize to fit various UI contexts
- Integrate with the SimpleSynth audio engine

### Use Cases
1. **Instrument Editor Preview**: Allow users to test instruments by clicking keys
2. **Pattern Visualization**: Show which notes are currently playing during playback
3. **Note Input**: Alternative to typing note names in the tracker
4. **Teaching Tool**: Visual representation of musical concepts

---

## 2. Component API

### Props Interface

```typescript
export interface PianoKeyboardProps {
  /** Starting note (MIDI number, 0-127) */
  startNote: number;

  /** Ending note (MIDI number, 0-127) */
  endNote: number;

  /** Height in pixels (optional, defaults to 80) */
  height?: number;

  /** Currently active notes (MIDI numbers) */
  activeNotes?: Set<number>;

  /** Called when user presses a key */
  onNoteOn?: (midiNote: number) => void;

  /** Called when user releases a key */
  onNoteOff?: (midiNote: number) => void;

  /** Disabled state */
  disabled?: boolean;

  /** Show note labels on white keys */
  showLabels?: boolean;

  /** Compact mode (smaller black keys, less padding) */
  compact?: boolean;
}
```

### Example Usage

```typescript
// Instrument Editor - 1 octave preview
<PianoKeyboard
  startNote={60}  // C-4
  endNote={72}    // C-5
  height={100}
  showLabels={true}
  onNoteOn={(note) => synth.noteOn(8, note)}
  onNoteOff={(note) => synth.noteOff(8, note)}
/>

// Pattern Player - visualization only
<PianoKeyboard
  startNote={48}   // C-3
  endNote={84}     // C-6
  activeNotes={currentlyPlayingNotes}
  height={60}
  compact={true}
  disabled={true}  // No interaction, just visualization
/>

// Note Input Tool - 2 octaves
<PianoKeyboard
  startNote={60}   // C-4
  endNote={84}     // C-6
  height={120}
  showLabels={true}
  onNoteOn={(note) => addNoteToPattern(note)}
/>
```

---

## 3. Visual Design

### Layout Strategy
**Use CSS Grid with absolute positioning for black keys**

Lessons learned from previous attempt:
- ❌ Flexbox causes alignment issues for black keys
- ✅ Absolute positioning with calculated offsets is more reliable
- ✅ CSS Grid provides container structure without layout conflicts

### Key Dimensions

#### Standard Mode (height = 100px)
```
White Key:
  - Width: 40px
  - Height: 100px
  - Gap: 2px between keys
  - Border: 1px solid #3d3d3d

Black Key:
  - Width: 24px (60% of white key)
  - Height: 65px (65% of white key)
  - Position: Centered on white key boundary
  - Offset: 20px from left edge of white key
```

#### Compact Mode (height = 60px)
```
White Key:
  - Width: 30px
  - Height: 60px
  - Gap: 1px

Black Key:
  - Width: 18px
  - Height: 39px
```

### Key Positioning Formula

```typescript
// White keys: sequential positioning
const whiteKeyIndex = getWhiteKeyIndex(midiNote);
const whiteKeyLeft = whiteKeyIndex * (whiteKeyWidth + gap);

// Black keys: positioned relative to white keys
const blackKeyPattern = [1, 3, -1, 6, 8, 10]; // C#, D#, skip, F#, G#, A#
const noteInOctave = midiNote % 12;
const octaveStart = Math.floor((midiNote - startNote) / 12) * 7;
const whiteKeysBeforeBlack = octaveStart + blackKeyPattern[noteInOctave - 1];
const blackKeyLeft = whiteKeysBeforeBlack * (whiteKeyWidth + gap) + whiteKeyWidth - (blackKeyWidth / 2);
```

### Color Scheme

```css
/* White Keys */
.key.white {
  background: #f5f5f5;
  color: #333;
}

.key.white:hover {
  background: #e8e8e8;
}

.key.white.active {
  background: #4a9eff;
  color: #fff;
}

/* Black Keys */
.key.black {
  background: #1a1a1a;
  color: #fff;
  z-index: 10;
}

.key.black:hover {
  background: #2a2a2a;
}

.key.black.active {
  background: #ffc800;
  color: #000;
}

/* Disabled State */
.key:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

---

## 4. Technical Implementation

### Component Structure

```
PianoKeyboard/
├── PianoKeyboard.tsx       # Main component
├── PianoKeyboard.css       # Styling
├── keyboardUtils.ts        # Helper functions
└── __tests__/
    └── PianoKeyboard.test.tsx
```

### Key Helper Functions

```typescript
// keyboardUtils.ts

/**
 * Check if a MIDI note is a black key
 */
export function isBlackKey(midiNote: number): boolean {
  const noteInOctave = midiNote % 12;
  return [1, 3, 6, 8, 10].includes(noteInOctave);
}

/**
 * Get the white key index for positioning
 * (0 = C, 1 = D, 2 = E, etc.)
 */
export function getWhiteKeyIndex(midiNote: number, startNote: number): number {
  const whiteKeysPerOctave = 7;
  const whiteKeyPattern = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6]; // 12 semitones mapped to 7 white keys

  const octavesFromStart = Math.floor((midiNote - startNote) / 12);
  const noteInOctave = (midiNote - startNote) % 12;

  return octavesFromStart * whiteKeysPerOctave + whiteKeyPattern[noteInOctave];
}

/**
 * Calculate key position and dimensions
 */
export interface KeyGeometry {
  left: number;
  width: number;
  height: number;
  isBlack: boolean;
}

export function calculateKeyGeometry(
  midiNote: number,
  startNote: number,
  whiteKeyWidth: number,
  whiteKeyHeight: number,
  gap: number
): KeyGeometry {
  const isBlack = isBlackKey(midiNote);

  if (isBlack) {
    // Black key positioning
    const blackKeyWidth = whiteKeyWidth * 0.6;
    const blackKeyHeight = whiteKeyHeight * 0.65;

    // Find which white key boundary this black key sits on
    const whiteKeyIndex = getWhiteKeyIndex(midiNote, startNote);
    const left = whiteKeyIndex * (whiteKeyWidth + gap) + whiteKeyWidth - (blackKeyWidth / 2);

    return { left, width: blackKeyWidth, height: blackKeyHeight, isBlack: true };
  } else {
    // White key positioning
    const whiteKeyIndex = getWhiteKeyIndex(midiNote, startNote);
    const left = whiteKeyIndex * (whiteKeyWidth + gap);

    return { left, width: whiteKeyWidth, height: whiteKeyHeight, isBlack: false };
  }
}

/**
 * Get note label (e.g., "C4", "F#5")
 */
export function getNoteName(midiNote: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = noteNames[midiNote % 12];
  return `${noteName}${octave}`;
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
```

### State Management

```typescript
const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());

// Combine pressed keys with active notes from player
const displayedActiveKeys = new Set([
  ...pressedKeys,
  ...(activeNotes || [])
]);
```

### Mouse/Touch Handling

```typescript
const handleMouseDown = (midiNote: number) => {
  if (disabled) return;

  setPressedKeys(prev => new Set(prev).add(midiNote));
  onNoteOn?.(midiNote);
};

const handleMouseUp = (midiNote: number) => {
  if (disabled) return;

  setPressedKeys(prev => {
    const next = new Set(prev);
    next.delete(midiNote);
    return next;
  });
  onNoteOff?.(midiNote);
};

const handleMouseLeave = (midiNote: number) => {
  // Release note if mouse leaves while pressed
  if (pressedKeys.has(midiNote)) {
    handleMouseUp(midiNote);
  }
};
```

---

## 5. Responsive Behavior

### Dynamic Sizing

The component width is calculated based on:
```typescript
const whiteKeyCount = countWhiteKeys(startNote, endNote);
const gap = compact ? 1 : 2;
const whiteKeyWidth = compact ? 30 : 40;
const totalWidth = whiteKeyCount * whiteKeyWidth + (whiteKeyCount - 1) * gap;
```

### Container Constraints

The component will:
1. Calculate its minimum required width
2. Respect parent container constraints
3. Scale down proportionally if needed (using CSS `transform: scale()`)

```css
.keyboard-container {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
}

.keyboard-container.auto-scale {
  /* Scale down if parent is too narrow */
  transform-origin: top left;
}
```

---

## 6. Accessibility

### Keyboard Navigation
- **Tab**: Focus keyboard
- **Arrow Keys**: Move between keys
- **Space/Enter**: Play focused key
- **Escape**: Release all keys

### ARIA Labels
```tsx
<button
  role="button"
  aria-label={`${getNoteName(midiNote)} key`}
  aria-pressed={isActive}
  className={`key ${isBlackKey(note) ? 'black' : 'white'} ${isActive ? 'active' : ''}`}
>
  {showLabels && !isBlackKey(note) && getNoteName(note)}
</button>
```

---

## 7. Integration Points

### Instrument Editor
- Show 1 octave (C-4 to C-5)
- Full labels
- Standard size (100px height)
- Preview mode (plays to channel 8)

### Pattern Player Visualization
- Show full composition range (e.g., C-3 to C-6)
- Compact mode (60px height)
- No labels
- Read-only (disabled interaction)
- Highlights activeNotes from player state

### Note Input Tool (Future)
- Show 2+ octaves
- Full labels
- Standard size
- Adds notes to pattern on click

---

## 8. Performance Considerations

### Optimization Strategies
1. **Memoize key geometry calculations**: Only recalculate when props change
2. **Use CSS transforms for scaling**: Hardware-accelerated
3. **Avoid re-rendering all keys**: Only update active state
4. **Throttle mouse events**: Prevent excessive state updates

```typescript
const keyGeometries = useMemo(() => {
  const geometries = new Map<number, KeyGeometry>();
  for (let note = startNote; note <= endNote; note++) {
    geometries.set(note, calculateKeyGeometry(note, startNote, whiteKeyWidth, whiteKeyHeight, gap));
  }
  return geometries;
}, [startNote, endNote, whiteKeyWidth, whiteKeyHeight, gap]);
```

---

## 9. Testing Strategy

### Unit Tests
- [ ] Key geometry calculations for all notes
- [ ] White key counting across octaves
- [ ] Note name generation
- [ ] Black key detection

### Component Tests
- [ ] Renders correct number of keys
- [ ] Clicking key fires onNoteOn callback
- [ ] Releasing key fires onNoteOff callback
- [ ] Active notes are highlighted correctly
- [ ] Disabled mode prevents interaction
- [ ] Labels display correctly when enabled

### Integration Tests
- [ ] Works with SimpleSynth
- [ ] Updates when player state changes
- [ ] Scales responsively in different containers

---

## 10. Implementation Plan

### Phase 1: Core Component (2-3 hours)
- [ ] Create component structure
- [ ] Implement key geometry utilities
- [ ] Render white keys
- [ ] Render black keys with proper positioning
- [ ] Basic styling

### Phase 2: Interaction (1-2 hours)
- [ ] Mouse down/up handlers
- [ ] Touch support
- [ ] Active state management
- [ ] onNoteOn/onNoteOff callbacks

### Phase 3: Visual Polish (1-2 hours)
- [ ] Color scheme and hover effects
- [ ] Active state highlighting
- [ ] Note labels
- [ ] Compact mode
- [ ] Responsive scaling

### Phase 4: Integration (1-2 hours)
- [ ] Add to InstrumentEditor
- [ ] Test with SimpleSynth
- [ ] Add to pattern player visualization (future)
- [ ] Documentation and examples

### Phase 5: Testing & Refinement (1-2 hours)
- [ ] Write unit tests
- [ ] Component testing
- [ ] Cross-browser testing
- [ ] Performance profiling

**Total Estimate:** 6-11 hours

---

## 11. Future Enhancements

### V2 Features
- [ ] Velocity sensitivity (based on click speed)
- [ ] MIDI input mapping
- [ ] Sustain pedal simulation
- [ ] Custom key colors/themes
- [ ] Animation on note trigger
- [ ] Multi-touch support for chords
- [ ] Visual feedback for ADSR envelope

### V3 Features
- [ ] Waveform visualization per key
- [ ] Pressure sensitivity (for supported devices)
- [ ] Record mode (capture played notes to pattern)
- [ ] Metronome click integration

---

## 12. Dependencies

### Required
- React (already in project)
- TypeScript (already in project)
- SimpleSynth (for audio playback)

### No Additional Dependencies
This component will use only:
- Plain CSS (no CSS-in-JS libraries)
- Standard React hooks
- Built-in DOM APIs

---

## 13. Open Questions

1. **Scaling Strategy**: Should we use CSS transform scale or dynamically adjust key widths?
   - **Decision**: Use fixed key widths with CSS transform scale for simplicity

2. **Touch Gesture Support**: How to handle multi-touch chord input?
   - **Decision**: V1 will support sequential touches, V2 will add simultaneous multi-touch

3. **Label Positioning**: Labels on white keys only, or black keys too?
   - **Decision**: White keys only (black keys are too narrow)

4. **Minimum Width**: What happens if container is too narrow?
   - **Decision**: Scale down proportionally with transform, show scrollbar if needed

---

## 14. Success Criteria

### Must Have (V1)
- ✅ Renders any note range (startNote to endNote)
- ✅ Clickable keys that fire onNoteOn/onNoteOff
- ✅ Visual feedback for active notes
- ✅ Correct piano keyboard layout (black keys properly positioned)
- ✅ Responsive sizing (fits in different containers)
- ✅ Works in InstrumentEditor

### Should Have (V1)
- ✅ Note labels on white keys
- ✅ Compact mode for smaller contexts
- ✅ Disabled mode for visualization only
- ✅ Smooth hover/active state transitions

### Nice to Have (V2)
- Keyboard navigation
- Touch gesture optimization
- Velocity sensitivity
- Animation effects

---

## 15. Risk Assessment

### Technical Risks
1. **Black Key Positioning**: Previous attempt had alignment issues
   - **Mitigation**: Use absolute positioning with calculated offsets, extensive testing

2. **Performance**: Many DOM elements (15+ keys per octave)
   - **Mitigation**: Memoization, CSS transforms, avoid unnecessary re-renders

3. **Responsive Scaling**: May look poor at extreme sizes
   - **Mitigation**: Define min/max size constraints, test at multiple breakpoints

### Timeline Risks
1. **Scope Creep**: Many "nice to have" features
   - **Mitigation**: Strict V1 scope, defer enhancements to V2/V3

2. **Integration Complexity**: Synth integration may be tricky
   - **Mitigation**: Use simple callback props, let parent handle audio

---

## 16. Approval Checklist

Before implementation:
- [ ] Design reviewed and approved
- [ ] API interface finalized
- [ ] Success criteria agreed upon
- [ ] Timeline acceptable
- [ ] No blocking technical concerns

Ready to proceed? Let's build it! 🎹
