# OPL3-Prototype Documentation

**Comprehensive reference documentation for the WebOrchestra OPL3 Music Tracker**

Last Updated: 2025-01-12

---

## About This Directory

This directory contains detailed technical documentation for the WebOrchestra minimal prototype - a fully functional OPL3 music tracker running in modern web browsers.

The documentation is organized to serve as both:
- **Reference material** for understanding how the system works
- **Development guide** for extending and maintaining the codebase
- **Progress tracking** for the ongoing development effort

---

## Documentation Index

### Core Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| **[OVERVIEW.md](OVERVIEW.md)** | Project introduction, capabilities, quick start | Everyone |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | System design, component diagrams, data flow | Developers |
| **[AUDIO_ENGINE.md](AUDIO_ENGINE.md)** | SimpleSynth, OPL3 details, AudioWorklet, SB16 mode | Audio developers |
| **[TRACKER_SYSTEM.md](TRACKER_SYSTEM.md)** | Pattern playback, UI components, timing | UI developers |
| **[INSTRUMENT_SYSTEM.md](INSTRUMENT_SYSTEM.md)** | OPL3 patches, GENMIDI, instrument editor | Sound designers |
| **[EXPORT_FEATURE.md](EXPORT_FEATURE.md)** | WAV export, seamless loops, post-processing | Audio developers |
| **[DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)** | Setup, adding features, testing, troubleshooting | All developers |

### Original Project Documentation

- **[README.md](../minimal-prototype/README.md)** - Main project README (active)

### Roadmap & Future Plans

Active planning documentation for unimplemented features:

- **[Tracker Extensions](../roadmap/tracker-extensions/)** - Extend tracker format to preserve MIDI data (velocity, duration, polyphony, effects)
- **[Roadmap Overview](../roadmap/README.md)** - Complete roadmap and planning documentation

### Archived Documentation

Historical implementation and migration documents:

- **[PART2_SUMMARY.md](../archived/implementation-summaries/PART2_SUMMARY.md)** - Core engine implementation
- **[PART3_SUMMARY.md](../archived/implementation-summaries/PART3_SUMMARY.md)** - Tracker UI implementation
- **[PART4_SUMMARY.md](../archived/implementation-summaries/PART4_SUMMARY.md)** - Polish and validation
- **[MIGRATION_COMPLETE.md](../archived/opl3-migration/MIGRATION_COMPLETE.md)** - OPL3 library migration

---

## Quick Navigation

### I want to...

**...understand what this project is**
→ Start with [OVERVIEW.md](OVERVIEW.md)

**...understand how the audio works**
→ Read [AUDIO_ENGINE.md](AUDIO_ENGINE.md)

**...understand how patterns play back**
→ Read [TRACKER_SYSTEM.md](TRACKER_SYSTEM.md)

**...create or edit instruments**
→ Read [INSTRUMENT_SYSTEM.md](INSTRUMENT_SYSTEM.md)

**...set up my development environment**
→ Read [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)

**...understand the system architecture**
→ Read [ARCHITECTURE.md](ARCHITECTURE.md)

**...export patterns to WAV files**
→ Read [EXPORT_FEATURE.md](EXPORT_FEATURE.md)

