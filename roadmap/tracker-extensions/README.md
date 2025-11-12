# Tracker Extensions Documentation

This directory contains documentation for extending WebOPL's tracker format to support advanced musical expression features.

---

## Overview

WebOPL currently uses a simplified tracker format that loses critical musical data during MIDI conversion. This documentation set outlines the problems, research findings, and implementation plan to restore full musical expressiveness while maintaining the tracker workflow.

---

## Document Index

### 📋 [TRACKER-EXTENSION-PLAN.md](TRACKER-EXTENSION-PLAN.md)
**The master implementation plan**

Comprehensive guide covering:
- File format specification (YAML schema)
- Implementation phases with detailed code changes
- Testing strategy
- Timeline estimates (4-16 days depending on scope)
- Success criteria

**Start here** if you want to understand the full implementation approach.

---

### 🔴 [MIDI-CONVERSION-ISSUES-SUMMARY.md](MIDI-CONVERSION-ISSUES-SUMMARY.md)
**Master summary of all data loss issues**

High-level overview of problems:
1. **Velocity/Volume Loss** - All notes same volume (100% loss)
2. **Note Duration Loss** - Wrong note lengths (100% loss)
3. **Track Conflicts** - Missing guitar parts (~50% loss)
4. **Timing Quantization** - Robotic timing (~20% loss)

Includes priority order and impact analysis showing why E1M1 doesn't sound like Doom.

---

### 📊 [MIDI-CONVERSION-DATA-LOSS.md](MIDI-CONVERSION-DATA-LOSS.md)
**Detailed analysis of velocity and duration data loss**

Technical deep-dive into:
- Where velocity is captured but discarded (line-by-line analysis)
- Note-off events captured but never written to YAML
- Timing quantization to 16th note grid
- Impact on drums (robotic, flat sound)
- Impact on melodies (no articulation)

Includes code examples showing exactly where data is lost in `convertMIDIToPattern.js`.

---

### 🎸 [MIDI-TRACK-LOSS-ANALYSIS.md](MIDI-TRACK-LOSS-ANALYSIS.md)
**Analysis of track conflict issues**

Explains why we're missing guitar tracks:
- E1M1 has 11 MIDI tracks → We output 4 tracks
- Multiple MIDI tracks use same channels
- Converter uses channel as array index (overwrites!)
- Result: 2 of 4 guitar tracks completely lost

Includes proposed fixes (use track index instead of channel).

---

### 🎹 [MIDI-POLYPHONY-LOSS-ANALYSIS.md](MIDI-POLYPHONY-LOSS-ANALYSIS.md)
**Analysis of polyphony/chord issues**

Explains why we're losing chord notes:
- MIDI channels can play multiple notes simultaneously (chords, harmonies)
- Our format: one note per track per row
- When C-4 + E-4 + G-4 play together, only G-4 is saved
- Result: Lost chord notes, harmonies, layered parts

Includes proposed fix (automatic track splitting for polyphony).

---

### ⚙️ [OPL3-PARAMETER-MAPPING.md](OPL3-PARAMETER-MAPPING.md)
**Complete OPL3 chip parameter reference**

Technical reference for:
- All 13 operator parameters (ADSR, waveform, etc.)
- Voice-level parameters (feedback, connection)
- Register mapping (0x20-0xC8)
- **Attenuation conversion formula**: `dB = -(out × 0.75)`
- UI translation notes for building instrument editors

**Conclusion**: All parameters are correctly mapped, chip emulation is accurate.

---

## Problem Statement

Our MIDI to pattern conversion process is losing significant musical data:

| Issue | Impact | Priority |
|-------|--------|----------|
| **Velocity data loss** | All notes same volume, drums sound robotic | 🔴 Critical |
| **Note-off data loss** | Wrong note lengths, percussion muddy | 🔴 Critical |
| **Track conflicts** | Missing ~50% of E1M1 guitar parts | 🔴 Critical |
| **Polyphony loss** | Lost chord notes, harmonies, layered parts | 🔴 Critical |
| **Timing quantization** | Loses groove and swing | 🟡 Moderate |

**Result**: Our E1M1 sounds completely different from original Doom music, despite having accurate OPL3 chip emulation.

---

## Solution Approach

**Extend the tracker format** (not build a piano roll) because:

1. ✅ Traditional tracker formats (MOD, XM, S3M, IT) have proven solutions for all our issues
2. ✅ Much less development effort than building a piano roll
3. ✅ Maintains tracker aesthetic and workflow
4. ✅ Backward compatible with existing patterns
5. ✅ Fits retro/Doom heritage of the project

### Key Features to Add

1. **Per-note velocity** (volume column) - 0-64 range
2. **Explicit note-offs** - `"OFF"` command
3. **Effect commands** - `ECx` (note cut), `EDx` (note delay)
4. **Track mapping fix** - Use MIDI track index instead of channel

### Extended Format Example

```yaml
pattern:
  - [
      {n: "C-4", v: 48},           # Note with velocity
      {n: "E-4", v: 64, fx: "ED3"}, # Delayed note (swing)
      {n: "OFF"},                   # Explicit note-off
      {n: "G-4", v: 32, fx: "EC8"}  # Quiet note, cut after 8 ticks
    ]
```

---

## Implementation Status

