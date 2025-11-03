# Dual-Voice Instrument Support Implementation Plan

**Status:** In Progress - Phase 1 Complete ✅
**Created:** 2025-01-03
**Updated:** 2025-01-03
**Complexity:** High
**Estimated Effort:** 12-16 hours

## Overview

The DMXOPL3 GENMIDI.op2 format stores **two complete voice patches** per instrument (dual-voice architecture). Currently, our converter and synth only use the first voice, resulting in:
- Reduced sound quality (missing 50% of the patch data)
- Instruments sound "thin" or incorrect
- Missing the layered/rich sound design intended by DMXOPL3

This plan implements **Approach A: Full Dual-Voice with Dynamic Channel Allocation** to achieve authentic DMXOPL3 sound by playing both voices simultaneously. This approach prioritizes sound quality over polyphony, accepting a reduction from 9 to 4-5 simultaneous notes in exchange for rich, authentic instrument sounds.

### Key Design Decisions

- **Both voices play simultaneously** (not user-selectable alternates)
- **Dynamic channel allocation** with voice stealing when channels exhausted
- **Per-track dual-voice toggle** for flexible channel management
- **LRU voice stealing algorithm** for graceful polyphony degradation
- **Channel usage visualization** for real-time monitoring

This plan explores the architectural requirements and implementation phases for full dual-voice support while managing OPL3's 9-channel hardware limitation.

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

**Approach A: Full Dual-Voice with Dynamic Channel Allocation**

### Rationale

1. **Authentic DMXOPL3 sound:** Implements dual-voice exactly as designed, both voices play simultaneously
2. **Full fidelity:** Instruments sound as intended by the original GENMIDI.op2 format
3. **True to format:** Respects the dual-voice architecture that DMXOPL3 was built around
4. **Complete implementation:** No data is ignored or artificially combined
5. **Per-instrument control:** Can enable/disable dual-voice per instrument as needed

### Trade-offs Accepted

- **Reduced polyphony:** From 9 simultaneous notes to 4-5 notes (acceptable for 4-track sequencer)
- **Increased complexity:** Requires channel manager and voice stealing (worthwhile for quality)
- **Higher effort:** 12-16 hours vs 8 hours (justified by authentic sound)

### Why Not the Others?

- **Approach B:** Only uses one voice at a time, instruments still sound "thin"
- **Approach C:** Algorithmic merging is unreliable and loses authenticity
- **Approach D:** Inconsistent UX (different behavior in tester vs sequencer)

---

## Implementation Plan (Approach A)

### Phase 1: Data Format Updates (2-3 hours)

#### 1.1 Update Converter Script
- [x] Parse second voice operators (offset 20-32)
- [x] Parse second feedback byte
- [x] Extract second baseNote value
- [x] Output both voices to JSON with full structure

#### 1.2 Update TypeScript Interfaces
- [x] Create `OPLVoice` interface (modulator, carrier, feedback, connection)
- [x] Update `OPLPatch` to include `voice1` and `voice2`
- [x] Add `dualVoiceEnabled: boolean` field (per-instrument toggle)
- [x] Maintain backward compatibility during transition

#### 1.3 Regenerate GENMIDI.json
- [x] Run updated converter
- [x] Verify JSON structure (both voices present)
- [x] Check file size (should be ~150KB instead of 83KB - actual: ~183KB)

**Success Criteria:**
- ✅ Converter parses all 36 bytes per instrument
- ✅ JSON contains both voice1 and voice2 objects
- ✅ TypeScript compiles without errors
- ✅ `dualVoiceEnabled` flag present per instrument

---

### Phase 2: Channel Manager Implementation (3-4 hours)

#### 2.1 Create ChannelManager Class
- [ ] Track channel allocation state (9 channels: 0-8)
- [ ] `allocateChannel(noteId)`: Find free channel for single-voice
- [ ] `allocateDualChannels(noteId)`: Find 2 consecutive free channels
- [ ] `releaseChannel(channelId)`: Mark channel as free
- [ ] `releaseDualChannels(channelId1, channelId2)`: Release both
- [ ] Track which notes are using which channels

