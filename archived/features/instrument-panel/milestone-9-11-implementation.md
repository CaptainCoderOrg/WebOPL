# Milestones 9-11: Complete Editor with Advanced View

**Goal:** Complete Simple view and add full Advanced parameter editing

**Time Estimate:** 10-14 hours total

**Status:** Not Started

---

## Milestone 9: Simple Editor - Volume & Feedback (2-3 hours)

### Overview

Add 6 more parameters to Simple view for essential sound shaping:
- **Modulator Volume** (outputLevel: 0-63, inverted)
- **Carrier Volume** (outputLevel: 0-63, inverted)
- **Feedback** (0-7)
- **Modulator Waveform** (0-7)
- **Carrier Waveform** (0-7)
- **Connection Mode** (FM vs Additive)

After this milestone, Simple view will have all 10 most important parameters.

---

### Step 1: Add volume and feedback sliders (60-90 min)

**File: `src/components/InstrumentEditor.tsx` (MODIFY)**

**Add after ADSR section:**

```typescript
{/* Volume & Tone */}
<div className="editor-section">
  <h3 className="editor-section-title">Volume & Tone</h3>
  <p className="editor-section-desc">
    Controls loudness and timbre characteristics
  </p>

  {/* Modulator Volume */}
  <div className="editor-param">
    <label className="editor-param-label" htmlFor="volume-mod">
      Modulator Volume
    </label>
    <div className="editor-slider-group">
      <input
        type="range"
        id="volume-mod"
        className="editor-slider"
        min="0"
        max="63"
        value={editedPatch.modulator.outputLevel}
        onChange={(e) => {
          const value = parseInt(e.target.value, 10);
          setEditedPatch({
            ...editedPatch,
            modulator: {
              ...editedPatch.modulator,
              outputLevel: value
            }
          });
        }}
      />
      <span className="editor-value">{editedPatch.modulator.outputLevel}</span>
    </div>
    <p className="editor-param-hint">
      Controls modulation depth (0 = most modulation, 63 = least)
    </p>
  </div>

  {/* Carrier Volume */}
  <div className="editor-param">
    <label className="editor-param-label" htmlFor="volume-car">
      Carrier Volume
    </label>
    <div className="editor-slider-group">
      <input
        type="range"
        id="volume-car"
        className="editor-slider"
        min="0"
        max="63"
        value={editedPatch.carrier.outputLevel}
        onChange={(e) => {
          const value = parseInt(e.target.value, 10);
          setEditedPatch({
            ...editedPatch,
            carrier: {
              ...editedPatch.carrier,
              outputLevel: value
            }
          });
        }}
      />
      <span className="editor-value">{editedPatch.carrier.outputLevel}</span>
    </div>
    <p className="editor-param-hint">
      Overall volume (0 = loudest, 63 = silent)
    </p>
  </div>

  {/* Feedback */}
  <div className="editor-param">
    <label className="editor-param-label" htmlFor="feedback">
      Feedback
    </label>
    <div className="editor-slider-group">
      <input
        type="range"
        id="feedback"
        className="editor-slider"
        min="0"
        max="7"
        value={editedPatch.feedback}
        onChange={(e) => {
          const value = parseInt(e.target.value, 10);
          setEditedPatch({
            ...editedPatch,
            feedback: value
          });
        }}
      />
      <span className="editor-value">{editedPatch.feedback}</span>
    </div>
    <p className="editor-param-hint">
      Adds harmonics (0 = clean, 7 = metallic/harsh)
    </p>
  </div>
</div>
```

---

### Step 2: Add waveform dropdowns (45-60 min)

**Add after Volume & Tone section:**

