import { useState, useMemo, useCallback } from 'react';
import {
  isBlackKey,
  getNoteName,
  countWhiteKeys,
  calculateKeyGeometry,
  getTrackIndicators,
  type KeyGeometry
} from '../../utils/keyboardUtils';
import './PianoKeyboard.css';

export interface PianoKeyboardProps {
  /** Starting MIDI note (0-127) */
  startNote: number;

  /** Ending MIDI note (0-127) */
  endNote: number;

  /** Height in pixels (default: 80) */
  height?: number;

  /** Currently active notes from user interaction (highlighted in default color) */
  activeNotes?: Set<number>;

  /**
   * Active notes by track with color mapping
   * Map of track ID -> { notes: Set<number>, color: string }
   * Each track's notes are rendered with its specified color
   * Useful for multi-track playback visualization
   */
  activeNotesByTrack?: Map<number, { notes: Set<number>; color: string }>;

  /** Called when user presses a key */
  onNoteOn?: (midiNote: number) => void;

  /** Called when user releases a key */
  onNoteOff?: (midiNote: number) => void;

  /** Disable interaction */
  disabled?: boolean;

  /** Show note labels on white keys */
  showLabels?: boolean;

  /** Use compact sizing */
  compact?: boolean;
}

export function PianoKeyboard({
  startNote,
  endNote,
  height = 80,
  activeNotes = new Set(),
  activeNotesByTrack,
  onNoteOn,
  onNoteOff,
  disabled = false,
  showLabels = false,
  compact = false
}: PianoKeyboardProps) {
  // Local state for mouse-pressed keys
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());

  // Calculate track indicators for each note
  // Each note can have multiple track indicators (4px tall colored bars)
  const noteTrackIndicators = useMemo(() => {
    const indicatorMap = new Map<number, Array<{ trackId: number; color: string }>>();

    for (let note = startNote; note <= endNote; note++) {
      const indicators = getTrackIndicators(note, activeNotesByTrack);
      if (indicators.length > 0) {
        indicatorMap.set(note, indicators);
      }
    }

    return indicatorMap;
  }, [startNote, endNote, activeNotesByTrack]);

  // Dimensions
  const whiteKeyWidth = compact ? 30 : 40;
  const gap = compact ? 1 : 2;
  const whiteKeyCount = useMemo(
    () => countWhiteKeys(startNote, endNote),
    [startNote, endNote]
  );
  const containerWidth = whiteKeyCount * whiteKeyWidth + (whiteKeyCount - 1) * gap;

  // Pre-calculate all key geometries (memoized)
  const keyGeometries = useMemo(() => {
    const geometries = new Map<number, KeyGeometry>();
    for (let note = startNote; note <= endNote; note++) {
      geometries.set(
        note,
        calculateKeyGeometry(note, startNote, whiteKeyWidth, height, gap)
      );
    }
    return geometries;
  }, [startNote, endNote, whiteKeyWidth, height, gap]);

  // Combine pressed keys with externally active notes
  const displayedActiveKeys = useMemo(() => {
    return new Set([...pressedKeys, ...activeNotes]);
  }, [pressedKeys, activeNotes]);

  // Generate all notes in range
  const allNotes = useMemo(() => {
    const notes: number[] = [];
    for (let note = startNote; note <= endNote; note++) {
      notes.push(note);
    }
    return notes;
  }, [startNote, endNote]);

  // Separate white and black keys for rendering order
  const whiteNotes = useMemo(() => allNotes.filter(n => !isBlackKey(n)), [allNotes]);
  const blackNotes = useMemo(() => allNotes.filter(n => isBlackKey(n)), [allNotes]);

  const handleMouseDown = useCallback((midiNote: number) => {
    if (disabled) return;
    setPressedKeys(prev => new Set(prev).add(midiNote));
    onNoteOn?.(midiNote);
  }, [disabled, onNoteOn]);

  const handleMouseUp = useCallback((midiNote: number) => {
    if (disabled) return;
    setPressedKeys(prev => {
      const next = new Set(prev);
      next.delete(midiNote);
      return next;
    });
    onNoteOff?.(midiNote);
  }, [disabled, onNoteOff]);

  const handleMouseLeave = useCallback((midiNote: number) => {
    // Auto-release if mouse leaves while pressed
    if (pressedKeys.has(midiNote)) {
      handleMouseUp(midiNote);
    }
  }, [pressedKeys, handleMouseUp]);

  return (
    <div
      className="piano-keyboard-container"
      style={{ width: containerWidth, height }}
    >
      {/* White keys (render first, lower z-index) */}
      {whiteNotes.map(note => {
        const geometry = keyGeometries.get(note)!;
        const isActive = displayedActiveKeys.has(note);
        const trackIndicators = noteTrackIndicators.get(note) || [];

        return (
          <button
            key={note}
            className={`piano-key white ${isActive ? 'active' : ''}`}
            style={{
              left: geometry.left,
              width: geometry.width,
              height: geometry.height
            }}
            onMouseDown={() => handleMouseDown(note)}
            onMouseUp={() => handleMouseUp(note)}
            onMouseLeave={() => handleMouseLeave(note)}
            disabled={disabled}
            aria-label={`${getNoteName(note)} key`}
            aria-pressed={isActive}
          >
            {showLabels && <span className="key-label">{getNoteName(note)}</span>}

            {/* Track indicator bars (stacked at bottom of key) */}
            {trackIndicators.length > 0 && (
              <div className="track-indicators">
                {trackIndicators.map(({ trackId, color }) => (
                  <div
                    key={trackId}
                    className="track-indicator"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          </button>
        );
      })}

      {/* Black keys (render last, higher z-index) */}
      {blackNotes.map(note => {
        const geometry = keyGeometries.get(note)!;
        const isActive = displayedActiveKeys.has(note);
        const trackIndicators = noteTrackIndicators.get(note) || [];

        return (
          <button
            key={note}
            className={`piano-key black ${isActive ? 'active' : ''}`}
            style={{
              left: geometry.left,
              width: geometry.width,
              height: geometry.height
            }}
            onMouseDown={() => handleMouseDown(note)}
            onMouseUp={() => handleMouseUp(note)}
            onMouseLeave={() => handleMouseLeave(note)}
            disabled={disabled}
            aria-label={`${getNoteName(note)} key`}
            aria-pressed={isActive}
          >
            {/* Track indicator bars (stacked at bottom of key) */}
            {trackIndicators.length > 0 && (
              <div className="track-indicators">
                {trackIndicators.map(({ trackId, color }) => (
                  <div
                    key={trackId}
                    className="track-indicator"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