#### 2.2 Voice Stealing Algorithm
- [ ] Implement LRU (Least Recently Used) voice stealing
- [ ] When no channels available, steal oldest active note
- [ ] For dual-voice: try single-voice fallback before stealing
- [ ] Graceful degradation: dual-voice → single-voice → steal oldest

#### 2.3 Channel Allocation Strategy
- [ ] Reserve channels 0-1 for dual-voice pairs (if possible)
- [ ] Use channels 2-8 for single-voice or additional dual-voice
- [ ] Track allocation priority (recent notes preferred)

**Success Criteria:**
- ✅ ChannelManager correctly tracks 9 channels
- ✅ Can allocate/release single and dual channels
- ✅ Voice stealing works without audio artifacts
- ✅ Handles edge cases (all channels full, mixed allocations)

---

### Phase 3: SimpleSynth Refactor for Dual-Voice (3-4 hours)

#### 3.1 Update SimpleSynth.loadPatch()
- [ ] Accept `OPLPatch` with dual-voice structure
- [ ] New method: `loadDualVoicePatch(channel1, channel2, patch)`
- [ ] Load voice1 to channel1, voice2 to channel2
- [ ] Configure both channels with correct parameters

#### 3.2 Update SimpleSynth.noteOn()
- [ ] Check if instrument has `dualVoiceEnabled: true`
- [ ] If dual-voice:
  - [ ] Call `channelManager.allocateDualChannels()`
  - [ ] Load voice1 to channel1, voice2 to channel2
  - [ ] Trigger both channels with same MIDI note
- [ ] If single-voice or fallback:
  - [ ] Call `channelManager.allocateChannel()`
  - [ ] Load voice1 only (existing behavior)
- [ ] Store channel allocation for noteOff

#### 3.3 Update SimpleSynth.noteOff()
- [ ] Look up channel(s) allocated for this note
- [ ] If dual-voice: release both channels
- [ ] If single-voice: release one channel
- [ ] Update channel manager state

#### 3.4 Add Internal Tracking
- [ ] Map `noteId → [channelIds]` for active notes
- [ ] Track which channels are dual-voice pairs
- [ ] Track timestamps for LRU voice stealing

**Success Criteria:**
- ✅ Can load and play dual-voice instruments (2 channels per note)
- ✅ Can load and play single-voice instruments (1 channel per note)
- ✅ noteOn/noteOff correctly allocate/release channels
- ✅ No channel leaks (all released properly)

---

### Phase 4: UI Updates (2-3 hours)

#### 4.1 Update InstrumentSelector Component
- [ ] Add "Dual Voice" checkbox per track
- [ ] Default to ON for all instruments (can be toggled off)
- [ ] Store `dualVoiceEnabled` per track in sequencer state
- [ ] Pass `dualVoiceEnabled` to synth on instrument change

#### 4.2 Update InstrumentTester Component
- [ ] Add "Enable Dual Voice" checkbox
- [ ] Default to ON
- [ ] Reload patch when toggled
- [ ] Display channel usage (e.g., "2/9 channels used")

#### 4.3 Add Channel Usage Display
- [ ] Show real-time channel allocation meter
- [ ] Visual indicator: "X/9 channels in use"
- [ ] Warn when approaching channel limit (7+/9)
- [ ] Color-code: green (0-5), yellow (6-7), red (8-9)

#### 4.4 Update CSS
- [ ] Style dual-voice checkbox
- [ ] Style channel usage meter
- [ ] Match existing design language

**Success Criteria:**
- ✅ User can enable/disable dual-voice per track
- ✅ InstrumentTester shows dual-voice toggle clearly
- ✅ Channel usage meter updates in real-time
- ✅ UI warns when polyphony is limited

---

### Phase 5: Testing & Validation (2-3 hours)

#### 5.1 Manual Testing
- [ ] Test dual-voice ON: hear both voices playing simultaneously
- [ ] Test dual-voice OFF: hear single voice only
- [ ] Test channel exhaustion: verify voice stealing works
- [ ] Test mixed tracks: some dual, some single
- [ ] Test edge cases: rapid note on/off, all 9 channels full