```typescript
{/* Waveforms */}
<div className="editor-section">
  <h3 className="editor-section-title">Waveforms</h3>
  <p className="editor-section-desc">
    Choose the basic waveform shape for each operator
  </p>

  {/* Modulator Waveform */}
  <div className="editor-param">
    <label className="editor-param-label" htmlFor="waveform-mod">
      Modulator Waveform
    </label>
    <select
      id="waveform-mod"
      className="editor-select"
      value={editedPatch.modulator.waveform}
      onChange={(e) => {
        const value = parseInt(e.target.value, 10);
        setEditedPatch({
          ...editedPatch,
          modulator: {
            ...editedPatch.modulator,
            waveform: value
          }
        });
      }}
    >
      <option value={0}>0 - Sine</option>
      <option value={1}>1 - Half-Sine</option>
      <option value={2}>2 - Abs-Sine</option>
      <option value={3}>3 - Pulse-Sine</option>
      <option value={4}>4 - Sine (even periods)</option>
      <option value={5}>5 - Abs-Sine (even periods)</option>
      <option value={6}>6 - Square</option>
      <option value={7}>7 - Derived Square</option>
    </select>
    <p className="editor-param-hint">
      Sine = smooth, Square = bright/harsh
    </p>
  </div>

  {/* Carrier Waveform */}
  <div className="editor-param">
    <label className="editor-param-label" htmlFor="waveform-car">
      Carrier Waveform
    </label>
    <select
      id="waveform-car"
      className="editor-select"
      value={editedPatch.carrier.waveform}
      onChange={(e) => {
        const value = parseInt(e.target.value, 10);
        setEditedPatch({
          ...editedPatch,
          carrier: {
            ...editedPatch.carrier,
            waveform: value
          }
        });
      }}
    >
      <option value={0}>0 - Sine</option>
      <option value={1}>1 - Half-Sine</option>
      <option value={2}>2 - Abs-Sine</option>
      <option value={3}>3 - Pulse-Sine</option>
      <option value={4}>4 - Sine (even periods)</option>
      <option value={5}>5 - Abs-Sine (even periods)</option>
      <option value={6}>6 - Square</option>
      <option value={7}>7 - Derived Square</option>
    </select>
    <p className="editor-param-hint">
      Most important for final timbre
    </p>
  </div>
</div>
```

**Add CSS for select dropdown:**

```css
.editor-select {
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

.editor-select:hover {
  border-color: #6d6d6d;
}

.editor-select:focus {
  outline: none;
  border-color: #4a9eff;
}
```

---

### Step 3: Add connection mode toggle (30 min)

**Add after Waveforms section:**

```typescript
{/* Connection Mode */}
<div className="editor-section">
  <h3 className="editor-section-title">Connection Mode</h3>
  <p className="editor-section-desc">
    How the two operators are combined
  </p>

  <div className="editor-param">
    <div className="editor-toggle-group">
      <label className="editor-toggle">
        <input
          type="radio"
          name="connection"
          value="fm"
          checked={editedPatch.connection === 'fm'}
          onChange={(e) => {
            setEditedPatch({
              ...editedPatch,
              connection: 'fm'
            });
          }}
        />
        <span className="editor-toggle-label">
          <strong>FM (Frequency Modulation)</strong>
          <br />
          <small>Modulator affects carrier's frequency - richer, more complex tones</small>
        </span>
      </label>

      <label className="editor-toggle">
        <input
          type="radio"
          name="connection"
          value="additive"
          checked={editedPatch.connection === 'additive'}
          onChange={(e) => {
            setEditedPatch({
              ...editedPatch,
              connection: 'additive'
            });
          }}
        />
        <span className="editor-toggle-label">
          <strong>Additive</strong>
          <br />
          <small>Both operators heard directly - simpler, brighter sounds</small>
        </span>
      </label>
    </div>
  </div>
</div>
```

**Add CSS for toggle:**

```css
.editor-toggle-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.editor-toggle {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background-color: #2a2a2a;
  border: 2px solid #3d3d3d;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.editor-toggle:hover {
  border-color: #4d4d4d;
  background-color: #2d2d2d;
}

.editor-toggle input[type="radio"] {
  margin-top: 2px;
  cursor: pointer;
  accent-color: #4a9eff;
}

.editor-toggle input[type="radio"]:checked + .editor-toggle-label {
  color: #4a9eff;
}

.editor-toggle-label {
  flex: 1;
  color: #cccccc;
  transition: color 0.2s;
}

.editor-toggle-label small {
  color: #999;
  font-size: 12px;
}
```

---

### Step 4: Manual Testing (30-45 min)

#### Test 1: Volume Sliders

1. Open editor for Piano
2. Move Carrier Volume from 0 to 30
3. Preview
4. **Expected:** Much quieter

5. Move Carrier Volume to 63
6. Preview
7. **Expected:** Silent (or nearly silent)

8. Reset Carrier Volume to 0
9. Move Modulator Volume from 18 to 0
10. Preview
11. **Expected:** Brighter, more harmonics (more modulation)

