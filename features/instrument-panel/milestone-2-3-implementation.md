# Milestones 2-3: Default Patches & Track-to-Channel Mapping

**Goal:** Create 4 quality instrument presets and wire them to tracks

**Time Estimate:** 3-5 hours total

**Status:** Complete (2025-01-03) - ✅ Implemented with `opl3` library

**Library Note:** Successfully implemented with `opl3` (pure JavaScript) after migration from `@malvineous/opl` (WASM). See [OPL3_MIGRATION_UPDATE.md](OPL3_MIGRATION_UPDATE.md) for details.

---

## Milestone 2: Default Patches (1-2 hours)

### Overview

Create 4 distinct-sounding instrument presets that will serve as:
- Fallback if GENMIDI fails to load
- Initial instruments for testing
- Examples of good OPL3 sounds

---

### Step 1: Create defaultPatches.ts (45-60 min)

**File: `src/data/defaultPatches.ts` (NEW)**

```typescript
/**
 * Default OPL3 Instrument Patches
 *
 * Fallback instruments when GENMIDI is unavailable.
 * These are carefully crafted to sound good and demonstrate OPL3 capabilities.
 */

import type { OPLPatch } from '../types/OPLPatch';

/**
 * Patch 0: Acoustic Grand Piano
 * Warm, resonant piano sound with moderate sustain
 */
const acousticPiano: OPLPatch = {
  id: 0,
  name: 'Acoustic Grand Piano',
  category: 'Piano',
  modulator: {
    attackRate: 14,
    decayRate: 4,
    sustainLevel: 6,
    releaseRate: 6,
    frequencyMultiplier: 1,
    waveform: 0, // Sine wave
    outputLevel: 18,
    keyScaleLevel: 0,
    amplitudeModulation: false,
    vibrato: false,
    envelopeType: true, // Sustaining
    keyScaleRate: false,
  },
  carrier: {
    attackRate: 14,
    decayRate: 4,
    sustainLevel: 6,
    releaseRate: 6,
    frequencyMultiplier: 1,
    waveform: 0,
    outputLevel: 0, // Full volume
    keyScaleLevel: 0,
    amplitudeModulation: false,
    vibrato: false,
    envelopeType: true,
    keyScaleRate: false,
  },
  feedback: 1,
  connection: 'fm',
};

/**
 * Patch 1: Synth Bass
 * Deep, punchy bass with quick attack
 */
const synthBass: OPLPatch = {
  id: 1,
  name: 'Synth Bass',
  category: 'Bass',
  modulator: {
    attackRate: 15,
    decayRate: 6,
    sustainLevel: 3,
    releaseRate: 4,
    frequencyMultiplier: 1,
    waveform: 0,
    outputLevel: 8,
    keyScaleLevel: 0,
    amplitudeModulation: false,
    vibrato: false,
    envelopeType: true,
    keyScaleRate: false,
  },
  carrier: {
    attackRate: 15,
    decayRate: 6,
    sustainLevel: 3,
    releaseRate: 4,
    frequencyMultiplier: 1,
    waveform: 1, // Half-sine for warmth
    outputLevel: 0,
    keyScaleLevel: 0,
    amplitudeModulation: false,
    vibrato: false,
    envelopeType: true,
    keyScaleRate: false,
  },
  feedback: 2,
  connection: 'fm',
};

/**
 * Patch 2: Square Lead
 * Bright, cutting lead sound
 */
const squareLead: OPLPatch = {
  id: 2,
  name: 'Square Lead',
  category: 'Lead',
  modulator: {
    attackRate: 15,
    decayRate: 2,
    sustainLevel: 4,
    releaseRate: 5,
    frequencyMultiplier: 1,
    waveform: 2, // Abs-sine
    outputLevel: 12,
    keyScaleLevel: 0,
    amplitudeModulation: false,
    vibrato: false,
    envelopeType: true,
    keyScaleRate: false,
  },
  carrier: {
    attackRate: 15,
    decayRate: 2,
    sustainLevel: 4,
    releaseRate: 5,
    frequencyMultiplier: 1,
    waveform: 2, // Abs-sine for square-like timbre
    outputLevel: 0,
    keyScaleLevel: 0,
    amplitudeModulation: false,
    vibrato: false,
    envelopeType: true,
    keyScaleRate: false,
  },
  feedback: 4,
  connection: 'additive', // Additive for richer sound
};

/**
 * Patch 3: Warm Pad
 * Lush, evolving pad sound
 */
const warmPad: OPLPatch = {
  id: 3,
  name: 'Warm Pad',
  category: 'Pad',
  modulator: {
    attackRate: 8, // Slow attack
    decayRate: 3,
    sustainLevel: 2,
    releaseRate: 4,
    frequencyMultiplier: 1,
    waveform: 0,
    outputLevel: 20,
    keyScaleLevel: 0,
    amplitudeModulation: false,
    vibrato: true, // Add vibrato for movement
    envelopeType: true,
    keyScaleRate: false,
  },
  carrier: {
    attackRate: 8,
    decayRate: 3,
    sustainLevel: 2,
    releaseRate: 4,
    frequencyMultiplier: 2, // One octave higher
    waveform: 0,
    outputLevel: 0,
    keyScaleLevel: 0,
    amplitudeModulation: false,
    vibrato: true,
    envelopeType: true,
    keyScaleRate: false,
  },
  feedback: 2,
  connection: 'fm',
};

/**
 * Default instrument bank
 * Export as array for easy iteration
 */
export const defaultPatches: OPLPatch[] = [
  acousticPiano,
  synthBass,
  squareLead,
  warmPad,
];

/**
 * Get patch by ID
 */
export function getDefaultPatch(id: number): OPLPatch | null {
  return defaultPatches.find(p => p.id === id) || null;
}

/**
 * Get patch by name
 */
export function getDefaultPatchByName(name: string): OPLPatch | null {
  return defaultPatches.find(p => p.name === name) || null;
}
```