#### 5.2 Data Validation
- [ ] Compare dual-voice sound vs single-voice for 10 instruments
- [ ] Verify instruments sound richer with both voices
- [ ] Document which instruments benefit most from dual-voice
- [ ] Check for instruments with identical voices (may not need dual)

#### 5.3 Performance Testing
- [ ] Test 4-track sequencer with all dual-voice enabled
- [ ] Verify polyphony: 4-5 simultaneous notes works
- [ ] Test voice stealing: no audio glitches or pops
- [ ] Test CPU usage (should be minimal, OPL3 is efficient)

#### 5.4 Build & Deploy
- [ ] Run TypeScript build
- [ ] Test production build
- [ ] Verify no console errors
- [ ] Update documentation

**Success Criteria:**
- ✅ Dual-voice instruments sound noticeably richer
- ✅ Voice stealing is smooth and artifact-free
- ✅ Polyphony matches expectations (4-5 notes with dual-voice)
- ✅ No crashes or audio glitches

---

### Phase 6: Documentation (1-2 hours)

#### 6.1 Update Implementation Docs
- [ ] Document new JSON format (dual-voice structure)
- [ ] Explain channel manager architecture
- [ ] Document voice stealing algorithm
- [ ] Update converter documentation

#### 6.2 User Documentation
- [ ] Add "Dual-Voice Support" guide
- [ ] Explain polyphony trade-offs
- [ ] Show how to enable/disable dual-voice per track
- [ ] Update InstrumentTester instructions

#### 6.3 Technical Notes
- [ ] Document channel allocation strategy
- [ ] Explain when to use dual-voice (quality vs polyphony)
- [ ] Document OPL3 hardware constraints
- [ ] Add troubleshooting section (channel exhaustion, etc.)

---

## Impact Analysis

### Files Modified

| File | Type | Impact | Effort |
|------|------|--------|--------|
| `scripts/convertDMXOPL.js` | Major | Parse both voices completely | 1.5h |
| `public/instruments/GENMIDI.json` | Major | Regenerate with dual data | 0.5h |
| `src/types/OPLPatch.ts` | Major | Add dual-voice structure | 1.5h |
| `src/utils/genmidiParser.ts` | Major | Map both voices to patches | 1h |
| `src/ChannelManager.ts` | **NEW** | Channel allocation + voice stealing | 3-4h |
| `src/SimpleSynth.ts` | **MAJOR** | Dual-voice support, refactor noteOn/Off | 3-4h |
| `src/components/InstrumentSelector.tsx` | Moderate | Add dual-voice checkbox | 1.5h |
| `src/components/InstrumentSelector.css` | Minor | Style dual-voice controls | 0.5h |
| `src/components/InstrumentTester.tsx` | Moderate | Add dual-voice toggle + channel meter | 1.5h |
| `src/components/InstrumentTester.css` | Minor | Style dual-voice UI | 0.5h |
| `src/App.tsx` | Moderate | Integrate ChannelManager | 1h |

**Total Estimated Effort:** 12-16 hours

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

## Future Enhancements (Beyond Approach A)

After implementing full dual-voice support, potential optimizations and enhancements:

1. **Advanced Voice Stealing Algorithms**
   - Priority-based stealing (preserve bass notes, steal high notes first)
   - Volume-aware stealing (steal quieter notes first)
   - Track-priority stealing (melody track > accompaniment tracks)
   - Configurable stealing strategies

2. **Intelligent Dual-Voice Detection**
   - Analyze voice1 vs voice2 parameters on load
   - Auto-disable dual-voice if voices are identical (save channels)
   - Flag instruments where dual-voice makes minimal difference
   - Create "recommended dual-voice" metadata per instrument

3. **Adaptive Polyphony Management**
   - Dynamic dual-voice toggling based on current polyphony demand
   - "Smart mode": use dual-voice when channels available, fallback to single when scarce
   - Per-track priority: important tracks get dual-voice first
   - Real-time polyphony prediction based on sequencer patterns

