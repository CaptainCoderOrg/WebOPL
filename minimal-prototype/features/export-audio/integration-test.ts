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

// Export RPG Adventure pattern
async function exportRPGAdventure() {
  const result = document.getElementById('rpg-result')!;
  result.innerHTML = 'Exporting RPG Adventure pattern...\n\n';
  result.className = 'result';

  try {
    // Step 1: Load pattern from YAML
    result.innerHTML += 'Step 1: Loading rpg-adventure.yaml...\n';
    const { loadPattern } = await import('../../src/utils/patternLoader');
    const pattern = await loadPattern('rpg-adventure');

    result.innerHTML += '✓ Pattern loaded\n';
    result.innerHTML += `  - Name: ${pattern.name}\n`;
    result.innerHTML += `  - Description: ${pattern.description}\n`;
    result.innerHTML += `  - Rows: ${pattern.rows}\n`;
    result.innerHTML += `  - Tracks: ${pattern.tracks}\n`;
    result.innerHTML += `  - BPM: ${pattern.bpm}\n`;
    result.innerHTML += `  - Instruments: ${pattern.instruments.join(', ')}\n\n`;

    // Step 2: Calculate expected duration
    const bpm = pattern.bpm || 120;
    const rowsPerBeat = 4;
    const secondsPerRow = 60 / (bpm * rowsPerBeat);
    const durationSeconds = pattern.rows * secondsPerRow;
    result.innerHTML += `Expected duration: ${durationSeconds.toFixed(2)}s (${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60).toFixed(0).padStart(2, '0')})\n\n`;

    // Step 3: Render to WAV
    result.innerHTML += 'Step 2: Rendering to WAV (auto-loading GENMIDI patches)...\n';
    const { OfflineAudioRenderer } = await import('../../src/export/OfflineAudioRenderer');

    let lastProgress = 0;
    const startTime = Date.now();

    const wavBuffer = await OfflineAudioRenderer.renderToWAV(
      pattern,
      null,  // Auto-load GENMIDI patches
      (progress) => {
        const percent = Math.round(progress * 100);
        if (percent > lastProgress && percent % 10 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          result.innerHTML += `  Progress: ${percent}% (${elapsed}s elapsed)\n`;
          lastProgress = percent;
        }
      }
    );

    const renderTime = ((Date.now() - startTime) / 1000).toFixed(2);
    result.innerHTML += `\n✓ WAV generated: ${(wavBuffer.byteLength / 1024 / 1024).toFixed(2)} MB\n`;
    result.innerHTML += `  Render time: ${renderTime}s\n\n`;

    // Step 4: Download WAV file
    result.innerHTML += 'Step 3: Downloading WAV file...\n';
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rpg-adventure.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    result.innerHTML += '✓ WAV file downloaded: rpg-adventure.wav\n\n';

    result.innerHTML += '✅ RPG ADVENTURE EXPORT SUCCESSFUL\n\n';
    result.innerHTML += 'Verification steps:\n';
    result.innerHTML += '1. Open rpg-adventure.wav in your media player\n';
    result.innerHTML += '2. Verify it plays without errors\n';
    result.innerHTML += `3. Check duration is approximately ${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60).toFixed(0).padStart(2, '0')}\n`;
    result.innerHTML += '4. Listen for 8 tracks of layered melody and harmony\n';
    result.innerHTML += '5. Verify dual-voice richness (should sound fuller than single-voice)\n';
    result.innerHTML += '6. Compare with real-time playback in main tracker';
    result.className = 'result success';
  } catch (error) {
    result.innerHTML += `\n❌ RPG ADVENTURE EXPORT FAILED\n\n`;
    result.innerHTML += `Error: ${error}\n\n`;
    result.innerHTML += 'Possible causes:\n';
    result.innerHTML += '- Pattern file not found or invalid\n';
    result.innerHTML += '- GENMIDI patches failed to load\n';
    result.innerHTML += '- OPL3 library initialization error\n';
    result.innerHTML += '- Insufficient memory for large pattern\n\n';
    result.innerHTML += 'Check console for detailed error information.';
    result.className = 'result error';
    console.error('RPG Adventure export error:', error);
  }
}

