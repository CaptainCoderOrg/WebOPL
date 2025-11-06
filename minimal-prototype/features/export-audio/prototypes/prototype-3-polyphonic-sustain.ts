/**
 * Prototype 3: Polyphonic + Sustain
 *
 * Goal: Generate 4-second polyphonic audio with sustained notes
 *
 * Pattern (16 beats at 120 BPM = 4 seconds):
 *   Track 0 (Bass):  C-3 --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---  (sustained entire time)
 *   Track 1 (Piano): --- --- --- --- C-4 --- --- --- C-4 --- --- --- C-4 --- --- ---  (plays 3 times)
 *   Track 2 (Piano): --- --- --- --- E-4 --- --- --- E-4 --- --- --- E-4 --- --- ---
 *   Track 3 (Piano): --- --- --- --- G-4 --- --- --- G-4 --- --- --- G-4 --- --- ---
 *
 * Success Criteria:
 * - Bass note (C-3) sustains full 4 seconds WITHOUT retriggering
 * - First second: Bass solo
 * - Piano chord plays 3 times (beats 4, 8, 12) while bass continues
 * - All 4 notes audible simultaneously when piano plays
 * - Clean polyphonic mixing
 */

console.log('=== Prototype 3: Polyphonic + Sustain ===');

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

// MIDI notes: C-3=48, C-4=60, E-4=64, G-4=67
// null = sustain (do nothing)
const pattern = [
  [48, null, null, null],     // Beat 0: Bass starts, piano silent
  [null, null, null, null],   // Beat 1: Bass sustains
  [null, null, null, null],   // Beat 2: Bass sustains
  [null, null, null, null],   // Beat 3: Bass sustains
  [null, 60, 64, 67],         // Beat 4: Bass sustains, piano chord 1
  [null, null, null, null],   // Beat 5: All sustain
  [null, null, null, null],   // Beat 6: All sustain
  [null, null, null, null],   // Beat 7: All sustain
  [null, 60, 64, 67],         // Beat 8: Bass sustains, piano chord 2
  [null, null, null, null],   // Beat 9: All sustain
  [null, null, null, null],   // Beat 10: All sustain
  [null, null, null, null],   // Beat 11: All sustain
  [null, 60, 64, 67],         // Beat 12: Bass sustains, piano chord 3
  [null, null, null, null],   // Beat 13: All sustain
  [null, null, null, null],   // Beat 14: All sustain
  [null, null, null, null],   // Beat 15: All sustain
];

const trackNames = ['Bass (C-3)', 'Piano (C-4)', 'Piano (E-4)', 'Piano (G-4)'];
const trackInstruments = ['bass', 'piano', 'piano', 'piano'];

// OPL3 channel mapping for each track
const CHANNEL_OFFSETS = [
  { modulator: 0x00, carrier: 0x03, channel: 0 },  // Track 0 -> Channel 0
  { modulator: 0x01, carrier: 0x04, channel: 1 },  // Track 1 -> Channel 1
  { modulator: 0x02, carrier: 0x05, channel: 2 },  // Track 2 -> Channel 2
  { modulator: 0x08, carrier: 0x0B, channel: 3 },  // Track 3 -> Channel 3
];

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

function loadBassPatch(channelIndex: number): void {
  const { modulator, carrier, channel } = CHANNEL_OFFSETS[channelIndex];

  // Bass: Deep, punchy with sustain
  writeReg(0x20 + modulator, 0x21); // MULT=1, EGT=1 (sustaining)
  writeReg(0x40 + modulator, 0x08); // TL=8
  writeReg(0x60 + modulator, 0xF6); // AR=15, DR=6
  writeReg(0x80 + modulator, 0x34); // SL=3, RR=4
  writeReg(0xE0 + modulator, 0x00); // Sine wave

  writeReg(0x20 + carrier, 0x21);   // MULT=1, EGT=1
  writeReg(0x40 + carrier, 0x00);   // TL=0 (full volume)
  writeReg(0x60 + carrier, 0xF6);   // AR=15, DR=6
  writeReg(0x80 + carrier, 0x34);   // SL=3, RR=4
  writeReg(0xE0 + carrier, 0x01);   // Half-sine for warmth

  writeReg(0xC0 + channel, 0x00);
  writeReg(0xC0 + channel, 0x30 | (2 << 1)); // Feedback=2, FM, stereo
}

function loadPianoPatch(channelIndex: number): void {
  const { modulator, carrier, channel } = CHANNEL_OFFSETS[channelIndex];

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

  writeReg(0xC0 + channel, 0x00);
  writeReg(0xC0 + channel, 0x30 | (1 << 1)); // Feedback=1, FM, stereo
}

function loadInstrument(track: number, instrumentType: string): void {
  if (instrumentType === 'bass') {
    loadBassPatch(track);
  } else if (instrumentType === 'piano') {
    loadPianoPatch(track);
  }
}

