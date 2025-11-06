# WAV Export Integration Plan

**Goal:** Integrate WAV export functionality into the main tracker while ensuring real-time playback and export use the **same audio generation logic**.

**Key Principle:** SimpleSynth is the single source of truth for all OPL3 audio generation.

---

## User Decisions (Confirmed)

✅ **Sample Rate:** 49,716 Hz (OPL3 native) only
✅ **Export Options:** Basic export - identical to listening to pattern
✅ **UI Behavior:** Show progress bar, blocking (no playback during export)
✅ **Format:** WAV only
✅ **Scope:** Single pattern only
✅ **Testing Strategy:** Create testing endpoint for incremental validation before full UI integration

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│              SimpleSynth (Core Logic)                │
│  - Note on/off                                       │
│  - Channel management                                │
│  - Dual-voice support                                │
│  - Register programming                              │
└──────────────────────────────────────────────────────┘
                         │
                         │ Uses
                         ▼
┌──────────────────────────────────────────────────────┐
│              IOPLChip (Interface)                    │
│  write(array, address, value)                        │
│  read(buffer)                                        │
└──────────────────────────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
┌──────────────────┐          ┌──────────────────┐
│ WorkletOPLChip   │          │ DirectOPLChip    │
│ (Real-time)      │          │ (Offline)        │
│                  │          │                  │
│ AudioWorklet     │          │ Direct OPL3      │
│ 49,716 Hz        │          │ Sample Capture   │
└──────────────────┘          └──────────────────┘
        │                              │
        ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│ Browser          │          │ OfflineAudio     │
