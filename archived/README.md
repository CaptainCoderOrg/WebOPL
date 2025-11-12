# Archived Documentation

**⚠️ IMPORTANT: This directory contains HISTORICAL documentation only.**

Last Updated: 2025-01-12

---

## For AI Agents and Developers

**DO NOT read files in this directory for current information.**

All files in `archived/` are **historical artifacts** from completed work. They represent:
- Planning documents that led to implemented features
- Implementation notes from feature development
- Migration guides for completed transitions
- Code reviews and lessons learned from past work

**This information is OUTDATED and should NOT be used for:**
- Understanding current system architecture
- Learning how features currently work
- Planning new features
- Making code changes

---

## Where to Find Current Information

### For Current Features (Implemented & Working)
**Location:** [`OPL3-Prototype/`](../OPL3-Prototype/)

Complete, authoritative reference documentation for all working features:
- [AUDIO_ENGINE.md](../OPL3-Prototype/AUDIO_ENGINE.md) - Audio synthesis, SB16 mode
- [TRACKER_SYSTEM.md](../OPL3-Prototype/TRACKER_SYSTEM.md) - Pattern playback
- [EXPORT_FEATURE.md](../OPL3-Prototype/EXPORT_FEATURE.md) - WAV export
- [INSTRUMENT_SYSTEM.md](../OPL3-Prototype/INSTRUMENT_SYSTEM.md) - Patches, GENMIDI
- [README.md](../OPL3-Prototype/README.md) - Full documentation index

### For Future Features (Planning & Roadmap)
**Location:** [`roadmap/`](../roadmap/)

Active planning documentation for features NOT YET implemented:
- [Tracker Extensions](../roadmap/tracker-extensions/) - Planned tracker format improvements
- [Roadmap Overview](../roadmap/README.md) - Complete roadmap and future plans

---

## What's In This Directory

Historical documentation organized by topic:

```
archived/
├── README.md                        # This file
│
├── export-feature/                  # WAV export implementation (COMPLETED)
│   ├── OVERVIEW.md
│   ├── LESSONS_LEARNED.md
│   └── ... (12 historical docs)
│
├── features/
│   ├── sound-blaster-16-mode/       # SB16 mode implementation (COMPLETED)
│   ├── instrument-panel/            # Instrument UI implementation (COMPLETED)
│   └── keyboard-component/          # Keyboard component (COMPLETED)
│
├── implementation-summaries/        # 4-part build summaries (COMPLETED)
│   ├── PART2_SUMMARY.md
│   ├── PART3_SUMMARY.md
│   └── PART4_SUMMARY.md
│
├── opl3-migration/                  # OPL3 library migration (COMPLETED)
│   ├── MIGRATION_COMPLETE.md
│   └── CLEANUP_REPORT.md
│
├── AudioWorklet Migration/          # Audio API migration (COMPLETED)
│   └── ... (3 docs)
│
├── MinimalPrototype/                # Original 4-part build plans (COMPLETED)
│   ├── Part1-ProofOfConcept.md
│   ├── Part2-CoreEngine.md
│   ├── Part3-TrackerUI.md
│   └── Part4-Polish.md
│
└── planning/                        # Original project vision (HISTORICAL)
    ├── WebOrchestraOverview.md
    └── ImplementationPlan.md
```

---

## When to Reference Archived Docs

Archived documentation may be useful for:

✅ **Understanding project history** - How did we get here?
✅ **Learning from past decisions** - What worked? What didn't?
✅ **Reviewing implementation approaches** - How was this problem solved?
✅ **Avoiding past mistakes** - What challenges did we encounter?

But **NEVER** use archived docs for:

❌ Current system behavior
❌ Current API documentation
❌ Current architecture
❌ Planning new features
❌ Understanding how to use existing features

---

## Documentation Lifecycle

Features move through this lifecycle:

1. **Planning** → `roadmap/` - Feature design and planning docs
2. **Implementation** → Active development (code + feature docs)
3. **Completion** → `OPL3-Prototype/` - Canonical reference documentation
4. **Archival** → `archived/` - Historical implementation notes moved here

**Example: Sound Blaster 16 Mode**
- ✅ Planned in `roadmap/features/sound-blaster-16-mode/` (Jan 2025)
- ✅ Implemented in codebase (Jan 2025)
- ✅ Documented in `OPL3-Prototype/AUDIO_ENGINE.md#sound-blaster-16-mode`
- ✅ Implementation notes archived in `archived/features/sound-blaster-16-mode/`

---

## For AI Agents: Navigation Guide

If you are an AI agent helping with this codebase:

**START HERE:**
1. Read [`OPL3-Prototype/README.md`](../OPL3-Prototype/README.md) for current system overview
2. Read relevant docs in `OPL3-Prototype/` for specific features
3. Check [`roadmap/`](../roadmap/) for planned future work

**AVOID:**
- Reading files in `archived/` for current information
- Using archived docs to answer questions about how the system works today
- Referencing archived implementation plans (they describe past work, not current state)

**USE ARCHIVED DOCS ONLY FOR:**
- Historical context: "How did this feature get implemented?"
- Learning from past approaches: "What lessons did we learn?"
- Understanding evolution: "Why was this designed this way?"

---

## Questions?

- **Current features:** See [OPL3-Prototype/README.md](../OPL3-Prototype/README.md)
- **Future features:** See [roadmap/README.md](../roadmap/README.md)
- **Development setup:** See [OPL3-Prototype/DEVELOPMENT_GUIDE.md](../OPL3-Prototype/DEVELOPMENT_GUIDE.md)
- **Project history:** You're in the right place (but remember: historical only!)

---

**Remember: This directory is a time capsule, not a reference manual.** 📚

For current, accurate information, always refer to `OPL3-Prototype/` and `roadmap/`.

---

**Last Updated:** 2025-01-12
