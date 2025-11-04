# OPL3 Migration Implementation Plan

**Date:** 2025-01-03
**Status:** In Progress
**Goal:** Migrate from broken WASM to working pure JavaScript OPL3 emulator

## Root Cause Analysis

### The Problem
Our integration was failing because we were using the **wrong build** of the `opl3` package:
- ❌ **What we used:** `lib/opl3.js` (CommonJS Node.js module)
- ✅ **What we should use:** `dist/opl3.js` (Browser bundle)

### Evidence
1. **Working test** (`opl3-chip-test.html`) uses:
   ```html
   <script src="/node_modules/opl3/dist/opl3.js"></script>
   ```

2. **Our failed integration** tried to use:
   ```javascript
   await fetch('/node_modules/opl3/lib/opl3.js')
   ```

3. **Key differences:**
   - `lib/opl3.js` = CommonJS module requiring `util`, `extend`, and Node.js environment
   - `dist/opl3.js` = Pre-built browser bundle with all dependencies included
   - `dist/opl3.js` exposes `window.OPL3.OPL3` globally

### Why This Matters
- Browser bundle is already packaged for browser use
- No polyfills needed
- No CommonJS/ES module conversion
- Matches the working test exactly

## Implementation Phases

### Phase 1: Switch to Browser Bundle ⚡ (Quick Win)
**Goal:** Get sound working with minimal changes

**Tasks:**
1. Update `SimpleSynth.fetchOPL3Code()` to load `dist/opl3.js` instead of `lib/opl3.js`
2. Remove polyfill code from the wrapper
3. Update AudioWorklet to load browser bundle
4. Test basic audio playback

**Expected Outcome:** Sound works immediately

**Files to modify:**
- `src/SimpleSynth.ts` - Change fetch URL
- `public/opl-worklet-processor.js` - Remove polyfills, use global `OPL3`

---

### Phase 2: Minimal SimpleSynth Rewrite 🔨
**Goal:** Clean implementation matching working test pattern

**Approach:**
- Start fresh with SimpleSynth internals
- Keep public API unchanged (for compatibility)
- Match initialization sequence from `opl3-chip-test.html`

**Key Changes:**

#### Initialization Sequence (from working test):
```javascript
// 1. Create chip
chip = new OPL3();

// 2. Reset sequence
chip.write(0, 0x04, 0x60); // Reset timers
chip.write(0, 0x04, 0x80); // Reset IRQ
chip.write(0, 0x01, 0x20); // Waveform select
chip.write(0, 0xBD, 0x00); // Melodic mode

// 3. Enable OPL3 mode
chip.write(1, 0x05, 0x01); // Register 0x105

// 4. Disable 4-op mode
chip.write(1, 0x04, 0x00); // Register 0x104

// 5. Initialize C0-C8 registers (DOSBox workaround)
for (let ch = 0; ch < 9; ch++) {
    chip.write(0, 0xC0 + ch, 0x00); // Bank 0
    chip.write(1, 0xC0 + ch, 0x00); // Bank 1
}
```

#### Sample Generation (from working test):
```javascript
// Read ONE sample at a time
const tempBuffer = new Int16Array(2);
for (let i = 0; i < numSamples; i++) {
    chip.read(tempBuffer);
    leftChannel[i] = tempBuffer[0] / 32768.0;
    rightChannel[i] = tempBuffer[1] / 32768.0;
}
```

**Files to modify:**
- `src/SimpleSynth.ts` - Complete rewrite of internal logic
- `src/utils/OPL3Wrapper.ts` - May be removed (use OPL3 directly)

**Compatibility:**
- Keep same public methods: `init()`, `noteOn()`, `noteOff()`, `loadPatch()`
- Rest of app continues to work unchanged

---

### Phase 3: AudioWorklet Support 🎵
**Goal:** Modern audio processing with proper browser compatibility

**Why AudioWorklet:**
- ScriptProcessorNode is deprecated
- Better performance
- Lower latency
- Standard across modern browsers

**Implementation:**

#### Main Thread:
```javascript
// Load browser bundle
const response = await fetch('/node_modules/opl3/dist/opl3.js');
const opl3Code = await response.text();

// Send to worklet
workletNode.port.postMessage({
    type: 'load-opl3',
    payload: { opl3Code }
});
```

