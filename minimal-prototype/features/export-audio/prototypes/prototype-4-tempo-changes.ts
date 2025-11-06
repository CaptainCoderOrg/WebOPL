/**
 * Prototype 4: Tempo Changes
 *
 * Goal: Generate audio with the same pattern at different BPMs
 *
 * Pattern (4 beats):
 *   C-4 --- E-4 ---
 *
 * Played at three tempos:
 *   Section 1: 60 BPM (slow) - 4 seconds
 *   Section 2: 120 BPM (medium) - 2 seconds
 *   Section 3: 180 BPM (fast) - 1.33 seconds
 *
 * Success Criteria:
 * - Same musical phrase played at three different speeds
 * - BPM timing calculations accurate
 * - Smooth transitions between tempo sections
 */

console.log('=== Prototype 4: Tempo Changes ===');

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

// === Pattern Definition ===

// Simple 4-beat pattern: C-4 --- E-4 ---
// MIDI: C-4=60, E-4=64
// null = sustain (do nothing)
const pattern = [60, null, 64, null];

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

// === Instrument Patch ===

function loadPianoPatch(): void {
  log('Step 4: Loading piano patch...');

  const modulator = 0x00;
  const carrier = 0x03;

  // Piano: Percussive with decay
  writeReg(0x20 + modulator, 0x01); // MULT=1
  writeReg(0x40 + modulator, 0x10); // TL=16
  writeReg(0x60 + modulator, 0xF2); // AR=15, DR=2
  writeReg(0x80 + modulator, 0x74); // SL=7, RR=4
  writeReg(0xE0 + modulator, 0x00); // Sine wave

  writeReg(0x20 + carrier, 0x01);   // MULT=1
  writeReg(0x40 + carrier, 0x00);   // TL=0 (full volume)
  writeReg(0x60 + carrier, 0xF2);   // AR=15, DR=2
  writeReg(0x80 + carrier, 0x74);   // SL=7, RR=4
  writeReg(0xE0 + carrier, 0x00);   // Sine wave

  writeReg(0xC0, 0x00);
  writeReg(0xC0, 0x30 | (1 << 1)); // Feedback=1, FM, stereo

  log('✓ Piano patch loaded');
}

// === Note Triggering ===

function triggerNote(midiNote: number, noteName: string): void {
  const channel = 0;

  log(`  Triggering ${noteName} (MIDI ${midiNote})`);

  const frequency = 440.0 * Math.pow(2, (midiNote - 69) / 12.0);
  const block = Math.max(0, Math.min(7, Math.floor(midiNote / 12) - 1));
  const fnum = Math.max(0, Math.min(1023,
    Math.round((frequency * Math.pow(2, 20 - block)) / 49716)
  ));

  // Key-off first (to retrigger envelope if already playing)
  writeReg(0xB0 + channel, 0x00);

  // Write frequency
  writeReg(0xA0 + channel, fnum & 0xFF);

  // Key-on (bit 5 set)
  const keyOnByte = 0x20 | ((block & 0x07) << 2) | ((fnum >> 8) & 0x03);
  writeReg(0xB0 + channel, keyOnByte);
}

function releaseNote(): void {
  const channel = 0;
  writeReg(0xB0 + channel, 0x00); // Key-off
}

// === Sample Generation ===

function generateSamplesForBeat(samplesPerBeat: number): { left: Int16Array; right: Int16Array } {
  const leftChannel = new Int16Array(samplesPerBeat);
  const rightChannel = new Int16Array(samplesPerBeat);
  const buffer = new Int16Array(2);

  for (let i = 0; i < samplesPerBeat; i++) {
    chip.read(buffer);
    leftChannel[i] = buffer[0];
    rightChannel[i] = buffer[1];
  }

  return { left: leftChannel, right: rightChannel };
}

