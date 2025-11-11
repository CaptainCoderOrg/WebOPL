# Milestones 12-13: Persistence & Polish

**Goal:** Add localStorage persistence and final polish for production

**Time Estimate:** 5-7 hours total

**Status:** Not Started

---

## Milestone 12: LocalStorage Persistence (2-3 hours)

### Overview

Save instrument selections and custom patches to localStorage so they persist across page reloads. This includes:
- Track-to-instrument assignments (which instrument on each track)
- Custom patch definitions (user-edited instruments)
- Instrument bank state (GENMIDI + customs)

---

### Step 1: Create storage manager utility (60-90 min)

**File: `src/utils/storageManager.ts` (NEW)**

```typescript
/**
 * LocalStorage Manager for Instrument Panel
 * Handles persistence of instrument selections and custom patches
 */

import type { OPLPatch } from '../types/OPLPatch';

/**
 * Storage keys
 */
const STORAGE_KEYS = {
  TRACK_INSTRUMENTS: 'webopl-track-instruments',
  CUSTOM_PATCHES: 'webopl-custom-patches',
  INSTRUMENT_BANK_VERSION: 'webopl-instrument-bank-version',
} as const;

/**
 * Current version of the storage schema
 * Increment this when making breaking changes to the data structure
 */
const STORAGE_VERSION = 1;

/**
 * Persisted data structure
 */
export interface PersistedInstrumentData {
  version: number;
  trackInstruments: number[];  // [0, 1, 2, 3] - patch IDs per track
  customPatches: OPLPatch[];   // User-created custom patches
  timestamp: number;            // When saved
}

/**
 * Save track instrument assignments
 */
export function saveTrackInstruments(trackInstruments: number[]): void {
  try {
    localStorage.setItem(
      STORAGE_KEYS.TRACK_INSTRUMENTS,
      JSON.stringify(trackInstruments)
    );
    console.log('[Storage] Saved track instruments:', trackInstruments);
  } catch (error) {
    console.error('[Storage] Failed to save track instruments:', error);
  }
}

/**
 * Load track instrument assignments
 * Returns null if not found or invalid
 */
export function loadTrackInstruments(): number[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TRACK_INSTRUMENTS);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // Validate: must be array of 4 numbers
    if (
      Array.isArray(parsed) &&
      parsed.length === 4 &&
      parsed.every(n => typeof n === 'number')
    ) {
      console.log('[Storage] Loaded track instruments:', parsed);
      return parsed;
    } else {
      console.warn('[Storage] Invalid track instruments format, ignoring');
      return null;
    }
  } catch (error) {
    console.error('[Storage] Failed to load track instruments:', error);
    return null;
  }
}

/**
 * Save custom patches
 */
export function saveCustomPatches(customPatches: OPLPatch[]): void {
  try {
    // Only save patches marked as custom
    const customs = customPatches.filter(p => p.isCustom);

    localStorage.setItem(
      STORAGE_KEYS.CUSTOM_PATCHES,
      JSON.stringify(customs)
    );
    console.log(`[Storage] Saved ${customs.length} custom patches`);
  } catch (error) {
    console.error('[Storage] Failed to save custom patches:', error);
  }
}

/**
 * Load custom patches
 * Returns empty array if not found or invalid
 */
export function loadCustomPatches(): OPLPatch[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_PATCHES);
    if (!stored) return [];

    const parsed = JSON.parse(stored);

    // Validate: must be array
    if (Array.isArray(parsed)) {
      console.log(`[Storage] Loaded ${parsed.length} custom patches`);
      return parsed;
    } else {
      console.warn('[Storage] Invalid custom patches format, ignoring');
      return [];
    }
  } catch (error) {
    console.error('[Storage] Failed to load custom patches:', error);
    return [];
  }
}

/**
 * Save complete instrument state (track assignments + customs)
 */
export function saveInstrumentState(
  trackInstruments: number[],
  customPatches: OPLPatch[]
): void {
  saveTrackInstruments(trackInstruments);
  saveCustomPatches(customPatches);

  // Save version for future compatibility checks
  localStorage.setItem(
    STORAGE_KEYS.INSTRUMENT_BANK_VERSION,
    STORAGE_VERSION.toString()
  );
}

/**
 * Load complete instrument state
 */
export function loadInstrumentState(): {
  trackInstruments: number[] | null;
  customPatches: OPLPatch[];
} {
  // Check version compatibility
  const storedVersion = localStorage.getItem(STORAGE_KEYS.INSTRUMENT_BANK_VERSION);
  if (storedVersion && parseInt(storedVersion, 10) !== STORAGE_VERSION) {
    console.warn('[Storage] Version mismatch, clearing old data');
    clearInstrumentState();
    return {
      trackInstruments: null,
      customPatches: []
    };
  }

  return {
    trackInstruments: loadTrackInstruments(),
    customPatches: loadCustomPatches()
  };
}

/**
 * Clear all instrument data from storage
 */
export function clearInstrumentState(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.TRACK_INSTRUMENTS);
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_PATCHES);
    localStorage.removeItem(STORAGE_KEYS.INSTRUMENT_BANK_VERSION);
    console.log('[Storage] Cleared all instrument data');
  } catch (error) {
    console.error('[Storage] Failed to clear instrument data:', error);
  }
}

/**
 * Check if custom patch with given ID exists in storage
 */
export function hasCustomPatch(patchId: number): boolean {
  const customs = loadCustomPatches();
  return customs.some(p => p.id === patchId);
}

/**
 * Get storage usage info (for debugging)
 */
export function getStorageInfo(): {
  trackInstruments: boolean;
  customPatchCount: number;
  totalSize: number;
} {
  const trackInstruments = loadTrackInstruments();
  const customPatches = loadCustomPatches();

  let totalSize = 0;
  Object.values(STORAGE_KEYS).forEach(key => {
    const item = localStorage.getItem(key);
    if (item) {
      totalSize += item.length;
    }
  });

  return {
    trackInstruments: trackInstruments !== null,
    customPatchCount: customPatches.length,
    totalSize
  };
}
```

