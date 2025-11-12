# Doom Sound Quality - Implementation Plan

**Created:** 2025-01-11
**Status:** Ready to Start
**Goal:** Implement dual-voice support and missing features for authentic Doom sound

---

## Overview

This plan addresses three missing features identified in [DOOM-SOUND-INVESTIGATION.md](DOOM-SOUND-INVESTIGATION.md):

1. **Dual-Voice/Pseudo 4-Operator Support** (CRITICAL)
2. **Flags Field Storage and Usage** (IMPORTANT)
3. **Finetune Field Storage and Usage** (IMPORTANT)

**Implementation Strategy:** Phased approach, starting with data pipeline fixes, then playback implementation.

---

## Phase 1: Fix Data Pipeline ⏸️

**Goal:** Capture and store all instrument data from OP2 files
**Risk Level:** Low
**Estimated Time:** 30 minutes

### 1.1 Update DMX Converter - Add Missing Fields

**File:** `minimal-prototype/scripts/convertDMXCollections.js`

#### Task 1.1.1: Update parseInstrument to store flags ⬜
- [ ] Read flags field (already done at line 161)
- [ ] Add to return object in parseInstrument function
- [ ] Location: Line 179-198

**Code change:**
```javascript
// Line 179
return {
  id: index,
  name: name,
  flags: flags,              // ADD THIS LINE
  finetune: finetune,        // ADD THIS LINE
  note: note !== 0 ? note : undefined,
  voice1: { ... },
  voice2: { ... }
};
```

#### Task 1.1.2: Compute isDualVoice flag ⬜
- [ ] Check if voice2 has non-zero ADSR data
- [ ] Check if flags bit 2 is set (0x0004)
- [ ] Set isDualVoice to true if either condition is met

**Code to add (after line 175 - before return):**
```javascript
// Determine if this is a dual-voice instrument
// Check if voice2 has meaningful data (non-zero ADSR)
const hasVoice2Data =
  (mod2.attack !== 0 || mod2.decay !== 0 || mod2.sustain !== 0 || mod2.release !== 0 ||
   car2.attack !== 0 || car2.decay !== 0 || car2.sustain !== 0 || car2.release !== 0);

// Check if flags bit 2 is set (explicit dual-voice flag)
const flagsDualVoice = (flags & 0x0004) !== 0;

const isDualVoice = hasVoice2Data || flagsDualVoice;
```

**Then add to return object:**
```javascript
return {
  id: index,
  name: name,
  flags: flags,
  finetune: finetune,
  note: note !== 0 ? note : undefined,
  isDualVoice: isDualVoice,  // ADD THIS LINE
  voice1: { ... },
  voice2: { ... }
};
```

### 1.2 Regenerate DMX Collections

#### Task 1.2.1: Run converter script ⬜
```bash
cd minimal-prototype
node scripts/convertDMXCollections.js
```

- [ ] Verify 6 collections regenerated (GENMIDI, Doom 1, Doom 2, Heretic, Raptor, Strife)
- [ ] Check for errors in output

#### Task 1.2.2: Verify new fields in JSON ⬜
- [ ] Open `public/instruments/dmx/doom1.json`
- [ ] Check instrument 0 has `flags` field
- [ ] Check instrument 0 has `finetune` field
- [ ] Check instrument 0 has `isDualVoice` field

**Expected for Instrument 0:**
```json
{
  "id": 0,
  "name": "Acoustic Grand Piano",
  "flags": 0,
  "finetune": 128,
  "isDualVoice": true,
  "voice1": { ... },
  "voice2": { ... }
}
```

### 1.3 Verification Testing

#### Task 1.3.1: Run analysis script ⬜
```bash
cd minimal-prototype
node scripts/findMissingData.js
```

- [ ] Verify "MISSING: Flags field" is no longer reported
- [ ] Verify "MISSING: Finetune field" is no longer reported
- [ ] Note: Script may need updating to check for new fields

