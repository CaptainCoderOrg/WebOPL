# Implementation Plan: Migrate from WASM to Pure JavaScript OPL3

## Overview

Replace the failing `@malvineous/opl` WASM-based OPL3 emulator with the working pure JavaScript `opl3` package (Robson Cozendey's emulator).

**Status**: ✅ Proof of concept successful ([opl3-chip-test.html](public/opl3-chip-test.html))

## Motivation

### Current Problems
- WASM OPL3 emulator produces **no audio** when OPL3 mode (register 0x105) is enabled
- Extensive initialization sequences attempted (reset, 4-op configuration) didn't resolve the issue
- Complex WASM loading in AudioWorklet adds unnecessary complexity
- Register write API doesn't properly support OPL3's extended register set (0x100-0x1FF)

### Solution Benefits
- ✅ **Working OPL3 mode**: Pure JS emulator produces audio successfully
- ✅ **Simpler architecture**: No WASM loading, no fetch workarounds
- ✅ **Better debugging**: Pure JavaScript is easier to inspect and debug
- ✅ **Proven reliability**: Used in production at opl.wafflenet.com

---

## API Comparison

### Current (@malvineous/opl - WASM)
```javascript
const opl = await OPL.create(sampleRate, channelCount);
opl.write(register, value);  // register: 0x00-0x1FF (claimed, doesn't work)
const samples = opl.generate(numSamples, Int16Array);
```

### New (opl3 - Pure JavaScript)
```javascript
import { OPL3 } from 'opl3';
const chip = new OPL3();

// Register write requires bank/array selection
chip.write(array, address, value);
// array: 0 (registers 0x00-0xFF) or 1 (registers 0x100-0x1FF)
// address: 0x00-0xFF

// Sample generation
chip.read(outputBuffer);  // Fills outputBuffer with stereo samples
```

### Key Difference: Register Addressing

**Old API (broken)**:
```javascript
opl.write(0x105, 0x01);  // Doesn't work - claims to support 0x100+
```

**New API (working)**:
```javascript
chip.write(1, 0x05, 0x01);  // array=1 (second bank), address=0x05
// This is register 0x105 (0x100 + 0x05)
```

---

## Files to Modify

### 1. Core SimpleSynth (Main Thread)
**File**: `src/SimpleSynth.ts`

**Changes**:
- Replace WASM OPL initialization with pure JS OPL3
- Update `writeOPL()` method to convert register format
- Remove WASM binary fetching logic
- Simplify ScriptProcessor fallback mode

**Lines affected**: ~200-260 (initialization), ~340-380 (writeOPL helper)

---

### 2. AudioWorklet Processor
**File**: `public/opl-worklet-processor.js`

**Changes**:
- Remove WASM loading message handler
- Import `opl3` package directly
- Update register writes to use array/address format
- Simplify initialization (no more WASM code eval)

**Lines affected**: ~30-130 (entire WASM loading logic)

---

### 3. Create OPL3 Wrapper Utility
**File**: `src/utils/OPL3Wrapper.ts` (new file)

**Purpose**: Provide a unified API that converts our register format to the opl3 package format

```typescript
export class OPL3Wrapper {
  private chip: OPL3;

  constructor() {
    this.chip = new OPL3();
  }

  /**
   * Write to OPL3 register
   * Converts 0x000-0x1FF format to (array, address) format
   */
  write(register: number, value: number): void {
    const array = (register >= 0x100) ? 1 : 0;
    const address = register & 0xFF;
    this.chip.write(array, address, value);
  }

  /**
   * Generate audio samples
   */
  generate(numSamples: number): Int16Array {
    const output = new Int16Array(numSamples * 2); // Stereo
    this.chip.read(output);
    return output;
  }

  /**
   * Initialize OPL3 mode
   */
  initializeOPL3(): void {
    // Reset sequence
    this.write(0x04, 0x60);  // Reset timers
    this.write(0x04, 0x80);  // Reset IRQ
    this.write(0x01, 0x20);  // Waveform select
    this.write(0xBD, 0x00);  // Melodic mode

    // Enable OPL3 mode
    this.write(0x105, 0x01);

    // Disable 4-op mode (all channels in 2-op mode)
    this.write(0x104, 0x00);

    // Initialize connection registers (enable outputs)
    for (let ch = 0; ch < 9; ch++) {
      this.write(0xC0 + ch, 0x30);        // Bank 0: stereo output
      this.write(0x100 + 0xC0 + ch, 0x30); // Bank 1: stereo output
    }
  }
}
```

---

### 4. Update Package Dependencies
**File**: `package.json`

**Changes**:
```json
{
  "dependencies": {
    "opl3": "^0.4.3",  // ✅ Already installed
    // "@malvineous/opl": "^1.0.0",  // ❌ Remove after migration complete
  }
}
```

---

## Implementation Steps

### Phase 1: Preparation (30 minutes)
1. ✅ Create `OPL3Wrapper.ts` utility class
2. ✅ Add unit tests for register conversion
3. ✅ Document API differences

### Phase 2: SimpleSynth Migration (1 hour)
1. ✅ Update imports to use `opl3` package
2. ✅ Replace `initScriptProcessor()` OPL initialization
3. ✅ Update `writeOPL()` to use wrapper
4. ✅ Remove WASM-specific code paths
5. ✅ Test ScriptProcessor mode works

### Phase 3: AudioWorklet Migration (1 hour)
1. ✅ Create new `opl3-worklet-processor.js`
2. ✅ Import `opl3` via Vite bundling
3. ✅ Replace WASM loading with direct import
4. ✅ Update message handlers
5. ✅ Test AudioWorklet mode works

### Phase 4: Integration Testing (1 hour)
1. ✅ Test all existing test pages
2. ✅ Verify DualVoiceTest works
3. ✅ Test channel allocation (18 channels)
4. ✅ Test GENMIDI instrument playback
5. ✅ Test MIDI file playback

### Phase 5: Cleanup (30 minutes)
1. ✅ Remove `@malvineous/opl` dependency
2. ✅ Remove old WASM files from `/public/lib/`
3. ✅ Remove old `opl-wrapper.js`
4. ✅ Update documentation

---

## Testing Strategy

### Unit Tests
- ✅ `OPL3Wrapper.write()` register conversion
- ✅ `OPL3Wrapper.generate()` sample generation
- ✅ OPL3 mode initialization sequence

### Integration Tests
1. **Basic Audio Output**
   - Test page: `/opl3-chip-test.html`
   - Verify: A440 tone plays successfully

2. **Chromatic Scale**
   - Test page: `/opl3-chip-test.html` (Test 5)
   - Verify: C4-C5 scale plays correctly

3. **Dual-Voice Playback**
   - Component: `DualVoiceTest`
   - Verify: Dual-voice instruments use 2 channels
   - Verify: Channel stats show correct allocation

4. **18-Channel Polyphony**
   - Component: `DualVoiceTest`
   - Verify: Can play 9+ simultaneous single-voice notes
   - Verify: Voice stealing works correctly

5. **GENMIDI Instruments**
   - All test pages
   - Verify: Instrument bank loads successfully
   - Verify: Different instruments sound distinct

---

## Rollback Plan

If migration fails:
1. Revert to git commit before migration started
2. Alternatively: Keep both implementations and use feature flag
3. Fall back to OPL2 mode (9 channels) if OPL3 issues persist

---

## Migration Checklist

### Pre-Migration
- [x] Verify `opl3` package installed
- [x] Create proof-of-concept test page
- [x] Document API differences
- [x] Create implementation plan

### Migration
- [ ] Create `OPL3Wrapper.ts`
- [ ] Update `SimpleSynth.ts`
- [ ] Create `opl3-worklet-processor.js`
- [ ] Update Vite build config (if needed)
- [ ] Test ScriptProcessor mode
- [ ] Test AudioWorklet mode

### Post-Migration
- [ ] Run full test suite
- [ ] Verify all 18 channels work
- [ ] Test dual-voice instruments
- [ ] Remove `@malvineous/opl` dependency
- [ ] Remove WASM files
- [ ] Update documentation
- [ ] Commit changes

---

## Success Criteria

✅ All criteria must pass before considering migration complete:

1. **Audio Output**: All test pages produce audible sound
2. **OPL3 Mode**: `_new` flag = 1, 18 channels available
3. **Correct Frequencies**: Chromatic scale sounds in tune
4. **Dual-Voice**: Instruments correctly use 2 channels when enabled
5. **Channel Management**: Channel allocation and stealing work correctly
6. **No Regressions**: Existing functionality (MIDI playback, instrument loading) works
7. **Performance**: No significant latency or audio glitches

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| AudioWorklet import issues | Medium | High | Bundle opl3 with Vite, test extensively |
| API incompatibilities | Low | Medium | Use wrapper class for abstraction |
| Performance degradation | Low | Low | Pure JS often faster than WASM for this use case |
| Audio quality issues | Low | Medium | opl3 package is production-proven |
| Register addressing bugs | Medium | High | Comprehensive testing, helper functions |

---

## Notes

### Why This Will Work
1. **Proven in production**: opl.wafflenet.com uses this exact library
2. **Test results**: All 5 tests pass successfully
3. **Simpler architecture**: No WASM complexity
4. **Better API**: Direct chip access, clear documentation

### Critical Insights from Testing
1. **Register 0xC0 output routing**: Must set bits 4-5 (0x30) for stereo output
2. **OPL3 mode enable**: Register 0x105 = array 1, address 0x05
3. **Sample generation**: Use `chip.read(buffer)` not `chip.generate()`
4. **Initialization sequence**: Reset → Waveform → Melodic → OPL3 → 4-op → Output routing

---

## Timeline Estimate

**Total time**: ~4 hours

- Phase 1 (Preparation): 30 minutes
- Phase 2 (SimpleSynth): 1 hour
- Phase 3 (AudioWorklet): 1 hour
- Phase 4 (Testing): 1 hour
- Phase 5 (Cleanup): 30 minutes

**Recommended approach**: Complete in single session to avoid partial migration state.
