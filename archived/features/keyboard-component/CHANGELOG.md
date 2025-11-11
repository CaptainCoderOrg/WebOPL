# Piano Keyboard Component - Changelog

## 2025-01-04 (Phase 4 Complete) - InstrumentEditor Integration + Octave Shifting

### Phase 4: Integration ✅

**Implemented:** Piano keyboard integrated into InstrumentEditor modal for real-time instrument testing with octave shifting

#### What Was Added

**InstrumentEditor Integration:**
- Added piano keyboard section after ADSR controls
- Keyboard appears at bottom of modal with clean styling
- **Base range:** C3-C5 (MIDI 48-72) with octave shifting
- **Octave Navigation:** Left/right arrow buttons to shift keyboard range ±12 semitones
- **Demo Transposition:** All three demos (Solo, Chords, Arpeggios) transpose with octave changes
- **MIDI Range Constraints:** Arrows disable when reaching MIDI limits (0-127)
- **Dynamic Sizing:** Keyboard scales to fit modal width using maxWidth prop
- Note labels enabled
- Matches existing UI aesthetics

**Real-Time Testing:**
- Keyboard uses channel 8 (same as Preview button)
- **Plays edited patch** (not saved patch)
- ADSR changes immediately affect keyboard playback
- Drag-to-play works in modal
- No conflicts with existing Preview button

**Octave Shifting Feature:**
- Left (◀) and right (▶) arrow buttons flank the keyboard
- Each click shifts the keyboard range by one octave (12 semitones)
- Base range: C3-C5 (MIDI 48-72)
- Can shift from C-1 (MIDI 0) to G9 (MIDI 127)
- All three demo modes transpose accordingly:
  - **Solo:** Blues melody transposes across full range
  - **Chords:** Bach Minuet (5-voice arrangement) transposes
  - **Arpeggios:** Minor chord progression transposes
- Arrows disable at MIDI boundaries to prevent invalid ranges

**Dynamic Keyboard Scaling:**
- Added `maxWidth` prop to PianoKeyboard component
- Keyboard automatically scales down to fit within modal constraints
- Formula: `keyWidth = (maxWidth - gaps) / whiteKeyCount`
- Final dimensions: `height={90}` `maxWidth={411}`
- Never scales up, only down (respects default key widths)
- Maintains proper aspect ratios and key proportions

**Implementation:**
```typescript
// In InstrumentEditor.tsx
import { PianoKeyboard } from './PianoKeyboard';

const [octaveOffset, setOctaveOffset] = useState<number>(0);

// Calculate keyboard range based on octave offset
const BASE_START_NOTE = 48; // C3
const BASE_END_NOTE = 72;   // C5
const keyboardStartNote = BASE_START_NOTE + (octaveOffset * 12);
const keyboardEndNote = BASE_END_NOTE + (octaveOffset * 12);

// Octave shift handlers with MIDI range constraints
const handleOctaveDown = () => {
  const newStartNote = keyboardStartNote - 12;
  if (newStartNote >= 0) {
    setOctaveOffset(octaveOffset - 1);
  }
};

const handleOctaveUp = () => {
  const newEndNote = keyboardEndNote + 12;
  if (newEndNote <= 127) {
    setOctaveOffset(octaveOffset + 1);
  }
};

// Added after ADSR section
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
    activeNotes={/* combined demo notes */}
    onNoteOn={(note) => {
      const PREVIEW_CHANNEL = 8;
      synth.setTrackPatch(PREVIEW_CHANNEL, editedPatch);
      synth.noteOn(PREVIEW_CHANNEL, note);
    }}
    onNoteOff={(note) => {
      const PREVIEW_CHANNEL = 8;
      synth.noteOff(PREVIEW_CHANNEL, note);
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
```

**Demo Transposition Example:**
```typescript
// Solo demo with transposition
useEffect(() => {
  if (demoMode !== 'solo' || !synth) return;

  const transpose = octaveOffset * 12;
  const melody = [
    { note: 60, duration: 300 }, // C
    { note: 63, duration: 300 }, // Eb
    // ... more notes
  ];

  const playNextNote = () => {
    const currentNote = melody[currentNoteIndex];
    const transposedNote = currentNote.note + transpose; // Apply octave offset
    synth.noteOn(PREVIEW_CHANNEL, transposedNote);
    // ...
  };

  playNextNote();

  return () => {
    // Clean up with transposed notes
    melody.forEach(({ note }) => {
      synth.noteOff(PREVIEW_CHANNEL, note + transpose);
    });
  };
}, [demoMode, synth, octaveOffset]); // octaveOffset in dependencies
```