#### Task 1.3.2: Count dual-voice instruments ⬜
Create and run verification script:

```bash
cd minimal-prototype
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/instruments/dmx/doom1.json'));
const dualVoiceCount = data.instruments.filter(i => i.isDualVoice).length;
console.log('Dual-voice instruments:', dualVoiceCount, '/ 128');
console.log('Expected: 125 / 128');
"
```

- [ ] Verify ~125 instruments marked as isDualVoice
- [ ] If count is wrong, investigate logic in Task 1.1.2

### 1.4 Update TypeScript Types

**File:** `minimal-prototype/src/types/OPLPatch.ts`

#### Task 1.4.1: Add new fields to OPLPatch interface ⬜
- [ ] Add `flags?: number;` field
- [ ] Add `finetune?: number;` field
- [ ] Verify `isDualVoice?: boolean;` already exists (line 65)

**Location:** Around line 49-73

**Code change:**
```typescript
export interface OPLPatch {
  id: number;
  name: string;
  category?: string;

  // Backward compatibility: Single-voice format
  modulator: OPLOperator;
  carrier: OPLOperator;
  feedback: number;
  connection: 'fm' | 'additive';

  // Dual-voice format
  voice1?: OPLVoice;
  voice2?: OPLVoice;

  // Control flags
  flags?: number;           // ADD THIS LINE - OP2 flags (bit 0=fixed pitch, bit 2=dual-voice)
  finetune?: number;        // ADD THIS LINE - Pitch adjustment (128=normal, <128=flat, >128=sharp)
  isDualVoice?: boolean;    // VERIFY THIS EXISTS

  // Other fields...
  noteOffset?: number;
  isCustom?: boolean;
  basePresetId?: number;
}
```

#### Task 1.4.2: Run TypeScript type check ⬜
```bash
cd minimal-prototype
npm run type-check
```

- [ ] Verify no type errors
- [ ] Fix any issues that arise

### Phase 1 Completion Checklist ✅

Before moving to Phase 2, verify:

- [ ] ✅ All 6 DMX collections regenerated
- [ ] ✅ JSON files contain `flags`, `finetune`, `isDualVoice` fields
- [ ] ✅ ~125 instruments marked as isDualVoice
- [ ] ✅ TypeScript types updated
- [ ] ✅ No type errors

**Phase 1 Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

---

## Phase 2: Implement Dual-Voice Detection ⏸️

**Goal:** SimpleSynth can identify when to use dual-voice mode
**Risk Level:** Low
**Estimated Time:** 15 minutes

### 2.1 Add Dual-Voice Detection Method

**File:** `minimal-prototype/src/SimpleSynth.ts`

#### Task 2.1.1: Add shouldUseDualVoice helper method ⬜

**Location:** After `getAllPatches()` method (around line 342)

**Code to add:**
```typescript
/**
 * Determine if an instrument should use dual-voice mode
 * Checks both the isDualVoice flag and voice2 data presence
 */
private shouldUseDualVoice(patch: OPLPatch): boolean {
  // Check explicit isDualVoice flag
  if (patch.isDualVoice === true) {
    return true;
  }

  // Check flags bit 2 (0x0004) if flags field exists
  if (patch.flags !== undefined && (patch.flags & 0x0004) !== 0) {
    return true;
  }

  // Check if voice2 has meaningful data
  if (patch.voice2) {
    const hasVoice2Data =
      patch.voice2.modulator.attackRate !== 0 ||
      patch.voice2.modulator.decayRate !== 0 ||
      patch.voice2.modulator.sustainLevel !== 0 ||
      patch.voice2.modulator.releaseRate !== 0 ||
      patch.voice2.carrier.attackRate !== 0 ||
      patch.voice2.carrier.decayRate !== 0 ||
      patch.voice2.carrier.sustainLevel !== 0 ||
      patch.voice2.carrier.releaseRate !== 0 ||
      patch.voice2.feedback !== 0;

    if (hasVoice2Data) {
      return true;
    }
  }

  return false;
}
```

