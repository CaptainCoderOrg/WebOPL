# Milestones 6-8: Simple Editor Modal

**Goal:** Create instrument editor with preset selection and ADSR controls

**Time Estimate:** 8-11 hours total

**Status:** Not Started

---

## Milestone 6: Simple Editor Modal Shell (3-4 hours)

### Overview

Create a modal that opens when clicking "Edit" button next to any track's instrument selector. The modal will:
- Display over the tracker with dark backdrop
- Show current track and instrument info
- Have close button and escape key support
- Prevent interaction with tracker while open

This milestone focuses ONLY on the modal shell—no editing functionality yet.

---

### Step 1: Create InstrumentEditor.tsx shell (60-90 min)

**File: `src/components/InstrumentEditor.tsx` (NEW)**

```typescript
/**
 * InstrumentEditor Component
 * Modal for editing instrument parameters
 */

import React, { useState, useEffect } from 'react';
import type { OPLPatch } from '../types/OPLPatch';
import './InstrumentEditor.css';

export interface InstrumentEditorProps {
  /** Track being edited (0-3) */
  trackId: number;

  /** Current patch loaded on this track */
  currentPatch: OPLPatch;

  /** All available patches for preset selection */
  availablePatches: OPLPatch[];

  /** Called when user saves changes */
  onSave: (trackId: number, patch: OPLPatch) => void;

  /** Called when user closes without saving */
  onCancel: () => void;

  /** SimpleSynth instance for preview */
  synth?: any;
}

export function InstrumentEditor({
  trackId,
  currentPatch,
  availablePatches,
  onSave,
  onCancel,
  synth
}: InstrumentEditorProps) {
  // Local state for editing (not applied until Save)
  const [editedPatch, setEditedPatch] = useState<OPLPatch>(currentPatch);

  // Reset local state when currentPatch changes
  useEffect(() => {
    setEditedPatch(currentPatch);
  }, [currentPatch]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  // Prevent scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleSave = () => {
    onSave(trackId, editedPatch);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop itself, not its children
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div className="editor-backdrop" onClick={handleBackdropClick}>
      <div className="editor-modal">
        {/* Header */}
        <div className="editor-header">
          <h2>Edit Instrument - Track {trackId + 1}</h2>
          <button
            className="editor-close"
            onClick={onCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="editor-body">
          <div className="editor-info">
            <p className="current-instrument">
              Current: <strong>{currentPatch.name}</strong>
            </p>
            {currentPatch.category && (
              <p className="instrument-category">
                Category: {currentPatch.category}
              </p>
            )}
          </div>

          <div className="editor-placeholder">
            <p>Editor controls will appear here.</p>
            <p className="editor-hint">
              (Preset selector and ADSR controls coming in Milestones 7-8)
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="editor-footer">
          <button
            className="editor-button editor-button-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="editor-button editor-button-save"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### Step 2: Create InstrumentEditor.css (45-60 min)

**File: `src/components/InstrumentEditor.css` (NEW)**

```css
/**
 * InstrumentEditor Styles
 * Modal for editing instrument parameters
 */

/* Backdrop overlay */
.editor-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