---

### Step 2: Delete testPatches.ts

```bash
rm src/testPatches.ts
```

This was temporary for Milestone 1.

---

### Step 3: Manual Testing (15-30 min)

**Open browser console:**

```javascript
// Import default patches
import { defaultPatches } from './data/defaultPatches';

// Load all 4 patches to channels 0-3
defaultPatches.forEach((patch, i) => {
  window.synth.loadPatch(i, patch);
});

// Test Piano (channel 0)
window.synth.noteOn(0, 60);
setTimeout(() => window.synth.noteOff(0, 60), 1000);

// Test Bass (channel 1)
window.synth.noteOn(1, 48); // Lower note for bass
setTimeout(() => window.synth.noteOff(1, 48), 1000);

// Test Lead (channel 2)
window.synth.noteOn(2, 72); // Higher note for lead
setTimeout(() => window.synth.noteOff(2, 72), 1000);

// Test Pad (channel 3)
window.synth.noteOn(3, 60);
setTimeout(() => window.synth.noteOff(3, 60), 2000); // Longer for pad
```

**Expected Results:**
- Piano: Clear, percussive attack, moderate sustain
- Bass: Deep, punchy, quick attack
- Lead: Bright, cutting, sustained
- Pad: Slow attack, evolving, ethereal

---

### Success Criteria - Milestone 2

- [x] 4 patches created with distinct sounds
- [x] Piano sounds musical (not harsh)
- [x] Bass sounds deep and punchy
- [x] Lead sounds bright and cutting
- [x] Pad has slow attack and sustain
- [x] Each patch loads without errors
- [x] No audio glitches

---

## Milestone 3: Track-to-Channel Mapping (2-3 hours)

### Overview

Wire the tracker so each track automatically uses a different instrument:
- Track 0 → Channel 0 → Piano
- Track 1 → Channel 1 → Bass
- Track 2 → Channel 2 → Lead
- Track 3 → Channel 3 → Pad

---

### Step 1: Update SimpleSynth init() to use default patches (15 min)

**File: `src/SimpleSynth.ts` (MODIFY)**

**Add import at top:**

```typescript
import { defaultPatches } from './data/defaultPatches';
```

**In `init()` method, after the waveform enable line, add:**

```typescript
// Load default instruments to all channels
console.log('[SimpleSynth] Loading default instruments...');
for (let ch = 0; ch < 4; ch++) {
  const patch = defaultPatches[ch];
  this.loadPatch(ch, patch);
  console.log(`[SimpleSynth] Channel ${ch}: ${patch.name}`);
}

// Channels 4-8 get piano as default (for future use)
for (let ch = 4; ch < 9; ch++) {
  this.loadPatch(ch, defaultPatches[0]);
}

console.log('[SimpleSynth] All channels initialized with default patches');
```

