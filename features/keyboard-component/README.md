# Piano Keyboard Component

A reusable, interactive piano keyboard component for WebOPL.

## Quick Start

```typescript
import { PianoKeyboard } from './components/PianoKeyboard';

// Basic usage - 1 octave interactive keyboard
<PianoKeyboard
  startNote={60}  // C-4
  endNote={72}    // C-5
  onNoteOn={(note) => synth.noteOn(channel, note)}
  onNoteOff={(note) => synth.noteOff(channel, note)}
/>
```

## Features

- 🎹 **Dynamic Range**: Display any range of notes (e.g., C-4 to C-5, C-3 to C-6)
- 🖱️ **Interactive**: Click keys to play notes
- 🎵 **Drag-to-Play**: Hold and drag across keys for glissando effect
- 👁️ **Visualization**: Highlight notes being played by the tracker
- 🎨 **Track Indicators**: Show active tracks with colored bars
- 📐 **Responsive**: Automatically scales to fit container
- 🎨 **Modes**: Standard and compact sizing options
- 🎛️ **Test Page**: Comprehensive test interface at `/test-keyboard`
- ♿ **Accessible**: ARIA labels and keyboard-friendly design

## Documentation

- [DESIGN.md](./DESIGN.md) - Complete design specification
- [IMPLEMENTATION.md](./IMPLEMENTATION.md) - Step-by-step implementation guide

## Status

**Current Phase**: Phase 4 Complete ✅ (Phase 3 skipped)
**Integrated**: Piano keyboard now in InstrumentEditor for real-time testing
**Next Step**: Phase 5 (Testing & Refinement) - Comprehensive testing across browsers/devices

## Use Cases

### 1. Instrument Editor Preview
Allow users to test instruments by clicking piano keys:
```typescript
<PianoKeyboard
  startNote={60}
  endNote={72}
  height={100}
  showLabels={true}
  onNoteOn={(note) => synth.noteOn(8, note)}
  onNoteOff={(note) => synth.noteOff(8, note)}
/>
```

### 2. Pattern Playback Visualization
Show which notes are currently playing:
```typescript
<PianoKeyboard
  startNote={48}
  endNote={84}
  activeNotes={currentlyPlayingNotes}
  compact={true}
  disabled={true}  // Visualization only
/>
```

### 3. Note Input Tool
Alternative method for entering notes into the tracker:
```typescript
<PianoKeyboard
  startNote={60}
  endNote={84}
  showLabels={true}
  onNoteOn={(note) => addNoteToPattern(currentRow, currentTrack, note)}
/>
```

## Implementation Timeline

| Phase | Description | Time | Status |
|-------|-------------|------|--------|
| 1 | Core component & geometry | 2-3 hours | ✅ Complete |
| 2 | Interaction handlers | 1-2 hours | ✅ Complete |
| 3 | Visual polish | 1-2 hours | ⏸️ Skipped |
| 4 | Integration | 1-2 hours | ✅ Complete |
| 5 | Testing | 1-2 hours | ⏸️ Not Started |

**Total**: 6-11 hours
**Completed**: ~4-5 hours (Phases 1, 2, 4)

## Design Decisions

### Why Not Flexbox?
Our previous attempt using flexbox for white keys had persistent alignment issues with black keys. This implementation uses:
- **CSS Grid** for container structure
- **Absolute positioning** with calculated offsets for all keys
- **Explicit pixel positioning** based on white key boundaries

This approach provides pixel-perfect alignment while still supporting responsive scaling.

### Scaling Strategy
The component calculates its required width based on:
```
totalWidth = (whiteKeyCount × whiteKeyWidth) + ((whiteKeyCount - 1) × gap)
```

If the container is narrower, the entire keyboard scales down proportionally using CSS `transform: scale()`.

## Props API

```typescript
interface PianoKeyboardProps {
  startNote: number;           // MIDI note (0-127)
  endNote: number;             // MIDI note (0-127)
  height?: number;             // Pixels (default: 80)
  activeNotes?: Set<number>;   // Highlighted notes
  onNoteOn?: (note: number) => void;
  onNoteOff?: (note: number) => void;
  disabled?: boolean;          // Disable interaction
  showLabels?: boolean;        // Show note names
  compact?: boolean;           // Smaller sizing
}
```

## Dependencies

- React (existing)
- TypeScript (existing)
- SimpleSynth (existing)

**No external dependencies required** - uses plain CSS and standard React hooks.

## Contributing

Before making changes:
1. Review [DESIGN.md](./DESIGN.md) for architectural decisions
2. Follow the implementation plan in [IMPLEMENTATION.md](./IMPLEMENTATION.md)
3. Run tests before committing
4. Update documentation for API changes

## License

Part of the WebOPL project. See main project LICENSE for details.
