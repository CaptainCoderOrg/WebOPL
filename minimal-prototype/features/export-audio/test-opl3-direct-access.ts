/**
 * OPL3 Direct Access Test
 *
 * Tests if we can create and use an OPL3 chip instance directly in the main thread.
 * This is critical for determining our WAV export approach.
 */

// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  error?: Error;
}

const results: TestResult[] = [];
let chip: any = null; // OPL3 instance

// Logging
const logs: string[] = [];

function log(message: string, ...args: any[]) {
  const timestamp = new Date().toLocaleTimeString();
  const fullMessage = `[${timestamp}] ${message}`;
  logs.push(fullMessage);
  console.log(fullMessage, ...args);
  updateConsoleOutput();
}

function updateConsoleOutput() {
  const output = document.getElementById('consoleOutput');
  if (output) {
    output.textContent = logs.join('\n');
    output.scrollTop = output.scrollHeight;
  }
}

function updateStatus(status: 'pending' | 'running' | 'success' | 'error') {
  const statusEl = document.getElementById('overallStatus');
  if (statusEl) {
    statusEl.className = `status ${status}`;
    statusEl.textContent = {
      pending: 'Not Started',
      running: 'Running...',
      success: 'All Tests Passed ✅',
      error: 'Some Tests Failed ❌'
    }[status];
  }
}

function addResult(result: TestResult) {
  results.push(result);

  const summaryDiv = document.getElementById('summary');
  const resultsList = document.getElementById('resultsList');

  if (summaryDiv) summaryDiv.style.display = 'block';

  if (resultsList) {
    const li = document.createElement('li');
    li.className = result.passed ? 'pass' : 'fail';
    li.innerHTML = `<strong>${result.name}:</strong> ${result.message}`;
    resultsList.appendChild(li);
  }
}

// === TEST 1: Load OPL3 Library ===
async function testLoadLibrary(): Promise<TestResult> {
  try {
    log('TEST 1: Loading OPL3 library...');

    // Fetch the OPL3 browser bundle
    const response = await fetch('/node_modules/opl3/dist/opl3.js');

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const opl3Code = await response.text();
    log(`✓ Fetched OPL3 code (${opl3Code.length} bytes)`);

    // Evaluate the code in global scope
    (0, eval)(opl3Code);

    // Check if OPL3 is now available
    if (typeof (globalThis as any).OPL3 === 'undefined') {
      throw new Error('OPL3 not found in globalThis after eval');
    }

    if (typeof (globalThis as any).OPL3.OPL3 === 'undefined') {
      throw new Error('OPL3.OPL3 class not found');
    }

    log('✓ OPL3 library loaded successfully');
    log('✓ globalThis.OPL3.OPL3 is available');

    return {
      name: 'Load OPL3 Library',
      passed: true,
      message: 'Successfully loaded and evaluated OPL3 browser bundle'
    };

  } catch (error) {
    log(`✗ Failed to load OPL3 library: ${error}`);
    return {
      name: 'Load OPL3 Library',
      passed: false,
      message: `Failed: ${(error as Error).message}`,
      error: error as Error
    };
  }
}

// === TEST 2: Create Chip Instance ===
async function testCreateChip(): Promise<TestResult> {
  try {
    log('TEST 2: Creating OPL3 chip instance...');

    const OPL3Class = (globalThis as any).OPL3.OPL3;
    chip = new OPL3Class();

    log('✓ Created chip instance');
    log(`✓ Chip type: ${typeof chip}`);
    log(`✓ Has write method: ${typeof chip.write === 'function'}`);
    log(`✓ Has read method: ${typeof chip.read === 'function'}`);

    return {
      name: 'Create Chip Instance',
      passed: true,
      message: 'Successfully created OPL3 chip instance with write/read methods'
    };

  } catch (error) {
    log(`✗ Failed to create chip: ${error}`);
    return {
      name: 'Create Chip Instance',
      passed: false,
      message: `Failed: ${(error as Error).message}`,
      error: error as Error
    };
  }
}

