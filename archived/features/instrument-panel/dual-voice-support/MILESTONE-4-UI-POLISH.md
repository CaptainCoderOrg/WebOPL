# Milestone 4: UI & Polish

**Status**: Ready to implement (after Milestone 3)
**Effort**: 3-4 hours
**Risk**: Low
**Dependencies**: Milestone 1 + Milestone 2 + Milestone 3 complete

## Objective

Add user-facing controls for dual-voice enable/disable, display channel usage stats, improve instrument inspection UI, and polish the dual-voice feature for production.

## Success Criteria

- ✅ InstrumentEditor has "Enable Dual-Voice" toggle
- ✅ Channel usage stats displayed in InstrumentTester
- ✅ Users can manually enable/disable dual-voice per preset
- ✅ Voice 1 and Voice 2 viewable in InstrumentEditor
- ✅ UI clearly indicates when dual-voice is active
- ✅ Performance is smooth (no UI lag)
- ✅ Documentation updated

---

## Task 4.1: Add Dual-Voice Toggle to InstrumentEditor (60 minutes)

**File**: `minimal-prototype/src/components/InstrumentEditor.tsx`

### Current State

InstrumentEditor allows editing modulator/carrier parameters, but only shows Voice 1.

### Changes

#### 1. Add Dual-Voice Toggle Control

Add checkbox near top of editor:

```typescript
export function InstrumentEditor({ patch, onChange }: InstrumentEditorProps) {
  const [localPatch, setLocalPatch] = useState<OPLPatch>(patch);

  // Handler for dual-voice toggle
  const handleDualVoiceToggle = (enabled: boolean) => {
    const updated = { ...localPatch, dualVoiceEnabled: enabled };
    setLocalPatch(updated);
    onChange(updated);
  };

  return (
    <div className="instrument-editor">
      <h3>{patch.name}</h3>

      {/* Dual-Voice Toggle */}
      <div className="dual-voice-control">
        <label>
          <input
            type="checkbox"
            checked={localPatch.dualVoiceEnabled ?? false}
            onChange={(e) => handleDualVoiceToggle(e.target.checked)}
          />
          Enable Dual-Voice (2 channels)
        </label>
        {localPatch.dualVoiceEnabled && (
          <span className="status-badge">DUAL-VOICE ACTIVE</span>
        )}
      </div>

      {/* Existing operator controls */}
      {/* ... */}
    </div>
  );
}
```

#### 2. Add CSS for Status Badge

**File**: `minimal-prototype/src/components/InstrumentEditor.css`

```css
.dual-voice-control {
  margin: 10px 0;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f9f9f9;
}

.dual-voice-control label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.status-badge {
  margin-left: 10px;
  padding: 2px 8px;
  background: #4CAF50;
  color: white;
  border-radius: 3px;
  font-size: 0.8em;
  font-weight: bold;
}
```

### Testing

```bash
npm run dev
```

1. Open InstrumentEditor for "Acoustic Grand Piano"
2. Toggle "Enable Dual-Voice" checkbox
3. **Expected**: Badge appears when enabled
4. **Expected**: onChange is called with updated patch

### Verification

- [ ] Checkbox toggles dual-voice correctly
- [ ] Status badge appears when dual-voice is enabled
- [ ] onChange fires with updated patch

---

## Task 4.2: Add Voice 1 / Voice 2 Tabs (90 minutes)

**Objective**: Allow users to view and compare Voice 1 and Voice 2 parameters.

### Implementation

Add tab switcher to InstrumentEditor:

