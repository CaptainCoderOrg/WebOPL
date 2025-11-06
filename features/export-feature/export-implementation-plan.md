# WAV Export Feature - Detailed Implementation Plan

## Overview

This document provides detailed implementation specifications for the WAV export feature, including exact class definitions, algorithms, state management, and code patterns.

## Architecture Decisions

### Code Reuse Strategy

**Reuse from SimplePlayer:**
- MIDI note conversion utilities
- Note parsing logic (parseNote)
- Active note tracking pattern

**Create New (Do NOT reuse SimplePlayer directly):**
- Separate OfflinePlayer class for offline context
- Different timing calculation (no setInterval)
- All notes scheduled upfront in offline context

**Reason:** OfflineAudioContext requires all audio to be scheduled before calling `startRendering()`. Real-time playback uses setInterval. These are fundamentally different approaches.

### Timing Calculation

```typescript
// Row duration in seconds
const rowDuration = 60.0 / bpm; // One beat = one row at 4/4 time

// Total pattern duration
const patternDuration = pattern.rows.length * rowDuration;

// Total export duration with loops
const totalDuration = patternDuration * loopCount;

// Time offset for specific row in specific loop
const timeOffset = (loopIteration * pattern.rows.length + rowIndex) * rowDuration;
```

## Phase 1: Core Infrastructure

### File 1: `src/features/export/types.ts`

```typescript
export interface ExportOptions {
  loopCount: number;        // 1-8, default 2
  fadeOutDuration: number;  // 0-5 seconds, default 2
  sampleRate: number;       // 22050, 44100, 48000, default 44100
}

export interface ExportProgress {
  phase: 'initializing' | 'scheduling' | 'rendering' | 'encoding' | 'complete' | 'error' | 'cancelled';
  progress: number;         // 0.0 to 1.0
  message: string;          // Human-readable status
  rowsScheduled?: number;   // For scheduling phase
  totalRows?: number;       // For scheduling phase
}

export interface ExportResult {
  blob: Blob;               // WAV file blob
  duration: number;         // Duration in seconds
  sampleRate: number;       // Sample rate used
  fileSize: number;         // Size in bytes
  filename: string;         // Suggested filename
}

export type ProgressCallback = (progress: ExportProgress) => void;
export type CancellationToken = { cancelled: boolean };
```

### File 2: `src/features/export/WavEncoder.ts`

```typescript
/**
 * Converts an AudioBuffer to WAV format (PCM 16-bit)
 * Based on standard RIFF WAV format specification
 */
export class WavEncoder {
  /**
   * Encode AudioBuffer to WAV Blob
   */
  static encode(audioBuffer: AudioBuffer): Blob {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;

    // Calculate sizes
    const dataSize = length * numberOfChannels * bytesPerSample;
    const bufferSize = 44 + dataSize; // 44 bytes for WAV header

    // Create buffer
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    // Write WAV header
    this.writeWavHeader(view, {
      numberOfChannels,
      sampleRate,
      bitsPerSample,
      dataSize
    });

    // Write audio data
    this.writeAudioData(view, audioBuffer, 44); // Start after header

    return new Blob([buffer], { type: 'audio/wav' });
  }

  /**
   * Write WAV file header (44 bytes)
   *
   * WAV Format:
   * Offset  Size  Description
   * 0       4     "RIFF" chunk descriptor
   * 4       4     File size - 8
   * 8       4     "WAVE" format
   * 12      4     "fmt " subchunk
   * 16      4     Subchunk size (16 for PCM)
   * 20      2     Audio format (1 = PCM)
   * 22      2     Number of channels
   * 24      4     Sample rate
   * 28      4     Byte rate (sampleRate * channels * bytesPerSample)
   * 32      2     Block align (channels * bytesPerSample)
   * 34      2     Bits per sample
   * 36      4     "data" subchunk
   * 40      4     Data size
   */
  private static writeWavHeader(
    view: DataView,
    params: {
      numberOfChannels: number;
      sampleRate: number;
      bitsPerSample: number;
      dataSize: number;
    }
  ): void {
    const { numberOfChannels, sampleRate, bitsPerSample, dataSize } = params;
    const bytesPerSample = bitsPerSample / 8;
    const byteRate = sampleRate * numberOfChannels * bytesPerSample;
    const blockAlign = numberOfChannels * bytesPerSample;

    // "RIFF" chunk descriptor
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true); // File size - 8
    this.writeString(view, 8, 'WAVE');

    // "fmt " subchunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);          // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true);           // AudioFormat (1 = PCM)
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // "data" subchunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
  }

  /**
   * Write audio sample data as 16-bit PCM
   * Interleaves channels: [L, R, L, R, ...]
   */
  private static writeAudioData(
    view: DataView,
    audioBuffer: AudioBuffer,
    offset: number
  ): void {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;

    // Get channel data
    const channels: Float32Array[] = [];
    for (let i = 0; i < numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }

    // Write interleaved samples
    let writeOffset = offset;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        // Convert float32 [-1, 1] to int16 [-32768, 32767]
        let sample = channels[channel][i];

        // Clamp to [-1, 1]
        sample = Math.max(-1, Math.min(1, sample));

        // Convert to 16-bit integer
        const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;

        view.setInt16(writeOffset, int16, true); // little-endian
        writeOffset += 2;
      }
    }
  }

  /**
   * Write ASCII string to DataView
   */
  private static writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }
}
```