// === TEST 3: Initialize OPL3 Mode ===
async function testInitializeChip(): Promise<TestResult> {
  try {
    log('TEST 3: Initializing OPL3 mode...');

    if (!chip) {
      throw new Error('Chip not created');
    }

    // Helper to write registers
    function writeReg(register: number, value: number) {
      const array = (register >= 0x100) ? 1 : 0;
      const address = register & 0xFF;
      chip.write(array, address, value);
      log(`  Write: 0x${register.toString(16).padStart(3, '0')} = 0x${value.toString(16).padStart(2, '0')}`);
    }

    // Reset sequence (from working test)
    writeReg(0x04, 0x60);  // Reset Timer 1 and Timer 2
    writeReg(0x04, 0x80);  // Reset IRQ
    writeReg(0x01, 0x20);  // Enable waveform select
    writeReg(0xBD, 0x00);  // Melodic mode

    // Enable OPL3 mode
    writeReg(0x105, 0x01); // OPL3 enable

    // Disable 4-operator mode
    writeReg(0x104, 0x00);

    // Initialize C0-C8 registers (DOSBox workaround)
    for (let ch = 0; ch < 9; ch++) {
      writeReg(0xC0 + ch, 0x00);       // Bank 0
      writeReg(0x100 + 0xC0 + ch, 0x00); // Bank 1
    }

    log('✓ OPL3 mode initialized');

    return {
      name: 'Initialize OPL3 Mode',
      passed: true,
      message: 'Successfully initialized OPL3 mode with all required registers'
    };

  } catch (error) {
    log(`✗ Failed to initialize: ${error}`);
    return {
      name: 'Initialize OPL3 Mode',
      passed: false,
      message: `Failed: ${(error as Error).message}`,
      error: error as Error
    };
  }
}

// === TEST 4: Load Simple Patch ===
async function testLoadPatch(): Promise<TestResult> {
  try {
    log('TEST 4: Loading simple piano patch to channel 0...');

    if (!chip) {
      throw new Error('Chip not created');
    }

    function writeReg(register: number, value: number) {
      const array = (register >= 0x100) ? 1 : 0;
      const address = register & 0xFF;
      chip.write(array, address, value);
    }

    // Channel 0 operator offsets
    const modulator = 0x00;
    const carrier = 0x03;

    // Program modulator (simple piano-like settings)
    writeReg(0x20 + modulator, 0x01); // MULT=1, no AM/VIB/EGT/KSR
    writeReg(0x40 + modulator, 0x10); // KSL=0, TL=16 (moderate volume)
    writeReg(0x60 + modulator, 0xF2); // AR=15, DR=2 (fast attack, slow decay)
    writeReg(0x80 + modulator, 0x74); // SL=7, RR=4 (medium sustain/release)
    writeReg(0xE0 + modulator, 0x00); // Waveform=0 (sine)

    // Program carrier
    writeReg(0x20 + carrier, 0x01);   // MULT=1
    writeReg(0x40 + carrier, 0x00);   // KSL=0, TL=0 (full volume)
    writeReg(0x60 + carrier, 0xF2);   // AR=15, DR=2
    writeReg(0x80 + carrier, 0x74);   // SL=7, RR=4
    writeReg(0xE0 + carrier, 0x00);   // Waveform=0 (sine)

    // Set feedback and connection
    writeReg(0xC0, 0x00); // Reset first (DOSBox workaround)
    writeReg(0xC0, 0x30 | (1 << 1)); // Feedback=1, FM mode, stereo output

    log('✓ Loaded piano patch to channel 0');

    return {
      name: 'Load Simple Patch',
      passed: true,
      message: 'Successfully programmed piano patch (modulator + carrier)'
    };

  } catch (error) {
    log(`✗ Failed to load patch: ${error}`);
    return {
      name: 'Load Simple Patch',
      passed: false,
      message: `Failed: ${(error as Error).message}`,
      error: error as Error
    };
  }
}