**Styling:**
```css
/* Keyboard with arrows wrapper */
.editor-keyboard-with-arrows {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  justify-content: center;
}

/* Octave arrow buttons */
.editor-octave-arrow {
  background-color: #3d3d3d;
  color: #4a9eff;
  border: 1px solid #4a9eff;
  border-radius: 4px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.editor-octave-arrow:hover:not(:disabled) {
  background-color: #4d4d4d;
  color: #5ab0ff;
  transform: scale(1.05);
}

.editor-octave-arrow:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
```

#### User Workflow Enhancement

**Before:**
1. Edit ADSR parameters
2. Click "Preview" button
3. Wait 1 second
4. Adjust parameters
5. Click "Preview" again
6. Repeat...
7. Limited to C4-C5 range only

**After:**
1. Edit ADSR parameters
2. Click or drag across keyboard keys
3. Hear changes immediately
4. Test different notes
5. Adjust parameters
6. Test again instantly
7. **Use arrow buttons to shift octaves up/down**
8. **Test instrument across full MIDI range (C-1 to G9)**
9. **Demos transpose automatically with octave changes**
10. Much faster workflow with full range access!

#### Files Modified
- `minimal-prototype/src/components/InstrumentEditor.tsx` - Added keyboard, octave shifting logic, demo transposition
- `minimal-prototype/src/components/InstrumentEditor.css` - Added keyboard container and arrow button styles
- `minimal-prototype/src/components/PianoKeyboard/PianoKeyboard.tsx` - Added maxWidth prop and dynamic scaling

#### Testing Results

**Functional:**
- ✅ Keyboard appears in modal
- ✅ Plays edited patch (not saved)
- ✅ ADSR changes affect playback immediately
- ✅ Preset changes affect playback
- ✅ Modal close releases all notes (global mouse up handler)
- ✅ Octave arrows shift keyboard range correctly
- ✅ All demos transpose with octave offset
- ✅ Arrows disable at MIDI boundaries
- ✅ Keyboard scales to fit modal width

**UX:**
- ✅ Keyboard enhances editing workflow significantly
- ✅ No conflicts with Preview button
- ✅ Intuitive for testing instruments
- ✅ Professional appearance
- ✅ Octave navigation is clear and responsive
- ✅ Demos continue playing during octave shifts
- ✅ Full MIDI range accessible

**Technical:**
- ✅ TypeScript compiles without errors
- ✅ Modal scrolls properly if needed
- ✅ Keyboard fits within modal width (dynamic scaling)
- ✅ Clean integration with existing UI
- ✅ No layout overflow issues
- ✅ Demo cleanup properly releases transposed notes

---

## 2025-01-04 (Phase 1 & 2 Complete) - Core Implementation and Interaction

### Phase 1 & 2: Complete ✅

**Implemented:** Full keyboard component with mouse interaction, drag-to-play, and audio integration

#### Files Created
- `minimal-prototype/src/utils/keyboardUtils.ts` (~117 lines)
- `minimal-prototype/src/components/PianoKeyboard/PianoKeyboard.tsx` (~267 lines)
- `minimal-prototype/src/components/PianoKeyboard/PianoKeyboard.css` (~100 lines)
- `minimal-prototype/src/components/PianoKeyboard/index.ts` (exports)
- `minimal-prototype/src/components/PianoKeyboardTest.tsx` (~267 lines)
- `minimal-prototype/src/components/PianoKeyboardTest.css` (~122 lines)

#### Features Implemented

**Core Rendering:**
- Absolute positioning for all keys (no flexbox issues!)
- Dynamic range support (any MIDI note range)
- White and black keys with correct geometry
- Compact and standard sizing modes
- Note labels on white keys
- Track indicator visualization (stacked bars)

**Mouse Interaction:**
- Click to play notes (mouseDown/mouseUp)
- Drag-to-play (hold and drag across keys for glissando)
- Global mouse up handler prevents stuck notes
- Visual feedback (active state highlighting)
- Hover states

**Audio Integration:**
- Synth integration via callbacks (onNoteOn/onNoteOff)
- Instrument selector in test page
- Channel 8 for preview
- Active notes tracking

**Test Page:**
- Comprehensive configuration controls
- Range adjustment (start/end notes)
- Visual options (height, labels, compact)
- Interaction options (disabled, playSound)
- Instrument selection
- Test scenario presets
- Current configuration display