**Status**: 📋 **DOCUMENTED - READY FOR IMPLEMENTATION**

All research is complete. Implementation plan is detailed and ready to execute.

### Implementation Phases

| Phase | Description | Effort | Status |
|-------|-------------|--------|--------|
| **Phase 1** | Velocity support | 2-3 days | 📋 Planned |
| **Phase 2** | Note-off support | 1-2 days | 📋 Planned |
| **Phase 3** | Track conflict fix | 1-2 days | 📋 Planned |
| **Phase 4** | Effect commands (optional) | 3-4 days | 📋 Planned |
| **Phase 5** | Higher resolution (optional) | 1 day | 📋 Planned |
| **Phase 6-8** | UI enhancements (optional) | 3-5 days | 📋 Planned |

**Total Core Implementation**: 4-7 days (Phases 1-3)
**Total With Effects**: 7-11 days (Phases 1-4)

---

## Expected Impact

After implementing Phases 1-3:

### E1M1 Comparison

**Before** (Current):
- ❌ 4 tracks (missing guitars)
- ❌ All notes same volume
- ❌ No note-offs (muddy sound)
- ❌ Grid-locked timing
- **Sounds**: Thin, flat, robotic

**After** (With Extensions):
- ✅ 6-8 tracks (all guitars present)
- ✅ Dynamic accents (drums alive)
- ✅ Proper articulation (crisp percussion)
- ✅ Natural timing (with effects)
- **Sounds**: Rich, dynamic, musical

### Data Recovery

- **~50% of guitar tracks** restored (track fix)
- **100% of velocity data** restored (volume column)
- **100% of duration data** restored (note-offs)
- **~20% timing precision** restored (effects)

**Result**: E1M1 should sound **much closer** to original Doom music.

---

## Related Files

### Source Code Files to Modify

1. `minimal-prototype/src/utils/patternLoader.ts` - Parse extended format
2. `minimal-prototype/src/PatternPlayer.ts` - Handle velocity and effects
3. `minimal-prototype/src/SimpleSynth.ts` - Scale volume by velocity
4. `minimal-prototype/scripts/convertMIDIToPattern.js` - Write full data, fix tracks
5. `minimal-prototype/src/export/exportPattern.ts` - Export with velocity
6. `minimal-prototype/src/components/Tracker.tsx` - UI for velocity/effects (optional)

### Test Files

1. `minimal-prototype/midis/M_E1M1.mid` - Original Doom E1M1 MIDI (test case)
2. `minimal-prototype/public/patterns/e1m1-doom.yaml` - Converted pattern (will improve)

---

## Quick Start Guide

### For Implementers

1. **Read** [TRACKER-EXTENSION-PLAN.md](TRACKER-EXTENSION-PLAN.md) for full details
2. **Start with Phase 1** (velocity support) - highest impact
3. **Test incrementally** after each phase
4. **Use E1M1 as benchmark** - compare to original Doom sound

### For Reviewers

1. **Read** [MIDI-CONVERSION-ISSUES-SUMMARY.md](MIDI-CONVERSION-ISSUES-SUMMARY.md) for problem overview
2. **Review** [TRACKER-EXTENSION-PLAN.md](TRACKER-EXTENSION-PLAN.md) for proposed solution
3. **Check** detailed analysis docs for technical justification

---

## Questions & Answers

### Why not use a piano roll?

Tracker formats already solve all our problems with proven conventions. Building a piano roll would take much longer (weeks) and lose the tracker aesthetic that fits this project's retro/Doom heritage.

### Will this break existing patterns?

No. The format is backward compatible. Simple string cells like `"C-4"` continue to work, defaulting to full velocity. Object notation like `{n: "C-4", v: 48}` is opt-in.

### How much work is this?

**Core features** (Phases 1-3): 4-7 days
- Velocity, note-offs, track fix
- Massive impact on sound quality

**With effects** (Phases 1-4): 7-11 days
- Adds sub-row timing (swing/humanization)
- Polish and refinement

### Will this make files larger?

Slightly, but not significantly. We use shorthand notation (omit defaults, use simple strings when possible). A complex pattern might grow 20-30%, but most patterns will be similar size.

### Can we import from XM/IT/S3M formats?

Not in the initial plan, but the format is similar enough that import would be feasible as a future enhancement.

---

## Success Metrics

Implementation will be considered successful when:

- ✅ E1M1 sounds **much closer** to original Doom
- ✅ Drums have dynamic accents (loud/soft hits)
- ✅ Percussion sounds crisp (short, clean hits)
- ✅ All guitar parts are audible (no missing tracks)
- ✅ Music has depth and groove (not flat/robotic)
- ✅ Old patterns continue to work (backward compatible)
- ✅ MIDI conversion preserves all data (no loss)

---

## Contributing

When implementing these features:

1. **Follow the plan phases** - Don't skip ahead
2. **Test incrementally** - Verify each phase works
3. **Maintain backward compatibility** - Old patterns must work
4. **Document changes** - Update this README if needed
5. **Use E1M1 as benchmark** - Compare to original Doom

---

## Contact

For questions about this implementation plan, refer to:
- Issue tracker: (TBD)
- Discussion forum: (TBD)

---

**Last Updated**: 2025-11-12
**Status**: Ready for implementation
**Estimated Effort**: 4-16 days (depending on scope)