12. Move Modulator Volume to 63
13. Preview
14. **Expected:** Pure tone (no modulation)

#### Test 2: Feedback Slider

1. Open editor for Piano
2. Move Feedback from 1 to 0
3. Preview → smooth, clean
4. Move Feedback to 7
5. Preview → metallic, harsh
6. Try intermediate values (3-4)
7. **Expected:** Gradual transition from clean to metallic

#### Test 3: Waveform Dropdowns

1. Open editor
2. Change Carrier Waveform to "1 - Half-Sine"
3. Preview → slightly different timbre
4. Change to "2 - Abs-Sine"
5. Preview → brighter
6. Change to "6 - Square"
7. Preview → very bright/harsh
8. Try all 8 waveforms
9. **Expected:** Each sounds different

#### Test 4: Connection Mode

1. Open editor for Piano
2. Current mode: FM
3. Preview → note how it sounds
4. Switch to Additive
5. Preview → much brighter, simpler
6. Switch back to FM
7. Preview → richer again
8. **Expected:** Clear audible difference

#### Test 5: Create Custom Instrument

1. Open editor for Track 0
2. Set:
   - Preset: Piano (or any)
   - Attack (Carrier): 15 (instant)
   - Decay (Carrier): 8
   - Sustain (Carrier): 2
   - Release (Carrier): 6
   - Carrier Volume: 0 (loud)
   - Modulator Volume: 10
   - Feedback: 5
   - Carrier Waveform: Abs-Sine
   - Modulator Waveform: Sine
   - Connection: FM
3. Preview → hear your custom sound
4. Save
5. Play pattern
6. **Expected:** Track 0 uses your custom instrument

#### Test 6: All Parameters Working Together

1. Create a custom patch with extreme values:
   - Attack: 0 (slow)
   - Sustain: 0 (loud)
   - Release: 15 (instant)
   - Feedback: 7 (max)
   - Waveforms: Square
   - Connection: Additive
2. Preview
3. **Expected:** Slow, loud attack, harsh tone, instant cutoff

---

### Success Criteria - Milestone 9

- [ ] Volume sliders affect loudness correctly
- [ ] Feedback slider affects tone (0=clean, 7=harsh)
- [ ] Waveform dropdowns change timbre
- [ ] All 8 waveforms available for each operator
- [ ] Connection mode toggle switches FM/Additive
- [ ] Preview reflects all parameter changes
- [ ] Can create completely custom instruments
- [ ] Save applies all 10 parameters
- [ ] No console errors

---

## Milestone 10: Simple/Advanced Toggle (2-3 hours)

### Overview

Add tabs to switch between Simple view (current 10 parameters) and Advanced view (all parameters). Advanced view will be completed in Milestone 11.

---

### Step 1: Add view mode state and tabs (45-60 min)

**File: `src/components/InstrumentEditor.tsx` (MODIFY)**

**Add state at top of component:**

```typescript
type ViewMode = 'simple' | 'advanced';
const [viewMode, setViewMode] = useState<ViewMode>('simple');
```

**Add tab UI in editor body (BEFORE editor-info div):**

```typescript
{/* View Mode Tabs */}
<div className="editor-tabs">
  <button
    className={`editor-tab ${viewMode === 'simple' ? 'editor-tab-active' : ''}`}
    onClick={() => setViewMode('simple')}
  >
    Simple
  </button>
  <button
    className={`editor-tab ${viewMode === 'advanced' ? 'editor-tab-active' : ''}`}
    onClick={() => setViewMode('advanced')}
  >
    Advanced
  </button>
</div>
```

**Add CSS for tabs:**

```css
/* Tabs */
.editor-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 20px;
  border-bottom: 2px solid #3d3d3d;
}

.editor-tab {
  flex: 1;
  padding: 12px 20px;
  background: none;
  border: none;
  color: #999;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
}

.editor-tab:hover {
  color: #ccc;
}

.editor-tab-active {
  color: #4a9eff;
}

.editor-tab-active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #4a9eff;
}
```

---

### Step 2: Wrap Simple view content (15 min)

**Wrap all existing parameter sections (preset, ADSR, volume, waveforms, connection) with:**

```typescript
{/* Simple View */}
{viewMode === 'simple' && (
  <>
    {/* All existing sections here */}
  </>
)}
```

