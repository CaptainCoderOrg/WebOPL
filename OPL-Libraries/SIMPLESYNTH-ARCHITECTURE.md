# SimpleSynth Architecture: Dual-Mode Design

**Date:** 2025-01-11
**Component:** SimpleSynth.ts

---

## Overview

SimpleSynth is designed to work in **two modes**:

1. **Real-time Browser Playback** (AudioWorklet mode)
2. **Offline Export/Rendering** (Direct mode)

Both modes use the **same SimpleSynth code** for instrument loading and note triggering, but use different OPL chip adapters.

---

## Architecture Pattern: IOPLChip Interface

SimpleSynth communicates with the OPL3 chip through the `IOPLChip` interface, which abstracts the underlying implementation:

```typescript
// IOPLChip.ts
export interface IOPLChip {
  write(array: number, address: number, value: number): void;
  read(buffer: Int16Array): void;
}
```

This allows SimpleSynth to be **chip-implementation agnostic** - it doesn't care whether it's talking to:
- An AudioWorklet running OPL3 in real-time
- A direct OPL3 instance for offline rendering

---

## Mode 1: Real-Time Browser Playback

### Initialization (App.tsx)

```typescript
// App.tsx lines 58-59
const s = new SimpleSynth();
await s.init();  // No chip parameter = AudioWorklet mode
```

### SimpleSynth Behavior

When `init()` is called **without** a chip parameter:

1. Creates `AudioContext` with OPL3's sample rate (49716 Hz)
2. Loads OPL3 browser bundle code
3. Creates `AudioWorkletNode` running `opl-worklet-processor.js`
4. Wraps the worklet in `WorkletOPLChip` adapter
5. Stores in `this.oplChip`

```typescript
// SimpleSynth.ts lines 54-98
// Otherwise, initialize AudioWorklet for real-time playback
this.audioContext = new AudioContext({ sampleRate: 49716 });

// [... load worklet ...]

this.oplChip = new WorkletOPLChip(this.workletNode);
```

### Audio Flow

```
User Input
    ↓
SimpleSynth.noteOn()
    ↓
SimpleSynth.writeOPL()
    ↓
WorkletOPLChip.write()
    ↓
AudioWorkletNode (postMessage)
    ↓
opl-worklet-processor.js
    ↓
OPL3 chip (in worklet)
    ↓
Audio samples generated
    ↓
Web Audio API
    ↓
Speaker output (real-time)
```

### Characteristics

- **Real-time:** Audio plays immediately
- **Low-latency:** AudioWorklet is optimized for performance
- **Interactive:** User can play notes via keyboard/UI
- **Continuous:** Audio keeps playing until stopped

---

## Mode 2: Offline Export/Rendering

### Initialization (OfflineAudioRenderer.ts)

```typescript
// OfflineAudioRenderer.ts lines 44-56
const OPL3Class = await loadOPL3Library();
const chip = new OPL3Class();

const directChip = new DirectOPLChip(chip);

const synth = new SimpleSynth();
await synth.init(directChip);  // WITH chip parameter = Offline mode
```

### SimpleSynth Behavior

When `init()` is called **with** a chip parameter:

1. Stores the provided chip adapter directly in `this.oplChip`
2. No AudioContext created
3. No AudioWorklet loaded
4. Skips all Web Audio setup

```typescript
// SimpleSynth.ts lines 45-51
// If oplChip provided, use it directly (offline rendering mode)
if (oplChip) {
  console.log('[SimpleSynth] Using provided IOPLChip (offline mode)');
  this.oplChip = oplChip;
  this.isInitialized = true;
  return;
}
```

### Audio Flow

```
Pattern data
    ↓
PatternRenderer (creates timeline)
    ↓
OfflineAudioRenderer loop
    ↓
SimpleSynth.noteOn() at specific sample times
    ↓
SimpleSynth.writeOPL()
    ↓
DirectOPLChip.write()
    ↓
OPL3 chip (direct instance)
    ↓
DirectOPLChip.read() - ONE sample at a time
    ↓
Stored in buffers
    ↓
WAVEncoder
    ↓
WAV file download
```

### Characteristics

- **Offline:** Audio is rendered sample-by-sample
- **Non-real-time:** Can be slower or faster than real-time
- **Batch:** Entire pattern rendered before playback
- **Deterministic:** Same input always produces same output
- **No Web Audio:** Direct chip access, no browser audio APIs

---

