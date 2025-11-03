# Dual-Voice Instrument Support Implementation Plan

**Status:** Planning
**Created:** 2025-01-03
**Complexity:** High
**Estimated Effort:** 8-12 hours

## Overview

The DMXOPL3 GENMIDI.op2 format stores **two complete voice patches** per instrument (dual-voice architecture). Currently, our converter and synth only use the first voice, resulting in:
- Reduced sound quality (missing 50% of the patch data)
- Instruments sound "thin" or incorrect
- Missing the layered/rich sound design intended by DMXOPL3

This plan explores how to properly support dual-voice instruments while managing OPL3's 9-channel hardware limitation.

## Current State Analysis

### GENMIDI.op2 Binary Format (Per Instrument, 36 bytes)

```
Offset  Size  Description
0-1     2     flags (uint16)
2       1     finetune (uint8)
3       1     note (uint8)
4-9     6     Voice 1 Modulator Operator
10      1     Voice 1 Feedback byte
11-16   6     Voice 1 Carrier Operator
17      1     unused
18-19   2     baseNote1 (int16)
20-25   6     Voice 2 Modulator Operator  ← CURRENTLY IGNORED
26      1     Voice 2 Feedback byte        ← CURRENTLY IGNORED
27-32   6     Voice 2 Carrier Operator     ← CURRENTLY IGNORED
33      1     unused
34-35   2     baseNote2 (int16)            ← CURRENTLY IGNORED
```

### Current JSON Format

```json
{
  "id": 0,
  "name": "Acoustic Grand Piano",
  "mod": { /* Voice 1 modulator */ },
  "car": { /* Voice 1 carrier */ },
  "feedback": 7,
  "additive": false
}
```

### OPL3 Hardware Constraints

- **9 simultaneous channels** (0-8)
- Each channel = 1 modulator + 1 carrier = 1 voice
- Dual-voice instrument = 2 channels = 2 voices playing same note simultaneously
- Current 4-track system: 4 channels used for single-voice instruments

## Implementation Approaches

### Approach A: Full Dual-Voice with Dynamic Channel Allocation

**Description:** Load both voices, allocate 2 channels per note when possible.

**Architecture:**
```typescript
interface OPLPatch {
  id: number;
  name: string;
  voice1: {
    modulator: OPLOperator;
    carrier: OPLOperator;
    feedback: number;
    connection: 'fm' | 'additive';
  };
  voice2: {
    modulator: OPLOperator;
    carrier: OPLOperator;
    feedback: number;
    connection: 'fm' | 'additive';
  };
  dualVoiceEnabled: boolean; // Use both voices if true
}
```

**Synth Changes:**
- Track channel allocation (which channels are free)
- `noteOn()` allocates 2 channels if dual-voice enabled and channels available
- Fallback to single voice if only 1 channel free
- `noteOff()` releases both channels

**Pros:**
- ✅ Full fidelity to DMXOPL3 design
- ✅ Instruments sound as intended
- ✅ Can toggle dual-voice per instrument

**Cons:**
- ❌ Complex channel management
- ❌ Reduced polyphony (4 tracks → 2 dual-voice notes simultaneously)
- ❌ Need sophisticated voice stealing algorithm
- ❌ Major refactor of SimpleSynth

**Polyphony Impact:**
- Single-voice: 9 notes simultaneously
- Dual-voice: 4-5 notes simultaneously (if all instruments use dual-voice)
- Mixed: Depends on allocation

---

### Approach B: Single Voice with User Selection

**Description:** Store both voices but let user choose which to use (Voice 1 or Voice 2).

**Architecture:**
```typescript
interface OPLPatch {
  id: number;
  name: string;
  voice1: {
    modulator: OPLOperator;
    carrier: OPLOperator;
    feedback: number;
    connection: 'fm' | 'additive';
  };
  voice2: {
    modulator: OPLOperator;
    carrier: OPLOperator;
    feedback: number;
    connection: 'fm' | 'additive';
  };
  activeVoice: 1 | 2; // Which voice to use
}
```

**UI Changes:**
- InstrumentSelector: Add "Voice 1/2" toggle per track
- InstrumentTester: Add "Voice 1/2" toggle