function generatePatternAtBPM(bpm: number, sectionName: string): { left: Int16Array; right: Int16Array } {
  log('');
  log(`=== ${sectionName}: ${bpm} BPM ===`);

  const sampleRate = 49716;
  const beatsPerSecond = bpm / 60;
  const secondsPerBeat = 1 / beatsPerSecond;
  const samplesPerBeat = Math.floor(sampleRate * secondsPerBeat);
  const totalBeats = pattern.length;
  const totalSamples = samplesPerBeat * totalBeats;

  log(`  Seconds per beat: ${secondsPerBeat.toFixed(3)}s`);
  log(`  Samples per beat: ${samplesPerBeat}`);
  log(`  Total duration: ${(totalBeats * secondsPerBeat).toFixed(2)}s`);

  const combinedLeft = new Int16Array(totalSamples);
  const combinedRight = new Int16Array(totalSamples);

  // Process each beat
  for (let beat = 0; beat < totalBeats; beat++) {
    const note = pattern[beat];

    if (note !== null) {
      // New note - trigger it
      const noteName = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][note % 12] +
                      '-' + (Math.floor(note / 12) - 1);
      log(`Beat ${beat}: ${noteName}`);
      triggerNote(note, noteName);
    } else {
      // Sustain - do NOTHING
      log(`Beat ${beat}: --- (sustain)`);
    }

    // Generate samples for this beat
    const { left, right } = generateSamplesForBeat(samplesPerBeat);

    // Copy into combined buffer
    const offset = beat * samplesPerBeat;
    combinedLeft.set(left, offset);
    combinedRight.set(right, offset);
  }

  log(`✓ Generated ${totalSamples} samples for ${sectionName}`);

  return { left: combinedLeft, right: combinedRight };
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

    log('=== Starting Tempo Changes WAV Generation ===');
    log('Pattern: C-4 --- E-4 ---');
    log('Tempos: 60 BPM → 120 BPM → 180 BPM');
    log('');

    // Setup
    await loadOPL3Library();
    createChip();
    initializeChip();
    loadPianoPatch();

    updateProgress(10);

    // Generate section 1: 60 BPM
    const section1 = generatePatternAtBPM(60, 'Section 1');
    updateProgress(30);

    // Generate section 2: 120 BPM
    const section2 = generatePatternAtBPM(120, 'Section 2');
    updateProgress(60);

    // Generate section 3: 180 BPM
    const section3 = generatePatternAtBPM(180, 'Section 3');
    updateProgress(80);

    // Release note at end
    releaseNote();

    // Combine all sections
    log('');
    log('Step 5: Combining all tempo sections...');
    const totalSamples = section1.left.length + section2.left.length + section3.left.length;
    const combinedLeft = new Int16Array(totalSamples);
    const combinedRight = new Int16Array(totalSamples);

    let offset = 0;
    combinedLeft.set(section1.left, offset);
    combinedRight.set(section1.right, offset);
    offset += section1.left.length;

    combinedLeft.set(section2.left, offset);
    combinedRight.set(section2.right, offset);
    offset += section2.left.length;

    combinedLeft.set(section3.left, offset);
    combinedRight.set(section3.right, offset);

    log(`✓ Combined ${totalSamples} samples from all sections`);

    updateProgress(90);

    // Encode to WAV
    const wavBuffer = encodeWAV(combinedLeft, combinedRight, 49716);
    generatedBlob = new Blob([wavBuffer], { type: 'audio/wav' });

    updateProgress(100);

    log('');
    log('=== Generation Complete ===');
    log(`✅ WAV file ready for download`);
    log(`   Size: ${generatedBlob.size} bytes`);
    log(`   Expected: ~1,457,132 bytes`);

    const sizeDiff = Math.abs(generatedBlob.size - 1457132);
    if (sizeDiff < 1000) {
      log('   ✅ Size matches expected value!');
    }

    log('');
    log('🎵 Listen for the pattern speeding up:');
    log('   - Section 1: Slow (60 BPM)');
    log('   - Section 2: Medium (120 BPM)');
    log('   - Section 3: Fast (180 BPM)');

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
  link.download = 'prototype-4-tempo-changes.wav';
  link.click();

  URL.revokeObjectURL(url);

  log('✓ Download initiated');
}

// Make functions available globally
(window as any).generateWAV = generateWAV;
(window as any).downloadWAV = downloadWAV;

// Initial log
log('Ready to generate WAV file. Click "Generate WAV" to begin.');
