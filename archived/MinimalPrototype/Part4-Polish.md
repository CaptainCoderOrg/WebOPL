# Part 4: Polish - Validation, Shortcuts & UX

## Objective

Add final touches to make the tracker polished and user-friendly: validation, keyboard shortcuts, visual feedback, and bug fixes.

**Time Estimate:** 1-2 hours

**Prerequisites:**
- ✅ Part 1, 2, 3 completed
- ✅ Tracker plays and edits correctly

**Success Criteria:**
- ✅ Invalid notes show visual feedback
- ✅ Space bar play/stop works
- ✅ Loading state displays
- ✅ Error handling prevents crashes
- ✅ All edge cases handled
- ✅ No console warnings
- ✅ Professional UX

---

## What We're Adding

### Features

1. **Pattern Validation**
   - Detect invalid note names
   - Visual feedback (red highlighting)
   - Prevent playback of invalid patterns

2. **Keyboard Shortcuts**
   - Space bar: Play/Stop
   - Prevents conflicts with grid editing

3. **Visual Feedback**
   - Invalid notes highlighted in red
   - Loading spinner during init
   - Better button states

4. **Error Handling**
   - Graceful audio init failures
   - BPM validation
   - Pattern edge cases

5. **UX Improvements**
   - Auto-focus grid on load
   - Better placeholder text
   - Improved accessibility

---

## Step-by-Step Implementation

### Step 1: Create Pattern Validation Utilities

**File:** `src/utils/patternValidation.ts`

**Full Code:**

```typescript
/**
 * Pattern Validation Utilities
 */

import { isValidNoteName } from './noteConversion';

export interface ValidationError {
  row: number;
  track: number;
  value: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate entire pattern
 * @param pattern - 2D array of note strings
 * @returns Validation result with errors
 */
export function validatePattern(pattern: string[][]): ValidationResult {
  const errors: ValidationError[] = [];

  pattern.forEach((row, rowIndex) => {
    row.forEach((cell, trackIndex) => {
      // Skip empty cells (they're valid rests)
      if (!cell || cell.trim() === '') {
        return;
      }

      // Check if note is valid
      if (!isValidNoteName(cell)) {
        errors.push({
          row: rowIndex,
          track: trackIndex,
          value: cell,
          message: `Invalid note: "${cell}"`,
        });
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a single note
 * @param note - Note string to validate
 * @returns True if valid note or rest
 */
export function validateNote(note: string): boolean {
  if (!note || note.trim() === '' || note === '---') {
    return true; // Rest is valid
  }

  return isValidNoteName(note);
}

/**
 * Get validation error message for display
 * @param errors - Array of validation errors
 * @returns Formatted error message
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return '';
  }

  const lines = errors.map((err) => {
    const rowStr = (err.row + 1).toString().padStart(2, '0');
    const trackStr = (err.track + 1).toString();
    return `Row ${rowStr}, Track ${trackStr}: ${err.message}`;
  });

  return lines.slice(0, 5).join('\n') +
    (errors.length > 5 ? `\n... and ${errors.length - 5} more errors` : '');
}
```

---

### Step 2: Update TrackerGrid with Validation

**File:** `src/components/TrackerGrid.tsx` (update existing)

**Add validation to existing code:**

```typescript
// At top, add import:
import { validateNote } from '../utils/patternValidation';

// Update the component:
export function TrackerGrid({
  rows,
  tracks,
  pattern,
  onUpdate,
  currentRow,
}: TrackerGridProps) {
  /**
   * Check if a note is invalid
   */
  const isInvalidNote = (note: string): boolean => {
    // Empty or rest is valid
    if (!note || note === '---' || note.trim() === '') {
      return false;
    }

    return !validateNote(note);
  };

  // ... rest of existing code ...

  // In the input element, update className:
  <input
    type="text"
    value={pattern[row][track]}
    onChange={(e) => handleCellChange(row, track, e.target.value)}
    onKeyDown={(e) => handleKeyDown(e, row, track)}
    onFocus={(e) => e.target.select()}
    maxLength={4}
    className={`note-input ${isInvalidNote(pattern[row][track]) ? 'invalid' : ''}`}
    placeholder="---"
    data-row={row}
    data-track={track}
    title={
      isInvalidNote(pattern[row][track])
        ? `Invalid note: ${pattern[row][track]}`
        : ''
    }
  />
```