### File 3: `src/features/export/OfflinePlayer.ts`

```typescript
import { Pattern } from '../../types/Pattern';
import { OPL3Synth } from '../../synth/OPL3Synth';

/**
 * Plays a pattern in an OfflineAudioContext by scheduling all notes upfront
 * Similar to SimplePlayer but for offline rendering
 */
export class OfflinePlayer {
  private synth: OPL3Synth;
  private context: OfflineAudioContext;
  private pattern: Pattern;
  private activeNotes: Map<number, number>; // trackIndex -> midiNote

  constructor(
    context: OfflineAudioContext,
    synth: OPL3Synth,
    pattern: Pattern
  ) {
    this.context = context;
    this.synth = synth;
    this.pattern = pattern;
    this.activeNotes = new Map();
  }

  /**
   * Schedule all notes in the pattern for offline rendering
   * Returns the number of rows scheduled (for progress tracking)
   */
  schedulePattern(
    loopCount: number,
    progressCallback?: (rowsScheduled: number, totalRows: number) => void,
    cancellationToken?: { cancelled: boolean }
  ): number {
    const rowDuration = 60.0 / this.pattern.bpm; // seconds per row
    const totalRows = this.pattern.rows.length * loopCount;
    let rowsScheduled = 0;

    // Schedule all loops
    for (let loop = 0; loop < loopCount; loop++) {
      // Reset active notes at start of each loop (except first)
      if (loop > 0) {
        this.activeNotes.clear();
      }

      // Schedule each row in this loop
      for (let rowIndex = 0; rowIndex < this.pattern.rows.length; rowIndex++) {
        // Check for cancellation
        if (cancellationToken?.cancelled) {
          return rowsScheduled;
        }

        const row = this.pattern.rows[rowIndex];
        const timeOffset = (loop * this.pattern.rows.length + rowIndex) * rowDuration;

        this.scheduleRow(row, rowIndex, timeOffset);

        rowsScheduled++;

        // Report progress periodically (every 16 rows to avoid excessive callbacks)
        if (rowsScheduled % 16 === 0 && progressCallback) {
          progressCallback(rowsScheduled, totalRows);
        }
      }
    }

    // Final progress update
    if (progressCallback) {
      progressCallback(rowsScheduled, totalRows);
    }

    return rowsScheduled;
  }

  /**
   * Schedule a single row's notes
   */
  private scheduleRow(row: string[], rowIndex: number, timeOffset: number): void {
    for (let trackIndex = 0; trackIndex < row.length; trackIndex++) {
      const cell = row[trackIndex];

      if (cell === '---') {
        // Sustain - do nothing, note continues
        continue;
      }

      if (cell === 'OFF') {
        // Note off
        const midiNote = this.activeNotes.get(trackIndex);
        if (midiNote !== undefined) {
          this.synth.noteOff(trackIndex, midiNote);
          this.activeNotes.delete(trackIndex);
        }
        continue;
      }

      // Parse note (e.g., "C-4", "A#5")
      const midiNote = this.parseNote(cell);
      if (midiNote === null) {
        continue; // Invalid note
      }

      // Stop previous note if any
      const previousNote = this.activeNotes.get(trackIndex);
      if (previousNote !== undefined) {
        this.synth.noteOff(trackIndex, previousNote);
      }

      // Start new note
      this.synth.noteOn(trackIndex, midiNote, 127); // Full velocity
      this.activeNotes.set(trackIndex, midiNote);
    }
  }

  /**
   * Parse note string to MIDI note number
   * Examples: "C-4" -> 60, "A#5" -> 82, "G-3" -> 55
   */
  private parseNote(noteStr: string): number | null {
    if (noteStr.length < 3) return null;

    const noteName = noteStr[0];
    const sharp = noteStr[1] === '#';
    const octaveStr = sharp ? noteStr.slice(2) : noteStr.slice(2);
    const octave = parseInt(octaveStr, 10);

    if (isNaN(octave)) return null;

    // Note name to semitone (C=0, D=2, E=4, F=5, G=7, A=9, B=11)
    const noteMap: { [key: string]: number } = {
      'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
    };

    const semitone = noteMap[noteName];
    if (semitone === undefined) return null;

    // MIDI note = octave * 12 + semitone + (sharp ? 1 : 0)
    // Middle C (C-4) = 60
    const midiNote = (octave + 1) * 12 + semitone + (sharp ? 1 : 0);

    return midiNote;
  }
}
```

