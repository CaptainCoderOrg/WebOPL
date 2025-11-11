# Milestone 3: Synth Integration (Dual-Voice Playback)

**Status**: ✅ Complete
**Effort**: 4-5 hours (actual: ~3 hours)
**Risk**: High (core audio logic changes)
**Dependencies**: Milestone 1 + Milestone 2 complete

## Objective

Integrate ChannelManager into SimpleSynth and implement dual-voice playback logic. When `dualVoiceEnabled: true` for a patch, allocate 2 channels and program both Voice 1 and Voice 2 to hardware.

## Success Criteria

- ✅ SimpleSynth.noteOn() uses ChannelManager for allocation
- ✅ Dual-voice instruments play on 2 channels simultaneously
- ✅ Single-voice instruments still work (backward compatible)
- ✅ Voice stealing works seamlessly during playback
- ✅ All instruments sound correct (both voices active)
- ✅ No audio glitches or crashes
- ✅ Sequencer and InstrumentTester both work

---

## Task 3.1: Refactor SimpleSynth.noteOn() (90 minutes)

**File**: `minimal-prototype/src/SimpleSynth.ts`

### Current State

```typescript
noteOn(channel: number, midiNote: number, velocity: number): void {
  // Apply GENMIDI note offset if present (for pitch correction)
  let adjustedNote = midiNote;
  const patch = this.channelPatches.get(channel);
  if (patch && patch.noteOffset !== undefined) {
    adjustedNote = midiNote - patch.noteOffset;
    adjustedNote = Math.max(0, Math.min(127, adjustedNote));
  }

  const oplChannel = channel % 9;
  this.programPatch(oplChannel, patch);
  this.writeNote(oplChannel, adjustedNote, velocity, true);
  this.activeNotes.set(channel, { channel: oplChannel, note: adjustedNote });
}
```

### New Implementation

Replace entire `noteOn()` method:

```typescript
noteOn(channel: number, midiNote: number, velocity: number): void {
  const patch = this.channelPatches.get(channel);
  if (!patch) {
    console.warn(`[SimpleSynth] No patch for MIDI channel ${channel}`);
    return;
  }

  // Apply GENMIDI note offset if present (for pitch correction)
  let adjustedNote = midiNote;
  if (patch.noteOffset !== undefined) {
    adjustedNote = midiNote - patch.noteOffset;
    adjustedNote = Math.max(0, Math.min(127, adjustedNote));
  }

  // Generate unique note ID for channel manager
  const noteId = `ch${channel}-note${midiNote}`;

  // Check if dual-voice is enabled AND both voices exist
  const isDualVoice = patch.dualVoiceEnabled && patch.voice1 && patch.voice2;

  if (isDualVoice) {
    // === DUAL-VOICE PATH ===
    const channels = this.channelManager.allocateDualChannels(noteId);
    if (!channels) {
      console.warn(`[SimpleSynth] Failed to allocate dual channels for ${noteId}`);
      return;
    }

    const [ch1, ch2] = channels;

    // Program Voice 1 on channel 1
    this.programVoice(ch1, patch.voice1!, patch);
    this.writeNote(ch1, adjustedNote, velocity, true);

    // Program Voice 2 on channel 2 (if we got 2 different channels)
    if (ch1 !== ch2) {
      this.programVoice(ch2, patch.voice2!, patch);
      this.writeNote(ch2, adjustedNote, velocity, true);
    } else {
      // Degraded mode: only 1 channel available, use Voice 1 only
      console.warn(`[SimpleSynth] Dual-voice degraded for ${noteId}`);
    }

    // Track active note
    this.activeNotes.set(channel, {
      noteId,
      channels: [ch1, ch2],
      note: adjustedNote,
      isDualVoice: true
    });

  } else {
    // === SINGLE-VOICE PATH (backward compatible) ===
    const oplChannel = this.channelManager.allocateChannel(noteId);
    if (oplChannel === null) {
      console.warn(`[SimpleSynth] Failed to allocate channel for ${noteId}`);
      return;
    }

    // Use backward-compatible single-voice programming
    this.programPatch(oplChannel, patch);
    this.writeNote(oplChannel, adjustedNote, velocity, true);

    // Track active note
    this.activeNotes.set(channel, {
      noteId,
      channels: [oplChannel],
      note: adjustedNote,
      isDualVoice: false
    });
  }
}
```

### New Helper Method: programVoice()

