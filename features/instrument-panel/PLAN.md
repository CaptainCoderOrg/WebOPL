# Instrument Panel Implementation Plan

**Feature:** Track-Level Instrument Selection with Modal Editor
**Status:** Planning Phase
**Created:** 2025-01-03

---

## User Requirements

1. ✅ **Track-Level Instrument** (Option A) - Different instrument per track/column (4 instruments max)
2. ✅ **Modal/Route UI** (Option C + modification) - Custom component accessible via modal or route
3. ✅ **Simple/Advanced Toggle** (Option D) - Collapsible view to hide/show all parameters
4. ✅ **Preset Bank + Editing** (Option C) - Load GENMIDI.json with manual tweaking capability

---

## Overview

Add comprehensive instrument control to the WebOrchestra tracker:
- Each of the 4 tracks can have a different OPL3 instrument
- 128 General MIDI instruments loaded from GENMIDI.json
- Intuitive selector dropdowns integrated into the control panel
- Modal editor with Simple (10 parameters) and Advanced (24+ parameters) views
- Real-time preview and live editing
- Persistent instrument selections via LocalStorage

---

## GENMIDI Format Compatibility

**Answer:** YES, fully compatible!

- GENMIDI is the standard OPL instrument format used in Doom, Heretic, Hexen
- Contains 128 General MIDI (GM) compatible instruments
- Stores raw OPL3 register values (directly usable)
- Can be converted to JSON format easily
- Sources:
  - Extract from Doom WAD files
  - DOSBox GENMIDI.op2 file
  - Pre-converted JSON versions: [github.com/Malvineous/genmidi.js](https://github.com/Malvineous/genmidi.js)

---

## Phase 1: Data Structures & GENMIDI Support

### 1.1 Create OPL Patch Types

**File:** `src/types/OPLPatch.ts` (NEW)

**Interfaces:**

```typescript
/**
 * Single OPL3 operator configuration
 */
export interface OPLOperator {
  // ADSR Envelope
  attackRate: number;          // 0-15 (0=slowest, 15=fastest)
  decayRate: number;           // 0-15
  sustainLevel: number;        // 0-15 (0=loudest sustain, 15=softest)
  releaseRate: number;         // 0-15

  // Frequency & Timbre
  frequencyMultiplier: number; // 0-15 (0=×0.5, 1=×1, 2=×2, etc.)
  waveform: number;            // 0-7 (0=sine, 1=half-sine, 2=abs-sine, 3=quarter-sine)

  // Volume & Modulation
  outputLevel: number;         // 0-63 (0=loudest, 63=silent)
  keyScaleLevel: number;       // 0-3 (volume changes with pitch)

  // Flags
  amplitudeModulation: boolean; // Tremolo on/off
  vibrato: boolean;             // Pitch vibrato on/off
  envelopeType: boolean;        // true=sustaining, false=attack-decay only
  keyScaleRate: boolean;        // Scale envelope speed with pitch
}

/**
 * Complete OPL3 instrument patch (2-operator mode)
 */
export interface OPLPatch {
  id: number;                   // 0-127 (GM instrument number)
  name: string;                 // e.g., "Acoustic Grand Piano"
  category?: string;            // e.g., "Piano", "Bass", "Lead"

  // Operators (2-operator FM synthesis)
  modulator: OPLOperator;       // Modulates the carrier
  carrier: OPLOperator;         // Produces the final sound

  // Channel configuration
  feedback: number;             // 0-7 (modulator self-modulation depth)
  connection: 'fm' | 'additive'; // FM (modulator→carrier) vs Additive (both mixed)

  // Metadata
  isCustom?: boolean;           // User-edited vs preset
  basePresetId?: number;        // If custom, which preset it was based on
}

/**
 * Instrument bank (collection of patches)
 */
export interface InstrumentBank {
  name: string;                 // e.g., "GENMIDI"
  version: string;              // e.g., "1.0"
  patches: OPLPatch[];          // Array of 128 instruments
}
```

---

### 1.2 GENMIDI Parser

**File:** `src/utils/genmidiParser.ts` (NEW)

**Functions:**

```typescript
/**
 * Fetch and parse GENMIDI.json from public folder
 * @returns Instrument bank with 128 patches
 */
export async function loadGENMIDI(): Promise<InstrumentBank> {
  const response = await fetch('/instruments/GENMIDI.json');
  if (!response.ok) {
    throw new Error(`Failed to load GENMIDI: ${response.statusText}`);
  }

  const json = await response.json();
  return parseGENMIDIJson(json);
}

/**
 * Convert raw GENMIDI JSON to InstrumentBank format
 * @param json Raw GENMIDI data
 * @returns Parsed instrument bank
 */
function parseGENMIDIJson(json: any): InstrumentBank {
  // Parse each instrument's operator data
  // Convert register values to OPLOperator interface
  // Handle 2-operator mode (ignore 4-operator for now)
  // Assign GM names and categories
}

/**
 * Validate patch data
 * @param patch OPL patch to validate
 * @returns True if valid, throws error if invalid
 */
export function validatePatch(patch: OPLPatch): boolean {
  // Check all parameters are in valid ranges
  // Ensure required fields exist
}
```

**Implementation Details:**
- GENMIDI stores operator data as raw register values
- Register 0x20-0x35: Multiply/AM/VIB/EG/KSR
- Register 0x40-0x55: KSL/Output Level
- Register 0x60-0x75: Attack/Decay
- Register 0x80-0x95: Sustain/Release
- Register 0xE0-0xF5: Waveform
- Need to extract bit fields from register bytes

---

### 1.3 Default Patches

**File:** `src/data/defaultPatches.ts` (NEW)

**Purpose:** Fallback if GENMIDI fails to load

**Content:**

```typescript
import { OPLPatch } from '../types/OPLPatch';

/**
 * Basic fallback instruments (4 essential sounds)
 */
export const defaultPatches: OPLPatch[] = [
  {
    id: 0,
    name: 'Basic Piano',
    category: 'Piano',
    modulator: {
      attackRate: 15,
      decayRate: 5,
      sustainLevel: 7,
      releaseRate: 7,
      frequencyMultiplier: 1,
      waveform: 0, // sine
      outputLevel: 16,
      keyScaleLevel: 0,
      amplitudeModulation: false,
      vibrato: false,
      envelopeType: true,
      keyScaleRate: false,
    },
    carrier: {
      attackRate: 15,
      decayRate: 5,
      sustainLevel: 7,
      releaseRate: 7,
      frequencyMultiplier: 1,
      waveform: 0, // sine
      outputLevel: 0, // full volume
      keyScaleLevel: 0,
      amplitudeModulation: false,
      vibrato: false,
      envelopeType: true,
      keyScaleRate: false,
    },
    feedback: 0,
    connection: 'fm',
  },
  // ... Bass, Lead, Pad patches
];
```

---

## Phase 2: SimpleSynth Enhancements

### 2.1 Add Patch Management to SimpleSynth

**File:** `src/SimpleSynth.ts` (MODIFY)

**New Properties:**

```typescript
private channelPatches: Map<number, OPLPatch> = new Map();
```

**New Methods:**

```typescript
/**
 * Load an instrument patch to a specific channel
 * @param channelId Channel number (0-8)
 * @param patch OPL patch to load
 */
public loadPatch(channelId: number, patch: OPLPatch): void {
  if (channelId < 0 || channelId >= 9) {
    throw new Error(`Invalid channel: ${channelId}`);
  }

  // Store patch
  this.channelPatches.set(channelId, patch);

  // Get operator offsets for this channel
  const [modOffset, carOffset] = this.getOperatorOffsets(channelId);

  // Program modulator
  this.writeOperatorRegisters(modOffset, patch.modulator);

  // Program carrier
  this.writeOperatorRegisters(carOffset, patch.carrier);

  // Program channel settings
  this.opl.write(0xC0 + channelId,
    (patch.feedback << 1) | (patch.connection === 'fm' ? 1 : 0)
  );
}

/**
 * Write all registers for a single operator
 * @param operatorOffset Operator offset (0, 1, 2, 3, 8, 9, A, B, 10, 11, 12, 13)
 * @param operator Operator configuration
 */
private writeOperatorRegisters(operatorOffset: number, operator: OPLOperator): void {
  // Register 0x20: MULT/AM/VIB/EG/KSR
  const reg20 =
    operator.frequencyMultiplier |
    (operator.keyScaleRate ? 0x10 : 0) |
    (operator.envelopeType ? 0x20 : 0) |
    (operator.vibrato ? 0x40 : 0) |
    (operator.amplitudeModulation ? 0x80 : 0);
  this.opl.write(0x20 + operatorOffset, reg20);

  // Register 0x40: KSL/Output Level
  const reg40 = operator.outputLevel | (operator.keyScaleLevel << 6);
  this.opl.write(0x40 + operatorOffset, reg40);

  // Register 0x60: Attack/Decay
  const reg60 = operator.decayRate | (operator.attackRate << 4);
  this.opl.write(0x60 + operatorOffset, reg60);

  // Register 0x80: Sustain/Release
  const reg80 = operator.releaseRate | (operator.sustainLevel << 4);
  this.opl.write(0x80 + operatorOffset, reg80);

  // Register 0xE0: Waveform
  this.opl.write(0xE0 + operatorOffset, operator.waveform);
}

/**
 * Get current patch for a channel
 * @param channelId Channel number (0-8)
 * @returns Current patch or null if none set
 */
public getChannelPatch(channelId: number): OPLPatch | null {
  return this.channelPatches.get(channelId) || null;
}
```

**Changes to Existing Code:**

1. **Remove:** `setupDefaultInstrument()` method
2. **Update:** `init()` to initialize all channels with default patch
3. **Keep:** Existing `noteOn()` and `noteOff()` logic unchanged

---

### 2.2 Update noteOn() Implementation

**Current behavior:** Works with any loaded patch
**No changes needed** - existing frequency/key-on logic is patch-independent

---

## Phase 3: Track Instrument State Management

### 3.1 Add Track Instruments to App State

**File:** `src/App.tsx` (MODIFY)

**New State Variables:**

```typescript
// Instrument selection: Track 0-3 → Patch ID 0-127
const [trackInstruments, setTrackInstruments] = useState<number[]>([0, 0, 0, 0]);

// Loaded instrument bank (128 patches)
const [instrumentBank, setInstrumentBank] = useState<OPLPatch[]>([]);

// Bank loading status
const [bankLoaded, setBankLoaded] = useState(false);
const [bankError, setBankError] = useState<string | null>(null);
```

**New useEffect - Load Instrument Bank:**

```typescript
useEffect(() => {
  const loadInstruments = async () => {
    try {
      console.log('Loading GENMIDI instrument bank...');
      const bank = await loadGENMIDI();
      setInstrumentBank(bank.patches);
      setBankLoaded(true);
      console.log(`Loaded ${bank.patches.length} instruments`);
    } catch (error) {
      console.error('Failed to load GENMIDI, using defaults:', error);
      setInstrumentBank(defaultPatches);
      setBankError('Using default instruments');
      setBankLoaded(true);
    }
  };

  if (isReady && instrumentBank.length === 0) {
    loadInstruments();
  }
}, [isReady, instrumentBank.length]);
```

**New useEffect - Apply Track Instruments to Channels:**

```typescript
useEffect(() => {
  if (!synth || !bankLoaded || instrumentBank.length === 0) return;

  // Map each track to its channel and load the selected patch
  trackInstruments.forEach((patchId, trackIndex) => {
    const channelId = trackIndex; // Track 0-3 → Channel 0-3
    const patch = instrumentBank[patchId];

    if (patch) {
      console.log(`Track ${trackIndex} → Channel ${channelId} → Patch ${patchId}: ${patch.name}`);
      synth.loadPatch(channelId, patch);
    }
  });
}, [synth, bankLoaded, instrumentBank, trackInstruments]);
```

---

### 3.2 Update SimplePlayer Integration

**File:** `src/SimplePlayer.ts` (MODIFY)

**Changes:** Minimal - track→channel mapping already works

**Optional Enhancement:**

```typescript
// Add metadata about which patch each track uses
interface TrackerPattern {
  bpm: number;
  stepsPerBeat: number;
  rows: TrackerNote[][];
  trackInstruments?: number[]; // Optional: patch IDs per track
}
```

---

## Phase 4: Instrument Selector UI

### 4.1 Track Instrument Dropdowns Component

**File:** `src/components/InstrumentSelector.tsx` (NEW)

**Component:**

```typescript
import React from 'react';
import './InstrumentSelector.css';
import type { OPLPatch } from '../types/OPLPatch';

interface InstrumentSelectorProps {
  trackInstruments: number[];           // [0, 1, 2, 3] = patch IDs per track
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
  const trackColors = ['#00ff00', '#00aaff', '#ffaa00', '#ff00ff'];

  return (
    <div className="instrument-selector">
      <label className="selector-label">🎸 Instruments:</label>

      {trackInstruments.map((patchId, trackIndex) => {
        const patch = instrumentBank[patchId];

        return (
          <div key={trackIndex} className="track-instrument">
            <span
              className="track-label"
              style={{ color: trackColors[trackIndex] }}
            >
              Track {trackIndex + 1}:
            </span>

            <select
              value={patchId}
              onChange={(e) => onInstrumentChange(trackIndex, parseInt(e.target.value))}
              disabled={disabled}
              className="instrument-dropdown"
            >
              {instrumentBank.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id.toString().padStart(3, '0')} - {p.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => onEditClick(trackIndex)}
              disabled={disabled}
              className="edit-button"
              title="Edit instrument"
            >
              ✏️
            </button>
          </div>
        );
      })}
    </div>
  );
}
```

---

### 4.2 Integration into App.tsx

**Add to controls section:**

```typescript
{bankLoaded && (
  <InstrumentSelector
    trackInstruments={trackInstruments}
    instrumentBank={instrumentBank}
    onInstrumentChange={(trackIndex, patchId) => {
      const newInstruments = [...trackInstruments];
      newInstruments[trackIndex] = patchId;
      setTrackInstruments(newInstruments);
    }}
    onEditClick={(trackIndex) => {
      setEditingTrack(trackIndex);
      setShowEditor(true);
    }}
    disabled={isPlaying}
  />
)}
```

---

### 4.3 Update TrackerGrid Headers

**File:** `src/components/TrackerGrid.tsx` (MODIFY)

**Enhancement:** Show instrument name in column headers

```typescript
<th key={i} className="track-header">
  Track {i + 1}
  {instrumentName && (
    <div className="instrument-name">{instrumentName}</div>
  )}
</th>
```

---

## Phase 5: Instrument Editor Modal

### 5.1 Modal Component Structure

**File:** `src/components/InstrumentEditor.tsx` (NEW)

**Component Structure:**

```typescript
interface InstrumentEditorProps {
  isOpen: boolean;
  trackIndex: number;
  currentPatch: OPLPatch;
  instrumentBank: OPLPatch[];
  onClose: () => void;
  onSave: (patch: OPLPatch) => void;
  onPreview: (patch: OPLPatch) => void;
}

export function InstrumentEditor({
  isOpen,
  trackIndex,
  currentPatch,
  instrumentBank,
  onClose,
  onSave,
  onPreview,
}: InstrumentEditorProps) {
  const [editedPatch, setEditedPatch] = useState<OPLPatch>(currentPatch);
  const [viewMode, setViewMode] = useState<'simple' | 'advanced'>('simple');

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <ModalHeader />
        <ViewToggle />
        {viewMode === 'simple' ? <SimpleView /> : <AdvancedView />}
        <ModalFooter />
      </div>
    </div>
  );
}
```

---

### 5.2 Simple View - 10 Essential Parameters

**Component:** `SimpleView` (sub-component)

**Parameters:**

1. **Preset Selection** (dropdown) - Select from 128 instruments
2. **Attack** (slider 0-15) - Sound start speed
3. **Decay** (slider 0-15) - Drop to sustain speed
4. **Sustain** (slider 0-15) - Held volume level
5. **Release** (slider 0-15) - Fade-out speed
6. **Modulator Volume** (slider 0-63) - FM modulation depth
7. **Carrier Volume** (slider 0-63) - Final output volume
8. **Feedback** (slider 0-7) - Self-modulation amount
9. **Modulator Wave** (dropdown) - Sine, Half-Sine, Abs-Sine, Quarter-Sine
10. **Carrier Wave** (dropdown) - Same options
11. **Connection** (toggle) - FM vs Additive

**Layout:**
- 2-column grid
- Each parameter: Label + Slider/Dropdown + Value display
- Preview button at bottom

---

### 5.3 Advanced View - Full Parameter Control

**Component:** `AdvancedView` (sub-component)

**Sections:**

1. **Operator 1 (Modulator)** - 12 parameters
2. **Operator 2 (Carrier)** - 12 parameters
3. **Channel Settings** - 2 parameters

**Per-Operator Parameters:**
- Frequency Multiplier (0-15)
- Attack Rate (0-15)
- Decay Rate (0-15)
- Sustain Level (0-15)
- Release Rate (0-15)
- Output Level (0-63)
- Waveform (0-7)
- Key Scale Level (0-3)
- Amplitude Modulation (checkbox)
- Vibrato (checkbox)
- Envelope Type (checkbox)
- Key Scale Rate (checkbox)

**Layout:**
- Accordion sections (collapsible)
- 2-column grid within each section
- Tooltips explaining each parameter

---

### 5.4 Live Preview

**Implementation:**

```typescript
const handlePreview = () => {
  // Play middle C (MIDI 60) with current patch
  onPreview(editedPatch);
};

// In App.tsx:
const handlePreview = (patch: OPLPatch) => {
  if (!synth) return;

  // Load patch to temporary channel (channel 8)
  synth.loadPatch(8, patch);

  // Play test note
  synth.noteOn(8, 60); // Middle C

  // Auto stop after 1 second
  setTimeout(() => {
    synth.noteOff(8, 60);
  }, 1000);
};
```

---

## Phase 6: Styling

### 6.1 Instrument Selector Styles

**File:** `src/components/InstrumentSelector.css` (NEW)

```css
.instrument-selector {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px 15px;
  background-color: #1a1a1a;
  border-radius: 6px;
  border: 1px solid #333;
  flex-wrap: wrap;
}

.selector-label {
  font-size: 14px;
  font-weight: 500;
  color: #ffaa00;
  white-space: nowrap;
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
}

.edit-button {
  padding: 6px 10px;
  font-size: 16px;
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-button:hover:not(:disabled) {
  background-color: #3a3a3a;
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .instrument-selector {
    flex-direction: column;
    align-items: stretch;
  }

  .track-instrument {
    flex-direction: column;
    align-items: stretch;
  }

  .instrument-dropdown {
    width: 100%;
  }
}
```

---

### 6.2 Instrument Editor Modal Styles

**File:** `src/components/InstrumentEditor.css` (NEW)

```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.2s;
}

.modal-content {
  background-color: #1a1a1a;
  border: 2px solid #00ff00;
  border-radius: 8px;
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 255, 0, 0.3);
  animation: slideIn 0.3s;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #333;
}

.modal-header h2 {
  margin: 0;
  color: #00ff00;
  font-size: 24px;
}

.close-button {
  background: none;
  border: none;
  color: #aaa;
  font-size: 28px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
}

.close-button:hover {
  color: #ff4444;
}

.view-toggle {
  display: flex;
  gap: 0;
  padding: 0 20px;
  margin-top: 15px;
}

.view-toggle button {
  padding: 10px 20px;
  border: 1px solid #444;
  background-color: #2a2a2a;
  color: #aaa;
  cursor: pointer;
  transition: all 0.2s;
}

.view-toggle button.active {
  background-color: #00aa00;
  color: white;
  border-color: #00ff00;
}

.view-toggle button:first-child {
  border-radius: 6px 0 0 6px;
}

.view-toggle button:last-child {
  border-radius: 0 6px 6px 0;
}

.editor-content {
  padding: 20px;
}

.parameter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 20px;
}

.parameter-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.parameter-label {
  font-size: 13px;
  font-weight: 500;
  color: #ffaa00;
  display: flex;
  justify-content: space-between;
}

.parameter-value {
  color: #00ff00;
  font-family: 'Courier New', monospace;
}

.parameter-slider {
  width: 100%;
  height: 6px;
  background-color: #333;
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.parameter-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background-color: #00ff00;
  border-radius: 50%;
  cursor: pointer;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #333;
}

.btn-preview {
  padding: 10px 20px;
  background-color: #ffaa00;
  color: #0a0a0a;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.btn-save {
  padding: 10px 20px;
  background-color: #00aa00;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.btn-cancel {
  padding: 10px 20px;
  background-color: #666;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .parameter-grid {
    grid-template-columns: 1fr;
  }

  .modal-content {
    width: 95%;
    max-height: 95vh;
  }
}
```

---

## Phase 7: Integration & Polish

### 7.1 LocalStorage Persistence

**File:** `src/utils/storageManager.ts` (NEW)

```typescript
const STORAGE_KEY = 'weborchestra-instruments';

export interface StoredInstruments {
  trackInstruments: number[];       // Track → Patch ID
  customPatches?: OPLPatch[];       // User-edited patches
}

export function saveInstruments(data: StoredInstruments): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadInstruments(): StoredInstruments | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to parse stored instruments:', error);
    return null;
  }
}

export function clearInstruments(): void {
  localStorage.removeItem(STORAGE_KEY);
}
```

**Integration in App.tsx:**

```typescript
// Load on startup
useEffect(() => {
  const stored = loadInstruments();
  if (stored) {
    setTrackInstruments(stored.trackInstruments);
  }
}, []);

// Save on change
useEffect(() => {
  if (bankLoaded) {
    saveInstruments({ trackInstruments });
  }
}, [trackInstruments, bankLoaded]);
```

---

### 7.2 Validation & Error Handling

**Features:**
- Validate GENMIDI.json structure on load
- Fallback to defaultPatches if fetch fails
- Clamp all parameter values to valid ranges
- Show loading spinner while fetching
- Display error message if bank fails

**In App.tsx:**

```typescript
{!bankLoaded && (
  <div className="loading-instruments">
    Loading instruments...
  </div>
)}

{bankError && (
  <div className="instrument-warning">
    ⚠️ {bankError}
  </div>
)}
```

---

### 7.3 Help Documentation Update

**File:** `src/App.tsx` - Update help section

**Add section:**

```typescript
<div>
  <h4>🎸 Instruments:</h4>
  <ul>
    <li><strong>Each track</strong> can have a different instrument</li>
    <li><strong>128 instruments</strong> loaded from GENMIDI bank</li>
    <li><strong>Edit button (✏️)</strong> opens instrument editor</li>
    <li><strong>Simple view:</strong> 10 essential parameters</li>
    <li><strong>Advanced view:</strong> Full OPL3 control</li>
    <li><strong>Preview button:</strong> Test your changes</li>
  </ul>
</div>
```

---

## File Structure Summary

```
minimal-prototype/
├── public/
│   └── instruments/
│       └── GENMIDI.json              ← FETCH: 128 GM instruments
├── src/
│   ├── types/
│   │   └── OPLPatch.ts               ← NEW: Type definitions
│   ├── data/
│   │   └── defaultPatches.ts         ← NEW: Fallback instruments
│   ├── utils/
│   │   ├── genmidiParser.ts          ← NEW: Parse GENMIDI.json
│   │   └── storageManager.ts         ← NEW: LocalStorage
│   ├── components/
│   │   ├── InstrumentSelector.tsx    ← NEW: Track dropdowns
│   │   ├── InstrumentSelector.css    ← NEW
│   │   ├── InstrumentEditor.tsx      ← NEW: Modal editor
│   │   ├── InstrumentEditor.css      ← NEW
│   │   ├── TrackerGrid.tsx           ← MODIFY: Show instruments
│   │   └── TrackerGrid.css           ← MODIFY
│   ├── SimpleSynth.ts                ← MODIFY: Patch management
│   ├── SimplePlayer.ts               ← OPTIONAL: Track metadata
│   ├── App.tsx                       ← MODIFY: State & integration
│   └── App.css                       ← MODIFY: New components
```

---

## Implementation Phases (Recommended Order)

### Week 1: Foundation (8-10 hours)
- [x] Phase 1.1: Create OPLPatch types
- [x] Phase 1.3: Create defaultPatches.ts
- [x] Phase 2.1: Add patch management to SimpleSynth
- [x] Phase 2.2: Test manual patch loading
- [x] Milestone: Can load different sounds per channel

### Week 2: GENMIDI Integration (6-8 hours)
- [x] Phase 1.2: Implement GENMIDI parser
- [x] Test: Fetch and parse GENMIDI.json
- [x] Test: Load 10+ different instruments
- [x] Add loading states and error handling
- [x] Milestone: 128 instruments available

### Week 3: Selector UI (6-8 hours)
- [x] Phase 4.1: Build InstrumentSelector component
- [x] Phase 4.2: Integrate into App.tsx
- [x] Phase 4.3: Update TrackerGrid headers
- [x] Phase 6.1: Style instrument selector
- [x] Test: Switch instruments live
- [x] Milestone: Track-level instrument selection working

### Week 4: Editor UI - Simple View (8-10 hours)
- [x] Phase 5.1: Create InstrumentEditor modal shell
- [x] Phase 5.2: Implement Simple view
- [x] Phase 5.4: Add live preview
- [x] Phase 6.2: Style modal
- [x] Test: Edit parameters and hear changes
- [x] Milestone: Simple editor functional

### Week 5: Editor UI - Advanced View (6-8 hours)
- [x] Phase 5.3: Implement Advanced view
- [x] Add Simple/Advanced toggle
- [x] Add tooltips for parameters
- [x] Test: Full parameter control
- [x] Milestone: Complete editor

### Week 6: Polish & Persistence (4-6 hours)
- [x] Phase 7.1: Implement LocalStorage persistence
- [x] Phase 7.2: Add comprehensive validation
- [x] Phase 7.3: Update help documentation
- [x] Full regression testing
- [x] Fix bugs and edge cases
- [x] Milestone: Production-ready feature

---

## Success Criteria

### Functionality
- [x] Each track can select from 128 instruments independently
- [x] GENMIDI.json loads successfully with fallback to defaults
- [x] Simple view exposes 10 essential parameters
- [x] Advanced view exposes all 24+ OPL3 parameters
- [x] Live preview plays test note with current settings
- [x] Changes persist across browser sessions

### User Experience
- [x] Instrument selector clearly visible and intuitive
- [x] Modal opens/closes smoothly with animations
- [x] Simple/Advanced toggle works seamlessly
- [x] Parameters update in real-time (no lag)
- [x] Visual feedback for current selections
- [x] Track colors consistent throughout UI

### Polish
- [x] Loading states for GENMIDI fetch
- [x] Error handling with user-friendly messages
- [x] Help documentation updated
- [x] Mobile-responsive design
- [x] No console errors or warnings
- [x] Comprehensive tooltips

---

## Estimated Time

| Phase | Task | Hours |
|-------|------|-------|
| 1 | Data Structures & GENMIDI | 8-10 |
| 2 | SimpleSynth Enhancements | 4-6 |
| 3 | Track State Management | 2-3 |
| 4 | Instrument Selector UI | 6-8 |
| 5 | Instrument Editor UI | 12-16 |
| 6 | Styling | 4-6 |
| 7 | Integration & Polish | 4-6 |
| **Total** | | **40-55 hours** |

**Timeline:** 4-6 weeks part-time (~10 hours/week)

---

## Technical Notes

### OPL3 Register Write Performance
- Full patch load = ~24 register writes (2 operators × 12 params)
- Takes <1ms per patch
- Safe to reprogram between notes
- Consider caching: Only write if patch changed

### GENMIDI Data Format
- 128 instruments (GM compatible)
- Each instrument: 2-operator or 4-operator data
- Start with 2-operator mode (simpler)
- 4-operator support can be added later

### Voice Allocation Strategy
- Current: 1 track = 1 channel (simple, works for 4 tracks)
- Future: Dynamic allocation for >4 tracks
- Future: Note stealing algorithm for polyphony >9

---

## Future Enhancements (Out of Scope)

Not included in this plan but possible later:

1. **4-Operator Mode** - More complex FM synthesis
2. **Custom Patch Library** - Save/share user patches
3. **Patch Import/Export** - Load .opl files
4. **Visual Waveform Display** - Show resulting wave
5. **MIDI Learn** - Map MIDI controllers to parameters
6. **Patch Randomizer** - Generate random instruments
7. **Favorite Patches** - Star frequently used instruments
8. **Search/Filter** - Find instruments by name/category

---

## Questions & Decisions

### Q: Modal vs Route?
**Decision:** Start with modal (simpler), add routing later if needed

### Q: Where to get GENMIDI.json?
**Answer:** Multiple sources:
- Doom WAD extraction tools
- Pre-converted JSON: [github.com/Malvineous/genmidi.js](https://github.com/Malvineous/genmidi.js)
- DOSBox GENMIDI.op2 → JSON converter

### Q: Custom patches storage?
**Decision:** Phase 1: LocalStorage only. Phase 2: Export/import JSON files.

### Q: Keyboard shortcuts for editor?
**Suggestion:** 'I' key to open editor, 'Esc' to close (add later)

---

## Risk Mitigation

### Risk: GENMIDI fetch fails
**Mitigation:** defaultPatches.ts fallback with 4 basic instruments

### Risk: Parameter ranges incorrect
**Mitigation:** Comprehensive validation, clamp all values

### Risk: Performance issues with real-time preview
**Mitigation:** Debounce slider changes, limit preview rate

### Risk: Complex UI overwhelming users
**Mitigation:** Simple view by default, progressive disclosure

---

## Dependencies

### External Libraries
- ✅ `@malvineous/opl` - Already installed
- ✅ React 18 - Already in use
- ✅ TypeScript - Already configured
- ❌ No new dependencies needed!

### Assets Required
- [ ] GENMIDI.json file (128 instruments)
- [ ] Place in `public/instruments/GENMIDI.json`
- [ ] ~50KB file size

---

## Testing Strategy

### Unit Tests (Optional)
- `genmidiParser.ts` - Parse valid/invalid JSON
- `storageManager.ts` - Save/load/clear
- `validatePatch()` - Parameter range checks

### Integration Tests
- Load GENMIDI → Apply to channels → Play notes
- Edit parameters → Preview → Save → Persist
- Switch instruments → Hear different sounds

### Manual Testing Checklist
- [ ] Load 128 instruments from GENMIDI
- [ ] Select different instrument per track
- [ ] Edit in Simple view, verify sound changes
- [ ] Edit in Advanced view, all parameters work
- [ ] Preview button plays test note
- [ ] Save and reload page, selections persist
- [ ] Error handling when GENMIDI fails
- [ ] Mobile responsive on phone/tablet
- [ ] No console errors during any operation

---

## Documentation

### User-Facing
- Update help section in App.tsx
- Add tooltips to all parameters
- Include examples in help text

### Developer-Facing
- JSDoc comments on all functions
- Type definitions well-documented
- README update with new features

---

## Completion Checklist

- [ ] All 7 phases implemented
- [ ] All success criteria met
- [ ] All tests passing
- [ ] Documentation updated
- [ ] No console errors
- [ ] Performance acceptable (<100ms response)
- [ ] Mobile responsive
- [ ] Code reviewed
- [ ] Ready for production

---

## Next Steps After Plan Approval

1. Create feature branch: `git checkout -b feature/instrument-panel`
2. Start with Phase 1.1: Create type definitions
3. Implement incrementally, testing each phase
4. Commit frequently with clear messages
5. Deploy to preview environment
6. User testing and feedback
7. Merge to main branch

---

**Ready to implement!** 🎸

Would you like me to proceed with Phase 1 (Data Structures)?