**Pros:**
- ✅ Simple implementation (minimal synth changes)
- ✅ No polyphony reduction
- ✅ User can experiment with both voices
- ✅ All data preserved in JSON

**Cons:**
- ❌ Not true dual-voice (only one voice active)
- ❌ Instruments still sound "thin"
- ❌ Requires user intervention to switch voices

---

### Approach C: Merged Voices (Algorithmic Combination)

**Description:** Analyze both voices and merge them into a single "best" voice.

**Algorithm:**
- Compare operator parameters (attack, decay, sustain, release, etc.)
- Average or choose "stronger" characteristics
- Combine waveforms intelligently
- Use higher feedback value

**Pros:**
- ✅ No synth architecture changes
- ✅ No polyphony reduction
- ✅ Automated (no user intervention)

**Cons:**
- ❌ Loses fidelity (not authentic DMXOPL3)
- ❌ Complex merging algorithm
- ❌ May produce unexpected results
- ❌ Still not true dual-voice

---

### Approach D: Hybrid - Dual-Voice for InstrumentTester Only

**Description:** Support dual-voice in InstrumentTester (single note testing), but use voice selection for 4-track sequencer.

**Implementation:**
- InstrumentTester: Always allocate 2 channels for testing (channels 0-1)
- Sequencer: Use `activeVoice` selection (1 or 2) per track
- JSON stores both voices

**Pros:**
- ✅ Can hear "true" instrument sound in tester
- ✅ Sequencer remains simple (no polyphony issues)
- ✅ Moderate complexity
- ✅ Best of both worlds

**Cons:**
- ❌ Inconsistent behavior (tester ≠ sequencer)
- ❌ Sequencer still doesn't get full dual-voice

---

## Recommended Approach

**Approach B: Single Voice with User Selection**

### Rationale

1. **Solves the immediate problem:** We can extract and preserve all GENMIDI.op2 data
2. **Manageable complexity:** No major SimpleSynth refactor needed
3. **User control:** Musicians can choose the voice that works best for their composition
4. **Future-proof:** Data structure supports upgrading to Approach A later
5. **No polyphony sacrifice:** Maintains 9-channel capacity

### Why Not the Others?

- **Approach A:** Too complex for current prototype, reduces polyphony significantly
- **Approach C:** Algorithmic merging is unreliable and loses authenticity
- **Approach D:** Inconsistent UX (different behavior in tester vs sequencer)

---

## Implementation Plan (Approach B)

### Phase 1: Data Format Updates (2 hours)

#### 1.1 Update Converter Script
- [x] Parse second voice operators (offset 20-32)
- [x] Parse second feedback byte
- [x] Extract second baseNote value
- [x] Output both voices to JSON

#### 1.2 Update TypeScript Interfaces
- [x] Create `OPLVoice` interface
- [x] Update `OPLPatch` to include `voice1` and `voice2`
- [x] Add `activeVoice: 1 | 2` field
- [x] Maintain backward compatibility during transition

#### 1.3 Regenerate GENMIDI.json
- [x] Run updated converter
- [x] Verify JSON structure
- [x] Check file size (should be ~150KB instead of 83KB)

**Success Criteria:**
- ✅ Converter parses all 36 bytes per instrument
- ✅ JSON contains both voice1 and voice2 objects
- ✅ TypeScript compiles without errors

---

### Phase 2: Synth Adapter Layer (2 hours)

#### 2.1 Update genmidiParser.ts
- [x] Map JSON `voice1`/`voice2` to OPLPatch format
- [x] Add voice selection logic
- [x] Handle `activeVoice` field

#### 2.2 Update SimpleSynth.loadPatch()
- [x] Accept which voice to load (1 or 2)
- [x] No internal logic changes (still loads 1 voice per channel)
- [x] Preserve existing behavior

**Success Criteria:**
- ✅ Can load either voice1 or voice2 to a channel
- ✅ Existing tests pass
- ✅ Backward compatible with old JSON (fallback to voice1)

---

### Phase 3: UI Updates (3 hours)

#### 3.1 Update InstrumentSelector Component
- [x] Add "Voice" dropdown next to each track
  - Options: "Voice 1" | "Voice 2"
  - Default: "Voice 1"
- [x] Store `activeVoice` per track in sequencer state
- [x] Pass `activeVoice` to `onInstrumentChange` handler

