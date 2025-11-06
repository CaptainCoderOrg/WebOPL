# Export Audio Feature

**Prototype-driven development for WAV export functionality**

---

## Quick Links

- **[OVERVIEW.md](OVERVIEW.md)** - Comprehensive plan and requirements
- **[prototypes/](prototypes/)** - Incremental prototypes (to be created)

---

## Current Status

**Phase:** Prototyping (3 of 4 complete)

**Completed:**
- ✅ Requirements analysis
- ✅ Architecture planning
- ✅ Prototype roadmap defined
- ✅ OPL3 direct access validated
- ✅ Prototype 1: Single tone (works!)
- ✅ Frequency calculation fixed
- ✅ Prototype 2: Instrument switching (works!)
- ✅ Prototype 3: Polyphonic + sustain (CRITICAL TEST PASSED!)

**In Progress:**
- 🔄 Prototype 4: Tempo changes (final prototype - ready to test!)

**Next Steps:**
1. Test Prototype 4 (tempo changes)
2. Integration into main tracker app

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

### Prototype 4: Tempo Changes 🔄
**Goal:** Same pattern at different BPMs
**Status:** Ready to test!
**Files:** `prototypes/prototype-4-*`

---

## Critical Requirements

1. **Reuse existing audio generation** - Must sound identical to playback
2. **Support note sustain** - `---` must not retrigger envelopes
3. **Offline rendering** - Generate without real-time playback
4. **Progress tracking** - Show generation progress to user

---

## Key Learnings (To be updated)

### What Works

- TBD after prototypes

### What Doesn't Work

- TBD after prototypes

### Gotchas

- TBD after prototypes

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
