/**
 * SimplePlayer - Basic tracker pattern playback engine
 *
 * Plays tracker patterns using simple setTimeout scheduling.
 * Good enough for prototype, will be replaced with Tone.js later.
 */

import { SimpleSynth } from './SimpleSynth';
import { CellProcessor } from './core/CellProcessor';

/**
 * Single note in a track
 */
export interface TrackerNote {
  note: number | null;    // MIDI note number, null = rest
  instrument: number;     // Instrument ID (unused for now)
  velocity?: number;      // Velocity (0-64, default: 64)
  effect?: string;        // Effect command (e.g., "EC8", "ED3")
}

/**
 * Complete pattern data
 */
export interface TrackerPattern {
  rows: TrackerNote[][];  // [row][track] - grid of notes
  bpm: number;            // Beats per minute
  stepsPerBeat: number;   // Rows per beat (4 = 16th notes)
  ticksPerRow?: number;   // Ticks per row for sub-row timing (default: 6)
}

/**
 * Pending effect action (scheduled for future tick)
 */
interface PendingEffect {
  tick: number;       // Global tick number when to execute
  trackIndex: number; // Which track
  type: 'note-cut' | 'note-delay';
  midiNote?: number;  // For note-delay
  velocity?: number;  // For note-delay
}

export class SimplePlayer {
  private synth: SimpleSynth;
  private pattern: TrackerPattern | null = null;
  private isPlaying: boolean = false;
  private currentRow: number = 0;
  private currentTick: number = 0;      // Tick within current row (0 to ticksPerRow-1)
  private globalTick: number = 0;       // Absolute tick counter for effect scheduling
  private intervalId: number | null = null;
  private onRowChange?: (row: number) => void;
  // Track currently playing notes for each track (for sustain)
  private activeNotes: Map<number, number> = new Map(); // trackIndex -> MIDI note
  // Pending effects to execute at future ticks
  private pendingEffects: PendingEffect[] = [];

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
    const ticksPerRow = this.pattern.ticksPerRow || 6;
    const msPerTick = this.calculateMsPerRow() / ticksPerRow;
    console.log(`[SimplePlayer] Timing: ${msPerTick.toFixed(2)}ms per tick (${ticksPerRow} ticks/row) at ${this.pattern.bpm} BPM`);

    // Play first tick immediately
    this.playTick();

    // Schedule subsequent ticks
    this.intervalId = window.setInterval(() => {
      this.playTick();
    }, msPerTick);
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
    this.currentTick = 0;
    this.globalTick = 0;
    this.pendingEffects = [];

    // Release all active notes before clearing
    for (const [trackIndex, midiNote] of this.activeNotes.entries()) {
      this.synth.noteOff(trackIndex, midiNote);
    }
    this.activeNotes.clear();

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

      const ticksPerRow = this.pattern.ticksPerRow || 6;
      const msPerTick = this.calculateMsPerRow() / ticksPerRow;
      console.log(`[SimplePlayer] Restarting playback at ${msPerTick.toFixed(2)}ms per tick`);