Add this new method to SimpleSynth:

```typescript
/**
 * Program a single voice (for dual-voice support)
 * @param channel OPL3 hardware channel (0-8)
 * @param voice Voice data (modulator, carrier, feedback, connection)
 * @param patch Parent patch (for noteOffset metadata)
 */
private programVoice(
  channel: number,
  voice: {
    modulator: OPLOperator;
    carrier: OPLOperator;
    feedback: number;
    connection: 'fm' | 'additive';
    baseNote?: number;
  },
  patch: OPLPatch
): void {
  // Program modulator (operator 1)
  this.programOperator(channel, 0, voice.modulator);

  // Program carrier (operator 2)
  this.programOperator(channel, 1, voice.carrier);

  // Program feedback + connection
  const feedbackByte = (voice.feedback << 1) | (voice.connection === 'additive' ? 0x01 : 0x00);
  this.opl.write(0xC0 + channel, feedbackByte);

  // Note: baseNote is used for fine-tuning in Voice 2, but we apply it during writeNote()
  // For now, we ignore baseNote at the programming stage
}
```

### Update activeNotes Type

Update the `activeNotes` map type:

```typescript
private activeNotes: Map<number, {
  noteId: string;
  channels: number[];
  note: number;
  isDualVoice: boolean;
}>;
```

### Update noteOff()

Replace entire `noteOff()` method:

```typescript
noteOff(channel: number, midiNote: number): void {
  const activeNote = this.activeNotes.get(channel);
  if (!activeNote) return;

  // Release all allocated channels
  for (const oplChannel of activeNote.channels) {
    this.writeNote(oplChannel, activeNote.note, 0, false);
  }

  // Release from channel manager
  this.channelManager.releaseNote(activeNote.noteId);

  // Remove from active notes
  this.activeNotes.delete(channel);
}
```

### Testing

```bash
npm run build
npm run dev
```

### Verification

- [ ] TypeScript compiles without errors
- [ ] App loads without errors
- [ ] Single-voice instruments still play (backward compat)

---

## Task 3.2: Enable Dual-Voice for Select Instruments (30 minutes)

**Objective**: Enable dual-voice for a few test instruments to verify behavior.

**File**: `minimal-prototype/src/utils/genmidiParser.ts`

### Change

Update `convertInstrument()` to enable dual-voice for specific instruments:

```typescript
function convertInstrument(inst: GENMIDIInstrument): OPLPatch {
  // Determine if dual-voice should be enabled
  // For now, enable dual-voice for instruments where Voice 2 differs significantly
  const shouldEnableDualVoice = isDualVoiceWorthwhile(inst);

  return {
    id: inst.id,
    name: inst.name,
    noteOffset: inst.note,

    // Voice 1
    voice1: {
      modulator: convertOperator(inst.voice1.mod),
      carrier: convertOperator(inst.voice1.car),
      feedback: inst.voice1.feedback,
      connection: inst.voice1.additive ? 'additive' : 'fm',
      baseNote: inst.voice1.baseNote
    },

    // Voice 2
    voice2: {
      modulator: convertOperator(inst.voice2.mod),
      carrier: convertOperator(inst.voice2.car),
      feedback: inst.voice2.feedback,
      connection: inst.voice2.additive ? 'additive' : 'fm',
      baseNote: inst.voice2.baseNote
    },

    // Backward compatibility: expose Voice 1 as top-level
    modulator: convertOperator(inst.voice1.mod),
    carrier: convertOperator(inst.voice1.car),
    feedback: inst.voice1.feedback,
    connection: inst.voice1.additive ? 'additive' : 'fm',

    // Enable dual-voice if Voice 2 is different enough
    dualVoiceEnabled: shouldEnableDualVoice
  };
}

/**
 * Heuristic: Check if Voice 2 is significantly different from Voice 1
 * If Voice 2 is identical or nearly identical to Voice 1, dual-voice is wasteful
 */
function isDualVoiceWorthwhile(inst: GENMIDIInstrument): boolean {
  const v1 = inst.voice1;
  const v2 = inst.voice2;

  // Check if feedback or connection differ
  if (v1.feedback !== v2.feedback) return true;
  if (v1.additive !== v2.additive) return true;

  // Check if operator parameters differ significantly
  const modDiff = operatorDistance(v1.mod, v2.mod);
  const carDiff = operatorDistance(v1.car, v2.car);

  // If combined difference > threshold, enable dual-voice
  const threshold = 10; // Arbitrary threshold (tune later)
  return (modDiff + carDiff) > threshold;
}

/**
 * Calculate "distance" between two operators (sum of absolute differences)
 */
function operatorDistance(op1: GENMIDIOperator, op2: GENMIDIOperator): number {
  let distance = 0;
  distance += Math.abs(op1.attack - op2.attack);
  distance += Math.abs(op1.decay - op2.decay);
  distance += Math.abs(op1.sustain - op2.sustain);
  distance += Math.abs(op1.release - op2.release);
  distance += Math.abs(op1.multi - op2.multi);
  distance += Math.abs(op1.out - op2.out);
  distance += Math.abs(op1.wave - op2.wave);
  return distance;
}
```

