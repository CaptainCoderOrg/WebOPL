# Code Review: Export Feature (Branch: export-feature-attempt-2)

**Date:** 2025-01-11
**Reviewer:** Claude Code
**Status:** ⚠️ REQUIRES FIXES BEFORE MERGE

---

## Executive Summary

The export feature adds WAV audio export with two modes: standard export and seamless loop export. The implementation is well-structured with excellent documentation, but **22 issues** must be addressed before merging to main.

**Overall Assessment:**
- **Code Quality**: 7/10
- **Security**: 6/10 (critical eval() issue)
- **Performance**: 7/10
- **Maintainability**: 8/10
- **Test Coverage**: 4/10

**Changes:**
- 54 files changed
- 16,298 lines added (includes documentation)
- 34 lines removed

**Recommendation:** ✅ **APPROVE WITH REQUIRED FIXES**

---

## Issue Summary

| Severity | Count | Must Fix Before Merge? |
|----------|-------|------------------------|
| Critical | 3 | ✅ YES |
| High | 5 | ✅ YES |
| Medium | 8 | ⚠️ RECOMMENDED |
| Low | 6 | 💡 OPTIONAL |

**Estimated Fix Time:** 18-28 hours total
- Critical: 2-4 hours
- High: 4-6 hours
- Medium: 8-12 hours
- Low: 4-6 hours

---

## 🚨 CRITICAL ISSUES (MUST FIX)

### Issue #1: Security - Use of eval() for Code Loading

**Severity:** 🔴 CRITICAL
**File:** `minimal-prototype/src/export/OfflineAudioRenderer.ts`
**Line:** 178
**Category:** Security Vulnerability

**Problem:**
```typescript
const code = await response.text();
eval(code);
```

The code uses `eval()` to load the OPL3 library. This violates Content Security Policy best practices and poses a security risk even for local resources.

**Impact:**
- Could enable code injection attacks if source is compromised
- Violates CSP (Content Security Policy) best practices
- Browser security warnings

**Steps to Fix:**

1. Open `minimal-prototype/src/export/OfflineAudioRenderer.ts`
2. Locate lines 167-183 (the `loadOPL3Library` function)
3. Replace with script injection approach (like exportPattern.ts):

```typescript
async loadOPL3Library(): Promise<any> {
  // Check if already loaded
  if (typeof (globalThis as any).OPL3?.OPL3 !== 'undefined') {
    return (globalThis as any).OPL3.OPL3;
  }

  // Load via script injection (safer than eval)
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/node_modules/opl3/dist/opl3.js';

    script.onload = () => {
      if ((globalThis as any).OPL3?.OPL3) {
        resolve((globalThis as any).OPL3.OPL3);
      } else {
        reject(new Error('OPL3 library loaded but OPL3.OPL3 not found'));
      }
    };

    script.onerror = () => {
      reject(new Error('Failed to load OPL3 script'));
    };

    document.head.appendChild(script);
  });
}
```

4. Test export functionality to ensure OPL3 library loads correctly
5. Verify no console errors or warnings

**Verification:**
- [ ] No eval() calls remain in codebase
- [ ] Export functionality works
- [ ] Browser console shows no CSP warnings

---

### Issue #2: Memory Leak - Missing Cleanup in ExportModal useEffect

**Severity:** 🔴 CRITICAL
**File:** `minimal-prototype/src/components/ExportModal.tsx`
**Line:** 382-401
**Category:** Memory Management

**Problem:**
```typescript
useEffect(() => {
  if (!originalWAV) return;

  let processedWAV = originalWAV;

  // ... processing ...

  setGeneratedWAV(processedWAV);
  const waveform = generateWaveformFromWAV(processedWAV, 1000);
  setWaveformData(waveform);
}, [normalizeEnabled, normalizeDb, fadeIn, fadeInDuration, fadeOut, fadeOutDuration, originalWAV]);
```

No cleanup function. If component unmounts during processing, state updates will occur on unmounted component.

**Impact:**
- Memory leaks
- "Can't perform state update on unmounted component" warnings
- Potential crashes in production

**Steps to Fix:**

1. Open `minimal-prototype/src/components/ExportModal.tsx`
2. Locate the useEffect at lines 382-401
3. Add cleanup logic:

```typescript
useEffect(() => {
  if (!originalWAV) return;

  let isCancelled = false;

  // Process audio
  const processAudio = () => {
    let processedWAV = originalWAV;

    // Apply normalization if enabled
    if (normalizeEnabled && typeof normalizeDb === 'number') {
      processedWAV = normalizeAudio(processedWAV, normalizeDb);
    }

    // Apply fades if enabled
    if (fadeIn || fadeOut) {
      const fadeInMs = fadeIn && typeof fadeInDuration === 'number' ? fadeInDuration : 0;
      const fadeOutMs = fadeOut && typeof fadeOutDuration === 'number' ? fadeOutDuration : 0;
      processedWAV = applyFades(processedWAV, fadeInMs, fadeOutMs);
    }

    // Only update state if not cancelled
    if (!isCancelled) {
      setGeneratedWAV(processedWAV);
      const waveform = generateWaveformFromWAV(processedWAV, 1000);
      setWaveformData(waveform);
    }
  };

  processAudio();

  // Cleanup function
  return () => {
    isCancelled = true;
  };
}, [normalizeEnabled, normalizeDb, fadeIn, fadeInDuration, fadeOut, fadeOutDuration, originalWAV]);
```

4. Test by:
   - Opening export modal
   - Starting an export
   - Closing modal before completion
   - Check console for warnings

**Verification:**
- [ ] No "state update on unmounted component" warnings
- [ ] Export still works correctly
- [ ] Closing modal during processing doesn't cause errors

---

### Issue #3: Memory Leak - AudioContext Not Properly Closed

**Severity:** 🔴 CRITICAL
**File:** `minimal-prototype/src/components/WaveformDisplay.tsx`
**Line:** 42-74
**Category:** Memory Management / Resource Leak

**Problem:**
```typescript
useEffect(() => {
  if (!wavBuffer) return;

  const setupAudio = async () => {
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    // ...
  };

  setupAudio().catch((err) => {
    console.error('[WaveformDisplay] Failed to setup audio:', err);
  });

  return () => {
    // Cleanup runs AFTER new effect starts
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      // ...
    }
  };
}, [wavBuffer]);
```

When `wavBuffer` changes, new AudioContext is created before old one closes. Browser limit is ~6 contexts.

**Impact:**
- Multiple AudioContexts exhaust system resources
- Browser may block new contexts ("Too many AudioContexts")
- Performance degradation

**Steps to Fix:**

1. Open `minimal-prototype/src/components/WaveformDisplay.tsx`
2. Locate the useEffect at lines 42-74
3. Replace with proper cleanup:

