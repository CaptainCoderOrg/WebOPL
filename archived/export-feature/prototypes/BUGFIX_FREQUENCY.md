# Bug Fix: Incorrect Frequency Calculation

**Issue:** WAV export produced very low pitch (not middle C)

**Date:** 2025-01-06

---

## Problem

The initial prototype calculated F-num and block incorrectly, resulting in:
- F-num: 5518 (way over the 10-bit limit of 1023!)
- Block: 0
- Result: Very low, distorted pitch

## Root Cause

The frequency calculation algorithm was wrong:

```typescript
// ❌ WRONG - increments block when frequency is high
let block = 0;
let testFreq = frequency;
while (testFreq >= 1024 && block < 7) {
  testFreq /= 2;
  block++;
}
const fnum = Math.round((frequency * Math.pow(2, 20 - block)) / 49716);
```

This resulted in:
- For 261.63 Hz (middle C), testFreq never exceeded 1024
- Block stayed at 0
- F-num calculated as 5518 (invalid!)

## OPL3 Constraints

**F-num (F-number):**
- 10-bit value (0-1023)
- Fine frequency control

**Block:**
- 3-bit value (0-7)
- Octave selector
- Higher block = higher pitch

**Formula:**
```
frequency = (fnum × 49716) / 2^(20 - block)
```

## Correct Algorithm

```typescript
// ✅ CORRECT - calculate block based on MIDI note
const block = Math.floor(midiNote / 12) - 1;
const clampedBlock = Math.max(0, Math.min(7, block));

// Calculate F-num for this block
const fnum = Math.round((frequency * Math.pow(2, 20 - clampedBlock)) / 49716);
const clampedFnum = Math.max(0, Math.min(1023, fnum));
```

## Example: Middle C (MIDI 60)

**Correct calculation:**
```
midiNote = 60
frequency = 261.63 Hz
block = floor(60/12) - 1 = 5 - 1 = 4
fnum = (261.63 × 2^(20-4)) / 49716
     = (261.63 × 65536) / 49716
     = 17,146,125 / 49716
     = 345 ✓ (in valid range!)
```

**Result:**
- Block: 4 (correct octave)
- F-num: 345 (valid 10-bit value)
- Pitch: Middle C (261.63 Hz) ✅

## Reference Implementation

The SimpleSynth actually uses a **lookup table** in `midiToOPL.ts`:

```typescript
// From src/constants/midiToOPL.ts
const FNUM_TABLE = [
  0x0AD, 0x0B7, 0x0C2, ... // Pre-calculated values
];

function calculateOPLParams(midiNote: number) {
  const block = Math.floor(midiNote / 12) - 1;
  const fnumIndex = (midiNote % 12) + 12;
  const fnum = FNUM_TABLE[fnumIndex];
  return { freq, fnum, block };
}
```

For production code, we should use the lookup table. For prototypes, the formula above is sufficient.

## Verification

After fix:
- Middle C now sounds correct ✅
- Pitch matches real-time playback ✅
- F-num within valid range (0-1023) ✅
- Block set correctly (4 for middle C) ✅

## Files Updated

- `prototype-1-single-tone.ts` - Fixed frequency calculation
- `test-opl3-direct-access.ts` - Fixed frequency calculation
- `BUGFIX_FREQUENCY.md` - This document

## Lesson Learned

**Always validate calculated values against hardware constraints!**

The F-num being 5518 should have been an immediate red flag (way over 1023). Future prototypes should:
1. Log calculated values
2. Check against known limits
3. Compare with reference implementation
4. Test with known good values first

---

**Status:** Fixed and tested ✅