---

### Step 2: Integrate storage into App.tsx (45-60 min)

**File: `src/App.tsx` (MODIFY)**

**Add import:**

```typescript
import {
  loadInstrumentState,
  saveInstrumentState,
  clearInstrumentState,
  getStorageInfo
} from './utils/storageManager';
```

**Add useEffect to load state on mount (after synth initialization):**

```typescript
/**
 * Load persisted instrument state on startup
 */
useEffect(() => {
  if (!isReady || !synth) return;

  console.log('[App] Loading persisted instrument state...');
  const { trackInstruments: savedTracks, customPatches: savedCustoms } = loadInstrumentState();

  // Load custom patches into instrument bank
  if (savedCustoms.length > 0) {
    setInstrumentBank(prev => {
      // Merge customs with existing bank
      const merged = [...prev];
      savedCustoms.forEach(custom => {
        const existingIndex = merged.findIndex(p => p.id === custom.id);
        if (existingIndex >= 0) {
          merged[existingIndex] = custom; // Replace
        } else {
          merged.push(custom); // Add new
        }
      });
      return merged;
    });
    console.log(`[App] Restored ${savedCustoms.length} custom patches`);
  }

  // Load track assignments
  if (savedTracks) {
    setTrackInstruments(savedTracks);

    // Apply to synth
    savedTracks.forEach((patchId, trackId) => {
      const patch = instrumentBank.find(p => p.id === patchId) ||
                     savedCustoms.find(p => p.id === patchId);
      if (patch) {
        synth.loadPatch(trackId, patch);
        console.log(`[App] Restored Track ${trackId}: ${patch.name}`);
      }
    });
  }

  // Log storage info
  const info = getStorageInfo();
  console.log('[App] Storage info:', info);
}, [isReady, synth]); // Only run once on init
```

**Add useEffect to save state when it changes:**

```typescript
/**
 * Save instrument state whenever it changes
 */
useEffect(() => {
  if (!isReady) return;

  // Debounce saves to avoid excessive writes
  const timeoutId = setTimeout(() => {
    const customPatches = instrumentBank.filter(p => p.isCustom);
    saveInstrumentState(trackInstruments, customPatches);
  }, 500); // Wait 500ms after last change

  return () => clearTimeout(timeoutId);
}, [trackInstruments, instrumentBank, isReady]);
```

**Update handleSaveInstrument to mark patches as custom:**