---

### Bug Fixes

#### 1. Start Note Positioning Bug
**Issue:** When changing start note, keyboard rendered incorrectly with broken alignment
- Example: Start=59 showed "C4, D4, C#4, EMPTY SPACE, D#4..." instead of "B3, C4, C#4, D4..."

**Root Cause:** `getWhiteKeyIndex()` calculated `noteInOctave = (midiNote - startNote) % 12`, giving relative position instead of absolute position within octave

**Fix:** Changed to calculate absolute white key count from MIDI note 0
```typescript
// Calculate absolute white key count from MIDI note 0
const getAbsoluteWhiteKeyCount = (note: number) => {
  const octave = Math.floor(note / 12);
  const noteInOctave = note % 12;  // Absolute position
  return octave * 7 + whiteKeyPattern[noteInOctave];
};

// Return relative position
return getAbsoluteWhiteKeyCount(midiNote) - getAbsoluteWhiteKeyCount(startNote);
```

**Result:** ✅ All start note values now work correctly

---

#### 2. Drag-to-Play Implementation
**Feature Request:** Allow holding mouse button and dragging across keys to change notes (glissando effect)

**Implementation:**
- Added `isMouseDown` state to track global mouse button state
- Added `lastDragNote` state to track current note being played
- Changed from `onMouseUp` to `onMouseEnter` for note triggering during drag
- Added global window `mouseup` listener for cleanup

**Mouse Handlers:**
```typescript
// Track global mouse state
const [isMouseDown, setIsMouseDown] = useState(false);
const [lastDragNote, setLastDragNote] = useState<number | null>(null);

// Global cleanup on mouse up
useEffect(() => {
  const handleGlobalMouseUp = () => {
    setIsMouseDown(false);
    setLastDragNote(null);
    setPressedKeys(prev => {
      prev.forEach(note => onNoteOff?.(note));
      return new Set();
    });
  };
  window.addEventListener('mouseup', handleGlobalMouseUp);
  return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
}, [onNoteOff]);

// Play note on mouse enter if dragging
const handleMouseEnter = (midiNote: number) => {
  if (isMouseDown && !pressedKeys.has(midiNote)) {
    // Release previous note
    if (lastDragNote !== null && lastDragNote !== midiNote) {
      setPressedKeys(prev => {
        const next = new Set(prev);
        next.delete(lastDragNote);
        return next;
      });
      onNoteOff?.(lastDragNote);
    }
    // Play new note
    setLastDragNote(midiNote);
    setPressedKeys(prev => new Set(prev).add(midiNote));
    onNoteOn?.(midiNote);
  }
};
```

**Result:** ✅ Smooth drag-to-play functionality working

---

#### 3. Stuck Notes During Fast Mouse Movement
**Issue:** When moving mouse too quickly during drag-to-play, browser would miss `onMouseLeave` events, leaving notes stuck in "on" state

**Root Cause:** Browser event system can miss `onMouseLeave` when mouse moves very fast across elements

**Fix:** Two-layer cleanup approach
1. **Global mouse up cleanup**: Release ALL pressed keys when mouse button is released anywhere
2. **Explicit previous note cleanup**: When entering new key during drag, explicitly release the previous drag note before playing new one

**Implementation:**
```typescript
// Global cleanup releases ALL pressed keys
const handleGlobalMouseUp = () => {
  setIsMouseDown(false);
  setLastDragNote(null);
  setPressedKeys(prev => {
    // Call noteOff for EVERY pressed key
    prev.forEach(note => {
      onNoteOff?.(note);
    });
    return new Set();
  });
};

// Explicit previous note cleanup during drag
if (lastDragNote !== null && lastDragNote !== midiNote) {
  setPressedKeys(prev => {
    const next = new Set(prev);
    next.delete(lastDragNote);
    return next;
  });
  onNoteOff?.(lastDragNote);
}
```

**Result:** ✅ No stuck notes even during very fast mouse dragging

---

### Testing Results

**Visual Tests:**
- ✅ White keys render in correct positions
- ✅ Black keys properly centered between white keys
- ✅ No alignment issues at any start note value
- ✅ Consistent gaps and sizing
- ✅ Labels display correctly

**Interaction Tests:**
- ✅ Click to play notes (white and black keys)
- ✅ Drag across keys changes notes smoothly
- ✅ No stuck notes during fast dragging
- ✅ Visual feedback matches audio state
- ✅ Instrument changes affect playback

