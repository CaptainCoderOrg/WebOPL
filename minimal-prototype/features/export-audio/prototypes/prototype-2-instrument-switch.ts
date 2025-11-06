/**
 * Prototype 2: Instrument Switch
 *
 * Goal: Generate 2-second audio with two different instruments
 * - Piano playing C-4 (0.0 - 1.0s)
 * - Celeste playing D-4 (1.0 - 2.0s)
 *
 * Success Criteria:
 * - First second sounds like piano (percussive attack)
 * - Second second sounds like celeste (bell-like, shimmering with vibrato)
 * - Clear pitch change (C to D)
 * - Smooth transition between instruments
 */

console.log('=== Prototype 2: Instrument Switch ===');

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

// === OPL3 Setup ===
async function loadOPL3Library(): Promise<void> {
  log('Step 1: Loading OPL3 library...');

  const response = await fetch('/node_modules/opl3/dist/opl3.js');
  if (!response.ok) {
    throw new Error(`Failed to fetch OPL3: ${response.statusText}`);
  }

  const opl3Code = await response.text();
  log(`✓ Fetched OPL3 code (${opl3Code.length} bytes)`);

  (0, eval)(opl3Code);

  if (typeof (globalThis as any).OPL3?.OPL3 === 'undefined') {
    throw new Error('OPL3 not available after loading');
  }

  log('✓ OPL3 library loaded successfully');
}

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

  writeReg(0x04, 0x60);
  writeReg(0x04, 0x80);
  writeReg(0x01, 0x20);
  writeReg(0xBD, 0x00);
  writeReg(0x105, 0x01);
  writeReg(0x104, 0x00);

  for (let ch = 0; ch < 9; ch++) {
    writeReg(0xC0 + ch, 0x00);
    writeReg(0x100 + 0xC0 + ch, 0x00);
  }

  log('✓ OPL3 initialized');
}

// === Instrument Patches ===

function loadPianoPatch(): void {
  log('Step 4a: Loading PIANO patch...');

  const modulator = 0x00;
  const carrier = 0x03;

  // Piano: percussive envelope, medium sustain
  writeReg(0x20 + modulator, 0x01); // MULT=1
  writeReg(0x40 + modulator, 0x10); // TL=16
  writeReg(0x60 + modulator, 0xF2); // AR=15, DR=2 (fast attack, fast decay)
  writeReg(0x80 + modulator, 0x74); // SL=7, RR=4 (medium sustain, medium release)
  writeReg(0xE0 + modulator, 0x00); // Sine wave

  writeReg(0x20 + carrier, 0x01);   // MULT=1
  writeReg(0x40 + carrier, 0x00);   // TL=0 (full volume)
  writeReg(0x60 + carrier, 0xF2);   // AR=15, DR=2
  writeReg(0x80 + carrier, 0x74);   // SL=7, RR=4
  writeReg(0xE0 + carrier, 0x00);   // Sine wave

  writeReg(0xC0, 0x00);
  writeReg(0xC0, 0x30 | (1 << 1)); // Feedback=1, FM mode, stereo

  log('✓ Piano patch loaded');
}

function loadCelestePatch(): void {
  log('Step 4b: Loading CELESTE patch...');

  const modulator = 0x00;
  const carrier = 0x03;

  // Celeste: bell-like with vibrato and shimmer
  // Modulator: vibrato + AM for shimmer effect
  writeReg(0x20 + modulator, 0xC1); // MULT=1, VIB=1, AM=1, EGT=1 (vibrato + tremolo)
  writeReg(0x40 + modulator, 0x08); // TL=8 (moderate modulation)
  writeReg(0x60 + modulator, 0xA4); // AR=10, DR=4 (slower attack)
  writeReg(0x80 + modulator, 0x45); // SL=4, RR=5 (medium sustain)
  writeReg(0xE0 + modulator, 0x02); // Abs-sine wave for shimmer

  // Carrier: high frequency multiplier for bell tone + vibrato
  writeReg(0x20 + carrier, 0xC4);   // MULT=4, VIB=1, AM=1 (4x freq for bell tone)
  writeReg(0x40 + carrier, 0x00);   // TL=0 (full volume)
  writeReg(0x60 + carrier, 0xA4);   // AR=10, DR=4 (slower attack)
  writeReg(0x80 + carrier, 0x45);   // SL=4, RR=5
  writeReg(0xE0 + carrier, 0x03);   // Pulse-sine wave for brightness

  writeReg(0xC0, 0x00);
  writeReg(0xC0, 0x30 | (3 << 1)); // Feedback=3, FM mode, stereo

  log('✓ Celeste patch loaded (bell-like with vibrato)');
}

// === Note Triggering ===

