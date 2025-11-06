/**
 * PatternRenderer - Convert pattern data to timeline events
 * Parses note strings and calculates timing
 */

export interface NoteEvent {
  type: 'note-on' | 'note-off';
  time: number; // in seconds
  track: number;
  midiNote: number;
}

export interface PatternTimeline {
  events: NoteEvent[];
  duration: number; // total duration in seconds
}

export interface RenderablePattern {
  name: string;
  pattern?: string[][]; // Standard field name
  rows?: string[][]; // Alias for pattern (for compatibility)
  instruments: number[];
  bpm?: number;
  rowsPerBeat?: number;
}

export class PatternRenderer {
  /**
   * Render pattern to timeline of note events
   * @param pattern - Pattern data with rows and timing info
   * @returns Timeline with note on/off events
   */
  static render(pattern: RenderablePattern): PatternTimeline {
    const bpm = pattern.bpm || 120;
    const rowsPerBeat = pattern.rowsPerBeat || 4;
    const secondsPerRow = 60 / (bpm * rowsPerBeat);

    // Support both 'pattern' and 'rows' field names
    const patternData = pattern.pattern || pattern.rows;
    if (!patternData) {
      throw new Error('Pattern data missing: must have either "pattern" or "rows" field');
    }

    const events: NoteEvent[] = [];
    const activeNotes = new Map<number, number>(); // track → midiNote

    // Process each row
    for (let rowIndex = 0; rowIndex < patternData.length; rowIndex++) {
      const row = patternData[rowIndex];
      const time = rowIndex * secondsPerRow;

      // Process each track in this row
      for (let trackIndex = 0; trackIndex < row.length; trackIndex++) {
        const cell = row[trackIndex];

        if (!cell) continue; // Empty cell

        if (cell === '---') {
          // Sustain/continue - do nothing, let note keep playing
          continue;
        } else if (cell === 'OFF') {
          // Note off
          const activeMidiNote = activeNotes.get(trackIndex);
          if (activeMidiNote !== undefined) {
            events.push({
              type: 'note-off',
              time,
              track: trackIndex,
              midiNote: activeMidiNote,
            });
            activeNotes.delete(trackIndex);
          }
        } else {
          // Parse note (e.g., "C-4", "C#4", "E-4")
          const midiNote = this.parseNote(cell);
          if (midiNote !== null) {
            // Stop any active note on this track first
            const activeMidiNote = activeNotes.get(trackIndex);
            if (activeMidiNote !== undefined) {
              events.push({
                type: 'note-off',
                time,
                track: trackIndex,
                midiNote: activeMidiNote,
              });
            }

            // Start new note
            events.push({
              type: 'note-on',
              time,
              track: trackIndex,
              midiNote,
            });
            activeNotes.set(trackIndex, midiNote);
          }
        }
      }
    }

    // Calculate total duration (add extra time for release)
    const patternDuration = patternData.length * secondsPerRow;
    const duration = patternDuration + 1.0; // +1 second for final note release

    // Stop all active notes at the end
    for (const [trackIndex, midiNote] of activeNotes.entries()) {
      events.push({
        type: 'note-off',
        time: patternDuration,
        track: trackIndex,
        midiNote,
      });
    }

    return { events, duration };
  }

  /**
   * Parse note string to MIDI note number
   * @param noteStr - Note string like "C-4", "C#4", "E-4"
   * @returns MIDI note number (0-127) or null if invalid
   */
  private static parseNote(noteStr: string): number | null {
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
}