      this.intervalId = window.setInterval(() => {
        this.playTick();
      }, msPerTick);
    }
  }

  /**
   * Play current tick (sub-row timing)
   * @private
   */
  private playTick(): void {
    if (!this.pattern) return;

    const ticksPerRow = this.pattern.ticksPerRow || 6;

    // Loop back to start if at end
    if (this.currentRow >= this.pattern.rows.length) {
      this.currentRow = 0;
      this.currentTick = 0;
      console.log('[SimplePlayer] 🔁 Looping to row 0');
    }

    // Process any pending effects scheduled for this tick
    this.processPendingEffects();

    // At tick 0 of each row: process new notes
    if (this.currentTick === 0) {
      const row = this.pattern.rows[this.currentRow];

      // Process notes in each track
      row.forEach((trackNote, trackIndex) => {
        const velocity = trackNote.velocity !== undefined ? trackNote.velocity : 64;
        const action = CellProcessor.processTrackerNote(trackNote.note, velocity);
        const effect = trackNote.effect;

        // Parse effect command (if any)
        const effectCmd = effect ? this.parseEffect(effect) : null;

        // Check if this note has a delay effect (EDx)
        const hasDelay = effectCmd?.type === 'ED';
        const delayTicks = hasDelay ? effectCmd.value : 0;

        switch (action.type) {
          case 'sustain':
            // Do nothing - let note continue playing
            // But process ECx if present (note cut on sustaining note)
            if (effectCmd?.type === 'EC') {
              this.scheduleNoteCut(trackIndex, effectCmd.value);
            }
            break;

          case 'note-off':
            if (!hasDelay) {
              // Immediate note-off
              const activeNoteOff = this.activeNotes.get(trackIndex);
              if (activeNoteOff !== undefined) {
                this.synth.noteOff(trackIndex, activeNoteOff);
                this.activeNotes.delete(trackIndex);
              }
            } else {
              // Delayed note-off (EDx effect on OFF command)
              this.scheduleDelayedNoteOff(trackIndex, delayTicks);
            }
            break;

          case 'note-on':
            if (!hasDelay) {
              // Immediate note-on
              // Stop any previous note on this track first
              const activeNoteOn = this.activeNotes.get(trackIndex);
              if (activeNoteOn !== undefined) {
                this.synth.noteOff(trackIndex, activeNoteOn);
              }

              // Play the new note with velocity
              this.synth.noteOn(trackIndex, action.midiNote, action.velocity);
              this.activeNotes.set(trackIndex, action.midiNote);

              // Schedule note cut if ECx present
              if (effectCmd?.type === 'EC') {
                this.scheduleNoteCut(trackIndex, effectCmd.value);
              }
            } else {
              // Delayed note-on (EDx effect)
              this.scheduleDelayedNoteOn(trackIndex, action.midiNote, action.velocity, delayTicks, effectCmd);
            }
            break;

          case 'invalid':
            // Ignore invalid notes
            break;
        }
      });

      // Notify UI callback with the row that's currently playing
      if (this.onRowChange) {
        this.onRowChange(this.currentRow);
      }
    }

    // Advance tick
    this.currentTick++;
    this.globalTick++;

    // If reached end of row, advance to next row and reset tick
    if (this.currentTick >= ticksPerRow) {
      this.currentTick = 0;
      this.currentRow++;
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

  /**
   * Parse effect command string (e.g., "EC8", "ED3")
   * @private
   */
  private parseEffect(effect: string): { type: string; value: number } | null {
    if (!effect || effect.length < 2) return null;

    const type = effect.substring(0, 2).toUpperCase();
    const valueStr = effect.substring(2);
    const value = parseInt(valueStr, 16); // Hex value

    if (isNaN(value)) return null;

    return { type, value };
  }

  /**
   * Schedule a note cut (ECx effect)
   * @private
   */
  private scheduleNoteCut(trackIndex: number, tickDelay: number): void {
    const executionTick = this.globalTick + tickDelay;

    this.pendingEffects.push({
      tick: executionTick,
      trackIndex: trackIndex,
      type: 'note-cut',
    });
  }

  /**
   * Schedule a delayed note-on (EDx effect)
   * @private
   */
  private scheduleDelayedNoteOn(
    trackIndex: number,
    midiNote: number,
    velocity: number,
    tickDelay: number,
    _effectCmd: { type: string; value: number } | null // Underscore prefix = intentionally unused
  ): void {
    const executionTick = this.globalTick + tickDelay;

    this.pendingEffects.push({
      tick: executionTick,
      trackIndex: trackIndex,
      type: 'note-delay',
      midiNote: midiNote,
      velocity: velocity,
    });

    // If there's also an ECx on the same note, schedule it relative to the delayed start
    // (This would require parsing multiple effects, which we'll skip for simplicity)
  }

  /**
   * Schedule a delayed note-off (EDx on OFF command)
   * @private
   */
  private scheduleDelayedNoteOff(trackIndex: number, tickDelay: number): void {
    const executionTick = this.globalTick + tickDelay;

    this.pendingEffects.push({
      tick: executionTick,
      trackIndex: trackIndex,
      type: 'note-cut', // Same as note-cut effect
    });
  }

  /**
   * Process pending effects that are scheduled for current tick
   * @private
   */
  private processPendingEffects(): void {
    // Find effects scheduled for this tick
    const effectsToExecute = this.pendingEffects.filter(e => e.tick === this.globalTick);

    // Execute them
    for (const effect of effectsToExecute) {
      switch (effect.type) {
        case 'note-cut':
          // Stop the active note on this track
          const activeNote = this.activeNotes.get(effect.trackIndex);
          if (activeNote !== undefined) {
            this.synth.noteOff(effect.trackIndex, activeNote);
            this.activeNotes.delete(effect.trackIndex);
          }
          break;

        case 'note-delay':
          // Start the delayed note
          if (effect.midiNote !== undefined && effect.velocity !== undefined) {
            // Stop any previous note first
            const prevNote = this.activeNotes.get(effect.trackIndex);
            if (prevNote !== undefined) {
              this.synth.noteOff(effect.trackIndex, prevNote);
            }

            // Play the delayed note
            this.synth.noteOn(effect.trackIndex, effect.midiNote, effect.velocity);
            this.activeNotes.set(effect.trackIndex, effect.midiNote);
          }
          break;
      }
    }

    // Remove executed effects from pending list
    this.pendingEffects = this.pendingEffects.filter(e => e.tick > this.globalTick);
  }
}