### Alternative: Manual Enable List

If heuristic doesn't work well, use a manual list of instrument IDs:

```typescript
function convertInstrument(inst: GENMIDIInstrument): OPLPatch {
  // Manually enable dual-voice for specific instruments
  const dualVoiceInstruments = [
    0,   // Acoustic Grand Piano
    1,   // Bright Acoustic Piano
    16,  // Drawbar Organ
    19,  // Church Organ
    40,  // Violin
    48,  // String Ensemble 1
    // Add more as needed
  ];

  const shouldEnableDualVoice = dualVoiceInstruments.includes(inst.id);

  // ... rest of convertInstrument code ...
  return {
    // ...
    dualVoiceEnabled: shouldEnableDualVoice
  };
}
```

### Testing

```bash
npm run dev
```

Open InstrumentTester, select "Acoustic Grand Piano" (ID 0), play notes.

### Verification

- [ ] Dual-voice instruments sound richer than before
- [ ] G notes still sound good (confirming dual-voice is active)
- [ ] Other notes now sound clearer (no more "crunchy" sound)
- [ ] Single-voice instruments still work

---

## Task 3.3: Add Logging and Diagnostics (30 minutes)

### Add Diagnostic Logging

Update `noteOn()` to log channel allocations:

```typescript
if (isDualVoice) {
  const channels = this.channelManager.allocateDualChannels(noteId);
  if (!channels) {
    console.warn(`[SimpleSynth] Failed to allocate dual channels for ${noteId}`);
    return;
  }

  const [ch1, ch2] = channels;
  console.log(`[SimpleSynth] Dual-voice: ${noteId} -> channels [${ch1}, ${ch2}]`);

  // ... rest of dual-voice code ...
}
```

### Add Stats Display

Add a method to SimpleSynth for debugging:

```typescript
/**
 * Get current channel allocation stats (for debugging)
 */
getChannelStats(): string {
  const stats = this.channelManager.getStats();
  return `Channels: ${stats.allocated}/9 used, ${stats.free} free, ${stats.dualVoiceNotes} dual-voice notes`;
}
```

### Expose to Browser Console

In `main.tsx` or `App.tsx`, expose synth to window:

```typescript
// For debugging only (remove in production)
if (import.meta.env.DEV) {
  (window as any).synth = synthInstance;
  console.log('Synth exposed to window.synth for debugging');
}
```

Now you can run in browser console:

```javascript
synth.getChannelStats()
// Output: "Channels: 4/9 used, 5 free, 2 dual-voice notes"
```

### Testing

```bash
npm run dev
```

Play several notes, check console for allocation logs.

### Verification

- [ ] Console shows allocation messages for each note
- [ ] Stats reflect correct channel usage
- [ ] No error messages during normal playback

---

## Task 3.4: End-to-End Testing (60 minutes)

### Test Plan

#### Test 1: InstrumentTester - Single Notes

1. Open InstrumentTester
2. Select "Acoustic Grand Piano" (dual-voice enabled)
3. Play C-4, D-4, E-4, F-4, G-4, A-4, B-4, C-5
4. **Expected**: All notes sound rich and clear (no more "crunchy" sound)
5. **Expected**: Console shows dual-voice allocations

#### Test 2: InstrumentTester - Polyphony

1. Select "Acoustic Grand Piano"
2. Play 5 notes simultaneously (C-4, E-4, G-4, C-5, E-5)
3. **Expected**: All notes play clearly (uses 10 channels: 5 notes × 2 voices)
4. **Expected**: Voice stealing kicks in (we only have 9 channels)
5. **Expected**: Oldest notes get stolen, no crashes

#### Test 3: Sequencer - Melody