#### Task 2.1.2: Add test logging to existing noteOn ⬜

**Location:** In `noteOn()` method, after getting patch (around line 393-397)

**Code to add (temporary, for testing):**
```typescript
// Get patch for this MIDI channel (track)
const patch = this.trackPatches.get(channel);
if (!patch) {
  console.warn(`[SimpleSynth] No patch loaded for MIDI channel/track ${channel}`);
  return;
}

// ADD TEMPORARY LOGGING
const isDual = this.shouldUseDualVoice(patch);
console.log(`[SimpleSynth] Note ${midiNote} on track ${channel}: "${patch.name}" (dual-voice: ${isDual})`);
```

### 2.2 Testing Detection Logic

#### Task 2.2.1: Test in browser ⬜
- [ ] Start dev server: `npm run dev`
- [ ] Open browser console
- [ ] Load Doom 1 instrument collection
- [ ] Play some notes on Tracker
- [ ] Verify console shows dual-voice detection

**Expected output:**
```
[SimpleSynth] Note 60 on track 0: "Acoustic Grand Piano" (dual-voice: true)
[SimpleSynth] Note 64 on track 1: "Bright Acoustic Piano" (dual-voice: true)
```

#### Task 2.2.2: Verify detection counts ⬜

Run in browser console:
```javascript
// Count how many loaded instruments are dual-voice
const patches = window.synth.getAllTrackPatches();
console.log('Track patches loaded:', patches);

// This requires exposing the method or checking manually
```

- [ ] Verify detection logic works correctly
- [ ] Most Doom instruments should be detected as dual-voice

#### Task 2.2.3: Remove temporary logging ⬜
- [ ] Remove the console.log from Task 2.1.2 (keep the detection call if added)

### Phase 2 Completion Checklist ✅

- [ ] ✅ `shouldUseDualVoice()` method added
- [ ] ✅ Method correctly detects dual-voice instruments
- [ ] ✅ Testing confirms ~125 instruments detected as dual-voice
- [ ] ✅ Temporary logging removed

**Phase 2 Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

---

## Phase 3: Implement Dual-Voice Playback ⏸️

**Goal:** SimpleSynth plays both voices simultaneously
**Risk Level:** Medium
**Estimated Time:** 1-2 hours

### 3.1 Update noteOn Method

**File:** `minimal-prototype/src/SimpleSynth.ts`

#### Task 3.1.1: Modify noteOn to detect dual-voice ⬜

**Location:** `noteOn()` method (around line 376)

**Current structure:**
```typescript
noteOn(channel: number, midiNote: number, _velocity: number = 100): void {
  // ... validation ...

  const patch = this.trackPatches.get(channel);

  // ... existing single-voice logic ...
}
```

**Changes needed:**
- [ ] Add dual-voice detection check
- [ ] Branch into single-voice vs dual-voice paths

#### Task 3.1.2: Implement single-voice path (refactor existing) ⬜

Extract existing noteOn logic into separate method:

**Add new method:**
```typescript
/**
 * Play a single-voice note (original behavior)
 */
private playNoteOnSingleVoice(
  channel: number,
  midiNote: number,
  patch: OPLPatch,
  velocity: number
): void {
  // ... move existing noteOn logic here ...
  // Everything from line ~399 to ~510
}
```

#### Task 3.1.3: Implement dual-voice path (new) ⬜