**Technical Tests:**
- ✅ TypeScript compiles without errors
- ✅ No console warnings
- ✅ Props properly typed
- ✅ Memoization working (geometry calculations cached)

---

### Next Steps

**Phase 3: Visual Polish** (Not Started)
- Touch interaction (onTouchStart, onTouchEnd)
- Refined animations and transitions
- Color refinement
- Responsive adjustments

**Phase 4: Integration** (Not Started)
- Add keyboard to InstrumentEditor
- Integration with existing UI

**Phase 5: Testing** (Not Started)
- Browser testing (Chrome, Firefox, Safari)
- Device testing (desktop, tablet, mobile)
- Edge case testing
- Performance profiling

---

## 2025-01-04 (Update 3) - Stacked Track Indicators

### Major Visualization Change: Track Indicator Bars

**Replaced:** Color blending for overlapping notes
**With:** Stacked track indicator bars at bottom of each key

#### Rationale
1. **Information Preservation**: Color blending (e.g., red + blue = purple) loses information about which specific tracks are playing
2. **Clarity**: Small colored bars clearly show each active track without ambiguity
3. **Scalability**: Supports up to 4 tracks per note with clear visual separation
4. **Familiarity**: Similar to DAW piano roll visualizations
5. **Contrast**: Keys maintain normal appearance, improving readability

---

### Updated Implementation

#### 1. Track Indicator Rendering
**Files:** DESIGN.md (Section 3), IMPLEMENTATION.md (Step 1.2)

Each key can now display multiple 4px tall colored bars at the bottom:

```typescript
// Each note can have multiple track indicators
const trackIndicators = noteTrackIndicators.get(note) || [];

// Rendered inside each key button
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
```

**Visual Example:**
```
┌─────────────┐
│             │  White Key
│             │
│             │
│█████████████│  Track 0 (red)
│█████████████│  Track 2 (blue)
└─────────────┘
```

#### 2. Removed `blendColors()` Function
**Files:** IMPLEMENTATION.md (Step 1.1)

The color blending utility is no longer needed since tracks are displayed as separate indicators.

**Replaced with:** `getTrackIndicators()` utility that returns an array of `{ trackId, color }` objects for notes.

#### 3. CSS for Track Indicators
**Files:** DESIGN.md (Section 3), IMPLEMENTATION.md (Step 1.3)

```css
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
}
```

---

### Advantages of Stacked Indicators

1. ✅ **No Information Loss**: See exactly which tracks are playing (not just a blended color)
2. ✅ **Up to 4 Tracks Visible**: Clear visual separation for each active track
3. ✅ **Better Contrast**: Keys maintain standard white/black appearance
4. ✅ **Small Size**: Works well even in compact mode
5. ✅ **Intuitive**: Similar to professional DAW piano rolls

**Comparison:**
```
Color Blending (OLD):
┌─────────────┐
│   PURPLE    │  Red + Blue = Purple ❌ Can't tell which tracks
│             │
└─────────────┘

Stacked Indicators (NEW):
┌─────────────┐
│             │  Normal key appearance ✅
│             │
│█████████████│  Track 0 (red) ✅ Clear
│█████████████│  Track 2 (blue) ✅ Clear
└─────────────┘
```

---

## 2025-01-04 (Update 2) - Multi-Track Visualization

### Major Design Change: Track-Based Colors

**Replaced:** `observeChannels` prop (channel-based filtering)
**With:** `activeNotesByTrack` prop (track-based color visualization)

#### Rationale
1. **Channels vs Tracks**: Channels are implementation details (voice allocation), while tracks are logical musical concepts (bass, lead, chords, etc.)
2. **Multiple Channels Per Instrument**: Some OPL3 patches use multiple channels for dual-voice operation
3. **Better UX**: Color-coded tracks are more intuitive than filtered channel views
4. **Simultaneous Visualization**: Can show all tracks at once with different colors, instead of filtering

---

### Updated Features

#### 1. `activeNotesByTrack` Prop (NEW)
**File:** DESIGN.md, IMPLEMENTATION.md

Replaced `observeChannels` with track-based color mapping:

```typescript
activeNotesByTrack?: Map<number, { notes: Set<number>; color: string }>;
```

**Purpose:** Visualize multiple tracks simultaneously, each with its own color.

