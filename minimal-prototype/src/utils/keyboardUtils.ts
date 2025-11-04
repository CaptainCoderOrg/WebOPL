/**
 * Piano keyboard utility functions
 */

/**
 * Check if a MIDI note is a black key
 */
export function isBlackKey(midiNote: number): boolean {
  const noteInOctave = midiNote % 12;
  return [1, 3, 6, 8, 10].includes(noteInOctave);
}

/**
 * Get note name (e.g., "C4", "F#5")
 */
export function getNoteName(midiNote: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = noteNames[midiNote % 12];
  return `${noteName}${octave}`;
}

/**
 * Get white key index for positioning
 * Maps MIDI notes to sequential white key positions (0, 1, 2...)
 */
export function getWhiteKeyIndex(midiNote: number, startNote: number): number {
  // Pattern maps 12 semitones to 7 white keys per octave
  // C C# D D# E F F# G G# A A# B
  // 0  0 1  1 2 3  3 4  4 5  5 6
  const whiteKeyPattern = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];

  const notesFromStart = midiNote - startNote;
  const octavesFromStart = Math.floor(notesFromStart / 12);
  const noteInOctave = notesFromStart % 12;

  return octavesFromStart * 7 + whiteKeyPattern[noteInOctave];
}

/**
 * Count white keys in a range
 */
export function countWhiteKeys(startNote: number, endNote: number): number {
  let count = 0;
  for (let note = startNote; note <= endNote; note++) {
    if (!isBlackKey(note)) count++;
  }
  return count;
}

/**
 * Get track indicators for a specific note
 * Returns array of { trackId, color } for tracks playing this note
 */
export function getTrackIndicators(
  midiNote: number,
  activeNotesByTrack?: Map<number, { notes: Set<number>; color: string }>
): Array<{ trackId: number; color: string }> {
  if (!activeNotesByTrack) return [];

  const indicators: Array<{ trackId: number; color: string }> = [];

  activeNotesByTrack.forEach(({ notes, color }, trackId) => {
    if (notes.has(midiNote)) {
      indicators.push({ trackId, color });
    }
  });

  // Sort by track ID for consistent rendering order
  return indicators.sort((a, b) => a.trackId - b.trackId);
}

/**
 * Key geometry data
 */
export interface KeyGeometry {
  left: number;
  width: number;
  height: number;
  isBlack: boolean;
}

/**
 * Calculate position and dimensions for a key
 */
export function calculateKeyGeometry(
  midiNote: number,
  startNote: number,
  whiteKeyWidth: number,
  whiteKeyHeight: number,
  gap: number
): KeyGeometry {
  const isBlack = isBlackKey(midiNote);

  if (isBlack) {
    // Black key dimensions
    const blackKeyWidth = whiteKeyWidth * 0.5;  // 50% of white key width
    const blackKeyHeight = whiteKeyHeight * 0.65;

    // Position: centered on white key boundary
    const whiteKeyIndex = getWhiteKeyIndex(midiNote, startNote);
    const left = whiteKeyIndex * (whiteKeyWidth + gap) + whiteKeyWidth - (blackKeyWidth / 2);

    return { left, width: blackKeyWidth, height: blackKeyHeight, isBlack: true };
  } else {
    // White key position
    const whiteKeyIndex = getWhiteKeyIndex(midiNote, startNote);
    const left = whiteKeyIndex * (whiteKeyWidth + gap);

    return { left, width: whiteKeyWidth, height: whiteKeyHeight, isBlack: false };
  }
}