```typescript
const handleSaveInstrument = (trackId: number, patch: OPLPatch) => {
  console.log(`[App] Saving instrument for track ${trackId}:`, patch.name);

  // If patch was edited, mark as custom
  const originalPatch = instrumentBank.find(p => p.id === patch.id && !p.isCustom);
  const isModified = originalPatch && JSON.stringify(originalPatch) !== JSON.stringify(patch);

  if (isModified) {
    // Create new custom patch with unique ID
    const customId = Date.now(); // Use timestamp as unique ID
    const customPatch: OPLPatch = {
      ...patch,
      id: customId,
      name: `${patch.name} (Custom)`,
      isCustom: true,
      basePresetId: patch.id
    };

    // Add to bank
    setInstrumentBank(prev => [...prev, customPatch]);

    // Assign to track
    setTrackInstruments(prev => {
      const next = [...prev];
      next[trackId] = customId;
      return next;
    });

    // Load to synth
    if (synth) {
      synth.loadPatch(trackId, customPatch);
    }
  } else {
    // Unmodified preset
    setTrackInstruments(prev => {
      const next = [...prev];
      next[trackId] = patch.id;
      return next;
    });

    if (synth) {
      synth.loadPatch(trackId, patch);
    }
  }

  setEditorOpen(false);
};
```

---

### Step 3: Add clear storage button (optional) (15-30 min)

**Add button to help section or settings:**

```typescript
{/* Developer Tools / Settings section */}
{import.meta.env.DEV && (
  <div className="dev-tools">
    <h3>Developer Tools</h3>
    <button
      onClick={() => {
        if (confirm('Clear all saved instrument data? This cannot be undone.')) {
          clearInstrumentState();
          window.location.reload();
        }
      }}
      className="dev-button"
    >
      Clear Saved Instruments
    </button>
    <button
      onClick={() => {
        const info = getStorageInfo();
        alert(`Storage Info:\n\nTrack Assignments: ${info.trackInstruments ? 'Saved' : 'Not saved'}\nCustom Patches: ${info.customPatchCount}\nTotal Size: ${info.totalSize} bytes`);
      }}
      className="dev-button"
    >
      Show Storage Info
    </button>
  </div>
)}
```

**Add CSS:**

```css
.dev-tools {
  margin-top: 20px;
  padding: 16px;
  background-color: #2a2a2a;
  border: 1px solid #3d3d3d;
  border-radius: 4px;
}

.dev-tools h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #999;
}

.dev-button {
  margin-right: 8px;
  padding: 6px 12px;
  background-color: #3d3d3d;
  border: 1px solid #4d4d4d;
  border-radius: 3px;
  color: #ccc;
  font-size: 12px;
  cursor: pointer;
}

.dev-button:hover {
  background-color: #4d4d4d;
}
```

---

### Step 4: Manual Testing (45-60 min)

#### Test 1: Basic Persistence

1. Open app (fresh start)
2. Change Track 0 to Bass
3. Reload page
4. **Expected:**
   - Track 0 still shows Bass
   - Console: "Restored Track 0: Synth Bass"

#### Test 2: Multiple Track Persistence

1. Change all 4 tracks to different instruments
2. Reload page
3. **Expected:**
   - All 4 tracks show correct instruments
   - Pattern plays with correct sounds

#### Test 3: Custom Patch Persistence

1. Open editor for Track 0
2. Edit ADSR values
3. Save
4. Reload page
5. Open editor for Track 0
6. **Expected:**
   - Custom values still present
   - Name shows "(Custom)"

#### Test 4: Multiple Custom Patches

1. Create custom patch on Track 0
2. Create custom patch on Track 1
3. Create custom patch on Track 2
4. Reload page
5. **Expected:**
   - All 3 customs restored
   - All 3 tracks use custom sounds

#### Test 5: Clear Storage

1. Create custom patches
2. Click "Clear Saved Instruments" (dev tools)
3. Confirm
4. Page reloads
5. **Expected:**
   - Back to default patches (Piano, Bass, Lead, Pad)
   - Custom patches gone

#### Test 6: Storage Info

1. Create 2 custom patches
2. Click "Show Storage Info"
3. **Expected:**
   - "Track Assignments: Saved"
   - "Custom Patches: 2"
   - "Total Size: ~XXXX bytes"

#### Test 7: Incognito Mode

1. Open app in incognito/private window
2. Change instruments
3. Reload page
4. **Expected:**
   - Changes NOT persisted (incognito blocks localStorage)
   - No errors in console

#### Test 8: Version Compatibility

1. Manually set version in localStorage to 0:
   ```javascript
   localStorage.setItem('webopl-instrument-bank-version', '0');
   ```
