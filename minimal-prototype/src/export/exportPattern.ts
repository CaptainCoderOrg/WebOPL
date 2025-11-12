/**
 * exportPattern - Main export functions for WAV export
 *
 * Provides two export modes:
 * 1. Standard Export - Direct rendering with optional fade in/out
 * 2. Seamless Loop Export - Context-aware rendering for perfect loops
 */

import type { OPLPatch } from '../types/OPLPatch';
import { PatternRenderer } from './PatternRenderer';
import { SimpleSynth } from '../SimpleSynth';
import { DirectOPLChip } from '../adapters/DirectOPLChip';
import { WAVEncoder } from '../utils/WAVEncoder';
import { loadOPL3Library } from '../utils/opl3Loader';

const SAMPLE_RATE = 49716; // OPL3 native sample rate

export interface ExportOptions {
  /** Pattern name (for filename) */
  patternName: string;

  /** Pattern data (2D array of cell strings) */
  pattern: string[][];

  /** Track instrument assignments */
  trackInstruments: number[];

  /** Instrument bank */
  instrumentBank: OPLPatch[];

  /** Beats per minute */
  bpm: number;

  /** Number of times to repeat the pattern */
  loopCount: number;

  /** Progress callback (0-100) */
  onProgress?: (progress: number, message: string) => void;

  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
}

export interface StandardExportOptions extends ExportOptions {
  /** Fade in enabled */
  fadeIn: boolean;

  /** Fade in duration in milliseconds */
  fadeInDuration: number;

  /** Fade out enabled */
  fadeOut: boolean;

  /** Fade out duration in milliseconds */
  fadeOutDuration: number;
}

export interface SeamlessLoopExportOptions extends ExportOptions {
  /** Number of context rows for seamless loop rendering */
  contextRows: number;
}

/**
 * Render pattern to audio buffers
 */