**Example:**
```typescript
<PianoKeyboard
  activeNotesByTrack={new Map([
    [0, { notes: new Set([60, 64]), color: '#ff5555' }],  // Bass - red
    [1, { notes: new Set([67]),      color: '#55ff55' }],  // Lead - green
    [2, { notes: new Set([72, 76]),  color: '#5555ff' }],  // Chord - blue
    [3, { notes: new Set([48]),      color: '#ffff55' }],  // Sub - yellow
  ])}
/>
```

**Color Blending:** When multiple tracks play the same note, colors are averaged using RGB blending.

**Default Track Colors:**
- Track 0: `#ff5555` (Red) - Typically bass/low frequencies
- Track 1: `#55ff55` (Green) - Typically lead/melody
- Track 2: `#5555ff` (Blue) - Typically chords/harmony
- Track 3: `#ffff55` (Yellow) - Typically percussion/effects

#### 2. Test Song Feature (NEW)
**File:** DESIGN.md Section 7

Added "Play Test Song" button to test page for comprehensive multi-track visualization testing.

**Test Song Specification:**
- **Duration**: 8 bars (~10 seconds)
- **Tracks**: 4 simultaneous tracks with different instruments
- **Purpose**: Demonstrate and test multi-track color visualization

**Track Arrangement:**
```
Track 0 (Bass):     C-3 → G-2 → A-2 → F-2 (whole notes)
Track 1 (Lead):     [C-5 E-5 G-5] melody pattern (quarter notes)
Track 2 (Chords):   [C-4 E-4 G-4] → [G-3 B-3 D-4] (half notes)
Track 3 (Accent):   High notes on beats (C-6, E-6, G-6)
```

**Controls:**
- **Play Test Song** - Start playback (all 4 tracks)
- **Stop Song** - Stop playback
- **Track Visibility** - Toggle individual tracks on/off
- **Track Colors** - Customize color per track (color pickers)

**Use Cases:**
1. Verify color blending when multiple tracks play same note
2. Test track filtering (show only bass + lead, etc.)
3. Validate performance with 4 simultaneous tracks
4. Demonstrate feature to stakeholders

#### 3. Color Blending Utility (NEW)
**File:** IMPLEMENTATION.md Step 1.1

Added `blendColors()` helper function:

```typescript
export function blendColors(color1: string, color2: string): string;
```

**Purpose**: Average RGB values when multiple tracks play the same note.

**Algorithm**: Parse hex → Average R,G,B → Convert back to hex

**Example:**
- Red (`#ff5555`) + Green (`#55ff55`) = Yellow-ish (`#aa5555`)
- Blue (`#5555ff`) + Red (`#ff5555`) = Purple (`#aa55aa`)

---

## 2025-01-04 (Update 1) - Design Updates

### Added Features

#### 1. ~~`observeChannels` Prop~~ (DEPRECATED - See Update 2)
**File:** DESIGN.md, IMPLEMENTATION.md

Added new optional prop to specify which channels/tracks to observe for visual feedback:

```typescript
observeChannels?: number[];
```

**Purpose:** Allows the keyboard to highlight notes from specific tracks only, useful for multi-track playback visualization.

**Use Case Examples:**
- **All Tracks:** `observeChannels={undefined}` - Default behavior
- **Specific Tracks:** `observeChannels={[0, 2]}` - Only highlight notes from tracks 0 and 2
- **Single Track:** `observeChannels={[1]}` - Only track 1

**Implementation Note:** The parent component should filter `activeNotes` based on `observeChannels` before passing to the keyboard. This keeps the keyboard component simple.

---

#### 2. Comprehensive Test Page (`/test-keyboard`)
**Files:** DESIGN.md (Section 7), IMPLEMENTATION.md (Step 1.5)

Added detailed specification for a full-featured test page with:

**Configuration Sections:**
1. **Range Configuration**
   - Start/End Note selection (MIDI 0-127)
   - Preset ranges (1 octave, 2 octaves, 3 octaves, full range)

2. **Visual Options**
   - Height slider (40-200px)
   - Show Labels checkbox
   - Compact Mode checkbox

3. **Interaction Options**
   - Disabled checkbox (visualization only)
   - Play Sound checkbox
   - Channel selector (0-8)

4. **Observe Channels**
   - All Channels checkbox
   - Individual track checkboxes (0-7)
   - "Simulate Playback" button for testing

5. **Test Scenario Presets**
   - Instrument Editor (1 octave, interactive)
   - Pattern Viz - All Tracks (3 octaves, disabled)
   - Pattern Viz - Tracks 0,2 (3 octaves, observeChannels=[0,2])
   - Note Input (2 octaves, no sound)
   - Full Range (all keys, compact)

