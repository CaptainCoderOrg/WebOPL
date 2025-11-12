# WebOPL Roadmap

**Active planning and design documentation for future features**

Last Updated: 2025-01-12

---

## Purpose of This Directory

This directory contains **active planning documentation** for features that are **not yet implemented**. These are design documents, research, and implementation plans for future work on the WebOPL project.

**Key distinction:**
- **`roadmap/`** = Active planning for unimplemented features (you are here)
- **`OPL3-Prototype/`** = Canonical reference documentation for completed features
- **`archived/`** = Historical implementation notes for completed work

---

## Current Active Plans

### Tracker Extensions (Priority: High)

**Location:** [tracker-extensions/](tracker-extensions/)

**Problem:** MIDI to tracker conversion loses critical musical data (velocity, duration, polyphony, effects).

**Solution:** Extend the tracker format to preserve all MIDI performance data without loss.

**Status:** Planning complete, ready for implementation

**Files:**
- [README.md](tracker-extensions/README.md) - Overview and problem statement
- [TRACKER-EXTENSION-PLAN.md](tracker-extensions/TRACKER-EXTENSION-PLAN.md) - Detailed implementation plan
- [MIDI-CONVERSION-ISSUES-SUMMARY.md](tracker-extensions/MIDI-CONVERSION-ISSUES-SUMMARY.md) - Problem analysis
- [MIDI-CONVERSION-DATA-LOSS.md](tracker-extensions/MIDI-CONVERSION-DATA-LOSS.md) - Velocity/duration loss details
- [MIDI-TRACK-LOSS-ANALYSIS.md](tracker-extensions/MIDI-TRACK-LOSS-ANALYSIS.md) - Track allocation issues
- [MIDI-POLYPHONY-LOSS-ANALYSIS.md](tracker-extensions/MIDI-POLYPHONY-LOSS-ANALYSIS.md) - Chord/harmony loss
- [OPL3-PARAMETER-MAPPING.md](tracker-extensions/OPL3-PARAMETER-MAPPING.md) - Complete OPL3 register reference

**Estimated Effort:** 4-16 days

**See also:** [OPL3-Prototype/TRACKER_SYSTEM.md](../OPL3-Prototype/TRACKER_SYSTEM.md) for current tracker implementation

---

## Future Considerations

Additional features under consideration (not yet planned):

- **MIDI Import Improvements** - Better instrument mapping, tempo detection
- **Pattern Library System** - Save/load pattern templates
- **Collaborative Editing** - Multi-user pattern editing
- **Advanced Effects** - Additional tracker effects beyond current set
- **Performance Optimization** - Reduce CPU usage, improve rendering speed

These are potential future directions, not committed work.

---

## When Plans Become Reality

Once a feature is implemented:

1. **Remove from roadmap** - Delete or archive the planning docs
2. **Add to OPL3-Prototype** - Create canonical reference documentation
3. **Archive implementation notes** - Move detailed notes to `archived/features/`

**Example:**
- Sound Blaster 16 Mode started in `roadmap/features/sound-blaster-16-mode/`
- Now documented in `OPL3-Prototype/AUDIO_ENGINE.md#sound-blaster-16-mode`
- Implementation notes archived in `archived/features/sound-blaster-16-mode/`

---

## Contributing

If you're planning a new feature:

1. **Create a subdirectory** in `roadmap/` with a descriptive name
2. **Write a README.md** explaining the problem, solution, and approach
3. **Include implementation plan** with phases, tasks, and estimates
4. **Reference existing documentation** from `OPL3-Prototype/` as needed
5. **Start development** when the plan is reviewed and approved

---

## Documentation Structure

```
WebOPL/
├── roadmap/                     # Future features (planning stage)
│   ├── README.md                # This file
│   └── tracker-extensions/      # Tracker format extension plans
│
├── OPL3-Prototype/              # Current features (canonical reference)
│   ├── AUDIO_ENGINE.md
│   ├── TRACKER_SYSTEM.md
│   └── ...
│
└── archived/                    # Past features (historical notes)
    └── features/
        ├── sound-blaster-16-mode/
        └── export-feature/
```

---

## Questions?

For questions about:
- **Current features:** See [OPL3-Prototype/README.md](../OPL3-Prototype/README.md)
- **Development setup:** See [OPL3-Prototype/DEVELOPMENT_GUIDE.md](../OPL3-Prototype/DEVELOPMENT_GUIDE.md)
- **Project history:** See [archived/](../archived/)
- **Roadmap items:** Read the specific feature documentation in this directory

---

**Last Updated:** 2025-01-12
