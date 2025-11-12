/**
 * CellProcessor - Shared logic for interpreting tracker cells
 *
 * Centralizes the semantics of tracker notation so both real-time
 * playback (SimplePlayer) and offline rendering (PatternRenderer)
 * interpret notes consistently.
 */

import type { PatternCellData, PatternCell } from '../types/PatternFile';

export type CellAction =
  | { type: 'sustain' }           // Continue playing current note
  | { type: 'note-off' }          // Stop current note
  | { type: 'note-on', midiNote: number, velocity: number }  // Play new note with velocity
  | { type: 'invalid' };          // Invalid/unparseable cell

export class CellProcessor {
  /**
   * Process a tracker cell and determine what action to take
   *
   * Supports both simple string format and extended object format:
   * - Simple: "C-4" (defaults to velocity 64)
   * - Extended: {n: "C-4", v: 48} (explicit velocity)
   * - Extended: {n: "C-4", v: 48, fx: "EC8"} (with effects)
   *
   * @param cell - Cell content (string or object)
   * @returns Action to perform
   *
   * @example
   * CellProcessor.process("C-4")                    // { type: 'note-on', midiNote: 60, velocity: 64 }
   * CellProcessor.process({n: "C-4", v: 48})        // { type: 'note-on', midiNote: 60, velocity: 48 }
   * CellProcessor.process("---")                    // { type: 'sustain' }
   * CellProcessor.process("OFF")                    // { type: 'note-off' }
   */
  static process(cell: PatternCellData | null | undefined): CellAction {
    // Handle object format
    if (typeof cell === 'object' && cell !== null) {
      const objCell = cell as PatternCell;
      const noteStr = objCell.n;
      const velocity = objCell.v !== undefined ? objCell.v : 64; // Default to full velocity

      // Empty cell or "---" = sustain
      if (!noteStr || noteStr === '---') {
        return { type: 'sustain' };
      }

      // "OFF" = note off
      if (noteStr === 'OFF') {
        return { type: 'note-off' };
      }

      // Parse note
      const midiNote = this.parseNote(noteStr);
      if (midiNote !== null) {
        // Clamp velocity to 0-64 range
        const clampedVelocity = Math.max(0, Math.min(64, velocity));
        return { type: 'note-on', midiNote, velocity: clampedVelocity };
      }

      return { type: 'invalid' };
    }

    // Handle string format (backward compatibility)
    if (typeof cell === 'string') {
      // Empty cell or "---" = sustain (do nothing)
      if (cell === '---') {
        return { type: 'sustain' };
      }

      // "OFF" = note off (stop the note)
      if (cell === 'OFF') {
        return { type: 'note-off' };
      }

      // Try to parse as a note (e.g., "C-4", "C#4", "E-4")
      const midiNote = this.parseNote(cell);
      if (midiNote !== null) {
        return { type: 'note-on', midiNote, velocity: 64 }; // Default to full velocity
      }

      // Unrecognized cell format
      return { type: 'invalid' };
    }

    // Null or undefined = sustain
    return { type: 'sustain' };
  }

  /**
   * Parse note string to MIDI note number
   *
   * Supports formats:
   * - "C-4", "D-3", "E-5" (standard notation)
   * - "C#4", "Cs4", "Ds3" (sharps)
   *
   * @param noteStr - Note string
   * @returns MIDI note number (0-127) or null if invalid
   *
   * @example
   * CellProcessor.parseNote("C-4")  // 60 (middle C)
   * CellProcessor.parseNote("A-4")  // 69
   * CellProcessor.parseNote("C#5")  // 73
   */
  static parseNote(noteStr: string): number | null {
    // Format: "C-4" or "C#4" or "Cs4"
    const match = noteStr.match(/^([A-G])(#|s)?(-)?(\d)$/i);
    if (!match) return null;

    const noteName = match[1].toUpperCase();
    const sharp = match[2] === '#' || match[2] === 's';
    const octave = parseInt(match[4], 10);

    // Map note name to index (C=0, D=2, E=4, F=5, G=7, A=9, B=11)
    const noteMap: Record<string, number> = {
      'C': 0,
      'D': 2,
      'E': 4,
      'F': 5,
      'G': 7,
      'A': 9,
      'B': 11,
    };

    const noteIndex = noteMap[noteName];
    if (noteIndex === undefined) return null;

    // Calculate MIDI note number
    const midiNote = (octave + 1) * 12 + noteIndex + (sharp ? 1 : 0);

    // Validate range (0-127)
    if (midiNote < 0 || midiNote > 127) return null;

    return midiNote;
  }

  /**
   * Convert TrackerNote format (used by SimplePlayer) to action
   *
   * @param note - Note value (null = sustain, -1 = OFF, 0+ = MIDI note)
   * @param velocity - Velocity (0-64, defaults to 64 if not provided)
   * @returns Action to perform
   */
  static processTrackerNote(note: number | null, velocity: number = 64): CellAction {
    if (note === null) {
      return { type: 'sustain' };
    }
    if (note === -1) {
      return { type: 'note-off' };
    }
    if (note >= 0 && note <= 127) {
      const clampedVelocity = Math.max(0, Math.min(64, velocity));
      return { type: 'note-on', midiNote: note, velocity: clampedVelocity };
    }
    return { type: 'invalid' };
  }
}