**The CSS for `.note-input.invalid` already exists in TrackerGrid.css, so invalid notes will show in red.**

---

### Step 3: Add Keyboard Shortcuts

**File:** `src/App.tsx` (add to existing)

**Add useEffect for global keyboard handling:**

```typescript
// Add after other useEffect hooks:

/**
 * Global keyboard shortcuts
 */
useEffect(() => {
  const handleGlobalKeyDown = (e: KeyboardEvent) => {
    // Only handle if not focused on an input
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

    if (isInput) {
      // Don't interfere with note entry
      return;
    }

    // Space bar: Toggle play/stop
    if (e.code === 'Space') {
      e.preventDefault();
      if (isReady && player) {
        handlePlayStop();
      }
    }

    // Escape: Stop playback
    if (e.code === 'Escape' && isPlaying) {
      e.preventDefault();
      handlePlayStop();
    }
  };

  document.addEventListener('keydown', handleGlobalKeyDown);

  return () => {
    document.removeEventListener('keydown', handleGlobalKeyDown);
  };
}, [isReady, isPlaying, player]); // Dependencies
```

**Add to help section:**

```typescript
// In help section, add new column or section:
<div>
  <h4>Keyboard Shortcuts:</h4>
  <ul>
    <li><strong>Space:</strong> Play/Stop (when not editing)</li>
    <li><strong>Escape:</strong> Stop playback</li>
  </ul>
</div>
```

---

### Step 4: Add Pattern Validation Before Playback

**File:** `src/App.tsx` (update handlePlayStop function)

```typescript
import { validatePattern, formatValidationErrors } from './utils/patternValidation';

// Update handlePlayStop function:
const handlePlayStop = () => {
  if (!player) return;

  if (isPlaying) {
    // Stop
    player.stop();
    setIsPlaying(false);
    setCurrentRow(0);
  } else {
    // Validate pattern before playing
    const validation = validatePattern(pattern);

    if (!validation.valid) {
      console.error('Pattern validation failed:', validation.errors);

      // Show error to user
      const errorMessage = formatValidationErrors(validation.errors);
      alert(
        'Cannot play: Pattern contains invalid notes\n\n' + errorMessage
      );
      return;
    }

    console.log('--- Converting pattern to tracker format ---');
    console.log('✅ Pattern validation passed');

    // Convert string pattern to TrackerPattern
    const trackerPattern: TrackerPattern = {
      bpm: bpm,
      stepsPerBeat: 4,
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
```

---

### Step 5: Add Loading State

**File:** `src/App.tsx` (update initialization display)

**Replace the return statement to show loading UI:**

```typescript
function App() {
  // ... existing state ...

  // Add error state
  const [initError, setInitError] = useState<string | null>(null);

  // Update init useEffect to set error:
  useEffect(() => {
    const init = async () => {
      try {
        console.log('=== Initializing WebOrchestra ===');

        const s = new SimpleSynth();
        await s.init();
        setSynth(s);

        const p = new SimplePlayer(s);
        p.setOnRowChange((row) => {
          setCurrentRow(row);
        });
        setPlayer(p);

        setIsReady(true);
        console.log('=== Ready! ===');
      } catch (error) {
        console.error('Initialization failed:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        setInitError(errorMsg);
      }
    };

    init();
  }, []);

  // Show loading/error screen if not ready
  if (!isReady) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <h1>🎵 WebOrchestra</h1>

          {initError ? (
            <>
              <div className="error-icon">❌</div>
              <h2>Initialization Failed</h2>
              <p className="error-message">{initError}</p>
              <button onClick={() => window.location.reload()}>
                Retry
              </button>
            </>
          ) : (
            <>
              <div className="loading-spinner"></div>
              <p>Initializing audio engine...</p>
              <p className="loading-subtext">
                Loading OPL3 synthesizer and Web Audio API
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ... rest of existing return statement ...
```

---

### Step 6: Add Loading Screen Styles

**File:** `src/App.css` (add at end)