/* Modal container */
.editor-modal {
  background-color: #1e1e1e;
  border: 2px solid #3d3d3d;
  border-radius: 8px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

/* Header */
.editor-header {
  padding: 16px 20px;
  border-bottom: 1px solid #3d3d3d;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #2a2a2a;
  border-radius: 6px 6px 0 0;
}

.editor-header h2 {
  margin: 0;
  font-size: 18px;
  color: #ffffff;
  font-weight: 600;
}

.editor-close {
  background: none;
  border: none;
  color: #999;
  font-size: 32px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.editor-close:hover {
  color: #fff;
}

/* Body */
.editor-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.editor-info {
  margin-bottom: 24px;
  padding: 12px;
  background-color: #2a2a2a;
  border-radius: 4px;
  border-left: 3px solid #4a9eff;
}

.current-instrument {
  margin: 0 0 8px 0;
  color: #ffffff;
  font-size: 14px;
}

.current-instrument strong {
  color: #4a9eff;
}

.instrument-category {
  margin: 0;
  color: #999;
  font-size: 13px;
}

.editor-placeholder {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.editor-placeholder p {
  margin: 8px 0;
}

.editor-hint {
  font-size: 12px;
  color: #555;
  font-style: italic;
}

/* Footer */
.editor-footer {
  padding: 16px 20px;
  border-top: 1px solid #3d3d3d;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background-color: #2a2a2a;
  border-radius: 0 0 6px 6px;
}

.editor-button {
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.editor-button-cancel {
  background-color: #3d3d3d;
  color: #ffffff;
}

.editor-button-cancel:hover {
  background-color: #4d4d4d;
}

.editor-button-save {
  background-color: #4a9eff;
  color: #ffffff;
}

.editor-button-save:hover {
  background-color: #3d8ee6;
}

/* Responsive */
@media (max-width: 640px) {
  .editor-modal {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  .editor-header,
  .editor-footer {
    border-radius: 0;
  }
}
```

---

### Step 3: Add modal state to App.tsx (30-45 min)

**File: `src/App.tsx` (MODIFY)**

**Add import at top:**

```typescript
import { InstrumentEditor } from './components/InstrumentEditor';
```

**Add state for modal (after existing state):**

```typescript
// Instrument editor modal state
const [editorOpen, setEditorOpen] = useState(false);
const [editingTrackId, setEditingTrackId] = useState<number>(0);
```

**Add handlers (before return statement):**

```typescript
/**
 * Open instrument editor for a specific track
 */
const handleEditInstrument = (trackId: number) => {
  setEditingTrackId(trackId);
  setEditorOpen(true);
};

/**
 * Save edited instrument
 */
const handleSaveInstrument = (trackId: number, patch: OPLPatch) => {
  console.log(`[App] Saving instrument for track ${trackId}:`, patch.name);

  // Update track instrument assignment
  setTrackInstruments(prev => {
    const next = [...prev];
    next[trackId] = patch.id;
    return next;
  });

  // If this is a custom patch, add it to the bank
  if (patch.isCustom) {
    setInstrumentBank(prev => {
      // Check if already exists
      const exists = prev.some(p => p.id === patch.id);
      if (exists) {
        // Replace existing
        return prev.map(p => p.id === patch.id ? patch : p);
      } else {
        // Add new
        return [...prev, patch];
      }
    });
  }

  // Load the patch to the synth
  if (synth) {
    synth.loadPatch(trackId, patch);
  }

  // Close modal
  setEditorOpen(false);
};

/**
 * Cancel editing
 */
const handleCancelEdit = () => {
  setEditorOpen(false);
};
```

**Update InstrumentSelector props to add onEditClick:**

```typescript
<InstrumentSelector
  trackInstruments={trackInstruments}
  instrumentBank={instrumentBank}
  onInstrumentChange={handleInstrumentChange}
  onEditClick={handleEditInstrument}  // ADD THIS
  disabled={isPlaying}
/>
```

**Add modal at end of JSX (before closing </div>):**

```typescript
{/* Instrument Editor Modal */}
{editorOpen && synth && (
  <InstrumentEditor
    trackId={editingTrackId}
    currentPatch={
      instrumentBank.find(p => p.id === trackInstruments[editingTrackId]) ||
      instrumentBank[0]
    }
    availablePatches={instrumentBank}
    onSave={handleSaveInstrument}
    onCancel={handleCancelEdit}
    synth={synth}
  />
)}
```

---

### Step 4: Update InstrumentSelector to add Edit button (30 min)

**File: `src/components/InstrumentSelector.tsx` (MODIFY)**

**Update props interface:**

```typescript
export interface InstrumentSelectorProps {
  trackInstruments: number[];
  instrumentBank: OPLPatch[];
  onInstrumentChange: (trackId: number, patchId: number) => void;
  onEditClick: (trackId: number) => void;  // ADD THIS
  disabled?: boolean;
}
```

**Update function signature:**

```typescript
export function InstrumentSelector({
  trackInstruments,
  instrumentBank,
  onInstrumentChange,
  onEditClick,  // ADD THIS
  disabled = false
}: InstrumentSelectorProps) {
```

**Inside the .track-instrument div, after the select element, add:**

```typescript
<button
  className="edit-button"
  onClick={() => onEditClick(i)}
  disabled={disabled}
  title={`Edit instrument for Track ${i + 1}`}
  aria-label={`Edit instrument for Track ${i + 1}`}
>
  ✏️
</button>
```

**Add CSS for edit button (in InstrumentSelector.css):**

```css
.edit-button {
  background-color: #3d3d3d;
  border: 1px solid #4d4d4d;
  border-radius: 3px;
  color: #ffffff;
  cursor: pointer;
  font-size: 16px;
  padding: 4px 8px;
  transition: all 0.2s;
  margin-left: 8px;
}

.edit-button:hover:not(:disabled) {
  background-color: #4d4d4d;
  border-color: #5d5d5d;
}

.edit-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

---

### Step 5: Manual Testing (30-45 min)

#### Test 1: Modal Opens

1. Start dev server
2. Click any "Edit" button (✏️) next to a track dropdown
3. **Expected:**
   - Modal appears with dark backdrop
   - Header shows "Edit Instrument - Track X"
   - Shows current instrument name
   - Shows category (if available)
   - Placeholder text visible

#### Test 2: Modal Close Methods

1. Open modal
2. Click X button → modal closes
3. Open modal again
4. Click backdrop (outside modal) → modal closes
5. Open modal again
6. Press Escape key → modal closes
7. Open modal again
8. Click Cancel button → modal closes

**Expected:** All 4 methods should close modal

#### Test 3: Modal Prevents Tracker Interaction

1. Open modal
2. Try clicking on tracker pattern
3. Try clicking play button
4. Try using keyboard shortcuts

**Expected:**
- Tracker clicks do nothing (backdrop blocks them)
- Modal stays open
- Keyboard shortcuts don't affect tracker (except Escape)

#### Test 4: Save Button (Does Nothing Yet)

1. Open modal
2. Click Save button
3. **Expected:**
   - Modal closes
   - No errors in console
   - Instrument doesn't change (no editing yet)

#### Test 5: Multiple Tracks

1. Open editor for Track 1
2. Verify header says "Track 1"
3. Close modal
4. Open editor for Track 3
5. Verify header says "Track 3"

**Expected:** Correct track number shown

#### Test 6: Disabled During Playback

1. Start pattern playing
2. Try clicking Edit button
3. **Expected:**
   - Edit button should be disabled/grayed out
   - Modal doesn't open

#### Test 7: Body Scroll Lock

1. Scroll page down (if applicable)
2. Open modal
3. Try scrolling with mouse wheel
4. **Expected:**
   - Page doesn't scroll while modal open
   - Modal content scrolls if overflow

---

### Success Criteria - Milestone 6

- [ ] Modal opens when clicking Edit button
- [ ] Header shows correct track number (1-4, not 0-3)
- [ ] Shows current instrument name
- [ ] Shows instrument category
- [ ] X button closes modal
- [ ] Backdrop click closes modal
- [ ] Escape key closes modal
- [ ] Cancel button closes modal
- [ ] Save button closes modal (no changes yet)
- [ ] Edit buttons disabled during playback
- [ ] Body scroll locked when modal open
- [ ] No console errors
- [ ] Responsive on mobile (modal fits screen)

---

## Milestone 7: Simple Editor - Preset Selector (2-3 hours)

### Overview

Add a dropdown inside the modal that allows selecting a different preset instrument. When Save is clicked, the selected preset replaces the track's current instrument.

---

### Step 1: Add preset dropdown to editor (60 min)

**File: `src/components/InstrumentEditor.tsx` (MODIFY)**

**Replace `.editor-placeholder` section with:**

```typescript
{/* Preset Selection */}
<div className="editor-section">
  <label className="editor-label" htmlFor="preset-select">
    Select Preset
  </label>
  <select
    id="preset-select"
    className="editor-preset-select"
    value={editedPatch.id}
    onChange={(e) => {
      const newPatchId = parseInt(e.target.value, 10);
      const newPatch = availablePatches.find(p => p.id === newPatchId);
      if (newPatch) {
        setEditedPatch(newPatch);
      }
    }}
  >
    {availablePatches.map(patch => (
      <option key={patch.id} value={patch.id}>
        {patch.id} - {patch.name}
        {patch.category ? ` (${patch.category})` : ''}
      </option>
    ))}
  </select>

  {editedPatch.id !== currentPatch.id && (
    <p className="editor-change-notice">
      ⚠️ Preset changed. Click Save to apply.
    </p>
  )}
</div>
```

**Add CSS for preset selector (in InstrumentEditor.css):**

```css
/* Editor sections */
.editor-section {
  margin-bottom: 24px;
}

.editor-label {
  display: block;
  margin-bottom: 8px;
  color: #cccccc;
  font-size: 13px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.editor-preset-select {
  width: 100%;
  padding: 10px 12px;
  background-color: #2a2a2a;
  border: 1px solid #4d4d4d;
  border-radius: 4px;
  color: #ffffff;
  font-size: 14px;
  font-family: 'Courier New', monospace;
  cursor: pointer;
  transition: border-color 0.2s;
}

.editor-preset-select:hover {
  border-color: #6d6d6d;
}

.editor-preset-select:focus {
  outline: none;
  border-color: #4a9eff;
}

.editor-change-notice {
  margin-top: 8px;
  padding: 8px 12px;
  background-color: rgba(255, 200, 0, 0.1);
  border-left: 3px solid #ffc800;
  color: #ffc800;
  font-size: 13px;
  border-radius: 0 4px 4px 0;
}
```

---

### Step 2: Update InstrumentSelector to reflect changes (15 min)

The InstrumentSelector should already update automatically via the `trackInstruments` state. No code changes needed.

Just verify that when `handleSaveInstrument` is called in App.tsx, it updates the state correctly (which you already added in Milestone 6).

---

### Step 3: Manual Testing (45-60 min)

#### Test 1: Preset Dropdown Shows All Instruments

1. Open editor for Track 0
2. Click preset dropdown
3. **Expected:**
   - See all instruments in bank
   - Format: "ID - Name (Category)"
   - Current instrument is pre-selected
   - Dropdown is scrollable

#### Test 2: Change Preset

1. Open editor for Track 0 (currently Piano)
2. Change dropdown to "1 - Synth Bass"
3. **Expected:**
   - Warning appears: "⚠️ Preset changed. Click Save to apply."
   - Modal still open
   - Track dropdown (outside modal) still shows Piano

#### Test 3: Save Preset Change

1. Open editor for Track 0
2. Change to Bass
3. Click Save
4. **Expected:**
   - Modal closes
   - Track 0 dropdown now shows Bass
   - Console log: "[App] Saving instrument for track 0: Synth Bass"

#### Test 4: Play with New Preset

1. Change Track 0 to Bass
2. Save
3. Enter note C-4 in Track 0, Row 0
4. Play pattern
5. **Expected:**
   - Track 0 sounds like Bass (not Piano)

#### Test 5: Cancel Discards Changes

1. Open editor for Track 0 (Piano)
2. Change to Lead
3. Click Cancel
4. **Expected:**
   - Modal closes
   - Track 0 still shows Piano
   - No changes applied

#### Test 6: Multiple Track Changes

1. Change Track 0 to Bass
2. Change Track 1 to Lead
3. Change Track 2 to Pad
4. Change Track 3 to Piano
5. Play pattern
6. **Expected:**
   - Each track sounds like its new instrument
   - All 4 tracks have different timbres

#### Test 7: GENMIDI Bank (if loaded)

1. Ensure GENMIDI loaded (check console)
2. Open editor
3. **Expected:**
   - See 128 instruments in dropdown
   - Can select any GM instrument
   - Saving works correctly

---

### Success Criteria - Milestone 7

- [ ] Preset dropdown shows all available instruments
- [ ] Current instrument is pre-selected
- [ ] Changing dropdown shows warning message
- [ ] Warning disappears if reverting to original
- [ ] Save applies the preset change
- [ ] Track dropdown updates after save
- [ ] Cancel discards changes
- [ ] Can switch instruments for all 4 tracks
- [ ] Pattern plays with new instruments
- [ ] No console errors

---

## Milestone 8: Simple Editor - ADSR Sliders (3-4 hours)

### Overview

Add 4 sliders to edit the envelope:
- **Attack** (0-15): How quickly note reaches full volume
- **Decay** (0-15): How quickly it drops to sustain level
- **Sustain** (0-15): Volume level while note held (inverted: 0=loud, 15=quiet)
- **Release** (0-15): How quickly note fades after release

Also add a Preview button to hear changes before saving.

---

### Step 1: Add ADSR sliders to editor (90-120 min)

**File: `src/components/InstrumentEditor.tsx` (MODIFY)**

**Add after preset selection section:**

```typescript
{/* ADSR Envelope */}
<div className="editor-section">
  <h3 className="editor-section-title">Envelope (ADSR)</h3>
  <p className="editor-section-desc">
    Controls how the sound evolves over time
  </p>

  {/* Attack */}
  <div className="editor-param">
    <label className="editor-param-label" htmlFor="attack-mod">
      Attack (Modulator)
    </label>
    <div className="editor-slider-group">
      <input
        type="range"
        id="attack-mod"
        className="editor-slider"
        min="0"
        max="15"
        value={editedPatch.modulator.attackRate}
        onChange={(e) => {
          const value = parseInt(e.target.value, 10);
          setEditedPatch({
            ...editedPatch,
            modulator: {
              ...editedPatch.modulator,
              attackRate: value
            }
          });
        }}
      />
      <span className="editor-value">{editedPatch.modulator.attackRate}</span>
    </div>
    <p className="editor-param-hint">
      Higher = faster attack (15 = instant, 0 = ~1 second)
    </p>
  </div>

  <div className="editor-param">
    <label className="editor-param-label" htmlFor="attack-car">
      Attack (Carrier)
    </label>
    <div className="editor-slider-group">
      <input
        type="range"
        id="attack-car"
        className="editor-slider"
        min="0"
        max="15"
        value={editedPatch.carrier.attackRate}
        onChange={(e) => {
          const value = parseInt(e.target.value, 10);
          setEditedPatch({
            ...editedPatch,
            carrier: {
              ...editedPatch.carrier,
              attackRate: value
            }
          });
        }}
      />
      <span className="editor-value">{editedPatch.carrier.attackRate}</span>
    </div>
  </div>

  {/* Decay */}
  <div className="editor-param">
    <label className="editor-param-label" htmlFor="decay-mod">
      Decay (Modulator)
    </label>
    <div className="editor-slider-group">
      <input
        type="range"
        id="decay-mod"
        className="editor-slider"
        min="0"
        max="15"
        value={editedPatch.modulator.decayRate}
        onChange={(e) => {
          const value = parseInt(e.target.value, 10);
          setEditedPatch({
            ...editedPatch,
            modulator: {
              ...editedPatch.modulator,
              decayRate: value
            }
          });
        }}
      />
      <span className="editor-value">{editedPatch.modulator.decayRate}</span>
    </div>
    <p className="editor-param-hint">
      How fast volume drops to sustain level
    </p>
  </div>

  <div className="editor-param">
    <label className="editor-param-label" htmlFor="decay-car">
      Decay (Carrier)
    </label>
    <div className="editor-slider-group">
      <input
        type="range"
        id="decay-car"
        className="editor-slider"
        min="0"
        max="15"
        value={editedPatch.carrier.decayRate}
        onChange={(e) => {
          const value = parseInt(e.target.value, 10);
          setEditedPatch({
            ...editedPatch,
            carrier: {
              ...editedPatch.carrier,
              decayRate: value
            }
          });
        }}
      />
      <span className="editor-value">{editedPatch.carrier.decayRate}</span>
    </div>
  </div>

  {/* Sustain */}
  <div className="editor-param">
    <label className="editor-param-label" htmlFor="sustain-mod">
      Sustain Level (Modulator)
    </label>
    <div className="editor-slider-group">
      <input
        type="range"
        id="sustain-mod"
        className="editor-slider"
        min="0"
        max="15"
        value={editedPatch.modulator.sustainLevel}
        onChange={(e) => {
          const value = parseInt(e.target.value, 10);
          setEditedPatch({
            ...editedPatch,
            modulator: {
              ...editedPatch.modulator,
              sustainLevel: value
            }
          });
        }}
      />
      <span className="editor-value">{editedPatch.modulator.sustainLevel}</span>
    </div>
    <p className="editor-param-hint">
      Volume while note held (0 = loudest, 15 = quietest)
    </p>
  </div>

  <div className="editor-param">
    <label className="editor-param-label" htmlFor="sustain-car">
      Sustain Level (Carrier)
    </label>
    <div className="editor-slider-group">
      <input
        type="range"
        id="sustain-car"
        className="editor-slider"
        min="0"
        max="15"
        value={editedPatch.carrier.sustainLevel}
        onChange={(e) => {
          const value = parseInt(e.target.value, 10);
          setEditedPatch({
            ...editedPatch,
            carrier: {
              ...editedPatch.carrier,
              sustainLevel: value
            }
          });
        }}
      />
      <span className="editor-value">{editedPatch.carrier.sustainLevel}</span>
    </div>
  </div>

  {/* Release */}
  <div className="editor-param">
    <label className="editor-param-label" htmlFor="release-mod">
      Release (Modulator)
    </label>
    <div className="editor-slider-group">
      <input
        type="range"
        id="release-mod"
        className="editor-slider"
        min="0"
        max="15"
        value={editedPatch.modulator.releaseRate}
        onChange={(e) => {
          const value = parseInt(e.target.value, 10);
          setEditedPatch({
            ...editedPatch,
            modulator: {
              ...editedPatch.modulator,
              releaseRate: value
            }
          });
        }}
      />
      <span className="editor-value">{editedPatch.modulator.releaseRate}</span>
    </div>
    <p className="editor-param-hint">
      How fast sound fades after note released
    </p>
  </div>

  <div className="editor-param">
    <label className="editor-param-label" htmlFor="release-car">
      Release (Carrier)
    </label>
    <div className="editor-slider-group">
      <input
        type="range"
        id="release-car"
        className="editor-slider"
        min="0"
        max="15"
        value={editedPatch.carrier.releaseRate}
        onChange={(e) => {
          const value = parseInt(e.target.value, 10);
          setEditedPatch({
            ...editedPatch,
            carrier: {
              ...editedPatch.carrier,
              releaseRate: value
            }
          });
        }}
      />
      <span className="editor-value">{editedPatch.carrier.releaseRate}</span>
    </div>
  </div>
</div>
```

---

### Step 2: Add Preview button (30-45 min)

**Add state for preview note:**

```typescript
const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
```

**Add preview function:**

```typescript
/**
 * Preview the current edited patch
 * Temporarily loads it to channel 8 (unused by tracker)
 */
const handlePreview = () => {
  if (!synth || isPreviewPlaying) return;

  const PREVIEW_CHANNEL = 8; // Channel 8 unused by 4-track pattern
  const PREVIEW_NOTE = 60;   // Middle C
  const PREVIEW_DURATION = 1000; // 1 second

  console.log('[Editor] Previewing patch:', editedPatch.name);

  // Load edited patch to preview channel
  synth.loadPatch(PREVIEW_CHANNEL, editedPatch);

  // Play note
  synth.noteOn(PREVIEW_CHANNEL, PREVIEW_NOTE);
  setIsPreviewPlaying(true);

  // Stop after duration
  setTimeout(() => {
    synth.noteOff(PREVIEW_CHANNEL, PREVIEW_NOTE);
    setIsPreviewPlaying(false);
  }, PREVIEW_DURATION);
};
```

**Add preview button in footer (before Save button):**

```typescript
<button
  className="editor-button editor-button-preview"
  onClick={handlePreview}
  disabled={!synth || isPreviewPlaying}
>
  {isPreviewPlaying ? 'Playing...' : '▶ Preview'}
</button>
```

**Add CSS for preview button:**

```css
.editor-button-preview {
  background-color: #2a2a2a;
  color: #4a9eff;
  border: 1px solid #4a9eff;
  margin-right: auto; /* Push to left side */
}

.editor-button-preview:hover:not(:disabled) {
  background-color: #3a3a3a;
}

.editor-button-preview:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

### Step 3: Add CSS for sliders (30 min)

**File: `src/components/InstrumentEditor.css` (ADD)**

```css
/* Section headers */
.editor-section-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #ffffff;
  font-weight: 600;
}

.editor-section-desc {
  margin: 0 0 16px 0;
  font-size: 13px;
  color: #999;
}

/* Parameter controls */
.editor-param {
  margin-bottom: 20px;
}

.editor-param-label {
  display: block;
  margin-bottom: 6px;
  color: #cccccc;
  font-size: 13px;
}

.editor-slider-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.editor-slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #3d3d3d;
  outline: none;
  -webkit-appearance: none;
}

.editor-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #4a9eff;
  cursor: pointer;
  transition: background 0.2s;
}

.editor-slider::-webkit-slider-thumb:hover {
  background: #3d8ee6;
}

.editor-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #4a9eff;
  cursor: pointer;
  border: none;
  transition: background 0.2s;
}

.editor-slider::-moz-range-thumb:hover {
  background: #3d8ee6;
}

.editor-value {
  min-width: 30px;
  text-align: right;
  color: #4a9eff;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  font-weight: 600;
}

.editor-param-hint {
  margin: 4px 0 0 0;
  font-size: 11px;
  color: #666;
  font-style: italic;
}
```

---

### Step 4: Manual Testing (60-90 min)

#### Test 1: Sliders Display

1. Open editor for Track 0 (Piano)
2. **Expected:**
   - See "Envelope (ADSR)" section
   - 8 sliders total (4 params × 2 operators)
   - Each slider shows current value
   - Values match current patch

#### Test 2: Slider Interaction

1. Move Attack (Modulator) slider
2. **Expected:**
   - Value updates in real-time
   - Number displays next to slider
   - Slider is smooth

#### Test 3: Preview Original Patch

1. Open editor
2. Click Preview button
3. **Expected:**
   - Button changes to "Playing..."
   - Hear middle C for ~1 second
   - Button returns to "▶ Preview"
   - No errors in console

#### Test 4: Edit and Preview

1. Open editor for Piano
2. Change Attack (Carrier) from 14 to 0 (slow attack)
3. Click Preview
4. **Expected:**
   - Hear slow attack (sound fades in over ~1 second)
   - Different from original piano

#### Test 5: Extreme Values

1. Set all Attack to 0 (slowest)
2. Preview → hear very slow attack
3. Set all Attack to 15 (fastest)
4. Preview → hear instant attack
5. Set all Sustain to 0 (loudest)
6. Preview → loud sustained note
7. Set all Sustain to 15 (quietest)
8. Preview → very quiet sustain

#### Test 6: Save Edited Patch

1. Open editor for Track 0
2. Change Attack (Carrier) to 0
3. Change Release (Carrier) to 12
4. Click Save
5. Enter C-4 in Track 0, Row 0
6. Play pattern
7. **Expected:**
   - Track 0 has slow attack
   - Track 0 has fast release
   - Other tracks unchanged

#### Test 7: Custom Patch Persistence

1. Edit Track 0's ADSR
2. Save
3. Check console: "Saving instrument for track 0: Acoustic Grand Piano"
4. Open editor again
5. **Expected:**
   - Sliders show edited values (not original)
   - Preview plays with edited values

#### Test 8: Cancel Discards ADSR Changes

1. Open editor
2. Change all ADSR values
3. Preview (sounds different)
4. Click Cancel
5. Play pattern
6. **Expected:**
   - Sound reverts to original
   - ADSR changes not saved

#### Test 9: Multiple Track Edits

1. Edit Track 0: Slow attack
2. Save
3. Edit Track 1: Fast attack
4. Save
5. Edit Track 2: Long sustain
6. Save
7. Play pattern with notes in all tracks
8. **Expected:**
   - Each track has its custom ADSR
   - All sound different

#### Test 10: Preview During Playback

1. Start pattern playing
2. Open editor (should work, not disabled)
3. Click Preview
4. **Expected:**
   - Preview plays on channel 8
   - Pattern continues on channels 0-3
   - No interference

---

### Success Criteria - Milestone 8

- [ ] ADSR section visible with 8 sliders
- [ ] Sliders show correct current values
- [ ] Moving slider updates value display
- [ ] Preview button plays middle C
- [ ] Preview uses current slider values
- [ ] Edited values save correctly
- [ ] Cancel discards ADSR changes
- [ ] Custom patches persist in session
- [ ] Can edit all 4 tracks independently
- [ ] Pattern plays with custom ADSR values
- [ ] Preview doesn't interfere with playback
- [ ] No console errors

---

## Combined Testing Checklist

### Milestones 6-8 Integration Test

1. **Clean state:**
   ```bash
   # Clear localStorage
   # Reload page
   ```

2. **Modal shell test:**
   - [ ] Click Edit button → modal opens
   - [ ] Header shows correct track
   - [ ] X / Escape / Backdrop close modal
   - [ ] Edit disabled during playback

3. **Preset selector test:**
   - [ ] Dropdown shows all presets
   - [ ] Current preset selected
   - [ ] Change preset → warning appears
   - [ ] Save → track uses new preset
   - [ ] Cancel → reverts to original

4. **ADSR test:**
   - [ ] All 8 sliders visible
   - [ ] Values match current patch
   - [ ] Move slider → value updates
   - [ ] Preview → hear middle C
   - [ ] Edit ADSR → Preview reflects changes
   - [ ] Save → pattern uses custom ADSR

5. **Full workflow test:**
   - [ ] Open Track 0 editor
   - [ ] Change preset to Bass
   - [ ] Adjust Attack to 0
   - [ ] Adjust Release to 12
   - [ ] Preview (should sound like slow-attack bass)
   - [ ] Save
   - [ ] Play pattern
   - [ ] Track 0 sounds like edited bass

---

## Troubleshooting

### Problem: Modal doesn't open

**Solution:**
1. Check console for errors
2. Verify InstrumentEditor imported in App.tsx
3. Check `editorOpen` state updates
4. Ensure `onEditClick` prop passed to InstrumentSelector

### Problem: Preview doesn't play

**Solution:**
1. Check `synth` prop passed to InstrumentEditor
2. Verify channel 8 works: `window.synth.noteOn(8, 60)`
3. Check console for errors during preview
4. Ensure OPL3 initialized

### Problem: ADSR changes don't save

**Solution:**
1. Check `handleSaveInstrument` in App.tsx
2. Verify `instrumentBank` updates with custom patches
3. Check if `patch.isCustom` flag set correctly
4. Reload patch after save: `synth.loadPatch(trackId, patch)`

### Problem: Sliders look broken

**Solution:**
1. Verify InstrumentEditor.css imported
2. Check browser supports range input styling
3. Try different browser
4. Check for CSS conflicts

---

## Next Steps

Once Milestones 6-8 pass:

1. ✅ Mark Milestones 6-8 complete in MILESTONES.md
2. Test thoroughly on desktop and mobile
3. Commit:
   ```bash
   git add .
   git commit -m "Milestones 6-8: Simple instrument editor with ADSR"
   ```
4. Move to Milestones 9-11: Complete Simple view + Advanced view

---

## Files Changed Summary

**New Files:**
- `src/components/InstrumentEditor.tsx` - Modal component with preset + ADSR
- `src/components/InstrumentEditor.css` - Modal and slider styling

**Modified Files:**
- `src/App.tsx` - Modal state, handlers, save logic
- `src/components/InstrumentSelector.tsx` - Add Edit button, onEditClick prop

**Lines Changed:** ~450 lines added, ~10 lines modified

---

## Time Tracking

| Task | Estimated | Actual |
|------|-----------|--------|
| Milestone 6: Modal shell | 3-4 hours | ___ |
| Milestone 7: Preset selector | 2-3 hours | ___ |
| Milestone 8: ADSR sliders | 3-4 hours | ___ |
| **TOTAL** | **8-11 hours** | ___ |
