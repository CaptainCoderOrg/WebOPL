# Sound Blaster 16 Mode - Implementation Plan

**Created**: 2025-11-12
**Status**: Ready to Start

---

## Overview

This document provides step-by-step implementation instructions for adding Sound Blaster 16 filtering to WebOPL.

**Goal**: Emulate the analog output characteristics of real Sound Blaster 16 hardware

**Estimated Time**: 1-2 days

---

## Phase 1: Implement Filter Core (4-6 hours)

### Step 1.1: Create SB16Filter Class

**File**: `minimal-prototype/src/audio/SB16Filter.ts` (NEW)

**Implementation**:

```typescript
/**
 * Sound Blaster 16 Audio Filter
 * Emulates the analog output stage of Creative Labs Sound Blaster 16
 *
 * Filter Chain:
 * 1. High-shelf filter (-2 dB @ 8 kHz) for analog warmth
 * 2. Low-pass filter (cutoff @ 16 kHz) for anti-aliasing
 * 3. Optional subtle saturation for analog character
 */

export class SB16Filter {
  private sampleRate: number;

  // High-shelf filter state (for analog warmth)
  private hsA0: number = 0;
  private hsA1: number = 0;
  private hsA2: number = 0;
  private hsB0: number = 0;
  private hsB1: number = 0;
  private hsB2: number = 0;
  private hsX1L: number = 0;
  private hsX2L: number = 0;
  private hsY1L: number = 0;
  private hsY2L: number = 0;
  private hsX1R: number = 0;
  private hsX2R: number = 0;
  private hsY1R: number = 0;
  private hsY2R: number = 0;

  // Low-pass filter state (for anti-aliasing)
  private lpA0: number = 0;
  private lpA1: number = 0;
  private lpA2: number = 0;
  private lpB0: number = 0;
  private lpB1: number = 0;
  private lpB2: number = 0;
  private lpX1L: number = 0;
  private lpX2L: number = 0;
  private lpY1L: number = 0;
  private lpY2L: number = 0;
  private lpX1R: number = 0;
  private lpX2R: number = 0;
  private lpY1R: number = 0;
  private lpY2R: number = 0;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.calculateCoefficients();
  }

  /**
   * Calculate biquad filter coefficients
   * Based on Audio EQ Cookbook by Robert Bristow-Johnson
   */
  private calculateCoefficients(): void {
    // High-shelf filter: -2 dB @ 8000 Hz, Q = 0.707
    this.calculateHighShelfCoefficients(8000, 0.707, -2);

    // Low-pass filter: Cutoff @ 16000 Hz, Q = 0.707
    this.calculateLowPassCoefficients(16000, 0.707);
  }

  /**
   * Calculate high-shelf filter coefficients
   * @param freq Shelf frequency in Hz
   * @param q Q factor (0.707 = Butterworth)
   * @param gainDB Gain in dB (negative = attenuation)
   */
  private calculateHighShelfCoefficients(freq: number, q: number, gainDB: number): void {
    const w0 = (2 * Math.PI * freq) / this.sampleRate;
    const cosW0 = Math.cos(w0);
    const sinW0 = Math.sin(w0);
    const A = Math.pow(10, gainDB / 40); // Amplitude
    const alpha = sinW0 / (2 * q);
    const beta = Math.sqrt(A) / q;

    // Coefficients
    const b0 = A * ((A + 1) + (A - 1) * cosW0 + beta * sinW0);
    const b1 = -2 * A * ((A - 1) + (A + 1) * cosW0);
    const b2 = A * ((A + 1) + (A - 1) * cosW0 - beta * sinW0);
    const a0 = (A + 1) - (A - 1) * cosW0 + beta * sinW0;
    const a1 = 2 * ((A - 1) - (A + 1) * cosW0);
    const a2 = (A + 1) - (A - 1) * cosW0 - beta * sinW0;

    // Normalize
    this.hsB0 = b0 / a0;
    this.hsB1 = b1 / a0;
    this.hsB2 = b2 / a0;
    this.hsA0 = 1;
    this.hsA1 = a1 / a0;
    this.hsA2 = a2 / a0;
  }

  /**
   * Calculate low-pass filter coefficients
   * @param freq Cutoff frequency in Hz
   * @param q Q factor (0.707 = Butterworth)
   */
  private calculateLowPassCoefficients(freq: number, q: number): void {
    const w0 = (2 * Math.PI * freq) / this.sampleRate;
    const cosW0 = Math.cos(w0);
    const sinW0 = Math.sin(w0);
    const alpha = sinW0 / (2 * q);

    // Coefficients
    const b0 = (1 - cosW0) / 2;
    const b1 = 1 - cosW0;
    const b2 = (1 - cosW0) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cosW0;
    const a2 = 1 - alpha;

    // Normalize
    this.lpB0 = b0 / a0;
    this.lpB1 = b1 / a0;
    this.lpB2 = b2 / a0;
    this.lpA0 = 1;
    this.lpA1 = a1 / a0;
    this.lpA2 = a2 / a0;
  }

  /**
   * Process stereo audio buffer
   * @param leftChannel Input left channel samples
   * @param rightChannel Input right channel samples
   * @returns Filtered stereo output
   */
  processStereo(leftChannel: Float32Array, rightChannel: Float32Array): {
    left: Float32Array;
    right: Float32Array;
  } {
    const outputLeft = new Float32Array(leftChannel.length);
    const outputRight = new Float32Array(rightChannel.length);

    for (let i = 0; i < leftChannel.length; i++) {
      // Process left channel
      outputLeft[i] = this.processSampleLeft(leftChannel[i]);

      // Process right channel
      outputRight[i] = this.processSampleRight(rightChannel[i]);
    }

    return { left: outputLeft, right: outputRight };
  }

  /**
   * Process single sample (left channel)
   */
  private processSampleLeft(input: number): number {
    // Stage 1: High-shelf filter (analog warmth)
    const hs = this.hsB0 * input + this.hsB1 * this.hsX1L + this.hsB2 * this.hsX2L
              - this.hsA1 * this.hsY1L - this.hsA2 * this.hsY2L;

    this.hsX2L = this.hsX1L;
    this.hsX1L = input;
    this.hsY2L = this.hsY1L;
    this.hsY1L = hs;

    // Stage 2: Low-pass filter (anti-aliasing)
    const lp = this.lpB0 * hs + this.lpB1 * this.lpX1L + this.lpB2 * this.lpX2L
              - this.lpA1 * this.lpY1L - this.lpA2 * this.lpY2L;

    this.lpX2L = this.lpX1L;
    this.lpX1L = hs;
    this.lpY2L = this.lpY1L;
    this.lpY1L = lp;

    // Stage 3: Subtle saturation (optional)
    return this.softClip(lp);
  }

  /**
   * Process single sample (right channel)
   */
  private processSampleRight(input: number): number {
    // Stage 1: High-shelf filter (analog warmth)
    const hs = this.hsB0 * input + this.hsB1 * this.hsX1R + this.hsB2 * this.hsX2R
              - this.hsA1 * this.hsY1R - this.hsA2 * this.hsY2R;

    this.hsX2R = this.hsX1R;
    this.hsX1R = input;
    this.hsY2R = this.hsY1R;
    this.hsY1R = hs;

    // Stage 2: Low-pass filter (anti-aliasing)
    const lp = this.lpB0 * hs + this.lpB1 * this.lpX1R + this.lpB2 * this.lpX2R
              - this.lpA1 * this.lpY1R - this.lpA2 * this.lpY2R;

    this.lpX2R = this.lpX1R;
    this.lpX1R = hs;
    this.lpY2R = this.lpY1R;
    this.lpY1R = lp;

    // Stage 3: Subtle saturation (optional)
    return this.softClip(lp);
  }

  /**
   * Soft clipping for subtle analog saturation
   * Uses tanh curve for smooth distortion
   */
  private softClip(input: number): number {
    const threshold = 0.95;
    const amount = 0.1; // Very subtle

    if (Math.abs(input) < threshold) {
      return input; // No clipping
    }

    // Soft clip using tanh
    return Math.tanh(input * (1 + amount));
  }

  /**
   * Reset filter state (call when starting new audio)
   */
  reset(): void {
    this.hsX1L = this.hsX2L = this.hsY1L = this.hsY2L = 0;
    this.hsX1R = this.hsX2R = this.hsY1R = this.hsY2R = 0;
    this.lpX1L = this.lpX2L = this.lpY1L = this.lpY2L = 0;
    this.lpX1R = this.lpX2R = this.lpY1R = this.lpY2R = 0;
  }
}
```