```css
/* Loading Screen */
.loading-screen {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #0a0a0a;
}

.loading-content {
  text-align: center;
  padding: 40px;
}

.loading-content h1 {
  color: #00ff00;
  font-size: 36px;
  margin-bottom: 30px;
}

.loading-content h2 {
  color: #ff4444;
  font-size: 24px;
  margin: 20px 0;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid #333;
  border-top-color: #00ff00;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 30px auto;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-content p {
  font-size: 18px;
  color: #aaa;
  margin: 15px 0;
}

.loading-subtext {
  font-size: 14px !important;
  color: #666 !important;
}

.error-icon {
  font-size: 64px;
  margin: 20px 0;
}

.error-message {
  font-family: monospace;
  color: #ff4444;
  background-color: #1a0000;
  padding: 15px;
  border: 1px solid #ff0000;
  border-radius: 4px;
  margin: 20px 0;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

.loading-content button {
  margin-top: 20px;
  padding: 12px 24px;
  font-size: 16px;
}
```

---

### Step 7: Add BPM Validation

**File:** `src/App.tsx` (update BPM input handler)

```typescript
// Update BPM handling:
const handleBPMChange = (value: string) => {
  const num = parseInt(value, 10);

  // Allow empty or invalid while typing
  if (isNaN(num)) {
    setBpm(120); // Reset to default
    return;
  }

  // Clamp to valid range
  if (num < 60) {
    setBpm(60);
  } else if (num > 240) {
    setBpm(240);
  } else {
    setBpm(num);
  }
};

// In JSX, update BPM input:
<input
  type="number"
  value={bpm}
  onChange={(e) => handleBPMChange(e.target.value)}
  min={60}
  max={240}
  disabled={isPlaying}
  className="bpm-input"
/>
```

---

### Step 8: Add Empty Pattern Warning

**File:** `src/App.tsx` (add check in handlePlayStop)

```typescript
const handlePlayStop = () => {
  if (!player) return;

  if (isPlaying) {
    // Stop
    player.stop();
    setIsPlaying(false);
    setCurrentRow(0);
  } else {
    // Check if pattern is completely empty
    const hasNotes = pattern.some(row =>
      row.some(cell => cell !== '---' && cell.trim() !== '')
    );

    if (!hasNotes) {
      console.warn('Pattern is empty');
      alert('Pattern is empty!\n\nLoad an example or enter some notes.');
      return;
    }

    // Validate pattern before playing
    const validation = validatePattern(pattern);

    if (!validation.valid) {
      // ... existing validation code ...
    }

    // ... rest of play logic ...
  }
};
```

---

### Step 9: Add Auto-Focus to Grid

**File:** `src/components/TrackerGrid.tsx` (add useEffect)

```typescript
import React, { useEffect } from 'react';

// Add inside TrackerGrid component:
useEffect(() => {
  // Auto-focus first cell on mount
  const firstInput = document.querySelector(
    'input[data-row="0"][data-track="0"]'
  ) as HTMLInputElement;

  if (firstInput) {
    // Delay to ensure render complete
    setTimeout(() => {
      firstInput.focus();
      firstInput.select();
    }, 100);
  }
}, []); // Empty deps = run once on mount
```

---

### Step 10: Improve Help Section

**File:** `src/App.tsx` (update help section)

```typescript
<div className="help-section">
  <h3>📖 Quick Guide</h3>
  <div className="help-columns">
    <div>
      <h4>🎹 Note Entry:</h4>
      <ul>
        <li><strong>Format:</strong> C-4, D-4, E-4, F-4, G-4, A-4, B-4</li>
        <li><strong>Sharps:</strong> C#4, D#4, F#4, G#4, A#4</li>
        <li><strong>Rest:</strong> --- (or leave empty)</li>
        <li><strong>Middle C:</strong> C-4 = MIDI 60</li>
        <li><strong>Octaves:</strong> C-0 to G-9</li>
      </ul>
    </div>
    <div>
      <h4>⌨️ Navigation:</h4>
      <ul>
        <li><strong>Arrow keys:</strong> Move between cells</li>
        <li><strong>Enter:</strong> Move down</li>
        <li><strong>Tab:</strong> Move right</li>
        <li><strong>Delete:</strong> Clear cell</li>
        <li><strong>Space:</strong> Play/Stop (when not editing)</li>
        <li><strong>Escape:</strong> Stop playback</li>
      </ul>
    </div>
  </div>

  <div className="help-tips">
    <h4>💡 Tips:</h4>
    <ul>
      <li>Invalid notes appear in <span style={{ color: '#ff4444' }}>red</span></li>
      <li>Current playback row is <span style={{ color: '#00ff00' }}>highlighted</span></li>
      <li>Pattern loops automatically</li>
      <li>BPM range: 60-240</li>
      <li>16 rows = 1 bar at 16th note resolution</li>
    </ul>
  </div>
</div>
```