```typescript
export function InstrumentEditor({ patch, onChange }: InstrumentEditorProps) {
  const [activeVoice, setActiveVoice] = useState<'voice1' | 'voice2'>('voice1');

  const currentVoice = activeVoice === 'voice1' ? patch.voice1 : patch.voice2;

  if (!currentVoice) {
    return <div>No voice data available</div>;
  }

  return (
    <div className="instrument-editor">
      <h3>{patch.name}</h3>

      {/* Dual-Voice Toggle (from Task 4.1) */}
      {/* ... */}

      {/* Voice Tabs */}
      {patch.voice1 && patch.voice2 && (
        <div className="voice-tabs">
          <button
            className={activeVoice === 'voice1' ? 'active' : ''}
            onClick={() => setActiveVoice('voice1')}
          >
            Voice 1
          </button>
          <button
            className={activeVoice === 'voice2' ? 'active' : ''}
            onClick={() => setActiveVoice('voice2')}
          >
            Voice 2
          </button>
        </div>
      )}

      {/* Display current voice parameters */}
      <div className="voice-parameters">
        <h4>{activeVoice === 'voice1' ? 'Voice 1' : 'Voice 2'} Parameters</h4>

        {/* Modulator Section */}
        <div className="operator-section">
          <h5>Modulator</h5>
          <OperatorControls
            operator={currentVoice.modulator}
            onChange={(updated) => handleOperatorChange('modulator', updated)}
          />
        </div>

        {/* Carrier Section */}
        <div className="operator-section">
          <h5>Carrier</h5>
          <OperatorControls
            operator={currentVoice.carrier}
            onChange={(updated) => handleOperatorChange('carrier', updated)}
          />
        </div>

        {/* Feedback & Connection */}
        <div className="voice-controls">
          <label>
            Feedback (0-7):
            <input
              type="range"
              min="0"
              max="7"
              value={currentVoice.feedback}
              onChange={(e) => handleFeedbackChange(parseInt(e.target.value))}
            />
            <span>{currentVoice.feedback}</span>
          </label>

          <label>
            Connection:
            <select
              value={currentVoice.connection}
              onChange={(e) => handleConnectionChange(e.target.value as 'fm' | 'additive')}
            >
              <option value="fm">FM</option>
              <option value="additive">Additive</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
```

### Handlers

```typescript
const handleOperatorChange = (
  operatorType: 'modulator' | 'carrier',
  updated: OPLOperator
) => {
  const voiceField = activeVoice; // 'voice1' or 'voice2'
  const voice = patch[voiceField];
  if (!voice) return;

  const updatedVoice = {
    ...voice,
    [operatorType]: updated
  };

  const updatedPatch = {
    ...patch,
    [voiceField]: updatedVoice
  };

  onChange(updatedPatch);
};

const handleFeedbackChange = (feedback: number) => {
  const voiceField = activeVoice;
  const voice = patch[voiceField];
  if (!voice) return;

  const updatedVoice = { ...voice, feedback };
  const updatedPatch = { ...patch, [voiceField]: updatedVoice };

  onChange(updatedPatch);
};

const handleConnectionChange = (connection: 'fm' | 'additive') => {
  const voiceField = activeVoice;
  const voice = patch[voiceField];
  if (!voice) return;

  const updatedVoice = { ...voice, connection };
  const updatedPatch = { ...patch, [voiceField]: updatedVoice };

  onChange(updatedPatch);
};
```

### CSS for Tabs

```css
.voice-tabs {
  display: flex;
  gap: 5px;
  margin: 10px 0;
}

.voice-tabs button {
  padding: 8px 16px;
  border: 1px solid #ccc;
  background: #f0f0f0;
  cursor: pointer;
  border-radius: 4px 4px 0 0;
}

.voice-tabs button.active {
  background: #4CAF50;
  color: white;
  border-bottom: none;
}

.voice-parameters {
  border: 1px solid #ccc;
  padding: 15px;
  border-radius: 0 4px 4px 4px;
}
```

### Testing

1. Open InstrumentEditor for "Acoustic Grand Piano"
2. Click "Voice 2" tab
3. **Expected**: Display switches to Voice 2 parameters
4. **Expected**: Voice 2 has different values than Voice 1

### Verification

- [ ] Voice 1 and Voice 2 tabs switch correctly
- [ ] Parameters update when editing
- [ ] onChange fires with correct voice updates

---

## Task 4.3: Add Channel Usage Stats Display (45 minutes)

**Objective**: Show real-time channel allocation in InstrumentTester.

**File**: `minimal-prototype/src/components/InstrumentTester.tsx`

### Implementation