4. **Channel Usage Visualization**
   - Timeline view showing channel allocation over time
   - Visual debugging tool for channel manager
   - Export channel usage statistics for composition analysis

5. **OPL3 Extended Features**
   - 4-operator mode support (even more complex synthesis)
   - Percussion mode for channel 9
   - Stereo panning per channel (OPL3 supports L/R output)

**Estimated Effort:** 8-12 hours additional for items 1-3

---

## Questions & Decisions

### Q1: Should we expose both voices in JSON?
**Decision:** YES. Store both voices with full structure to enable dual-voice playback.

### Q2: How do we handle instruments where Voice 2 is empty/unused?
**Decision:** Parse and store anyway. Analyze on load and auto-disable dual-voice if voices are identical (future enhancement).

### Q3: Should dual-voice be per-track or global?
**Decision:** Per-track. Users can enable dual-voice for key tracks (melody) and disable for less important tracks to save channels.

### Q4: What if GENMIDI.op2 voices have different note mappings (baseNote1 vs baseNote2)?
**Decision:** Both voices use the same incoming MIDI note. BaseNote offsets are applied per-voice in frequency calculation. Document this behavior.

### Q5: How do we handle channel exhaustion?
**Decision:** Implement LRU voice stealing. When no channels available:
1. Try single-voice fallback (if dual-voice requested)
2. If still no channels, steal oldest active note
3. Release stolen channel(s) gracefully

### Q6: Should dual-voice be enabled by default?
**Decision:** YES by default. Users can disable per-track to free channels if needed. This prioritizes sound quality over polyphony.

---

## Success Metrics

- ✅ All 128 instruments load with both voices
- ✅ Dual-voice instruments play both voices simultaneously (can hear layered sound)
- ✅ Instruments sound noticeably richer with dual-voice enabled
- ✅ Channel manager correctly allocates/releases channels (no leaks)
- ✅ Voice stealing works smoothly without audio artifacts
- ✅ Polyphony of 4-5 simultaneous dual-voice notes achieved
- ✅ UI shows channel usage in real-time
- ✅ UI is intuitive and matches design system
- ✅ Documentation is clear and complete

---

## Rollout Plan

1. **Development:** Implement Phase 1-6 sequentially
   - Phase 1: Data format (can test converter output)
   - Phase 2: Channel manager (unit testable in isolation)
   - Phase 3: SimpleSynth refactor (most critical phase)
   - Phase 4: UI updates (visual confirmation)
   - Phase 5: Integration testing (end-to-end validation)
   - Phase 6: Documentation
2. **Testing:** Extensive manual testing with InstrumentTester
   - Test dual-voice ON/OFF comparison
   - Test channel exhaustion scenarios
   - Test voice stealing under load
3. **Documentation:** Update all docs with dual-voice architecture
4. **Commit:** "feat: Add full dual-voice support with dynamic channel allocation"
5. **User Testing:** Get feedback on sound quality and polyphony trade-offs
6. **Iterate:** Refine voice stealing algorithm and channel allocation strategy based on feedback

---

## Channel Manager Architecture

The ChannelManager is a critical new component for Approach A. It tracks OPL3's 9 hardware channels and manages allocation/deallocation for both single and dual-voice instruments.

### Core Responsibilities

1. **Channel State Tracking**
   - Track which channels (0-8) are currently allocated
   - Track which note is using which channel(s)
   - Track allocation timestamps for LRU eviction

2. **Allocation Strategies**
   - Single-voice: Allocate 1 free channel
   - Dual-voice: Allocate 2 free channels (preferably consecutive)
   - Voice stealing: Free oldest channel when all channels full

3. **Deallocation**
   - Release channels when notes end
   - Prevent channel leaks
   - Update internal state

### Class Interface

