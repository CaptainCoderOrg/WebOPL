# Piano Keyboard Component - Changelog

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
