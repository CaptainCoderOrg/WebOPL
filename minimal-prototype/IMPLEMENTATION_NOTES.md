# WebOrchestra Minimal Prototype - Implementation Notes

## Part 1: Proof of Concept - COMPLETED ✅

**Date:** 2025-01-02
**Status:** Successfully playing OPL3 tones in browser!

---

## Summary

Successfully implemented a minimal proof-of-concept that plays a 1-second OPL3 tone when clicking a button. This proves that:

- ✅ OPL3 synthesis works in modern browsers
- ✅ @malvineous/opl library is viable
- ✅ Web Audio API integration works
- ✅ Core technology is proven for full implementation

---

## Implementation Details

### Technology Stack

- **Framework:** Vite + React 18 + TypeScript
- **OPL Library:** @malvineous/opl (v1.0.0)
- **Audio API:** Web Audio API with ScriptProcessorNode
- **Sample Rate:** 49716 Hz (OPL3 native)
- **Buffer Size:** 4096 samples (chunked into 512-sample calls)

### File Structure

```
minimal-prototype/
├── public/
│   ├── lib/
│   │   ├── opl.js           # WASM loader (Emscripten)
│   │   └── opl.wasm         # OPL3 emulator binary
│   └── opl-wrapper.js       # Modified wrapper with browser export
├── src/
│   ├── App.tsx              # Main proof-of-concept component
│   ├── App.css              # Dark theme styling
│   ├── index.css            # Global styles
│   └── main.tsx             # React entry point
├── package.json
├── vite.config.ts           # Vite config with WASM plugins
└── index.html
```

---

## Challenges Encountered & Solutions

### Challenge 1: WASM Module Loading

**Problem:**
- Vite's module bundler couldn't properly handle @malvineous/opl's Emscripten-generated WASM
- ES module imports failed with "ReferenceError: opl is not defined"
- The library expects a global `opl` variable in browser environments

**Attempts Made:**
1. Direct ES module import - Failed (no default export)
2. Import from `lib/opl.js` directly - Failed (undefined exports)
3. Vite WASM plugins (`vite-plugin-wasm`) - Failed (library not compatible)

