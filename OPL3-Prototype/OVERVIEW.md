# WebOrchestra - OPL3 Music Tracker - Comprehensive Overview

**Last Updated:** 2025-01-06
**Status:** Fully Functional Prototype (Parts 1-4 Complete)

---

## Table of Contents

1. [Introduction](#introduction)
2. [What is WebOrchestra?](#what-is-webOrchestra)
3. [Current Capabilities](#current-capabilities)
4. [Technology Stack](#technology-stack)
5. [Project History](#project-history)
6. [Directory Structure](#directory-structure)
7. [Quick Start](#quick-start)
8. [Documentation Index](#documentation-index)

---

## Introduction

WebOrchestra is a web-based music tracker that uses **OPL3 FM synthesis** to create authentic 1990s-era sound (AdLib/Sound Blaster). The prototype demonstrates that high-quality, low-latency OPL3 audio synthesis is possible in modern web browsers using the Web Audio API and AudioWorklets.

This project was built incrementally over 4 phases, resulting in a fully functional music creation tool that runs entirely in the browser with no backend required.

---

## What is WebOrchestra?

### Core Concept

WebOrchestra combines:
- **Tracker-style interface** (like FastTracker, Impulse Tracker, ModPlug)
- **OPL3 FM synthesis** (Yamaha YMF262 chip emulation)
- **Modern web technologies** (React, TypeScript, Web Audio API)

### Key Features

**Music Creation:**
- 16-row × 4-track pattern editor (expandable to 8-128 rows × 16 tracks)
- Real-time note entry with keyboard navigation
- Pattern playback with BPM control (60-240)
- Visual row highlighting during playback
- Pattern loading from JSON files

**Audio Synthesis:**
- OPL3 emulation running at native 49,716 Hz sample rate
- 18 simultaneous channels (9 per OPL3 bank)
- Support for single-voice and dual-voice instruments
- GENMIDI instrument bank (175 instruments from Doom)
- Custom instrument editor for creating FM patches

**User Experience:**
- Clean, responsive React UI
- Keyboard shortcuts (Space = play/stop, Escape = stop)
- Real-time pattern validation with error highlighting
- Loading states and error handling
- Volume control with master gain

---

## Current Capabilities

### Implemented (Parts 1-4)

| Feature | Status | Description |
|---------|--------|-------------|
| **OPL3 Synthesis** | ✅ Complete | Full OPL3 emulation in AudioWorklet |
| **Multi-channel Audio** | ✅ Complete | 18 channels, dual-voice support |
| **Pattern Playback** | ✅ Complete | BPM-based timing, looping |
| **Tracker UI** | ✅ Complete | Editable grid with keyboard nav |
| **Instrument Bank** | ✅ Complete | 175 GENMIDI instruments loaded |
| **Instrument Editor** | ✅ Complete | Visual FM patch editor |
| **Pattern Validation** | ✅ Complete | Real-time error checking |
| **Volume Control** | ✅ Complete | Master volume slider |
| **Error Handling** | ✅ Complete | Loading states, error boundaries |

### Not Yet Implemented

| Feature | Priority | Notes |
|---------|----------|-------|
| **WAV Export** | 🔴 High | Main goal: Export patterns to WAV files |
| **Pattern Save/Load** | 🟡 Medium | LocalStorage or file download |
| **Multi-pattern Songs** | 🟡 Medium | Chain patterns into full songs |
| **Note Velocity** | 🟢 Low | Volume control per note |
| **Effects System** | 🟢 Low | Vibrato, pitch bends, etc. |
| **Undo/Redo** | 🟢 Low | Pattern editing history |

---

## Technology Stack

### Frontend Framework
- **Vite 7.1.7** - Build tool and dev server
- **React 19.1.1** - UI framework
- **TypeScript 5.9.3** - Type safety
- **Wouter 3.7.1** - Lightweight routing

### Audio Engine
- **opl3 (npm)** - OPL3 chip emulator (v0.4.3)
- **Web Audio API** - Browser audio infrastructure
- **AudioWorklet** - Low-latency audio processing

### Development Tools
- **ESLint** - Code linting
- **TypeScript ESLint** - TypeScript-specific linting
- **Vite Dev Server** - Hot module replacement

### Audio Processing
- **Sample Rate:** 49,716 Hz (OPL3 native)
- **Buffer Size:** 128 samples (default AudioWorklet)
- **Latency:** ~3-5ms (AudioWorklet)
- **Output:** Stereo (2 channels)

---

## Project History

### Part 1: Proof of Concept (Complete)
**Goal:** Verify OPL3 works in browser

**Achievements:**
- Successfully loaded OPL3 WASM emulator
- Generated 1-second test tone
- Proved browser-based OPL3 is viable
- Used script tag approach (later migrated to AudioWorklet)

### Part 2: Core Engine (Complete)
**Goal:** Build reusable audio engine

**Achievements:**
- `SimpleSynth` class with clean API
- 9-channel polyphony
- Note conversion utilities (C-4 ↔ MIDI 60)
- 27 passing unit tests
- 5 audio test buttons

### Part 3: Tracker UI (Complete)
**Goal:** Build pattern editor and playback

**Achievements:**
- `SimplePlayer` for pattern playback
- `TrackerGrid` component for note entry
- BPM control and timing
- Keyboard navigation (arrows, tab, enter)
- Current row highlighting during playback
- Pattern loading/clearing

### Part 4: Polish (Complete)
**Goal:** Production-ready experience

**Achievements:**
- Pattern validation with error highlighting
- Keyboard shortcuts (Space, Escape)
- Loading states and error boundaries
- Help documentation
- Professional UI polish

### OPL3 Migration (Complete)
**Goal:** Migrate from old OPL library to modern npm package

**Achievements:**
- Migrated from `@malvineous/opl` to `opl3` npm package
- Implemented AudioWorklet for better performance
- Added 18-channel support (OPL3 full capability)
- Loaded GENMIDI instrument bank (175 instruments)
- Built custom instrument editor
- Added dual-voice instrument support
- Implemented channel manager for dynamic allocation

---

## Directory Structure

```
minimal-prototype/
├── public/
│   ├── instruments/
│   │   ├── GENMIDI.json         # 175 Doom instruments
│   │   └── README.md            # Instrument bank docs
│   ├── patterns/
│   │   ├── catalog.json         # Pattern library index
│   │   ├── *.json               # Example patterns
│   │   └── README.md            # Pattern format docs
│   └── opl-worklet-processor.js # AudioWorklet audio thread
│
├── src/
│   ├── components/              # React UI components
│   │   ├── Tracker.tsx          # Main tracker component
│   │   ├── TrackerGrid.tsx      # Editable note grid
│   │   ├── InstrumentEditor.tsx # FM patch editor
│   │   ├── InstrumentSelector.tsx
│   │   ├── InstrumentTester.tsx
│   │   ├── PianoKeyboard/       # Piano keyboard UI
│   │   ├── VolumeControl.tsx    # Master volume slider
│   │   └── [Test components]    # Various test UIs
│   │
│   ├── constants/
│   │   └── midiToOPL.ts         # MIDI → OPL3 frequency conversion
│   │
│   ├── data/
│   │   └── defaultPatches.ts    # Built-in instrument presets
│   │
│   ├── types/
│   │   ├── OPLPatch.ts          # Instrument patch types
│   │   ├── PatternFile.ts       # Pattern file types
│   │   └── opl3.d.ts            # OPL3 library type definitions
│   │
│   ├── utils/
│   │   ├── ChannelManager.ts    # Channel allocation logic
│   │   ├── noteConversion.ts    # Note name ↔ MIDI conversion
│   │   ├── patternValidation.ts # Pattern validation
│   │   ├── patternLoader.ts     # Load patterns from JSON
│   │   ├── genmidiParser.ts     # GENMIDI bank parser
│   │   └── keyboardUtils.ts     # Keyboard helpers
│   │
│   ├── SimpleSynth.ts           # Core audio engine
│   ├── SimplePlayer.ts          # Pattern playback engine
│   ├── App.tsx                  # Main React app
│   ├── ErrorBoundary.tsx        # Error handling wrapper
│   ├── main.tsx                 # Entry point
│   └── [CSS files]
│
├── scripts/
│   └── convertDMXOPL.js         # GENMIDI conversion tool
│
├── [Documentation files]
│   ├── README.md                # Main project README
│   ├── PART2_SUMMARY.md         # Part 2 summary
│   ├── PART3_SUMMARY.md         # Part 3 summary
│   ├── PART4_SUMMARY.md         # Part 4 summary
│   ├── MIGRATION_COMPLETE.md    # OPL3 migration summary
│   └── IMPLEMENTATION_PLAN_OPL3_MIGRATION.md
│
├── package.json                 # NPM dependencies
├── vite.config.ts              # Vite build config
├── tsconfig.json               # TypeScript config
└── eslint.config.js            # ESLint config
```

---

## Quick Start

### Installation

```bash
cd minimal-prototype
npm install
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Build for Production

```bash
npm run build
```

Output: `dist/` directory

### Run Tests

```bash
# Unit tests (note conversion)
npm run dev
# Open browser console to see test results
```

---

## Using the Tracker

### Basic Workflow

1. **Load Example Pattern**
   - Click "Load Pattern" dropdown
   - Select a pattern (e.g., "Major Scale")
   - Grid fills with notes

2. **Play Music**
   - Click "▶ Play" button (or press Space)
   - Watch current row highlight in green
   - Hear OPL3 synthesis

3. **Edit Notes**
   - Click any cell
   - Type note names: `C-4`, `D#5`, `A-3`
   - Use `---` for rests
   - Press Enter to move down, Tab to move right

4. **Change Instruments**
   - Use dropdown above each track
   - Select from 175 GENMIDI instruments
   - Click "Edit" to open FM patch editor

5. **Adjust BPM**
   - Change BPM slider (60-240)
   - Pattern tempo updates in real-time

### Keyboard Shortcuts

- **Space** - Play/Stop
- **Escape** - Stop
- **Arrow Keys** - Navigate grid
- **Enter** - Move down
- **Tab** - Move right
- **Delete** - Clear cell

---

## Documentation Index

### This Directory (OPL3-Prototype/)

| Document | Description |
|----------|-------------|
| **OVERVIEW.md** (this file) | Project overview and quick start |
| **ARCHITECTURE.md** | System architecture and design |
| **AUDIO_ENGINE.md** | SimpleSynth and audio processing |
| **TRACKER_SYSTEM.md** | Pattern playback and UI |
| **INSTRUMENT_SYSTEM.md** | OPL3 patches and GENMIDI |
| **DEVELOPMENT_GUIDE.md** | How to develop and extend |
| **WAV_EXPORT_PLAN.md** | Plan for WAV export feature |

### Original Directory (minimal-prototype/)

| Document | Description |
|----------|-------------|
| README.md | Main project README |
| PART2_SUMMARY.md | Part 2: Core Engine summary |
| PART3_SUMMARY.md | Part 3: Tracker UI summary |
| PART4_SUMMARY.md | Part 4: Polish summary |
| MIGRATION_COMPLETE.md | OPL3 migration summary |

---

## Next Steps

**Immediate Goal:** Implement WAV export functionality

See [WAV_EXPORT_PLAN.md](WAV_EXPORT_PLAN.md) for detailed implementation plan.

---

## Browser Compatibility

**Tested and Working:**
- ✅ Chrome/Edge (recommended)
- ✅ Firefox

**Requirements:**
- Modern browser with AudioWorklet support
- User interaction required to start AudioContext

**Known Issues:**
- None currently blocking

---

## License

This is a prototype/proof-of-concept. See main project for licensing.

---

## Contact

For questions or contributions, see the main WebOPL repository.
