# WebOPL Roadmap

**Active planning and design documentation for future features**

Last Updated: 2025-11-12

---

## Purpose of This Directory

This directory contains **active planning documentation** for features that are **not yet implemented**. These are design documents, research, and implementation plans for future work on the WebOPL project.

**Key distinction:**
- **`roadmap/`** = Active planning for unimplemented features (you are here)
- **`OPL3-Prototype/`** = Canonical reference documentation for completed features
- **`archived/`** = Historical implementation notes for completed work

---

## Current Active Plans

**No active feature plans at this time.**

All previously planned features have been completed and documented in [OPL3-Prototype/](../OPL3-Prototype/).

---

## Recently Completed Features

### Tracker Extensions ✅ COMPLETE (2025-11-12)

Extended the tracker format to preserve full musical expression from MIDI files.

**Delivered:**
- ✅ Per-note velocity control (0-64 scale)
- ✅ Explicit note-off markers
- ✅ Dynamic polyphony (automatic track allocation)
- ✅ Effect commands (ECx note cut, EDx note delay)

**Documentation:** [OPL3-Prototype/TRACKER_SYSTEM.md#extended-tracker-format](../OPL3-Prototype/TRACKER_SYSTEM.md#extended-tracker-format)

**Impact:** Doom E1M1 conversion now preserves all 2,332 notes across 11 tracks with full dynamics and articulation.

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

1. **Remove from roadmap** - Delete the planning docs from roadmap/
2. **Add to OPL3-Prototype** - Create canonical reference documentation

**Examples:**
- **Sound Blaster 16 Mode** - Documented in [OPL3-Prototype/AUDIO_ENGINE.md#sound-blaster-16-mode](../OPL3-Prototype/AUDIO_ENGINE.md#sound-blaster-16-mode)
- **Tracker Extensions** - Documented in [OPL3-Prototype/TRACKER_SYSTEM.md#extended-tracker-format](../OPL3-Prototype/TRACKER_SYSTEM.md#extended-tracker-format)

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
│   └── README.md                # This file
│
├── OPL3-Prototype/              # Current features (canonical reference)
│   ├── AUDIO_ENGINE.md
│   ├── TRACKER_SYSTEM.md
│   └── ...
│
└── archived/                    # Past features (historical notes)
    └── features/
        ├── sound-blaster-16-mode/
        ├── export-feature/
        └── tracker-extensions/
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