---

### Step 3: Add Advanced view placeholder (15 min)

**Add after Simple view:**

```typescript
{/* Advanced View */}
{viewMode === 'advanced' && (
  <div className="editor-advanced-placeholder">
    <h3>🔧 Advanced Parameters</h3>
    <p>Full operator control coming in Milestone 11.</p>
    <p className="editor-advanced-hint">
      You'll be able to edit:
    </p>
    <ul className="editor-advanced-list">
      <li>Frequency Multipliers (0-15)</li>
      <li>Key Scale Level (0-3)</li>
      <li>Key Scale Rate (on/off)</li>
      <li>Amplitude Modulation (on/off)</li>
      <li>Vibrato (on/off)</li>
      <li>Envelope Type (on/off)</li>
    </ul>
  </div>
)}
```

**Add CSS for placeholder:**

```css
.editor-advanced-placeholder {
  text-align: center;
  padding: 60px 40px;
  color: #999;
}

.editor-advanced-placeholder h3 {
  font-size: 24px;
  margin: 0 0 16px 0;
  color: #ccc;
}

.editor-advanced-placeholder p {
  margin: 8px 0;
  font-size: 14px;
}

.editor-advanced-hint {
  margin-top: 24px;
  color: #666;
  font-size: 13px;
}

.editor-advanced-list {
  display: inline-block;
  text-align: left;
  margin: 16px auto;
  color: #777;
  font-size: 13px;
}

.editor-advanced-list li {
  margin: 8px 0;
}
```

---

### Step 4: Persist view mode preference (optional) (30 min)

**Add localStorage persistence:**

```typescript
// Load saved preference on mount
useEffect(() => {
  const saved = localStorage.getItem('editor-view-mode');
  if (saved === 'simple' || saved === 'advanced') {
    setViewMode(saved);
  }
}, []);

// Save preference when changed
useEffect(() => {
  localStorage.setItem('editor-view-mode', viewMode);
}, [viewMode]);
```

---

### Step 5: Manual Testing (30-45 min)

#### Test 1: Tab Switching

1. Open editor
2. Default view: Simple
3. Click "Advanced" tab
4. **Expected:**
   - Advanced tab highlighted
   - Placeholder message shown
   - Simple controls hidden

5. Click "Simple" tab
6. **Expected:**
   - Simple tab highlighted
   - All 10 parameters visible
   - Advanced placeholder hidden

#### Test 2: Edit in Simple, Switch to Advanced

1. Open editor
2. Change Attack slider
3. Switch to Advanced tab
4. Switch back to Simple tab
5. **Expected:**
   - Attack slider still shows changed value
   - Changes preserved

#### Test 3: Save from Either View

1. Switch to Simple view
2. Edit ADSR
3. Switch to Advanced view
4. Click Save
5. **Expected:**
   - Changes saved correctly
   - Modal closes
   - Pattern uses edited instrument

#### Test 4: Preview from Either View

1. Simple view: Click Preview → works
2. Switch to Advanced
3. Click Preview → works
4. **Expected:** Preview works regardless of view

#### Test 5: Persistence (if implemented)

1. Switch to Advanced view
2. Close modal
3. Reload page
4. Open editor
5. **Expected:** Advanced view still active

---

### Success Criteria - Milestone 10

- [ ] Two tabs visible: Simple and Advanced
- [ ] Simple tab active by default
- [ ] Clicking tab switches view
- [ ] Active tab highlighted
- [ ] Simple view shows all 10 parameters
- [ ] Advanced view shows placeholder
- [ ] Preview works in both views
- [ ] Save works from both views
- [ ] Edited values preserved when switching tabs
- [ ] (Optional) View preference persists across sessions

---

## Milestone 11: Advanced View - Full Parameters (6-8 hours)

### Overview

Implement complete Advanced view with all 24+ OPL3 parameters, organized into logical groups:
- Operator 1 (Modulator): 12 parameters
- Operator 2 (Carrier): 12 parameters
- Channel-level: Feedback, Connection (already in Simple)

---

### Step 1: Create operator parameter group component (90-120 min)

**File: `src/components/InstrumentEditor.tsx` (ADD HELPER COMPONENT)**

**Add before main component:**