```typescript
useEffect(() => {
  if (!wavBuffer) return;

  let isCancelled = false;

  const setupAudio = async () => {
    // Close any existing context FIRST
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        await audioContextRef.current.close();
      } catch (err) {
        console.error('[WaveformDisplay] Error closing previous AudioContext:', err);
      }
    }

    // Check if cancelled during close
    if (isCancelled) return;

    // Create new context
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    try {
      const audioBuffer = await audioContext.decodeAudioData(wavBuffer.slice(0));

      if (isCancelled) {
        // If cancelled during decoding, close and exit
        await audioContext.close();
        return;
      }

      audioBufferRef.current = audioBuffer;
    } catch (err) {
      console.error('[WaveformDisplay] Failed to decode audio data:', err);
      if (!isCancelled) {
        await audioContext.close();
      }
      return;
    }
  };

  setupAudio().catch((err) => {
    console.error('[WaveformDisplay] Failed to setup audio:', err);
  });

  // Cleanup function
  return () => {
    isCancelled = true;

    // Stop and disconnect source node
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // Ignore errors if already stopped
      }
      sourceNodeRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Clear refs
    audioBufferRef.current = null;
    setIsPlaying(false);
    setPlaybackPosition(0);
  };
}, [wavBuffer]);
```

4. Test by:
   - Opening export modal
   - Generating audio multiple times (changes wavBuffer)
   - Check browser dev tools → Performance → Memory
   - Verify AudioContext count doesn't grow

**Verification:**
- [ ] Only one AudioContext exists at a time
- [ ] No "Too many AudioContexts" errors
- [ ] Playback still works correctly
- [ ] No errors when rapidly changing post-processing settings

---

## ⚠️ HIGH PRIORITY ISSUES

### Issue #4: Race Condition - AbortController Not Checked After Async

**Severity:** 🟠 HIGH
**File:** `minimal-prototype/src/components/ExportModal.tsx`
**Line:** 112-189
**Category:** Concurrency / Race Condition

**Problem:**
```typescript
const handleExport = async () => {
  const controller = new AbortController();
  setAbortController(controller);

  try {
    // ... export logic ...

    setGeneratedWAV(wavBuffer); // No check if aborted
    setCurrentPage(2);
  } catch (err) {
    setError(errorMessage); // No check if aborted
  }
};
```

After async operations, the code doesn't check if export was aborted before updating state.

**Impact:**
- UI shows incorrect state when export is cancelled
- "Success" state shown even though export was aborted
- Confusing user experience

**Steps to Fix:**

1. Open `minimal-prototype/src/components/ExportModal.tsx`
2. Locate `handleExport` function (lines 112-189)
3. Add abort checks before state updates:

```typescript
const handleExport = async () => {
  const controller = new AbortController();
  setAbortController(controller);

  try {
    // ... export logic (lines 115-168) ...

    // Check if aborted before updating success state
    if (controller.signal.aborted) {
      console.log('[ExportModal] Export aborted, not updating state');
      return;
    }

    // Update state only if not aborted
    setOriginalWAV(wavBuffer);
    let processedWAV = wavBuffer;

    if (normalizeEnabled && typeof normalizeDb === 'number') {
      processedWAV = normalizeAudio(processedWAV, normalizeDb);
    }

    if (fadeIn || fadeOut) {
      const fadeInMs = fadeIn && typeof fadeInDuration === 'number' ? fadeInDuration : 0;
      const fadeOutMs = fadeOut && typeof fadeOutDuration === 'number' ? fadeOutDuration : 0;
      processedWAV = applyFades(processedWAV, fadeInMs, fadeOutMs);
    }

    setGeneratedWAV(processedWAV);

    const waveform = generateWaveformFromWAV(processedWAV, 1000);
    setWaveformData(waveform);
    setCurrentPage(2);
  } catch (err: any) {
    // Check if error is due to abort
    if (err.name === 'AbortError' || controller.signal.aborted) {
      console.log('[ExportModal] Export aborted');
      return;
    }

    console.error('[ExportModal] Export failed:', err);
    const errorMessage = err instanceof Error
      ? `Export failed: ${err.message}`
      : 'Export failed due to an unknown error. Please try again.';
    setError(errorMessage);
  } finally {
    // Always cleanup
    setIsExporting(false);
    setAbortController(null);
  }
};
```

4. Test by:
   - Start export
   - Click Cancel immediately
   - Verify UI returns to page 1
   - Verify no "success" state shown

**Verification:**
- [ ] Cancelling export doesn't show success state
- [ ] UI correctly returns to setup page
- [ ] No console errors
- [ ] Can start new export after cancelling

---

### Issue #5: Type Safety - Unsafe Type Assertions

**Severity:** 🟠 HIGH
**File:** `minimal-prototype/src/export/exportPattern.ts`
**Line:** 67-68, 76, 103
**Category:** Type Safety

**Problem:**
```typescript
if ((globalThis as any).OPL3) {
  return (globalThis as any).OPL3.OPL3;
}
```

Multiple unsafe `as any` casts without proper type guards.

**Impact:**
- Runtime errors if OPL3 library structure changes
- No compile-time safety
- Difficult to debug

**Steps to Fix:**

1. Create a type guard utility file:

**File:** `minimal-prototype/src/utils/opl3TypeGuards.ts`
```typescript
/**
 * Type guard to check if OPL3 library is available
 */
export function isOPL3Available(): boolean {
  return (
    typeof (globalThis as any).OPL3 !== 'undefined' &&
    typeof (globalThis as any).OPL3.OPL3 !== 'undefined'
  );
}

/**
 * Safely get OPL3 constructor
 * @throws Error if OPL3 is not available
 */
export function getOPL3Constructor(): any {
  if (!isOPL3Available()) {
    throw new Error('OPL3 library is not loaded');
  }
  return (globalThis as any).OPL3.OPL3;
}

/**
 * Type definition for OPL3 instance (based on observed API)
 */
export interface OPL3Instance {
  write(register: number, value: number): void;
  read(buffer: Int16Array): void;
  init(sampleRate: number): void;
}
```

2. Update `minimal-prototype/src/export/exportPattern.ts`:

```typescript
import { isOPL3Available, getOPL3Constructor } from '../utils/opl3TypeGuards';

/**
 * Load OPL3 library if not already loaded
 */
async function loadOPL3Library(): Promise<any> {
  if (isOPL3Available()) {
    return getOPL3Constructor();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/node_modules/opl3/dist/opl3.js';

    script.onload = () => {
      if (isOPL3Available()) {
        resolve(getOPL3Constructor());
      } else {
        reject(new Error('OPL3 library loaded but API not found'));
      }
    };

    script.onerror = () => reject(new Error('Failed to load OPL3 script'));
    document.head.appendChild(script);
  });
}
```