#### 3.2 Update InstrumentTester Component
- [x] Add "Active Voice" toggle (radio buttons)
- [x] Reload patch when voice selection changes
- [x] Display which voice is currently active

#### 3.3 Update CSS
- [x] Style voice selection controls
- [x] Match existing design language

**Success Criteria:**
- ✅ User can select Voice 1 or Voice 2 per track
- ✅ Voice selection persists during session
- ✅ InstrumentTester shows voice selection clearly

---

### Phase 4: Testing & Validation (2 hours)

#### 4.1 Manual Testing
- [x] Test switching voices in InstrumentTester (hear difference)
- [x] Test voice selection per track in sequencer
- [x] Verify different voices sound distinct
- [x] Test edge cases (switching during playback, etc.)

#### 4.2 Data Validation
- [x] Compare Voice 1 vs Voice 2 parameters for several instruments
- [x] Verify some instruments have identical voices (check if dual-voice needed)
- [x] Document which instruments benefit most from dual-voice

#### 4.3 Build & Deploy
- [x] Run TypeScript build
- [x] Test production build
- [x] Update documentation

**Success Criteria:**
- ✅ All instruments load correctly with both voices
- ✅ Voice switching works smoothly
- ✅ No audio artifacts or crashes

---

### Phase 5: Documentation (1 hour)

#### 5.1 Update Implementation Docs
- [x] Document new JSON format
- [x] Explain voice selection feature
- [x] Update converter documentation

#### 5.2 User Documentation
- [x] Add "Voice Selection" guide
- [x] Explain when to use Voice 1 vs Voice 2
- [x] Update InstrumentTester instructions

#### 5.3 Technical Notes
- [x] Document why full dual-voice not implemented (yet)
- [x] Document path to upgrade to Approach A in future

---

## Impact Analysis

### Files Modified

| File | Type | Impact | Effort |
|------|------|--------|--------|
| `scripts/convertDMXOPL.js` | Major | Parse second voice | 1h |
| `public/instruments/GENMIDI.json` | Major | Regenerate with dual data | 0.5h |
| `src/types/OPLPatch.ts` | Major | Add voice structure | 1h |
| `src/utils/genmidiParser.ts` | Major | Map both voices | 1h |
| `src/SimpleSynth.ts` | Minor | Accept voice parameter | 0.5h |
| `src/components/InstrumentSelector.tsx` | Moderate | Add voice dropdown | 1.5h |
| `src/components/InstrumentSelector.css` | Minor | Style voice controls | 0.5h |
| `src/components/InstrumentTester.tsx` | Moderate | Add voice toggle | 1h |
| `src/components/InstrumentTester.css` | Minor | Style voice toggle | 0.5h |
| `src/App.tsx` | Minor | Pass voice state | 0.5h |

**Total Estimated Effort:** ~8 hours

### Backward Compatibility

- Old JSON format (single voice): Will work via fallback logic
- Existing sequencer files: Will load with Voice 1 by default
- No breaking changes to public API

---

## Testing Strategy

### Unit Tests (Future)
- Test converter parses both voices correctly
- Test genmidiParser maps voices correctly
- Test voice selection logic

### Integration Tests
- Load instrument with Voice 1, play note
- Load instrument with Voice 2, play note
- Switch voices during playback
- Multi-track sequencer with mixed voices

### Manual Test Cases

#### Test 1: Voice Comparison
1. Open InstrumentTester
2. Select "Acoustic Grand Piano"
3. Set Voice 1, play C-4
4. Set Voice 2, play C-4
5. **Expected:** Different timbres/characteristics

#### Test 2: Multi-Track Voice Selection
1. Open 4-Track Sequencer
2. Track 1: Piano, Voice 1
3. Track 2: Piano, Voice 2
4. Track 3: Trumpet, Voice 1
5. Track 4: Trumpet, Voice 2
6. Play sequence
7. **Expected:** Each track sounds distinct

#### Test 3: Voice Persistence
1. Select Voice 2 for Track 1
2. Change instrument
3. **Expected:** Still uses Voice 2

---

## Future Enhancements (Approach A)

If we later want full dual-voice support:

1. **Implement Channel Manager**
   - Track which channels are allocated
   - Implement voice stealing algorithm
   - Handle channel exhaustion gracefully