### File 4: `src/features/export/PatternExporter.ts`

```typescript
import { Pattern } from '../../types/Pattern';
import { OPL3Synth } from '../../synth/OPL3Synth';
import { OfflinePlayer } from './OfflinePlayer';
import { WavEncoder } from './WavEncoder';
import {
  ExportOptions,
  ExportProgress,
  ExportResult,
  ProgressCallback,
  CancellationToken
} from './types';

/**
 * Orchestrates the pattern export process
 */
export class PatternExporter {
  /**
   * Export a pattern to WAV format
   * This is the main entry point for the export process
   */
  static async export(
    pattern: Pattern,
    options: ExportOptions,
    progressCallback: ProgressCallback,
    cancellationToken: CancellationToken
  ): Promise<ExportResult> {
    try {
      // Phase 1: Initialize (5% of progress)
      progressCallback({
        phase: 'initializing',
        progress: 0.0,
        message: 'Initializing audio context...'
      });

      if (cancellationToken.cancelled) {
        throw new Error('Export cancelled');
      }

      const { context, synth } = await this.initializeAudioContext(
        pattern,
        options
      );

      progressCallback({
        phase: 'initializing',
        progress: 0.05,
        message: 'Audio context initialized'
      });

      // Phase 2: Schedule notes (25% of progress)
      progressCallback({
        phase: 'scheduling',
        progress: 0.05,
        message: 'Scheduling notes...',
        rowsScheduled: 0,
        totalRows: pattern.rows.length * options.loopCount
      });

      const player = new OfflinePlayer(context, synth, pattern);

      const rowsScheduled = player.schedulePattern(
        options.loopCount,
        (scheduled, total) => {
          if (cancellationToken.cancelled) return;

          const schedulingProgress = 0.05 + (scheduled / total) * 0.20;
          progressCallback({
            phase: 'scheduling',
            progress: schedulingProgress,
            message: `Scheduling notes... ${scheduled}/${total} rows`,
            rowsScheduled: scheduled,
            totalRows: total
          });
        },
        cancellationToken
      );

      if (cancellationToken.cancelled) {
        throw new Error('Export cancelled');
      }

      progressCallback({
        phase: 'scheduling',
        progress: 0.25,
        message: `Scheduled ${rowsScheduled} rows`
      });

      // Phase 3: Render audio (65% of progress)
      progressCallback({
        phase: 'rendering',
        progress: 0.25,
        message: 'Rendering audio...'
      });

      const audioBuffer = await this.renderAudio(
        context,
        (renderProgress) => {
          if (cancellationToken.cancelled) return;

          const totalProgress = 0.25 + renderProgress * 0.65;
          progressCallback({
            phase: 'rendering',
            progress: totalProgress,
            message: `Rendering audio... ${Math.round(renderProgress * 100)}%`
          });
        },
        cancellationToken
      );

      if (cancellationToken.cancelled) {
        throw new Error('Export cancelled');
      }

      progressCallback({
        phase: 'rendering',
        progress: 0.90,
        message: 'Audio rendered'
      });

      // Apply fade out if requested
      if (options.fadeOutDuration > 0) {
        this.applyFadeOut(audioBuffer, options.fadeOutDuration);
      }

      // Phase 4: Encode WAV (10% of progress)
      progressCallback({
        phase: 'encoding',
        progress: 0.90,
        message: 'Encoding WAV file...'
      });

      const blob = WavEncoder.encode(audioBuffer);

      progressCallback({
        phase: 'complete',
        progress: 1.0,
        message: 'Export complete!'
      });

      // Create result
      const result: ExportResult = {
        blob,
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        fileSize: blob.size,
        filename: this.generateFilename(pattern)
      };

      return result;

    } catch (error) {
      if (cancellationToken.cancelled) {
        progressCallback({
          phase: 'cancelled',
          progress: 0,
          message: 'Export cancelled'
        });
        throw new Error('Export cancelled by user');
      } else {
        progressCallback({
          phase: 'error',
          progress: 0,
          message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
        throw error;
      }
    }
  }

  /**
   * Initialize OfflineAudioContext and OPL3Synth
   */
  private static async initializeAudioContext(
    pattern: Pattern,
    options: ExportOptions
  ): Promise<{ context: OfflineAudioContext; synth: OPL3Synth }> {
    // Calculate total duration
    const rowDuration = 60.0 / pattern.bpm;
    const patternDuration = pattern.rows.length * rowDuration;
    const totalDuration = patternDuration * options.loopCount + options.fadeOutDuration;

    // Create offline context
    const context = new OfflineAudioContext({
      numberOfChannels: 2,
      length: Math.ceil(totalDuration * options.sampleRate),
      sampleRate: options.sampleRate
    });

    // Create and initialize synth
    const synth = new OPL3Synth(context);
    await synth.init();

    // Load instruments
    for (let i = 0; i < pattern.instruments.length; i++) {
      synth.programChange(i, pattern.instruments[i]);
    }

    return { context, synth };
  }

  /**
   * Render the audio using OfflineAudioContext
   * Note: OfflineAudioContext.startRendering() doesn't support progress callbacks,
   * so we simulate progress based on expected duration
   */
  private static async renderAudio(
    context: OfflineAudioContext,
    progressCallback: (progress: number) => void,
    cancellationToken: CancellationToken
  ): Promise<AudioBuffer> {
    // Start rendering
    const renderPromise = context.startRendering();

    // Simulate progress (OfflineAudioContext doesn't provide real progress)
    const startTime = Date.now();
    const estimatedDuration = context.length / context.sampleRate;
    const estimatedRenderTime = estimatedDuration * 0.1; // Rough estimate: 10% of audio duration

    const progressInterval = setInterval(() => {
      if (cancellationToken.cancelled) {
        clearInterval(progressInterval);
        return;
      }

      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(0.99, elapsed / estimatedRenderTime);
      progressCallback(progress);
    }, 100);

    try {
      const audioBuffer = await renderPromise;
      clearInterval(progressInterval);
      progressCallback(1.0);
      return audioBuffer;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  }

  /**
   * Apply fade out to the end of the audio buffer
   */
  private static applyFadeOut(audioBuffer: AudioBuffer, fadeOutDuration: number): void {
    const sampleRate = audioBuffer.sampleRate;
    const fadeOutSamples = Math.floor(fadeOutDuration * sampleRate);
    const startSample = audioBuffer.length - fadeOutSamples;

    if (startSample < 0) return; // Fade duration longer than audio

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);

      for (let i = 0; i < fadeOutSamples; i++) {
        const sampleIndex = startSample + i;
        const gain = 1.0 - (i / fadeOutSamples); // Linear fade from 1.0 to 0.0
        channelData[sampleIndex] *= gain;
      }
    }
  }

  /**
   * Generate filename for the export
   */
  private static generateFilename(pattern: Pattern): string {
    const safeName = pattern.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `${safeName}-${timestamp}.wav`;
  }
}
```

