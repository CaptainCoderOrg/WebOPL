# AudioWorklet Migration Plan

## Problem Statement

Currently using deprecated `ScriptProcessorNode` which has cross-browser compatibility issues:
- **Works in**: Microsoft Edge
- **Doesn't work in**: Chrome, Firefox, Safari (likely)
- **Root cause**: ScriptProcessorNode is deprecated and browsers are phasing it out

## Solution: Migrate to AudioWorklet

AudioWorklet is the modern Web Audio API replacement that:
- Runs in a dedicated audio thread (better performance)
- Has consistent cross-browser support
- Is the recommended standard going forward

## Architecture Overview

### Current (ScriptProcessorNode):
```
Main Thread                  Audio Thread
┌─────────────┐             ┌──────────────────┐
│ SimpleSynth │◄───────────►│ ScriptProcessor  │
│  - OPL inst │             │  - processAudio()│
│  - writes   │             │  - calls opl.    │
│             │             │    generate()    │
└─────────────┘             └──────────────────┘
```

### Proposed (AudioWorklet):
```
Main Thread                  Audio Worklet Thread
┌─────────────┐             ┌──────────────────┐
│ SimpleSynth │──messages──►│ OPLProcessor     │
│  - sends    │             │  - OPL instance  │
│    register │             │  - process()     │
│    writes   │             │  - generates     │
└─────────────┘             └──────────────────┘
```

## Technical Challenges

### Challenge 1: WASM in AudioWorklet

The OPL3 emulator is a WASM module. AudioWorklet runs in a separate global scope (`AudioWorkletGlobalScope`), so we need to:

1. **Option A: Load WASM in worklet** (Preferred)
   - Import OPL scripts in the worklet processor
   - Use `importScripts()` to load `opl.js` and `opl-wrapper.js`
   - Create OPL instance in the worklet

2. **Option B: SharedArrayBuffer** (Complex)
   - Keep OPL in main thread
   - Use SharedArrayBuffer to share audio data
   - Requires CORS headers for security

### Challenge 2: OPL Register Writes

Currently, `noteOn()` and `loadPatch()` write directly to OPL registers. With AudioWorklet:
- Main thread sends messages to worklet
- Worklet applies register writes
- Introduces minimal latency (acceptable for music)

## Implementation Plan

### Phase 1: Create AudioWorklet Processor (DONE ✓)
- [x] Created `opl-worklet-processor.js`
- [x] Implements message passing for register writes
- [x] Handles OPL sample generation

### Phase 2: Update SimpleSynth (TODO)
1. Replace `ScriptProcessorNode` creation with `AudioWorkletNode`
2. Add message passing for:
   - `write(register, value)` → send to worklet
   - OPL initialization in worklet
3. Handle worklet loading:
   ```typescript
   await context.audioWorklet.addModule('/opl-worklet-processor.js');
   this.workletNode = new AudioWorkletNode(context, 'opl-worklet-processor');
   ```

### Phase 3: Load WASM in Worklet (CRITICAL)
Two approaches:

#### Approach A: importScripts() in Worklet
```javascript
// In opl-worklet-processor.js (at top level)
importScripts('/lib/opl.js');
importScripts('/opl-wrapper.js');
```

**Pros**: Simple, keeps OPL in audio thread
**Cons**: `importScripts()` may not work with modern ES modules

#### Approach B: Dynamic Script Loading
```javascript
// In worklet constructor
async loadWASM() {
  const response = await fetch('/lib/opl.js');
  const code = await response.text();
  eval(code); // Or use Function constructor
}
```

**Pros**: Works with fetch
**Cons**: Security concerns with eval, async complexity

### Phase 4: Message Protocol
Main thread → Worklet messages:
```typescript
{
  type: 'init',
  payload: { sampleRate: 49716 }
}

{
  type: 'write',
  payload: { register: 0xA0, value: 0x42 }
}
```

Worklet → Main thread messages:
```typescript
{
  type: 'ready'
}

{
  type: 'error',
  payload: { message: 'OPL init failed' }
}
```

### Phase 5: Update OPL Methods
Change all `this.opl.write()` calls to message passing:

**Before:**
```typescript
this.opl.write(0xA0 + channel, fnum & 0xFF);
```

**After:**
```typescript
this.workletNode.port.postMessage({
  type: 'write',
  payload: { register: 0xA0 + channel, value: fnum & 0xFF }
});
```

### Phase 6: Testing
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test in Edge (should still work)
- [ ] Verify no audio glitches
- [ ] Verify register writes work correctly

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| WASM loading in worklet fails | High | Fallback to ScriptProcessorNode |
| Message passing adds latency | Medium | Batch register writes if needed |
| Existing code breaks | High | Feature flag for gradual rollout |

## Rollout Strategy

### Option 1: Feature Flag
```typescript
const USE_AUDIO_WORKLET = true; // Toggle

if (USE_AUDIO_WORKLET && 'audioWorklet' in AudioContext.prototype) {
  // Use AudioWorklet
} else {
  // Fall back to ScriptProcessorNode
}
```

### Option 2: Clean Break
- Remove ScriptProcessorNode completely
- AudioWorklet is supported in all modern browsers since 2020

**Recommendation**: Use feature flag during development, then clean break for production.

## Estimated Effort

- Phase 1: ✓ Complete (1 hour)
- Phase 2-3: 2-3 hours (SimpleSynth refactor + WASM loading)
- Phase 4-5: 1-2 hours (Message protocol)
- Phase 6: 1 hour (Testing)

**Total**: 5-7 hours

## Browser Support (AudioWorklet)

| Browser | Version | Released |
|---------|---------|----------|
| Chrome  | 66+     | Apr 2018 |
| Firefox | 76+     | May 2020 |
| Safari  | 14.1+   | Apr 2021 |
| Edge    | 79+     | Jan 2020 |

**Conclusion**: AudioWorklet has excellent support. Safe to migrate.

## Next Steps

1. Decide on WASM loading approach (recommend `importScripts`)
2. Update SimpleSynth.ts with feature flag
3. Test in Chrome to verify it works
4. Gradually roll out to all browsers
5. Remove ScriptProcessorNode fallback once stable

## Additional Resources

- [MDN: Using AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_AudioWorklet)
- [Chrome Blog: Audio Worklet](https://developer.chrome.com/blog/audio-worklet)
- [Migration Guide (GitHub Gist)](https://gist.github.com/beaufortfrancois/4d90c89c5371594dc4c0ac81c3b8dd73)
- [Emscripten WASM Audio Worklets](https://emscripten.org/docs/api_reference/wasm_audio_worklets.html)