// === Note Triggering ===

function triggerNote(track: number, midiNote: number, noteName: string): void {
  const { channel } = CHANNEL_OFFSETS[track];

  log(`  [Track ${track}] Triggering ${noteName} (MIDI ${midiNote}) on channel ${channel}`);

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

  log(`    Frequency: ${frequency.toFixed(2)} Hz, Block: ${block}, F-num: ${fnum}`);
}

function releaseNote(track: number): void {
  const { channel } = CHANNEL_OFFSETS[track];
  log(`  [Track ${track}] Releasing note on channel ${channel}`);
  writeReg(0xB0 + channel, 0x00); // Key-off
}

// === Sample Generation ===

function generateSamplesForBeat(beatIndex: number, samplesPerBeat: number): { left: Int16Array; right: Int16Array } {
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

    log('=== Starting Polyphonic WAV Generation ===');
    log('Pattern: 16 beats at 120 BPM = 4 seconds');
    log('Tracks: 4 (Bass + Piano chord)');
    log('');

    // Setup
    await loadOPL3Library();
    createChip();
    initializeChip();

    updateProgress(5);

    // Calculate timing
    const bpm = 120;
    const beatsPerSecond = bpm / 60;
    const secondsPerBeat = 1 / beatsPerSecond;
    const sampleRate = 49716;
    const samplesPerBeat = Math.floor(sampleRate * secondsPerBeat);
    const totalBeats = 16;
    const totalSamples = samplesPerBeat * totalBeats;

    log(`Step 4: Timing calculation`);
    log(`  BPM: ${bpm}`);
    log(`  Seconds per beat: ${secondsPerBeat.toFixed(3)}s`);
    log(`  Samples per beat: ${samplesPerBeat}`);
    log(`  Total beats: ${totalBeats}`);
    log(`  Total samples: ${totalSamples}`);
    log('');

    // Initialize all instruments once at the start
    log('Step 5: Loading instruments for all tracks...');
    for (let track = 0; track < 4; track++) {
      loadInstrument(track, trackInstruments[track]);
      log(`  ✓ Track ${track}: ${trackInstruments[track]} loaded on channel ${CHANNEL_OFFSETS[track].channel}`);
    }
    log('');

    updateProgress(10);

    // Allocate combined buffers
    const combinedLeft = new Int16Array(totalSamples);
    const combinedRight = new Int16Array(totalSamples);

    // Process each beat
    log('Step 6: Generating samples beat-by-beat...');
    for (let beat = 0; beat < totalBeats; beat++) {
      log(`Beat ${beat}:`);

      // Process each track
      for (let track = 0; track < 4; track++) {
        const note = pattern[beat][track];

        if (note !== null) {
          // New note - trigger it
          const noteName = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][note % 12] +
                          '-' + (Math.floor(note / 12) - 1);
          triggerNote(track, note, noteName);
        } else {
          // Sustain - do NOTHING (this is the critical test!)
          log(`  [Track ${track}] Sustaining (---) - no action`);
        }
      }

      // Generate samples for this beat
      const { left, right } = generateSamplesForBeat(beat, samplesPerBeat);

      // Copy into combined buffer
      const offset = beat * samplesPerBeat;
      combinedLeft.set(left, offset);
      combinedRight.set(right, offset);

      log(`  ✓ Generated ${samplesPerBeat} samples for beat ${beat}`);
      log('');

      updateProgress(10 + (beat + 1) * 10);
    }

    // Release all notes at end
    log('Step 7: Releasing all notes...');
    for (let track = 0; track < 4; track++) {
      releaseNote(track);
    }
    log('');

    updateProgress(90);

    // Encode to WAV
    const wavBuffer = encodeWAV(combinedLeft, combinedRight, sampleRate);
    generatedBlob = new Blob([wavBuffer], { type: 'audio/wav' });

    updateProgress(100);

    log('=== Generation Complete ===');
    log(`✅ WAV file ready for download`);
    log(`   Size: ${generatedBlob.size} bytes`);
    log(`   Expected: ~795,632 bytes`);

    const sizeDiff = Math.abs(generatedBlob.size - 795632);
    if (sizeDiff < 100) {
      log('   ✅ Size matches expected value!');
    }

    log('');
    log('🎵 CRITICAL TEST:');
    log('   - First second: Bass solo (C-3)');
    log('   - Piano chord plays 3 times (at 1s, 2s, 3s)');
    log('   - Bass should sustain smoothly WITHOUT retriggering!');

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
  link.download = 'prototype-3-polyphonic-sustain.wav';
  link.click();

  URL.revokeObjectURL(url);

  log('✓ Download initiated');
}

// Make functions available globally
(window as any).generateWAV = generateWAV;
(window as any).downloadWAV = downloadWAV;

// Initial log
log('Ready to generate polyphonic WAV file. Click \"Generate WAV\" to begin.');