```typescript
/**
 * OperatorParams Component
 * Displays all parameters for one operator (Modulator or Carrier)
 */
interface OperatorParamsProps {
  operatorName: 'Modulator' | 'Carrier';
  operator: OPLOperator;
  onChange: (updates: Partial<OPLOperator>) => void;
}

function OperatorParams({ operatorName, operator, onChange }: OperatorParamsProps) {
  return (
    <div className="operator-params">
      <h4 className="operator-title">
        {operatorName === 'Modulator' ? '🎹 Operator 1: Modulator' : '🎵 Operator 2: Carrier'}
      </h4>
      <p className="operator-desc">
        {operatorName === 'Modulator'
          ? 'Modulates the carrier frequency (in FM mode) or generates tone (in Additive mode)'
          : 'Final output operator that produces the audible sound'
        }
      </p>

      {/* ADSR Envelope */}
      <div className="operator-group">
        <h5 className="operator-group-title">Envelope (ADSR)</h5>

        <div className="editor-param-compact">
          <label>Attack Rate (0-15)</label>
          <div className="editor-slider-group">
            <input
              type="range"
              min="0"
              max="15"
              value={operator.attackRate}
              onChange={(e) => onChange({ attackRate: parseInt(e.target.value, 10) })}
              className="editor-slider"
            />
            <span className="editor-value">{operator.attackRate}</span>
          </div>
        </div>

        <div className="editor-param-compact">
          <label>Decay Rate (0-15)</label>
          <div className="editor-slider-group">
            <input
              type="range"
              min="0"
              max="15"
              value={operator.decayRate}
              onChange={(e) => onChange({ decayRate: parseInt(e.target.value, 10) })}
              className="editor-slider"
            />
            <span className="editor-value">{operator.decayRate}</span>
          </div>
        </div>

        <div className="editor-param-compact">
          <label>Sustain Level (0-15)</label>
          <div className="editor-slider-group">
            <input
              type="range"
              min="0"
              max="15"
              value={operator.sustainLevel}
              onChange={(e) => onChange({ sustainLevel: parseInt(e.target.value, 10) })}
              className="editor-slider"
            />
            <span className="editor-value">{operator.sustainLevel}</span>
          </div>
        </div>

        <div className="editor-param-compact">
          <label>Release Rate (0-15)</label>
          <div className="editor-slider-group">
            <input
              type="range"
              min="0"
              max="15"
              value={operator.releaseRate}
              onChange={(e) => onChange({ releaseRate: parseInt(e.target.value, 10) })}
              className="editor-slider"
            />
            <span className="editor-value">{operator.releaseRate}</span>
          </div>
        </div>
      </div>

      {/* Frequency & Waveform */}
      <div className="operator-group">
        <h5 className="operator-group-title">Frequency & Waveform</h5>

        <div className="editor-param-compact">
          <label>Frequency Multiplier (0-15)</label>
          <div className="editor-slider-group">
            <input
              type="range"
              min="0"
              max="15"
              value={operator.frequencyMultiplier}
              onChange={(e) => onChange({ frequencyMultiplier: parseInt(e.target.value, 10) })}
              className="editor-slider"
            />
            <span className="editor-value">{operator.frequencyMultiplier}</span>
          </div>
          <p className="editor-param-hint">
            {operator.frequencyMultiplier === 0 && '×0.5 (half speed)'}
            {operator.frequencyMultiplier === 1 && '×1 (normal)'}
            {operator.frequencyMultiplier > 1 && `×${operator.frequencyMultiplier}`}
          </p>
        </div>

        <div className="editor-param-compact">
          <label>Waveform (0-7)</label>
          <select
            value={operator.waveform}
            onChange={(e) => onChange({ waveform: parseInt(e.target.value, 10) })}
            className="editor-select"
          >
            <option value={0}>0 - Sine</option>
            <option value={1}>1 - Half-Sine</option>
            <option value={2}>2 - Abs-Sine</option>
            <option value={3}>3 - Pulse-Sine</option>
            <option value={4}>4 - Sine (even)</option>
            <option value={5}>5 - Abs-Sine (even)</option>
            <option value={6}>6 - Square</option>
            <option value={7}>7 - Derived Square</option>
          </select>
        </div>
      </div>

      {/* Volume & Scaling */}
      <div className="operator-group">
        <h5 className="operator-group-title">Volume & Scaling</h5>

        <div className="editor-param-compact">
          <label>Output Level (0-63)</label>
          <div className="editor-slider-group">
            <input
              type="range"
              min="0"
              max="63"
              value={operator.outputLevel}
              onChange={(e) => onChange({ outputLevel: parseInt(e.target.value, 10) })}
              className="editor-slider"
            />
            <span className="editor-value">{operator.outputLevel}</span>
          </div>
          <p className="editor-param-hint">
            0 = loudest, 63 = silent
          </p>
        </div>

        <div className="editor-param-compact">
          <label>Key Scale Level (0-3)</label>
          <div className="editor-slider-group">
            <input
              type="range"
              min="0"
              max="3"
              value={operator.keyScaleLevel}
              onChange={(e) => onChange({ keyScaleLevel: parseInt(e.target.value, 10) })}
              className="editor-slider"
            />
            <span className="editor-value">{operator.keyScaleLevel}</span>
          </div>
          <p className="editor-param-hint">
            Volume reduction at high notes (0 = none, 3 = max)
          </p>
        </div>
      </div>

      {/* Modulation Flags */}
      <div className="operator-group">
        <h5 className="operator-group-title">Modulation & Envelope</h5>

        <div className="editor-checkbox-group">
          <label className="editor-checkbox">
            <input
              type="checkbox"
              checked={operator.amplitudeModulation}
              onChange={(e) => onChange({ amplitudeModulation: e.target.checked })}
            />
            <span>Amplitude Modulation (Tremolo)</span>
          </label>

          <label className="editor-checkbox">
            <input
              type="checkbox"
              checked={operator.vibrato}
              onChange={(e) => onChange({ vibrato: e.target.checked })}
            />
            <span>Vibrato</span>
          </label>

          <label className="editor-checkbox">
            <input
              type="checkbox"
              checked={operator.envelopeType}
              onChange={(e) => onChange({ envelopeType: e.target.checked })}
            />
            <span>Sustaining Envelope (vs Percussive)</span>
          </label>

          <label className="editor-checkbox">
            <input
              type="checkbox"
              checked={operator.keyScaleRate}
              onChange={(e) => onChange({ keyScaleRate: e.target.checked })}
            />
            <span>Key Scale Rate</span>
          </label>
        </div>
      </div>
    </div>
  );
}
```