**Add CSS for tips section:**

```css
/* In App.css */
.help-tips {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #333;
}

.help-tips h4 {
  margin: 0 0 10px 0;
  color: #ffaa00;
  font-size: 16px;
}

.help-tips ul {
  margin: 0;
  padding-left: 20px;
  columns: 2;
  column-gap: 30px;
}

.help-tips li {
  margin: 8px 0;
  break-inside: avoid;
}

@media (max-width: 768px) {
  .help-tips ul {
    columns: 1;
  }
}
```

---

### Step 11: Add Error Boundary (Optional but Good Practice)

**File:** `src/ErrorBoundary.tsx` (new file)

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: '#0a0a0a',
          color: '#e0e0e0',
          textAlign: 'center',
          padding: '20px',
        }}>
          <div>
            <h1 style={{ color: '#ff4444' }}>❌ Something went wrong</h1>
            <p style={{ color: '#aaa', marginTop: '20px' }}>
              {this.state.error?.message || 'Unknown error'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '30px',
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#00aa00',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Update `src/main.tsx`:**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
```

---

## Final Testing Checklist

### Validation
- [ ] Type invalid note (e.g., "X-4") → appears red
- [ ] Hover over invalid note → shows tooltip
- [ ] Try to play with invalid note → shows alert
- [ ] Alert lists which rows/tracks have errors
- [ ] Fix invalid note → red disappears
- [ ] Can play after fixing

### Keyboard Shortcuts
- [ ] Click outside grid
- [ ] Press Space → plays/stops
- [ ] Press Space while editing → types space in cell (doesn't toggle play)
- [ ] Press Escape while playing → stops
- [ ] Shortcuts work multiple times

### Loading State
- [ ] Refresh page
- [ ] See loading spinner
- [ ] See "Initializing audio engine..." message
- [ ] After init, main UI appears
- [ ] No flash of empty content

### BPM Validation
- [ ] Type "300" in BPM → clamps to 240
- [ ] Type "30" in BPM → clamps to 60
- [ ] Type "abc" in BPM → resets to 120
- [ ] BPM input disabled while playing

### Empty Pattern
- [ ] Clear all notes
- [ ] Try to play → shows alert "Pattern is empty"
- [ ] Load example → can play

### Edge Cases
- [ ] Rapid play/stop clicking → no crashes
- [ ] Change BPM mid-playback → stops first
- [ ] Edit notes while playing → stops first
- [ ] Multiple keyboard shortcuts in quick succession → handles correctly
- [ ] Browser back/forward → doesn't break state

### Visual Feedback
- [ ] Invalid notes appear red
- [ ] Current row highlights in green
- [ ] Hover effects on buttons work
- [ ] Focus outline on inputs visible
- [ ] Loading spinner animates smoothly

### Accessibility
- [ ] Can tab through all controls
- [ ] Space on button triggers click
- [ ] Invalid notes have title attribute
- [ ] Screen reader can read row numbers
- [ ] Focus indicators clear

### Console
- [ ] No warnings
- [ ] No errors
- [ ] Clean logs only (no spam)

---

## Success Criteria

✅ **Part 4 is complete when:**

1. ✅ Invalid notes show red highlighting
2. ✅ Validation prevents playing invalid patterns
3. ✅ Space bar play/stop works (when not editing)
4. ✅ Escape stops playback
5. ✅ Loading screen displays during init
6. ✅ Error screen shows if init fails
7. ✅ BPM validates and clamps to 60-240
8. ✅ Empty pattern shows warning
9. ✅ Help section includes all features
10. ✅ Auto-focus on first cell
11. ✅ Error boundary catches crashes
12. ✅ All edge cases handled
13. ✅ No console errors or warnings
14. ✅ Professional, polished UX

---

## Final Checklist

**Before calling it done:**

- [ ] All Part 1-4 features work
- [ ] Can initialize audio
- [ ] Can hear OPL tones
- [ ] Can edit notes in grid
- [ ] Can play patterns with timing
- [ ] Can stop and reset
- [ ] BPM control works
- [ ] Pattern loops
- [ ] Keyboard navigation works
- [ ] Keyboard shortcuts work
- [ ] Validation works
- [ ] Loading state works
- [ ] Error handling works
- [ ] Help section is complete
- [ ] No bugs found
- [ ] Code is clean and commented
- [ ] Ready to show others!

---

## Files Modified

```
minimal-prototype/
├── src/
│   ├── utils/
│   │   └── patternValidation.ts     ← New
│   ├── components/
│   │   └── TrackerGrid.tsx          ← Updated (validation)
│   ├── ErrorBoundary.tsx            ← New
│   ├── App.tsx                       ← Updated (shortcuts, validation, loading)
│   ├── App.css                       ← Updated (loading screen)
│   └── main.tsx                      ← Updated (error boundary)
```

---

## What We Accomplished

🎉 **Complete minimal tracker prototype with:**

- ✅ OPL3 synthesis in browser
- ✅ Multi-track pattern editing
- ✅ Real-time playback with timing
- ✅ Keyboard navigation
- ✅ Keyboard shortcuts
- ✅ Pattern validation
- ✅ Visual feedback
- ✅ Error handling
- ✅ Professional UX
- ✅ Polished interface

**Total project: ~1500 lines of TypeScript + CSS**

---

## Next Steps

**After completing minimal prototype:**

### Option A: Use It!
- Create music with the tracker
- Test with friends/users
- Gather feedback
- Find bugs/limitations

### Option B: Expand Features
Potential next features (ordered by impact):

1. **Better Instrument** (2-3 hours)
   - Load actual GENMIDI patch
   - Better default sound

2. **Pattern Library** (2-3 hours)
   - Save/load multiple patterns
   - LocalStorage persistence

3. **More Tracks** (1 hour)
   - Expand to 8 tracks
   - Voice allocation

4. **Note Velocity** (1-2 hours)
   - Add velocity column
   - Map to OPL volume

5. **WAV Export** (3-4 hours)
   - Offline rendering
   - Download button

6. **Better Timing** (3-4 hours)
   - Replace setTimeout with Tone.js
   - More accurate scheduling

7. **Multiple Patterns** (4-5 hours)
   - Pattern list
   - Switch between patterns
   - Copy/paste patterns

8. **Undo/Redo** (2-3 hours)
   - History management
   - Ctrl+Z / Ctrl+Y

9. **Project Save/Load** (2-3 hours)
   - Export JSON
   - Import JSON
   - Browser storage

10. **Proceed to Full Plan**
    - Piano roll editor
    - Arrangement timeline
    - Full GENMIDI bank
    - All original features

---

## Time Log Summary

| Part | Estimated | Actual |
|------|-----------|--------|
| Part 1: Proof of Concept | 1-2h | ___ |
| Part 2: Core Engine | 1.5-2h | ___ |
| Part 3: Tracker UI | 2-3h | ___ |
| Part 4: Polish | 1-2h | ___ |
| **TOTAL** | **6-9 hours** | ___ |

---

## Congratulations! 🎉

You now have a fully functional OPL3 tracker that:
- Actually works in the browser
- Sounds good
- Feels responsive
- Handles errors gracefully
- Is polished and ready to use

**This is a real, working product. Everything else is just expanding on this foundation!**

---

## Bonus: Quick Fixes/Improvements

If you have extra time, consider these quick wins:

### 5-Minute Improvements
- [ ] Add note names to help (A-0 = MIDI 21, C-8 = MIDI 108)
- [ ] Add BPM presets (60, 80, 100, 120, 140, 160, 180, 200)
- [ ] Change placeholder text to "..." instead of "---"
- [ ] Add row numbers to console logs during playback

### 15-Minute Improvements
- [ ] Add "Example 2" button with different melody
- [ ] Add row highlighting on hover
- [ ] Add track volume sliders (0-100%)
- [ ] Add mute buttons per track

### 30-Minute Improvements
- [ ] Add pattern length selector (8, 16, 32, 64 rows)
- [ ] Add copy/paste for rows (Ctrl+C/Ctrl+V)
- [ ] Add transpose buttons (up/down octave)
- [ ] Add LocalStorage auto-save

Pick any that interest you, or move forward with confidence that the core tech works!