3. Update `minimal-prototype/src/export/OfflineAudioRenderer.ts` similarly (after fixing Issue #1)

**Verification:**
- [ ] TypeScript compiles without warnings
- [ ] Export functionality works
- [ ] Better error messages if OPL3 fails to load

---

### Issue #6: Performance - Unnecessary Full Buffer Copies

**Severity:** 🟠 HIGH
**File:** `minimal-prototype/src/utils/audioProcessing.ts`
**Line:** 12-70, 79-140
**Category:** Performance

**Problem:**
```typescript
const newBuffer = new ArrayBuffer(wavBuffer.byteLength);
const newDataView = new DataView(newBuffer);

// Copy header byte by byte
for (let i = 0; i < headerSize; i++) {
  newDataView.setUint8(i, dataView.getUint8(i));
}
```

Both `normalizeAudio` and `applyFades` copy the entire buffer byte-by-byte, including header.

**Impact:**
- Slower performance for large files
- Unnecessary memory allocation
- Worse with multiple post-processing operations chained

**Steps to Fix:**

1. Open `minimal-prototype/src/utils/audioProcessing.ts`
2. Optimize both functions to use `slice()` for initial copy:

**For `normalizeAudio` (lines 12-70):**
```typescript
export function normalizeAudio(wavBuffer: ArrayBuffer, targetDb: number): ArrayBuffer {
  const dataView = new DataView(wavBuffer);
  const headerSize = 44;

  // Read header information
  const sampleRate = dataView.getUint32(24, true);
  const subchunk2Size = dataView.getUint32(40, true);
  const bitsPerSample = dataView.getUint16(34, true);
  const numChannels = dataView.getUint16(22, true);

  const bytesPerSample = bitsPerSample / 8;
  const totalSamples = subchunk2Size / bytesPerSample;

  // Find peak amplitude
  let peakAmplitude = 0;
  for (let i = 0; i < totalSamples; i++) {
    const offset = headerSize + i * bytesPerSample;
    const sample = Math.abs(dataView.getInt16(offset, true));
    if (sample > peakAmplitude) {
      peakAmplitude = sample;
    }
  }

  // If already at or below target, return original
  if (peakAmplitude === 0) {
    console.warn('[normalizeAudio] Audio is silent, skipping normalization');
    return wavBuffer;
  }

  // Calculate normalization factor
  const targetLinear = Math.pow(10, targetDb / 20);
  const maxValue = 32767;
  const targetPeak = maxValue * targetLinear;
  const normalizationFactor = targetPeak / peakAmplitude;

  console.log(`[normalizeAudio] Peak: ${peakAmplitude}, Target: ${targetPeak.toFixed(0)}, Factor: ${normalizationFactor.toFixed(3)}`);

  // Clone entire buffer at once (much faster than byte-by-byte)
  const newBuffer = wavBuffer.slice(0);
  const newDataView = new DataView(newBuffer);

  // Only modify audio data (header is already copied)
  let clippedSamples = 0;
  for (let i = 0; i < totalSamples; i++) {
    const offset = headerSize + i * bytesPerSample;
    const sample = dataView.getInt16(offset, true);
    const normalizedSample = Math.round(sample * normalizationFactor);
    const clampedSample = Math.max(-32768, Math.min(32767, normalizedSample));

    if (normalizedSample !== clampedSample) {
      clippedSamples++;
    }

    newDataView.setInt16(offset, clampedSample, true);
  }

  // Warn if significant clipping occurred
  if (clippedSamples > totalSamples * 0.01) {
    console.warn(
      `[normalizeAudio] ${clippedSamples} samples clipped ` +
      `(${(clippedSamples/totalSamples*100).toFixed(2)}%). ` +
      `Consider lower target dB.`
    );
  }

  return newBuffer;
}
```

**For `applyFades` (lines 79-140):**
```typescript
export function applyFades(
  wavBuffer: ArrayBuffer,
  fadeInMs: number,
  fadeOutMs: number
): ArrayBuffer {
  // Parse WAV header
  const dataView = new DataView(wavBuffer);
  const headerSize = 44;

  // Read header information
  const sampleRate = dataView.getUint32(24, true);
  const subchunk2Size = dataView.getUint32(40, true);
  const bitsPerSample = dataView.getUint16(34, true);
  const numChannels = dataView.getUint16(22, true);

  // Calculate total samples (per channel)
  const bytesPerSample = bitsPerSample / 8;
  const totalSamplesPerChannel = subchunk2Size / (bytesPerSample * numChannels);

  // Convert fade durations to samples
  const fadeInSamples = Math.floor((fadeInMs / 1000) * sampleRate);
  const fadeOutSamples = Math.floor((fadeOutMs / 1000) * sampleRate);

  console.log(
    `[applyFades] Fade in: ${fadeInSamples} samples, ` +
    `Fade out: ${fadeOutSamples} samples, ` +
    `Total: ${totalSamplesPerChannel} samples`
  );

  // Clone entire buffer at once (much faster than byte-by-byte)
  const newBuffer = wavBuffer.slice(0);
  const newDataView = new DataView(newBuffer);

  // Apply fades to audio data (header is already copied)
  for (let i = 0; i < totalSamplesPerChannel; i++) {
    let gain = 1.0;

    // Apply fade in
    if (fadeInSamples > 0 && i < fadeInSamples) {
      gain *= i / fadeInSamples;
    }

    // Apply fade out
    if (fadeOutSamples > 0 && i >= totalSamplesPerChannel - fadeOutSamples) {
      const fadeOutProgress = (totalSamplesPerChannel - i) / fadeOutSamples;
      gain *= fadeOutProgress;
    }

    // Apply gain to all channels
    for (let ch = 0; ch < numChannels; ch++) {
      const offset = headerSize + (i * numChannels + ch) * bytesPerSample;
      const sample = dataView.getInt16(offset, true);
      const fadedSample = Math.round(sample * gain);

      // Clamp to prevent overflow
      const clampedSample = Math.max(-32768, Math.min(32767, fadedSample));

      newDataView.setInt16(offset, clampedSample, true);
    }
  }

  return newBuffer;
}
```

3. Test with large exports (10+ loops) and compare performance

**Verification:**
- [ ] Export still works correctly
- [ ] Audio quality unchanged
- [ ] Performance improved for large files
- [ ] No new errors

---

### Issue #7: Error Handling - Missing Try-Catch in Audio Decoding

**Severity:** 🟠 HIGH
**File:** `minimal-prototype/src/components/WaveformDisplay.tsx`
**Line:** 51
**Category:** Error Handling

**Problem:**
```typescript
const audioBuffer = await audioContext.decodeAudioData(wavBuffer.slice(0));
```

No try-catch for audio decoding. Corrupted WAV files will cause unhandled promise rejection.

**Impact:**
- Unhandled promise rejection crashes component
- No user feedback for invalid audio
- Difficult to debug

**Steps to Fix:**

This will be partially fixed by Issue #3, but ensure the try-catch is comprehensive:

1. Open `minimal-prototype/src/components/WaveformDisplay.tsx`
2. Ensure the setupAudio function has proper error handling (from Issue #3 fix):

```typescript
const setupAudio = async () => {
  // Close any existing context FIRST
  if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
    try {
      await audioContextRef.current.close();
    } catch (err) {
      console.error('[WaveformDisplay] Error closing previous AudioContext:', err);
    }
  }

  if (isCancelled) return;

  const audioContext = new AudioContext();
  audioContextRef.current = audioContext;

  try {
    const audioBuffer = await audioContext.decodeAudioData(wavBuffer.slice(0));

    if (isCancelled) {
      await audioContext.close();
      return;
    }

    audioBufferRef.current = audioBuffer;
  } catch (err) {
    console.error('[WaveformDisplay] Failed to decode audio data:', err);

    // Optionally: Set error state to inform user
    // setDecodingError('Unable to decode audio. The WAV file may be corrupted.');

    if (!isCancelled) {
      await audioContext.close();
    }
    return;
  }
};
```

3. Optionally, add error state to component:

```typescript
const [decodingError, setDecodingError] = useState<string | null>(null);

// In render:
{decodingError && (
  <div className="waveform-error">
    {decodingError}
  </div>
)}
```

**Verification:**
- [ ] No unhandled promise rejections
- [ ] Corrupted WAV files don't crash the app
- [ ] Error is logged to console

---

### Issue #8: Code Duplication - OPL3 Loading Logic

**Severity:** 🟠 HIGH
**File:** Multiple files
**Lines:**
- `exportPattern.ts`: 65-85
- `OfflineAudioRenderer.ts`: 167-183
**Category:** Code Quality / Maintainability

**Problem:**
Two different implementations of OPL3 library loading:
- exportPattern.ts uses script injection
- OfflineAudioRenderer.ts uses eval() (also Issue #1)

**Impact:**
- Code duplication
- Inconsistent behavior
- Harder to maintain

**Steps to Fix:**

1. Create shared utility:

**File:** `minimal-prototype/src/utils/opl3Loader.ts`
```typescript
/**
 * Shared OPL3 library loader
 *
 * This utility provides a single, consistent way to load the OPL3 library
 * across the application. It uses script injection (not eval) for security.
 */

/**
 * Check if OPL3 library is already loaded
 */
export function isOPL3Loaded(): boolean {
  return (
    typeof (globalThis as any).OPL3 !== 'undefined' &&
    typeof (globalThis as any).OPL3.OPL3 !== 'undefined'
  );
}

/**
 * Get OPL3 constructor if already loaded
 * @throws Error if not loaded
 */
export function getOPL3(): any {
  if (!isOPL3Loaded()) {
    throw new Error('OPL3 library not loaded. Call loadOPL3Library() first.');
  }
  return (globalThis as any).OPL3.OPL3;
}

/**
 * Load OPL3 library dynamically
 *
 * If already loaded, returns immediately.
 * Otherwise, injects script tag and waits for load.
 *
 * @returns Promise that resolves to OPL3 constructor
 */
export async function loadOPL3Library(): Promise<any> {
  // Return immediately if already loaded
  if (isOPL3Loaded()) {
    return getOPL3();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/node_modules/opl3/dist/opl3.js';

    script.onload = () => {
      if (isOPL3Loaded()) {
        resolve(getOPL3());
      } else {
        reject(new Error('OPL3 library loaded but OPL3.OPL3 not found'));
      }
    };

    script.onerror = () => {
      reject(new Error('Failed to load OPL3 script from /node_modules/opl3/dist/opl3.js'));
    };

    document.head.appendChild(script);
  });
}
```

2. Update `minimal-prototype/src/export/exportPattern.ts`:

```typescript
import { loadOPL3Library } from '../utils/opl3Loader';

// Remove the local loadOPL3Library function (lines 65-85)
// Replace calls with imported version

// In renderPatternToBuffers function:
const OPL3 = await loadOPL3Library();
```

3. Update `minimal-prototype/src/export/OfflineAudioRenderer.ts`:

```typescript
import { loadOPL3Library } from '../utils/opl3Loader';

// Remove the local loadOPL3Library function (lines 167-183)
// Update the render method:

async render(): Promise<{ left: Int16Array; right: Int16Array }> {
  const OPL3 = await loadOPL3Library();
  // ... rest of method
}
```

4. Build and test export functionality

**Verification:**
- [ ] No code duplication
- [ ] Both export modes work
- [ ] Single source of truth for OPL3 loading
- [ ] No eval() usage anywhere

---

## 📊 MEDIUM PRIORITY ISSUES

### Issue #9: Missing Error Boundary

**Severity:** 🟡 MEDIUM
**File:** `minimal-prototype/src/components/ExportModal.tsx`
**Category:** Error Handling / Robustness

**Problem:**
The ExportModal can throw errors during rendering, but there's no error boundary to catch them.

**Impact:**
- Unhandled rendering errors crash the entire UI
- Poor user experience

**Steps to Fix:**

1. Create error boundary component:

**File:** `minimal-prototype/src/components/ErrorBoundary.tsx`
```typescript
import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h3>Something went wrong</h3>
          <p>An unexpected error occurred. Please try again.</p>
          <pre style={{
            textAlign: 'left',
            backgroundColor: '#f5f5f5',
            padding: '10px',
            overflow: 'auto',
            maxWidth: '500px',
            margin: '10px auto'
          }}>
            {this.state.error?.message}
          </pre>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

2. Update `minimal-prototype/src/components/Tracker.tsx` to wrap ExportModal:

```typescript
import { ErrorBoundary } from './ErrorBoundary';

// In the render method, wrap the Modal:
{showExportModal && (
  <Modal onClose={() => setShowExportModal(false)}>
    <ErrorBoundary>
      <ExportModal
        patternName={patternName}
        pattern={pattern}
        trackInstruments={trackInstruments}
        instrumentBank={instrumentBank}
        bpm={bpm}
        onClose={() => setShowExportModal(false)}
      />
    </ErrorBoundary>
  </Modal>
)}
```

3. Add defensive checks in ExportModal render:

```typescript
// In the waveform display section:
{waveformData && generatedWAV && waveformData.length > 0 && (
  <div className="export-waveform-section">
    <WaveformDisplay
      waveformData={waveformData}
      wavBuffer={generatedWAV}
      width={600}
      height={80}
    />
  </div>
)}
```

**Verification:**
- [ ] Error boundary catches rendering errors
- [ ] User sees friendly error message
- [ ] Can recover from errors
- [ ] Errors logged to console

---

### Issue #10: Edge Case - Loop Count Validation

**Severity:** 🟡 MEDIUM
**File:** `minimal-prototype/src/components/ExportModal.tsx`
**Line:** 245-261
**Category:** Input Validation

**Problem:**
```typescript
const applyCustomLoopCount = () => {
  const parsed = parseInt(customLoopInput, 10);

  if (isNaN(parsed) || parsed < 0) {
    setLoopCount(1);
    setEditingCustomLoop(false);
  } else if (parsed >= 0 && parsed <= 3) {
    setLoopCount(parsed + 1);
    setEditingCustomLoop(false);
  } else {
    setLoopCount(parsed + 1);
    setEditingCustomLoop(false);
  }
};
```

Edge case handling could be clearer and more explicit.

**Impact:**
- Confusing behavior for edge cases
- No user feedback for invalid inputs

**Steps to Fix:**

1. Open `minimal-prototype/src/components/ExportModal.tsx`
2. Improve validation with explicit cases and user feedback:

```typescript
const applyCustomLoopCount = () => {
  const parsed = parseInt(customLoopInput, 10);

  // Handle invalid input
  if (isNaN(parsed) || customLoopInput.trim() === '') {
    // Invalid: default to 0x (loopCount = 1)
    console.warn('[ExportModal] Invalid loop count input, defaulting to 0x');
    setLoopCount(1);
    setEditingCustomLoop(false);
    setCustomLoopInput('');
    return;
  }

  // Handle negative numbers
  if (parsed < 0) {
    console.warn('[ExportModal] Negative loop count not allowed, defaulting to 0x');
    setLoopCount(1);
    setEditingCustomLoop(false);
    return;
  }

  // Handle 0 explicitly
  if (parsed === 0) {
    setLoopCount(1); // 0x = 1 loop
    setEditingCustomLoop(false);
    return;
  }

  // Handle 1-3 (snap to buttons)
  if (parsed >= 1 && parsed <= 3) {
    setLoopCount(parsed + 1);
    setEditingCustomLoop(false);
    return;
  }

  // Handle 4+ (custom)
  if (parsed >= 4) {
    // Check for unreasonably large values
    const MAX_LOOP_COUNT = 100;
    if (parsed > MAX_LOOP_COUNT) {
      console.warn(`[ExportModal] Loop count ${parsed} exceeds maximum ${MAX_LOOP_COUNT}`);
      // Optionally show error to user
      alert(`Loop count too high. Maximum is ${MAX_LOOP_COUNT} loops.`);
      return;
    }

    setLoopCount(parsed + 1);
    setEditingCustomLoop(false);
    return;
  }
};
```

3. Add maximum loop count constant at top of file:

```typescript
// Maximum loop count to prevent excessive file sizes
const MAX_LOOP_COUNT = 100;
```

**Verification:**
- [ ] Invalid inputs handled gracefully
- [ ] Maximum loop count enforced
- [ ] User receives feedback for invalid inputs
- [ ] No confusing behavior

---

### Issue #11: Performance - Waveform Generation Optimization

**Severity:** 🟡 MEDIUM
**File:** `minimal-prototype/src/utils/waveformGenerator.ts`
**Line:** 27-46
**Category:** Performance

**Problem:**
```typescript
for (let i = 0; i < targetPoints; i++) {
  const startSample = i * samplesPerPoint;
  const endSample = Math.min((i + 1) * samplesPerPoint, samplesPerChannel);

  let maxAmplitude = 0;

  for (let j = startSample; j < endSample; j++) {
    const offset = headerSize + j * 4;
    const left = dataView.getInt16(offset, true);
    const right = dataView.getInt16(offset + 2, true);
    const mono = (Math.abs(left) + Math.abs(right)) / 2 / 32768;
    maxAmplitude = Math.max(maxAmplitude, mono);
  }

  waveform.push(maxAmplitude);
}
```

Uses DataView which is slower than typed arrays for large files.

**Impact:**
- Slower waveform generation for large exports
- UI lag when changing post-processing settings

**Steps to Fix:**

1. Open `minimal-prototype/src/utils/waveformGenerator.ts`
2. Optimize to use Int16Array:

```typescript
/**
 * Generate waveform data from WAV buffer
 *
 * @param wavBuffer - WAV file as ArrayBuffer
 * @param targetPoints - Number of waveform points to generate (default: 1000)
 * @returns Array of normalized amplitude values (0-1)
 */
export function generateWaveformFromWAV(
  wavBuffer: ArrayBuffer,
  targetPoints: number = 1000
): number[] {
  const headerSize = 44;
  const totalBytes = wavBuffer.byteLength - headerSize;

  if (totalBytes <= 0) {
    console.warn('[generateWaveformFromWAV] Invalid WAV buffer');
    return [];
  }

  // Use Int16Array for faster access
  const audioData = new Int16Array(wavBuffer, headerSize);
  const samplesPerChannel = audioData.length / 2; // Stereo

  const samplesPerPoint = Math.ceil(samplesPerChannel / targetPoints);
  const waveform: number[] = [];

  for (let i = 0; i < targetPoints; i++) {
    const startSample = i * samplesPerPoint * 2; // *2 for stereo
    const endSample = Math.min((i + 1) * samplesPerPoint * 2, audioData.length);

    let maxAmplitude = 0;

    // Process stereo pairs
    for (let j = startSample; j < endSample; j += 2) {
      const left = Math.abs(audioData[j]);
      const right = Math.abs(audioData[j + 1]);
      const mono = (left + right) / 2 / 32768;
      maxAmplitude = Math.max(maxAmplitude, mono);
    }

    waveform.push(maxAmplitude);
  }

  return waveform;
}
```

3. Test with large exports and measure performance improvement

**Verification:**
- [ ] Waveform generation is faster
- [ ] Visual output is identical
- [ ] No errors with various file sizes

---

### Issue #12: Missing Accessibility - Keyboard Navigation

**Severity:** 🟡 MEDIUM
**File:** `minimal-prototype/src/components/WaveformDisplay.tsx`
**Line:** 374-380
**Category:** Accessibility

**Problem:**
```typescript
<canvas
  ref={canvasRef}
  className="waveform-canvas"
  onMouseDown={handleMouseDown}
  onMouseMove={handleMouseMove}
  style={{ cursor: wavBuffer ? 'pointer' : 'default' }}
/>
```

Waveform can only be seeked with mouse. No keyboard support for accessibility.

**Impact:**
- Keyboard-only users cannot seek audio
- Screen reader users have no access
- Fails WCAG accessibility standards

**Steps to Fix:**

1. Open `minimal-prototype/src/components/WaveformDisplay.tsx`
2. Add keyboard handler:

```typescript
/**
 * Handle keyboard navigation for waveform seeking
 */
const handleCanvasKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
  if (!wavBuffer) return;

  const step = e.shiftKey ? 0.1 : 0.01; // Larger steps with Shift
  let handled = false;

  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault();
      seekToPosition(Math.max(0, playbackPosition - step));
      handled = true;
      break;

    case 'ArrowRight':
      e.preventDefault();
      seekToPosition(Math.min(1, playbackPosition + step));
      handled = true;
      break;

    case 'Home':
      e.preventDefault();
      seekToPosition(0);
      handled = true;
      break;

    case 'End':
      e.preventDefault();
      seekToPosition(1);
      handled = true;
      break;

    case ' ':
    case 'Enter':
      e.preventDefault();
      handlePlayPauseClick();
      handled = true;
      break;
  }

  if (handled) {
    console.log(`[WaveformDisplay] Keyboard seek to ${(playbackPosition * 100).toFixed(1)}%`);
  }
};
```

3. Update canvas element with ARIA attributes:

```typescript
<canvas
  ref={canvasRef}
  className="waveform-canvas"
  onMouseDown={handleMouseDown}
  onMouseMove={handleMouseMove}
  onKeyDown={handleCanvasKeyDown}
  tabIndex={wavBuffer ? 0 : -1}
  role="slider"
  aria-label="Audio playback position"
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={Math.round(playbackPosition * 100)}
  aria-valuetext={`${Math.round(playbackPosition * 100)}% through audio`}
  style={{ cursor: wavBuffer ? 'pointer' : 'default' }}
/>
```

4. Add visual focus indicator in CSS:

**File:** `minimal-prototype/src/components/WaveformDisplay.css`
```css
.waveform-canvas:focus {
  outline: 2px solid #4a9eff;
  outline-offset: 2px;
}

.waveform-canvas:focus-visible {
  outline: 2px solid #4a9eff;
  outline-offset: 2px;
}
```

**Verification:**
- [ ] Can seek with arrow keys
- [ ] Shift+Arrow for larger steps
- [ ] Home/End keys work
- [ ] Space/Enter toggles playback
- [ ] Focus indicator visible
- [ ] Screen reader announces position

---

### Issue #13: Unused Files - Dead Code

**Severity:** 🟡 MEDIUM
**Files:**
- `minimal-prototype/src/utils/CrossfadeLoopEncoder.ts`
- `minimal-prototype/src/utils/LoopPointFinder.ts`
**Category:** Code Maintenance

**Problem:**
These files are not imported or used anywhere in the codebase. They appear to be from an earlier implementation that was replaced.

**Impact:**
- Code clutter
- Confusing for future developers
- Increases bundle size unnecessarily

**Steps to Fix:**

**Option A: Remove Files (Recommended)**

1. Delete unused files:
```bash
git rm minimal-prototype/src/utils/CrossfadeLoopEncoder.ts
git rm minimal-prototype/src/utils/LoopPointFinder.ts
```

2. Build to verify no imports:
```bash
cd minimal-prototype && npm run build
```

**Option B: Mark as Deprecated**

If you want to keep for reference:

1. Add deprecation notice to both files:

```typescript
/**
 * CrossfadeLoopEncoder - DEPRECATED
 *
 * This approach was replaced with context-aware rendering in exportPattern.ts.
 * The context-aware approach renders [last N rows | pattern | first N rows]
 * and extracts the core pattern, which naturally handles the loop boundary
 * without needing crossfade analysis.
 *
 * Kept for reference and potential future use.
 *
 * @deprecated Use context-aware rendering instead (exportSeamlessLoop)
 * @see exportPattern.ts - exportSeamlessLoop function
 * @see features/export-audio/SEAMLESS_LOOPS.md - Full documentation
 */
```

2. Move to archived directory:
```bash
mkdir -p minimal-prototype/src/utils/archived
git mv minimal-prototype/src/utils/CrossfadeLoopEncoder.ts minimal-prototype/src/utils/archived/
git mv minimal-prototype/src/utils/LoopPointFinder.ts minimal-prototype/src/utils/archived/
```

**Verification:**
- [ ] Build succeeds
- [ ] No import errors
- [ ] Bundle size reduced (if deleted)

---

### Issue #14: Magic Numbers - Extract Constants

**Severity:** 🟡 MEDIUM
**File:** `minimal-prototype/src/utils/audioProcessing.ts`
**Category:** Code Quality

**Problem:**
```typescript
const maxValue = 32767;
const headerSize = 44;
```

Magic numbers scattered throughout without named constants.

**Impact:**
- Harder to maintain
- Meaning not clear without comments
- Risk of inconsistency

**Steps to Fix:**

1. Open `minimal-prototype/src/utils/audioProcessing.ts`
2. Add constants at the top:

```typescript
/**
 * Audio Processing Utilities
 *
 * Post-processing functions for WAV audio files including normalization
 * and fade in/out effects.
 */

// WAV file format constants
const WAV_HEADER_SIZE = 44; // Bytes in standard WAV header
const INT16_MAX = 32767;    // Maximum value for 16-bit signed integer
const INT16_MIN = -32768;   // Minimum value for 16-bit signed integer
const STEREO_CHANNELS = 2;  // Number of channels in stereo audio
const BYTES_PER_SAMPLE_16BIT = 2; // Bytes per sample for 16-bit audio

// Processing constants
const CLIPPING_WARNING_THRESHOLD = 0.01; // Warn if >1% of samples clip

/**
 * Normalize audio to target dB level
 *
 * Finds the peak amplitude in the audio and applies gain to reach
 * the target dB level (relative to full scale).
 *
 * @param wavBuffer - Input WAV file as ArrayBuffer
 * @param targetDb - Target peak level in dB (e.g., -1.0 for -1 dB)
 * @returns Normalized WAV file as ArrayBuffer
 */
export function normalizeAudio(wavBuffer: ArrayBuffer, targetDb: number): ArrayBuffer {
  const dataView = new DataView(wavBuffer);

  // Read header information
  const sampleRate = dataView.getUint32(24, true);
  const subchunk2Size = dataView.getUint32(40, true);
  const bitsPerSample = dataView.getUint16(34, true);
  const numChannels = dataView.getUint16(22, true);

  const bytesPerSample = bitsPerSample / 8;
  const totalSamples = subchunk2Size / bytesPerSample;

  // Find peak amplitude
  let peakAmplitude = 0;
  for (let i = 0; i < totalSamples; i++) {
    const offset = WAV_HEADER_SIZE + i * bytesPerSample;
    const sample = Math.abs(dataView.getInt16(offset, true));
    if (sample > peakAmplitude) {
      peakAmplitude = sample;
    }
  }

  // If already at or below target, return original
  if (peakAmplitude === 0) {
    console.warn('[normalizeAudio] Audio is silent, skipping normalization');
    return wavBuffer;
  }

  // Calculate normalization factor
  const targetLinear = Math.pow(10, targetDb / 20);
  const targetPeak = INT16_MAX * targetLinear;
  const normalizationFactor = targetPeak / peakAmplitude;

  console.log(
    `[normalizeAudio] Peak: ${peakAmplitude}, ` +
    `Target: ${targetPeak.toFixed(0)}, ` +
    `Factor: ${normalizationFactor.toFixed(3)}`
  );

  // Clone entire buffer
  const newBuffer = wavBuffer.slice(0);
  const newDataView = new DataView(newBuffer);

  // Apply normalization
  let clippedSamples = 0;
  for (let i = 0; i < totalSamples; i++) {
    const offset = WAV_HEADER_SIZE + i * bytesPerSample;
    const sample = dataView.getInt16(offset, true);
    const normalizedSample = Math.round(sample * normalizationFactor);
    const clampedSample = Math.max(INT16_MIN, Math.min(INT16_MAX, normalizedSample));

    if (normalizedSample !== clampedSample) {
      clippedSamples++;
    }

    newDataView.setInt16(offset, clampedSample, true);
  }

  // Warn if significant clipping occurred
  if (clippedSamples > totalSamples * CLIPPING_WARNING_THRESHOLD) {
    console.warn(
      `[normalizeAudio] ${clippedSamples} samples clipped ` +
      `(${(clippedSamples/totalSamples*100).toFixed(2)}%). ` +
      `Consider lower target dB.`
    );
  }

  return newBuffer;
}

// Update applyFades similarly...
```

3. Update `applyFades` to use the same constants
4. Consider creating a shared constants file if used elsewhere:

**File:** `minimal-prototype/src/constants/audioConstants.ts`
```typescript
/**
 * Audio format constants used throughout the application
 */

export const WAV_HEADER_SIZE = 44;
export const INT16_MAX = 32767;
export const INT16_MIN = -32768;
export const SAMPLE_RATE = 49716; // OPL3 native sample rate
export const STEREO_CHANNELS = 2;
export const BYTES_PER_SAMPLE_16BIT = 2;
```

**Verification:**
- [ ] Code more readable
- [ ] Constants used consistently
- [ ] Build succeeds
- [ ] Functionality unchanged

---

### Issue #15: Console Output - Production Logging

**Severity:** 🟡 MEDIUM
**Files:** Multiple
**Category:** Code Quality / Performance

**Problem:**
Many `console.log` statements remain in production code:
- `OfflineAudioRenderer.ts`: 10+ log statements
- `WAVEncoder.ts`: Multiple logs
- `SimpleSynth.ts`: Throughout
- Others

**Impact:**
- Performance overhead in production
- Console clutter
- Potential information disclosure

**Steps to Fix:**

1. Create logging utility:

**File:** `minimal-prototype/src/utils/logger.ts`
```typescript
/**
 * Logging utility with environment-aware output
 *
 * In development: All logs shown
 * In production: Only warnings and errors
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  /**
   * Debug information (only in development)
   */
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Warning messages (always shown)
   */
  warn: (...args: any[]) => {
    console.warn(...args);
  },

  /**
   * Error messages (always shown)
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * Group messages (only in development)
   */
  group: (label: string) => {
    if (isDevelopment) {
      console.group(label);
    }
  },

  /**
   * End group (only in development)
   */
  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd();
    }
  },

  /**
   * Table output (only in development)
   */
  table: (data: any) => {
    if (isDevelopment) {
      console.table(data);
    }
  },
};
```

2. Replace console.log calls throughout codebase:

**In `OfflineAudioRenderer.ts`:**
```typescript
import { logger } from '../utils/logger';