**Add new method:**
```typescript
/**
 * Play a dual-voice note (uses 2 OPL channels)
 */
private playNoteOnDualVoice(
  channel: number,
  midiNote: number,
  patch: OPLPatch,
  velocity: number
): void {
  // Apply note offset from voice1
  const noteOffset1 = patch.voice1?.noteOffset || patch.noteOffset || 0;
  const noteOffset2 = patch.voice2?.noteOffset || 0;

  const adjustedNote1 = Math.max(0, Math.min(127, midiNote + noteOffset1));
  const adjustedNote2 = Math.max(0, Math.min(127, midiNote + noteOffset2));

  // Allocate TWO OPL channels
  const oplChannel1 = this.channelManager.allocateChannel();
  const oplChannel2 = this.channelManager.allocateChannel();

  if (oplChannel1 === null || oplChannel2 === null) {
    // Not enough channels - release any allocated and fail gracefully
    if (oplChannel1 !== null) this.channelManager.releaseChannel(oplChannel1);
    if (oplChannel2 !== null) this.channelManager.releaseChannel(oplChannel2);
    console.warn(`[SimpleSynth] Not enough channels for dual-voice on channel ${channel}`);
    return;
  }

  console.log(`[SimpleSynth] Dual-voice: allocated OPL channels ${oplChannel1} + ${oplChannel2} for track ${channel}`);

  // Program voice1 to first OPL channel
  if (patch.voice1) {
    this.programVoice(oplChannel1, patch.voice1, patch);
  }

  // Program voice2 to second OPL channel
  if (patch.voice2) {
    this.programVoice(oplChannel2, patch.voice2, patch);
  }

  // Get frequency parameters for both notes
  const freq1 = getOPLParams(adjustedNote1);
  const freq2 = getOPLParams(adjustedNote2);

  // Trigger both notes
  this.triggerNote(oplChannel1, freq1.fnum, freq1.block);
  this.triggerNote(oplChannel2, freq2.fnum, freq2.block);

  // Store both channels in activeNotes
  const noteId = `${channel}-${midiNote}`;
  this.activeNotes.set(channel, {
    noteId,
    channels: [oplChannel1, oplChannel2],  // Array of channels
    note: midiNote,
    isDualVoice: true
  });
}
```

#### Task 3.1.4: Update noteOn dispatcher ⬜

**Update noteOn to route to correct path:**
```typescript
noteOn(channel: number, midiNote: number, velocity: number = 100): void {
  if (!this.isInitialized) {
    console.error('[SimpleSynth] Not initialized');
    return;
  }

  if (channel < 0 || channel >= 18) {
    console.error('[SimpleSynth] Invalid MIDI channel:', channel);
    return;
  }

  if (midiNote < 0 || midiNote > 127) {
    console.error('[SimpleSynth] Invalid MIDI note:', midiNote);
    return;
  }

  // Get patch for this MIDI channel (track)
  const patch = this.trackPatches.get(channel);
  if (!patch) {
    console.warn(`[SimpleSynth] No patch loaded for MIDI channel/track ${channel}`);
    return;
  }

  // Stop any currently playing note on this channel
  if (this.activeNotes.has(channel)) {
    this.noteOff(channel, this.activeNotes.get(channel)!.note);
  }

  // Route to single-voice or dual-voice implementation
  if (this.shouldUseDualVoice(patch)) {
    this.playNoteOnDualVoice(channel, midiNote, patch, velocity);
  } else {
    this.playNoteOnSingleVoice(channel, midiNote, patch, velocity);
  }
}
```

### 3.2 Update noteOff Method

**File:** `minimal-prototype/src/SimpleSynth.ts`

#### Task 3.2.1: Update noteOff to handle dual-voice ⬜

**Location:** `noteOff()` method (around line 512)

**Current code** releases single channel:
```typescript
noteOff(channel: number, midiNote: number): void {
  const activeNote = this.activeNotes.get(channel);

  if (activeNote && activeNote.note === midiNote) {
    this.releaseNote(activeNote.channels[0]);  // Single channel
    this.channelManager.releaseChannel(activeNote.channels[0]);
    this.activeNotes.delete(channel);
  }
}
```

