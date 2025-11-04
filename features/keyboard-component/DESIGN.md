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

  /** Maximum width in pixels (keyboard will scale to fit, never scale up) */
  maxWidth?: number;

  /** Currently active notes from user interaction (highlighted in default color) */
  activeNotes?: Set<number>;

  /**
   * Active notes by track with color mapping
   * Map of track ID -> { notes: Set<number>, color: string }
   * Each track's notes are rendered with its specified color
   * Useful for multi-track playback visualization
   *
   * Example:
   * activeNotesByTrack={new Map([
   *   [0, { notes: new Set([60, 64]), color: '#ff5555' }],  // Track 0: red
   *   [1, { notes: new Set([67, 72]), color: '#55ff55' }],  // Track 1: green
   * ])}
   */
  activeNotesByTrack?: Map<number, { notes: Set<number>; color: string }>;

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
// Instrument Editor - 1 octave preview with octave shifting
<PianoKeyboard
  startNote={48 + (octaveOffset * 12)}  // C-3 base (shiftable)
  endNote={72 + (octaveOffset * 12)}    // C-5 base (shiftable)
  height={90}
  maxWidth={411}  // Scale to fit modal constraints
  showLabels={true}
  compact={true}
  onNoteOn={(note) => synth.noteOn(8, note)}
  onNoteOff={(note) => synth.noteOff(8, note)}
/>

// Pattern Player - multi-track visualization with colors
<PianoKeyboard
  startNote={48}   // C-3
  endNote={84}     // C-6
  activeNotesByTrack={new Map([
    [0, { notes: new Set([60, 64]), color: '#ff5555' }],  // Bass - red
    [1, { notes: new Set([67]),      color: '#55ff55' }],  // Lead - green
    [2, { notes: new Set([72, 76]),  color: '#5555ff' }],  // Chord - blue
    [3, { notes: new Set([48]),      color: '#ffff55' }],  // Sub - yellow
  ])}
  height={60}
  compact={true}
  disabled={true}  // Visualization only
/>

// Pattern Player - show only specific tracks
<PianoKeyboard
  startNote={48}
  endNote={84}
  activeNotesByTrack={new Map([
    [0, { notes: trackNotes[0], color: '#ff5555' }],  // Only bass
    [2, { notes: trackNotes[2], color: '#5555ff' }],  // Only chord
  ])}
  height={60}
  compact={true}
  disabled={true}
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

/* Default Track Colors */
/* Used when rendering multiple tracks simultaneously */
:root {
  --track-0-color: #ff5555; /* Red - typically bass/low */
  --track-1-color: #55ff55; /* Green - typically lead/melody */
  --track-2-color: #5555ff; /* Blue - typically chords/harmony */
  --track-3-color: #ffff55; /* Yellow - typically percussion/effects */
}

/* Track Indicator Bars */
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
```

**Rendering Strategy for Track Visualization:**

Instead of changing the key's background color, each active track displays a **small colored indicator bar** on the key.

**Visual Design:**
- Each key maintains its normal appearance (white/black)
- Active tracks shown as colored rectangles at bottom of key
- Each track gets its own indicator (4px tall, full key width)
- Multiple tracks stack vertically
- Maximum 4 indicators per key (one per track)

**Example:**
```
┌─────────────┐
│             │  White Key
│             │
│             │
│█████████████│  Track 0 indicator (red, 4px tall)
│█████████████│  Track 2 indicator (blue, 4px tall)
└─────────────┘

┌──────┐
│      │  Black Key
│      │
│██████│  Track 1 indicator (green)
│██████│  Track 3 indicator (yellow)
└──────┘
```

**Advantages:**
1. ✅ See exactly which tracks are playing (no information loss)
2. ✅ Up to 4 tracks clearly visible per note
3. ✅ Key appearance unchanged (better contrast)
4. ✅ Works well at small sizes
5. ✅ Intuitive - similar to DAW piano rolls

**User-Pressed Keys:**
- Still use full-key highlight color (#4a9eff / #ffc800)
- Track indicators appear on top of user highlight
- Clear distinction between user input and playback visualization
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
```

### State Management