**Testing**:
```bash
cd minimal-prototype
npm run type-check
```

---

## Phase 2: Integrate with Audio Worklet (2-3 hours)

### Step 2.1: Add SB16Filter to Audio Worklet

**File**: `minimal-prototype/public/opl-worklet-processor.js`

**Changes**:

1. Add filter class at the top of the file (before OPLWorkletProcessor class)
2. Initialize filter in constructor
3. Add filtering toggle
4. Apply filter in process() method

```javascript
// Add after the imports/requires section (around line 20)

/**
 * Sound Blaster 16 Filter (inline implementation for worklet)
 * Same implementation as SB16Filter.ts but in JavaScript
 */
class SB16Filter {
  // ... (copy the implementation from Step 1.1, but in JavaScript)
  // Convert TypeScript to JavaScript syntax
}

// Update OPLWorkletProcessor class
class OPLWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // ... existing constructor code ...

    // Add SB16 filter
    this.sb16Filter = new SB16Filter(sampleRate);
    this.sb16Enabled = false; // Default: off

    // Listen for SB16 mode changes
    this.port.onmessage = (event) => {
      if (event.data.type === 'setSB16Mode') {
        this.sb16Enabled = event.data.enabled;
        if (this.sb16Enabled) {
          this.sb16Filter.reset(); // Reset filter state
        }
        console.log('[OPLWorklet] SB16 Mode:', this.sb16Enabled ? 'ON' : 'OFF');
      }
      // ... existing message handlers ...
    };
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const leftChannel = output[0];
    const rightChannel = output[1];

    if (!leftChannel || !rightChannel) {
      return true;
    }

    // Generate OPL audio
    for (let i = 0; i < leftChannel.length; i++) {
      this.chip.generate(this.chipOutputBuffer);
      leftChannel[i] = this.chipOutputBuffer[0];
      rightChannel[i] = this.chipOutputBuffer[1];
    }

    // Apply SB16 filtering if enabled
    if (this.sb16Enabled) {
      const filtered = this.sb16Filter.processStereo(leftChannel, rightChannel);
      leftChannel.set(filtered.left);
      rightChannel.set(filtered.right);
    }

    return true;
  }
}
```