2. Reload page
3. **Expected:**
   - Console: "Version mismatch, clearing old data"
   - Starts with defaults

#### Test 9: Corrupted Data Handling

1. Manually corrupt data:
   ```javascript
   localStorage.setItem('webopl-track-instruments', '{invalid json}');
   ```
2. Reload page
3. **Expected:**
   - Console error logged
   - Falls back to defaults
   - No crash

---

### Success Criteria - Milestone 12

- [ ] Track assignments persist across reloads
- [ ] Custom patches persist across reloads
- [ ] Multiple custom patches supported
- [ ] Clear storage button works
- [ ] Storage info displays correctly
- [ ] Handles incognito mode gracefully
- [ ] Handles corrupted data gracefully
- [ ] Version checking prevents incompatible data
- [ ] No performance issues (debounced saves)
- [ ] Console logs helpful info

---

## Milestone 13: Polish & Documentation (3-4 hours)

### Overview

Final touches to make the feature production-ready:
- Help documentation
- Tooltips for parameters
- Mobile responsiveness
- Accessibility improvements
- Comprehensive testing
- Update STATUS.md

---

### Step 1: Add help documentation (60 min)

**File: `src/components/InstrumentHelp.tsx` (NEW)**

```typescript
/**
 * InstrumentHelp Component
 * Collapsible help section explaining how to use the instrument panel
 */

import React, { useState } from 'react';
import './InstrumentHelp.css';

export function InstrumentHelp() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="instrument-help">
      <button
        className="help-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        {isOpen ? '▼' : '▶'} Help: How to Use Instruments
      </button>

      {isOpen && (
        <div className="help-content">
          <section className="help-section">
            <h3>Quick Start</h3>
            <ol>
              <li>Each track (column) can use a different instrument</li>
              <li>Use the dropdowns to select preset instruments (0-127)</li>
              <li>Click the ✏️ button to edit an instrument's parameters</li>
              <li>Changes are saved automatically</li>
            </ol>
          </section>

          <section className="help-section">
            <h3>Simple vs Advanced View</h3>
            <p>
              <strong>Simple:</strong> 10 most important parameters for quick edits<br />
              <strong>Advanced:</strong> All 24+ OPL3 parameters for deep customization
            </p>
          </section>

          <section className="help-section">
            <h3>Key Parameters</h3>
            <dl className="help-params">
              <dt>Attack</dt>
              <dd>How quickly the note reaches full volume (15=instant, 0=slow)</dd>

              <dt>Decay</dt>
              <dd>How quickly it drops to sustain level after attack</dd>

              <dt>Sustain</dt>
              <dd>Volume level while note is held (0=loudest, 15=quietest)</dd>

              <dt>Release</dt>
              <dd>How quickly the note fades after release</dd>

              <dt>Feedback</dt>
              <dd>Adds harmonics and metallic quality (0=clean, 7=harsh)</dd>

              <dt>Waveform</dt>
              <dd>Basic wave shape (Sine=smooth, Square=bright)</dd>

              <dt>Connection</dt>
              <dd>FM=complex tones, Additive=simple/bright tones</dd>
            </dl>
          </section>

          <section className="help-section">
            <h3>Tips</h3>
            <ul>
              <li>Use Preview button to hear changes before saving</li>
              <li>Start with a similar preset, then adjust</li>
              <li>Attack and Release are most important for character</li>
              <li>Feedback adds brightness and harmonics</li>
              <li>Custom patches are saved automatically</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>About OPL3</h3>
            <p>
              OPL3 is FM (Frequency Modulation) synthesis with 2 operators per channel.
              The <strong>Modulator</strong> shapes the <strong>Carrier</strong>'s frequency,
              creating rich and complex tones. This is the same chip used in
              Sound Blaster 16, AdLib, and Doom!
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
```

**File: `src/components/InstrumentHelp.css` (NEW)**