Add stats display at top of InstrumentTester:

```typescript
import { useState, useEffect } from 'react';
import { useSynth } from '../context/SynthContext';

export function InstrumentTester() {
  const { synth } = useSynth();
  const [channelStats, setChannelStats] = useState<string>('');

  // Poll channel stats every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      if (synth) {
        const stats = synth.getChannelStats();
        setChannelStats(stats);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [synth]);

  return (
    <div className="instrument-tester">
      <h2>Instrument Tester</h2>

      {/* Channel Stats Display */}
      <div className="channel-stats">
        <strong>OPL3 Channels:</strong> {channelStats}
      </div>

      {/* Existing controls */}
      {/* ... */}
    </div>
  );
}
```

### CSS

```css
.channel-stats {
  margin: 10px 0;
  padding: 10px;
  background: #e8f5e9;
  border-left: 4px solid #4CAF50;
  font-family: monospace;
}
```

### Testing

1. Open InstrumentTester
2. Play several notes
3. **Expected**: Stats update in real-time showing channel usage

### Verification

- [ ] Stats display shows "X/9 used, Y free, Z dual-voice notes"
- [ ] Stats update in real-time
- [ ] No performance lag

---

## Task 4.4: Add Dual-Voice Indicator to Instrument List (30 minutes)

**Objective**: Show which instruments have dual-voice enabled in instrument selector.

**File**: `minimal-prototype/src/components/InstrumentSelector.tsx`

### Implementation

Add icon or badge next to dual-voice instruments:

```typescript
export function InstrumentSelector({ patches, onSelect }: InstrumentSelectorProps) {
  return (
    <div className="instrument-selector">
      {patches.map((patch) => (
        <div
          key={patch.id}
          className="instrument-item"
          onClick={() => onSelect(patch)}
        >
          <span className="instrument-name">{patch.name}</span>
          {patch.dualVoiceEnabled && (
            <span className="dual-voice-badge" title="Dual-Voice Enabled">
              2V
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
```

### CSS

```css
.instrument-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
}

.instrument-item:hover {
  background: #f5f5f5;
}

.dual-voice-badge {
  background: #2196F3;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.75em;
  font-weight: bold;
}
```

### Testing

1. Open instrument selector
2. **Expected**: Instruments with dual-voice enabled show "2V" badge

### Verification

- [ ] Badge appears for dual-voice instruments
- [ ] Badge tooltip says "Dual-Voice Enabled"

---

## Task 4.5: Performance Optimization (45 minutes)

### Optimization 1: Reduce Re-renders

**Problem**: InstrumentEditor re-renders on every parameter change

**Solution**: Use `useMemo` and `useCallback`

```typescript
const memoizedVoice1 = useMemo(() => patch.voice1, [patch.voice1]);
const memoizedVoice2 = useMemo(() => patch.voice2, [patch.voice2]);

const handleOperatorChange = useCallback((operatorType, updated) => {
  // ... handler code ...
}, [patch, activeVoice]);
```

### Optimization 2: Debounce onChange

**Problem**: onChange fires on every slider movement (laggy)

**Solution**: Debounce onChange by 100ms

```typescript
import { useMemo } from 'react';
import debounce from 'lodash.debounce'; // or implement your own

const debouncedOnChange = useMemo(
  () => debounce(onChange, 100),
  [onChange]
);

const handleOperatorChange = (operatorType, updated) => {
  // ... update local state immediately ...
  debouncedOnChange(updatedPatch); // Fire onChange after 100ms
};
```

### Optimization 3: Lazy Load Voice 2 Data

**Problem**: Rendering both voices at once is expensive

**Solution**: Only render active voice

Already implemented in Task 4.2 (tab switcher only renders one voice at a time).

### Testing

```bash
npm run dev
```

1. Open InstrumentEditor
2. Rapidly move sliders
3. **Expected**: UI remains responsive (no lag)

### Verification

- [ ] UI is responsive during parameter changes
- [ ] No stuttering or lag
- [ ] Audio playback not affected by UI updates

---

## Task 4.6: Documentation Updates (30 minutes)

### Update README.md

