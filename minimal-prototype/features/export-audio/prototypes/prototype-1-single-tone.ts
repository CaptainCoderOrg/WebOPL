/**
 * Prototype 1: Single Tone WAV Export
 *
 * Goal: Generate a 1-second middle C (C-4) note and export as WAV file
 *
 * Success Criteria:
 * - WAV file generates without errors
 * - File size is ~194 KB
 * - Plays a clear piano note in media players
 * - Duration is exactly 1 second
 * - No audio artifacts
 */

console.log('=== Prototype 1: Single Tone WAV Export ===');

// Global state
let chip: any = null;
let generatedBlob: Blob | null = null;

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

function updateStatus(status: 'ready' | 'generating' | 'complete' | 'error', message: string) {
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.className = `status ${status}`;
    statusEl.textContent = message;
  }
}

function updateProgress(percent: number) {
  const progressBar = document.getElementById('progressBar');
  const progressFill = document.getElementById('progressFill');

  if (progressBar && progressFill) {
    progressBar.classList.add('active');
    progressFill.style.width = `${percent}%`;
    progressFill.textContent = `${Math.round(percent)}%`;
  }
}

function hideProgress() {
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.classList.remove('active');
  }
}

// === Step 1: Load OPL3 Library ===
async function loadOPL3Library(): Promise<void> {
  log('Step 1: Loading OPL3 library...');

  const response = await fetch('/node_modules/opl3/dist/opl3.js');
  if (!response.ok) {
    throw new Error(`Failed to fetch OPL3: ${response.statusText}`);
  }

  const opl3Code = await response.text();
  log(`✓ Fetched OPL3 code (${opl3Code.length} bytes)`);

  // Evaluate in global scope
  (0, eval)(opl3Code);

  if (typeof (globalThis as any).OPL3?.OPL3 === 'undefined') {
    throw new Error('OPL3 not available after loading');
  }

  log('✓ OPL3 library loaded successfully');
}

// === Step 2: Create and Initialize Chip ===
function createChip(): void {
  log('Step 2: Creating OPL3 chip instance...');

  const OPL3Class = (globalThis as any).OPL3.OPL3;
  chip = new OPL3Class();

  log('✓ Chip instance created');
}

function writeReg(register: number, value: number): void {
  if (!chip) throw new Error('Chip not initialized');

  const array = (register >= 0x100) ? 1 : 0;
  const address = register & 0xFF;
  chip.write(array, address, value);
}

function initializeChip(): void {
  log('Step 3: Initializing OPL3 mode...');

  // Reset sequence
  writeReg(0x04, 0x60);  // Reset timers
  writeReg(0x04, 0x80);  // Reset IRQ
  writeReg(0x01, 0x20);  // Enable waveform select
  writeReg(0xBD, 0x00);  // Melodic mode

  // Enable OPL3 mode
  writeReg(0x105, 0x01);

  // Disable 4-operator mode
  writeReg(0x104, 0x00);

  // Initialize C0-C8 registers
  for (let ch = 0; ch < 9; ch++) {
    writeReg(0xC0 + ch, 0x00);
    writeReg(0x100 + 0xC0 + ch, 0x00);
  }

  log('✓ OPL3 initialized');
}

// === Step 4: Load Piano Patch ===
function loadPianoPatch(): void {
  log('Step 4: Loading piano patch...');

  // Channel 0 operator offsets
  const modulator = 0x00;
  const carrier = 0x03;

  // Program modulator
  writeReg(0x20 + modulator, 0x01); // MULT=1
  writeReg(0x40 + modulator, 0x10); // TL=16
  writeReg(0x60 + modulator, 0xF2); // AR=15, DR=2
  writeReg(0x80 + modulator, 0x74); // SL=7, RR=4
  writeReg(0xE0 + modulator, 0x00); // Waveform=sine

  // Program carrier
  writeReg(0x20 + carrier, 0x01);   // MULT=1
  writeReg(0x40 + carrier, 0x00);   // TL=0 (full volume)
  writeReg(0x60 + carrier, 0xF2);   // AR=15, DR=2
  writeReg(0x80 + carrier, 0x74);   // SL=7, RR=4
  writeReg(0xE0 + carrier, 0x00);   // Waveform=sine

  // Feedback and connection
  writeReg(0xC0, 0x00); // Reset
  writeReg(0xC0, 0x30 | (1 << 1)); // Feedback=1, FM mode, stereo

  log('✓ Piano patch loaded');
}

// === Step 5: Trigger Note ===
function triggerNote(): void {
  log('Step 5: Triggering middle C (MIDI 60)...');

  const midiNote = 60; // Middle C
  const frequency = 440.0 * Math.pow(2, (midiNote - 69) / 12.0);

  log(`  Frequency: ${frequency.toFixed(2)} Hz`);

  // Calculate F-num and block using correct OPL3 algorithm
  // Block calculation: higher MIDI notes need higher blocks
  // For MIDI 60 (C-4): block should be 4
  const block = Math.floor(midiNote / 12) - 1;
  const clampedBlock = Math.max(0, Math.min(7, block));

  // Calculate F-num for this block
  // F-num must be in range 0-1023 (10 bits)
  const fnum = Math.round((frequency * Math.pow(2, 20 - clampedBlock)) / 49716);
  const clampedFnum = Math.max(0, Math.min(1023, fnum));

  log(`  Block: ${clampedBlock} (octave selector)`);
  log(`  F-num: ${clampedFnum} (frequency fine-tune)`);

  // Write frequency registers
  writeReg(0xA0, clampedFnum & 0xFF);
  const keyOnByte = 0x20 | ((clampedBlock & 0x07) << 2) | ((clampedFnum >> 8) & 0x03);
  writeReg(0xB0, keyOnByte);

  log(`✓ Note triggered (key-on: 0x${keyOnByte.toString(16)})`);
}