```css
.instrument-help {
  margin: 16px 0;
}

.help-toggle {
  width: 100%;
  padding: 12px 16px;
  background-color: #2a2a2a;
  border: 1px solid #3d3d3d;
  border-radius: 4px;
  color: #4a9eff;
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
}

.help-toggle:hover {
  background-color: #2d2d2d;
  border-color: #4d4d4d;
}

.help-content {
  margin-top: 12px;
  padding: 20px;
  background-color: #252525;
  border: 1px solid #3d3d3d;
  border-radius: 4px;
  color: #ccc;
  line-height: 1.6;
}

.help-section {
  margin-bottom: 24px;
}

.help-section:last-child {
  margin-bottom: 0;
}

.help-section h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #4a9eff;
  font-weight: 600;
}

.help-section ol,
.help-section ul {
  margin: 8px 0;
  padding-left: 20px;
}

.help-section li {
  margin: 6px 0;
  font-size: 14px;
}

.help-params {
  margin: 12px 0;
}

.help-params dt {
  margin-top: 12px;
  font-weight: 600;
  color: #4a9eff;
  font-size: 14px;
}

.help-params dd {
  margin: 4px 0 0 20px;
  font-size: 13px;
  color: #999;
}

.help-section p {
  margin: 8px 0;
  font-size: 14px;
}
```

**Add to App.tsx (after InstrumentSelector):**

```typescript
import { InstrumentHelp } from './components/InstrumentHelp';

// In JSX:
<InstrumentSelector ... />
<InstrumentHelp />
```

---

### Step 2: Add tooltips to editor (45 min)

**Install a tooltip library (optional) or use title attributes:**

Simple approach using native `title` attribute:

**File: `src/components/InstrumentEditor.tsx` (MODIFY)**

**Add titles to key elements:**

```typescript
// Example for Attack slider:
<input
  type="range"
  id="attack-car"
  className="editor-slider"
  min="0"
  max="15"
  value={editedPatch.carrier.attackRate}
  onChange={...}
  title="How quickly the note reaches full volume. 15 = instant attack, 0 = slow fade-in (~1 second)"
/>

// Example for Feedback:
<input
  type="range"
  id="feedback"
  className="editor-slider"
  min="0"
  max="7"
  value={editedPatch.feedback}
  onChange={...}
  title="Adds harmonics and metallic quality. 0 = clean sine-like tone, 7 = harsh metallic sound"
/>

// Example for Waveform:
<select
  id="waveform-car"
  className="editor-select"
  value={editedPatch.carrier.waveform}
  onChange={...}
  title="Choose the basic wave shape. Sine = smooth/mellow, Square = bright/harsh"
>
```

**Add tooltips to all sliders, dropdowns, and checkboxes.**

---

### Step 3: Mobile responsiveness (30-45 min)

**File: `src/components/InstrumentSelector.css` (MODIFY)**

```css
/* Mobile responsive */
@media (max-width: 768px) {
  .instrument-selector {
    flex-direction: column;
    gap: 12px;
  }

  .track-instrument {
    width: 100%;
  }

  .instrument-dropdown {
    min-width: 0;
    width: 100%;
  }

  .track-label {
    min-width: 60px;
  }
}
```

**File: `src/components/InstrumentEditor.css` (ADD)**

```css
/* Mobile responsive for editor */
@media (max-width: 640px) {
  .editor-backdrop {
    padding: 0;
  }

  .editor-modal {
    max-width: 100%;
    max-height: 100vh;
    height: 100vh;
    border-radius: 0;
  }

  .editor-header,
  .editor-footer {
    border-radius: 0;
  }

  .editor-footer {
    flex-direction: column;
  }

  .editor-button {
    width: 100%;
  }

  .editor-button-preview {
    margin-right: 0;
    margin-bottom: 8px;
  }
}
```

---

### Step 4: Accessibility improvements (30 min)

**Add ARIA labels and keyboard support:**

**File: `src/components/InstrumentEditor.tsx` (MODIFY)**

```typescript
// Modal has role
<div className="editor-backdrop" onClick={handleBackdropClick} role="dialog" aria-modal="true" aria-labelledby="editor-title">
  <div className="editor-modal">
    <div className="editor-header">
      <h2 id="editor-title">Edit Instrument - Track {trackId + 1}</h2>
      ...
    </div>
    ...
  </div>
</div>

// All inputs have labels (already done)
// All buttons have aria-label or visible text (already done)

// Add focus trap (advanced)
// When modal opens, focus first input
// When modal closes, return focus to Edit button
```

**Focus management on modal open:**

```typescript
useEffect(() => {
  // Focus first input when modal opens
  const firstInput = document.querySelector('.editor-modal input, .editor-modal select') as HTMLElement;
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 100);
  }
}, []);
```

---

### Step 5: Comprehensive testing (60-90 min)

#### Desktop Testing