## Phase 2: UI Components

### File 5: `src/features/export/ExportModal.tsx`

```typescript
import React, { useState } from 'react';
import { Pattern } from '../../types/Pattern';
import { PatternExporter } from './PatternExporter';
import {
  ExportOptions,
  ExportProgress,
  ExportResult,
  CancellationToken
} from './types';
import './ExportModal.css';

interface ExportModalProps {
  pattern: Pattern;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  pattern,
  isOpen,
  onClose
}) => {
  // Export options state
  const [loopCount, setLoopCount] = useState(2);
  const [fadeOutDuration, setFadeOutDuration] = useState(2);
  const [sampleRate, setSampleRate] = useState(44100);

  // Export process state
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cancellation token (mutable object shared with exporter)
  const [cancellationToken] = useState<CancellationToken>({ cancelled: false });

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsExporting(true);
    setProgress(null);
    setResult(null);
    setError(null);
    cancellationToken.cancelled = false;

    const options: ExportOptions = {
      loopCount,
      fadeOutDuration,
      sampleRate
    };

    try {
      const exportResult = await PatternExporter.export(
        pattern,
        options,
        (progressUpdate) => {
          setProgress(progressUpdate);
        },
        cancellationToken
      );

      setResult(exportResult);
      setIsExporting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsExporting(false);
    }
  };

  const handleCancel = () => {
    if (isExporting) {
      cancellationToken.cancelled = true;
      setIsExporting(false);
      setProgress(null);
    }
  };

  const handleClose = () => {
    handleCancel();
    onClose();
  };

  const handleDownload = () => {
    if (!result) return;

    const url = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="export-modal-backdrop" onClick={handleClose}>
      <div className="export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="export-modal-header">
          <h2>Export Pattern to WAV</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <div className="export-modal-body">
          {/* Export Options */}
          {!isExporting && !result && (
            <div className="export-options">
              <p className="export-description">
                Export "{pattern.name}" as a WAV audio file. Configure your export settings below.
              </p>

              <div className="option-group">
                <label>
                  Loop Count: {loopCount}
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={loopCount}
                    onChange={(e) => setLoopCount(Number(e.target.value))}
                  />
                </label>
              </div>

              <div className="option-group">
                <label>
                  Fade Out: {fadeOutDuration}s
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.5"
                    value={fadeOutDuration}
                    onChange={(e) => setFadeOutDuration(Number(e.target.value))}
                  />
                </label>
              </div>

              <div className="option-group">
                <label>
                  Sample Rate:
                  <select
                    value={sampleRate}
                    onChange={(e) => setSampleRate(Number(e.target.value))}
                  >
                    <option value="22050">22050 Hz</option>
                    <option value="44100">44100 Hz</option>
                    <option value="48000">48000 Hz</option>
                  </select>
                </label>
              </div>

              <div className="export-info">
                <p>Estimated duration: {formatDuration((pattern.rows.length * 60 / pattern.bpm) * loopCount)}</p>
              </div>
            </div>
          )}

          {/* Progress */}
          {isExporting && progress && (
            <div className="export-progress">
              <p className="progress-message">{progress.message}</p>
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${progress.progress * 100}%` }}
                />
              </div>
              <p className="progress-percentage">
                {Math.round(progress.progress * 100)}%
              </p>
              {progress.rowsScheduled !== undefined && progress.totalRows !== undefined && (
                <p className="progress-detail">
                  Rows: {progress.rowsScheduled} / {progress.totalRows}
                </p>
              )}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="export-result">
              <div className="success-icon">✓</div>
              <h3>Export Complete!</h3>
              <div className="result-info">
                <p>Duration: {formatDuration(result.duration)}</p>
                <p>Sample Rate: {result.sampleRate} Hz</p>
                <p>File Size: {formatFileSize(result.fileSize)}</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="export-error">
              <p className="error-message">{error}</p>
            </div>
          )}
        </div>

        <div className="export-modal-footer">
          <button
            className="cancel-button"
            onClick={handleClose}
          >
            {result ? 'Close' : 'Cancel'}
          </button>

          {!result && (
            <button
              className="generate-button"
              onClick={handleGenerate}
              disabled={isExporting}
            >
              {isExporting ? 'Generating...' : 'Generate WAV'}
            </button>
          )}

          {result && (
            <button
              className="download-button"
              onClick={handleDownload}
            >
              Download
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
```

### File 6: `src/features/export/ExportModal.css`

```css
.export-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.export-modal {
  background-color: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  color: #fff;
}

.export-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #333;
}

.export-modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-button {
  background: none;
  border: none;
  color: #888;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
}

.close-button:hover {
  color: #fff;
}

.export-modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.export-description {
  color: #ccc;
  margin-bottom: 20px;
  line-height: 1.5;
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-group label {
  color: #fff;
  font-weight: 500;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-group input[type="range"] {
  width: 100%;
}

.option-group select {
  background-color: #2a2a2a;
  border: 1px solid #444;
  color: #fff;
  padding: 8px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
}

.export-info {
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 12px;
  color: #ccc;
}

.export-progress {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  padding: 20px 0;
}

.progress-message {
  color: #fff;
  font-weight: 500;
}

.progress-bar-container {
  width: 100%;
  height: 24px;
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #4a9eff, #6bb6ff);
  transition: width 0.2s ease;
}

.progress-percentage {
  color: #4a9eff;
  font-weight: 600;
  font-size: 18px;
}

.progress-detail {
  color: #888;
  font-size: 14px;
}

.export-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 20px 0;
}

.success-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: #4caf50;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: #fff;
  font-weight: bold;
}

.export-result h3 {
  margin: 0;
  color: #4caf50;
  font-size: 20px;
}

.result-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: center;
}

