/**
 * SimplePlayer - Basic tracker pattern playback engine
 *
 * Plays tracker patterns using simple setTimeout scheduling.
 * Good enough for prototype, will be replaced with Tone.js later.
 */

import { SimpleSynth } from './SimpleSynth';

/**
 * Single note in a track
 */
export interface TrackerNote {
  note: number | null;    // MIDI note number, null = rest
  instrument: number;     // Instrument ID (unused for now)
}

/**
 * Complete pattern data
 */
export interface TrackerPattern {
  rows: TrackerNote[][];  // [row][track] - grid of notes
  bpm: number;            // Beats per minute
  stepsPerBeat: number;   // Rows per beat (4 = 16th notes)
}

export class SimplePlayer {
  private synth: SimpleSynth;
  private pattern: TrackerPattern | null = null;
  private isPlaying: boolean = false;
  private currentRow: number = 0;
  private intervalId: number | null = null;
  private onRowChange?: (row: number) => void;

  constructor(synth: SimpleSynth) {
    this.synth = synth;
  }

  /**
   * Load a pattern for playback
   */
  loadPattern(pattern: TrackerPattern): void {
    console.log('[SimplePlayer] Loading pattern...');
    console.log('[SimplePlayer]   Rows:', pattern.rows.length);
    console.log('[SimplePlayer]   Tracks:', pattern.rows[0]?.length || 0);
    console.log('[SimplePlayer]   BPM:', pattern.bpm);

    this.pattern = pattern;
  }

  /**
   * Start playback
   */
  play(): void {
    if (this.isPlaying) {
      console.warn('[SimplePlayer] Already playing');
      return;
    }

    if (!this.pattern) {
      console.error('[SimplePlayer] No pattern loaded');
      return;
    }

    console.log('[SimplePlayer] ▶ Starting playback');

    this.isPlaying = true;
    this.synth.start();

    // Calculate timing
    const msPerRow = this.calculateMsPerRow();
    console.log(`[SimplePlayer] Timing: ${msPerRow.toFixed(2)}ms per row at ${this.pattern.bpm} BPM`);

    // Play first row immediately
    this.playRow();

    // Schedule subsequent rows
    this.intervalId = window.setInterval(() => {
      this.playRow();
    }, msPerRow);
  }

  /**
   * Pause playback (keeps position)
   */
  pause(): void {
    if (!this.isPlaying) return;

    console.log('[SimplePlayer] ⏸ Pausing');
    this.isPlaying = false;

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Stop all currently playing notes
    this.synth.allNotesOff();
  }

  /**
   * Stop playback and reset to beginning
   */
  stop(): void {
    this.pause();
    this.currentRow = 0;
    console.log('[SimplePlayer] ⏹ Stopped and reset');

    // Notify UI of position reset
    if (this.onRowChange) {
      this.onRowChange(this.currentRow);
    }
  }

  /**
   * Check if currently playing
   */
  playing(): boolean {
    return this.isPlaying;
  }

  /**
   * Get current row number
   */
  getCurrentRow(): number {
    return this.currentRow;
  }

  /**
   * Set callback for row changes (for UI updates)
   */
  setOnRowChange(callback: (row: number) => void): void {
    this.onRowChange = callback;
  }

  /**
   * Change BPM during playback
   * If playing, restarts the interval with new timing
   */
  setBPM(newBPM: number): void {
    if (!this.pattern) {
      console.warn('[SimplePlayer] No pattern loaded');
      return;
    }

    // Update pattern BPM
    this.pattern.bpm = newBPM;
    console.log(`[SimplePlayer] BPM changed to ${newBPM}`);

    // If playing, restart interval with new timing
    if (this.isPlaying && this.intervalId !== null) {
      clearInterval(this.intervalId);

      const msPerRow = this.calculateMsPerRow();
      console.log(`[SimplePlayer] Restarting playback at ${msPerRow.toFixed(2)}ms per row`);

      this.intervalId = window.setInterval(() => {
        this.playRow();
      }, msPerRow);
    }
  }

  /**
   * Play current row
   * @private
   */
  private playRow(): void {
    if (!this.pattern) return;

    // Loop back to start if at end
    if (this.currentRow >= this.pattern.rows.length) {
      this.currentRow = 0;
      console.log('[SimplePlayer] 🔁 Looping to row 0');
    }

    const row = this.pattern.rows[this.currentRow];

    // Play notes in each track
    row.forEach((trackNote, trackIndex) => {
      if (trackNote.note !== null) {
        // Use track index as channel (0-3 for 4 tracks)
        this.synth.noteOn(trackIndex, trackNote.note, 100);

        // Schedule note off before next row
        const msPerRow = this.calculateMsPerRow();
        const noteOffTime = msPerRow * 0.85; // 85% duration, 15% gap

        setTimeout(() => {
          if (trackNote.note !== null) {
            this.synth.noteOff(trackIndex, trackNote.note);
          }
        }, noteOffTime);
      }
    });

    // Advance to next row
    this.currentRow++;

    // Notify UI callback
    if (this.onRowChange) {
      this.onRowChange(this.currentRow);
    }
  }

  /**
   * Calculate milliseconds per row based on BPM
   * @private
   */
  private calculateMsPerRow(): number {
    if (!this.pattern) return 500;

    // BPM = beats per minute
    // stepsPerBeat = rows per beat (4 for 16th notes)
    //
    // Example: 120 BPM, 4 steps/beat
    // → 120 beats/min = 2 beats/sec
    // → 2 beats/sec × 4 steps/beat = 8 steps/sec
    // → 1000ms / 8 steps = 125ms per step

    const beatsPerSecond = this.pattern.bpm / 60;
    const stepsPerSecond = beatsPerSecond * this.pattern.stepsPerBeat;
    const msPerStep = 1000 / stepsPerSecond;

    return msPerStep;
  }
}
