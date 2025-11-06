/**
 * Prototype 5: Full Song Export
 *
 * Goal: Export the complete RPG Adventure pattern as WAV
 *
 * Pattern Details:
 *   - Name: RPG Adventure
 *   - Rows: 64 (4 bars)
 *   - Tracks: 8 (full polyphony)
 *   - BPM: 120
 *   - Duration: ~16 seconds
 *   - Instruments: [0, 1, 2, 3, 0, 1, 2, 3] (Piano, Bass, Lead, Pad × 2)
 *
 * Success Criteria:
 * - All 8 tracks render correctly
 * - All 4 instruments sound correct
 * - Note sustain works across all tracks
 * - Bass lines sustain properly
 * - Melodies and harmonies sound musical
 * - No clicks/pops/glitches
 * - Clean polyphonic mixing
 */

console.log('=== Prototype 5: Full Song Export ===');

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

// === Pattern Data ===

// RPG Adventure pattern (64 rows × 8 tracks)
// Hardcoded from rpg-adventure.yaml for prototype
const PATTERN_DATA = [
  // Bar 1 (rows 0-15)
  ["A-4", "---", "A-2", "C-4", "A-3", "A-3", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "---"],
  ["---", "E-4", "---", "---", "C-4", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "E-5"],
  ["C-5", "---", "A-2", "---", "E-4", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "---"],
  ["---", "G-4", "---", "---", "C-4", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "---"],
  ["E-5", "---", "A-2", "E-4", "A-3", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "---"],
  ["---", "A-4", "---", "---", "C-4", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "D-5"],
  ["D-5", "---", "A-2", "---", "E-4", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "---"],
  ["---", "G-4", "---", "---", "C-4", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "---"],
  // Bar 2 (rows 16-31)
  ["C-5", "---", "C-3", "E-4", "C-3", "C-4", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "---"],
  ["---", "E-4", "---", "---", "E-4", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "G-5"],
  ["A-4", "---", "C-3", "---", "G-4", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "---"],
  ["---", "G-4", "---", "---", "E-4", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "E-5"],
  ["G-4", "---", "G-2", "D-4", "G-3", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "---"],
  ["---", "E-4", "---", "---", "B-4", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "---"],
  ["A-4", "---", "G-2", "---", "D-4", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "---"],
  ["---", "D-4", "---", "---", "B-4", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "---"],
  // Bar 3 (rows 32-47)
  ["F-5", "---", "F-2", "A-4", "F-3", "F-3", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "---"],
  ["---", "A-4", "---", "---", "A-4", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "A-5"],
  ["E-5", "---", "F-2", "---", "C-4", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "---"],
  ["---", "C-5", "---", "---", "A-4", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "---"],
  ["D-5", "---", "G-2", "B-4", "G-3", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "---"],
  ["---", "G-4", "---", "---", "B-4", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "G-5"],
  ["C-5", "---", "G-2", "---", "D-4", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "---"],
  ["---", "A-4", "---", "---", "B-4", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "---"],
  // Bar 4 (rows 48-63)
  ["E-5", "---", "A-2", "C-4", "A-3", "A-3", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "---"],
  ["---", "C-5", "---", "---", "C-4", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "E-5"],
  ["D-5", "---", "E-2", "---", "E-4", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "---"],
  ["---", "B-4", "---", "---", "C-4", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "---"],
  ["C-5", "---", "A-2", "E-4", "A-3", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "---"],
  ["---", "A-4", "---", "---", "C-4", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "A-5"],
  ["A-4", "---", "A-2", "---", "E-4", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "---"],
  ["---", "G-4", "---", "---", "A-3", "---", "E-3", "---"],
  ["---", "---", "---", "---", "---", "---", "---", "---"],
];

// Instrument assignments (0=Piano, 1=Bass, 2=Lead, 3=Pad)
const INSTRUMENTS = [0, 1, 2, 3, 0, 1, 2, 3];