```typescript
interface ChannelAllocation {
  noteId: string;      // Unique identifier for this note (e.g., "track0_note60")
  channels: number[];  // [0] for single-voice, [0,1] for dual-voice
  timestamp: number;   // When allocated (for LRU)
}

class ChannelManager {
  private channels: boolean[];           // channels[i] = true if allocated
  private allocations: Map<string, ChannelAllocation>;

  constructor() {
    this.channels = new Array(9).fill(false);
    this.allocations = new Map();
  }

  // Allocate 1 channel for single-voice
  allocateChannel(noteId: string): number | null {
    const freeChannel = this.findFreeChannel();
    if (freeChannel !== null) {
      this.markAllocated(noteId, [freeChannel]);
      return freeChannel;
    }
    // Try voice stealing
    return this.stealChannel(noteId, 1);
  }

  // Allocate 2 channels for dual-voice
  allocateDualChannels(noteId: string): [number, number] | null {
    const freeChannels = this.findFreeChannelPair();
    if (freeChannels !== null) {
      this.markAllocated(noteId, freeChannels);
      return freeChannels;
    }
    // Try voice stealing (2 channels)
    return this.stealChannel(noteId, 2);
  }

  // Release channel(s) for a note
  releaseNote(noteId: string): void {
    const allocation = this.allocations.get(noteId);
    if (allocation) {
      allocation.channels.forEach(ch => this.channels[ch] = false);
      this.allocations.delete(noteId);
    }
  }

  // Voice stealing: evict oldest note
  private stealChannel(noteId: string, count: 1 | 2): number | [number, number] | null {
    const oldest = this.findOldestAllocation();
    if (oldest) {
      this.releaseNote(oldest.noteId);
      // Try allocating again after stealing
      return count === 1
        ? this.allocateChannel(noteId)
        : this.allocateDualChannels(noteId);
    }
    return null;
  }

  private findFreeChannel(): number | null {
    for (let i = 0; i < 9; i++) {
      if (!this.channels[i]) return i;
    }
    return null;
  }

  private findFreeChannelPair(): [number, number] | null {
    // Prefer consecutive channels for dual-voice
    for (let i = 0; i < 8; i++) {
      if (!this.channels[i] && !this.channels[i + 1]) {
        return [i, i + 1];
      }
    }
    // Fallback: any 2 free channels
    const free = [];
    for (let i = 0; i < 9; i++) {
      if (!this.channels[i]) free.push(i);
      if (free.length === 2) return [free[0], free[1]];
    }
    return null;
  }

  private findOldestAllocation(): ChannelAllocation | null {
    let oldest: ChannelAllocation | null = null;
    for (const alloc of this.allocations.values()) {
      if (!oldest || alloc.timestamp < oldest.timestamp) {
        oldest = alloc;
      }
    }
    return oldest;
  }

  private markAllocated(noteId: string, channels: number[]): void {
    channels.forEach(ch => this.channels[ch] = true);
    this.allocations.set(noteId, {
      noteId,
      channels,
      timestamp: Date.now()
    });
  }

  // Debug/UI utility
  getChannelUsage(): { used: number; total: number } {
    const used = this.channels.filter(ch => ch).length;
    return { used, total: 9 };
  }
}
```

### Integration with SimpleSynth

```typescript
class SimpleSynth {
  private channelManager: ChannelManager;

  noteOn(track: number, midiNote: number, patch: OPLPatch): void {
    const noteId = `track${track}_note${midiNote}`;

    if (patch.dualVoiceEnabled) {
      const channels = this.channelManager.allocateDualChannels(noteId);
      if (channels) {
        const [ch1, ch2] = channels;
        this.loadVoiceToCha nnel(ch1, patch.voice1);
        this.loadVoiceToChannel(ch2, patch.voice2);
        this.triggerNote(ch1, midiNote);
        this.triggerNote(ch2, midiNote);
      } else {
        // Fallback to single-voice
        this.noteOnSingleVoice(noteId, midiNote, patch);
      }
    } else {
      this.noteOnSingleVoice(noteId, midiNote, patch);
    }
  }

  noteOff(track: number, midiNote: number): void {
    const noteId = `track${track}_note${midiNote}`;
    const allocation = this.channelManager.allocations.get(noteId);

    if (allocation) {
      allocation.channels.forEach(ch => this.releaseChannel(ch));
      this.channelManager.releaseNote(noteId);
    }
  }
}
```

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