```typescript
const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());

// User-pressed keys (for standard highlight)
const displayedActiveKeys = new Set([
  ...pressedKeys,
  ...(activeNotes || [])
]);

// Track indicators (for multi-track visualization)
// Calculate which track indicators to show for each note
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
- Base range: C-3 to C-5 (MIDI 48-72)
- Octave shifting with left/right arrow buttons
- Can access full MIDI range 0-127 via octave shifts
- Full labels
- Compact size (90px height, maxWidth 411px)
- Preview mode (plays to channel 8)
- Demo modes (Solo, Chords, Arpeggios) transpose with octave

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

### Test Page (`/test-keyboard`)
- **Purpose**: Comprehensive testing and demonstration of all keyboard features
- **Location**: `minimal-prototype/src/components/PianoKeyboardTest.tsx`
- **Route**: `/test-keyboard` in App.tsx

**Features:**
- Configuration panel at top of page
- Live keyboard with all props configurable
- Audio integration for testing sound
- Multiple test scenarios (presets)

**Configuration Options:**
```typescript
// Range Configuration
- Start Note: Dropdown or number input (C-0 to B-9)
- End Note: Dropdown or number input (C-0 to B-9)
- Preset Ranges: [1 Octave, 2 Octaves, 3 Octaves, Full Range]

// Visual Options
- Height: Slider (40-200px)
- Show Labels: Checkbox
- Compact Mode: Checkbox

// Interaction Options
- Disabled: Checkbox (visualization only)
- Play Sound: Checkbox (enable/disable audio)
- Channel: Dropdown (0-8, which channel to play on)

// Multi-Track Visualization
- Track 0: [Checkbox: Visible] [Color Picker: #ff5555 red]
- Track 1: [Checkbox: Visible] [Color Picker: #55ff55 green]
- Track 2: [Checkbox: Visible] [Color Picker: #5555ff blue]
- Track 3: [Checkbox: Visible] [Color Picker: #ffff55 yellow]
- "Play Test Song" Button - Plays 8-bar demo with 4 tracks
- "Stop Song" Button - Stops playback
- Active Notes Display: Shows currently active notes per track

// Test Song (8 bars, 4 tracks, ~10 seconds)
Track 0 (Bass):     C-3 → G-2 → A-2 → F-2 (whole notes)
Track 1 (Lead):     [C-5 E-5 G-5] melody pattern (quarter notes)
Track 2 (Chords):   [C-4 E-4 G-4] → [G-3 B-3 D-4] (half notes)
Track 3 (Accent):   High notes on beats (C-6, E-6, G-6)

// Test Scenarios (Preset Buttons)
1. "Instrument Editor" - 1 octave, labels, interactive
2. "Multi-Track Viz" - 3 octaves, compact, all tracks visible with colors
3. "Bass + Lead Only" - 3 octaves, compact, tracks 0 & 1 visible
4. "Note Input" - 2 octaves, labels, interactive
5. "Full Range" - All keys, compact, interactive
```

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│  Piano Keyboard Test                                 │
│  ┌────────────────────────────────────────────────┐  │
│  │ Configuration Panel                            │  │
│  │ [Range] [Visual] [Interaction] [Tracks]       │  │
│  │ [▶ Play Test Song] [⏹ Stop] [Presets...]     │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │ Track Visualization Controls                   │  │
│  │ ☑ Track 0 [🔴] Bass    ☑ Track 1 [🟢] Lead    │  │
│  │ ☑ Track 2 [🔵] Chords  ☑ Track 3 [🟡] Accent  │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │ PianoKeyboard Component                        │  │
│  │ ░🔴░🟢░🔵░🟡░ (colored keys showing tracks)    │  │
│  │ ████████████████████████████████████████████  │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  Current Configuration:                               │
│  • Range: C3-C6 (37 keys)                            │
│  • Height: 60px • Compact: Yes • Labels: No          │
│  • Visible Tracks: [0, 1, 2, 3]                      │
│                                                       │
│  Active Notes by Track:                               │
│  • Track 0 (🔴): [48, 55]                            │
│  • Track 1 (🟢): [72, 76, 79]                        │
│  • Track 2 (🔵): [60, 64, 67]                        │
│  • Track 3 (🟡): [84]                                 │
└──────────────────────────────────────────────────────┘
```

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

## 9. Testing Strategy & Test Page

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
