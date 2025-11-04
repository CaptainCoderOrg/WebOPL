# Codebase Review Findings for OPL3 Migration

## Summary

After comprehensive codebase review, the migration is **SIMPLER than originally planned** because SimpleSynth already has excellent abstraction.

---

## Key Findings

### 1. SimpleSynth Already Has Perfect Abstraction ✅

**File**: `src/SimpleSynth.ts:358`

```typescript
private writeOPL(register: number, value: number): void {
  if (USE_AUDIO_WORKLET && this.workletNode) {
    // Send to AudioWorklet
    this.workletNode.port.postMessage({
      type: 'write',
      payload: { register, value }
    });
  } else if (this.opl) {
    // Direct write (ScriptProcessorNode mode)
    this.opl.write(register, value);
  }
}
```

**Impact**:
- **No changes needed** to 25 existing `writeOPL()` call sites
- Register format is already `0x000-0x1FF` (correct for our needs)
- Only need to change the low-level chip implementation

---

### 2. Register Handling Already Supports OPL3 ✅

**File**: `src/SimpleSynth.ts:406-412`

```typescript
private getChannelRegister(baseRegister: number, channelId: number): number {
  if (channelId < 9) {
    return baseRegister + channelId;
  } else {
    return baseRegister + 0x100 + (channelId - 9);
  }
}
```

**Impact**:
- Already generates correct 0x100-0x1FF registers for channels 9-17
- No changes needed

---

### 3. Two Execution Modes

#### AudioWorklet Mode (Modern, Default)
- **Location**: `public/opl-worklet-processor.js`
- **Current**: Loads WASM via `eval()`, complex initialization
- **Needed**: Complete rewrite to import `opl3` package

#### ScriptProcessor Mode (Fallback)
- **Location**: `src/SimpleSynth.ts:200-260` (initScriptProcessor)
- **Current**: Uses `@malvineous/opl` directly
- **Needed**: Replace OPL initialization only

---

### 4. Files Requiring Changes

| File | Lines | Changes | Complexity |
|------|-------|---------|------------|
| `src/SimpleSynth.ts` | 200-260 | Replace ScriptProcessor OPL init | **LOW** |
| `public/opl-worklet-processor.js` | 30-130 | Complete rewrite | **MEDIUM** |
| `src/utils/OPL3Wrapper.ts` | NEW | Create wrapper class | **LOW** |

**Total**: 3 files

---

### 5. Files NOT Requiring Changes ✅

All these work perfectly as-is:
- `src/types/OPLPatch.ts` - Type definitions (unchanged)
- `src/constants/midiToOPL.ts` - MIDI conversion (unchanged)
- `src/utils/ChannelManager.ts` - Channel allocation (unchanged)
- `src/components/*` - All UI components (unchanged)
- `src/data/defaultPatches.ts` - Instrument data (unchanged)

---

## Critical Insight: The Conversion Layer

The ONLY place we need to convert register format is inside the wrapper:

```typescript
// SimpleSynth calls (no change needed):
writeOPL(0x105, 0x01);  // ← This stays the same everywhere

// Wrapper converts internally:
write(register: number, value: number) {
  const array = (register >= 0x100) ? 1 : 0;
  const address = register & 0xFF;
  this.chip.write(array, address, value);  // ← opl3 package API
}
```

---

## Updated Implementation Plan

### Phase 1: Create OPL3Wrapper (30 min) ✅
**New File**: `src/utils/OPL3Wrapper.ts`

```typescript
import { OPL3 } from 'opl3';

export class OPL3Wrapper {
  private chip: OPL3;

  constructor() {
    this.chip = new OPL3();
  }

  /**
   * Write to OPL register (converts 0x000-0x1FF to array/address)
   */
  write(register: number, value: number): void {
    const array = (register >= 0x100) ? 1 : 0;
    const address = register & 0xFF;
    this.chip.write(array, address, value);
  }

  /**
   * Generate stereo samples
   */
  generate(numSamples: number): Int16Array {
    const output = new Int16Array(numSamples * 2);
    this.chip.read(output);
    return output;
  }
}
```

**Why**: Provides simple API conversion without touching SimpleSynth internals.

---

### Phase 2: Update ScriptProcessor Mode (30 min)
**File**: `src/SimpleSynth.ts`

**Before** (lines ~200-260):
```typescript
this.opl = await window.OPL.create(this.audioContext.sampleRate, 2);
this.opl.write(0x105, 0x01);  // ← Fails (WASM issue)
```

**After**:
```typescript
import { OPL3Wrapper } from './utils/OPL3Wrapper';

this.opl = new OPL3Wrapper();
// Initialize OPL3 mode
this.opl.write(0x04, 0x60);   // Reset timers
this.opl.write(0x04, 0x80);   // Reset IRQ
this.opl.write(0x01, 0x20);   // Waveform select
this.opl.write(0xBD, 0x00);   // Melodic mode
this.opl.write(0x105, 0x01);  // Enable OPL3
this.opl.write(0x104, 0x00);  // Disable 4-op

// Initialize output routing for all channels
for (let ch = 0; ch < 9; ch++) {
  this.opl.write(0xC0 + ch, 0x30);        // Bank 0: stereo
  this.opl.write(0x100 + 0xC0 + ch, 0x30); // Bank 1: stereo
}
```