1. **Chrome:**
   - [ ] All features work
   - [ ] No console errors
   - [ ] Performance smooth

2. **Firefox:**
   - [ ] All features work
   - [ ] Slider styling correct
   - [ ] Audio works

3. **Safari:**
   - [ ] All features work
   - [ ] Web Audio API works
   - [ ] Storage works

4. **Edge:**
   - [ ] All features work
   - [ ] No compatibility issues

#### Mobile Testing

1. **iPhone (Safari):**
   - [ ] Dropdowns work
   - [ ] Modal opens full-screen
   - [ ] Sliders work with touch
   - [ ] Preview works
   - [ ] Can save

2. **Android (Chrome):**
   - [ ] All controls touch-friendly
   - [ ] Modal fits screen
   - [ ] Audio plays
   - [ ] Storage persists

#### Tablet Testing

1. **iPad:**
   - [ ] Layout appropriate for screen size
   - [ ] All features accessible
   - [ ] No cut-off elements

#### Accessibility Testing

1. **Keyboard navigation:**
   - [ ] Tab through all controls
   - [ ] Enter/Space activate buttons
   - [ ] Escape closes modal

2. **Screen reader (basic):**
   - [ ] Buttons announced correctly
   - [ ] Sliders have labels
   - [ ] Modal announced as dialog

#### Stress Testing

1. **Create 20 custom patches**
   - [ ] Performance still good
   - [ ] Storage doesn't exceed limits
   - [ ] All persist correctly

2. **Rapid changes**
   - [ ] Move sliders quickly
   - [ ] Switch views rapidly
   - [ ] Open/close modal quickly
   - [ ] No crashes

3. **Long session**
   - [ ] Use app for 30+ minutes
   - [ ] Create/edit many patches
   - [ ] Play many patterns
   - [ ] Memory doesn't leak

---

### Step 6: Update documentation (30 min)

**File: `STATUS.md` (UPDATE)**

Add section:

```markdown
## Instrument Panel (Complete)

**Status:** ✅ Production Ready

### Features

- 128 General MIDI instruments via GENMIDI.json
- Per-track instrument selection (4 tracks)
- Visual instrument selector with dropdowns
- Instrument editor modal with Simple/Advanced views
- Simple view: 10 essential parameters
- Advanced view: 24+ full OPL3 parameters
- Real-time preview
- Custom patch creation and editing
- LocalStorage persistence
- Mobile responsive
- Keyboard accessible

### Components

- `InstrumentSelector` - Track instrument dropdowns
- `InstrumentEditor` - Modal editor (Simple + Advanced)
- `InstrumentHelp` - Collapsible help documentation

### Data Files

- `defaultPatches.ts` - 4 fallback instruments
- `genmidiParser.ts` - GENMIDI.json loader
- `storageManager.ts` - localStorage persistence

### Usage

1. Select instruments from dropdowns
2. Click Edit (✏️) to customize
3. Use Simple view for quick tweaks
4. Use Advanced view for deep control
5. Preview before saving
6. Changes saved automatically

### Technical Details

- OPL3 FM synthesis (2-operator)
- 9 channels (4 used by tracker)
- GENMIDI format compatible
- Custom patches stored separately
- Debounced localStorage writes
- Version-aware data persistence
```

---

### Success Criteria - Milestone 13

- [ ] Help documentation complete and clear
- [ ] Tooltips on all important controls
- [ ] Mobile responsive (phone + tablet)
- [ ] Keyboard accessible
- [ ] Works on Chrome, Firefox, Safari, Edge
- [ ] Works on iOS Safari
- [ ] Works on Android Chrome
- [ ] No console errors or warnings
- [ ] Performance smooth (60 FPS)
- [ ] All 13 milestones passing
- [ ] STATUS.md updated

---

## Final Integration Test

**Complete end-to-end workflow:**

1. **Fresh start:**
   - [ ] Clear storage
   - [ ] Reload page
   - [ ] Default patches loaded

2. **Preset selection:**
   - [ ] Change Track 0 to "5 - Electric Piano"
   - [ ] Change Track 1 to "33 - Acoustic Bass"
   - [ ] Play pattern
   - [ ] Hear correct instruments

3. **Custom patch creation:**
   - [ ] Open editor for Track 2
   - [ ] Switch to Advanced
   - [ ] Change Frequency Multiplier to 3
   - [ ] Change Feedback to 6
   - [ ] Preview (should sound different)
   - [ ] Save
   - [ ] Play pattern
   - [ ] Track 2 has custom sound