#### AudioWorklet:
```javascript
// Execute browser bundle
eval(opl3Code);

// Create chip (now available as global OPL3)
this.chip = new OPL3();

// Initialize using same sequence as Phase 2
this.initializeOPL3();
```

**Files to modify:**
- `src/SimpleSynth.ts` - Update fetchOPL3Code() URL
- `public/opl-worklet-processor.js` - Simplify polyfill-free code

---

### Phase 4: Re-integrate Patch Loading 🎹
**Goal:** Restore instrument/patch support

**Features to restore:**
1. Load OPLPatch to channels
2. Program operators (modulator + carrier)
3. Set feedback and connection
4. GENMIDI compatibility

**Key Implementation:**
```javascript
loadPatch(channelId: number, patch: OPLPatch) {
    const [modOffset, carOffset] = this.getOperatorOffsets(channelId);

    // Program modulator
    this.writeOperatorRegisters(modOffset, patch.modulator);

    // Program carrier
    this.writeOperatorRegisters(carOffset, patch.carrier);

    // Program feedback/connection
    // NOTE: Initialize to 0x00 first (working test pattern)
    const c0Register = channelId < 9
        ? 0xC0 + channelId
        : 0x1C0 + (channelId - 9);

    chip.write(array, c0Register, 0x00); // Reset first

    const regC0 = (patch.feedback << 1) | (patch.connection === 'fm' ? 1 : 0);
    chip.write(array, c0Register, regC0); // Then set
}
```

**Files to modify:**
- `src/SimpleSynth.ts` - Add back loadPatch() logic

**Testing:**
- Test with default patches first
- Verify GENMIDI instruments load correctly
- Check all 18 channels work

---

### Phase 5: Re-integrate Dual-Voice Support 🎼
**Goal:** Restore GENMIDI dual-voice feature

**Features to restore:**
1. ChannelManager for dynamic allocation
2. Dual-voice patch support
3. Voice1 + Voice2 programming
4. Note offset handling

**Architecture:**
```
MIDI Channel 0 plays note 60
    ↓
Is patch dual-voice?
    ↓ YES
ChannelManager.allocateDualChannels()
    ↓
Returns [OPL ch 0, OPL ch 1]
    ↓
Program Voice1 → OPL ch 0
Program Voice2 → OPL ch 1
    ↓
Trigger both with same note
```

**Files to modify:**
- `src/SimpleSynth.ts` - Add dual-voice logic
- `src/utils/ChannelManager.ts` - Already exists, keep as-is

**Testing:**
- Test dual-voice GENMIDI patches
- Verify channel allocation works
- Test degraded mode (when only 1 channel available)

---

### Phase 6: Cleanup 🧹
**Goal:** Remove old dependencies and dead code

**Tasks:**
1. Remove `@malvineous/opl` from package.json
2. Remove old WASM files
3. Remove util-polyfill.ts (no longer needed)
4. Remove OPL3Wrapper.ts (if using OPL3 directly)
5. Update vite.config.ts (remove util alias)
6. Remove Vite WASM plugins (vite-plugin-wasm, vite-plugin-top-level-await)

**Files to delete:**
- `src/utils/util-polyfill.ts`
- `src/utils/OPL3Wrapper.ts` (maybe)
- Old WASM files in `public/`

**Files to modify:**
- `package.json` - Remove old dependencies
- `vite.config.ts` - Simplify config
- `src/main.tsx` - Remove polyfill import

---

## Success Criteria

### Phase 1 Success:
- ✅ Audio plays when button clicked on `/opl3-test`
- ✅ Console shows non-zero sample stats
- ✅ No errors in console

### Phase 2 Success:
- ✅ SimpleSynth initializes correctly
- ✅ Notes play with correct pitch
- ✅ All 18 OPL3 channels work
- ✅ Clean initialization matching working test

### Phase 3 Success:
- ✅ AudioWorklet mode works
- ✅ No ScriptProcessor deprecation warnings
- ✅ Low latency audio playback

### Phase 4 Success:
- ✅ Default patches load correctly
- ✅ GENMIDI instruments load from file
- ✅ All 128 GENMIDI patches work
- ✅ Instruments sound correct

### Phase 5 Success:
- ✅ Dual-voice patches play with richer sound
- ✅ Channel allocation works correctly
- ✅ 102 dual-voice GENMIDI patches work
- ✅ Degraded mode handles limited channels

