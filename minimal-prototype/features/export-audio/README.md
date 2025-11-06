# Export Audio Feature

**Prototype-driven development for WAV export functionality**

---

## Quick Links

- **[SEAMLESS_LOOPS.md](SEAMLESS_LOOPS.md)** - 🆕 Seamless loop export implementation guide
- **[OVERVIEW.md](OVERVIEW.md)** - Comprehensive plan and requirements
- **[INTEGRATION_PLAN.md](INTEGRATION_PLAN.md)** - Integration phases and testing
- **[prototypes/](prototypes/)** - Incremental prototypes
- **[LESSONS_LEARNED.md](LESSONS_LEARNED.md)** - Key insights and solutions from all prototypes

---

## Current Status

**Phase:** Integration COMPLETE! (All phases ✅)

**Completed:**
- ✅ Requirements analysis
- ✅ Architecture planning
- ✅ Prototype roadmap defined
- ✅ OPL3 direct access validated
- ✅ Prototype 1: Single tone (works!)
- ✅ Frequency calculation fixed
- ✅ Prototype 2: Instrument switching (works!)
- ✅ Prototype 3: Polyphonic + sustain (CRITICAL TEST PASSED!)
- ✅ Prototype 4: Tempo changes (works!)
- ✅ Prototype 5: Full song with GENMIDI patches (works!)
- ✅ Lessons learned documented
- ✅ **Phase 0-3: Core integration complete**
- ✅ **Seamless loop export implemented**
- ✅ **CellProcessor abstraction created (eliminates code duplication)**
- ✅ **Critical sustain bug fixed**
- ✅ **Context-aware rendering working**

**Recent Enhancements (2025-01-06):**
- ✅ Seamless audio loop export using context-aware rendering
- ✅ Configurable context padding (default: 8 rows)
- ✅ Fixed critical bug where sustain was treated as note-off
- ✅ Created CellProcessor to centralize note interpretation logic
- ✅ Export now sounds identical to real-time playback

**Documentation:**
- 📖 [SEAMLESS_LOOPS.md](SEAMLESS_LOOPS.md) - Comprehensive guide to seamless loop export
- 📖 [INTEGRATION_PLAN.md](INTEGRATION_PLAN.md) - Integration phases and testing
- 📖 [LESSONS_LEARNED.md](LESSONS_LEARNED.md) - Key insights from prototypes

**Next Steps:**
1. Optional: Phase 4-6 (UI integration, comprehensive testing, polish)
2. User testing with real-world patterns

---

## Prototype Sequence

### Prototype 1: Single Tone WAV ✅
**Goal:** 1-second C-4 note exported as WAV
**Status:** Complete!
**Files:** `prototypes/prototype-1-*`
**Guide:** [PROTOTYPE_1_GUIDE.md](prototypes/PROTOTYPE_1_GUIDE.md)

### Prototype 2: Instrument Switch ✅
**Goal:** Two notes with different instruments
**Status:** Complete! (Piano → Celeste)
**Files:** `prototypes/prototype-2-*`

### Prototype 3: Polyphonic + Sustain ✅
**Goal:** Multi-track with sustained bass
**Status:** Complete! (CRITICAL TEST PASSED!)
**Files:** `prototypes/prototype-3-*`

### Prototype 4: Tempo Changes ✅
**Goal:** Same pattern at different BPMs
**Status:** Complete!
**Files:** `prototypes/prototype-4-*`

---

## Critical Requirements

1. **Reuse existing audio generation** - Must sound identical to playback
2. **Support note sustain** - `---` must not retrigger envelopes
3. **Offline rendering** - Generate without real-time playback
4. **Progress tracking** - Show generation progress to user

---

## Key Learnings

**📖 See [LESSONS_LEARNED.md](LESSONS_LEARNED.md) for comprehensive documentation!**

### Critical Discoveries

✅ **Frequency Calculation Bug (Fixed)**
- Block calculation was wrong, causing F-num overflow
- Fix: `block = Math.floor(midiNote / 12) - 1`
- See: [BUGFIX_FREQUENCY.md](prototypes/BUGFIX_FREQUENCY.md)

✅ **Note Sustain Mechanism (Critical!)**
- `null` in pattern = Do NOTHING (let note continue)
- This is what the real-time player does
- Previous attempts failed by retriggering on `---`

✅ **Envelope Retriggering Solution**
- Must key-off before key-on to retrigger attack
- Sequence: `writeReg(0xB0, 0x00)` → `writeReg(0xB0, keyOnByte)`
- Piano chord now "strikes" properly on each beat

✅ **One Sample at a Time Pattern**
```typescript
for (let i = 0; i < totalSamples; i++) {
  chip.read(buffer);  // ONE sample per call
  leftChannel[i] = buffer[0];
  rightChannel[i] = buffer[1];
}
```

### Integration-Ready

All 4 prototypes passed successfully. The approach is validated and ready for integration into the main tracker application.

---

## Testing Each Prototype

### Quick Test Checklist

For each prototype:

1. ✅ Generates valid WAV file
2. ✅ Plays in VLC/Windows Media Player
3. ✅ Sounds correct (pitch, timbre, timing)
4. ✅ No clicks/pops/glitches
5. ✅ Correct duration
6. ✅ Correct file size

### File Size Formula

```
Expected size = (sampleRate × duration × 2 channels × 2 bytes) + 44 bytes

Example for 1 second at 49,716 Hz:
= (49,716 × 1 × 2 × 2) + 44
= 198,864 + 44
= 198,908 bytes
≈ 194 KB
```

---

## Integration Plan (Later)

After all prototypes pass, we'll integrate into the main app:

1. Create `OfflineAudioRenderer` class
2. Create `WAVEncoder` utility
3. Create `ExportModal` React component
4. Add export button to Tracker UI
5. Wire up progress tracking
6. User testing

---

## Questions for Discussion

1. Should we export at 49,716 Hz (OPL3 native) or resample to 44,100 Hz (CD quality)?
2. Should we add fade-out option?
3. Should we support pattern looping (e.g., export 3x loops)?
4. Should we add silence padding at start/end?
5. What's the maximum duration we should support?

---

**Let's build this incrementally and get it right! 🎵**