│ Audio Output     │          │ Renderer         │
└──────────────────┘          └──────────────────┘
```

---

## Phase 0: Create Test Harness

**Goal:** Create a testing endpoint to validate each phase incrementally without touching the main tracker app.

### 0.1 Create Integration Test Page

**File:** `features/export-audio/integration-test.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Export Integration Tests</title>
  <style>
    body {
      font-family: 'Courier New', monospace;
      max-width: 1000px;
      margin: 40px auto;
      padding: 20px;
      background: #1a1a1a;
      color: #e0e0e0;
    }
    .test-section {
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .test-section h2 {
      margin-top: 0;
      color: #4a9eff;
    }
    button {
      background: #4a9eff;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      margin: 5px;
    }
    button:disabled {
      background: #666;
      cursor: not-allowed;
    }
    .result {
      margin-top: 10px;
      padding: 10px;
      background: #333;
      border-radius: 4px;
      font-family: monospace;
      white-space: pre-wrap;
    }
    .success { color: #4ade80; }
    .error { color: #f87171; }
  </style>
</head>
<body>
  <h1>🧪 Export Integration Tests</h1>
  <p>Test each phase of the integration incrementally.</p>

  <!-- Phase 1 Tests -->
  <div class="test-section">
    <h2>Phase 1: OPL3 Interface Abstraction</h2>
    <button onclick="testPhase1()">Run Phase 1 Tests</button>
    <div id="phase1-result" class="result"></div>
  </div>

  <!-- Phase 2 Tests -->
  <div class="test-section">
    <h2>Phase 2: SimpleSynth Refactor</h2>
    <button onclick="testPhase2()">Run Phase 2 Tests</button>
    <div id="phase2-result" class="result"></div>
  </div>

  <!-- Phase 3 Tests -->
  <div class="test-section">
    <h2>Phase 3: Offline Rendering</h2>
    <button onclick="testPhase3()">Run Phase 3 Tests</button>
    <div id="phase3-result" class="result"></div>
  </div>

  <!-- Full Integration Test -->
  <div class="test-section">
    <h2>Full Integration: Export RPG Adventure</h2>
    <button onclick="runFullTest()">Export Test Pattern</button>
    <div id="full-result" class="result"></div>
  </div>

  <script type="module" src="./integration-test.ts"></script>
</body>
</html>
```

### 0.2 Create Integration Test Script

**File:** `features/export-audio/integration-test.ts`

```typescript
// Phase 1: Test IOPLChip interface
async function testPhase1() {
  const result = document.getElementById('phase1-result')!;
  result.innerHTML = 'Testing Phase 1...\n';

  try {
    // Test 1: Import interface
    result.innerHTML += '✓ IOPLChip interface imports correctly\n';

    // Test 2: Create DirectOPLChip
    const { DirectOPLChip } = await import('../../src/adapters/DirectOPLChip');
    result.innerHTML += '✓ DirectOPLChip class imports correctly\n';

    // Test 3: Create WorkletOPLChip
    const { WorkletOPLChip } = await import('../../src/adapters/WorkletOPLChip');
    result.innerHTML += '✓ WorkletOPLChip class imports correctly\n';

    result.innerHTML += '\n✅ Phase 1 PASSED';
    result.className = 'result success';
  } catch (error) {
    result.innerHTML += `\n❌ Phase 1 FAILED: ${error}`;
    result.className = 'result error';
  }
}

// Phase 2: Test SimpleSynth with DirectOPLChip
async function testPhase2() {
  const result = document.getElementById('phase2-result')!;
  result.innerHTML = 'Testing Phase 2...\n';

  try {
    // Load OPL3
    result.innerHTML += 'Loading OPL3...\n';
    await loadOPL3Library();
    result.innerHTML += '✓ OPL3 library loaded\n';

    // Create chip
    const chip = new (globalThis as any).OPL3.OPL3();
    result.innerHTML += '✓ OPL3 chip created\n';

    // Create DirectOPLChip
    const { DirectOPLChip } = await import('../../src/adapters/DirectOPLChip');
    const directChip = new DirectOPLChip(chip);
    result.innerHTML += '✓ DirectOPLChip created\n';

    // Test write
    directChip.write(0, 0x01, 0x20);
    result.innerHTML += '✓ DirectOPLChip.write() works\n';

    // Test read
    const buffer = new Int16Array(2);
    directChip.read(buffer);
    result.innerHTML += `✓ DirectOPLChip.read() works (samples: [${buffer[0]}, ${buffer[1]}])\n`;

    // Create SimpleSynth with DirectOPLChip
    const { SimpleSynth } = await import('../../src/SimpleSynth');
    const synth = new SimpleSynth();
    await synth.init(directChip);
    result.innerHTML += '✓ SimpleSynth initialized with DirectOPLChip\n';

    result.innerHTML += '\n✅ Phase 2 PASSED';
    result.className = 'result success';
  } catch (error) {
    result.innerHTML += `\n❌ Phase 2 FAILED: ${error}`;
    result.className = 'result error';
  }
}

// Phase 3: Test rendering a simple pattern
async function testPhase3() {
  const result = document.getElementById('phase3-result')!;
  result.innerHTML = 'Testing Phase 3...\n';

  try {
    // Setup
    await loadOPL3Library();
    const chip = new (globalThis as any).OPL3.OPL3();
    const { DirectOPLChip } = await import('../../src/adapters/DirectOPLChip');
    const directChip = new DirectOPLChip(chip);

    result.innerHTML += '✓ OPL3 setup complete\n';

    // Test PatternRenderer
    const { PatternRenderer } = await import('../../src/export/PatternRenderer');
    result.innerHTML += '✓ PatternRenderer imports correctly\n';

    // Test WAVEncoder
    const { WAVEncoder } = await import('../../src/utils/WAVEncoder');
    result.innerHTML += '✓ WAVEncoder imports correctly\n';

    // Test OfflineAudioRenderer
    const { OfflineAudioRenderer } = await import('../../src/export/OfflineAudioRenderer');
    result.innerHTML += '✓ OfflineAudioRenderer imports correctly\n';

    result.innerHTML += '\n✅ Phase 3 PASSED';
    result.className = 'result success';
  } catch (error) {
    result.innerHTML += `\n❌ Phase 3 FAILED: ${error}`;
    result.className = 'result error';
  }
}

// Full integration test
async function runFullTest() {
  const result = document.getElementById('full-result')!;
  result.innerHTML = 'Running full integration test...\n';

  try {
    // Load test pattern (simple 4-row test)
    const testPattern = {
      name: 'Test Pattern',
      tracks: ['Track 0', 'Track 1'],
      instruments: [0, 1],
      rows: [
        ['C-4', null],
        [null, 'E-4'],
        ['---', null],
        [null, '---']
      ],
      rowsPerBeat: 4
    };

    const testPatches = [
      // Simple test patches (will be replaced with actual GENMIDI)
      { id: 0, name: 'Test Patch 0' },
      { id: 1, name: 'Test Patch 1' }
    ];

    result.innerHTML += '✓ Test pattern loaded\n';

    // Render
    const { OfflineAudioRenderer } = await import('../../src/export/OfflineAudioRenderer');

    const wavBuffer = await OfflineAudioRenderer.renderToWAV(
      testPattern as any,
      testPatches as any,
      120,
      (progress) => {
        result.innerHTML = `Rendering... ${Math.round(progress * 100)}%\n`;
      }
    );

    result.innerHTML += `✓ WAV generated: ${wavBuffer.byteLength} bytes\n`;

    // Trigger download
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'integration-test.wav';
    a.click();
    URL.revokeObjectURL(url);

    result.innerHTML += '✓ WAV file downloaded\n';
    result.innerHTML += '\n✅ FULL INTEGRATION TEST PASSED';
    result.className = 'result success';
  } catch (error) {
    result.innerHTML += `\n❌ FULL TEST FAILED: ${error}`;
    result.className = 'result error';
  }
}

// Helper to load OPL3
async function loadOPL3Library(): Promise<void> {
  if (typeof (globalThis as any).OPL3?.OPL3 !== 'undefined') {
    return;
  }

  const response = await fetch('/node_modules/opl3/dist/opl3.js');
  if (!response.ok) {
    throw new Error(`Failed to fetch OPL3: ${response.statusText}`);
  }

  const code = await response.text();
  eval(code);

  if (typeof (globalThis as any).OPL3?.OPL3 === 'undefined') {
    throw new Error('OPL3 not available after loading');
  }
}

// Make functions available globally for onclick handlers
(window as any).testPhase1 = testPhase1;
(window as any).testPhase2 = testPhase2;
(window as any).testPhase3 = testPhase3;
(window as any).runFullTest = runFullTest;
```

### Manual Testing Steps for Phase 0

1. ✅ Open `features/export-audio/integration-test.html` in browser
2. ✅ Verify page loads without errors
3. ✅ All 4 test sections are visible
4. ✅ Buttons are clickable

**Success Criteria:**
- Test page loads and renders correctly
- Framework is ready for phase testing

---

## Phase 1: Extract OPL3 Interface

**Goal:** Create abstraction layer for OPL3 chip access without breaking existing functionality.

### 1.1 Create IOPLChip Interface

**File:** `src/interfaces/IOPLChip.ts`

```typescript
/**
 * Abstract interface for OPL3 chip access.
 * Allows SimpleSynth to work with both real-time (AudioWorklet)
 * and offline (direct) OPL3 instances.
 */
export interface IOPLChip {
  /**
   * Write a value to an OPL3 register
   * @param array - Register array (0 or 1)
   * @param address - Register address (0x00-0xFF)
   * @param value - Value to write (0x00-0xFF)
   */
  write(array: number, address: number, value: number): void;

  /**
   * Read stereo samples from OPL3 chip
   * @param buffer - Int16Array[2] to receive [left, right] samples
   */
  read(buffer: Int16Array): void;
}
```

**Validation:**
- ✅ File compiles without errors
- ✅ TypeScript definitions are clear

---

### 1.2 Create WorkletOPLChip Implementation

**File:** `src/adapters/WorkletOPLChip.ts`

```typescript
import { IOPLChip } from '../interfaces/IOPLChip';

/**
 * OPL3 chip adapter for AudioWorklet-based real-time playback.
 * Sends write commands to AudioWorklet via postMessage.
 */
export class WorkletOPLChip implements IOPLChip {
  constructor(private workletNode: AudioWorkletNode) {}

  write(array: number, address: number, value: number): void {
    this.workletNode.port.postMessage({
      type: 'write-register',
      payload: { array, address, value }
    });
  }

  read(buffer: Int16Array): void {
    throw new Error('WorkletOPLChip does not support direct read - audio flows through AudioContext');
  }
}
```

**Validation:**
- ✅ File compiles without errors
- ✅ Implements IOPLChip interface correctly
- ✅ Maintains existing postMessage protocol

---

### 1.3 Create DirectOPLChip Implementation

**File:** `src/adapters/DirectOPLChip.ts`

```typescript
import { IOPLChip } from '../interfaces/IOPLChip';

/**
 * OPL3 chip adapter for direct offline rendering.
 * Provides direct access to OPL3 instance for sample capture.
 */
export class DirectOPLChip implements IOPLChip {
  constructor(private chip: any) {}

  write(array: number, address: number, value: number): void {
    this.chip.write(array, address, value);
  }

  read(buffer: Int16Array): void {
    this.chip.read(buffer);
  }
}
```

**Validation:**
- ✅ File compiles without errors
- ✅ Implements IOPLChip interface correctly
- ✅ Supports both write and read operations

### Manual Testing for Phase 1

1. ✅ Build TypeScript: `npm run build`
2. ✅ Verify no compilation errors in terminal
3. ✅ Open `features/export-audio/integration-test.html`
4. ✅ Click "Run Phase 1 Tests"
5. ✅ Verify green checkmarks:
   - IOPLChip interface imports correctly
   - DirectOPLChip class imports correctly
   - WorkletOPLChip class imports correctly
   - Phase 1 PASSED message appears

**Success Criteria:**
- All Phase 1 tests pass
- No console errors
- Ready to proceed to Phase 2

---

## Phase 2: Refactor SimpleSynth

**Goal:** Make SimpleSynth work with any IOPLChip implementation without changing its public API.

### 2.1 Update SimpleSynth Constructor

**File:** `src/SimpleSynth.ts`

**Changes:**

1. Add optional `oplChip` parameter to constructor
2. Store `oplChip` as instance variable
3. Update `writeOPL()` to use `oplChip` if provided

```typescript
import { IOPLChip } from './interfaces/IOPLChip';
import { WorkletOPLChip } from './adapters/WorkletOPLChip';

export class SimpleSynth {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private oplChip: IOPLChip | null = null;  // NEW
  // ... rest of existing fields

  /**
   * Initialize OPL3 and Web Audio (Real-time mode)
   * OR
   * Use provided IOPLChip (Offline mode)
   */
  async init(oplChip?: IOPLChip): Promise<void> {
    if (oplChip) {
      // Offline mode - use provided chip directly
      this.oplChip = oplChip;
      this.isInitialized = true;
      console.log('[SimpleSynth] Initialized in offline mode');
      return;
    }

    // Real-time mode - existing initialization code
    if (this.isInitialized) {
      console.warn('[SimpleSynth] Already initialized');
      return;
    }

    // ... existing initialization code ...

    // After worklet is created and ready:
    this.oplChip = new WorkletOPLChip(this.workletNode!);
    this.isInitialized = true;
  }

  private writeOPL(register: number, value: number): void {
    if (!this.oplChip) {
      throw new Error('[SimpleSynth] OPL chip not initialized');
    }

    const array = (register >= 0x100) ? 1 : 0;
    const address = register & 0xFF;
    this.oplChip.write(array, address, value);
  }

  // All other methods remain unchanged!
}
```

**Validation:**
- ✅ Existing real-time playback still works (regression test)
- ✅ `writeOPL()` calls go through `IOPLChip` interface
- ✅ SimpleSynth can be initialized with external `IOPLChip`
- ✅ No changes to public API (`noteOn`, `noteOff`, `loadPatch`, etc.)

**Test Plan:**
1. Start tracker, load RPG Adventure pattern
2. Play pattern and verify audio is identical to before refactor
3. Test dual-voice patches (patches 1 & 2)
4. Test all 8 tracks playing simultaneously
5. Test start/stop/restart

### Manual Testing for Phase 2

**Part A: Compilation Test**
1. ✅ Build TypeScript: `npm run build`
2. ✅ Verify no compilation errors

**Part B: Integration Test Page**
3. ✅ Open `features/export-audio/integration-test.html`
4. ✅ Click "Run Phase 2 Tests"
5. ✅ Verify green checkmarks:
   - OPL3 library loaded
   - OPL3 chip created
   - DirectOPLChip created
   - DirectOPLChip.write() works
   - DirectOPLChip.read() works (samples appear)
   - SimpleSynth initialized with DirectOPLChip
   - Phase 2 PASSED message appears

**Part C: Real-time Playback Regression Test** (CRITICAL!)
6. ✅ Open main tracker: `http://localhost:5173` (or appropriate URL)
7. ✅ Load RPG Adventure pattern
8. ✅ Press Play button
9. ✅ Verify audio sounds **identical to before refactor**
10. ✅ Listen especially to tracks 1, 2, 5, 6 (dual-voice patches)
11. ✅ Verify no clicks, pops, or glitches
12. ✅ Stop and restart - verify still works
13. ✅ Check browser console - no errors

**Success Criteria:**
- Integration test passes
- Real-time playback unchanged (most important!)
- No regressions in audio quality
- Dual-voice patches still sound rich
- Ready to proceed to Phase 3

---

## Phase 3: Offline Rendering Infrastructure

**Goal:** Create classes that use SimpleSynth to render patterns to WAV files.

### 3.1 Create WAVEncoder Utility

**File:** `src/utils/WAVEncoder.ts`

```typescript
/**
 * Encodes PCM audio data to WAV file format.
 * Reused from prototype implementation.
 */
export class WAVEncoder {
  /**
   * Encode stereo PCM data to WAV format
   * @param leftChannel - Left channel samples (Int16)
   * @param rightChannel - Right channel samples (Int16)
   * @param sampleRate - Sample rate in Hz (default: 49716 for OPL3)
   * @returns ArrayBuffer containing WAV file
   */
  static encode(
    leftChannel: Int16Array,
    rightChannel: Int16Array,
    sampleRate: number = 49716
  ): ArrayBuffer {
    const numChannels = 2;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const numSamples = leftChannel.length;
    const dataSize = numSamples * blockAlign;

    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // Write WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write interleaved PCM data
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      view.setInt16(offset, leftChannel[i], true);
      offset += 2;
      view.setInt16(offset, rightChannel[i], true);
      offset += 2;
    }

    return buffer;
  }

  private static writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }
}
```

**Validation:**
- ✅ File compiles without errors
- ✅ Can encode test data to valid WAV file
- ✅ WAV file plays in VLC/Windows Media Player

**Test:**
```typescript
// Test with 1 second of 440 Hz sine wave
const sampleRate = 49716;
const duration = 1;
const frequency = 440;
const numSamples = sampleRate * duration;
const left = new Int16Array(numSamples);
const right = new Int16Array(numSamples);

for (let i = 0; i < numSamples; i++) {
  const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 32767;
  left[i] = sample;
  right[i] = sample;
}

const wav = WAVEncoder.encode(left, right, sampleRate);
// Save and verify plays correctly
```

---

### 3.2 Create PatternRenderer

**File:** `src/export/PatternRenderer.ts`

```typescript
import { SimpleSynth } from '../SimpleSynth';
import { IOPLChip } from '../interfaces/IOPLChip';
import { Pattern } from '../types/Pattern';

/**
 * Renders a pattern to PCM audio data using SimpleSynth.
 * Handles note timing, sustain, and polyphonic rendering.
 */
export class PatternRenderer {
  private static readonly SAMPLE_RATE = 49716; // OPL3 native sample rate

  /**
   * Calculate samples per row based on BPM
   * @param bpm - Beats per minute
   * @param rowsPerBeat - Pattern rows per beat (default: 4)
   */
  static calculateSamplesPerRow(bpm: number, rowsPerBeat: number = 4): number {
    const beatsPerSecond = bpm / 60;
    const secondsPerBeat = 1 / beatsPerSecond;
    const samplesPerBeat = Math.floor(this.SAMPLE_RATE * secondsPerBeat);
    return Math.floor(samplesPerBeat / rowsPerBeat);
  }

  /**
   * Render a pattern to stereo PCM data
   * @param synth - SimpleSynth instance (already initialized with DirectOPLChip)
   * @param chip - Direct OPL3 chip for sample capture
   * @param pattern - Pattern data to render
   * @param bpm - Tempo in beats per minute
   * @param onProgress - Optional progress callback (0.0 to 1.0)
   */
  static render(
    synth: SimpleSynth,
    chip: IOPLChip,
    pattern: Pattern,
    bpm: number,
    onProgress?: (progress: number) => void
  ): { left: Int16Array; right: Int16Array } {
    const samplesPerRow = this.calculateSamplesPerRow(bpm, pattern.rowsPerBeat || 4);
    const totalRows = pattern.rows.length;
    const totalSamples = totalRows * samplesPerRow;

    const leftChannel = new Int16Array(totalSamples);
    const rightChannel = new Int16Array(totalSamples);

    const buffer = new Int16Array(2); // [left, right] for one sample
    let sampleIndex = 0;

    // Process each row
    for (let rowIndex = 0; rowIndex < totalRows; rowIndex++) {
      const row = pattern.rows[rowIndex];

      // Trigger notes for this row
      for (let trackIndex = 0; trackIndex < pattern.tracks.length; trackIndex++) {
        const noteValue = row[trackIndex];

        if (noteValue === null) {
          // null = note sustain, do nothing (let note continue)
          continue;
        } else if (noteValue === '---') {
          // Key off
          synth.noteOff(trackIndex, 0); // Note number doesn't matter for noteOff
        } else {
          // New note - convert note name to MIDI number
          const midiNote = this.noteNameToMIDI(noteValue);
          if (midiNote !== null) {
            synth.noteOn(trackIndex, midiNote, 100);
          }
        }
      }

      // Capture samples for this row
      for (let i = 0; i < samplesPerRow; i++) {
        chip.read(buffer);
        leftChannel[sampleIndex] = buffer[0];
        rightChannel[sampleIndex] = buffer[1];
        sampleIndex++;
      }

      // Report progress
      if (onProgress && rowIndex % 4 === 0) {
        onProgress(rowIndex / totalRows);
      }
    }

    if (onProgress) onProgress(1.0);

    return { left: leftChannel, right: rightChannel };
  }

  /**
   * Convert note name (e.g., "C-4") to MIDI note number
   */
  private static noteNameToMIDI(noteName: string): number | null {
    if (!noteName || noteName === '---') return null;

    const noteMap: { [key: string]: number } = {
      'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
      'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
    };

    const parts = noteName.split('-');
    if (parts.length !== 2) return null;

    const noteName = parts[0];
    const octave = parseInt(parts[1], 10);

    if (!(noteName in noteMap) || isNaN(octave)) return null;

    return (octave + 1) * 12 + noteMap[noteName];
  }
}
```

**Validation:**
- ✅ File compiles without errors
- ✅ Can render simple test pattern
- ✅ Note sustain works correctly (null = continue note)
- ✅ Progress callback fires during rendering
- ✅ Output matches prototype results

**Test Plan:**
1. Render single C-4 note, verify pitch
2. Render pattern with sustain (C-4, null, null, ---), verify envelope continues
3. Render polyphonic pattern, verify no clicks/pops
4. Verify BPM changes affect duration correctly

---

### 3.3 Create OfflineAudioRenderer

**File:** `src/export/OfflineAudioRenderer.ts`

```typescript
import { SimpleSynth } from '../SimpleSynth';
import { DirectOPLChip } from '../adapters/DirectOPLChip';
import { PatternRenderer } from './PatternRenderer';
import { WAVEncoder } from '../utils/WAVEncoder';
import { Pattern } from '../types/Pattern';
import type { OPLPatch } from '../types/OPLPatch';

/**
 * High-level API for offline WAV export.
 * Handles OPL3 setup, SimpleSynth initialization, and rendering.
 */
export class OfflineAudioRenderer {
  /**
   * Load OPL3 library code
   */
  private static async loadOPL3Library(): Promise<void> {
    if (typeof (globalThis as any).OPL3?.OPL3 !== 'undefined') {
      return; // Already loaded
    }

    const response = await fetch('/node_modules/opl3/dist/opl3.js');
    if (!response.ok) {
      throw new Error(`Failed to fetch OPL3 library: ${response.statusText}`);
    }

    const code = await response.text();
    eval(code);

    if (typeof (globalThis as any).OPL3?.OPL3 === 'undefined') {
      throw new Error('OPL3 not available after loading');
    }
  }

  /**
   * Initialize OPL3 chip for offline rendering
   */
  private static createOPL3Chip(): any {
    const OPL3Class = (globalThis as any).OPL3.OPL3;
    return new OPL3Class();
  }

  /**
   * Initialize OPL3 chip to clean state
   */
  private static initializeChip(chip: any): void {
    const writeReg = (register: number, value: number) => {
      const array = (register >= 0x100) ? 1 : 0;
      const address = register & 0xFF;
      chip.write(array, address, value);
    };

    // Reset and enable OPL3 mode
    writeReg(0x04, 0x60);
    writeReg(0x04, 0x80);
    writeReg(0x01, 0x20);
    writeReg(0xBD, 0x00);
    writeReg(0x105, 0x01); // OPL3 enable
    writeReg(0x104, 0x00);

    // Enable waveform select
    writeReg(0x01, 0x20);
    writeReg(0x101, 0x20);

    // Clear all channels
    for (let ch = 0; ch < 9; ch++) {
      writeReg(0xB0 + ch, 0x00);
      writeReg(0x100 + 0xB0 + ch, 0x00);
      writeReg(0xC0 + ch, 0x00);
      writeReg(0x100 + 0xC0 + ch, 0x00);
    }
  }

  /**
   * Render a pattern to WAV file
   * @param pattern - Pattern data
   * @param patches - Instrument patches for each track
   * @param bpm - Tempo in beats per minute
   * @param onProgress - Optional progress callback (0.0 to 1.0)
   * @returns ArrayBuffer containing WAV file
   */
  static async renderToWAV(
    pattern: Pattern,
    patches: OPLPatch[],
    bpm: number,
    onProgress?: (progress: number) => void
  ): Promise<ArrayBuffer> {
    // Step 1: Load OPL3 library
    if (onProgress) onProgress(0.05);
    await this.loadOPL3Library();

    // Step 2: Create and initialize OPL3 chip
    if (onProgress) onProgress(0.1);
    const chip = this.createOPL3Chip();
    this.initializeChip(chip);

    // Step 3: Create DirectOPLChip adapter
    const directChip = new DirectOPLChip(chip);

    // Step 4: Initialize SimpleSynth with DirectOPLChip
    if (onProgress) onProgress(0.15);
    const synth = new SimpleSynth();
    await synth.init(directChip);

    // Step 5: Load patches for each track
    if (onProgress) onProgress(0.2);
    for (let track = 0; track < pattern.tracks.length; track++) {
      const patchIndex = pattern.instruments[track];
      const patch = patches[patchIndex];
      synth.loadPatch(track, patch);
    }

    // Step 6: Render pattern to PCM
    const { left, right } = PatternRenderer.render(
      synth,
      directChip,
      pattern,
      bpm,
      (renderProgress) => {
        if (onProgress) {
          // Scale render progress to 20%-90% of total
          onProgress(0.2 + renderProgress * 0.7);
        }
      }
    );

    // Step 7: Encode to WAV
    if (onProgress) onProgress(0.95);
    const wavBuffer = WAVEncoder.encode(left, right);

    // Step 8: Done
    if (onProgress) onProgress(1.0);

    return wavBuffer;
  }
}
```

**Validation:**
- ✅ File compiles without errors
- ✅ Can render test pattern to WAV
- ✅ Progress callbacks fire at correct intervals
- ✅ Output WAV matches prototype quality
- ✅ Dual-voice patches work correctly (automatically via SimpleSynth)

**Test Plan:**
1. Render RPG Adventure pattern
2. Compare with prototype output (should sound identical or better with dual-voice)
3. Verify progress callbacks fire correctly
4. Test with different BPM values
5. Test with patterns using dual-voice patches

### Manual Testing for Phase 3

**Part A: Compilation Test**
1. ✅ Build TypeScript: `npm run build`
2. ✅ Verify no compilation errors

**Part B: Unit Test via Integration Page**
3. ✅ Open `features/export-audio/integration-test.html`
4. ✅ Click "Run Phase 3 Tests"
5. ✅ Verify green checkmarks:
   - OPL3 setup complete
   - PatternRenderer imports correctly
   - WAVEncoder imports correctly
   - OfflineAudioRenderer imports correctly
   - Phase 3 PASSED message appears

**Part C: Full Integration Test**
6. ✅ Click "Export Test Pattern" button
7. ✅ Verify progress updates appear (0% → 100%)
8. ✅ Verify "integration-test.wav" downloads automatically
9. ✅ Open downloaded WAV in VLC or Windows Media Player
10. ✅ Verify WAV file plays without errors
11. ✅ Listen to audio:
    - Should hear C-4 note, then E-4 note, both sustaining correctly
    - No clicks or pops
    - Clean start and end

**Part D: Comparison with Prototype**
12. ✅ Open `features/export-audio/prototypes/prototype-5-full-song.html`
13. ✅ Click "Generate Full Song" and download prototype WAV
14. ✅ Open both WAVs in Audacity (or similar)
15. ✅ Compare waveforms visually
16. ✅ Listen to both - integrated version should sound **richer** (dual-voice working)
17. ✅ Verify integrated version has fuller sound on tracks 1, 2, 5, 6

**Success Criteria:**
- All Phase 3 tests pass
- WAV export works end-to-end
- Audio quality matches or exceeds prototype
- Dual-voice patches sound rich (not thin!)
- Progress callbacks work
- Ready to proceed to Phase 4 (UI integration)

---

## Phase 4: UI Components

**Goal:** Add export functionality to the tracker UI.

### 4.1 Create ExportModal Component

**File:** `src/components/ExportModal.tsx`

```typescript
import React, { useState } from 'react';
import { OfflineAudioRenderer } from '../export/OfflineAudioRenderer';
import type { Pattern } from '../types/Pattern';
import type { OPLPatch } from '../types/OPLPatch';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pattern: Pattern;
  patches: OPLPatch[];
  bpm: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  pattern,
  patches,
  bpm
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setProgress(0);
      setError(null);

      const wavBuffer = await OfflineAudioRenderer.renderToWAV(
        pattern,
        patches,
        bpm,
        (p) => setProgress(Math.round(p * 100))
      );

      // Trigger download
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pattern.name || 'export'}.wav`;
      a.click();
      URL.revokeObjectURL(url);

      setIsExporting(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Export to WAV</h2>

        {!isExporting && !error && (
          <>
            <div className="export-info">
              <p><strong>Pattern:</strong> {pattern.name}</p>
              <p><strong>Rows:</strong> {pattern.rows.length}</p>
              <p><strong>Tracks:</strong> {pattern.tracks.length}</p>
              <p><strong>BPM:</strong> {bpm}</p>
              <p><strong>Format:</strong> 49,716 Hz, 16-bit Stereo</p>
            </div>

            <div className="modal-actions">
              <button onClick={handleExport} className="btn-primary">
                Export WAV
              </button>
              <button onClick={onClose} className="btn-secondary">
                Cancel
              </button>
            </div>
          </>
        )}

        {isExporting && (
          <>
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <p className="progress-text">{progress}%</p>
            <p className="status-text">Generating audio...</p>
          </>
        )}

        {error && (
          <>
            <div className="error-message">{error}</div>
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
};
```

**Validation:**
- ✅ Component renders without errors
- ✅ Shows correct pattern info
- ✅ Progress bar updates during export
- ✅ WAV file downloads on completion
- ✅ Error handling works

---

### 4.2 Add Export Button to Tracker

**File:** `src/components/Tracker.tsx` (modifications)

```typescript
import { ExportModal } from './ExportModal';

export const Tracker: React.FC = () => {
  const [showExportModal, setShowExportModal] = useState(false);

  // ... existing state ...

  return (
    <div className="tracker">
      {/* Existing UI */}

      <div className="transport-controls">
        {/* Existing buttons */}

        <button
          onClick={() => setShowExportModal(true)}
          className="btn-export"
          title="Export to WAV"
        >
          💾 Export
        </button>
      </div>

      {/* Existing pattern grid, etc. */}

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        pattern={currentPattern}
        patches={patches}
        bpm={bpm}
      />
    </div>
  );
};
```

**Validation:**
- ✅ Export button appears in UI
- ✅ Clicking button opens modal
- ✅ Modal closes on cancel/completion
- ✅ Doesn't interfere with real-time playback

---

## Phase 5: Testing & Validation

**Goal:** Ensure export produces identical audio to real-time playback.

### 5.1 Regression Tests

**Test real-time playback still works:**
1. ✅ Load tracker, play RPG Adventure
2. ✅ Audio sounds identical to before refactor
3. ✅ Dual-voice patches work (patches 1 & 2)
4. ✅ All 8 tracks play correctly
5. ✅ Start/stop/restart works

---

### 5.2 Export Validation Tests

**Test WAV export:**
1. ✅ Export RPG Adventure to WAV
2. ✅ WAV file plays in VLC
3. ✅ Audio sounds identical to real-time playback
4. ✅ Dual-voice patches sound rich (not thin like prototype)
5. ✅ Duration matches expected length
6. ✅ File size is correct

**Formula:**
```
Expected size = (49716 Hz × duration_seconds × 2 channels × 2 bytes) + 44 bytes header

For RPG Adventure (64 rows, 120 BPM, 4 rows/beat):
  Duration = 64 rows ÷ 4 rows/beat ÷ 120 BPM × 60 sec = 8 seconds
  Size = (49716 × 8 × 2 × 2) + 44 = 1,589,312 bytes ≈ 1.5 MB
```

---

### 5.3 Side-by-Side Comparison

**Create comparison test:**

1. **Record real-time playback** (using browser audio capture)
2. **Export to WAV**
3. **Import both into Audacity**
4. **Visual comparison:**
   - Waveforms should be nearly identical
   - Dual-voice patches should have richer waveforms than prototype
5. **Auditory comparison:**
   - A/B listening test
   - Should be indistinguishable

---

### 5.4 Edge Cases

**Test edge cases:**
1. ✅ Pattern with only sustain notes (null, null, null...)
2. ✅ Pattern with rapid note changes
3. ✅ Pattern with all 18 channels active (stress test)
4. ✅ Different BPM values (60, 120, 180)
5. ✅ Different pattern lengths (16, 32, 64, 128 rows)
6. ✅ Dual-voice patches on all tracks

---

## Phase 6: Documentation & Polish

**Goal:** Document the feature and ensure it's production-ready.

### 6.1 Update README

Add section about WAV export feature:
- How to use
- File format specs
- Known limitations (if any)

### 6.2 Add TypeScript Documentation

Ensure all new classes have JSDoc comments.

### 6.3 Error Handling

- Handle OPL3 library load failure
- Handle export cancellation
- Handle disk full errors
- Show user-friendly error messages

---

## Success Criteria

### Technical Requirements

- ✅ **Single source of truth:** SimpleSynth generates both real-time and export audio
- ✅ **No code duplication:** Register programming logic exists in one place only
- ✅ **Dual-voice support:** Export automatically includes dual-voice (not a limitation anymore)
- ✅ **Identical output:** Export WAV sounds identical to real-time playback
- ✅ **No regressions:** Real-time playback works exactly as before

### User Experience Requirements

- ✅ **Easy to use:** Single "Export" button, no complex options
- ✅ **Progress feedback:** Progress bar shows export status
- ✅ **Error handling:** Clear error messages if something fails
- ✅ **Fast enough:** 8-second song exports in < 2 seconds

### Code Quality Requirements

- ✅ **Type safe:** All TypeScript with no `any` types (except OPL3 library)
- ✅ **Well documented:** JSDoc on all public APIs
- ✅ **Testable:** Can unit test renderer components
- ✅ **Maintainable:** Clear separation of concerns

---

## Timeline Estimate

- **Phase 0:** 1 hour (test harness setup)
- **Phase 1:** 2 hours (interface + adapters)
- **Phase 2:** 3 hours (SimpleSynth refactor + regression testing)
- **Phase 3:** 4 hours (renderer infrastructure + validation)
- **Phase 4:** 3 hours (UI components - OPTIONAL, can defer)
- **Phase 5:** 3 hours (comprehensive testing - OPTIONAL, can defer)
- **Phase 6:** 1 hour (documentation - OPTIONAL, can defer)

**Total for Core Integration (Phases 0-3):** ~10 hours
**Total for Full UI Integration (Phases 0-6):** ~17 hours

**Note:** Phases 4-6 are optional and can be deferred. The test harness provides a working export feature for validation.

---

## Risk Assessment

### Low Risk
- ✅ OPL3 interface abstraction (proven pattern)
- ✅ WAV encoding (already validated in prototypes)
- ✅ Pattern rendering logic (already validated in prototypes)

### Medium Risk
- ⚠️ SimpleSynth refactor (must not break real-time playback)
  - **Mitigation:** Comprehensive regression testing
- ⚠️ Dual-voice in offline mode (never tested before)
  - **Mitigation:** SimpleSynth already handles it, should "just work"

### High Risk
- 🔴 None identified

---

## Next Steps

1. **Get approval on this plan**
2. **Start with Phase 1** (low risk, foundational)
3. **Validate each phase** before proceeding to next
4. **Run regression tests** after Phase 2
5. **Compare export output** with prototype in Phase 5

---

## Implementation Decisions

All scope questions have been answered. See **"User Decisions (Confirmed)"** section at the top of this document.

---

## Ready to Begin Implementation! 🎵

This plan has been validated and approved. We will:
1. Build incrementally (Phase 0 → Phase 1 → Phase 2 → Phase 3)
2. Test thoroughly after each phase using the integration test harness
3. Only proceed to the next phase after all tests pass
4. Phase 2 regression testing is critical - real-time playback must remain unchanged

**Next Step:** Create Phase 0 test harness (integration-test.html)