2. **Update SimpleSynth**
   - `noteOn()` allocates 2 channels if available
   - `noteOff()` releases both channels
   - Add `dualVoiceEnabled` per instrument

3. **Add UI Toggle**
   - Per-instrument "Use Dual Voice" checkbox
   - Show channel usage meter (e.g., "5/9 channels used")
   - Warn when polyphony reduced

4. **Testing**
   - Test with various polyphony scenarios
   - Ensure voice stealing doesn't cause artifacts
   - Verify dual-voice sounds correct vs original DMXOPL3

**Estimated Effort for Approach A:** 12-16 hours additional

---

## Questions & Decisions

### Q1: Should we expose both voices in JSON, even if only using one?
**Decision:** YES. Store both voices so we can upgrade to full dual-voice later without re-parsing.

### Q2: How do we handle instruments where Voice 2 is empty/unused?
**Decision:** Parse and store anyway. If Voice 2 parameters are all zero, UI can gray out "Voice 2" option.

### Q3: Should voice selection be per-track or global?
**Decision:** Per-track. Different tracks may benefit from different voices.

### Q4: What if GENMIDI.op2 voices have different note mappings?
**Decision:** Document this in README. User must experiment to find best voice for their use case.

---

## Success Metrics

- ✅ All 128 instruments load with both voices
- ✅ Voice switching is instant and glitch-free
- ✅ Instruments sound noticeably different between voices
- ✅ No polyphony reduction
- ✅ UI is intuitive and matches design system
- ✅ Documentation is clear and complete

---

## Rollout Plan

1. **Development:** Implement Phase 1-4
2. **Testing:** Manual testing with InstrumentTester
3. **Documentation:** Update all docs
4. **Commit:** "feat: Add dual-voice support with voice selection"
5. **User Testing:** Get feedback on voice selection UX
6. **Iterate:** Refine based on feedback

---

## Appendix A: GENMIDI.op2 Voice Byte Layout

### Voice Structure (20 bytes per voice)

```
Offset  Size  Field
0-5     6     Modulator Operator
  0     1     AM/VIB/EG/KSR/MULT byte
  1     1     KSL/Output Level
  2     1     Attack/Decay
  3     1     Sustain/Release
  4     1     Waveform
  5     1     (unused in DMXOPL)
6       1     Feedback byte (bits 1-3=feedback, bit 0=connection)
7-12    6     Carrier Operator (same structure as modulator)
13      1     (unused)
14-15   2     Base Note (int16, -1200 to +1200 cents)
```

---

## Appendix B: Example JSON Structure (Dual-Voice)

```json
{
  "id": 0,
  "name": "Acoustic Grand Piano",
  "voice1": {
    "modulator": {
      "trem": false,
      "vib": false,
      "sus": true,
      "ksr": true,
      "multi": 3,
      "attack": 14,
      "decay": 1,
      "sustain": 2,
      "release": 3,
      "wave": 2,
      "ksl": 2,
      "out": 37
    },
    "carrier": {
      "trem": false,
      "vib": false,
      "sus": true,
      "ksr": true,
      "multi": 1,
      "attack": 15,
      "decay": 1,
      "sustain": 15,
      "release": 4,
      "wave": 4,
      "ksl": 0,
      "out": 9
    },
    "feedback": 7,
    "connection": "additive"
  },
  "voice2": {
    "modulator": { /* ... */ },
    "carrier": { /* ... */ },
    "feedback": 6,
    "connection": "fm"
  },
  "activeVoice": 1
}
```

---

## Appendix C: Alternative Naming Conventions

If "Voice 1/2" is confusing, consider:
- "Primary/Secondary"
- "Layer A/B"
- "Channel 1/2"
- "Operator Set 1/2"

**Recommendation:** Stick with "Voice 1/2" as it matches GENMIDI.op2 documentation.

---

## References

- [Kaitai Struct GENMIDI.op2 Spec](https://formats.kaitai.io/genmidi_op2/)
- [DMXOPL GitHub Repository](https://github.com/sneakernets/DMXOPL)
- [OPL3 Programming Guide](http://www.fit.vutbr.cz/~arnost/opl/opl3.html)
- Current Implementation: `features/instrument-panel/milestone-4-5-implementation.md`