## Key Differences

| Aspect | Real-time (AudioWorklet) | Offline (Direct) |
|--------|-------------------------|------------------|
| **Chip Adapter** | WorkletOPLChip | DirectOPLChip |
| **Audio Context** | Yes (49716 Hz) | No |
| **AudioWorklet** | Yes | No |
| **Sample Generation** | Continuous in worklet | On-demand per sample |
| **Latency** | Low (~10ms) | N/A (offline) |
| **Use Case** | Interactive playback | Export to WAV |
| **Sample Access** | Through Web Audio API | Direct read() calls |

---

## Shared SimpleSynth Code

Both modes use the **exact same** SimpleSynth methods:

### Instrument Management
- `setTrackPatch()` - Assign instrument to track
- `loadPatch()` - Load instrument to OPL channel
- `programVoice()` - Program single voice

### Note Control
- `noteOn()` - Trigger note
- `noteOff()` - Release note

### Register Writing
- `writeOPL()` - Write to OPL register (via IOPLChip interface)
- `writeOperatorRegisters()` - Write operator parameters
- `getOperatorOffsets()` - Calculate register addresses

### State Management
- `trackPatches` - Track → Patch assignments
- `channelPatches` - OPL Channel → Patch assignments
- `activeNotes` - Note tracking
- `channelManager` - Channel allocation

---

## Implications for Dual-Voice Implementation

Since SimpleSynth is used for both playback and export, **any dual-voice implementation must work in both modes**.

### What This Means

1. **Channel Allocation**
   - Must work with both WorkletOPLChip and DirectOPLChip
   - ChannelManager already handles allocation (used in both modes)

2. **Register Writes**
   - All register writes go through `IOPLChip.write()`
   - Both adapters implement this interface
   - No mode-specific code needed

3. **Voice Programming**
   - `programVoice()` already exists for dual-voice support
   - Works via `IOPLChip` interface
   - Will work in both modes automatically

4. **Note Triggering**
   - `noteOn()` must trigger both voices
   - `noteOff()` must release both voices
   - Channel tracking must link dual voices together

### Implementation Strategy

The dual-voice implementation can be **mode-agnostic** because:

1. ✅ Both modes use IOPLChip interface
2. ✅ Both modes use same SimpleSynth code
3. ✅ Both modes use ChannelManager
4. ✅ Both modes support 18 OPL channels
5. ✅ Both modes write same OPL registers

**Therefore:** Implementing dual-voice in SimpleSynth will automatically work for both browser playback AND export!

---

## Testing Strategy

### Browser Playback Testing
1. Load dual-voice instrument (e.g., Doom Piano)
2. Play note via keyboard
3. Verify TWO OPL channels allocated
4. Verify both voices trigger simultaneously
5. Listen for richer, fuller sound

### Export Testing
1. Export pattern using dual-voice instruments
2. Verify same TWO channels allocated in offline mode
3. Verify WAV file contains both voices
4. Compare exported WAV with real-time playback
5. Should sound identical

---

## Code Locations

### SimpleSynth Core
- `src/SimpleSynth.ts` - Main synthesizer (mode-agnostic)
- `src/utils/ChannelManager.ts` - Channel allocation (used by both modes)

### Real-time Mode
- `src/App.tsx` - Browser initialization
- `src/adapters/WorkletOPLChip.ts` - AudioWorklet adapter
- `public/opl-worklet-processor.js` - Worklet code

### Offline Mode
- `src/export/OfflineAudioRenderer.ts` - Export orchestration
- `src/adapters/DirectOPLChip.ts` - Direct chip adapter
- `src/export/PatternRenderer.ts` - Timeline conversion
- `src/utils/WAVEncoder.ts` - WAV file encoding

### Interfaces
- `src/interfaces/IOPLChip.ts` - Chip adapter interface
- `src/types/OPLPatch.ts` - Instrument types (includes voice1/voice2)

---

## Conclusion

SimpleSynth's dual-mode design is elegant:
- **Single codebase** for both modes
- **Interface-based** chip communication
- **Mode-agnostic** instrument and note handling
- **Automatic portability** - features work everywhere

Implementing dual-voice support in SimpleSynth will **automatically enable it** for:
- ✅ Real-time browser playback
- ✅ Offline WAV export
- ✅ MIDI playback (if implemented)
- ✅ Any future modes using IOPLChip

---

**Document Version:** 1.0
**Last Updated:** 2025-01-11