### Step 2.2: Add Control Message from Main Thread

**File**: `minimal-prototype/src/components/Tracker.tsx`

**Add function to send SB16 mode to worklet**:

```typescript
// Add to Tracker component (around line 50-100)
const [sb16Mode, setSB16Mode] = useState<boolean>(() => {
  // Load from localStorage
  const saved = localStorage.getItem('sb16Mode');
  return saved === 'true';
});

// Function to toggle SB16 mode
const toggleSB16Mode = () => {
  const newMode = !sb16Mode;
  setSB16Mode(newMode);

  // Save to localStorage
  localStorage.setItem('sb16Mode', String(newMode));

  // Send to audio worklet
  if (workletNodeRef.current) {
    workletNodeRef.current.port.postMessage({
      type: 'setSB16Mode',
      enabled: newMode
    });
  }

  console.log('[Tracker] SB16 Mode:', newMode ? 'ON' : 'OFF');
};

// Add button to UI (around line 400-500, where transport controls are)
<button
  onClick={toggleSB16Mode}
  className={`sb16-toggle ${sb16Mode ? 'active' : ''}`}
  title="Sound Blaster 16 Mode - Emulates analog output filtering"
>
  {sb16Mode ? '🔊 SB16' : '🔇 Clean'}
</button>
```

**Add CSS styling**:

```css
/* Add to Tracker.css or main styles */
.sb16-toggle {
  padding: 8px 16px;
  margin-left: 8px;
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  color: #ccc;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.sb16-toggle:hover {
  background-color: #333;
  border-color: #666;
}

.sb16-toggle.active {
  background-color: #4a7c59;
  border-color: #5a9c69;
  color: white;
}
```

---

## Phase 3: Integrate with WAV Export (1-2 hours)

### Step 3.1: Add SB16Filter to Offline Renderer

**File**: `minimal-prototype/src/export/OfflineAudioRenderer.ts`

**Import and use filter**:

```typescript
// Add import at top
import { SB16Filter } from '../audio/SB16Filter';

// Update renderToWAV method signature
export async function renderToWAV(
  pattern: PatternFile,
  instrumentPatches: OPLPatch[],
  onProgress?: (progress: number) => void,
  sb16Mode: boolean = false // NEW PARAMETER
): Promise<ArrayBuffer> {

  // ... existing setup code ...

  // Initialize SB16 filter if enabled
  let sb16Filter: SB16Filter | null = null;
  if (sb16Mode) {
    sb16Filter = new SB16Filter(SAMPLE_RATE);
    console.log('[OfflineRenderer] SB16 Mode: ENABLED');
  }

  // ... rendering loop ...

  // After generating samples, apply SB16 filter if enabled
  if (sb16Filter) {
    const filtered = sb16Filter.processStereo(leftSamples, rightSamples);
    leftSamples = filtered.left;
    rightSamples = filtered.right;
  }

  // ... rest of function ...
}
```

### Step 3.2: Add Checkbox to Export Modal

**File**: `minimal-prototype/src/components/ExportModal.tsx`

**Add state and checkbox**:

```typescript
// Add state (around line 30-50)
const [sb16Mode, setSB16Mode] = useState<boolean>(() => {
  // Load from localStorage (user's last preference)
  const saved = localStorage.getItem('sb16Mode');
  return saved === 'true';
});

// Update export function call
const handleExport = async () => {
  setIsExporting(true);
  try {
    const wavBuffer = await renderToWAV(
      pattern,
      instrumentPatches,
      setProgress,
      sb16Mode // Pass SB16 mode
    );

    // ... rest of export logic ...
  }
};

// Add checkbox in UI (in the modal dialog)
<div className="export-options">
  <label>
    <input
      type="checkbox"
      checked={sb16Mode}
      onChange={(e) => setSB16Mode(e.target.checked)}
    />
    Sound Blaster 16 Mode (analog filtering)
  </label>
</div>
```

---

## Phase 4: Testing & Validation (2-3 hours)

### Test 1: Frequency Response Test

**Create test script**: `minimal-prototype/scripts/testSB16FilterResponse.js`

```javascript
/**
 * Test SB16 filter frequency response
 * Generates tone sweep and analyzes output
 */

// Generate test tones at different frequencies
const testFrequencies = [100, 500, 1000, 5000, 8000, 10000, 12000, 16000, 18000, 20000];

// TODO: Implement tone generator and frequency analyzer
```

### Test 2: Subjective Listening Test

1. Load E1M1 pattern
2. Play with SB16 mode OFF
3. Play with SB16 mode ON
4. Compare:
   - Should sound "warmer" and less "harsh"
   - High frequencies should be softer
   - Should sound closer to DOS hardware

### Test 3: Export Test

1. Export E1M1 with SB16 mode OFF
2. Export E1M1 with SB16 mode ON
3. Compare waveforms in audio editor (Audacity)
4. Analyze spectrum (should show high-frequency rolloff)

### Test 4: Performance Test

1. Monitor CPU usage during playback
2. SB16 mode should add <2% CPU overhead
3. Test on various hardware (desktop, laptop)

---

## Implementation Checklist

### Phase 1: Filter Core
- [ ] Create SB16Filter.ts with biquad implementation
- [ ] Calculate high-shelf coefficients (8 kHz, -2 dB)
- [ ] Calculate low-pass coefficients (16 kHz)
- [ ] Implement processStereo() method
- [ ] Add soft clipping for saturation
- [ ] Run TypeScript type check

### Phase 2: Real-Time Playback
- [ ] Add SB16Filter to opl-worklet-processor.js
- [ ] Add message handler for setSB16Mode
- [ ] Apply filter in process() method
- [ ] Add toggle button to Tracker UI
- [ ] Add CSS styling for button
- [ ] Test toggle functionality
- [ ] Verify audio output changes

### Phase 3: WAV Export
- [ ] Import SB16Filter in OfflineAudioRenderer.ts
- [ ] Add sb16Mode parameter to renderToWAV()
- [ ] Apply filter before WAV encoding
- [ ] Add checkbox to ExportModal
- [ ] Wire up checkbox state
- [ ] Test WAV export with filtering

### Phase 4: Testing
- [ ] Create frequency response test
- [ ] Perform subjective listening tests
- [ ] Export and analyze WAV spectrum
- [ ] Monitor CPU performance
- [ ] Document results

### Phase 5: Documentation
- [ ] Update README with usage instructions
- [ ] Add comments to all filter code
- [ ] Create user guide
- [ ] Update changelog

---

## Success Criteria

### Functional Requirements
- ✅ SB16 filter can be toggled on/off in real-time
- ✅ Filter applies to both playback and export
- ✅ Setting persists across sessions
- ✅ No audio glitches or artifacts

### Audio Quality
- ✅ High frequencies rolled off smoothly
- ✅ Sound is "warmer" compared to clean mode
- ✅ No audible distortion or artifacts
- ✅ Closer to real Sound Blaster 16 sound

### Performance
- ✅ CPU overhead < 2%
- ✅ No latency increase
- ✅ Works on various hardware

---

## Rollback Plan

If issues arise:

1. **Disable by default**: Set `sb16Enabled = false` in all code
2. **Hide UI**: Comment out toggle button
3. **Keep code**: Leave implementation in place for future fixes
4. **Document issues**: Create issue tracker entry

---

## Future Enhancements

After initial implementation:

1. **Adjustable filter parameters** - Let users tweak cutoff frequencies
2. **Multiple sound card modes** - Add OPL2, AWE32, etc.
3. **Impulse response convolution** - Use real hardware IRs
4. **A/B comparison tool** - Quick toggle to compare modes

---

**Document Status**: Ready for Implementation
**Estimated Total Time**: 8-12 hours
**Last Updated**: 2025-11-12