**File**: `minimal-prototype/README.md`

Add section:

```markdown
## Dual-Voice Support

This application supports **dual-voice instruments** from the GENMIDI.op2 format. Dual-voice instruments use 2 OPL3 hardware channels simultaneously for richer, layered sounds.

### Features

- **Automatic dual-voice detection**: Instruments with significantly different Voice 1 and Voice 2 parameters are automatically enabled for dual-voice playback.
- **Manual control**: Use the "Enable Dual-Voice" toggle in the Instrument Editor to manually enable/disable dual-voice for any instrument.
- **Voice stealing**: When all 9 OPL3 channels are in use, the channel manager automatically steals the least recently used channel to make room for new notes.
- **Channel usage stats**: View real-time channel allocation in the Instrument Tester.

### How It Works

1. **Voice 1 + Voice 2**: Each GENMIDI instrument contains two complete voice patches. When dual-voice is enabled, both voices are played simultaneously on separate hardware channels.
2. **Channel Manager**: Dynamically allocates OPL3 hardware channels (0-8) for single-voice (1 channel) and dual-voice (2 channels) instruments.
3. **Backward Compatibility**: Instruments with dual-voice disabled use only Voice 1, maintaining compatibility with single-voice playback.

### UI Controls

- **Instrument Editor**: Toggle "Enable Dual-Voice" checkbox to enable/disable dual-voice per instrument.
- **Voice Tabs**: Switch between Voice 1 and Voice 2 to view and compare parameters.
- **Instrument Selector**: Instruments with dual-voice enabled display a "2V" badge.
- **Channel Stats**: Real-time display of channel usage in Instrument Tester.
```

### Update TypeScript Docs

Add JSDoc comments to key interfaces:

**File**: `minimal-prototype/src/types/OPLPatch.ts`

```typescript
/**
 * Complete OPL3 instrument patch
 * Supports both single-voice (backward compatible) and dual-voice modes
 *
 * **Dual-Voice Mode**:
 * When `dualVoiceEnabled` is true, both `voice1` and `voice2` are played
 * simultaneously on separate OPL3 hardware channels for richer sound.
 *
 * **Single-Voice Mode** (default):
 * Only `voice1` is used (or legacy `modulator`/`carrier` fields).
 */
export interface OPLPatch {
  // ...
}
```

### Verification

- [ ] README updated with dual-voice documentation
- [ ] JSDoc comments added to key interfaces

---

## Task 4.7: End-to-End Polish Testing (45 minutes)

### Test Checklist

#### UI/UX Tests

- [ ] Dual-voice toggle works in InstrumentEditor
- [ ] Voice 1 / Voice 2 tabs switch correctly
- [ ] Channel stats display updates in real-time
- [ ] Dual-voice badge appears in instrument selector
- [ ] UI is responsive (no lag during parameter changes)

#### Audio Tests

- [ ] Dual-voice instruments sound richer than single-voice
- [ ] Voice stealing works seamlessly (no audio glitches)
- [ ] All instruments play correctly in InstrumentTester
- [ ] Sequencer plays dual-voice tracks correctly
- [ ] Polyphony > 9 channels handled gracefully

#### Edge Cases

- [ ] Toggle dual-voice on/off during playback (should work)
- [ ] Play 10+ notes simultaneously (voice stealing)
- [ ] Switch instruments rapidly (no crashes)
- [ ] Edit parameters during playback (no audio glitches)

### Performance Tests

- [ ] App loads in < 2 seconds
- [ ] UI remains responsive during playback
- [ ] No memory leaks (check DevTools Performance tab)
- [ ] CPU usage reasonable (< 50% on modern hardware)

---

## Milestone 4 Success Checklist

- [ ] InstrumentEditor has "Enable Dual-Voice" toggle
- [ ] Voice 1 / Voice 2 tabs implemented
- [ ] Channel usage stats displayed in real-time
- [ ] Dual-voice badge in instrument selector
- [ ] Performance optimizations applied (debouncing, memoization)
- [ ] Documentation updated (README, JSDoc)
- [ ] All UI/UX tests pass
- [ ] All audio tests pass
- [ ] All edge cases handled
- [ ] Performance tests pass