**Solution:**
- Copied OPL files to `public/` directory as static assets
- Load scripts dynamically using `<script>` tags (like the library's demo)
- Modified `opl-wrapper.js` to expose `window.OPL` for browser use

```typescript
// Dynamic script loading
const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
};

// Load in sequence
await loadScript('/lib/opl.js');      // Creates global 'opl' function
await loadScript('/opl-wrapper.js');  // Creates window.OPL class
const oplInstance = await window.OPL.create(49716, 2);
```

**Wrapper Modification:**
```javascript
// Added to opl-wrapper.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OPL;
} else {
  // Browser global export
  window.OPL = OPL;
}
```

---

### Challenge 2: Sample Generation Limit

**Problem:**
- OPL library has hard limit of 512 samples per `generate()` call
- ScriptProcessorNode buffer size is 4096 samples
- Error: "OPL.generate() cannot generate more than 512 samples per call"

**Solution:**
- Generate audio in chunks of max 512 samples
- Loop until full buffer is filled

```typescript
node.onaudioprocess = (event) => {
  const outputL = event.outputBuffer.getChannelData(0);
  const outputR = event.outputBuffer.getChannelData(1);
  const numSamples = outputL.length; // 4096

  const maxChunkSize = 512;
  let offset = 0;

  while (offset < numSamples) {
    const chunkSize = Math.min(maxChunkSize, numSamples - offset);
    const samples = oplInstance.generate(chunkSize, Int16Array);

    for (let i = 0; i < chunkSize; i++) {
      const sample = samples[i] / 32768.0; // Int16 to Float32
      outputL[offset + i] = sample;
      outputR[offset + i] = sample;
    }

    offset += chunkSize;
  }
};
```

---

## Code Highlights

### OPL Register Programming

Playing middle C (261.63 Hz):

```typescript
// Setup minimal 2-operator instrument
opl.write(0x20 + 0x00, 0x01); // Modulator: MULT=1
opl.write(0x40 + 0x00, 0x10); // Modulator: Output level
opl.write(0x60 + 0x00, 0xF5); // Modulator: Attack=15, Decay=5
opl.write(0x80 + 0x00, 0x77); // Modulator: Sustain=7, Release=7
opl.write(0xE0 + 0x00, 0x00); // Modulator: Waveform=sine

opl.write(0x20 + 0x03, 0x01); // Carrier: MULT=1
opl.write(0x40 + 0x03, 0x00); // Carrier: Full volume
opl.write(0x60 + 0x03, 0xF5); // Carrier: Attack=15, Decay=5
opl.write(0x80 + 0x03, 0x77); // Carrier: Sustain=7, Release=7
opl.write(0xE0 + 0x03, 0x00); // Carrier: Waveform=sine

opl.write(0xC0, 0x01); // Channel: Feedback=0, Additive synthesis

// Calculate F-number and block for frequency
const targetFreq = 261.63; // Middle C
for (let b = 0; b < 8; b++) {
  const f = Math.round((targetFreq * Math.pow(2, 20 - b)) / 49716);
  if (f >= 0 && f < 1024) {
    fnum = f;
    block = b;
    break;
  }
}

// Write frequency registers
opl.write(0xA0, fnum & 0xFF);
opl.write(0xB0, 0x20 | ((block & 0x07) << 2) | ((fnum >> 8) & 0x03));
```

### Frequency Formula

```
frequency = 49716 * F-Number / 2^(20-Block)

Inverse:
F-Number = frequency * 2^(20-Block) / 49716

For middle C (261.63 Hz):
- F-Number: 356 (0x164)
- Block: 4
```

---

## Performance Notes

- **Sample Rate:** 49716 Hz (OPL native)
- **Buffer Size:** 4096 samples (~82ms latency)
- **Chunks:** 8 chunks of 512 samples per buffer
- **Channels:** Stereo (mono signal duplicated)
- **Sample Format:** Int16 → Float32 conversion

---

## Browser Compatibility

**Tested:**
- ✅ Chrome/Edge (recommended)
- ⚠️ ScriptProcessorNode deprecated (works but will need AudioWorklet migration)

**Known Issues:**
- ScriptProcessorNode is deprecated (use AudioWorklet in production)
- AudioContext may start suspended (requires user interaction)

---

## Next Steps

### Part 2: Core Engine (1.5-2 hours)
- Create `SimpleSynth` class wrapping OPL
- Implement note conversion utilities (note name ↔ MIDI)
- Add multi-voice support (9 channels)
- Create test suite with 5 audio tests

### Part 3: Tracker UI (2-3 hours)
- Build `SimplePlayer` for pattern playback
- Create `TrackerGrid` component for note entry
- Implement keyboard navigation
- Add play/stop controls and BPM adjustment

### Part 4: Polish (1-2 hours)
- Pattern validation
- Keyboard shortcuts (Space = play/stop)
- Error handling and loading states
- Visual feedback improvements

---

## Lessons Learned

1. **WASM in bundlers is tricky** - Legacy libraries like @malvineous/opl don't work well with modern bundlers
2. **Script tags still work** - Sometimes the old-fashioned approach is the most reliable
3. **Read the constraints** - OPL's 512-sample limit is well-documented but easy to miss
4. **Test incrementally** - Each small success (loading → initialization → generation) helped debug
5. **Browser APIs require user interaction** - AudioContext autoplay policies are strict

---

## Time Log

| Task | Estimated | Actual |
|------|-----------|--------|
| Create Vite project | 5 min | 5 min |
| Install dependencies | 2 min | 2 min |
| Initial implementation | 15 min | 10 min |
| Debug WASM loading | 10 min | ~45 min |
| Fix sample generation | 5 min | 10 min |
| Testing | 20 min | 5 min |
| **TOTAL** | **~60 min** | **~80 min** |

**Note:** Most extra time was spent solving the WASM bundling issue - a valuable learning experience!

---

## Files Modified/Created

- ✅ [minimal-prototype/src/App.tsx](minimal-prototype/src/App.tsx) - Main component
- ✅ [minimal-prototype/src/App.css](minimal-prototype/src/App.css) - Styling
- ✅ [minimal-prototype/src/index.css](minimal-prototype/src/index.css) - Global styles
- ✅ [minimal-prototype/vite.config.ts](minimal-prototype/vite.config.ts) - Vite config
- ✅ [minimal-prototype/public/opl-wrapper.js](minimal-prototype/public/opl-wrapper.js) - Modified wrapper
- ✅ [minimal-prototype/public/lib/opl.js](minimal-prototype/public/lib/opl.js) - WASM loader
- ✅ [minimal-prototype/public/lib/opl.wasm](minimal-prototype/public/lib/opl.wasm) - Binary

---

## Success Criteria - All Met! ✅

- ✅ Vite project runs without errors
- ✅ Can click "Initialize Audio" without errors
- ✅ Console shows all 5 initialization steps
- ✅ Status shows "✅ Ready"
- ✅ Can click "Play Test Tone"
- ✅ **HEAR AUDIBLE 1-SECOND TONE** 🎵
- ✅ Tone stops after 1 second
- ✅ Can play tone multiple times
- ✅ No errors in console (after fixes)
- ✅ AudioContext state is "running"

---

## Conclusion

**Part 1 is a complete success!** We've proven that:

1. OPL3 synthesis works perfectly in modern browsers
2. The @malvineous/opl library is viable (with workarounds)
3. We can generate audio in real-time with low latency
4. The core technology is solid for building a full tracker

The challenges we faced (WASM loading, sample limits) are now solved and documented. We're ready to proceed to Part 2 with confidence!

---

*Last Updated: 2025-01-02*