---

### Step 2: Replace Advanced placeholder with full UI (60 min)

**Replace the Advanced view placeholder with:**

```typescript
{/* Advanced View */}
{viewMode === 'advanced' && (
  <div className="editor-advanced">
    {/* Preset Selection (same as Simple view) */}
    <div className="editor-section">
      <label className="editor-label" htmlFor="preset-select-adv">
        Select Preset
      </label>
      <select
        id="preset-select-adv"
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
    </div>

    {/* Modulator */}
    <OperatorParams
      operatorName="Modulator"
      operator={editedPatch.modulator}
      onChange={(updates) => {
        setEditedPatch({
          ...editedPatch,
          modulator: {
            ...editedPatch.modulator,
            ...updates
          }
        });
      }}
    />

    {/* Carrier */}
    <OperatorParams
      operatorName="Carrier"
      operator={editedPatch.carrier}
      onChange={(updates) => {
        setEditedPatch({
          ...editedPatch,
          carrier: {
            ...editedPatch.carrier,
            ...updates
          }
        });
      }}
    />

    {/* Channel Parameters */}
    <div className="editor-section">
      <h3 className="editor-section-title">Channel Parameters</h3>

      <div className="editor-param-compact">
        <label>Feedback (0-7)</label>
        <div className="editor-slider-group">
          <input
            type="range"
            min="0"
            max="7"
            value={editedPatch.feedback}
            onChange={(e) => {
              setEditedPatch({
                ...editedPatch,
                feedback: parseInt(e.target.value, 10)
              });
            }}
            className="editor-slider"
          />
          <span className="editor-value">{editedPatch.feedback}</span>
        </div>
      </div>

      <div className="editor-param-compact">
        <label>Connection Mode</label>
        <select
          value={editedPatch.connection}
          onChange={(e) => {
            setEditedPatch({
              ...editedPatch,
              connection: e.target.value as 'fm' | 'additive'
            });
          }}
          className="editor-select"
        >
          <option value="fm">FM (Frequency Modulation)</option>
          <option value="additive">Additive</option>
        </select>
      </div>
    </div>
  </div>
)}
```

---