4. **Persistence:**
   - [ ] Reload page
   - [ ] All 3 changes preserved
   - [ ] Custom patch still on Track 2
   - [ ] Pattern sounds identical

5. **Mobile:**
   - [ ] Open on phone
   - [ ] All controls usable
   - [ ] Can edit instrument
   - [ ] Can save
   - [ ] Audio plays

6. **Documentation:**
   - [ ] Open help section
   - [ ] Read through
   - [ ] Instructions clear
   - [ ] Examples helpful

---

## Troubleshooting

### Problem: Storage quota exceeded

**Solution:**
1. Limit custom patches to 50
2. Implement LRU eviction
3. Warn user if approaching limit

### Problem: Mobile sliders hard to use

**Solution:**
1. Increase touch target size (min 44×44px)
2. Add larger thumb on mobile
3. Consider using steppers (+/-) as alternative

### Problem: Help text too long

**Solution:**
1. Make sections collapsible individually
2. Provide "Quick Start" vs "Full Guide"
3. Link to external docs (future)

---

## Production Checklist

Before deploying:

- [ ] All 13 milestones complete
- [ ] No console errors in production build
- [ ] Tested on 3+ browsers
- [ ] Tested on mobile device
- [ ] Help documentation reviewed
- [ ] Code comments complete
- [ ] No debug console.log statements
- [ ] Performance profiled (no memory leaks)
- [ ] Storage limits respected
- [ ] Error handling comprehensive
- [ ] Accessibility validated
- [ ] STATUS.md updated

---

## Deployment

```bash
# Run final build
npm run build

# Test production build locally
npm run preview

# If all tests pass:
git add .
git commit -m "feat: Complete instrument panel with persistence and polish

- Milestones 1-13 complete
- 128 GM instruments via GENMIDI
- Per-track selection
- Simple + Advanced editor
- LocalStorage persistence
- Mobile responsive
- Fully accessible
- Production ready"

git push
```

---

## Next Steps (Future Enhancements)

**Not required now, but could add later:**

1. **Import/Export patches**
   - Export custom patches as JSON
   - Import patches from files
   - Share patches with others

2. **Patch library**
   - Browse community patches
   - Rate and favorite patches
   - Search by category

3. **Visual waveform display**
   - Show waveform in real-time
   - Visualize ADSR envelope
   - Spectrum analyzer

4. **MIDI learning**
   - Map MIDI controllers to parameters
   - Control sliders via hardware
   - Record automation

5. **Undo/Redo**
   - Undo patch edits
   - History of changes
   - Revert to original

---

## Files Changed Summary

**New Files:**
- `src/utils/storageManager.ts` - localStorage persistence
- `src/components/InstrumentHelp.tsx` - Help documentation
- `src/components/InstrumentHelp.css` - Help styling

**Modified Files:**
- `src/App.tsx` - Load/save state, dev tools
- `src/components/InstrumentEditor.tsx` - Tooltips, accessibility
- `src/components/InstrumentSelector.css` - Mobile responsive
- `src/components/InstrumentEditor.css` - Mobile responsive
- `STATUS.md` - Feature documentation

**Lines Changed:** ~400 lines added, ~50 lines modified

---

## Time Tracking

| Task | Estimated | Actual |
|------|-----------|--------|
| Milestone 12: LocalStorage persistence | 2-3 hours | ___ |
| Milestone 13: Polish & documentation | 3-4 hours | ___ |
| **TOTAL** | **5-7 hours** | ___ |

---

## Celebration! 🎉

**Total Project Time:** 40-55 hours estimated

**You've built:**
- Complete OPL3 instrument system
- 128-instrument GENMIDI bank
- Simple + Advanced editor
- Real-time preview
- Custom patch creation
- Persistent storage
- Mobile responsive
- Fully accessible
- Production ready

**This is a significant achievement!** The instrument panel is now feature-complete and ready for users to create amazing OPL3 music.

---

## Notes

- StorageManager uses versioning for future compatibility
- Debounced saves prevent excessive localStorage writes
- Custom patches get unique IDs (timestamp-based)
- Help section is collapsible to save screen space
- Mobile gets full-screen modal for better UX
- Accessibility follows WCAG 2.1 guidelines
- All edge cases handled gracefully
