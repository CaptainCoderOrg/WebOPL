# Milestone 1: Type Definitions & Manual Patch Loading

**Goal:** Create types and prove we can load different sounds per channel

**Time Estimate:** 2-3 hours

**Status:** Complete

---

## Overview

Create the foundation for instrument management by:
1. Defining TypeScript interfaces for OPL patches
2. Adding patch loading capability to SimpleSynth
3. Testing manually via browser console

This milestone is complete when we can load different sounds to different channels and hear the difference.

---

## Step 1: Create Type Definitions (30 min)

### File: `src/types/OPLPatch.ts` (NEW)

**Create the file:**

```typescript
/**
 * OPL3 Patch Type Definitions
 *
 * Defines the structure for OPL3 instrument patches.
 * Each patch consists of 2 operators (Modulator + Carrier) in 2-operator FM synthesis mode.
 */

/**
 * Single OPL3 operator configuration
 */
export interface OPLOperator {
  // ADSR Envelope (0-15 for all)
  attackRate: number;          // 0=slowest, 15=fastest attack
  decayRate: number;           // 0=slowest, 15=fastest decay
  sustainLevel: number;        // 0=loudest sustain, 15=softest
  releaseRate: number;         // 0=slowest, 15=fastest release

  // Frequency & Timbre
  frequencyMultiplier: number; // 0-15: 0=×0.5, 1=×1, 2=×2, etc.
  waveform: number;            // 0-7: 0=sine, 1=half-sine, 2=abs-sine, 3=quarter-sine

  // Volume & Modulation
  outputLevel: number;         // 0-63: 0=loudest, 63=silent
  keyScaleLevel: number;       // 0-3: Volume scaling with pitch

  // Flags (boolean modulation options)
  amplitudeModulation: boolean; // Tremolo effect on/off
  vibrato: boolean;             // Pitch vibrato on/off
  envelopeType: boolean;        // true=sustaining, false=percussive
  keyScaleRate: boolean;        // Scale envelope speed with pitch
}

/**
 * Complete OPL3 instrument patch (2-operator FM synthesis)
 */
export interface OPLPatch {
  id: number;                   // Instrument ID (0-127 for GM compatibility)
  name: string;                 // Display name (e.g., "Acoustic Grand Piano")
  category?: string;            // Optional category (e.g., "Piano", "Bass", "Lead")

  // Operators (FM synthesis: modulator modulates carrier)
  modulator: OPLOperator;       // Operator 1: Modulates the carrier
  carrier: OPLOperator;         // Operator 2: Produces final sound

  // Channel configuration
  feedback: number;             // 0-7: Modulator self-modulation depth
  connection: 'fm' | 'additive'; // FM (mod→car) vs Additive (mod+car mixed)

  // Metadata (for user customization tracking)
  isCustom?: boolean;           // True if user-edited
  basePresetId?: number;        // If custom, which preset it was based on
}

/**
 * Instrument bank (collection of patches)
 */
export interface InstrumentBank {
  name: string;                 // Bank name (e.g., "GENMIDI", "Custom")
  version: string;              // Version string
  patches: OPLPatch[];          // Array of instruments (typically 128 for GM)
}
```

**Verification:**
- Run `npm run dev` to check TypeScript compilation
- No errors should appear

---

## Step 2: Add Patch Management to SimpleSynth (60-90 min)

### File: `src/SimpleSynth.ts` (MODIFY)

### 2A: Add imports and properties

**At the top, add import:**

```typescript
import type { OPLPatch, OPLOperator } from './types/OPLPatch';
```

**Add these private properties after existing properties:**

```typescript
// After line ~19 (after activeChannels declaration)
private channelPatches: Map<number, OPLPatch> = new Map();
```

---

### 2B: Add operator offset getter

**Add this method after `getOperatorOffsets()` method (around line 90):**

```typescript
/**
 * Get operator offsets for a channel
 * OPL3 has an irregular operator layout that doesn't follow a linear pattern
 *
 * @param channelId Channel number (0-8)
 * @returns [modulatorOffset, carrierOffset]
 */
private getOperatorOffsets(channelId: number): [number, number] {
  // Operator offsets for each channel
  const operatorMap: [number, number][] = [
    [0x00, 0x03], // Channel 0
    [0x01, 0x04], // Channel 1
    [0x02, 0x05], // Channel 2
    [0x08, 0x0B], // Channel 3
    [0x09, 0x0C], // Channel 4
    [0x0A, 0x0D], // Channel 5
    [0x10, 0x13], // Channel 6
    [0x11, 0x14], // Channel 7
    [0x12, 0x15], // Channel 8
  ];

  return operatorMap[channelId];
}
```

---

### 2C: Add operator register writer

**Add this method after `getOperatorOffsets()`:**

