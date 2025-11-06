/**
 * Integration Tests for WAV Export
 *
 * Tests each phase of the integration incrementally:
 * - Phase 1: IOPLChip interface and adapters
 * - Phase 2: SimpleSynth with DirectOPLChip
 * - Phase 3: Offline rendering classes
 * - Full Test: End-to-end WAV export
 */

// Phase 1: Test IOPLChip interface and adapters
async function testPhase1() {
  const result = document.getElementById('phase1-result')!;
  result.innerHTML = 'Testing Phase 1...\n\n';
  result.className = 'result';

  try {
    // Test 1: Import IOPLChip interface
    try {
      const module = await import('../../src/interfaces/IOPLChip');
      result.innerHTML += '✓ IOPLChip interface imports correctly\n';
    } catch (error) {
      throw new Error(`IOPLChip interface import failed: ${error}`);
    }

    // Test 2: Import DirectOPLChip
    try {
      const { DirectOPLChip } = await import('../../src/adapters/DirectOPLChip');
      result.innerHTML += '✓ DirectOPLChip class imports correctly\n';
    } catch (error) {
      throw new Error(`DirectOPLChip import failed: ${error}`);
    }

    // Test 3: Import WorkletOPLChip
    try {
      const { WorkletOPLChip } = await import('../../src/adapters/WorkletOPLChip');
      result.innerHTML += '✓ WorkletOPLChip class imports correctly\n';
    } catch (error) {
      throw new Error(`WorkletOPLChip import failed: ${error}`);
    }

    result.innerHTML += '\n✅ Phase 1 PASSED\n';
    result.innerHTML += '\nAll interface and adapter classes compile and import successfully.';
    result.className = 'result success';
  } catch (error) {
    result.innerHTML += `\n❌ Phase 1 FAILED\n\n`;
    result.innerHTML += `Error: ${error}\n\n`;
    result.innerHTML += 'Fix: Ensure Phase 1 files are created and TypeScript builds without errors.';
    result.className = 'result error';
  }
}

// Phase 2: Test SimpleSynth with DirectOPLChip
async function testPhase2() {
  const result = document.getElementById('phase2-result')!;
  result.innerHTML = 'Testing Phase 2...\n\n';
  result.className = 'result';

  try {
    // Step 1: Load OPL3 library
    result.innerHTML += 'Step 1: Loading OPL3 library...\n';
    await loadOPL3Library();
    result.innerHTML += '✓ OPL3 library loaded\n\n';

    // Step 2: Create OPL3 chip instance
    result.innerHTML += 'Step 2: Creating OPL3 chip...\n';
    const OPL3Class = (globalThis as any).OPL3.OPL3;
    const chip = new OPL3Class();
    result.innerHTML += '✓ OPL3 chip created\n\n';

    // Step 3: Create DirectOPLChip adapter
    result.innerHTML += 'Step 3: Creating DirectOPLChip adapter...\n';
    const { DirectOPLChip } = await import('../../src/adapters/DirectOPLChip');
    const directChip = new DirectOPLChip(chip);
    result.innerHTML += '✓ DirectOPLChip created\n\n';

    // Step 4: Test write operation
    result.innerHTML += 'Step 4: Testing write operation...\n';
    directChip.write(0, 0x01, 0x20);
    result.innerHTML += '✓ DirectOPLChip.write() works\n\n';

    // Step 5: Test read operation
    result.innerHTML += 'Step 5: Testing read operation...\n';
    const buffer = new Int16Array(2);
    directChip.read(buffer);
    result.innerHTML += `✓ DirectOPLChip.read() works (samples: [${buffer[0]}, ${buffer[1]}])\n\n`;

    // Step 6: Create SimpleSynth with DirectOPLChip
    result.innerHTML += 'Step 6: Initializing SimpleSynth with DirectOPLChip...\n';
    const { SimpleSynth } = await import('../../src/SimpleSynth');
    const synth = new SimpleSynth();
    await synth.init(directChip);
    result.innerHTML += '✓ SimpleSynth initialized with DirectOPLChip\n\n';

    result.innerHTML += '✅ Phase 2 PASSED\n\n';
    result.innerHTML += 'SimpleSynth successfully works with DirectOPLChip for offline rendering.\n';
    result.innerHTML += '\nIMPORTANT: Now test real-time playback in main tracker to ensure no regressions!';
    result.className = 'result success';
  } catch (error) {
    result.innerHTML += `\n❌ Phase 2 FAILED\n\n`;
    result.innerHTML += `Error: ${error}\n\n`;
    result.innerHTML += 'Fix: Ensure SimpleSynth refactor is complete and supports optional IOPLChip parameter.';
    result.className = 'result error';
  }
}