---

### Step 2: Test automatic loading (10 min)

**Start dev server and check console:**

Expected logs:
```
[SimpleSynth] Loading default instruments...
[SimpleSynth] Loading patch "Acoustic Grand Piano" to channel 0
[SimpleSynth] Patch loaded successfully to channel 0
[SimpleSynth] Channel 0: Acoustic Grand Piano
[SimpleSynth] Loading patch "Synth Bass" to channel 1
...
[SimpleSynth] All channels initialized with default patches
```

**Test in browser console:**

```javascript
// Should already be loaded, just play
window.synth.noteOn(0, 60); // Piano
window.synth.noteOn(1, 48); // Bass
window.synth.noteOn(2, 72); // Lead
window.synth.noteOn(3, 60); // Pad

// Stop all
window.synth.noteOff(0, 60);
window.synth.noteOff(1, 48);
window.synth.noteOff(2, 72);
window.synth.noteOff(3, 60);
```

---

### Step 3: Test with tracker (30 min)

**Create test pattern:**

1. Click "Load Example" button
2. Play pattern
3. Listen to each track:
   - Track 0 should sound like Piano
   - Track 1 should sound like Bass
   - Track 2 should sound like Lead
   - Track 3 should sound like Pad (if used)

**Expected behavior:**
- Each track has distinct sound
- No more uniform sound across all tracks
- Bass notes sound deeper
- Lead notes sound brighter

---

### Step 4: Create helper to show current patches (15 min)

**File: `src/SimpleSynth.ts` (MODIFY)**

**Add public method:**

```typescript
/**
 * Get all loaded patches (for debugging/UI)
 * @returns Array of [channelId, patchName] tuples
 */
public getAllPatches(): Array<[number, string]> {
  const result: Array<[number, string]> = [];
  for (let ch = 0; ch < 9; ch++) {
    const patch = this.channelPatches.get(ch);
    if (patch) {
      result.push([ch, patch.name]);
    }
  }
  return result;
}
```

**Test in console:**

```javascript
console.table(window.synth.getAllPatches());
```

Should show:
```
┌─────────┬───┬────────────────────────────┐
│ (index) │ 0 │             1              │
├─────────┼───┼────────────────────────────┤
│    0    │ 0 │ 'Acoustic Grand Piano'     │
│    1    │ 1 │ 'Synth Bass'               │
│    2    │ 2 │ 'Square Lead'              │
│    3    │ 3 │ 'Warm Pad'                 │
│    4    │ 4 │ 'Acoustic Grand Piano'     │
...
```

---

### Step 5: Add visual indicator to console (10 min)

**File: `src/App.tsx` (MODIFY)**

**In the `init()` function, after synth initialization, add:**

```typescript
// Log loaded instruments
if (import.meta.env.DEV) {
  console.log('%c=== Loaded Instruments ===', 'color: #00ff00; font-weight: bold');
  s.getAllPatches().slice(0, 4).forEach(([ch, name]) => {
    console.log(`%cTrack ${ch}: ${name}`, 'color: #ffaa00');
  });
}
```

---

### Step 6: Comprehensive testing (30-45 min)

#### Test 1: Different notes per track

**Create pattern manually:**
```
Row  | Track 0 | Track 1 | Track 2 | Track 3
-----|---------|---------|---------|--------
00   | C-4     | C-3     | C-5     | C-4
04   | D-4     | D-3     | D-5     | D-4
08   | E-4     | E-3     | E-5     | E-4
12   | F-4     | F-3     | F-5     | F-4
```

**Play and verify:**
- Track 0 (Piano): Clear, mid-range
- Track 1 (Bass): Deep, low frequency
- Track 2 (Lead): Bright, high frequency
- Track 3 (Pad): Soft, evolving

#### Test 2: Simultaneous notes

**Row 0: All tracks play C at different octaves**
```
00 | C-4 | C-3 | C-5 | C-4
```

**Play and verify:**
- Hear 4 distinct timbres
- No audio glitches
- All notes audible