// Helper: Render pattern to audio buffers
async function renderPatternToBuffers(pattern: any, trimSilence: boolean = false): Promise<{ left: Int16Array; right: Int16Array }> {
  const SAMPLE_RATE = 49716;

  // Load GENMIDI patches
  const { loadGENMIDI } = await import('../../src/utils/genmidiParser');
  const bank = await loadGENMIDI();
  const patches = bank.patches;

  // Load OPL3 library and create chip
  await loadOPL3Library();
  const chip = new (globalThis as any).OPL3.OPL3();

  // Initialize OPL3 chip
  chip.write(0, 0x04, 0x60);
  chip.write(0, 0x04, 0x80);
  chip.write(0, 0x01, 0x20);
  chip.write(0, 0xBD, 0x00);
  chip.write(1, 0x05, 0x01);
  chip.write(1, 0x04, 0x00);
  for (let ch = 0; ch < 9; ch++) {
    chip.write(0, 0xC0 + ch, 0x00);
    chip.write(1, 0xC0 + ch, 0x00);
  }

  // Create adapter and synth
  const { DirectOPLChip } = await import('../../src/adapters/DirectOPLChip');
  const directChip = new DirectOPLChip(chip);
  const { SimpleSynth } = await import('../../src/SimpleSynth');
  const synth = new SimpleSynth();
  await synth.init(directChip);

  // Load patches for each track
  for (let trackIndex = 0; trackIndex < pattern.tracks; trackIndex++) {
    const patchIndex = pattern.instruments[trackIndex];
    const patch = patches[patchIndex];
    if (patch) {
      synth.setTrackPatch(trackIndex, patch);
    }
  }

  // Convert to renderable pattern
  const { PatternRenderer } = await import('../../src/export/PatternRenderer');
  const renderablePattern = {
    name: pattern.name,
    pattern: pattern.pattern,
    instruments: pattern.instruments,
    bpm: pattern.bpm,
    rowsPerBeat: 4,
  };

  // Render to timeline
  const timeline = PatternRenderer.render(renderablePattern);
  const totalSamples = Math.ceil(timeline.duration * SAMPLE_RATE);

  // Allocate buffers
  const leftChannel = new Int16Array(totalSamples);
  const rightChannel = new Int16Array(totalSamples);

  // Render samples
  let eventIndex = 0;
  const sampleBuffer = new Int16Array(2);

  for (let sampleIndex = 0; sampleIndex < totalSamples; sampleIndex++) {
    // Process events at this sample time
    while (eventIndex < timeline.events.length) {
      const event = timeline.events[eventIndex];
      const eventSampleIndex = Math.floor(event.time * SAMPLE_RATE);
      if (eventSampleIndex > sampleIndex) break;

      if (event.type === 'note-on') {
        synth.noteOn(event.track, event.midiNote, 100);
      } else {
        synth.noteOff(event.track, event.midiNote);
      }
      eventIndex++;
    }

    // Generate sample
    directChip.read(sampleBuffer);
    leftChannel[sampleIndex] = sampleBuffer[0];
    rightChannel[sampleIndex] = sampleBuffer[1];
  }

  // Trim trailing silence if requested (for loop exports)
  if (trimSilence) {
    const trimPoint = findAudioEndPoint(leftChannel, rightChannel);
    console.log(`[renderPatternToBuffers] Trimming silence: ${totalSamples} -> ${trimPoint} samples`);
    return {
      left: leftChannel.slice(0, trimPoint),
      right: rightChannel.slice(0, trimPoint)
    };
  }

  return { left: leftChannel, right: rightChannel };
}

// Helper: Find where actual audio ends (before trailing silence)
function findAudioEndPoint(leftChannel: Int16Array, rightChannel: Int16Array): number {
  const SILENCE_THRESHOLD = 50; // Amplitude threshold for silence
  const SILENCE_DURATION_MS = 200; // Look for 200ms of continuous silence
  const SAMPLE_RATE = 49716;
  const silenceDurationSamples = Math.floor((SILENCE_DURATION_MS / 1000) * SAMPLE_RATE);

  // Search backwards from the end
  let silenceCount = 0;
  for (let i = leftChannel.length - 1; i >= 0; i--) {
    const leftAmp = Math.abs(leftChannel[i]);
    const rightAmp = Math.abs(rightChannel[i]);

    if (leftAmp < SILENCE_THRESHOLD && rightAmp < SILENCE_THRESHOLD) {
      silenceCount++;
      if (silenceCount >= silenceDurationSamples) {
        // Found sustained silence region
        // i is the start of the silence region (going forward)
        // Return i as the trim point
        return i;
      }
    } else {
      // Reset silence counter when we find audio
      silenceCount = 0;
    }
  }

  // No significant silence found, return full length
  return leftChannel.length;
}