### Step 3: Add Advanced view CSS (45-60 min)

**File: `src/components/InstrumentEditor.css` (ADD)**

```css
/* Advanced View Layout */
.editor-advanced {
  max-width: 900px;
  margin: 0 auto;
}

/* Operator Sections */
.operator-params {
  margin-bottom: 32px;
  padding: 20px;
  background-color: #252525;
  border: 1px solid #3d3d3d;
  border-radius: 8px;
}

.operator-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #ffffff;
  font-weight: 600;
}

.operator-desc {
  margin: 0 0 20px 0;
  font-size: 13px;
  color: #999;
  line-height: 1.5;
}

.operator-group {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #3d3d3d;
}

.operator-group:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.operator-group-title {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #4a9eff;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Compact Parameter Style */
.editor-param-compact {
  margin-bottom: 16px;
}

.editor-param-compact label {
  display: block;
  margin-bottom: 6px;
  color: #ccc;
  font-size: 12px;
}

/* Checkbox Group */
.editor-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.editor-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #ccc;
  font-size: 13px;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.editor-checkbox:hover {
  background-color: #2d2d2d;
}

.editor-checkbox input[type="checkbox"] {
  cursor: pointer;
  accent-color: #4a9eff;
  width: 16px;
  height: 16px;
}

.editor-checkbox span {
  flex: 1;
}

/* Responsive */
@media (max-width: 768px) {
  .editor-advanced {
    max-width: 100%;
  }

  .operator-params {
    padding: 16px;
  }
}
```

---

### Step 4: Comprehensive manual testing (90-120 min)

#### Test 1: All Parameters Visible

1. Open editor
2. Switch to Advanced view
3. Scroll through entire view
4. **Expected:**
   - Preset selector at top
   - Modulator section with 4 groups
   - Carrier section with 4 groups
   - Channel parameters at bottom
   - All organized and readable

#### Test 2: Modulator Parameters

1. Advanced view
2. Modulator section
3. Test ADSR sliders (should work like Simple view)
4. Change Frequency Multiplier to 2
5. Preview → sound one octave higher
6. Change to 4
7. Preview → two octaves higher
8. Change to 0
9. Preview → one octave lower

#### Test 3: Carrier Parameters

1. Advanced view, Carrier section
2. Change Frequency Multiplier to 3
3. Preview → dissonant/inharmonic
4. Reset to 1
5. Change Output Level to 30
6. Preview → quieter
7. Change Key Scale Level to 3
8. Preview with different notes (low vs high)
9. **Expected:** High notes quieter than low notes

#### Test 4: Boolean Flags

1. Modulator: Enable Vibrato
2. Preview → slight pitch wobble
3. Disable Vibrato
4. Enable Amplitude Modulation
5. Preview → volume wobble (tremolo)
6. Carrier: Disable Sustaining Envelope
7. Preview → note cuts off even if held
8. Re-enable Sustaining Envelope

#### Test 5: Create Complex Custom Patch

1. Advanced view
2. Build a "bell" sound:
   - Modulator: Attack=15, Decay=8, Sustain=12, Release=8
   - Modulator: Freq Mult=14 (inharmonic)
   - Modulator: Output=20
   - Carrier: Attack=15, Decay=6, Sustain=15, Release=6
   - Carrier: Freq Mult=1
   - Carrier: Output=0
   - Feedback: 2
   - Connection: FM
3. Preview
4. **Expected:** Bell-like metallic tone with fast decay

#### Test 6: Switch Between Simple and Advanced

1. Advanced view
2. Change Frequency Multiplier (Carrier) to 5
3. Switch to Simple view
4. **Expected:** Change persists (not visible in Simple)
5. Switch back to Advanced
6. **Expected:** Still shows 5
7. Preview → sounds different (5× frequency)

#### Test 7: Save from Advanced

1. Create custom patch in Advanced view
2. Change many parameters
3. Click Save
4. Modal closes
5. Play pattern
6. **Expected:** All advanced changes applied

#### Test 8: Advanced Edit of Preset

1. Open editor
2. Advanced view
3. Select "Synth Bass" preset
4. Note all its parameters
5. Change Modulator waveform to Square
6. Save
7. **Expected:** Track uses modified bass (with square wave)

#### Test 9: Extreme Values