**Update to handle both single and dual:**
```typescript
noteOff(channel: number, midiNote: number): void {
  if (!this.isInitialized) return;

  const activeNote = this.activeNotes.get(channel);

  if (!activeNote || activeNote.note !== midiNote) {
    return;
  }

  // Release all channels (1 for single-voice, 2 for dual-voice)
  for (const oplChannel of activeNote.channels) {
    this.releaseNote(oplChannel);
    this.channelManager.releaseChannel(oplChannel);
  }

  this.activeNotes.delete(channel);

  if (activeNote.isDualVoice) {
    console.log(`[SimpleSynth] Released dual-voice note (channels ${activeNote.channels.join('+')}) on track ${channel}`);
  }
}
```

### 3.3 Update Active Notes Type

**File:** `minimal-prototype/src/SimpleSynth.ts`

#### Task 3.3.1: Update activeNotes Map type ⬜

**Location:** Around line 24-29

**Current:**
```typescript
private activeNotes: Map<number, {
  noteId: string;
  channels: number[];
  note: number;
  isDualVoice: boolean;
}> = new Map();
```

**This is already correct!** The type supports multiple channels.
- [ ] Verify the type definition matches above
- [ ] No changes needed if it already has `channels: number[]`

### 3.4 Add Helper Method: triggerNote

#### Task 3.4.1: Extract note triggering logic ⬜

**Add new method** (after `writeOperatorRegisters`):
```typescript
/**
 * Trigger a note on a specific OPL channel
 */
private triggerNote(channelId: number, fnum: number, block: number): void {
  const reg = this.getChannelRegister(0xA0, channelId);
  const regB = this.getChannelRegister(0xB0, channelId);

  // Write frequency low byte (F-Number low 8 bits)
  this.writeOPL(reg, fnum & 0xFF);

  // Write Key-On + Block + F-Number high bits
  const highByte = 0x20 | ((block & 0x07) << 2) | ((fnum >> 8) & 0x03);
  this.writeOPL(regB, highByte);
}
```

### 3.5 Add Helper Method: releaseNote

#### Task 3.5.1: Extract note release logic ⬜

**Add new method:**
```typescript
/**
 * Release a note on a specific OPL channel
 */
private releaseNote(channelId: number): void {
  const regB = this.getChannelRegister(0xB0, channelId);

  // Read current value to preserve block and fnum
  // For now, just write 0 (key-off, block=0, fnum=0)
  this.writeOPL(regB, 0x00);
}
```

### 3.6 Testing

#### Task 3.6.1: Test single-voice still works ⬜
- [ ] Load a non-dual-voice instrument (if any exist)
- [ ] Play notes
- [ ] Verify sound works as before

#### Task 3.6.2: Test dual-voice playback ⬜
- [ ] Load Doom 1 collection
- [ ] Play Acoustic Grand Piano (instrument 0)
- [ ] Verify TWO channels allocated (check console logs)
- [ ] Verify richer, fuller sound
- [ ] Compare to previous single-voice sound

#### Task 3.6.3: Test channel exhaustion ⬜
- [ ] Play 9+ simultaneous dual-voice notes
- [ ] Verify graceful handling when channels run out
- [ ] Check console for "Not enough channels" warning

#### Task 3.6.4: Test export still works ⬜
- [ ] Export a pattern to WAV
- [ ] Verify export completes without errors
- [ ] Play exported WAV
- [ ] Should sound identical to browser playback

### Phase 3 Completion Checklist ✅

- [ ] ✅ noteOn split into single/dual paths
- [ ] ✅ Dual-voice allocates 2 channels
- [ ] ✅ Both voices programmed and triggered
- [ ] ✅ noteOff releases both channels
- [ ] ✅ Single-voice playback still works
- [ ] ✅ Dual-voice sounds richer/fuller
- [ ] ✅ Export to WAV works with dual-voice
- [ ] ✅ Console logging shows channel allocation

**Phase 3 Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

---

## Phase 4: Implement Finetune Support (Optional) ⏸️

**Goal:** Apply pitch adjustments for accurate tuning
**Risk Level:** Low
**Estimated Time:** 30 minutes