// Export RPG Adventure with crossfade loop
async function exportCrossfadeLoop() {
  const result = document.getElementById('crossfade-result')!;
  result.innerHTML = 'Exporting with crossfade loop...\\n\\n';
  result.className = 'result';

  try {
    // Step 1: Load pattern
    result.innerHTML += 'Step 1: Loading rpg-adventure.yaml...\\n';
    const { loadPattern } = await import('../../src/utils/patternLoader');
    const pattern = await loadPattern('rpg-adventure');

    result.innerHTML += '✓ Pattern loaded\\n';
    result.innerHTML += `  - Name: ${pattern.name}\\n`;
    result.innerHTML += `  - Rows: ${pattern.rows}, Tracks: ${pattern.tracks}, BPM: ${pattern.bpm}\\n\\n`;

    // Step 2: Create context-aware pattern (last 8 + all + first 8)
    result.innerHTML += 'Step 2: Creating context-aware pattern...\\n';
    const originalRows = pattern.rows;
    const contextRows = 8; // Lead-in and lead-out context
    const totalRows = contextRows + originalRows + contextRows;

    const contextPattern = {
      ...pattern,
      rows: totalRows,
      pattern: [] as string[][]
    };

    // Build pattern: [last 8 rows | all rows | first 8 rows]
    // Last 8 rows (lead-in context)
    for (let i = 0; i < contextRows; i++) {
      const rowIdx = (originalRows - contextRows + i) % originalRows;
      contextPattern.pattern.push(pattern.pattern[rowIdx]);
    }
    // All rows (core pattern)
    for (let i = 0; i < originalRows; i++) {
      contextPattern.pattern.push(pattern.pattern[i]);
    }
    // First 8 rows (lead-out context)
    for (let i = 0; i < contextRows; i++) {
      contextPattern.pattern.push(pattern.pattern[i]);
    }

    result.innerHTML += `  - Original: ${originalRows} rows\\n`;
    result.innerHTML += `  - Lead-in context: ${contextRows} rows (rows ${originalRows - contextRows}-${originalRows - 1})\\n`;
    result.innerHTML += `  - Lead-out context: ${contextRows} rows (rows 0-${contextRows - 1})\\n`;
    result.innerHTML += `  - Total render: ${totalRows} rows\\n\\n`;

    // Step 3: Render context-aware pattern
    result.innerHTML += 'Step 3: Rendering context-aware pattern...\\n';
    const audioBuffers = await renderPatternToBuffers(contextPattern, false);

    result.innerHTML += `✓ Rendered ${audioBuffers.left.length} samples (${(audioBuffers.left.length / 49716).toFixed(2)}s)\\n\\n`;

    // Step 4: Calculate sample positions
    result.innerHTML += 'Step 4: Calculating core extraction...\\n';
    const bpm = pattern.bpm || 120;
    const rowsPerBeat = 4;
    const secondsPerRow = 60 / (bpm * rowsPerBeat);

    const leadInDuration = contextRows * secondsPerRow;
    const coreDuration = originalRows * secondsPerRow;
    const totalDuration = totalRows * secondsPerRow;

    const leadInSamples = Math.floor(leadInDuration * 49716);
    const coreSamples = Math.floor(coreDuration * 49716);
    const totalSamples = Math.floor(totalDuration * 49716);

    result.innerHTML += `  - Lead-in: ${leadInDuration.toFixed(2)}s (${leadInSamples} samples)\\n`;
    result.innerHTML += `  - Core: ${coreDuration.toFixed(2)}s (${coreSamples} samples)\\n`;
    result.innerHTML += `  - Total: ${totalDuration.toFixed(2)}s (${totalSamples} samples)\\n`;
    result.innerHTML += `  - Trimming from ${audioBuffers.left.length} to ${totalSamples} samples\\n\\n`;

    // Trim to exact musical length
    const trimmedLeft = audioBuffers.left.slice(0, totalSamples);
    const trimmedRight = audioBuffers.right.slice(0, totalSamples);

    // Step 5: Extract core loop (no crossfade needed - context makes it seamless)
    result.innerHTML += 'Step 5: Extracting core loop...\\n';
    const { CrossfadeLoopEncoder } = await import('../../src/utils/CrossfadeLoopEncoder');
    const fadeDuration = 0; // No crossfade needed
    result.innerHTML += `  - Extracting core (rows 0-${originalRows - 1}) from render\\n`;
    result.innerHTML += `  - No crossfade needed - context ensures seamless loop\\n`;

    const extracted = CrossfadeLoopEncoder.applyCrossfade(
      trimmedLeft,
      trimmedRight,
      49716,
      leadInSamples,
      coreSamples,
      fadeDuration
    );

    result.innerHTML += `✓ Extracted seamless loop: ${extracted.left.length} samples (${(extracted.left.length / 49716).toFixed(2)}s)\\n\\n`;

    // Step 6: Encode to WAV (standard, no loop markers)
    result.innerHTML += 'Step 6: Encoding to WAV...\\n';
    const { WAVEncoder } = await import('../../src/utils/WAVEncoder');
    const wavBuffer = WAVEncoder.encode(extracted.left, extracted.right, 49716);

    result.innerHTML += `✓ WAV encoded: ${(wavBuffer.byteLength / 1024 / 1024).toFixed(2)} MB\\n\\n`;

    // Step 7: Download
    result.innerHTML += 'Step 7: Downloading...\\n';
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rpg-adventure-crossfade-loop.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    result.innerHTML += '✓ Downloaded: rpg-adventure-crossfade-loop.wav\\n\\n';

    result.innerHTML += '✅ CROSSFADE LOOP EXPORT SUCCESSFUL\\n\\n';
    result.innerHTML += 'Verification:\\n';
    result.innerHTML += '1. Open file and let it loop in your media player\\n';
    result.innerHTML += '2. Listen carefully at loop boundary - should be completely seamless\\n';
    result.innerHTML += `3. Method: Context-aware rendering (last 8 + all + first 8 rows)\\n`;
    result.innerHTML += `4. Loop point: Row ${originalRows - 1} → Row 0 (natural musical boundary)\\n`;
    result.innerHTML += `5. Crossfade: ${fadeDuration.toFixed(0)}ms equal-power fade at loop point\\n`;
    result.innerHTML += '6. Musical structure preserved - loop starts at row 0';
    result.className = 'result success';
  } catch (error) {
    result.innerHTML += `\\n❌ CROSSFADE LOOP EXPORT FAILED\\n\\n`;
    result.innerHTML += `Error: ${error}\\n`;
    result.className = 'result error';
    console.error('Crossfade loop export error:', error);
  }
}

