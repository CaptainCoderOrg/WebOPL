# WebOrchestra - Minimal Prototype

A minimal web-based music tracker with OPL3 (AdLib/Sound Blaster) FM synthesis.

**Current Status:** Part 3 Complete ✅

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

### ✅ Part 3: Tracker UI
- **SimplePlayer** for pattern playback
- **TrackerGrid** for note entry (16 rows × 4 tracks)
- **Play/stop controls** with BPM adjustment
- **Keyboard navigation** (arrows, enter, tab, delete)
- **Current row highlighting** during playback
- **Pattern loading/clearing**

### 🚧 Part 4: Polish (Coming Next)
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
│   ├── components/
│   │   ├── TrackerGrid.tsx      # Editable note grid
│   │   └── TrackerGrid.css      # Grid styling
│   ├── utils/
│   │   └── noteConversion.ts    # Note conversion + tests
│   ├── SimpleSynth.ts           # Core synth engine
│   ├── SimplePlayer.ts          # Pattern playback engine
│   ├── App.tsx                  # Tracker UI
│   ├── App.css                  # Tracker styling
│   ├── index.css                # Global styles
│   └── main.tsx                 # Entry point
├── IMPLEMENTATION_NOTES.md      # Detailed implementation docs
├── PART2_SUMMARY.md             # Part 2 summary
├── PART3_SUMMARY.md             # Part 3 summary
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

## Using the Tracker

### Run the App

```bash
npm run dev
```

Open http://localhost:5173 and you'll see the full tracker interface!

### Quick Tutorial

1. **Load Example Pattern**
   - Click "📝 Load Example" button
   - Grid fills with a demo pattern

2. **Play Music**
   - Click "▶ Play" button
   - Watch the current row highlight
   - Hear melody + bass + chords

3. **Edit Notes**
   - Click any cell in the grid
   - Type note names: `C-4`, `D#5`, `A-3`
   - Use `---` for rests
   - Press Enter to move down, Tab to move right

4. **Change BPM**
   - Adjust the BPM number (60-240)
   - Click Play to hear faster/slower tempo

5. **Clear Pattern**
   - Click "🗑️ Clear" to reset grid

### Build Test

```bash
npm run build
```

Expected output:
```
✓ built in 1.96s
dist/index.html                  0.46 kB
dist/assets/index-*.css          3.90 kB
dist/assets/index-*.js         301.64 kB
```

---

## Key Features

### Full Tracker Interface
- **16 rows × 4 tracks** editable grid
- **Keyboard navigation** (arrows, enter, tab, delete)
- **Real-time playback** with visual row highlighting
- **BPM control** (60-240)
- **Pattern loading/clearing**

### 9-Channel Polyphony
- Play up to 9 simultaneous notes
- 4 tracks playing simultaneously
- Each channel has independent pitch control
- Automatic instrument setup per channel

### Note Conversion
- Supports formats: `C-4`, `C4`, `C#4`, `Db4`
- Handles rests: `---`, `...`, empty string
- Validates MIDI range (0-127)

### Clean APIs
- **SimpleSynth** - Note on/off methods, channel management
- **SimplePlayer** - Pattern loading, playback control, BPM timing
- **TrackerGrid** - Editable grid with keyboard navigation

---

## Documentation

- **[COMPLETION_SUMMARY.md](COMPLETION_SUMMARY.md)** - 🎉 MVP completion summary
- **[IMPLEMENTATION_NOTES.md](IMPLEMENTATION_NOTES.md)** - Full technical details (Parts 1-3)
- **[PART2_SUMMARY.md](PART2_SUMMARY.md)** - Part 2: Core Engine summary
- **[PART3_SUMMARY.md](PART3_SUMMARY.md)** - Part 3: Tracker UI summary
- **[../MinimalPrototype.md](../MinimalPrototype.md)** - Original implementation plan

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

Ready to implement **Part 4: Polish**:
- [ ] Pattern validation (highlight invalid notes)
- [ ] Keyboard shortcuts (Space = play/stop, Escape = stop)
- [ ] Better error handling and loading states
- [ ] Visual feedback improvements
- [ ] Mobile responsiveness

---

## License

This is a prototype/proof-of-concept. See main project for licensing.

---

**Last Updated:** 2025-01-02