.result-info p {
  margin: 0;
  color: #ccc;
}

.export-error {
  padding: 16px;
  background-color: #3a1a1a;
  border: 1px solid #aa0000;
  border-radius: 4px;
}

.error-message {
  color: #ff6666;
  margin: 0;
}

.export-modal-footer {
  padding: 20px;
  border-top: 1px solid #333;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.export-modal-footer button {
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  font-family: 'Courier New', monospace;
}

.cancel-button {
  background-color: #2a2a2a;
  color: #fff;
  border: 1px solid #444;
}

.cancel-button:hover {
  background-color: #333;
}

.generate-button {
  background-color: #4a9eff;
  color: #fff;
}

.generate-button:hover:not(:disabled) {
  background-color: #6bb6ff;
}

.generate-button:disabled {
  background-color: #2a2a2a;
  color: #666;
  cursor: not-allowed;
}

.download-button {
  background-color: #4caf50;
  color: #fff;
}

.download-button:hover {
  background-color: #66bb6a;
}
```

### File 7: `src/features/export/index.ts`

```typescript
export { ExportModal } from './ExportModal';
export { PatternExporter } from './PatternExporter';
export { WavEncoder } from './WavEncoder';
export { OfflinePlayer } from './OfflinePlayer';
export type {
  ExportOptions,
  ExportProgress,
  ExportResult,
  ProgressCallback,
  CancellationToken
} from './types';
```

## Phase 3: Integration

### Modify `src/pages/TrackerPage.tsx`

Add export button and modal:

```typescript
import { ExportModal } from '../features/export';