function triggerNote(midiNote: number, noteName: string): void {
  log(`Step 5: Triggering ${noteName} (MIDI ${midiNote})...`);

  const frequency = 440.0 * Math.pow(2, (midiNote - 69) / 12.0);
  const block = Math.max(0, Math.min(7, Math.floor(midiNote / 12) - 1));
  const fnum = Math.max(0, Math.min(1023,
    Math.round((frequency * Math.pow(2, 20 - block)) / 49716)
  ));

  log(`  Frequency: ${frequency.toFixed(2)} Hz`);
  log(`  Block: ${block}, F-num: ${fnum}`);

  // Write frequency
  writeReg(0xA0, fnum & 0xFF);
  const keyOnByte = 0x20 | ((block & 0x07) << 2) | ((fnum >> 8) & 0x03);
  writeReg(0xB0, keyOnByte);

  log(`✓ Note triggered`);
}

function releaseNote(): void {
  log('  Releasing note (key-off)...');
  writeReg(0xB0, 0x00); // Key-off
}

// === Sample Generation ===

function generateSamplesForSegment(duration: number, segmentName: string): { left: Int16Array; right: Int16Array } {
  const sampleRate = 49716;
  const totalSamples = Math.floor(sampleRate * duration);

  log(`  Generating ${totalSamples} samples for ${segmentName}...`);

  const leftChannel = new Int16Array(totalSamples);
  const rightChannel = new Int16Array(totalSamples);
  const buffer = new Int16Array(2);

  for (let i = 0; i < totalSamples; i++) {
    chip.read(buffer);
    leftChannel[i] = buffer[0];
    rightChannel[i] = buffer[1];
  }

  log(`  ✓ Generated ${totalSamples} samples`);

  return { left: leftChannel, right: rightChannel };
}

// === WAV Encoding ===

function encodeWAV(leftChannel: Int16Array, rightChannel: Int16Array, sampleRate: number): ArrayBuffer {
  log('Step 6: Encoding to WAV format...');

  const numChannels = 2;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const numSamples = leftChannel.length;
  const dataSize = numSamples * blockAlign;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

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
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

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

  log(`✓ WAV encoded (${buffer.byteLength} bytes)`);

  return buffer;
}

// === Main Generation ===

async function generateWAV() {
  const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
  const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
  const successBox = document.getElementById('successBox');

  try {
    if (generateBtn) generateBtn.disabled = true;
    if (downloadBtn) downloadBtn.style.display = 'none';
    if (successBox) successBox.classList.remove('active');

    updateStatus('generating', 'Generating WAV...');
    logs.length = 0;

    log('=== Starting WAV Generation ===');

    // Setup
    await loadOPL3Library();
    createChip();
    initializeChip();

    updateProgress(10);

    // === SEGMENT 1: Piano playing C-4 ===
    log('');
    log('=== SEGMENT 1: Piano (0.0 - 1.0s) ===');
    loadPianoPatch();
    triggerNote(60, 'C-4');
    const segment1 = generateSamplesForSegment(1.0, 'Piano segment');

    updateProgress(40);

    // Release piano note
    releaseNote();

    // === SEGMENT 2: Celeste playing D-4 ===
    log('');
    log('=== SEGMENT 2: Celeste (1.0 - 2.0s) ===');
    loadCelestePatch();
    triggerNote(62, 'D-4');
    const segment2 = generateSamplesForSegment(1.0, 'Celeste segment');

    updateProgress(70);

    // Release celeste note
    releaseNote();

    // === Combine segments ===
    log('');
    log('Step 7: Combining audio segments...');
    const totalSamples = segment1.left.length + segment2.left.length;
    const combinedLeft = new Int16Array(totalSamples);
    const combinedRight = new Int16Array(totalSamples);

    combinedLeft.set(segment1.left, 0);
    combinedLeft.set(segment2.left, segment1.left.length);

    combinedRight.set(segment1.right, 0);
    combinedRight.set(segment2.right, segment1.right.length);

    log(`✓ Combined ${totalSamples} samples`);

    updateProgress(80);

    // === Encode to WAV ===
    const wavBuffer = encodeWAV(combinedLeft, combinedRight, 49716);
    generatedBlob = new Blob([wavBuffer], { type: 'audio/wav' });

    updateProgress(100);

    log('');
    log('=== Generation Complete ===');
    log(`✅ WAV file ready for download`);
    log(`   Size: ${generatedBlob.size} bytes`);
    log(`   Expected: ~397,816 bytes`);

    const sizeDiff = Math.abs(generatedBlob.size - 397816);
    if (sizeDiff < 100) {
      log('   ✅ Size matches expected value!');
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

function downloadWAV() {
  if (!generatedBlob) {
    alert('No WAV file to download. Generate first!');
    return;
  }

  log('Downloading WAV file...');

  const url = URL.createObjectURL(generatedBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'prototype-2-instrument-switch.wav';
  link.click();

  URL.revokeObjectURL(url);

  log('✓ Download initiated');
}

// Make functions available globally
(window as any).generateWAV = generateWAV;
(window as any).downloadWAV = downloadWAV;

// Initial log
log('Ready to generate WAV file. Click "Generate WAV" to begin.');