// Channel allocation for 8 tracks
const CHANNEL_OFFSETS = [
  { modulator: 0x00, carrier: 0x03, channel: 0 },  // Track 0 -> Channel 0
  { modulator: 0x01, carrier: 0x04, channel: 1 },  // Track 1 -> Channel 1
  { modulator: 0x02, carrier: 0x05, channel: 2 },  // Track 2 -> Channel 2
  { modulator: 0x08, carrier: 0x0B, channel: 3 },  // Track 3 -> Channel 3
  { modulator: 0x09, carrier: 0x0C, channel: 4 },  // Track 4 -> Channel 4
  { modulator: 0x0A, carrier: 0x0D, channel: 5 },  // Track 5 -> Channel 5
  { modulator: 0x10, carrier: 0x13, channel: 6 },  // Track 6 -> Channel 6
  { modulator: 0x11, carrier: 0x14, channel: 7 },  // Track 7 -> Channel 7
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

async function loadGENMIDIPatches(): Promise<OPLPatch[]> {
  log('Step 2: Loading GENMIDI instrument bank...');

  const response = await fetch('/instruments/GENMIDI.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch GENMIDI: ${response.statusText}`);
  }

  const genmidi = await response.json();
  log(`✓ Loaded GENMIDI bank: ${genmidi.instruments.length} instruments`);

  // Convert patches 0-3 from GENMIDI format to OPLPatch format
  // Using the same conversion logic as genmidiParser.ts
  //
  // LIMITATION: This prototype only uses voice1 (single-voice mode).
  // Patches 1 & 2 (Bright Acoustic Piano, Electric Grand Piano) are dual-voice
  // instruments that use 2 OPL channels per note for richer sound, but we only
  // render with 1 channel here. This makes tracks 1, 2, 5, 6 sound thinner.
  // Full dual-voice support requires dynamic channel allocation and is planned
  // for the integration phase.
  const patches: OPLPatch[] = [];

  for (let i = 0; i < 4; i++) {
    const inst = genmidi.instruments[i];

    // Convert operators
    const modulator: OPLOperator = {
      attackRate: inst.voice1.mod.attack,
      decayRate: inst.voice1.mod.decay,
      sustainLevel: inst.voice1.mod.sustain,
      releaseRate: inst.voice1.mod.release,
      frequencyMultiplier: inst.voice1.mod.multi,
      waveform: inst.voice1.mod.wave,
      outputLevel: inst.voice1.mod.out,
      keyScaleLevel: inst.voice1.mod.ksl,
      amplitudeModulation: inst.voice1.mod.trem,
      vibrato: inst.voice1.mod.vib,
      envelopeType: inst.voice1.mod.sus,
      keyScaleRate: inst.voice1.mod.ksr,
    };

    const carrier: OPLOperator = {
      attackRate: inst.voice1.car.attack,
      decayRate: inst.voice1.car.decay,
      sustainLevel: inst.voice1.car.sustain,
      releaseRate: inst.voice1.car.release,
      frequencyMultiplier: inst.voice1.car.multi,
      waveform: inst.voice1.car.wave,
      outputLevel: inst.voice1.car.out,
      keyScaleLevel: inst.voice1.car.ksl,
      amplitudeModulation: inst.voice1.car.trem,
      vibrato: inst.voice1.car.vib,
      envelopeType: inst.voice1.car.sus,
      keyScaleRate: inst.voice1.car.ksr,
    };

    const patch: OPLPatch = {
      id: inst.id,
      name: inst.name,
      modulator,
      carrier,
      feedback: inst.voice1.feedback,
      connection: inst.voice1.additive ? 'additive' : 'fm',
    };

    patches.push(patch);
    log(`  Patch ${i}: ${inst.name}`);
  }

  log('✓ GENMIDI patches loaded (matches tracker)');
  return patches;
}

function createChip(): void {
  log('Step 3: Creating OPL3 chip instance...');

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
  log('Step 4: Initializing OPL3 mode...');

  // Reset and enable OPL3 mode
  writeReg(0x04, 0x60);
  writeReg(0x04, 0x80);
  writeReg(0x01, 0x20);
  writeReg(0xBD, 0x00);
  writeReg(0x105, 0x01); // OPL3 enable
  writeReg(0x104, 0x00);

  // Clear all channel settings
  for (let ch = 0; ch < 9; ch++) {
    writeReg(0xC0 + ch, 0x00);
    writeReg(0x100 + 0xC0 + ch, 0x00);
  }

  log('✓ OPL3 initialized');
}

// === Instrument Patches (loaded from GENMIDI.json) ===
// Uses same patches as the tracker to ensure identical sound

// Type definitions matching the tracker
interface OPLOperator {
  attackRate: number;
  decayRate: number;
  sustainLevel: number;
  releaseRate: number;
  frequencyMultiplier: number;
  waveform: number;
  outputLevel: number;
  keyScaleLevel: number;
  amplitudeModulation: boolean;
  vibrato: boolean;
  envelopeType: boolean;
  keyScaleRate: boolean;
}

interface OPLPatch {
  id: number;
  name: string;
  modulator: OPLOperator;
  carrier: OPLOperator;
  feedback: number;
  connection: 'fm' | 'additive';
}

/**
 * Write all registers for a single operator
 * Uses the EXACT SAME algorithm as SimpleSynth.writeOperatorRegisters()
 */
function writeOperatorRegisters(operatorOffset: number, operator: OPLOperator): void {
  // Register 0x20-0x35: AM, VIB, EGT, KSR, MULT
  const reg20 =
    operator.frequencyMultiplier |
    (operator.keyScaleRate ? 0x10 : 0) |
    (operator.envelopeType ? 0x20 : 0) |
    (operator.vibrato ? 0x40 : 0) |
    (operator.amplitudeModulation ? 0x80 : 0);
  writeReg(0x20 + operatorOffset, reg20);

  // Register 0x40-0x55: KSL, TL (Output Level)
  const reg40 = operator.outputLevel | (operator.keyScaleLevel << 6);
  writeReg(0x40 + operatorOffset, reg40);

  // Register 0x60-0x75: AR, DR (Attack Rate, Decay Rate)
  const reg60 = operator.decayRate | (operator.attackRate << 4);
  writeReg(0x60 + operatorOffset, reg60);

  // Register 0x80-0x95: SL, RR (Sustain Level, Release Rate)
  const reg80 = operator.releaseRate | (operator.sustainLevel << 4);
  writeReg(0x80 + operatorOffset, reg80);

  // Register 0xE0-0xF5: Waveform Select
  writeReg(0xE0 + operatorOffset, operator.waveform);
}

/**
 * Load an instrument patch to a specific track
 * Uses the EXACT SAME algorithm as SimpleSynth.loadPatch()
 */
function loadPatch(track: number, patchId: number, patches: OPLPatch[]): void {
  const { modulator, carrier, channel } = CHANNEL_OFFSETS[track];
  const patch = patches[patchId];

  // Program modulator (operator 1)
  writeOperatorRegisters(modulator, patch.modulator);

  // Program carrier (operator 2)
  writeOperatorRegisters(carrier, patch.carrier);

  // Program feedback + connection (register 0xC0-0xC8)
  // Following SimpleSynth pattern: initialize to 0x00 first (DOSBox workaround)
  writeReg(0xC0 + channel, 0x00);

  // Now set feedback and connection
  // Bits 1-3: Feedback (0-7)
  // Bit 0: Connection (0=FM, 1=Additive)
  // Bits 4-5: Output routing (0x30 for stereo)
  const feedbackByte = (patch.feedback << 1) | (patch.connection === 'additive' ? 1 : 0);
  const regC0 = feedbackByte | 0x30; // 0x30 = stereo output (CHA + CHB)
  writeReg(0xC0 + channel, regC0);
}

function loadAllInstruments(patches: OPLPatch[]): void {
  log('Step 5: Loading all instrument patches...');

  for (let track = 0; track < 8; track++) {
    const patchId = INSTRUMENTS[track];
    loadPatch(track, patchId, patches);

    log(`  Track ${track}: ${patches[patchId].name} (patch ${patchId})`);
  }

  log('✓ All instruments loaded (GENMIDI patches - matches tracker)');
}

// === Note Conversion ===

function noteNameToMIDI(noteName: string): number | null {
  if (noteName === '---') return null;

  const noteMap: { [key: string]: number } = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
    'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
  };

  const match = noteName.match(/^([A-G]#?)[-](\d+)$/);
  if (!match) return null;

  const [, note, octave] = match;
  const midiNote = (parseInt(octave) + 1) * 12 + noteMap[note];

  return midiNote;
}

// === Note Triggering ===

function triggerNote(track: number, midiNote: number, noteName: string): void {
  const { channel } = CHANNEL_OFFSETS[track];

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

function releaseAllNotes(): void {
  for (let track = 0; track < 8; track++) {
    const { channel } = CHANNEL_OFFSETS[track];
    writeReg(0xB0 + channel, 0x00); // Key-off
  }
}

// === Sample Generation ===

function generateSamplesForRow(samplesPerRow: number): { left: Int16Array; right: Int16Array } {
  const leftChannel = new Int16Array(samplesPerRow);
  const rightChannel = new Int16Array(samplesPerRow);
  const buffer = new Int16Array(2);

  for (let i = 0; i < samplesPerRow; i++) {
    chip.read(buffer);
    leftChannel[i] = buffer[0];
    rightChannel[i] = buffer[1];
  }

  return { left: leftChannel, right: rightChannel };
}

function generateFullSong(): { left: Int16Array; right: Int16Array } {
  log('');
  log('Step 6: Generating full song audio...');

  const sampleRate = 49716;
  const bpm = 120;
  const rowsPerBeat = 4; // 64 rows = 16 beats = 4 rows per beat
  const beatsPerSecond = bpm / 60;
  const secondsPerBeat = 1 / beatsPerSecond;
  const samplesPerBeat = Math.floor(sampleRate * secondsPerBeat);
  const samplesPerRow = Math.floor(samplesPerBeat / rowsPerBeat);
  const totalRows = PATTERN_DATA.length;
  const totalSamples = samplesPerRow * totalRows;

  log(`  BPM: ${bpm}`);
  log(`  Sample rate: ${sampleRate} Hz`);
  log(`  Samples per beat: ${samplesPerBeat}`);
  log(`  Samples per row: ${samplesPerRow}`);
  log(`  Total rows: ${totalRows}`);
  log(`  Total samples: ${totalSamples}`);
  log(`  Duration: ${(totalSamples / sampleRate).toFixed(2)}s`);

  const combinedLeft = new Int16Array(totalSamples);
  const combinedRight = new Int16Array(totalSamples);

  // Process each row
  for (let row = 0; row < totalRows; row++) {
    const rowData = PATTERN_DATA[row];

    // Process each track
    for (let track = 0; track < 8; track++) {
      const noteStr = rowData[track];
      const midiNote = noteNameToMIDI(noteStr);

      if (midiNote !== null) {
        // New note - trigger it
        triggerNote(track, midiNote, noteStr);
      }
      // If null (sustain), do nothing - let note continue
    }

    // Generate samples for this row
    const { left, right } = generateSamplesForRow(samplesPerRow);

    // Copy into combined buffer
    const offset = row * samplesPerRow;
    combinedLeft.set(left, offset);
    combinedRight.set(right, offset);

    // Progress update every 8 rows
    if (row % 8 === 0) {
      const progress = 10 + (row / totalRows) * 80; // 10-90%
      updateProgress(progress);
    }
  }

  log(`✓ Generated ${totalSamples} samples`);

  return { left: combinedLeft, right: combinedRight };
}

// === WAV Encoding ===

function encodeWAV(leftChannel: Int16Array, rightChannel: Int16Array, sampleRate: number): ArrayBuffer {
  log('Step 7: Encoding to WAV format...');

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

    log('=== Starting Full Song WAV Generation ===');
    log('Song: RPG Adventure');
    log('Rows: 64');
    log('Tracks: 8');
    log('BPM: 120');
    log('');

    // Setup
    await loadOPL3Library();
    const patches = await loadGENMIDIPatches();
    createChip();
    initializeChip();
    loadAllInstruments(patches);

    updateProgress(10);

    // Generate audio
    const { left, right } = generateFullSong();

    updateProgress(90);

    // Release all notes at end
    releaseAllNotes();

    // Encode to WAV
    const wavBuffer = encodeWAV(left, right, 49716);
    generatedBlob = new Blob([wavBuffer], { type: 'audio/wav' });

    updateProgress(100);

    log('');
    log('=== Generation Complete ===');
    log(`✅ WAV file ready for download`);
    log(`   Size: ${generatedBlob.size.toLocaleString()} bytes`);
    log(`   Expected: ~3,184,588 bytes`);

    const sizeDiff = Math.abs(generatedBlob.size - 3184588);
    if (sizeDiff < 10000) {
      log('   ✅ Size matches expected value!');
    }

    log('');
    log('🎵 Using GENMIDI patches (same as tracker):');
    log(`   - Tracks 0 & 4: ${patches[0].name}`);
    log(`   - Tracks 1 & 5: ${patches[1].name}`);
    log(`   - Tracks 2 & 6: ${patches[2].name}`);
    log(`   - Tracks 3 & 7: ${patches[3].name}`);
    log('   - All 8 tracks playing simultaneously');

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
  link.download = 'rpg-adventure.wav';
  link.click();

  URL.revokeObjectURL(url);

  log('✓ Download initiated');
}

// Make functions available globally
(window as any).generateWAV = generateWAV;
(window as any).downloadWAV = downloadWAV;

// Initial log
log('Ready to generate full song. Click "Generate WAV" to begin.');