**Changes**:
- Import `OPL3Wrapper`
- Replace `window.OPL.create()` with `new OPL3Wrapper()`
- Add proper initialization sequence
- Add output routing (critical: 0x30 = stereo output)

---

### Phase 3: Rewrite AudioWorklet Processor (1 hour)
**File**: `public/opl-worklet-processor.js`

**Current structure** (~170 lines):
- WASM loading via `eval()` (lines 30-80)
- Complex message handling
- No direct imports

**New structure** (~100 lines):
```javascript
// Import OPL3 class directly (Vite will bundle it)
import { OPL3 } from 'opl3';

class OPLWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // Create OPL3 chip directly (no WASM loading!)
    this.chip = new OPL3();
    this.isReady = false;

    // Initialize OPL3 mode
    this.initializeOPL3();

    this.port.onmessage = (event) => this.handleMessage(event.data);
  }

  initializeOPL3() {
    // Reset sequence
    this.chipWrite(0x04, 0x60);
    this.chipWrite(0x04, 0x80);
    this.chipWrite(0x01, 0x20);
    this.chipWrite(0xBD, 0x00);

    // Enable OPL3 mode
    this.chipWrite(0x105, 0x01);
    this.chipWrite(0x104, 0x00);

    // Initialize output routing
    for (let ch = 0; ch < 9; ch++) {
      this.chipWrite(0xC0 + ch, 0x30);
      this.chipWrite(0x100 + 0xC0 + ch, 0x30);
    }

    this.isReady = true;
    this.port.postMessage({ type: 'ready' });
  }

  // Convert register format
  chipWrite(register, value) {
    const array = (register >= 0x100) ? 1 : 0;
    const address = register & 0xFF;
    this.chip.write(array, address, value);
  }

  handleMessage(data) {
    if (data.type === 'write') {
      this.chipWrite(data.payload.register, data.payload.value);
    }
  }

  process(inputs, outputs, parameters) {
    if (!this.isReady) return true;

    const output = outputs[0];
    const numSamples = output[0].length;

    // Generate samples
    const tempBuffer = new Int16Array(2);
    for (let i = 0; i < numSamples; i++) {
      this.chip.read(tempBuffer);
      output[0][i] = tempBuffer[0] / 32768.0;  // Left
      output[1][i] = tempBuffer[1] / 32768.0;  // Right
    }

    return true;
  }
}

registerProcessor('opl-worklet-processor', OPLWorkletProcessor);
```

**Key Changes**:
- Remove ALL WASM loading code
- Direct `import { OPL3 } from 'opl3'`
- Simplified initialization
- Register conversion in `chipWrite()`

---

## Vite Configuration Update

**File**: `vite.config.ts`

May need to add:
```typescript
export default defineConfig({
  optimizeDeps: {
    include: ['opl3']  // Ensure opl3 is pre-bundled
  }
});
```

**Why**: Vite needs to bundle `opl3` for AudioWorklet to import it.

---

## Risk Assessment Update

| Risk | OLD | NEW | Reason |
|------|-----|-----|--------|
| API incompatibilities | Medium | **LOW** | SimpleSynth API unchanged |
| AudioWorklet imports | Medium | **LOW** | Vite bundles CommonJS→ESM |
| Register addressing | High | **LOW** | Wrapper handles conversion |
| Breaking changes | Medium | **LOW** | No high-level API changes |

---

## Success Criteria Checklist

Phase 1:
- [ ] `OPL3Wrapper.ts` created and tested
- [ ] Register conversion works (0x105 → array=1, address=0x05)
- [ ] Sample generation works

Phase 2:
- [ ] ScriptProcessor mode produces audio
- [ ] All 18 channels work
- [ ] Dual-voice instruments work

Phase 3:
- [ ] AudioWorklet mode produces audio
- [ ] No WASM errors
- [ ] Performance is good

Final:
- [ ] All test pages work
- [ ] No regressions
- [ ] Old WASM files removed

---

## Timeline Update

| Phase | OLD Estimate | NEW Estimate | Reason |
|-------|--------------|--------------|--------|
| Phase 1: Wrapper | 30 min | **20 min** | Simpler than expected |
| Phase 2: ScriptProcessor | 1 hour | **30 min** | Minimal changes |
| Phase 3: AudioWorklet | 1 hour | **45 min** | No WASM complexity |
| Phase 4: Testing | 1 hour | **1 hour** | Same |
| Phase 5: Cleanup | 30 min | **30 min** | Same |
| **TOTAL** | **4 hours** | **~3 hours** | Simpler architecture |

---

## Next Steps

1. **Start with Phase 1**: Create OPL3Wrapper.ts
2. **Test immediately**: Add unit tests for register conversion
3. **Phase 2**: Update ScriptProcessor mode, test basic audio
4. **Phase 3**: Rewrite AudioWorklet, test in browser
5. **Final**: Run full test suite, clean up old files

**Recommendation**: Proceed with implementation now that plan is validated.