---

## Rollback Plan

If UI changes break functionality:

```bash
# Restore UI components
git checkout HEAD -- src/components/InstrumentEditor.tsx
git checkout HEAD -- src/components/InstrumentTester.tsx
git checkout HEAD -- src/components/InstrumentSelector.tsx

# Rebuild
npm run build
```

---

## Checkpoint: Commit Changes

```
feat(milestone-4): Add dual-voice UI controls and polish

- Add "Enable Dual-Voice" toggle in InstrumentEditor
- Implement Voice 1 / Voice 2 tabs for parameter comparison
- Display real-time channel usage stats in InstrumentTester
- Add dual-voice badge to instrument selector
- Optimize UI performance (debouncing, memoization)
- Update documentation with dual-voice feature guide

Refs: #dual-voice-support Phase 4 (Complete)
```

---

## Final Verification (Milestone 1-4 Complete)

### Comprehensive Test Plan

#### 1. Data Layer (Milestone 1)
- [ ] GENMIDI.json contains both voice1 and voice2 (file size ~150KB)
- [ ] TypeScript interfaces updated (OPLVoice, dual-voice fields)
- [ ] App loads and plays instruments normally

#### 2. Channel Manager (Milestone 2)
- [ ] ChannelManager allocates 1 or 2 channels correctly
- [ ] Voice stealing works (LRU algorithm)
- [ ] Edge cases handled (exhaustion, degradation)

#### 3. Synth Integration (Milestone 3)
- [ ] Dual-voice instruments play on 2 channels
- [ ] Audio quality improved (no "crunchy" sounds)
- [ ] Voice stealing seamless during playback

#### 4. UI & Polish (Milestone 4)
- [ ] All UI controls work correctly
- [ ] Real-time stats display accurate
- [ ] Performance optimized (no lag)
- [ ] Documentation complete

### Audio Quality Verification

Compare before/after audio quality:

**Before (Milestone 0)**: G notes sound clear, other notes sound "crunchy"

**After (Milestone 4)**: ALL notes sound clear and rich (dual-voice active)

---

## Celebration!

If all 4 milestones pass verification, the dual-voice support feature is **COMPLETE**! 🎉

### What We Achieved

- ✅ Parsed and stored both Voice 1 and Voice 2 from GENMIDI.op2
- ✅ Built dynamic channel allocation system with voice stealing
- ✅ Implemented dual-voice playback in SimpleSynth
- ✅ Added user-facing UI controls for dual-voice
- ✅ Fixed audio quality issue (no more "crunchy" sounds)
- ✅ Maintained backward compatibility throughout

### Impact

- **Audio Quality**: 100% improvement (all instruments now sound correct)
- **Polyphony**: Intelligent channel management handles 9 simultaneous notes
- **User Control**: Manual dual-voice enable/disable per instrument
- **Developer Experience**: Comprehensive logging and diagnostics

---

## Future Enhancements (Optional)

1. **Per-track dual-voice toggle**: Enable/disable dual-voice per sequencer track
2. **Voice pan/volume control**: Separate volume/pan for Voice 1 and Voice 2
3. **Custom dual-voice presets**: Save custom dual-voice patches
4. **Visual waveform display**: Show Voice 1 vs Voice 2 waveforms
5. **OPL3 stereo panning**: Use OPL3's stereo output registers for wider sound

---

## Documentation Links

- [PLAN.md](PLAN.md) - Original dual-voice plan
- [MILESTONE-1-DATA-LAYER.md](MILESTONE-1-DATA-LAYER.md) - Data layer implementation
- [MILESTONE-2-CHANNEL-MANAGER.md](MILESTONE-2-CHANNEL-MANAGER.md) - Channel manager implementation
- [MILESTONE-3-SYNTH-INTEGRATION.md](MILESTONE-3-SYNTH-INTEGRATION.md) - Synth integration implementation
- [MILESTONE-4-UI-POLISH.md](MILESTONE-4-UI-POLISH.md) - This document
