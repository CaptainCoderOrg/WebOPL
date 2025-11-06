# Export Modal UI - Implementation Plan

**Created:** 2025-01-06
**Status:** Planning
**Estimated Time:** 4-6 hours

---

## Table of Contents

1. [Overview](#overview)
2. [Requirements](#requirements)
3. [Architecture](#architecture)
4. [Component Design](#component-design)
5. [Implementation Phases](#implementation-phases)
6. [Code Examples](#code-examples)
7. [Testing Plan](#testing-plan)
8. [Open Questions](#open-questions)

---

## Overview

Add a professional export modal to the main tracker UI that allows users to export their patterns as WAV files with multiple export modes:

1. **Standard Export** - Direct pattern export with optional fade in/out
2. **Seamless Loop Export** - Context-aware loop export (existing feature)
3. **Multi-Loop Export** - Render pattern multiple times

### User Flow

```
User edits pattern in Tracker
    ↓
Clicks "💾 Export" button
    ↓
Modal opens showing pattern info
    ↓
User selects export mode and options
    ↓
Clicks "Generate WAV"
    ↓
Progress bar shows (0-100%)
    ↓
WAV file downloads automatically
    ↓
Modal shows success or stays open for another export
```

---

## Requirements

### Functional Requirements

**FR1: Export Button**
- Add "💾 Export" button to Tracker controls
- Button disabled during playback
- Button disabled if pattern is empty

**FR2: Export Modal**
- Modal overlays tracker UI (darkened background)
- Shows pattern information:
  - Pattern name (if loaded from file, otherwise "Untitled Pattern")
  - Number of rows
  - Number of tracks
  - BPM
  - Duration (calculated)
  - Expected file size (calculated)
- Closable via X button, Escape key, or clicking outside

**FR3: Export Modes**
- **Mode 1: Standard Export**
  - Checkbox: "Add Fade In" (duration in ms, default: 100ms)
  - Checkbox: "Add Fade Out" (duration in ms, default: 500ms)
  - Renders pattern once

- **Mode 2: Seamless Loop Export**
  - Checkbox: "Export as Seamless Loop"
  - When checked, shows:
    - Loop count selector (1, 2, 3, 4, 5, ∞)
    - Context rows slider (4-16, default: 8)
  - Uses context-aware rendering
  - If loop count = ∞, exports 1 iteration (file meant to be looped infinitely)
  - If loop count > 1, renders multiple iterations

**FR4: Export Execution**
- Progress bar (0-100%)
- Cancel button (aborts export)
- Error handling with user-friendly messages
- Success feedback
- Automatic download trigger

**FR5: Reusability**
- Modal component should be reusable for other features
- Export-specific logic in separate component

### Non-Functional Requirements

**NFR1: Performance**
- Export should not freeze UI (use async/await with progress updates)
- Large patterns (128 rows, 18 tracks, 240 BPM) should export in < 5 seconds

**NFR2: Accessibility**
- Keyboard navigation (Tab, Escape)
- Screen reader friendly
- Clear focus indicators

**NFR3: Visual Design**
- Consistent with existing tracker UI
- Dark theme matching tracker
- Professional appearance

---

## Architecture

### Component Structure

```
src/
├── components/
│   ├── Tracker.tsx (modified)
│   ├── Modal.tsx (new - reusable)
│   ├── Modal.css (new)
│   ├── ExportModal.tsx (new)
│   └── ExportModal.css (new)
├── utils/
│   ├── exportHelpers.ts (new)
│   └── fadeProcessor.ts (new)
└── export/
    └── OfflineAudioRenderer.ts (modified - add fade support)
```

### Data Flow

```
Tracker.tsx
    ├─> State: showExportModal (boolean)
    ├─> Pattern data (rows, tracks, bpm, trackInstruments)
    └─> Opens ExportModal
            ├─> Calculates duration & file size
            ├─> User selects export mode & options
            ├─> Calls export function
            └─> Shows progress
                    ├─> OfflineAudioRenderer.render()
                    ├─> FadeProcessor.applyFades() (if standard mode)
                    ├─> CrossfadeLoopEncoder (if seamless mode)
                    ├─> WAVEncoder.encode()
                    └─> Download trigger
```

### Export Modes Decision Tree

```
User clicks "Generate WAV"
    ↓
Is "Export as Seamless Loop" checked?
    ├─ YES → Seamless Loop Mode
    │         ├─ Build extended pattern [last N | pattern | first N]
    │         ├─ Render extended pattern
    │         ├─ Extract core with CrossfadeLoopEncoder
    │         ├─ If loop count > 1:
    │         │   └─ Repeat core N times (simple concatenation)
    │         └─ Encode to WAV
    │
    └─ NO → Standard Mode
              ├─ Render pattern normally
              ├─ Apply fade in (if checked)
              ├─ Apply fade out (if checked)
              └─ Encode to WAV
```

---

## Component Design

### 1. Modal.tsx (Reusable)

**Purpose:** Generic modal container for any content

**Props:**
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: 'small' | 'medium' | 'large'; // Default: 'medium'
  closeOnClickOutside?: boolean; // Default: true
  closeOnEscape?: boolean; // Default: true
}
```

**Features:**
- Dark overlay
- Centered modal box
- Close button (X)
- Escape key handling
- Click-outside-to-close
- Focus trap (keeps Tab within modal)

**Example:**
```tsx
<Modal
  isOpen={showExportModal}
  onClose={() => setShowExportModal(false)}
  title="Export to WAV"
  width="medium"
>
  <ExportModalContent {...props} />
</Modal>
```

---

### 2. ExportModal.tsx

**Purpose:** Export-specific UI and logic

**Props:**
```typescript
interface ExportModalProps {
  // Pattern data
  patternName?: string;
  pattern: string[][]; // The tracker grid
  trackInstruments: number[];
  instrumentBank: OPLPatch[];
  bpm: number;

  // Callbacks
  onClose: () => void;
  onExportComplete?: (filename: string) => void;
}
```

**State:**
```typescript
// Export mode
const [seamlessLoop, setSeamlessLoop] = useState(false);

// Seamless loop options
const [loopCount, setLoopCount] = useState<number | 'infinite'>(1);
const [contextRows, setContextRows] = useState(8);

// Standard mode options
const [fadeIn, setFadeIn] = useState(false);
const [fadeInDuration, setFadeInDuration] = useState(100); // ms
const [fadeOut, setFadeOut] = useState(true);
const [fadeOutDuration, setFadeOutDuration] = useState(500); // ms

// Export state
const [isExporting, setIsExporting] = useState(false);
const [progress, setProgress] = useState(0); // 0-100
const [error, setError] = useState<string | null>(null);
```

**UI Sections:**

1. **Pattern Info Card** (always visible)
   ```
   ┌─────────────────────────────────────┐
   │ Pattern: RPG Adventure              │
   │ Rows: 64                            │
   │ Tracks: 8                           │
   │ BPM: 120                            │
   │ Duration: ~8.0 seconds              │
   │ File Size: ~1.5 MB (WAV)            │
   └─────────────────────────────────────┘
   ```

2. **Export Mode Selection** (radio or checkbox)
   ```
   ☐ Export as Seamless Loop
   ```

3. **Conditional Options**

   **If Seamless Loop = true:**
   ```
   Loop Count: [1] [2] [3] [4] [5] [∞]
               └─ Selected: 3

   Context Rows: [====●========] 8 rows
                  4            16

   Info: Renders [last 8 rows | pattern | first 8 rows]
         then extracts core and repeats 3 times.
         Final duration: ~24.0 seconds
         Final file size: ~4.5 MB
   ```

   **If Seamless Loop = false:**
   ```
   ☑ Fade In  (Duration: [100] ms)
   ☑ Fade Out (Duration: [500] ms)

   Info: Adds smooth fade in/out to prevent clicks.
         Final duration: ~8.6 seconds (includes fades)
         Final file size: ~1.6 MB
   ```

4. **Action Buttons**
   ```
   [Cancel]  [Generate WAV]
   ```

5. **Progress Section** (visible during export)
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 45%

   Rendering audio... (Step 2/3)

   [Cancel Export]
   ```

6. **Success/Error Section**
   ```
   ✅ Export complete!
   Downloaded: rpg-adventure.wav (1.52 MB)

   [Export Another] [Close]
   ```

---

### 3. exportHelpers.ts

**Purpose:** Calculation utilities for export modal

**Functions:**

```typescript
/**
 * Calculate pattern duration in seconds
 */
export function calculateDuration(
  rows: number,
  bpm: number,
  rowsPerBeat: number = 4
): number {
  const secondsPerRow = 60 / (bpm * rowsPerBeat);
  return rows * secondsPerRow;
}

/**
 * Calculate expected WAV file size
 * WAV PCM: sampleRate × duration × 2 channels × 2 bytes + 44 byte header
 */
export function calculateFileSize(
  durationSeconds: number,
  sampleRate: number = 49716
): number {
  const samples = Math.floor(durationSeconds * sampleRate);
  const dataSize = samples * 2 * 2; // 2 channels × 2 bytes per sample
  return dataSize + 44; // + WAV header
}

/**
 * Format file size as human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Format duration as human-readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(0);
  return `${minutes}m ${secs}s`;
}

/**
 * Validate pattern has notes
 */
export function hasNotes(pattern: string[][]): boolean {
  return pattern.some(row =>
    row.some(cell => cell !== '---' && cell.trim() !== '')
  );
}
```

---

### 4. fadeProcessor.ts

**Purpose:** Apply fade in/out to audio samples

**Algorithm:**

```typescript
export class FadeProcessor {
  /**
   * Apply fade in to audio samples
   * Uses linear fade (could be improved to use logarithmic)
   *
   * @param leftChannel - Left channel samples
   * @param rightChannel - Right channel samples
   * @param fadeDurationMs - Fade duration in milliseconds
   * @param sampleRate - Sample rate in Hz
   */
  static applyFadeIn(
    leftChannel: Int16Array,
    rightChannel: Int16Array,
    fadeDurationMs: number,
    sampleRate: number = 49716
  ): void {
    const fadeSamples = Math.floor((fadeDurationMs / 1000) * sampleRate);
    const actualFadeSamples = Math.min(fadeSamples, leftChannel.length);

    for (let i = 0; i < actualFadeSamples; i++) {
      const gain = i / actualFadeSamples; // 0.0 → 1.0
      leftChannel[i] = Math.floor(leftChannel[i] * gain);
      rightChannel[i] = Math.floor(rightChannel[i] * gain);
    }

    console.log(`[FadeProcessor] Applied ${fadeDurationMs}ms fade in (${actualFadeSamples} samples)`);
  }

  /**
   * Apply fade out to audio samples
   *
   * @param leftChannel - Left channel samples
   * @param rightChannel - Right channel samples
   * @param fadeDurationMs - Fade duration in milliseconds
   * @param sampleRate - Sample rate in Hz
   */
  static applyFadeOut(
    leftChannel: Int16Array,
    rightChannel: Int16Array,
    fadeDurationMs: number,
    sampleRate: number = 49716
  ): void {
    const fadeSamples = Math.floor((fadeDurationMs / 1000) * sampleRate);
    const actualFadeSamples = Math.min(fadeSamples, leftChannel.length);
    const startIndex = leftChannel.length - actualFadeSamples;

    for (let i = 0; i < actualFadeSamples; i++) {
      const gain = 1.0 - (i / actualFadeSamples); // 1.0 → 0.0
      const index = startIndex + i;
      leftChannel[index] = Math.floor(leftChannel[index] * gain);
      rightChannel[index] = Math.floor(rightChannel[index] * gain);
    }

    console.log(`[FadeProcessor] Applied ${fadeDurationMs}ms fade out (${actualFadeSamples} samples)`);
  }

  /**
   * Apply both fade in and fade out
   */
  static applyFades(
    leftChannel: Int16Array,
    rightChannel: Int16Array,
    fadeInMs: number,
    fadeOutMs: number,
    sampleRate: number = 49716
  ): void {
    if (fadeInMs > 0) {
      this.applyFadeIn(leftChannel, rightChannel, fadeInMs, sampleRate);
    }
    if (fadeOutMs > 0) {
      this.applyFadeOut(leftChannel, rightChannel, fadeOutMs, sampleRate);
    }
  }
}
```

**Fade Curve Options (Future Enhancement):**
- Linear (current): `gain = t`
- Logarithmic: `gain = Math.log(1 + t * 9) / Math.log(10)` (more natural)
- Exponential: `gain = t * t` (smoother)

For now, use linear for simplicity.

---

## Implementation Phases

### Phase 1: Modal Infrastructure (1 hour)

**Goal:** Create reusable Modal component and integrate into Tracker

**Tasks:**
1. Create `src/components/Modal.tsx`
2. Create `src/components/Modal.css`
3. Implement:
   - Modal overlay
   - Close button
   - Escape key handler
   - Click-outside-to-close
   - Focus trap
4. Add export button to Tracker.tsx
5. Wire up modal open/close state

**Validation:**
- Modal opens when Export button clicked
- Modal closes when X button clicked
- Modal closes when Escape pressed
- Modal closes when clicking outside
- Tab key stays within modal

---

### Phase 2: Export Modal UI (1.5 hours)

**Goal:** Build ExportModal component with all UI elements

**Tasks:**
1. Create `src/components/ExportModal.tsx`
2. Create `src/components/ExportModal.css`
3. Create `src/utils/exportHelpers.ts`
4. Implement:
   - Pattern info card (rows, tracks, bpm, duration, file size)
   - Export mode checkbox (seamless loop)
   - Conditional options (loop count, context rows, fades)
   - Action buttons (Cancel, Generate WAV)
5. Wire calculations (duration, file size)
6. Handle state changes (update calculations when options change)

**Validation:**
- Pattern info displays correctly
- Duration calculation is accurate
- File size estimation is accurate
- Switching modes shows/hides correct options
- Changing options updates calculations in real-time

---

### Phase 3: Standard Export with Fades (1 hour)

**Goal:** Implement standard export mode with fade in/out

**Tasks:**
1. Create `src/utils/fadeProcessor.ts`
2. Implement FadeProcessor class:
   - `applyFadeIn()`
   - `applyFadeOut()`
   - `applyFades()`
3. Integrate into export flow:
   - Render pattern normally
   - Apply fades to rendered audio
   - Encode to WAV
4. Add progress reporting
5. Add error handling

**Validation:**
- Export without fades works (baseline)
- Fade in creates smooth volume ramp at start
- Fade out creates smooth volume ramp at end
- Both fades together work correctly
- No clicks or pops at boundaries
- Duration matches expected (pattern + fade time)
- File size matches expected

---

### Phase 4: Seamless Loop Export (1 hour)

**Goal:** Integrate existing seamless loop logic into modal

**Tasks:**
1. Adapt seamless loop code from integration-test.ts
2. Add loop count multiplier:
   - If count = 1: Export one iteration (loopable file)
   - If count = ∞: Same as count = 1 (user will loop in player)
   - If count > 1: Concatenate loop N times
3. Add context rows configuration
4. Update duration/file size calculations for multi-loop
5. Add progress reporting
6. Add error handling

**Validation:**
- Single loop export (count = 1) produces seamless loop
- Multi-loop export (count = 3) produces 3 iterations seamlessly
- Infinite loop (∞) produces single iteration
- Context rows adjustable (4-16)
- No clicks at loop boundaries
- Duration matches expected (pattern × loop count)
- File size matches expected

---

### Phase 5: Progress & Error Handling (0.5 hours)

**Goal:** Professional progress feedback and error messages

**Tasks:**
1. Implement progress bar component
2. Add progress updates during render:
   - 0-10%: Setup
   - 10-80%: Rendering audio
   - 80-95%: Applying effects (fades/loop extraction)
   - 95-100%: Encoding WAV
3. Add cancel functionality (abort export)
4. Add error handling:
   - OPL3 library load failure
   - Render timeout (> 30 seconds)
   - Memory errors (patterns too large)
   - Invalid pattern data
5. Add success feedback

**Validation:**
- Progress bar updates smoothly (0-100%)
- Progress text shows current step
- Cancel button aborts export immediately
- Errors show user-friendly messages
- Success message shows filename and size
- Multiple exports work (can export again after completion)

---

### Phase 6: Testing & Polish (1 hour)

**Goal:** Comprehensive testing and UI polish

**Tasks:**
1. **Edge Case Testing:**
   - Empty pattern (should show error)
   - Single row pattern
   - Maximum size pattern (128 rows, 18 tracks, 240 BPM)
   - Pattern with only sustain notes
   - Pattern with all tracks silent

2. **Export Mode Testing:**
   - Standard with no fades
   - Standard with fade in only
   - Standard with fade out only
   - Standard with both fades
   - Seamless loop, count = 1
   - Seamless loop, count = 5
   - Seamless loop, count = ∞
   - Seamless loop, different context rows (4, 8, 16)

3. **UI Polish:**
   - Consistent styling with tracker
   - Smooth animations (modal fade in/out)
   - Loading states
   - Disabled states
   - Focus indicators
   - Tooltips where helpful

4. **Performance Testing:**
   - Small pattern (16 rows): should export in < 0.5s
   - Medium pattern (64 rows): should export in < 2s
   - Large pattern (128 rows, 18 tracks): should export in < 5s

**Success Criteria:**
- All edge cases handled gracefully
- All export modes produce correct output
- UI is polished and professional
- Performance meets targets
- No regressions in tracker functionality

---

## Code Examples

### Tracker.tsx Integration

```typescript
// Add state for export modal
const [showExportModal, setShowExportModal] = useState(false);

// Add export button to controls (after "+ Track" button)
<button
  onClick={() => setShowExportModal(true)}
  disabled={isPlaying || !hasNotes(pattern)}
  title={
    !hasNotes(pattern)
      ? 'Pattern is empty - add some notes first'
      : 'Export pattern to WAV file'
  }
>
  💾 Export
</button>

// Add modal at end of component (before closing </div>)
{showExportModal && (
  <Modal
    isOpen={showExportModal}
    onClose={() => setShowExportModal(false)}
    title="Export to WAV"
    width="medium"
  >
    <ExportModal
      patternName={selectedExample || 'Untitled Pattern'}
      pattern={pattern}
      trackInstruments={trackInstruments}
      instrumentBank={instrumentBank}
      bpm={bpm}
      onClose={() => setShowExportModal(false)}
      onExportComplete={(filename) => {
        console.log(`Exported: ${filename}`);
        // Could show toast notification here
      }}
    />
  </Modal>
)}
```

### ExportModal.tsx (Simplified Structure)

```typescript
export function ExportModal({
  patternName = 'Untitled Pattern',
  pattern,
  trackInstruments,
  instrumentBank,
  bpm,
  onClose,
  onExportComplete,
}: ExportModalProps) {
  const [seamlessLoop, setSeamlessLoop] = useState(false);
  const [loopCount, setLoopCount] = useState<number | 'infinite'>(1);
  const [contextRows, setContextRows] = useState(8);
  const [fadeIn, setFadeIn] = useState(false);
  const [fadeInDuration, setFadeInDuration] = useState(100);
  const [fadeOut, setFadeOut] = useState(true);
  const [fadeOutDuration, setFadeOutDuration] = useState(500);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Calculate pattern info
  const baseDuration = calculateDuration(pattern.length, bpm);
  const actualLoopCount = loopCount === 'infinite' ? 1 : loopCount;
  const finalDuration = seamlessLoop
    ? baseDuration * actualLoopCount
    : baseDuration + (fadeIn ? fadeInDuration / 1000 : 0) + (fadeOut ? fadeOutDuration / 1000 : 0);
  const fileSize = calculateFileSize(finalDuration);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setProgress(0);
      setError(null);

      if (seamlessLoop) {
        await exportSeamlessLoop();
      } else {
        await exportStandard();
      }

      onExportComplete?.(`${patternName}.wav`);
      setIsExporting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
      setIsExporting(false);
    }
  };

  const exportSeamlessLoop = async () => {
    // Implementation in Phase 4
  };

  const exportStandard = async () => {
    // Implementation in Phase 3
  };

  return (
    <div className="export-modal">
      {/* Pattern Info */}
      <div className="export-info-card">
        {/* ... */}
      </div>

      {/* Export Mode Selection */}
      <div className="export-mode">
        {/* ... */}
      </div>

      {/* Conditional Options */}
      {seamlessLoop ? (
        <div className="seamless-options">
          {/* Loop count, context rows */}
        </div>
      ) : (
        <div className="standard-options">
          {/* Fade in, fade out */}
        </div>
      )}

      {/* Action Buttons */}
      <div className="export-actions">
        {/* ... */}
      </div>

      {/* Progress */}
      {isExporting && (
        <div className="export-progress">
          {/* ... */}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="export-error">
          {/* ... */}
        </div>
      )}
    </div>
  );
}
```

---

## Testing Plan

### Unit Tests (Optional, but Recommended)

**exportHelpers.ts:**
- `calculateDuration()` accuracy
- `calculateFileSize()` accuracy
- `formatFileSize()` formatting
- `formatDuration()` formatting
- `hasNotes()` pattern validation

**fadeProcessor.ts:**
- `applyFadeIn()` creates correct curve
- `applyFadeOut()` creates correct curve
- `applyFades()` applies both correctly
- Edge cases (fade longer than audio, zero-length fade)

### Integration Tests

**Test in integration-test.html:**
1. Export standard mode (no fades)
2. Export with fade in only
3. Export with fade out only
4. Export with both fades
5. Export seamless loop (count = 1)
6. Export seamless loop (count = 3)
7. Export with different context rows

### Manual Testing

**User Acceptance Testing:**
1. Open tracker, load RPG Adventure
2. Click Export button → modal opens
3. Verify pattern info is correct
4. Test standard export:
   - Enable fade in (100ms)
   - Enable fade out (500ms)
   - Click "Generate WAV"
   - Verify progress bar
   - Verify download triggers
   - Open in Audacity:
     - Check fade in ramp at start
     - Check fade out ramp at end
     - Verify no clicks
5. Test seamless loop export:
   - Check "Export as Seamless Loop"
   - Set loop count to 3
   - Set context rows to 8
   - Click "Generate WAV"
   - Verify progress bar
   - Verify download triggers
   - Open in Audacity:
     - Check 3 iterations present
     - Check loop boundaries (no clicks)
     - Enable loop playback → verify seamless
6. Test edge cases:
   - Export empty pattern → should show error
   - Export during playback → button should be disabled
   - Cancel export mid-render → should abort
7. Test keyboard navigation:
   - Tab through all controls
   - Escape to close modal
   - Enter to submit (if focused on button)

---

## Open Questions

### Q1: Loop Count UI
**Question:** Should loop count be:
- A. Dropdown: [1, 2, 3, 4, 5, ∞]
- B. Number input with ∞ checkbox
- C. Radio buttons

**Recommendation:** **A. Dropdown** - Simplest UX, most common use cases covered

---

### Q2: Context Rows UI
**Question:** Should context rows be:
- A. Slider (4-16)
- B. Number input
- C. Presets (Low: 4, Medium: 8, High: 16)

**Recommendation:** **A. Slider** - Visual, easy to understand, prevents invalid values

---

### Q3: Fade Curve
**Question:** Should we offer fade curve selection?
- A. Linear only (simple)
- B. Linear + Logarithmic (more natural)
- C. Linear + Log + Exponential

**Recommendation:** **A. Linear only** for MVP. Can add curve selection in future if users request it.

---

### Q4: Export While Playing
**Question:** Should we allow export during playback?
- A. Disable export button (current plan)
- B. Allow export, automatically pause playback
- C. Allow both simultaneously

**Recommendation:** **A. Disable button** - Simpler, avoids potential audio glitches

---

### Q5: Pattern Name
**Question:** How to determine pattern name for filename?
- A. Use loaded pattern name, fallback to "untitled-pattern"
- B. Always use loaded pattern name, show error if not loaded
- C. Let user type filename in modal

**Recommendation:** **A. Smart fallback** - Simplest UX, always works. Could add filename input in future.

---

### Q6: Success Behavior
**Question:** After successful export, should modal:
- A. Close automatically
- B. Stay open with success message and "Export Another" button
- C. Stay open and reset to initial state

**Recommendation:** **B. Stay open with success message** - Allows user to export with different settings easily

---

## Success Criteria

### Must Have (MVP)
- ✅ Export button in Tracker UI
- ✅ Modal opens/closes correctly
- ✅ Pattern info displays accurately
- ✅ Standard export with fades works
- ✅ Seamless loop export works
- ✅ Multi-loop export works
- ✅ Progress bar shows during export
- ✅ WAV file downloads automatically
- ✅ Error handling works

### Should Have
- ✅ Keyboard navigation (Tab, Escape)
- ✅ Cancel export functionality
- ✅ Success feedback
- ✅ Visual polish (animations, styling)
- ✅ Tooltips for complex options

### Nice to Have (Future)
- 🔮 Fade curve selection (linear, log, exp)
- 🔮 Custom filename input
- 🔮 Preview audio before export
- 🔮 Export multiple patterns at once
- 🔮 Export format selection (WAV, MP3, OGG)
- 🔮 Sample rate selection (44.1kHz, 48kHz, 49.716kHz)

---

## Timeline Estimate

| Phase | Task | Estimated Time |
|-------|------|----------------|
| 1 | Modal Infrastructure | 1 hour |
| 2 | Export Modal UI | 1.5 hours |
| 3 | Standard Export with Fades | 1 hour |
| 4 | Seamless Loop Export | 1 hour |
| 5 | Progress & Error Handling | 0.5 hours |
| 6 | Testing & Polish | 1 hour |
| **Total** | | **6 hours** |

**Buffer:** +1 hour for unexpected issues = **7 hours total**

---

## Risk Assessment

### Low Risk ✅
- Modal component (standard React pattern)
- Pattern info calculations (straightforward math)
- Export button integration (minor change)

### Medium Risk ⚠️
- Fade processor implementation (need to test carefully)
- Progress reporting (need to ensure UI updates)
- Multi-loop concatenation (need to handle large arrays)

### High Risk 🔴
- None identified (all building on proven infrastructure)

---

## Dependencies

**Existing Code (Reuse):**
- ✅ OfflineAudioRenderer (already works)
- ✅ WAVEncoder (already works)
- ✅ CrossfadeLoopEncoder (already works)
- ✅ PatternRenderer (already works)
- ✅ CellProcessor (already works)

**New Code (Build):**
- 🆕 Modal component
- 🆕 ExportModal component
- 🆕 FadeProcessor
- 🆕 exportHelpers

**External Dependencies:**
- None (all functionality self-contained)

---

## Next Steps

1. ✅ Review this implementation plan
2. ✅ Get approval from user
3. 🚀 Start Phase 1: Modal Infrastructure
4. 🚀 Proceed incrementally through phases
5. ✅ Test after each phase
6. 🎉 Ship when all phases complete

---

**Ready to implement! Let's build this feature systematically. 🎵**
