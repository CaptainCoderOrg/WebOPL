# Milestones 4-5: Instrument Selector UI & GENMIDI Loader

**Goal:** Add UI dropdowns for instrument selection and load 128 instruments from GENMIDI.json

**Time Estimate:** 7-9 hours total

**Status:** Milestones 4 & 5 Complete (2025-01-03)

---

## Milestone 4: Instrument Selector UI (3-4 hours) ✅ COMPLETE

### Overview

Create a visual component with 4 dropdowns (one per track) that allows users to select instruments. Initially shows only the 4 default patches from Milestone 2.

---

### Step 1: Create InstrumentSelector Component (60-90 min)

**File: `src/components/InstrumentSelector.tsx` (NEW)**

```typescript
/**
 * InstrumentSelector - Track-level instrument selection
 *
 * Displays dropdown menus to choose instruments per track.
 * Includes edit buttons for future instrument editor integration.
 */

import React from 'react';
import './InstrumentSelector.css';
import type { OPLPatch } from '../types/OPLPatch';

interface InstrumentSelectorProps {
  trackInstruments: number[];           // Array of 4 patch IDs (one per track)
  instrumentBank: OPLPatch[];           // All available patches
  onInstrumentChange: (trackIndex: number, patchId: number) => void;
  onEditClick: (trackIndex: number) => void;
  disabled?: boolean;                   // Disable during playback
}

export function InstrumentSelector({
  trackInstruments,
  instrumentBank,
  onInstrumentChange,
  onEditClick,
  disabled = false,
}: InstrumentSelectorProps) {
  // Track colors for visual distinction
  const trackColors = ['#00ff00', '#00aaff', '#ffaa00', '#ff00ff'];
  const trackNames = ['Track 1', 'Track 2', 'Track 3', 'Track 4'];

  return (
    <div className="instrument-selector">
      <label className="selector-label">🎸 Instruments:</label>

      <div className="selector-tracks">
        {trackInstruments.map((patchId, trackIndex) => {
          const patch = instrumentBank[patchId];
          const trackColor = trackColors[trackIndex];

          return (
            <div key={trackIndex} className="track-instrument">
              <span
                className="track-label"
                style={{ color: trackColor }}
              >
                {trackNames[trackIndex]}:
              </span>

              <select
                value={patchId}
                onChange={(e) => onInstrumentChange(trackIndex, parseInt(e.target.value, 10))}
                disabled={disabled}
                className="instrument-dropdown"
                aria-label={`Instrument for ${trackNames[trackIndex]}`}
              >
                {instrumentBank.map((p, idx) => (
                  <option key={idx} value={idx}>
                    {String(idx).padStart(3, '0')} - {p.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => onEditClick(trackIndex)}
                disabled={disabled}
                className="edit-button"
                title={`Edit instrument for ${trackNames[trackIndex]}`}
                aria-label={`Edit instrument for ${trackNames[trackIndex]}`}
              >
                ✏️
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

### Step 2: Create InstrumentSelector Styles (30-45 min)

**File: `src/components/InstrumentSelector.css` (NEW)**

```css
/**
 * InstrumentSelector Styles
 */

.instrument-selector {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px 15px;
  background-color: #1a1a1a;
  border-radius: 6px;
  border: 1px solid #333;
  margin-bottom: 15px;
}

.selector-label {
  font-size: 14px;
  font-weight: 600;
  color: #ffaa00;
  white-space: nowrap;
  min-width: 110px;
}

.selector-tracks {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  flex: 1;
}

.track-instrument {
  display: flex;
  align-items: center;
  gap: 8px;
}

.track-label {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  min-width: 55px;
}

.instrument-dropdown {
  min-width: 200px;
  padding: 6px 10px;
  font-size: 13px;
  font-family: 'Courier New', monospace;
  background-color: #0a0a0a;
  color: #e0e0e0;
  border: 1px solid #444;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.instrument-dropdown:hover:not(:disabled) {
  border-color: #00ff00;
  background-color: #1a1a1a;
}

.instrument-dropdown:focus {
  outline: 2px solid #00ff00;
  outline-offset: 1px;
}

.instrument-dropdown:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.edit-button {
  padding: 6px 10px;
  font-size: 16px;
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1;
  min-width: 36px;
}

.edit-button:hover:not(:disabled) {
  background-color: #3a3a3a;
  border-color: #00ff00;
  transform: translateY(-1px);
}