### 4.1 Add Finetune Calculation

**File:** `minimal-prototype/src/SimpleSynth.ts`

#### Task 4.1.1: Add applyFinetune helper method ⬜

**Add new method:**
```typescript
/**
 * Apply finetune adjustment to MIDI note
 * @param midiNote - Base MIDI note (0-127)
 * @param finetune - Finetune value (0-255, 128=normal)
 * @returns Adjusted MIDI note (as float, may have fractional part)
 */
private applyFinetune(midiNote: number, finetune: number | undefined): number {
  if (finetune === undefined || finetune === 128) {
    return midiNote;  // No adjustment
  }

  // Finetune range: typically -1 to +1 semitone
  // 128 = normal, <128 = flat, >128 = sharp
  // Map 0-255 to approximately -1 to +1 semitone
  const semitoneOffset = (finetune - 128) / 128.0;

  return midiNote + semitoneOffset;
}
```

#### Task 4.1.2: Apply finetune in noteOn methods ⬜

**Update in playNoteOnSingleVoice** (after note offset calculation):
```typescript
let adjustedNote = Math.max(0, Math.min(127, midiNote + noteOffset));

// Apply finetune
adjustedNote = this.applyFinetune(adjustedNote, patch.finetune);

// Then clamp again
adjustedNote = Math.max(0, Math.min(127, adjustedNote));
```

**Update in playNoteOnDualVoice** (for both notes):
```typescript
let adjustedNote1 = Math.max(0, Math.min(127, midiNote + noteOffset1));
let adjustedNote2 = Math.max(0, Math.min(127, midiNote + noteOffset2));

// Apply finetune
adjustedNote1 = this.applyFinetune(adjustedNote1, patch.finetune);
adjustedNote2 = this.applyFinetune(adjustedNote2, patch.finetune);

// Clamp
adjustedNote1 = Math.max(0, Math.min(127, adjustedNote1));
adjustedNote2 = Math.max(0, Math.min(127, adjustedNote2));
```

#### Task 4.1.3: Handle fractional MIDI notes ⬜

The `getOPLParams()` function expects integer MIDI notes. We need to either:
- Option A: Round to nearest integer (simpler, less accurate)
- Option B: Interpolate between adjacent notes (more accurate)

**Option A (Recommended):**
```typescript
const freq1 = getOPLParams(Math.round(adjustedNote1));
```

### 4.2 Testing Finetune

#### Task 4.2.1: Test with instruments that use finetune ⬜

From our analysis, these instruments use non-standard finetune:
- Instrument 3: finetune=130 (slightly sharp)
- Instrument 18: finetune=138 (sharp)
- Instrument 21: finetune=125 (flat)

- [ ] Play these instruments
- [ ] Listen for pitch accuracy
- [ ] Compare with/without finetune applied

#### Task 4.2.2: Verify 128 is neutral ⬜
- [ ] Test instrument with finetune=128
- [ ] Should sound identical to no finetune

### Phase 4 Completion Checklist ✅

- [ ] ✅ applyFinetune() method added
- [ ] ✅ Finetune applied in both noteOn paths
- [ ] ✅ Testing confirms pitch adjustment works
- [ ] ✅ Instruments with finetune≠128 sound correct

**Phase 4 Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

---

## Phase 5: Testing & Validation ⏸️

**Goal:** Comprehensive testing of all changes
**Risk Level:** N/A
**Estimated Time:** 30-45 minutes

### 5.1 Browser Playback Testing

#### Task 5.1.1: Test Doom E1M1 (At Doom's Gate) ⬜
- [ ] Load Doom 1 instrument collection
- [ ] Load E1M1 pattern
- [ ] Play from start to finish
- [ ] **Expected:** Rich, heavy, authentic Doom metal sound
- [ ] **Compare:** Should sound much fuller than before