// === TEST 5: Trigger Note ===
async function testTriggerNote(): Promise<TestResult> {
  try {
    log('TEST 5: Triggering middle C (MIDI 60)...');

    if (!chip) {
      throw new Error('Chip not created');
    }

    function writeReg(register: number, value: number) {
      const array = (register >= 0x100) ? 1 : 0;
      const address = register & 0xFF;
      chip.write(array, address, value);
    }

    // Calculate frequency for middle C (261.63 Hz)
    // Using correct OPL3 algorithm
    const midiNote = 60; // Middle C
    const frequency = 440.0 * Math.pow(2, (midiNote - 69) / 12.0);

    log(`  MIDI note: ${midiNote}`);
    log(`  Frequency: ${frequency.toFixed(2)} Hz`);

    // Calculate block (octave selector)
    // For MIDI 60 (C-4): block = floor(60/12) - 1 = 4
    const block = Math.max(0, Math.min(7, Math.floor(midiNote / 12) - 1));

    // Calculate F-num for this block (must be 0-1023)
    const fnum = Math.max(0, Math.min(1023,
      Math.round((frequency * Math.pow(2, 20 - block)) / 49716)
    ));

    log(`  Block: ${block}`);
    log(`  F-num: ${fnum}`);

    // Write frequency to channel 0
    writeReg(0xA0, fnum & 0xFF); // F-num low byte

    const keyOnByte = 0x20 | ((block & 0x07) << 2) | ((fnum >> 8) & 0x03);
    writeReg(0xB0, keyOnByte); // Key-on + block + F-num high

    log(`✓ Note triggered (0xB0 = 0x${keyOnByte.toString(16)})`);

    return {
      name: 'Trigger Note',
      passed: true,
      message: 'Successfully triggered middle C on channel 0'
    };

  } catch (error) {
    log(`✗ Failed to trigger note: ${error}`);
    return {
      name: 'Trigger Note',
      passed: false,
      message: `Failed: ${(error as Error).message}`,
      error: error as Error
    };
  }
}

// === TEST 6: Generate Samples ===
async function testGenerateSamples(): Promise<TestResult> {
  try {
    log('TEST 6: Generating audio samples...');

    if (!chip) {
      throw new Error('Chip not created');
    }

    // Generate 1000 samples (about 20ms at 49,716 Hz)
    const numSamples = 1000;
    const buffer = new Int16Array(2); // Stereo (one sample at a time)
    const leftSamples: number[] = [];
    const rightSamples: number[] = [];

    log(`  Generating ${numSamples} samples...`);

    for (let i = 0; i < numSamples; i++) {
      chip.read(buffer);
      leftSamples.push(buffer[0]);
      rightSamples.push(buffer[1]);
    }

    log(`✓ Generated ${numSamples} samples`);

    // Check sample statistics
    const leftMin = Math.min(...leftSamples);
    const leftMax = Math.max(...leftSamples);
    const leftAvg = leftSamples.reduce((a, b) => a + b, 0) / numSamples;

    const rightMin = Math.min(...rightSamples);
    const rightMax = Math.max(...rightSamples);
    const rightAvg = rightSamples.reduce((a, b) => a + b, 0) / numSamples;

    log(`  Left channel: min=${leftMin}, max=${leftMax}, avg=${leftAvg.toFixed(2)}`);
    log(`  Right channel: min=${rightMin}, max=${rightMax}, avg=${rightAvg.toFixed(2)}`);

    // Count non-zero samples
    const leftNonZero = leftSamples.filter(s => s !== 0).length;
    const rightNonZero = rightSamples.filter(s => s !== 0).length;

    log(`  Non-zero samples: L=${leftNonZero}/${numSamples}, R=${rightNonZero}/${numSamples}`);

    return {
      name: 'Generate Samples',
      passed: true,
      message: `Generated ${numSamples} samples (${leftNonZero} left, ${rightNonZero} right non-zero)`
    };

  } catch (error) {
    log(`✗ Failed to generate samples: ${error}`);
    return {
      name: 'Generate Samples',
      passed: false,
      message: `Failed: ${(error as Error).message}`,
      error: error as Error
    };
  }
}