#### Test 3: Pattern persistence

1. Create pattern with all 4 tracks
2. Play
3. Stop
4. Reload page
5. Play again
6. Verify sounds still different

---

### Success Criteria - Milestone 3

- [x] SimpleSynth auto-loads patches on init
- [x] Console shows "Loading patch..." messages
- [x] Track 0 always sounds like Piano
- [x] Track 1 always sounds like Bass
- [x] Track 2 always sounds like Lead
- [x] Track 3 always sounds like Pad
- [x] `getAllPatches()` returns correct assignments
- [x] No errors in console
- [x] Sounds persist across patterns
- [x] Multiple simultaneous notes work

---

## Combined Testing Checklist

### Milestone 2 + 3 Integration Test

1. **Clean state test:**
   ```bash
   # Clear browser cache/storage
   # Reload page
   ```

2. **Verify auto-load:**
   - [x] Check console logs
   - [x] See "Loading patch..." for channels 0-3
   - [x] No errors

3. **Console API test:**
   ```javascript
   window.synth.getAllPatches();
   // Should show 4 different patches
   ```
   - [x] Verified - all 9 channels show correct patches

4. **Tracker test:**
   - [x] Load Example pattern
   - [x] Play
   - [x] Hear piano on melody line
   - [x] Hear bass on bass line
   - [x] Distinct timbres

5. **Manual pattern test:**
   - [x] Enter C-4 in row 0 of all tracks
   - [x] Play
   - [x] Hear 4 different sounds simultaneously

---

## Troubleshooting

### Problem: All tracks sound the same

**Solution:**
1. Check console logs - patches loading?
2. Check `window.synth.getAllPatches()` - all unique?
3. Clear browser cache and reload
4. Verify defaultPatches.ts exported correctly

### Problem: No sound on some tracks

**Solution:**
1. Check which channels are silent
2. Verify patch loaded: `window.synth.getChannelPatch(X)`
3. Test channel directly: `window.synth.noteOn(X, 60)`
4. Check output levels in patch definition

### Problem: Patches sound harsh/bad

**Solution:**
1. Adjust ADSR values in defaultPatches.ts
2. Try different waveforms
3. Lower modulator output level (increase number)
4. Reduce feedback amount

---

## Tuning Tips

### Making better patches:

**Piano:**
- Quick attack (14-15)
- Moderate decay (4-6)
- Low modulator output (16-24)
- Sine waves

**Bass:**
- Instant attack (15)
- Half-sine waveform on carrier
- Low feedback (1-2)
- Moderate sustain (3-5)

**Lead:**
- Instant attack (15)
- Higher feedback (3-5)
- Abs-sine or square waveforms
- Higher sustain (2-4)

**Pad:**
- Slow attack (6-10)
- High sustain (1-3)
- Sine waves
- Vibrato enabled
- Light feedback (2-3)

---

## Next Steps

Once both milestones pass:

1. ✅ Mark Milestones 2 & 3 complete in MILESTONES.md
2. Note any patch tweaks needed
3. Commit:
   ```bash
   git add .
   git commit -m "Milestones 2-3: Default patches and track mapping"
   ```
4. Move to Milestone 4: Instrument Selector UI

---

## Files Changed Summary

**New Files:**
- `src/data/defaultPatches.ts` - 4 quality instrument presets

**Modified Files:**
- `src/SimpleSynth.ts` - Auto-load patches, add getAllPatches()
- `src/App.tsx` - Log loaded instruments in console

**Deleted Files:**
- `src/testPatches.ts` - No longer needed

**Lines Changed:** ~150 lines added, ~50 lines removed

---

## Time Tracking

| Task | Estimated | Actual |
|------|-----------|--------|
| Milestone 2: Create patches | 1-2 hours | ~45 min |
| Milestone 3: Wire to tracks | 2-3 hours | ~45 min |
| **TOTAL** | **3-5 hours** | **~1.5 hours** |

**Note:** Implementation was faster than estimated because the patch loading infrastructure from Milestone 1 was already in place and working well.

---

## Notes

- defaultPatches serves dual purpose: fallback + initial state
- Patches can be tweaked later based on feedback
- Currently hardcoded 1:1 track→patch mapping
- Milestone 4 will make this user-configurable