// Inside TrackerPage component:
const [isExportModalOpen, setIsExportModalOpen] = useState(false);

// In the JSX, add button to controls:
<button onClick={() => setIsExportModalOpen(true)}>
  Export
</button>

// At the end of JSX:
<ExportModal
  pattern={pattern}
  isOpen={isExportModalOpen}
  onClose={() => setIsExportModalOpen(false)}
/>
```

## Testing Checklist

### Unit Tests
- [ ] WavEncoder produces valid WAV headers
- [ ] OfflinePlayer.parseNote() handles all note formats
- [ ] Progress calculation is accurate
- [ ] Fade out applies correctly

### Integration Tests
- [ ] Export 16-row pattern (fast)
- [ ] Export 128-row pattern (slow)
- [ ] Export with 1 loop
- [ ] Export with 8 loops
- [ ] Export with no fade out
- [ ] Export with 5s fade out
- [ ] Export at 22050 Hz
- [ ] Export at 44100 Hz
- [ ] Export at 48000 Hz
- [ ] Cancel during scheduling phase
- [ ] Cancel during rendering phase
- [ ] Close modal during export
- [ ] Generate, download, generate again
- [ ] All instrument types export correctly

### Browser Tests
- [ ] Chrome
- [ ] Firefox
- [ ] Edge
- [ ] Safari

## Known Limitations

1. **No real-time rendering progress**: OfflineAudioContext.startRendering() doesn't provide progress callbacks, so we estimate progress based on time
2. **Memory usage**: Large exports (many loops, high sample rate) can use significant memory
3. **UI blocking during encoding**: WAV encoding is synchronous and may briefly block UI for very large files
4. **Cancellation granularity**: Cancellation only checks between scheduling chunks and before rendering

## Future Improvements

1. Use Web Workers for WAV encoding to avoid UI blocking
2. Add preview playback before export
3. Support batch export of multiple patterns
4. Add MP3/OGG export options
5. Add normalization/compression options
6. Save export presets