### Phase 6 Success:
- ✅ No old dependencies in package.json
- ✅ No unused polyfill code
- ✅ Clean codebase
- ✅ Build is smaller and faster

---

## Technical Details

### OPL3 Package API

**Browser Bundle exposes:**
```javascript
window.OPL3 = {
    OPL3: class {
        constructor()
        write(array: 0|1, address: 0x00-0xFF, value: 0x00-0xFF)
        read(output: Int16Array) // Fills with [L, R] stereo sample
        _new: number // 0=OPL2 mode, 1=OPL3 mode
    }
}
```

**Usage:**
```javascript
const chip = new OPL3(); // Note: OPL3 class, not window.OPL3

// Write to register 0x105 (array=1, address=0x05)
chip.write(1, 0x05, 0x01);

// Read stereo sample
const sample = new Int16Array(2);
chip.read(sample);
// sample[0] = left channel
// sample[1] = right channel
```

### Register Format Conversion

**Our format:** `0x000 - 0x1FF` (single register space)
**OPL3 package format:** `(array: 0|1, address: 0x00-0xFF)`

**Conversion:**
```javascript
function writeOPL(register: number, value: number) {
    const array = (register >= 0x100) ? 1 : 0;
    const address = register & 0xFF;
    chip.write(array, address, value);
}

// Example:
writeOPL(0x105, 0x01)  → chip.write(1, 0x05, 0x01)
writeOPL(0xB0, 0x20)   → chip.write(0, 0xB0, 0x20)
```

---

## Migration Checklist

### Pre-Migration
- [x] Identify root cause (wrong build)
- [x] Analyze working test
- [x] Document implementation plan
- [ ] Create backup branch

### Phase 1: Browser Bundle
- [ ] Update SimpleSynth.fetchOPL3Code()
- [ ] Update AudioWorklet processor
- [ ] Test audio playback
- [ ] Verify no errors

### Phase 2: Minimal Rewrite
- [ ] Rewrite SimpleSynth initialization
- [ ] Match working test sequence
- [ ] Implement sample generation
- [ ] Test basic note playback

### Phase 3: AudioWorklet
- [ ] Load browser bundle in worklet
- [ ] Initialize OPL3 in worklet
- [ ] Test AudioWorklet audio
- [ ] Verify low latency

### Phase 4: Patch Loading
- [ ] Restore loadPatch()
- [ ] Test default patches
- [ ] Load GENMIDI bank
- [ ] Verify all instruments

### Phase 5: Dual-Voice
- [ ] Restore ChannelManager
- [ ] Implement dual-voice logic
- [ ] Test dual-voice patches
- [ ] Verify degraded mode

### Phase 6: Cleanup
- [ ] Remove old dependencies
- [ ] Delete dead code
- [ ] Update configs
- [ ] Test full app

---

## Risk Mitigation

### Risk: Breaking existing features
**Mitigation:** Keep public API unchanged, modify internals only

### Risk: Browser compatibility
**Mitigation:** Use browser bundle (already browser-compatible)

### Risk: AudioWorklet not supported
**Mitigation:** Keep ScriptProcessor as fallback initially

### Risk: GENMIDI patches don't sound right
**Mitigation:** Test each phase incrementally, compare with reference

---

## Timeline Estimate

- **Phase 1:** 30 minutes (quick fix)
- **Phase 2:** 2-3 hours (careful rewrite)
- **Phase 3:** 1-2 hours (AudioWorklet integration)
- **Phase 4:** 2 hours (patch system)
- **Phase 5:** 2 hours (dual-voice)
- **Phase 6:** 1 hour (cleanup)

**Total:** ~8-10 hours of focused work

---

## Notes

### Why This Failed Before
1. CommonJS module (`lib/opl3.js`) requires Node.js environment
2. Polyfills were incomplete/incorrect
3. Module bundling issues with Vite
4. Trying to force Node.js code into browser

### Why This Will Work Now
1. Browser bundle is designed for browsers
2. No polyfills needed
3. Matches working test exactly
4. Using the package as intended

### Key Learnings
- Always check for browser-specific builds
- Test standalone before integration
- Match working examples exactly
- Read package documentation thoroughly

---

## References

- Working test: `public/opl3-chip-test.html`
- OPL3 package: https://github.com/brentward/opl3
- Browser bundle: `node_modules/opl3/dist/opl3.js`
- Our integration: `src/SimpleSynth.ts`