#### Task 5.1.2: Test dual-voice piano instruments ⬜
- [ ] Instrument 0: Acoustic Grand Piano
- [ ] Instrument 1: Bright Acoustic Piano
- [ ] Instrument 2: Electric Grand Piano
- [ ] **Expected:** Richer, more complex piano tones

#### Task 5.1.3: Test guitar instruments ⬜
- [ ] Instrument 29: Overdriven Guitar
- [ ] Instrument 30: Distortion Guitar
- [ ] **Expected:** Fuller, more aggressive distortion

#### Task 5.1.4: Test percussion/fixed-pitch ⬜
- [ ] Instrument 125: Helicopter
- [ ] Instrument 126: Applause
- [ ] **Note:** These may need flags bit 0 handling (future work)

### 5.2 Export Testing

#### Task 5.2.1: Export E1M1 to WAV ⬜
- [ ] Click Export button
- [ ] Wait for render to complete
- [ ] Download WAV file
- [ ] Play WAV in media player
- [ ] **Expected:** Sounds identical to browser playback

#### Task 5.2.2: Compare WAV to browser ⬜
- [ ] Play same section in browser
- [ ] Play same section in exported WAV
- [ ] **Expected:** No audible differences
- [ ] Dual-voice should be present in export

### 5.3 Resource Management Testing

#### Task 5.3.1: Test channel allocation ⬜
- [ ] Open browser console
- [ ] Monitor channel allocation logs
- [ ] Play 9 simultaneous dual-voice notes (18 channels total)
- [ ] Verify all notes play
- [ ] Play 10th note - should fail gracefully or steal oldest

#### Task 5.3.2: Test note release ⬜
- [ ] Play and hold a dual-voice note
- [ ] Release note
- [ ] Verify both channels released (check console)
- [ ] Verify no "stuck notes" (sustained sound after release)

#### Task 5.3.3: Test rapid note changes ⬜
- [ ] Play rapid arpeggios on Tracker
- [ ] Verify no audio glitches
- [ ] Verify no console errors
- [ ] Verify smooth note transitions

### 5.4 Comparison with Reference

#### Task 5.4.1: Compare with ZDoom (optional) ⬜
If you have ZDoom or similar:
- [ ] Play E1M1 MIDI in ZDoom with original GENMIDI
- [ ] Play E1M1 in WebOPL with Doom 1 collection
- [ ] **Expected:** Very similar sound quality

### 5.5 Edge Cases

#### Task 5.5.1: Test single-voice instruments ⬜
- [ ] Find instrument with isDualVoice=false (if any)
- [ ] Verify it still plays correctly
- [ ] Should use only 1 channel

#### Task 5.5.2: Test mixed single/dual in pattern ⬜
- [ ] Create pattern with both types
- [ ] Verify each type uses correct channel count

### 5.6 Performance Testing

#### Task 5.6.1: Monitor CPU usage ⬜
- [ ] Open browser performance tools
- [ ] Play complex pattern with many dual-voice notes
- [ ] **Expected:** No significant CPU increase vs before
- [ ] Should remain smooth and responsive

#### Task 5.6.2: Test export performance ⬜
- [ ] Export long pattern (3+ minutes)
- [ ] Monitor progress
- [ ] **Expected:** Completes without hanging
- [ ] Similar speed to before

### Phase 5 Completion Checklist ✅

- [ ] ✅ E1M1 sounds authentic and rich
- [ ] ✅ All instrument types tested
- [ ] ✅ Export produces correct WAV
- [ ] ✅ Browser playback = exported WAV
- [ ] ✅ Channel management works correctly
- [ ] ✅ No stuck notes or glitches
- [ ] ✅ Performance is acceptable

**Phase 5 Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

---

## Phase 6: Cleanup & Documentation ⏸️

**Goal:** Remove debug code, update docs
**Risk Level:** Low
**Estimated Time:** 15 minutes

### 6.1 Remove Debug Logging