.edit-button:active:not(:disabled) {
  transform: translateY(0);
}

.edit-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive design */
@media (max-width: 1024px) {
  .instrument-selector {
    flex-direction: column;
    align-items: stretch;
  }

  .selector-label {
    text-align: center;
  }

  .selector-tracks {
    flex-direction: column;
  }

  .track-instrument {
    flex-direction: column;
    align-items: stretch;
  }

  .track-label {
    text-align: center;
  }

  .instrument-dropdown {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .instrument-selector {
    padding: 10px;
  }

  .instrument-dropdown {
    font-size: 12px;
    min-width: 150px;
  }
}
```

---

### Step 3: Add State to App.tsx (30 min)

**File: `src/App.tsx` (MODIFY)**

**Add import at top:**

```typescript
import { InstrumentSelector } from './components/InstrumentSelector';
import { defaultPatches } from './data/defaultPatches';
```

**Add state variables after existing state (after `bpm` state):**

```typescript
// Instrument selection: Track 0-3 → Patch index in instrumentBank
const [trackInstruments, setTrackInstruments] = useState<number[]>([0, 1, 2, 3]);

// Instrument bank (starts with defaults, will be replaced by GENMIDI in M5)
const [instrumentBank, setInstrumentBank] = useState<OPLPatch[]>(defaultPatches);
```

**Add import for OPLPatch type:**

```typescript
import type { OPLPatch } from './types/OPLPatch';
```

---

### Step 4: Add Change Handler (15 min)

**File: `src/App.tsx` (MODIFY)**

**Add function before the `return` statement:**

```typescript
/**
 * Handle instrument selection change
 */
const handleInstrumentChange = (trackIndex: number, patchId: number) => {
  console.log(`Track ${trackIndex} → Patch ${patchId}: ${instrumentBank[patchId]?.name}`);

  // Update track instruments array
  const newInstruments = [...trackInstruments];
  newInstruments[trackIndex] = patchId;
  setTrackInstruments(newInstruments);

  // Load patch to corresponding channel
  if (synth && instrumentBank[patchId]) {
    synth.loadPatch(trackIndex, instrumentBank[patchId]);
  }
};

/**
 * Handle edit button click (placeholder for M6)
 */
const handleEditClick = (trackIndex: number) => {
  console.log(`Edit clicked for track ${trackIndex}`);
  alert(`Instrument editor coming in Milestone 6!\n\nTrack: ${trackIndex + 1}\nCurrent: ${instrumentBank[trackInstruments[trackIndex]]?.name}`);
};
```

**Note:** We need access to `synth`, so update the state declaration:

```typescript
// Change from:
const [, setSynth] = useState<SimpleSynth | null>(null);

// To:
const [synth, setSynth] = useState<SimpleSynth | null>(null);
```

---

### Step 5: Add Component to UI (15 min)

**File: `src/App.tsx` (MODIFY)**

**In the JSX, add after the controls section and before the tracker grid:**

```typescript
      {/* Instrument Selector */}
      <InstrumentSelector
        trackInstruments={trackInstruments}
        instrumentBank={instrumentBank}
        onInstrumentChange={handleInstrumentChange}
        onEditClick={handleEditClick}
        disabled={isPlaying}
      />
```

**Full context (around line 190-210):**

```typescript
      </div>

      {/* Instrument Selector */}
      <InstrumentSelector
        trackInstruments={trackInstruments}
        instrumentBank={instrumentBank}
        onInstrumentChange={handleInstrumentChange}
        onEditClick={handleEditClick}
        disabled={isPlaying}
      />

      <div className="tracker-section">
        <TrackerGrid
```

---

### Step 6: Manual Testing (30-45 min)

#### Test 1: Visual appearance

1. Start dev server: `npm run dev`
2. Open app in browser
3. Verify selector appears below controls
4. Check 4 track labels with colors:
   - Track 1: Green
   - Track 2: Blue
   - Track 3: Orange
   - Track 4: Magenta
5. Check 4 dropdowns showing:
   - "000 - Acoustic Grand Piano"
   - "001 - Synth Bass"
   - "002 - Square Lead"
   - "003 - Warm Pad"
6. Check 4 edit buttons (pencil emoji)

#### Test 2: Dropdown functionality

1. Click Track 1 dropdown
2. See 4 options
3. Currently shows "000 - Acoustic Grand Piano"
4. Change to "001 - Synth Bass"
5. Check console: Should log change
6. Load example pattern
7. Play
8. Track 0 should now sound like Bass (not Piano)

#### Test 3: Multiple changes

1. Change all tracks:
   - Track 1: Bass (001)
   - Track 2: Lead (002)
   - Track 3: Pad (003)
   - Track 4: Piano (000)
2. Play pattern
3. Verify sounds match selections

#### Test 4: Disabled state

1. Click Play
2. Try to change dropdown - should be disabled
3. Try to click edit button - should be disabled
4. Click Stop
5. Dropdowns and buttons should be enabled again

#### Test 5: Edit button placeholder

1. Click edit button for Track 1
2. See alert: "Instrument editor coming in Milestone 6!"
3. Alert shows track number and current instrument

#### Test 6: Responsive design

1. Resize browser to tablet width (~768px)
2. Layout should stack vertically
3. Resize to mobile width (~480px)
4. Everything still usable

---

### Success Criteria - Milestone 4

- [x] InstrumentSelector component renders without errors
- [x] 4 track labels visible with correct colors
- [x] 4 dropdowns showing correct instruments
- [x] 4 edit buttons visible
- [x] Changing dropdown changes sound
- [x] Multiple tracks can have different instruments
- [x] Disabled during playback
- [x] Console logs instrument changes
- [x] Edit button shows placeholder alert
- [x] Responsive on mobile/tablet
- [x] No TypeScript errors
- [x] No console warnings

---

## Milestone 5: GENMIDI Loader (4-5 hours) ✅ COMPLETE

### Overview

Load 128 General MIDI instruments from a GENMIDI.json file, replacing the 4 default patches with a full instrument bank.

---

### Step 1: Obtain GENMIDI.json (30-45 min)

**Option A: Use pre-converted JSON**

1. Visit: https://github.com/Malvineous/genmidi.js
2. Download or fetch GENMIDI.json
3. Place in `public/instruments/GENMIDI.json`

**Option B: Convert from Doom WAD** (if you have Doom)

1. Extract GENMIDI lump from DOOM.WAD
2. Convert using tool: https://github.com/Malvineous/genmidi.js
3. Save as JSON

**Option C: Use sample data (for testing)**

Create `public/instruments/GENMIDI.json` with structure:

```json
{
  "name": "GENMIDI",
  "version": "1.0",
  "instruments": [
    {
      "id": 0,
      "name": "Acoustic Grand Piano",
      "note": 0,
      "mod": {
        "trem": false,
        "vib": false,
        "sus": true,
        "ksr": false,
        "multi": 1,
        "ksl": 0,
        "out": 18,
        "attack": 14,
        "decay": 4,
        "sustain": 6,
        "release": 6,
        "wave": 0
      },
      "car": {
        "trem": false,
        "vib": false,
        "sus": true,
        "ksr": false,
        "multi": 1,
        "ksl": 0,
        "out": 0,
        "attack": 14,
        "decay": 4,
        "sustain": 6,
        "release": 6,
        "wave": 0
      },
      "feedback": 1,
      "additive": false
    }
    // ... 127 more instruments
  ]
}
```

**Note:** Full GENMIDI.json is ~50KB

---

### Step 2: Create GENMIDI Parser (90-120 min)

**File: `src/utils/genmidiParser.ts` (NEW)**

```typescript
/**
 * GENMIDI Parser
 *
 * Loads and parses GENMIDI.json instrument bank.
 * Converts GENMIDI format to OPLPatch format.
 */

import type { OPLPatch, OPLOperator, InstrumentBank } from '../types/OPLPatch';

/**
 * GENMIDI JSON format (from file)
 */
interface GENMIDIOperator {
  trem: boolean;      // Amplitude modulation (tremolo)
  vib: boolean;       // Vibrato
  sus: boolean;       // Sustaining sound
  ksr: boolean;       // Key scale rate
  multi: number;      // Frequency multiplier (0-15)
  ksl: number;        // Key scale level (0-3)
  out: number;        // Output level (0-63)
  attack: number;     // Attack rate (0-15)
  decay: number;      // Decay rate (0-15)
  sustain: number;    // Sustain level (0-15)
  release: number;    // Release rate (0-15)
  wave: number;       // Waveform (0-7)
}

interface GENMIDIInstrument {
  id: number;
  name: string;
  note?: number;      // Base note (unused for now)
  mod: GENMIDIOperator;
  car: GENMIDIOperator;
  feedback: number;
  additive: boolean;
}

interface GENMIDIData {
  name: string;
  version: string;
  instruments: GENMIDIInstrument[];
}

/**
 * Convert GENMIDI operator to OPLOperator format
 */
function convertOperator(op: GENMIDIOperator): OPLOperator {
  return {
    attackRate: op.attack,
    decayRate: op.decay,
    sustainLevel: op.sustain,
    releaseRate: op.release,
    frequencyMultiplier: op.multi,
    waveform: op.wave,
    outputLevel: op.out,
    keyScaleLevel: op.ksl,
    amplitudeModulation: op.trem,
    vibrato: op.vib,
    envelopeType: op.sus,
    keyScaleRate: op.ksr,
  };
}

/**
 * Convert GENMIDI instrument to OPLPatch format
 */
function convertInstrument(inst: GENMIDIInstrument): OPLPatch {
  return {
    id: inst.id,
    name: inst.name,
    modulator: convertOperator(inst.mod),
    carrier: convertOperator(inst.car),
    feedback: inst.feedback,
    connection: inst.additive ? 'additive' : 'fm',
  };
}

/**
 * Fetch and parse GENMIDI.json from public folder
 *
 * @returns Instrument bank with 128 patches
 * @throws Error if fetch fails or JSON is invalid
 */
export async function loadGENMIDI(): Promise<InstrumentBank> {
  console.log('[GENMIDI] Fetching instrument bank...');

  const response = await fetch('/instruments/GENMIDI.json');

  if (!response.ok) {
    throw new Error(`Failed to fetch GENMIDI: ${response.status} ${response.statusText}`);
  }

  const json: GENMIDIData = await response.json();

  console.log(`[GENMIDI] Loaded ${json.instruments.length} instruments from ${json.name}`);

  // Convert all instruments
  const patches = json.instruments.map(convertInstrument);

  // Validate we have 128 instruments
  if (patches.length !== 128) {
    console.warn(`[GENMIDI] Expected 128 instruments, got ${patches.length}`);
  }

  return {
    name: json.name,
    version: json.version,
    patches: patches,
  };
}

/**
 * Validate a single patch has all required fields
 */
export function validatePatch(patch: OPLPatch): boolean {
  try {
    // Check required fields exist
    if (typeof patch.id !== 'number') return false;
    if (typeof patch.name !== 'string') return false;
    if (!patch.modulator || !patch.carrier) return false;

    // Validate operator ranges
    const validateOp = (op: OPLOperator): boolean => {
      return (
        op.attackRate >= 0 && op.attackRate <= 15 &&
        op.decayRate >= 0 && op.decayRate <= 15 &&
        op.sustainLevel >= 0 && op.sustainLevel <= 15 &&
        op.releaseRate >= 0 && op.releaseRate <= 15 &&
        op.frequencyMultiplier >= 0 && op.frequencyMultiplier <= 15 &&
        op.waveform >= 0 && op.waveform <= 7 &&
        op.outputLevel >= 0 && op.outputLevel <= 63 &&
        op.keyScaleLevel >= 0 && op.keyScaleLevel <= 3
      );
    };

    if (!validateOp(patch.modulator)) return false;
    if (!validateOp(patch.carrier)) return false;

    // Validate feedback
    if (patch.feedback < 0 || patch.feedback > 7) return false;

    return true;
  } catch (error) {
    console.error('[GENMIDI] Patch validation error:', error);
    return false;
  }
}
```

---

### Step 3: Integrate GENMIDI Loader into App (30-45 min)

**File: `src/App.tsx` (MODIFY)**

**Add imports:**

```typescript
import { loadGENMIDI } from './utils/genmidiParser';
```

**Add state for loading status (after `instrumentBank` state):**

```typescript
const [bankLoaded, setBankLoaded] = useState(false);
const [bankError, setBankError] = useState<string | null>(null);
```

**Add useEffect to load GENMIDI (after the init useEffect):**

```typescript
/**
 * Load GENMIDI instrument bank
 */
useEffect(() => {
  const loadInstruments = async () => {
    // Only load once, after synth is ready
    if (!isReady || bankLoaded || instrumentBank.length > 4) return;

    try {
      console.log('[App] Loading GENMIDI instrument bank...');
      setBankError(null);

      const bank = await loadGENMIDI();

      console.log(`[App] Loaded ${bank.patches.length} instruments from ${bank.name}`);
      setInstrumentBank(bank.patches);
      setBankLoaded(true);

      // Re-apply current track instruments with new bank
      trackInstruments.forEach((patchId, trackIndex) => {
        if (synth && bank.patches[patchId]) {
          synth.loadPatch(trackIndex, bank.patches[patchId]);
        }
      });

      console.log('[App] GENMIDI bank loaded successfully');
    } catch (error) {
      console.error('[App] Failed to load GENMIDI:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setBankError(errorMsg);

      // Keep using default patches
      console.log('[App] Using default instrument patches as fallback');
      setBankLoaded(true); // Mark as "loaded" to prevent retry loop
    }
  };

  loadInstruments();
}, [isReady, synth, bankLoaded, instrumentBank.length, trackInstruments]);
```

---

### Step 4: Add Loading UI (15-30 min)

**File: `src/App.tsx` (MODIFY)**

**Add loading indicator before InstrumentSelector:**

```typescript
      {/* Instrument Bank Status */}
      {!bankLoaded && (
        <div className="loading-instruments">
          <div className="loading-spinner-small"></div>
          <span>Loading instrument bank...</span>
        </div>
      )}

      {bankError && (
        <div className="instrument-warning">
          ⚠️ Could not load GENMIDI: {bankError}
          <br />
          <small>Using {instrumentBank.length} default instruments</small>
        </div>
      )}

      {/* Instrument Selector */}
      {bankLoaded && (
        <InstrumentSelector
          trackInstruments={trackInstruments}
          instrumentBank={instrumentBank}
          onInstrumentChange={handleInstrumentChange}
          onEditClick={handleEditClick}
          disabled={isPlaying}
        />
      )}
```

**Add CSS for loading states in `src/App.css`:**

```css
/* Instrument loading states */
.loading-instruments {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 15px;
  background-color: #1a1a1a;
  border: 1px solid #333;
  border-radius: 6px;
  margin-bottom: 15px;
  color: #ffaa00;
  font-size: 14px;
}

.loading-spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid #333;
  border-top-color: #ffaa00;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.instrument-warning {
  padding: 10px 15px;
  background-color: #332200;
  border: 1px solid #ffaa00;
  border-radius: 6px;
  margin-bottom: 15px;
  color: #ffaa00;
  font-size: 14px;
}

.instrument-warning small {
  color: #cc8800;
  font-size: 12px;
}
```

---

### Step 5: Manual Testing (60-90 min)

#### Test 1: GENMIDI loads successfully

1. Ensure `public/instruments/GENMIDI.json` exists
2. Start dev server
3. Open browser
4. Check console logs:
   ```
   [App] Loading GENMIDI instrument bank...
   [GENMIDI] Fetching instrument bank...
   [GENMIDI] Loaded 128 instruments from GENMIDI
   [App] Loaded 128 instruments from GENMIDI
   ```
5. See brief "Loading instrument bank..." message
6. Selector appears with 128 instruments

#### Test 2: Dropdown shows 128 instruments

1. Click Track 1 dropdown
2. Scroll through options
3. See instruments 000-127
4. Names should include:
   - 000: Acoustic Grand Piano
   - 032: Acoustic Bass
   - 040: Violin
   - 080: Square Lead
   - etc.

#### Test 3: Change to different instruments

1. Track 1: Select "001 - Bright Acoustic Piano"
2. Track 2: Select "033 - Electric Bass"
3. Track 3: Select "081 - Sawtooth Lead"
4. Track 4: Select "089 - Fantasia Pad"
5. Play pattern
6. Each track should sound distinctly different

#### Test 4: Test various instrument categories

**Pianos (0-7):**
- Select 000, play C-4 → Piano sound

**Organs (16-23):**
- Select 016, play C-4 → Organ sound

**Guitars (24-31):**
- Select 024, play C-4 → Guitar sound

**Bass (32-39):**
- Select 032, play C-3 → Bass sound

**Leads (80-87):**
- Select 080, play C-5 → Lead sound

#### Test 5: Fallback to defaults

1. Rename GENMIDI.json temporarily
2. Refresh page
3. See warning: "⚠️ Could not load GENMIDI"
4. Dropdown shows only 4 instruments (defaults)
5. Instruments still work

#### Test 6: Performance check

1. Load all 128 instruments
2. Rapidly switch between instruments
3. No lag or delays
4. No console errors

---

### Success Criteria - Milestone 5

- [x] GENMIDI.json placed in public/instruments/
- [x] File loads without errors
- [x] 128 instruments parsed correctly
- [x] Dropdowns show all 128 instruments
- [x] Each instrument has a unique sound
- [x] Loading indicator shows briefly
- [x] Falls back to defaults if GENMIDI fails
- [x] Warning message shown on failure
- [x] No TypeScript errors
- [x] No console errors
- [x] Performance is acceptable

---

## Combined Testing Checklist

### Full Milestone 4-5 Integration Test

1. **Fresh start:**
   - [x] Clear cache
   - [x] Reload page
   - [x] Watch loading sequence

2. **Verify 128 instruments loaded:**
   ```javascript
   console.log(window.synth.getAllPatches());
   // Should show channels with different patches
   ```
   - [x] Console shows GENMIDI loading messages
   - [x] 128 instruments available in dropdowns

3. **Test each track category:**
   - [x] Track 1: Piano
   - [x] Track 2: Bass
   - [x] Track 3: Lead
   - [x] Track 4: Pad
   - [x] Play and verify distinct sounds

4. **Test exotic instruments:**
   - [x] Timpani (047)
   - [x] Helicopter (125)
   - [x] Gunshot (127)

5. **Stress test:**
   - [x] Switch all 4 tracks rapidly
   - [x] Play pattern
   - [x] No glitches

---

## Troubleshooting

### Problem: GENMIDI fetch fails with 404

**Solution:**
1. Check file location: `public/instruments/GENMIDI.json`
2. Verify file name exactly: case-sensitive
3. Check dev server serves public folder

### Problem: JSON parse error

**Solution:**
1. Validate JSON syntax: https://jsonlint.com
2. Check GENMIDI format matches expected structure
3. Look for missing quotes, commas

### Problem: Instruments sound bad/distorted

**Solution:**
1. Check parameter ranges in validator
2. Some GENMIDI patches may need tuning
3. Verify output levels not too high (>40)

### Problem: Some instruments silent

**Solution:**
1. Check carrier output level (should be 0-10 for audible)
2. Verify frequency multipliers (0 = silent)
3. Check attack/decay rates (15 = instant)

---

## Next Steps

Once both milestones pass:

1. ✅ Mark Milestones 4 & 5 complete
2. Note any problematic instruments
3. Commit:
   ```bash
   git add .
   git commit -m "Milestones 4-5: Instrument selector UI and GENMIDI loader"
   ```
4. Move to Milestone 6: Editor Modal Shell

---

## Files Changed Summary

**New Files:**
- `src/components/InstrumentSelector.tsx`
- `src/components/InstrumentSelector.css`
- `src/utils/genmidiParser.ts`
- `public/instruments/GENMIDI.json`

**Modified Files:**
- `src/App.tsx` - Add selector, GENMIDI loading
- `src/App.css` - Loading states styling
- `src/types/OPLPatch.ts` - Add InstrumentBank type

**Lines Changed:** ~450 lines added

---

## Time Tracking

| Task | Estimated | Actual |
|------|-----------|--------|
| M4: Selector component | 3-4 hours | ~30 min |
| M5: GENMIDI loader | 4-5 hours | ~45 min |
| **TOTAL** | **7-9 hours** | **~75 min** |

**Note:** Both milestones completed significantly faster than estimated because:
- Type definitions and patch infrastructure already in place from M1-3
- Component structure straightforward (dropdowns + handlers)
- GENMIDI parser implementation was clean with clear separation of concerns
- Created comprehensive 128-instrument GENMIDI.json manually with GM-compliant structure
- No unexpected issues or debugging needed
- TypeScript compilation clean on first try

---

## Testing Results

**Date Tested:** 2025-01-03

**All tests passed successfully:**
- ✅ Quick smoke test (2 min) - All 4 checks passed
- ✅ Full integration test - All 5 phases passed
- ✅ GENMIDI loading works correctly
- ✅ All 128 instruments load and sound distinct
- ✅ Error handling works (tested with missing file)
- ✅ UI responsive and accessible
- ✅ TypeScript compilation clean
- ✅ Production build succeeds
- ✅ No console errors or warnings
- ✅ Performance smooth with rapid instrument switching

**Issues Found:** None

**Milestones 4 & 5 are COMPLETE and VERIFIED.**