// Phase 3: Test rendering infrastructure classes
async function testPhase3() {
  const result = document.getElementById('phase3-result')!;
  result.innerHTML = 'Testing Phase 3...\n\n';
  result.className = 'result';

  try {
    // Setup
    result.innerHTML += 'Setup: Loading OPL3 library...\n';
    await loadOPL3Library();
    const chip = new (globalThis as any).OPL3.OPL3();
    const { DirectOPLChip } = await import('../../src/adapters/DirectOPLChip');
    const directChip = new DirectOPLChip(chip);
    result.innerHTML += '✓ OPL3 setup complete\n\n';

    // Test 1: PatternRenderer
    result.innerHTML += 'Test 1: Importing PatternRenderer...\n';
    try {
      const { PatternRenderer } = await import('../../src/export/PatternRenderer');
      result.innerHTML += '✓ PatternRenderer imports correctly\n\n';
    } catch (error) {
      throw new Error(`PatternRenderer import failed: ${error}`);
    }

    // Test 2: WAVEncoder
    result.innerHTML += 'Test 2: Importing WAVEncoder...\n';
    try {
      const { WAVEncoder } = await import('../../src/utils/WAVEncoder');
      result.innerHTML += '✓ WAVEncoder imports correctly\n\n';
    } catch (error) {
      throw new Error(`WAVEncoder import failed: ${error}`);
    }

    // Test 3: OfflineAudioRenderer
    result.innerHTML += 'Test 3: Importing OfflineAudioRenderer...\n';
    try {
      const { OfflineAudioRenderer } = await import('../../src/export/OfflineAudioRenderer');
      result.innerHTML += '✓ OfflineAudioRenderer imports correctly\n\n';
    } catch (error) {
      throw new Error(`OfflineAudioRenderer import failed: ${error}`);
    }

    result.innerHTML += '✅ Phase 3 PASSED\n\n';
    result.innerHTML += 'All offline rendering classes compile and import successfully.\n';
    result.innerHTML += '\nReady for full integration test!';
    result.className = 'result success';
  } catch (error) {
    result.innerHTML += `\n❌ Phase 3 FAILED\n\n`;
    result.innerHTML += `Error: ${error}\n\n`;
    result.innerHTML += 'Fix: Ensure all Phase 3 classes are created and TypeScript builds without errors.';
    result.className = 'result error';
  }
}

// Full integration test: Render and export a test pattern
async function runFullTest() {
  const result = document.getElementById('full-result')!;
  result.innerHTML = 'Running full integration test...\n\n';
  result.className = 'result';

  try {
    // Load test pattern (simple 4-row, 2-track test) in PatternFile format
    result.innerHTML += 'Step 1: Loading test pattern...\n';
    const testPattern = {
      name: 'Integration Test Pattern',
      description: 'Simple test with C-4 and E-4 notes',
      author: 'Test Suite',
      rows: 4,
      tracks: 2,
      bpm: 120,
      instruments: [0, 1],  // GENMIDI patch indices
      pattern: [
        ['C-4', '---'],
        ['---', 'E-4'],
        ['OFF', '---'],
        ['---', 'OFF']
      ]
    };

    result.innerHTML += '✓ Test pattern loaded\n';
    result.innerHTML += `  - Pattern: ${testPattern.name}\n`;
    result.innerHTML += `  - Rows: ${testPattern.rows}\n`;
    result.innerHTML += `  - Tracks: ${testPattern.tracks}\n`;
    result.innerHTML += `  - BPM: ${testPattern.bpm}\n\n`;

    // Render to WAV
    result.innerHTML += 'Step 2: Rendering to WAV (will auto-load GENMIDI patches)...\n';
    const { OfflineAudioRenderer } = await import('../../src/export/OfflineAudioRenderer');

    let lastProgress = 0;
    const wavBuffer = await OfflineAudioRenderer.renderToWAV(
      testPattern,
      null,  // Auto-load GENMIDI patches
      (progress) => {
        const percent = Math.round(progress * 100);
        if (percent > lastProgress) {
          result.innerHTML += `  Progress: ${percent}%\n`;
          lastProgress = percent;
        }
      }
    );

    result.innerHTML += `\n✓ WAV generated: ${wavBuffer.byteLength} bytes\n\n`;

    // Trigger download
    result.innerHTML += 'Step 3: Downloading WAV file...\n';
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'integration-test.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    result.innerHTML += '✓ WAV file downloaded: integration-test.wav\n\n';

    result.innerHTML += '✅ FULL INTEGRATION TEST PASSED\n\n';
    result.innerHTML += 'Next steps:\n';
    result.innerHTML += '1. Open integration-test.wav in VLC or Windows Media Player\n';
    result.innerHTML += '2. Verify audio plays without errors\n';
    result.innerHTML += '3. Listen for C-4 note, then E-4 note with correct sustain\n';
    result.innerHTML += '4. Compare with prototype-5-full-song.html output\n';
    result.innerHTML += '5. Integrated version should sound richer (dual-voice working!)';
    result.className = 'result success';
  } catch (error) {
    result.innerHTML += `\n❌ FULL TEST FAILED\n\n`;
    result.innerHTML += `Error: ${error}\n\n`;
    result.innerHTML += 'Fix: Check console for detailed error. Ensure all phases passed first.';
    result.className = 'result error';
    console.error('Full test error:', error);
  }
}

// Helper: Load OPL3 library
async function loadOPL3Library(): Promise<void> {
  if (typeof (globalThis as any).OPL3?.OPL3 !== 'undefined') {
    return; // Already loaded
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
