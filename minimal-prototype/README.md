# WebOrchestra - Minimal Prototype

A minimal web-based music tracker with OPL3 (AdLib/Sound Blaster) FM synthesis.

**Current Status:** Part 2 Complete ✅

---

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 and test the audio engine!

---

## What's Implemented

### ✅ Part 1: Proof of Concept
- OPL3 synthesis working in browser
- Web Audio API integration
- Script tag WASM loading approach
- 1-second test tone playback

### ✅ Part 2: Core Engine
- **SimpleSynth** class with clean API
- **9-channel polyphony** (simultaneous notes)
- **Note conversion** utilities (C-4 ↔ MIDI 60)
- **5 audio tests** (single, chord, scale, arpeggio, polyphonic)
- **27 unit tests** (all passing)

### 🚧 Part 3: Tracker UI (Coming Next)
- SimplePlayer for pattern playback
- TrackerGrid for note entry
- Play/stop controls
- BPM adjustment

### 🚧 Part 4: Polish
- Pattern validation
- Keyboard shortcuts
- Error handling
- Visual feedback

---

## Project Structure

```
minimal-prototype/
├── public/
│   ├── lib/
│   │   ├── opl.js           # OPL3 WASM loader
│   │   └── opl.wasm         # OPL3 emulator binary
│   └── opl-wrapper.js       # Modified wrapper (window.OPL)
├── src/
│   ├── utils/
│   │   └── noteConversion.ts    # Note conversion + tests
│   ├── SimpleSynth.ts           # Core synth engine
│   ├── App.tsx                  # Test suite UI
│   ├── App.css                  # Styling
│   ├── index.css                # Global styles
│   └── main.tsx                 # Entry point
├── IMPLEMENTATION_NOTES.md      # Detailed implementation docs
├── PART2_SUMMARY.md             # Part 2 summary
└── package.json
```

---

## Technology Stack

- **Framework:** Vite + React 18 + TypeScript
- **OPL Emulator:** @malvineous/opl (v1.0.0)
- **Audio API:** Web Audio API + ScriptProcessorNode
- **Sample Rate:** 49716 Hz (OPL3 native)
- **Build Tool:** Vite with WASM plugins

---

## SimpleSynth API

```typescript
import { SimpleSynth } from './SimpleSynth';
import { noteNameToMIDI } from './utils/noteConversion';

// Initialize
const synth = new SimpleSynth();
await synth.init();

// Play middle C on channel 0
const midiNote = noteNameToMIDI('C-4')!; // 60
synth.noteOn(0, midiNote);

// Release after 1 second
setTimeout(() => synth.noteOff(0, midiNote), 1000);

// Play chord (C major)
synth.noteOn(0, 60); // C
synth.noteOn(1, 64); // E
synth.noteOn(2, 67); // G
```

---

## Note Conversion

```typescript
import { noteNameToMIDI, midiToNoteName } from './utils/noteConversion';

// Convert note names to MIDI
noteNameToMIDI('C-4')  // → 60 (middle C)
noteNameToMIDI('A-4')  // → 69 (A440)
noteNameToMIDI('C#4')  // → 61 (C sharp)
noteNameToMIDI('---')  // → null (rest)

// Convert MIDI to note names
midiToNoteName(60)  // → 'C-4'
midiToNoteName(69)  // → 'A-4'
```

---

## Testing

### Run All Tests

```bash
npm run dev
```

Open browser console to see:
- 27 note conversion tests (all ✅)
- SimpleSynth initialization logs

### Audio Tests

Click each button in the UI:

1. **Play Single Note** - 1-second middle C
2. **Play Chord** - C major harmony (3 notes)
3. **Play Scale** - C major ascending (8 notes)
4. **Play Arpeggio** - Fast pattern
5. **Play Polyphonic** - Melody + bass together

### Build Test

```bash
npm run build
```

Expected output:
```
✓ built in 1.85s
dist/index.html                  0.46 kB
dist/assets/index-*.css          2.32 kB
dist/assets/index-*.js         299.47 kB
```

---

## Key Features

### 9-Channel Polyphony
- Play up to 9 simultaneous notes
- Each channel has independent pitch control
- Automatic instrument setup per channel

### Note Conversion
- Supports formats: `C-4`, `C4`, `C#4`, `Db4`
- Handles rests: `---`, `...`, empty string
- Validates MIDI range (0-127)

### Clean API
- Simple note on/off methods
- Channel management
- All OPL complexity hidden

---

## Documentation

- **[IMPLEMENTATION_NOTES.md](IMPLEMENTATION_NOTES.md)** - Full technical details
- **[PART2_SUMMARY.md](PART2_SUMMARY.md)** - Part 2 summary
- **[../MinimalPrototype/](../MinimalPrototype/)** - Implementation plans

---

## Browser Compatibility

**Tested:**
- ✅ Chrome/Edge (recommended)
- ✅ Firefox

**Known Issues:**
- ScriptProcessorNode is deprecated (will migrate to AudioWorklet)
- AudioContext requires user interaction to start

---

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

---

## Next Steps

Ready to implement **Part 3: Tracker UI**:
- [ ] SimplePlayer class for pattern playback
- [ ] TrackerGrid component for note entry
- [ ] Play/stop/pause controls
- [ ] BPM slider (60-240)
- [ ] Pattern looping

---

## License

This is a prototype/proof-of-concept. See main project for licensing.

---

**Last Updated:** 2025-01-02