```typescript
/**
 * Write all registers for a single operator
 *
 * @param operatorOffset Operator offset (0x00-0x15)
 * @param operator Operator configuration
 */
private writeOperatorRegisters(operatorOffset: number, operator: OPLOperator): void {
  // Register 0x20: AM/VIB/EG/KSR/MULT
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
```

---

### 2D: Add public loadPatch method

**Add this public method after `writeOperatorRegisters()`:**

```typescript
/**
 * Load an instrument patch to a specific channel
 * Reprograms all OPL3 registers for the channel's operators
 *
 * @param channelId Channel number (0-8)
 * @param patch OPL patch to load
 */
public loadPatch(channelId: number, patch: OPLPatch): void {
  if (channelId < 0 || channelId >= 9) {
    throw new Error(`Invalid channel: ${channelId}. Must be 0-8.`);
  }

  console.log(`[SimpleSynth] Loading patch "${patch.name}" to channel ${channelId}`);

  // Store patch for this channel
  this.channelPatches.set(channelId, patch);

  // Get operator offsets for this channel
  const [modOffset, carOffset] = this.getOperatorOffsets(channelId);

  // Program modulator operator
  this.writeOperatorRegisters(modOffset, patch.modulator);

  // Program carrier operator
  this.writeOperatorRegisters(carOffset, patch.carrier);

  // Program channel configuration (feedback and connection)
  const regC0 =
    (patch.feedback << 1) |
    (patch.connection === 'fm' ? 1 : 0);
  this.opl.write(0xC0 + channelId, regC0);

  console.log(`[SimpleSynth] Patch loaded successfully to channel ${channelId}`);
}

/**
 * Get the currently loaded patch for a channel
 *
 * @param channelId Channel number (0-8)
 * @returns Current patch or null if none set
 */
public getChannelPatch(channelId: number): OPLPatch | null {
  return this.channelPatches.get(channelId) || null;
}
```

---

### 2E: Remove old setupDefaultInstrument method

**Find and REMOVE the entire `setupDefaultInstrument()` method (around lines 100-134)**

This method is no longer needed since we'll use `loadPatch()` instead.

---

### 2F: Update init() method

**Find the `init()` method and REMOVE these lines (around lines 70-74):**

```typescript
// Setup default instrument for all channels
for (let ch = 0; ch < 9; ch++) {
  this.setupDefaultInstrument(ch);
}
```

**Replace with:**

```typescript
// Enable waveform selection (required for custom waveforms)
this.opl.write(0x01, 0x20);

console.log('[SimpleSynth] Initialized OPL3 synthesizer with 9 channels');
console.log('[SimpleSynth] Ready for patch loading');
```

---

### 2G: Expose synth globally for testing

**File: `src/App.tsx` (MODIFY)**

**In the `init()` function, after `setSynth(s);` add:**

```typescript
// Expose synth globally for console testing (development only)
if (import.meta.env.DEV) {
  (window as any).synth = s;
  console.log('[App] Synth exposed as window.synth for testing');
}
```

---

## Step 3: Create Test Patch (15 min)

### Create a test file for manual testing

**File: `src/testPatches.ts` (NEW, temporary)**

```typescript
/**
 * Test patches for manual console testing
 * TEMPORARY FILE - Will be replaced by defaultPatches.ts in Milestone 2
 */

import type { OPLPatch } from './types/OPLPatch';

/**
 * Basic piano sound (similar to current default)
 */
export const testPiano: OPLPatch = {
  id: 0,
  name: 'Test Piano',
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
};

/**
 * Bright organ sound
 */
export const testOrgan: OPLPatch = {
  id: 1,
  name: 'Test Organ',
  category: 'Organ',
  modulator: {
    attackRate: 15,
    decayRate: 0,
    sustainLevel: 0,
    releaseRate: 5,
    frequencyMultiplier: 1,
    waveform: 0,
    outputLevel: 0, // Full modulation
    keyScaleLevel: 0,
    amplitudeModulation: false,
    vibrato: false,
    envelopeType: true,
    keyScaleRate: false,
  },
  carrier: {
    attackRate: 15,
    decayRate: 0,
    sustainLevel: 0,
    releaseRate: 5,
    frequencyMultiplier: 2, // One octave higher
    waveform: 0,
    outputLevel: 0,
    keyScaleLevel: 0,
    amplitudeModulation: false,
    vibrato: false,
    envelopeType: true,
    keyScaleRate: false,
  },
  feedback: 3,
  connection: 'fm',
};

/**
 * Bell sound
 */
export const testBell: OPLPatch = {
  id: 2,
  name: 'Test Bell',
  category: 'Percussion',
  modulator: {
    attackRate: 15,
    decayRate: 10,
    sustainLevel: 15,
    releaseRate: 5,
    frequencyMultiplier: 3,
    waveform: 1, // half-sine
    outputLevel: 10,
    keyScaleLevel: 0,
    amplitudeModulation: false,
    vibrato: false,
    envelopeType: false, // Percussive
    keyScaleRate: false,
  },
  carrier: {
    attackRate: 15,
    decayRate: 10,
    sustainLevel: 15,
    releaseRate: 5,
    frequencyMultiplier: 1,
    waveform: 0,
    outputLevel: 0,
    keyScaleLevel: 0,
    amplitudeModulation: false,
    vibrato: false,
    envelopeType: false,
    keyScaleRate: false,
  },
  feedback: 5,
  connection: 'fm',
};
```