#### Task 6.1.1: Remove or reduce console.log statements ⬜
- [ ] SimpleSynth.ts - Remove temporary dual-voice logs
- [ ] Or: Change to debug level only shown when flag set
- [ ] Keep important error/warning logs

### 6.2 Update Documentation

#### Task 6.2.1: Update CURRENT-STATUS.md ⬜
**File:** `OPL-Libraries/CURRENT-STATUS.md`

- [ ] Add note about dual-voice support implementation
- [ ] Update "Features Working" section
- [ ] Add this implementation to credits/timeline

#### Task 6.2.2: Create DUAL-VOICE-IMPLEMENTATION.md ⬜
**New file:** `OPL-Libraries/DUAL-VOICE-IMPLEMENTATION.md`

- [ ] Document how dual-voice works
- [ ] Include code examples
- [ ] Explain channel allocation strategy
- [ ] Note limitations (max 9 simultaneous dual-voice notes)

#### Task 6.2.3: Update DOOM-SOUND-INVESTIGATION.md ⬜
- [ ] Add "RESOLVED" status at top
- [ ] Link to implementation plan
- [ ] Add "Implementation Complete" date
- [ ] Summarize what was implemented

### 6.3 Code Comments

#### Task 6.3.1: Add JSDoc comments to new methods ⬜
- [ ] shouldUseDualVoice() - explain detection logic
- [ ] playNoteOnDualVoice() - explain dual-channel allocation
- [ ] applyFinetune() - explain finetune calculation

### Phase 6 Completion Checklist ✅

- [ ] ✅ Debug logging cleaned up
- [ ] ✅ Documentation updated
- [ ] ✅ Code comments added
- [ ] ✅ Implementation plan marked complete

**Phase 6 Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

---

## Final Acceptance Criteria

### Must Have ✅

- [ ] **Data Pipeline:** All DMX collections contain flags, finetune, isDualVoice
- [ ] **Detection:** SimpleSynth correctly identifies ~125 Doom instruments as dual-voice
- [ ] **Playback:** Dual-voice instruments allocate and use 2 OPL channels
- [ ] **Sound Quality:** Doom E1M1 sounds rich and authentic (subjective but critical)
- [ ] **Single-Voice:** Non-dual-voice instruments still work correctly
- [ ] **Export:** WAV export works with dual-voice (sounds identical to playback)
- [ ] **No Regressions:** Existing functionality still works

### Nice to Have ✅

- [ ] **Finetune:** Pitch adjustment applied for accurate tuning
- [ ] **Performance:** No significant CPU/memory increase
- [ ] **Documentation:** Implementation documented for future reference

### Future Enhancements 📋

Not part of this implementation, but noted for future:
- [ ] Fixed-pitch support (flags bit 0) for percussion
- [ ] Voice 2 baseNote offset independence
- [ ] Per-voice finetune (if OP2 format supports)
- [ ] Channel stealing algorithm for >9 dual-voice notes

---

## Rollback Plan

If critical issues arise:

### Quick Rollback
- [ ] Revert SimpleSynth.ts changes
- [ ] Single-voice playback will work again
- [ ] Data pipeline changes can remain (no harm)

### Git Commands
```bash
# View recent commits
git log --oneline -10

# Revert specific file
git checkout HEAD~1 -- src/SimpleSynth.ts

# Or revert entire commit
git revert <commit-hash>
```

---

## Progress Tracking

### Overall Status

- **Phase 1:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete
- **Phase 2:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete
- **Phase 3:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete
- **Phase 4:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete
- **Phase 5:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete
- **Phase 6:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

### Time Tracking

- **Estimated Total Time:** 3-4 hours
- **Actual Time:** _____ hours
- **Started:** _________
- **Completed:** _________

---

## Notes & Issues

### Issues Encountered

(Add notes here as issues arise)

### Decisions Made

(Document any design decisions or deviations from plan)

### Future Improvements

(Note any ideas for future enhancements)

---

**Document Status:** Ready for Implementation
**Last Updated:** 2025-01-11