// === TEST 7: Verify Audio ===
async function testVerifyAudio(): Promise<TestResult> {
  try {
    log('TEST 7: Verifying audio output...');

    if (!chip) {
      throw new Error('Chip not created');
    }

    // Generate more samples to ensure we're past the attack phase
    const numSamples = 5000; // About 100ms
    const buffer = new Int16Array(2);
    let maxAmplitude = 0;
    let nonZeroCount = 0;

    for (let i = 0; i < numSamples; i++) {
      chip.read(buffer);
      const leftAbs = Math.abs(buffer[0]);
      const rightAbs = Math.abs(buffer[1]);
      maxAmplitude = Math.max(maxAmplitude, leftAbs, rightAbs);

      if (leftAbs > 0 || rightAbs > 0) {
        nonZeroCount++;
      }
    }

    log(`  Max amplitude: ${maxAmplitude}`);
    log(`  Non-zero samples: ${nonZeroCount}/${numSamples} (${(nonZeroCount/numSamples*100).toFixed(1)}%)`);

    // Verify we have actual audio
    if (maxAmplitude === 0) {
      throw new Error('All samples are zero - no audio being generated!');
    }

    if (nonZeroCount < numSamples * 0.1) {
      throw new Error(`Too few non-zero samples (${nonZeroCount}/${numSamples})`);
    }

    log(`✓ Audio verified - chip is generating sound!`);
    log(`✓ Peak amplitude: ${maxAmplitude} / 32767 (${(maxAmplitude/32767*100).toFixed(1)}%)`);

    return {
      name: 'Verify Audio',
      passed: true,
      message: `Audio verified! Peak: ${maxAmplitude}, ${nonZeroCount} non-zero samples`
    };

  } catch (error) {
    log(`✗ Audio verification failed: ${error}`);
    return {
      name: 'Verify Audio',
      passed: false,
      message: `Failed: ${(error as Error).message}`,
      error: error as Error
    };
  }
}

// === RUN ALL TESTS ===
async function runTests() {
  log('=== Starting OPL3 Direct Access Tests ===');
  updateStatus('running');

  const runBtn = document.getElementById('runTestBtn') as HTMLButtonElement;
  if (runBtn) runBtn.disabled = true;

  // Clear previous results
  results.length = 0;
  const resultsList = document.getElementById('resultsList');
  if (resultsList) resultsList.innerHTML = '';

  try {
    // Run tests sequentially
    addResult(await testLoadLibrary());
    addResult(await testCreateChip());
    addResult(await testInitializeChip());
    addResult(await testLoadPatch());
    addResult(await testTriggerNote());
    addResult(await testGenerateSamples());
    addResult(await testVerifyAudio());

    // Check overall success
    const allPassed = results.every(r => r.passed);

    log('');
    log('=== Test Summary ===');
    log(`Total tests: ${results.length}`);
    log(`Passed: ${results.filter(r => r.passed).length}`);
    log(`Failed: ${results.filter(r => !r.passed).length}`);

    if (allPassed) {
      log('');
      log('🎉 SUCCESS! We can use direct OPL3 access for WAV export!');
      log('');
      log('This means we can:');
      log('  - Create a separate OPL3 instance in main thread');
      log('  - Generate samples synchronously');
      log('  - No need for AudioWorklet message passing');
      log('  - Much simpler implementation!');
      updateStatus('success');
    } else {
      log('');
      log('❌ FAILURE: Some tests did not pass');
      log('We may need to use AudioWorklet recording approach instead');
      updateStatus('error');
    }

  } catch (error) {
    log(`Fatal error: ${error}`);
    updateStatus('error');
  } finally {
    if (runBtn) runBtn.disabled = false;
  }
}

// Make runTests available globally for the button onclick
(window as any).runTests = runTests;

// Auto-run on page load (optional)
// Uncomment to run automatically:
// window.addEventListener('load', () => {
//   setTimeout(runTests, 500);
// });