---

## Step 4: Manual Testing (30 min)

### 4A: Start the dev server

```bash
cd minimal-prototype
npm run dev
```

### 4B: Open browser console (F12)

### 4C: Test 1 - Verify synth is exposed

```javascript
console.log(window.synth);
// Should show SimpleSynth object
```

### 4D: Test 2 - Load test patches manually

```javascript
// Import test patches (copy from testPatches.ts)
const testPiano = { /* copy testPiano from above */ };
const testOrgan = { /* copy testOrgan from above */ };
const testBell = { /* copy testBell from above */ };

// Load piano to channel 0
window.synth.loadPatch(0, testPiano);

// Load organ to channel 1
window.synth.loadPatch(1, testOrgan);

// Load bell to channel 2
window.synth.loadPatch(2, testBell);
```

### 4E: Test 3 - Play notes on each channel

```javascript
// Play middle C on channel 0 (piano)
window.synth.noteOn(0, 60);
// Wait 1 second, then:
window.synth.noteOff(0, 60);

// Play C on channel 1 (organ)
window.synth.noteOn(1, 60);
// Wait 1 second, then:
window.synth.noteOff(1, 60);

// Play C on channel 2 (bell)
window.synth.noteOn(2, 60);
// Wait 2 seconds (bell has longer decay), then:
window.synth.noteOff(2, 60);
```

### 4F: Test 4 - Verify sounds are different

Expected results:
- Piano: Smooth, sustained tone
- Organ: Brighter, more immediate sound
- Bell: Metallic, decaying sound

### 4G: Test 5 - Reload patch and verify change

```javascript
// Load organ to channel 0 (replace piano)
window.synth.loadPatch(0, testOrgan);

// Play note - should now sound like organ
window.synth.noteOn(0, 60);
// Wait, then:
window.synth.noteOff(0, 60);
```

---

## Success Criteria Checklist

- [x] TypeScript compiles without errors
- [x] `window.synth` is accessible in browser console
- [x] `loadPatch()` method can be called without errors
- [x] Channel 0 with `testPiano` sounds like piano
- [x] Channel 1 with `testOrgan` sounds different (brighter)
- [x] Channel 2 with `testBell` sounds different (bell-like)
- [x] Reloading a patch changes the sound
- [x] Console logs show patch loading messages
- [x] No audio glitches or crashes

---

## Troubleshooting

### Problem: TypeScript errors about OPLPatch type

**Solution:** Make sure import path is correct:
```typescript
import type { OPLPatch } from './types/OPLPatch';
```

### Problem: "synth is not defined" in console

**Solution:** Check that App.tsx has the global exposure code in DEV mode

### Problem: No sound when calling noteOn()

**Solution:**
1. Check console for errors
2. Verify patch was loaded: `window.synth.getChannelPatch(0)`
3. Try loading testPiano again
4. Check audio context state: Click on page first to resume audio

### Problem: All sounds identical

**Solution:**
1. Verify different patches loaded to different channels
2. Check console logs for "Loading patch..." messages
3. Try more extreme differences (testBell should be very different)

---

## Next Steps

Once all success criteria pass:
1. ✅ Mark Milestone 1 complete in MILESTONES.md
2. Document any issues found
3. Commit changes:
   ```bash
   git add .
   git commit -m "Milestone 1: Add OPL patch types and loading capability"
   ```
4. Move to Milestone 2: Default Patches

---

## Files Changed Summary

**New Files:**
- `src/types/OPLPatch.ts` - Type definitions
- `src/testPatches.ts` - Temporary test patches

**Modified Files:**
- `src/SimpleSynth.ts` - Added patch management methods
- `src/App.tsx` - Exposed synth globally for testing

**Lines Changed:** ~200 lines added, ~40 lines removed

---

## Time Tracking

| Task | Estimated | Actual |
|------|-----------|--------|
| Create types | 30 min | ~25 min |
| Add SimpleSynth methods | 90 min | ~75 min |
| Create test patches | 15 min | ~10 min |
| Create PatchTest UI component | N/A | ~90 min |
| Debugging and fixes | N/A | ~30 min |
| **TOTAL** | **2-3 hours** | **~4 hours** |

**Note:** Actual time exceeded estimate due to creation of PatchTest UI component and route (not in original plan), which provides better testing UX than console-only approach.

---

## Notes

- This milestone intentionally doesn't integrate with the tracker UI yet
- Console testing proves the core functionality works
- `testPatches.ts` is temporary and will be replaced in Milestone 2
- Keep test patches simple to verify the mechanism works