**...emulate Sound Blaster 16 hardware**
→ Read [AUDIO_ENGINE.md#sound-blaster-16-mode](AUDIO_ENGINE.md#sound-blaster-16-mode)

**...extend the tracker format (future)**
→ Read [Tracker Extensions Roadmap](../roadmap/tracker-extensions/)

---

## Project Status

### What's Complete ✅

- **OPL3 Synthesis Engine** - Fully functional with 18 channels
- **Pattern Playback** - BPM-based timing with looping
- **Tracker UI** - Editable grid with keyboard navigation
- **Instrument System** - 175 GENMIDI instruments + custom editor
- **Validation** - Real-time error checking
- **Volume Control** - Master gain adjustment
- **Polish** - Loading states, error handling, keyboard shortcuts
- **WAV Export** - Seamless loops, post-processing, waveform preview
- **Sound Blaster 16 Mode** - Analog hardware emulation with biquad filters

---

## Key Technologies

### Audio
- **OPL3 Emulator** (npm: `opl3` v0.4.3)
- **Web Audio API** (AudioWorklet for low latency)
- **Sample Rate:** 49,716 Hz (OPL3 native)

### Frontend
- **React 19** (with TypeScript)
- **Vite 7** (build tool)
- **Wouter** (routing)

### Development
- **TypeScript 5.9**
- **ESLint** (code quality)
- **Hot Module Replacement** (fast development)

---

## System Overview

### Component Hierarchy

```
App.tsx
├── SimpleSynth (Audio Engine)
│   ├── AudioWorklet (opl-worklet-processor.js)
│   ├── ChannelManager (Dynamic allocation)
│   └── OPL3 Chip Emulator
│
├── SimplePlayer (Pattern Playback)
│   ├── BPM Timing
│   └── Note Scheduling
│
└── Tracker Component (UI)
    ├── TrackerGrid (Note Editor)
    ├── InstrumentSelector
    ├── VolumeControl
    └── Pattern Controls
```

### Data Flow

```
User Input (Note Entry)
    ↓
Pattern Validation
    ↓
Pattern Data Structure
    ↓
SimplePlayer (Timing)
    ↓
SimpleSynth (Audio)
    ↓
AudioWorklet (Processing)
    ↓
OPL3 Emulator
    ↓
Audio Output (Speakers)
```

---

## Architecture Highlights

### Layered Design

1. **UI Layer** - React components, user interaction
2. **Business Logic** - Pattern playback, instrument management
3. **Audio Engine** - OPL3 synthesis, channel allocation
4. **Hardware Layer** - AudioWorklet, Web Audio API

### Key Design Decisions

**AudioWorklet for Low Latency**
- 3-5ms latency (vs 20-50ms with ScriptProcessorNode)
- Runs in separate thread
- Modern standard

**Dynamic Channel Allocation**
- Maximizes polyphony
- Supports dual-voice instruments
- Efficient resource usage

**One Sample at a Time**
- Critical for OPL3 accuracy
- Maintains emulator state
- Proven pattern from working tests

**BPM-based Timing**
- Simple and effective
- Adjustable in real-time
- Good enough for prototype

---

## Code Statistics

### File Organization

```
Total: ~8,000 lines of code

Core Engine:      SimpleSynth.ts        (580 lines)
Pattern Player:   SimplePlayer.ts       (250 lines)
Main UI:          Tracker.tsx           (450 lines)
Instrument Editor:InstrumentEditor.tsx  (400 lines)
AudioWorklet:     opl-worklet-processor (210 lines)
Utilities:        Various               (800 lines)
Components:       Various               (2,000 lines)
Types:            Various               (300 lines)
Documentation:    Various               (3,000+ lines)
```

### Test Coverage

- 27 unit tests (note conversion)
- 5 audio tests (engine validation)
- Manual test components for UI

---

## Performance Characteristics

### Latency
- **AudioWorklet:** 2-3ms
- **Browser stack:** 1-2ms
- **Total:** 3-5ms (imperceptible)

### CPU Usage
- **OPL3 synthesis:** Low (optimized C++ emulator)
- **Pattern playback:** Minimal (simple timing)
- **React UI:** Medium (only during interaction)

### Memory
- **OPL3 emulator:** ~500 KB
- **React app:** ~300 KB
- **GENMIDI bank:** ~50 KB
- **Total:** ~1 MB (reasonable for web app)

---

## Browser Support

### Tested and Working ✅
- Chrome 90+ (recommended)
- Edge 90+
- Firefox 88+

### Requirements
- AudioWorklet support
- ES2020 JavaScript
- WebAssembly support
- User interaction for AudioContext

### Known Limitations
- Safari may have issues (AudioWorklet less stable)
- Mobile browsers work but UI not optimized

---

## Development Workflow

### Quick Start

```bash
cd minimal-prototype
npm install
npm run dev
```

### Common Commands

```bash
npm run dev       # Start dev server (http://localhost:5173)
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Check code quality
```

### Development Cycle

1. Edit code in `src/`
2. Changes hot-reload in browser
3. Check console for errors
4. Test audio/UI functionality
5. Run `npm run build` before commit

---

## Contributing Guidelines

### Code Style

- **TypeScript** - Explicit types for parameters
- **React** - Functional components with hooks
- **Naming** - camelCase for functions, PascalCase for components
- **Comments** - JSDoc for public APIs

### Testing

- Add unit tests for utilities
- Manual test all audio functionality
- Test in multiple browsers
- Check console for errors

### Documentation

- Update relevant .md files
- Add JSDoc comments for new functions
- Include examples for complex features
- Keep documentation in sync with code

---

## Getting Help

### Debugging Tips

1. **Check browser console** - Most errors show there
2. **Verify AudioContext state** - Must be 'running'
3. **Check OPL3 initialization** - Look for success logs
4. **Test with example patterns** - Rule out pattern issues
5. **Try different browsers** - Chrome usually most stable

### Common Issues

- **No audio:** User interaction required, click to resume
- **Pattern not playing:** Validate note format
- **Build errors:** Check TypeScript, run `npm run lint`
- **Import errors:** Verify file paths (case-sensitive)

### Resources

- OPL3 Programming Guide: [Link](http://www.shipbrook.net/jeff/sb.html)
- Web Audio API Docs: [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- AudioWorklet Guide: [Chrome Developers](https://developer.chrome.com/blog/audio-worklet/)

---

## Next Steps

Ready to dive in? Here's the recommended reading order:

1. **[OVERVIEW.md](OVERVIEW.md)** - Get the big picture
2. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Understand the system design
3. **[AUDIO_ENGINE.md](AUDIO_ENGINE.md)** - Learn how audio works
4. **[DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)** - Start coding!

---

## About the Project

WebOrchestra is an educational project demonstrating that authentic 1990s OPL3 sound synthesis is possible in modern web browsers using the Web Audio API. It serves as both a functional music tracker and a reference implementation for browser-based audio synthesis.

**Built with:**
- Love for retro sound
- Modern web technologies
- Educational intent
- Open source spirit

**Inspiration:**
- FastTracker 2
- Impulse Tracker
- Doom (GENMIDI instruments)
- AdLib / Sound Blaster era

---

## License

See main project for licensing information.

---

**Happy hacking! 🎵**