1. Set all parameters to minimum
2. Preview
3. Set all parameters to maximum
4. Preview
5. **Expected:** No crashes, sounds produce audio (even if weird)

#### Test 10: All Checkboxes

1. Enable all 4 flags on Modulator
2. Enable all 4 flags on Carrier
3. Preview
4. Disable all 8 flags
5. Preview
6. **Expected:** Noticeable differences

---

### Success Criteria - Milestone 11

- [ ] Advanced view shows all 24+ parameters
- [ ] Modulator section complete (12 params)
- [ ] Carrier section complete (12 params)
- [ ] Channel parameters visible
- [ ] All sliders work correctly
- [ ] All dropdowns work correctly
- [ ] All checkboxes work correctly
- [ ] Frequency multiplier changes pitch
- [ ] Key scale affects volume by pitch
- [ ] Boolean flags affect sound correctly
- [ ] Preview reflects all changes
- [ ] Save applies all advanced parameters
- [ ] Can switch between Simple/Advanced freely
- [ ] Changes persist when switching views
- [ ] Can create complex custom patches
- [ ] No console errors

---

## Combined Testing Checklist

### Milestones 9-11 Integration Test

1. **Complete Simple view test:**
   - [ ] All 10 parameters visible
   - [ ] Preset selection works
   - [ ] ADSR sliders work (8 total)
   - [ ] Volume sliders work (2 total)
   - [ ] Feedback slider works
   - [ ] Waveform dropdowns work (2 total)
   - [ ] Connection toggle works
   - [ ] Preview works
   - [ ] Save works

2. **View toggle test:**
   - [ ] Can switch to Advanced
   - [ ] Can switch back to Simple
   - [ ] Changes persist across views
   - [ ] Preview works in both views
   - [ ] Save works from both views

3. **Advanced view test:**
   - [ ] All 24+ parameters visible
   - [ ] Organized into logical groups
   - [ ] All controls functional
   - [ ] Frequency multipliers work
   - [ ] Key scaling works
   - [ ] Boolean flags work

4. **Full workflow test:**
   - [ ] Start in Simple, edit ADSR
   - [ ] Switch to Advanced, edit frequency
   - [ ] Switch back to Simple
   - [ ] Preview (hear both changes)
   - [ ] Save
   - [ ] Play pattern (uses all changes)

---

## Troubleshooting

### Problem: Advanced view too tall/scrolling issues

**Solution:**
1. Check `.editor-body { overflow-y: auto }`
2. Reduce parameter spacing
3. Use collapsible groups (future enhancement)

### Problem: Too many parameters overwhelming

**Solution:**
1. Keep Simple view as default
2. Add help tooltips (future)
3. Good visual organization helps

### Problem: Changes not applying

**Solution:**
1. Verify `onChange` handlers in OperatorParams
2. Check spread operators: `...editedPatch`
3. Console.log the patch before save

### Problem: Performance issues with many sliders

**Solution:**
1. Debounce onChange handlers (if needed)
2. Use `useMemo` for derived values
3. Currently should be fine with 24 params

---

## Next Steps

Once Milestones 9-11 pass:

1. ✅ Mark Milestones 9-11 complete in MILESTONES.md
2. Test thoroughly: create 10 different custom patches
3. Commit:
   ```bash
   git add .
   git commit -m "Milestones 9-11: Complete Simple + Advanced editor"
   ```
4. Move to Milestones 12-13: Persistence and polish

---

## Files Changed Summary

**Modified Files:**
- `src/components/InstrumentEditor.tsx` - Add 6 params to Simple, tabs, full Advanced view
- `src/components/InstrumentEditor.css` - Styles for all new controls

**Lines Changed:** ~600 lines added, ~20 lines modified

---

## Time Tracking

| Task | Estimated | Actual |
|------|-----------|--------|
| Milestone 9: Volume & Feedback params | 2-3 hours | ___ |
| Milestone 10: Simple/Advanced toggle | 2-3 hours | ___ |
| Milestone 11: Full Advanced view | 6-8 hours | ___ |
| **TOTAL** | **10-14 hours** | ___ |

---

## Notes

- Simple view: 10 most important parameters
- Advanced view: All 24+ parameters
- OperatorParams component reused for both operators
- Frequency multiplier most powerful advanced feature
- Boolean flags subtle but important for some sounds
- Total implementation: ~250 lines for Simple, ~400 for Advanced