async function renderPatternToBuffers(
  pattern: string[][],
  trackInstruments: number[],
  instrumentBank: OPLPatch[],
  bpm: number,
  loopCount: number,
  onProgress?: (progress: number, message: string) => void,
  abortSignal?: AbortSignal
): Promise<{ left: Int16Array; right: Int16Array }> {
  // Report progress
  onProgress?.(0, 'Initializing OPL3...');

  // Load OPL3
  const OPL3Class = await loadOPL3Library();
  const chip = new OPL3Class();

  // Reset OPL3
  chip.write(0, 0x01, 0x20); // Enable waveform selection
  chip.write(0, 0x08, 0x00); // Disable CSW/note-sel
  chip.write(1, 0x05, 0x01); // Enable OPL3 mode

  // Reset all channels
  for (let ch = 0; ch < 18; ch++) {
    chip.write(0, 0xB0 + ch, 0x00);
    chip.write(1, 0xB0 + ch, 0x00);
    chip.write(0, 0xC0 + ch, 0x00);
    chip.write(1, 0xC0 + ch, 0x00);
  }

  // Create adapter and synth
  const directChip = new DirectOPLChip(chip);
  const synth = new SimpleSynth();
  await synth.init(directChip);

  onProgress?.(10, 'Loading instruments...');

  // Load percussion map for Percussion Kit support
  synth.loadPercussionMap(instrumentBank);
  console.log('[exportPattern] Percussion map loaded');

  // Load patches for each track
  for (let trackIndex = 0; trackIndex < trackInstruments.length; trackIndex++) {
    const patchIndex = trackInstruments[trackIndex];
    const patch = instrumentBank[patchIndex];
    if (patch) {
      synth.setTrackPatch(trackIndex, patch);
      console.log(`[exportPattern] Track ${trackIndex} → Patch ${patchIndex}: ${patch.name}`);
    }
  }

  onProgress?.(20, 'Processing pattern...');

  // Create a repeated pattern if loopCount > 1
  let fullPattern = pattern;
  if (loopCount > 1) {
    fullPattern = [];
    for (let i = 0; i < loopCount; i++) {
      fullPattern.push(...pattern);
    }
  }

  // Convert to renderable pattern
  const renderablePattern = {
    name: 'export',
    pattern: fullPattern,
    instruments: trackInstruments,
    bpm,
    rowsPerBeat: 4,
  };

  // Render to timeline
  const timeline = PatternRenderer.render(renderablePattern);
  const totalSamples = Math.ceil(timeline.duration * SAMPLE_RATE);

  onProgress?.(30, 'Rendering audio...');

  // Allocate buffers
  const leftChannel = new Int16Array(totalSamples);
  const rightChannel = new Int16Array(totalSamples);

  // Render samples
  let eventIndex = 0;
  const sampleBuffer = new Int16Array(2);
  const yieldInterval = SAMPLE_RATE; // Yield every 1 second of audio

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

    // Yield to browser and report progress periodically
    if (sampleIndex % yieldInterval === 0) {
      // Check if export was cancelled
      if (abortSignal?.aborted) {
        throw new Error('Export cancelled');
      }

      // Report progress every time we yield
      const progress = 30 + Math.floor((sampleIndex / totalSamples) * 60);
      onProgress?.(progress, 'Rendering audio...');

      // Yield control to browser to update UI
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  onProgress?.(90, 'Processing complete');

  return { left: leftChannel, right: rightChannel };
}

/**
 * Find where actual audio content ends (before trailing silence)
 * Scans backwards to find the last sample above a threshold
 */
function findAudioEndPoint(
  left: Int16Array,
  right: Int16Array,
  thresholdDb: number = -60
): number {
  const threshold = Math.pow(10, thresholdDb / 20) * 32767;

  // Scan backwards from the end
  for (let i = left.length - 1; i >= 0; i--) {
    const absLeft = Math.abs(left[i]);
    const absRight = Math.abs(right[i]);

    if (absLeft > threshold || absRight > threshold) {
      // Add a small buffer after the last audio (0.1 seconds)
      return Math.min(i + Math.floor(0.1 * SAMPLE_RATE), left.length);
    }
  }

  // If everything is silent, return the full length
  return left.length;
}

/**
 * Download WAV file
 */
export function downloadWAV(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export pattern as standard WAV
 * Note: Fades are now applied as post-processing in the UI
 */
export async function exportStandard(options: StandardExportOptions): Promise<ArrayBuffer> {
  const {
    patternName: _patternName,
    pattern,
    trackInstruments,
    instrumentBank,
    bpm,
    loopCount,
    fadeIn: _fadeIn,
    fadeInDuration: _fadeInDuration,
    fadeOut: _fadeOut,
    fadeOutDuration: _fadeOutDuration,
    onProgress,
  } = options;

  // Render pattern
  const buffers = await renderPatternToBuffers(
    pattern,
    trackInstruments,
    instrumentBank,
    bpm,
    loopCount,
    onProgress,
    options.abortSignal
  );

  // Trim trailing silence
  onProgress?.(92, 'Trimming silence...');
  const audioEnd = findAudioEndPoint(buffers.left, buffers.right);
  const trimmedLeft = buffers.left.slice(0, audioEnd);
  const trimmedRight = buffers.right.slice(0, audioEnd);

  // Encode to WAV
  onProgress?.(97, 'Encoding WAV...');
  const wavBuffer = WAVEncoder.encode(trimmedLeft, trimmedRight, SAMPLE_RATE);

  onProgress?.(100, 'Complete!');

  return wavBuffer;
}

/**
 * Export pattern as seamless loop
 */
export async function exportSeamlessLoop(options: SeamlessLoopExportOptions): Promise<ArrayBuffer> {
  const {
    patternName: _patternName,
    pattern,
    trackInstruments,
    instrumentBank,
    bpm,
    loopCount,
    contextRows,
    onProgress,
  } = options;

  onProgress?.(0, 'Preparing seamless loop...');

  // Create context-aware pattern: [last N rows | pattern | first N rows]
  const leadInRows = pattern.slice(-contextRows);
  const leadOutRows = pattern.slice(0, contextRows);
  const extendedPattern = [...leadInRows, ...pattern, ...leadOutRows];

  onProgress?.(5, 'Rendering with context...');

  // Render extended pattern once
  const buffers = await renderPatternToBuffers(
    extendedPattern,
    trackInstruments,
    instrumentBank,
    bpm,
    1, // Render once with context
    (progress, message) => {
      // Scale progress to 5-85%
      onProgress?.(5 + Math.floor(progress * 0.8), message);
    },
    options.abortSignal
  );

  onProgress?.(85, 'Extracting core loop...');

  // Calculate sample positions
  const originalRows = pattern.length;
  const rowsPerBeat = 4;
  const secondsPerRow = 60 / (bpm * rowsPerBeat);
  const leadInSamples = Math.floor(contextRows * secondsPerRow * SAMPLE_RATE);
  const coreSamples = Math.floor(originalRows * secondsPerRow * SAMPLE_RATE);

  // Extract core loop (excluding context)
  const coreLeft = buffers.left.slice(leadInSamples, leadInSamples + coreSamples);
  const coreRight = buffers.right.slice(leadInSamples, leadInSamples + coreSamples);

  // If loopCount > 1, repeat the core
  let finalLeft = coreLeft;
  let finalRight = coreRight;

  if (loopCount > 1) {
    onProgress?.(90, `Repeating loop ${loopCount} times...`);
    finalLeft = new Int16Array(coreLeft.length * loopCount);
    finalRight = new Int16Array(coreRight.length * loopCount);

    for (let i = 0; i < loopCount; i++) {
      finalLeft.set(coreLeft, i * coreLeft.length);
      finalRight.set(coreRight, i * coreRight.length);
    }
  }

  // Encode to WAV
  onProgress?.(95, 'Encoding WAV...');
  const wavBuffer = WAVEncoder.encode(finalLeft, finalRight, SAMPLE_RATE);

  onProgress?.(100, 'Complete!');

  return wavBuffer;
}
