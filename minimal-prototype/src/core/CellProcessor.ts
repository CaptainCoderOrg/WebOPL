/**
 * CellProcessor - Shared logic for interpreting tracker cells
 *
 * Centralizes the semantics of tracker notation so both real-time
 * playback (SimplePlayer) and offline rendering (PatternRenderer)
 * interpret notes consistently.
 */

export type CellAction =
  | { type: 'sustain' }           // Continue playing current note
  | { type: 'note-off' }          // Stop current note
  | { type: 'note-on', midiNote: number }  // Play new note
  | { type: 'invalid' };          // Invalid/unparseable cell

export class CellProcessor {
  /**
   * Process a tracker cell and determine what action to take
   *
   * @param cell - Cell content (e.g., "C-4", "---", "OFF", etc.)
   * @returns Action to perform
   *
   * @example
   * CellProcessor.process("C-4")  // { type: 'note-on', midiNote: 60 }
   * CellProcessor.process("---")  // { type: 'sustain' }
   * CellProcessor.process("OFF")  // { type: 'note-off' }
   */
  static process(cell: string | null | undefined): CellAction {
    // Empty cell or "---" = sustain (do nothing)
    if (!cell || cell === '---') {
      return { type: 'sustain' };
    }

    // "OFF" = note off (stop the note)
    if (cell === 'OFF') {
      return { type: 'note-off' };
    }

    // Try to parse as a note (e.g., "C-4", "C#4", "E-4")
    const midiNote = this.parseNote(cell);
    if (midiNote !== null) {
      return { type: 'note-on', midiNote };
    }

    // Unrecognized cell format
    return { type: 'invalid' };
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
   * @returns Action to perform
   */
  static processTrackerNote(note: number | null): CellAction {
    if (note === null) {
      return { type: 'sustain' };
    }
    if (note === -1) {
      return { type: 'note-off' };
    }
    if (note >= 0 && note <= 127) {
      return { type: 'note-on', midiNote: note };
    }
    return { type: 'invalid' };
  }
}