// Export RPG Adventure with SMPL loop points
async function exportSMPLLoop() {
  const result = document.getElementById('smpl-result')!;
  result.innerHTML = 'Exporting with SMPL loop points...\\n\\n';
  result.className = 'result';

  try {
    // Step 1: Load pattern
    result.innerHTML += 'Step 1: Loading rpg-adventure.yaml...\\n';
    const { loadPattern } = await import('../../src/utils/patternLoader');
    const pattern = await loadPattern('rpg-adventure');

    result.innerHTML += '✓ Pattern loaded\\n';
    result.innerHTML += `  - Name: ${pattern.name}\\n`;
    result.innerHTML += `  - Rows: ${pattern.rows}, Tracks: ${pattern.tracks}, BPM: ${pattern.bpm}\\n\\n`;

    // Step 2: Calculate extended render (1.5x)
    result.innerHTML += 'Step 2: Calculating extended render (1.5x for overlap)...\\n';
    const originalRows = pattern.rows;
    const overlapRows = Math.floor(originalRows / 2); // 50% overlap
    const extendedRows = originalRows + overlapRows;

    result.innerHTML += `  - Original pattern: ${originalRows} rows\\n`;
    result.innerHTML += `  - Overlap region: ${overlapRows} rows\\n`;
    result.innerHTML += `  - Extended render: ${extendedRows} rows\\n\\n`;

    // Create extended pattern
    const extendedPattern = {
      ...pattern,
      rows: extendedRows,
      pattern: [] as string[][]
    };

    // Repeat pattern data to create extended version
    for (let i = 0; i < extendedRows; i++) {
      extendedPattern.pattern.push(pattern.pattern[i % originalRows]);
    }

    result.innerHTML += '✓ Extended pattern created\\n\\n';

    // Step 3: Render extended pattern (trim trailing silence)
    result.innerHTML += 'Step 3: Rendering extended pattern...\\n';
    const audioBuffers = await renderPatternToBuffers(extendedPattern, true);

    const totalSamples = audioBuffers.left.length;
    result.innerHTML += `✓ Rendered ${totalSamples} samples (silence trimmed)\\n\\n`;

    // Step 4: Find optimal loop point
    result.innerHTML += 'Step 4: Finding optimal loop point in overlap region...\\n';
    const { LoopPointFinder } = await import('../../src/utils/LoopPointFinder');

    // Calculate where the overlap region starts (in samples)
    // Since we rendered 1.5x (96 rows total, 64 original + 32 overlap)
    // The loop point should be around 64/96 of the total trimmed length
    const originalLengthSamples = Math.floor(totalSamples * (originalRows / extendedRows));
    const overlapStartSamples = originalLengthSamples;
    const overlapEndSamples = totalSamples;

    result.innerHTML += `  - Original length estimate: ${originalLengthSamples} samples (${(originalLengthSamples / 49716).toFixed(2)}s)\\n`;
    result.innerHTML += `  - Overlap region: ${overlapStartSamples} to ${overlapEndSamples}\\n`;

    const loopEnd = LoopPointFinder.findBestLoopPoint(
      audioBuffers.left,
      audioBuffers.right,
      overlapStartSamples,
      overlapEndSamples
    );

    const loopStart = 0; // Always start from beginning
    result.innerHTML += `✓ Loop point found: ${loopStart} -> ${loopEnd}\\n\\n`;

    // Step 5: Encode to WAV with SMPL chunk
    result.innerHTML += 'Step 5: Encoding to WAV with SMPL chunk...\\n';
    const { WAVEncoder } = await import('../../src/utils/WAVEncoder');
    const wavBuffer = WAVEncoder.encodeWithLoop(
      audioBuffers.left,
      audioBuffers.right,
      49716,
      loopStart,
      loopEnd
    );

    result.innerHTML += `✓ WAV with SMPL encoded: ${(wavBuffer.byteLength / 1024 / 1024).toFixed(2)} MB\\n`;
    result.innerHTML += `  - Loop: ${loopStart} -> ${loopEnd} (${((loopEnd / 49716) * 1000).toFixed(0)}ms duration)\\n\\n`;

    // Step 6: Download
    result.innerHTML += 'Step 6: Downloading...\\n';
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rpg-adventure-smpl-loop.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    result.innerHTML += '✓ Downloaded: rpg-adventure-smpl-loop.wav\\n\\n';

    result.innerHTML += '✅ SMPL LOOP EXPORT SUCCESSFUL\\n\\n';
    result.innerHTML += 'Verification:\\n';
    result.innerHTML += '1. Verify SMPL chunk with hex editor (search for "smpl")\\n';
    result.innerHTML += '2. Test in Unity/Unreal Engine (should respect loop markers)\\n';
    result.innerHTML += '3. Open in DAW (Reaper, FL Studio) - should show loop region\\n';
    result.innerHTML += '4. Compare pristine audio quality (no crossfade alteration)\\n';
    result.innerHTML += '5. File is 50% larger due to overlap region';
    result.className = 'result success';
  } catch (error) {
    result.innerHTML += `\\n❌ SMPL LOOP EXPORT FAILED\\n\\n`;
    result.innerHTML += `Error: ${error}\\n`;
    result.className = 'result error';
    console.error('SMPL loop export error:', error);
  }
}

// Make functions available globally for onclick handlers
(window as any).testPhase1 = testPhase1;
(window as any).testPhase2 = testPhase2;
(window as any).testPhase3 = testPhase3;
(window as any).runFullTest = runFullTest;
(window as any).exportRPGAdventure = exportRPGAdventure;
(window as any).exportCrossfadeLoop = exportCrossfadeLoop;
(window as any).exportSMPLLoop = exportSMPLLoop;