// Replace:
console.log('[OfflineAudioRenderer] Loading GENMIDI patches...');

// With:
logger.log('[OfflineAudioRenderer] Loading GENMIDI patches...');
```

3. Keep console.warn and console.error as-is (or use logger.warn/error)

4. Run find-replace across files:
   - Find: `console\.log\(`
   - Replace: `logger.log(`

**Affected Files:**
- `minimal-prototype/src/export/OfflineAudioRenderer.ts`
- `minimal-prototype/src/export/exportPattern.ts`
- `minimal-prototype/src/utils/WAVEncoder.ts`
- `minimal-prototype/src/utils/audioProcessing.ts`
- `minimal-prototype/src/SimpleSynth.ts`
- Others as needed

**Verification:**
- [ ] No console.log in production build
- [ ] Development logs still work
- [ ] Warnings and errors always shown
- [ ] Build succeeds

---

### Issue #16: Potential WAV File Size Overflow

**Severity:** 🟡 MEDIUM
**File:** `minimal-prototype/src/utils/WAVEncoder.ts`
**Line:** 23-29
**Category:** Edge Case / Data Integrity

**Problem:**
```typescript
const numSamples = leftChannel.length;
const dataSize = numSamples * blockAlign;
const fileSize = 44 + dataSize;
```

For very large exports (100+ loops), file size calculation could exceed WAV format limits.

**Impact:**
- Crashes for extreme loop counts
- Corrupted WAV files
- Poor error messages

**Steps to Fix:**

1. Open `minimal-prototype/src/utils/WAVEncoder.ts`
2. Add validation:

```typescript
/**
 * WAV file format constants
 */
const MAX_WAV_FILE_SIZE = 4294967295; // 2^32 - 1 bytes (4GB limit)
const WAV_HEADER_SIZE = 44;

/**
 * Encode stereo audio as WAV file
 *
 * @param leftChannel - Left channel audio samples
 * @param rightChannel - Right channel audio samples
 * @param sampleRate - Sample rate in Hz (default: 49716)
 * @returns WAV file as ArrayBuffer
 * @throws Error if file would exceed 4GB WAV format limit
 */
static encode(
  leftChannel: Int16Array,
  rightChannel: Int16Array,
  sampleRate: number = 49716
): ArrayBuffer {
  // Validate channels match
  if (leftChannel.length !== rightChannel.length) {
    throw new Error(
      `Channel length mismatch: left=${leftChannel.length}, right=${rightChannel.length}`
    );
  }

  const numChannels = 2;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const numSamples = leftChannel.length;
  const dataSize = numSamples * blockAlign;
  const fileSize = WAV_HEADER_SIZE + dataSize;

  // Check WAV file size limit (4GB)
  if (fileSize > MAX_WAV_FILE_SIZE) {
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (MAX_WAV_FILE_SIZE / (1024 * 1024)).toFixed(2);
    const durationSeconds = (numSamples / sampleRate).toFixed(1);

    throw new Error(
      `WAV file too large: ${fileSizeMB} MB exceeds ${maxSizeMB} MB limit. ` +
      `Duration: ${durationSeconds}s. Try reducing loop count.`
    );
  }

  // Check for reasonable file size warning threshold (e.g., 500MB)
  const WARNING_THRESHOLD = 500 * 1024 * 1024; // 500MB
  if (fileSize > WARNING_THRESHOLD) {
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    console.warn(
      `[WAVEncoder] Large file warning: ${fileSizeMB} MB. ` +
      `Consider reducing loop count for better performance.`
    );
  }

  // Rest of encoding...
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // ... (existing encoding code)

  return buffer;
}
```

3. Add file size info to export summary in ExportModal:

```typescript
// Calculate and display estimated file size
const estimateFileSize = (wavBuffer: ArrayBuffer): string => {
  const sizeBytes = wavBuffer.byteLength;
  const sizeKB = sizeBytes / 1024;
  const sizeMB = sizeKB / 1024;

  if (sizeMB >= 1) {
    return `${sizeMB.toFixed(2)} MB`;
  } else {
    return `${sizeKB.toFixed(2)} KB`;
  }
};
```

**Verification:**
- [ ] Large exports don't crash
- [ ] Clear error message for too-large files
- [ ] Warning for large (but valid) files
- [ ] File size shown in UI

---

## 💡 LOW PRIORITY ISSUES

### Issue #17: Inconsistent Error Messages

**Severity:** 🟢 LOW
**File:** `minimal-prototype/src/components/ExportModal.tsx`
**Line:** 184
**Category:** User Experience

**Problem:**
```typescript
const errorMessage = err instanceof Error ? err.message : 'Export failed';
```

Generic error message doesn't provide actionable context.

**Steps to Fix:**

```typescript
const errorMessage = err instanceof Error
  ? `Export failed: ${err.message}`
  : 'Export failed due to an unknown error. Please try again.';
```

**Verification:**
- [ ] Error messages more helpful
- [ ] Consistent formatting

---

### Issue #18: React Best Practices - Batched Updates

**Severity:** 🟢 LOW
**File:** `minimal-prototype/src/components/ExportModal.tsx`
**Category:** Performance / Best Practices

**Problem:**
Multiple sequential state updates could cause re-renders (though React 18 batches automatically).

**Note:** In React 18+, this is handled automatically. No action needed unless targeting React 17.

**Steps to Fix (if needed):**

```typescript
import { flushSync } from 'react-dom';

// Only if you need synchronous updates
flushSync(() => {
  setLoopCount(count);
  setEditingCustomLoop(false);
});
```

**Verification:**
- [ ] Check React version
- [ ] If React 18+, no action needed
- [ ] If React 17, consider flushSync for critical paths

---

### Issue #19: Missing PropTypes Strictness

**Severity:** 🟢 LOW
**Files:** Various
**Category:** Type Safety

**Problem:**
Some props use loose types like `number | ''`:

```typescript
const [fadeInDuration, setFadeInDuration] = useState<number | ''>(1000);
```

**Steps to Fix:**

Use stricter types and handle empty string in setter:

```typescript
const [fadeInDuration, setFadeInDuration] = useState<number>(1000);

// In onChange:
onChange={(e) => {
  const val = e.target.value;
  if (val === '') {
    setFadeInDuration(1000); // default
  } else {
    const parsed = parseInt(val, 10);
    setFadeInDuration(isNaN(parsed) ? 1000 : parsed);
  }
}}
```

**Verification:**
- [ ] Stricter types
- [ ] No type errors
- [ ] Functionality unchanged

---

### Issue #20: Missing React Component Display Names

**Severity:** 🟢 LOW
**Files:** Various components
**Category:** Debugging / DevTools

**Problem:**
Components don't have explicit displayName for better debugging:

```typescript
export function ExportModal(props: ExportModalProps) {
  // ...
}
```

**Steps to Fix:**

Add displayName to components:

```typescript
export function ExportModal(props: ExportModalProps) {
  // ...
}

ExportModal.displayName = 'ExportModal';
```

Or use named function exports:

```typescript
export const ExportModal: React.FC<ExportModalProps> = (props) => {
  // ...
};

ExportModal.displayName = 'ExportModal';
```

**Verification:**
- [ ] Better component names in React DevTools
- [ ] Easier debugging

---

### Issue #21: Missing Loading States

**Severity:** 🟢 LOW
**File:** `minimal-prototype/src/components/WaveformDisplay.tsx`
**Category:** User Experience

**Problem:**
No loading indicator while decoding audio.

**Steps to Fix:**

Add loading state:

```typescript
const [isDecoding, setIsDecoding] = useState(false);

// In setupAudio:
setIsDecoding(true);
try {
  const audioBuffer = await audioContext.decodeAudioData(wavBuffer.slice(0));
  audioBufferRef.current = audioBuffer;
} finally {
  setIsDecoding(false);
}

// In render:
{isDecoding && <div className="waveform-loading">Decoding audio...</div>}
```

**Verification:**
- [ ] Loading indicator shown during decode
- [ ] Better user feedback

---

### Issue #22: No Export Analytics/Telemetry

**Severity:** 🟢 LOW
**Category:** Product / Metrics

**Problem:**
No tracking of export usage, which could inform future improvements.

**Steps to Fix (Optional):**

Add optional analytics hooks:

```typescript
// In ExportModal after successful export:
const trackExport = (data: {
  mode: 'standard' | 'seamless';
  duration: number;
  loopCount: number;
  fileSize: number;
}) => {
  // Hook for analytics (implement as needed)
  console.log('[Analytics] Export completed:', data);

  // Could send to analytics service:
  // analytics.track('export_completed', data);
};
```

**Verification:**
- [ ] Analytics hooks in place
- [ ] Privacy-conscious (no PII)
- [ ] Optional/configurable

---

## 📋 TESTING REQUIREMENTS

After fixing all issues, perform these tests:

### Manual Testing Checklist

**Export Functionality:**
- [ ] Export with standard mode works
- [ ] Export with seamless loop mode works
- [ ] Export with various loop counts (1, 2, 5, 10, 50)
- [ ] Export with normalization enabled/disabled
- [ ] Export with various normalization levels (-16dB to 0dB)
- [ ] Export with fade in/out enabled/disabled
- [ ] Export with various fade durations (100ms to 10s)
- [ ] Export with all post-processing combined

**UI/UX:**
- [ ] Modal opens/closes correctly
- [ ] Two-page navigation works
- [ ] Progress bar updates smoothly
- [ ] Error messages display correctly
- [ ] Cancel button stops export
- [ ] Back button returns to page 1
- [ ] Save button downloads file

**Waveform Player:**
- [ ] Plays/pauses correctly
- [ ] Seeking with mouse works
- [ ] Seeking with keyboard works (arrows, home, end)
- [ ] Playback position indicator updates
- [ ] Waveform renders correctly

**Edge Cases:**
- [ ] Empty pattern (all `---`)
- [ ] Single row pattern
- [ ] Very long pattern (100+ rows)
- [ ] High BPM (300+)
- [ ] Low BPM (60)
- [ ] Maximum loop count
- [ ] Rapid open/close of modal
- [ ] Multiple exports in sequence

**Performance:**
- [ ] Large exports don't freeze UI
- [ ] Post-processing is responsive
- [ ] Memory usage reasonable
- [ ] No memory leaks

**Browser Compatibility:**
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers (optional)

**Accessibility:**
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Screen reader compatible (basic test)

### Automated Testing Recommendations

**Unit Tests to Add:**
```typescript
// audioProcessing.test.ts
describe('normalizeAudio', () => {
  it('should normalize to target dB', () => {});
  it('should handle silent audio', () => {});
  it('should clip properly', () => {});
});

describe('applyFades', () => {
  it('should apply fade in', () => {});
  it('should apply fade out', () => {});
  it('should apply both fades', () => {});
});

// WAVEncoder.test.ts
describe('WAVEncoder', () => {
  it('should encode valid WAV', () => {});
  it('should reject mismatched channels', () => {});
  it('should reject too-large files', () => {});
});

// exportPattern.test.ts
describe('exportPattern', () => {
  it('should export standard mode', () => {});
  it('should export seamless loop mode', () => {});
  it('should handle abort signal', () => {});
});
```

---

## 📝 DOCUMENTATION REQUIREMENTS

After fixing issues, update documentation:

### Code Documentation
- [ ] All functions have JSDoc comments
- [ ] Complex algorithms explained
- [ ] Edge cases documented
- [ ] Type definitions complete

### User Documentation
- [ ] README updated with export feature
- [ ] Usage guide created
- [ ] Common issues/troubleshooting added

### Developer Documentation
- [ ] Architecture decisions documented
- [ ] API reference complete
- [ ] Testing guide created
- [ ] Deployment notes added

---

## 🎯 MERGE READINESS CHECKLIST

Before merging to main, verify:

### Critical Requirements (MUST)
- [ ] Issue #1: eval() removed
- [ ] Issue #2: ExportModal cleanup added
- [ ] Issue #3: AudioContext properly closed
- [ ] Issue #4: Abort controller race condition fixed
- [ ] Issue #5: Type safety improved
- [ ] Issue #6: Buffer copying optimized
- [ ] Issue #7: Audio decoding error handling
- [ ] Issue #8: OPL3 loading consolidated
- [ ] All critical tests pass
- [ ] No console errors or warnings
- [ ] Build succeeds

### High Priority (SHOULD)
- [ ] Issues #9-16 addressed
- [ ] Manual testing complete
- [ ] Performance acceptable
- [ ] Accessibility tested
- [ ] Browser compatibility verified

### Medium/Low Priority (NICE TO HAVE)
- [ ] Issues #17-22 addressed
- [ ] Code quality checks pass
- [ ] Documentation complete
- [ ] Unit tests added

---

## 📊 PROGRESS TRACKING

Use this section to track issue resolution:

```
CRITICAL (3):
[ ] #1 - eval() usage
[ ] #2 - ExportModal cleanup
[ ] #3 - AudioContext leak

HIGH (5):
[ ] #4 - Abort controller
[ ] #5 - Type safety
[ ] #6 - Buffer copying
[ ] #7 - Audio decoding
[ ] #8 - Code duplication

MEDIUM (8):
[ ] #9 - Error boundary
[ ] #10 - Loop count validation
[ ] #11 - Waveform performance
[ ] #12 - Accessibility
[ ] #13 - Unused files
[ ] #14 - Magic numbers
[ ] #15 - Console logging
[ ] #16 - File size overflow

LOW (6):
[ ] #17 - Error messages
[ ] #18 - React batching
[ ] #19 - PropTypes
[ ] #20 - Display names
[ ] #21 - Loading states
[ ] #22 - Analytics
```

---

## 📞 NEXT STEPS

1. **Review this document** with the team
2. **Prioritize issues** based on risk and effort
3. **Assign issues** to developers
4. **Create tracking** (GitHub issues, Jira, etc.)
5. **Fix critical issues** first
6. **Test thoroughly** after each fix
7. **Document changes** as you go
8. **Request code review** from peers
9. **Merge to main** when ready
10. **Monitor production** for issues

---

**Estimated Total Effort:** 18-28 hours
- Critical: 2-4 hours
- High: 4-6 hours
- Medium: 8-12 hours
- Low: 4-6 hours

**Recommended Timeline:**
- Week 1: Critical + High priority issues
- Week 2: Medium priority + testing
- Week 3: Low priority + documentation + final review

---

**Document Version:** 1.0
**Last Updated:** 2025-01-11
**Status:** Ready for Implementation