// === Step 6: Generate Samples ===
function generateSamples(): { left: Int16Array; right: Int16Array } {
  log('Step 6: Generating audio samples...');

  const sampleRate = 49716;
  const duration = 1.0; // 1 second
  const totalSamples = Math.floor(sampleRate * duration);

  log(`  Generating ${totalSamples} samples...`);

  const leftChannel = new Int16Array(totalSamples);
  const rightChannel = new Int16Array(totalSamples);
  const buffer = new Int16Array(2);

  // Generate samples one at a time (critical!)
  const updateInterval = Math.floor(totalSamples / 100); // Update every 1%

  for (let i = 0; i < totalSamples; i++) {
    chip.read(buffer);
    leftChannel[i] = buffer[0];
    rightChannel[i] = buffer[1];

    // Update progress
    if (i % updateInterval === 0) {
      const percent = (i / totalSamples) * 100;
      updateProgress(percent);
    }
  }

  updateProgress(100);

  // Calculate statistics
  const leftMax = Math.max(...Array.from(leftChannel).map(Math.abs));
  const rightMax = Math.max(...Array.from(rightChannel).map(Math.abs));
  const leftNonZero = Array.from(leftChannel).filter(s => s !== 0).length;
  const rightNonZero = Array.from(rightChannel).filter(s => s !== 0).length;

  log(`✓ Generated ${totalSamples} samples`);
  log(`  Peak amplitude: L=${leftMax}, R=${rightMax}`);
  log(`  Non-zero: L=${leftNonZero}/${totalSamples}, R=${rightNonZero}/${totalSamples}`);

  return { left: leftChannel, right: rightChannel };
}

// === Step 7: Encode to WAV ===
function encodeWAV(leftChannel: Int16Array, rightChannel: Int16Array, sampleRate: number): ArrayBuffer {
  log('Step 7: Encoding to WAV format...');

  const numChannels = 2;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const numSamples = leftChannel.length;
  const dataSize = numSamples * blockAlign;

  // WAV file structure: RIFF header (12) + fmt chunk (24) + data chunk (8 + data)
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Helper to write string
  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  // fmt chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);          // Chunk size
  view.setUint16(20, 1, true);           // PCM format
  view.setUint16(22, numChannels, true); // Channels
  view.setUint32(24, sampleRate, true);  // Sample rate
  view.setUint32(28, sampleRate * blockAlign, true); // Byte rate
  view.setUint16(32, blockAlign, true);  // Block align
  view.setUint16(34, bitsPerSample, true); // Bits per sample

  // data chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Write interleaved samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    view.setInt16(offset, leftChannel[i], true);
    offset += 2;
    view.setInt16(offset, rightChannel[i], true);
    offset += 2;
  }

  log(`✓ WAV encoded`);
  log(`  File size: ${buffer.byteLength} bytes (${(buffer.byteLength / 1024).toFixed(1)} KB)`);

  return buffer;
}

// === Main Generation Function ===
async function generateWAV() {
  const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
  const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
  const successBox = document.getElementById('successBox');

  try {
    // Disable generate button
    if (generateBtn) generateBtn.disabled = true;
    if (downloadBtn) downloadBtn.style.display = 'none';
    if (successBox) successBox.classList.remove('active');

    updateStatus('generating', 'Generating WAV...');
    logs.length = 0; // Clear logs

    log('=== Starting WAV Generation ===');

    // Execute all steps
    await loadOPL3Library();
    createChip();
    initializeChip();
    loadPianoPatch();
    triggerNote();

    const { left, right } = generateSamples();
    const wavBuffer = encodeWAV(left, right, 49716);

    // Create Blob
    generatedBlob = new Blob([wavBuffer], { type: 'audio/wav' });

    log('');
    log('=== Generation Complete ===');
    log(`✅ WAV file ready for download`);
    log(`   Size: ${generatedBlob.size} bytes`);
    log(`   Expected: ~198,908 bytes`);

    const sizeDiff = Math.abs(generatedBlob.size - 198908);
    if (sizeDiff < 100) {
      log('   ✅ Size matches expected value!');
    } else {
      log(`   ⚠️  Size differs by ${sizeDiff} bytes`);
    }

    updateStatus('complete', 'Generation Complete!');
    hideProgress();

    if (downloadBtn) downloadBtn.style.display = 'inline-block';
    if (successBox) successBox.classList.add('active');

  } catch (error) {
    log('');
    log(`❌ Error: ${error}`);
    console.error('Generation failed:', error);
    updateStatus('error', `Error: ${(error as Error).message}`);
    hideProgress();
  } finally {
    if (generateBtn) generateBtn.disabled = false;
  }
}

// === Download Function ===
function downloadWAV() {
  if (!generatedBlob) {
    alert('No WAV file to download. Generate first!');
    return;
  }

  log('Downloading WAV file...');

  const url = URL.createObjectURL(generatedBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'prototype-1-single-tone.wav';
  link.click();

  URL.revokeObjectURL(url);

  log('✓ Download initiated');
}

// Make functions available globally
(window as any).generateWAV = generateWAV;
(window as any).downloadWAV = downloadWAV;

// Initial log
log('Ready to generate WAV file. Click "Generate WAV" to begin.');