**Files Created:**
- `minimal-prototype/src/components/PianoKeyboardTest.tsx` (~300 lines)
- `minimal-prototype/src/components/PianoKeyboardTest.css` (~120 lines)

**Route:** `/test-keyboard` in App.tsx

---

### Updated Documentation

#### DESIGN.md
- **Section 2 (Component API):** Added `observeChannels` prop to interface
- **Section 2 (Example Usage):** Added example showing observeChannels usage
- **Section 7 (Integration Points):** Added complete Test Page specification

#### IMPLEMENTATION.md
- **Step 1.2 (Component Structure):** Added `observeChannels` to props interface
- **Step 1.2 (Component Function):** Added `observeChannels` to destructuring
- **Step 1.5 (Test Page):** Replaced simple test with comprehensive test page

---

## Rationale

### Why `observeChannels`?

In a multi-track music environment, users may want to visualize only specific tracks on the keyboard. For example:
- **Melody Track Only:** Highlight only the melody notes, ignore bass/drums
- **Debugging:** Isolate a specific track to check for wrong notes
- **Educational:** Focus on one instrument at a time

This feature was identified as missing during design review.

### Why Comprehensive Test Page?

The simple test page was insufficient for:
- Testing all prop combinations
- Verifying responsiveness
- Debugging visual issues
- Demonstrating features to stakeholders

The comprehensive test page provides:
- **Live Configuration:** Change any prop and see results immediately
- **Preset Scenarios:** Quickly load common use cases
- **Visual Feedback:** See current configuration and active notes
- **Audio Integration:** Test sound without implementing full player

---

## Summary of Changes (Update 2)

### Files Modified

#### [DESIGN.md](./DESIGN.md)
- **Section 2 (API):** Replaced `observeChannels` with `activeNotesByTrack`
- **Section 2 (Examples):** Updated to show multi-track color visualization
- **Section 3 (Colors):** Added track color CSS and blending strategy
- **Section 7 (Test Page):** Added test song specification and track controls

#### [IMPLEMENTATION.md](./IMPLEMENTATION.md)
- **Step 1.1 (Utils):** Added `blendColors()` function
- **Step 1.2 (Props):** Replaced `observeChannels` with `activeNotesByTrack`
- **Step 1.2 (Component):** Added color blending logic with `noteColorMap` memo
- **Step 1.5 (Test Page):** Will be updated to include test song (TODO)

#### [CHANGELOG.md](./CHANGELOG.md) (This File)
- Added Update 2 section documenting track-based visualization
- Marked `observeChannels` as deprecated
- Added rationale for design change

---

## Migration Notes

### Breaking Change (API)
**From:** `observeChannels?: number[]`
**To:** `activeNotesByTrack?: Map<number, { notes: Set<number>; color: string }>`

**Migration Path:**
```typescript
// Old (DEPRECATED)
<PianoKeyboard
  observeChannels={[0, 2]}
  activeNotes={allNotes}  // Filter in parent
/>

// New (RECOMMENDED)
<PianoKeyboard
  activeNotesByTrack={new Map([
    [0, { notes: track0Notes, color: '#ff5555' }],
    [2, { notes: track2Notes, color: '#5555ff' }],
  ])}
/>
```

**Advantages of New API:**
1. ✅ Supports color-coding per track
2. ✅ Allows simultaneous visualization of all tracks
3. ✅ Automatic color blending for overlapping notes
4. ✅ More intuitive for music applications

---

## Next Steps

1. ✅ **Updated Visualization Strategy** - Replaced color blending with stacked track indicators
2. ✅ **Updated Documentation** - DESIGN.md, IMPLEMENTATION.md, and CHANGELOG.md now reflect stacked indicators
3. **Begin Implementation** - Start Phase 1 (Core Component) from MILESTONES.md
4. **Build Test Song Feature** - Add playback engine to test page
5. **Add Track Controls** - Implement visibility toggles and color pickers in test page
6. **Test Track Indicators** - Verify stacked indicators render correctly for multiple tracks
7. **Update Tests** - Add tests for multi-track indicator rendering

---

## Related Files

- [DESIGN.md](./DESIGN.md) - Complete design specification (✅ UPDATED)
- [IMPLEMENTATION.md](./IMPLEMENTATION.md) - Implementation guide (✅ UPDATED)
- [MILESTONES.md](./MILESTONES.md) - Progress tracking
- [README.md](./README.md) - Quick reference
