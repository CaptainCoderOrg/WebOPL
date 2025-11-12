/**
 * PatternRenderer - Convert pattern data to timeline events
 * Parses note strings and calculates timing
 */

import { CellProcessor } from '../core/CellProcessor';

export interface NoteEvent {
  type: 'note-on' | 'note-off';
  time: number; // in seconds
  track: number;
  midiNote: number;
  velocity?: number; // 0-64 (only for note-on events)
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
        const action = CellProcessor.process(cell);

        switch (action.type) {
          case 'sustain':
            // Do nothing - let note continue playing
            break;

          case 'note-off':
            // Stop the active note on this track
            const activeNoteOff = activeNotes.get(trackIndex);
            if (activeNoteOff !== undefined) {
              events.push({
                type: 'note-off',
                time,
                track: trackIndex,
                midiNote: activeNoteOff,
              });
              activeNotes.delete(trackIndex);
            }
            break;

          case 'note-on':
            // Stop any active note on this track first
            const activeNoteOn = activeNotes.get(trackIndex);
            if (activeNoteOn !== undefined) {
              events.push({
                type: 'note-off',
                time,
                track: trackIndex,
                midiNote: activeNoteOn,
              });
            }

            // Start new note with velocity
            events.push({
              type: 'note-on',
              time,
              track: trackIndex,
              midiNote: action.midiNote,
              velocity: action.velocity,
            });
            activeNotes.set(trackIndex, action.midiNote);
            break;

          case 'invalid':
            // Ignore invalid cells
            break;
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
}