1. Open Sequencer
2. Add notes to create a melody on track 1 (Acoustic Grand Piano)
3. Press Play
4. **Expected**: Music plays smoothly with rich sound
5. **Expected**: No audio glitches during channel stealing

#### Test 4: Mixed Single + Dual Voice

1. Sequencer: Track 1 = dual-voice instrument (Piano)
2. Sequencer: Track 2 = single-voice instrument (Bass)
3. Play both tracks simultaneously
4. **Expected**: Both tracks play correctly
5. **Expected**: Channel manager allocates correctly

#### Test 5: Edge Case - Rapid Notes

1. InstrumentTester: Rapidly press keys (10+ notes/second)
2. **Expected**: No crashes or audio distortion
3. **Expected**: Voice stealing handles gracefully

### Verification Checklist

- [ ] All instruments sound better than Milestone 1
- [ ] No "crunchy" sounds on non-G notes
- [ ] Dual-voice instruments use 2 channels
- [ ] Voice stealing works without glitches
- [ ] Sequencer plays correctly
- [ ] No console errors during playback

---

## Task 3.5: Backward Compatibility Verification (30 minutes)

### Test Legacy Single-Voice Instruments

1. **Disable dual-voice** for all instruments temporarily:

In `genmidiParser.ts`:

```typescript
function convertInstrument(inst: GENMIDIInstrument): OPLPatch {
  return {
    // ...
    dualVoiceEnabled: false // Force single-voice for backward compat test
  };
}
```

2. **Run app**:

```bash
npm run dev
```

3. **Test InstrumentTester** with various instruments
4. **Expected**: Everything works exactly as before (using Voice 1 only)

5. **Re-enable dual-voice**:

```typescript
dualVoiceEnabled: shouldEnableDualVoice
```

### Verification

- [ ] Single-voice mode works (backward compatible)
- [ ] Dual-voice mode works (new feature)
- [ ] No breaking changes to existing functionality

---

## Milestone 3 Success Checklist

- [x] SimpleSynth.noteOn() refactored to use ChannelManager
- [x] Dual-voice instruments play on 2 channels
- [x] Single-voice instruments still work (backward compatible)
- [x] Voice stealing works seamlessly
- [x] All instruments sound correct (richer, no "crunchy" sounds)
- [x] InstrumentTester works with dual-voice
- [x] Sequencer works with dual-voice
- [x] No audio glitches or crashes
- [x] Logging shows channel allocations correctly
- [x] Edge cases handled (rapid notes, polyphony > 9 channels)
- [x] **Bonus**: Interactive test UI created at `/dual-voice-test` route

---

## Rollback Plan

If dual-voice breaks audio:

```bash
# Restore SimpleSynth
git checkout HEAD -- src/SimpleSynth.ts

# Restore genmidiParser
git checkout HEAD -- src/utils/genmidiParser.ts

# Rebuild
npm run build
```

---

## Checkpoint: Commit Changes

```
feat(milestone-3): Implement dual-voice playback in SimpleSynth

SimpleSynth Changes:
- Refactor noteOn() to use ChannelManager for dynamic allocation
- Add programVoice() method for dual-voice programming
- Update noteOff() to release channels via ChannelManager
- Update activeNotes tracking structure to support dual-voice
- Dual-voice path: allocates 2 channels, programs both voices
- Single-voice path: allocates 1 channel (backward compatible)
- Degradation mode: falls back to single channel when needed

genmidiParser Changes:
- Add operatorDistance() heuristic to measure voice differences
- Add isDualVoiceWorthwhile() to auto-detect dual-voice instruments
- Enable dual-voice for instruments where Voice 2 differs significantly
- Log dual-voice enabled count on load

Test UI:
- Create interactive test route at /dual-voice-test
- Visual keyboard for playing notes
- Real-time channel allocation stats
- Polyphony and voice stealing test scenarios
- Event log with color-coded messages

All success criteria met:
- Dual-voice instruments use 2 channels per note
- Single-voice instruments still work (backward compatible)
- Voice stealing works seamlessly (LRU algorithm)
- No audio glitches or crashes
- Logging shows channel allocations correctly

Refs: #dual-voice-support Milestone 3
```

---

## Next Steps

After completing Milestone 3, proceed to:
- **Milestone 4**: Add UI controls for dual-voice enable/disable and polish
- See: `MILESTONE-4-UI-POLISH.md`
