/**
 * TrackerGrid - Editable tracker note grid
 *
 * Displays a grid of note inputs with keyboard navigation.
 */

import React, { useEffect, useRef } from 'react';
import './TrackerGrid.css';
import { validateNote } from '../utils/patternValidation';
import type { OPLPatch } from '../types/OPLPatch';

interface TrackerGridProps {
  rows: number;               // Number of rows (e.g., 16)
  tracks: number;             // Number of tracks (e.g., 4)
  pattern: string[][];        // [row][track] = "C-4" or "---"
  onUpdate: (pattern: string[][]) => void;
  currentRow?: number;        // Current playback row (for highlighting)
  trackInstruments?: number[]; // Array of patch IDs (one per track)
  instrumentBank?: OPLPatch[]; // All available patches
  onInstrumentChange?: (trackIndex: number, patchId: number) => void;
  onEditClick?: (trackIndex: number) => void;
  onDeleteClick?: (trackIndex: number) => void;
  compact?: boolean;          // Compact mode (narrow columns, minimal headers)
}

export function TrackerGrid({
  rows,
  tracks,
  pattern,
  onUpdate,
  currentRow,
  trackInstruments,
  instrumentBank,
  onInstrumentChange,
  onEditClick,
  onDeleteClick,
  compact = false,
}: TrackerGridProps) {
  // Track colors for visual distinction
  const trackColors = ['#00ff00', '#00aaff', '#ffaa00', '#ff00ff'];

  // Refs for auto-scrolling
  const containerRef = useRef<HTMLDivElement>(null);
  const currentRowRef = useRef<HTMLTableRowElement>(null);

  /**
   * Auto-scroll to keep current row centered during playback
   * Only scrolls the tracker container, not the entire page
   */
  useEffect(() => {
    if (currentRow !== undefined && currentRowRef.current && containerRef.current) {
      const container = containerRef.current;
      const row = currentRowRef.current;

      // Get positions
      const containerRect = container.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();

      // Calculate the scroll offset needed to center the row
      const containerCenter = containerRect.height / 2;
      const rowCenter = rowRect.top - containerRect.top + container.scrollTop;
      const scrollTarget = rowCenter - containerCenter + rowRect.height / 2;

      // Smooth scroll the container
      container.scrollTo({
        top: scrollTarget,
        behavior: 'smooth',
      });
    }
  }, [currentRow]);

  /**
   * Check if a note is invalid
   */
  const isInvalidNote = (note: string): boolean => {
    // Empty or rest is valid
    if (!note || note === '---' || note.trim() === '') {
      return false;
    }

    return !validateNote(note);
  };

  /**
   * Auto-focus first cell on mount
   */
  useEffect(() => {
    const firstInput = document.querySelector(
      'input[data-row="0"][data-track="0"]'
    ) as HTMLInputElement;

    if (firstInput) {
      // Delay to ensure render complete
      setTimeout(() => {
        firstInput.focus();
        firstInput.select();
      }, 100);
    }
  }, []); // Empty deps = run once on mount

  /**
   * Handle cell value change
   */
  const handleCellChange = (row: number, track: number, value: string) => {
    // Create new pattern array (immutable update)
    const newPattern = pattern.map((r) => [...r]);

    // Normalize input
    let normalized = value.trim().toUpperCase();

    // If empty, set to rest
    if (normalized === '') {
      normalized = '---';
    }

    newPattern[row][track] = normalized;
    onUpdate(newPattern);
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (
    e: React.KeyboardEvent,
    row: number,
    track: number
  ) => {
    let nextRow = row;
    let nextTrack = track;

    switch (e.key) {
      case 'ArrowUp':
        if (row > 0) {
          nextRow = row - 1;
          e.preventDefault();
        }
        break;

      case 'ArrowDown':
      case 'Enter':
        if (row < rows - 1) {
          nextRow = row + 1;
          e.preventDefault();
        }
        break;

      case 'ArrowLeft':
        if (track > 0) {
          nextTrack = track - 1;
          e.preventDefault();
        }
        break;

      case 'ArrowRight':
      case 'Tab':
        if (track < tracks - 1) {
          nextTrack = track + 1;
          e.preventDefault();
        }
        break;

      case 'Delete':
      case '-':
        // Clear cell: Delete or dash → "---"
        handleCellChange(row, track, '---');
        // Move to next row
        if (row < rows - 1) {
          nextRow = row + 1;
        }
        e.preventDefault();
        break;

      case 'o':
      case 'O':
        // Quick OFF command: 'O' → "OFF"
        handleCellChange(row, track, 'OFF');
        // Move to next row
        if (row < rows - 1) {
          nextRow = row + 1;
        }
        e.preventDefault();
        break;

      case '#': {
        // Toggle sharp on current note (no auto-advance)
        const currentValue = pattern[row][track].trim().toUpperCase();

        // Only toggle if it's a note (not ---, OFF, or empty)
        if (currentValue && currentValue !== '---' && currentValue !== 'OFF') {
          // Match note format: C-4, C#4, etc.
          const match = currentValue.match(/^([A-G])(#?)[-]?(\d+)$/);

          if (match) {
            const [, note, sharp, octave] = match;
            // E and B cannot have sharps (E# = F, B# = C)
            if (note === 'E' || note === 'B') {
              // If already has sharp, remove it; otherwise do nothing
              if (sharp) {
                handleCellChange(row, track, `${note}-${octave}`);
              }
            } else {
              // Toggle sharp: if it has #, remove it; if not, add it
              const newNote = sharp ? `${note}-${octave}` : `${note}#${octave}`;
              handleCellChange(row, track, newNote);
            }
          }
        }
        e.preventDefault();
        break;
      }

      case 'a': case 'A':
      case 'b': case 'B':
      case 'c': case 'C':
      case 'd': case 'D':
      case 'e': case 'E':
      case 'f': case 'F':
      case 'g': case 'G': {
        // Change note letter or create new note
        const noteLetter = e.key.toUpperCase();
        const currentValue = pattern[row][track].trim().toUpperCase();

        let newNote: string;

        if (currentValue && currentValue !== '---' && currentValue !== 'OFF') {
          // Modify existing note - keep sharp and octave, change letter
          const match = currentValue.match(/^([A-G])(#?)[-]?(\d+)$/);
          if (match) {
            const [, , sharp, octave] = match;
            // E and B cannot have sharps
            if ((noteLetter === 'E' || noteLetter === 'B') && sharp) {
              newNote = `${noteLetter}-${octave}`;
            } else {
              newNote = sharp ? `${noteLetter}#${octave}` : `${noteLetter}-${octave}`;
            }
          } else {
            // Invalid format, create new note at octave 4
            newNote = `${noteLetter}-4`;
          }
        } else {
          // Create new note - use octave from note above, or 4
          let octave = '4';
          if (row > 0) {
            const noteAbove = pattern[row - 1][track].trim().toUpperCase();
            const match = noteAbove.match(/^([A-G])(#?)[-]?(\d+)$/);
            if (match) {
              octave = match[3];
            }
          }
          newNote = `${noteLetter}-${octave}`;
        }

        handleCellChange(row, track, newNote);
        e.preventDefault();
        break;
      }

      case '0': case '1': case '2': case '3': case '4':
      case '5': case '6': case '7': case '8': case '9': {
        // Set octave on current note
        const octave = e.key;
        const currentValue = pattern[row][track].trim().toUpperCase();

        if (currentValue && currentValue !== '---' && currentValue !== 'OFF') {
          // Modify existing note - keep letter and sharp, change octave
          const match = currentValue.match(/^([A-G])(#?)[-]?(\d+)$/);
          if (match) {
            const [, note, sharp] = match;
            const newNote = sharp ? `${note}#${octave}` : `${note}-${octave}`;
            handleCellChange(row, track, newNote);
          }
        }
        e.preventDefault();
        break;
      }

      default:
        return; // Allow normal input
    }

    // Focus next cell if navigation occurred
    if (nextRow !== row || nextTrack !== track) {
      const nextInput = document.querySelector(
        `input[data-row="${nextRow}"][data-track="${nextTrack}"]`
      ) as HTMLInputElement;

      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  };

  return (
    <div ref={containerRef} className={`tracker-grid-container ${compact ? 'compact-mode' : ''}`}>
      <table className="tracker-grid">
        <thead>
          <tr>
            <th className="row-header">Row</th>
            {Array.from({ length: tracks }, (_, i) => {
              const trackColor = trackColors[i];
              const showInstruments = trackInstruments && instrumentBank && onInstrumentChange && onEditClick;
              const patchId = trackInstruments?.[i] ?? 0;
              const currentPatch = instrumentBank?.[patchId];

              return (
                <th
                  key={i}
                  className={compact ? 'track-header track-header-compact' : 'track-header'}
                  style={{ borderTopColor: trackColor }}
                >
                  {compact ? (
                    // Compact mode: just track number, edit button, and delete button
                    <div className="track-header-compact-content">
                      <span className="track-number-compact" style={{ color: trackColor }}>
                        {i + 1}
                      </span>
                      <div className="track-header-buttons-compact">
                        {showInstruments && onEditClick && (
                          <button
                            onClick={() => onEditClick(i)}
                            className="track-edit-button-compact"
                            title={`Edit Track ${i + 1}: ${currentPatch?.name || 'Unknown'}`}
                            aria-label={`Edit instrument for Track ${i + 1}`}
                          >
                            ✏️
                          </button>
                        )}
                        {onDeleteClick && (
                          <button
                            onClick={() => onDeleteClick(i)}
                            className="track-delete-button-compact"
                            title={`Delete Track ${i + 1}`}
                            aria-label={`Delete Track ${i + 1}`}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Full mode: track number, dropdown, and edit button
                    <div className="track-header-content">
                      <span className="track-number" style={{ color: trackColor }}>
                        Track {i + 1}
                      </span>
                      {showInstruments && currentPatch && (
                        <div className="track-instrument-selector">
                          <select
                            value={patchId}
                            onChange={(e) => onInstrumentChange(i, parseInt(e.target.value, 10))}
                            className="track-instrument-dropdown"
                            title={currentPatch.name}
                            aria-label={`Instrument for Track ${i + 1}`}
                          >
                            {instrumentBank.map((p, idx) => (
                              <option key={idx} value={idx} title={p.name}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => onEditClick(i)}
                            className="track-edit-button"
                            title={`Edit ${currentPatch.name}`}
                            aria-label={`Edit instrument for Track ${i + 1}`}
                          >
                            ✏️
                          </button>
                          {onDeleteClick && (
                            <button
                              onClick={() => onDeleteClick(i)}
                              className="track-delete-button"
                              title={`Delete Track ${i + 1}`}
                              aria-label={`Delete Track ${i + 1}`}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, row) => (
            <tr
              key={row}
              ref={row === currentRow ? currentRowRef : null}
              className={
                row === currentRow ? 'tracker-row current-row' : 'tracker-row'
              }
            >
              <td className="row-number">
                {row.toString().padStart(2, '0')}
              </td>
              {Array.from({ length: tracks }, (_, track) => (
                <td key={track} className="note-cell">
                  <input
                    type="text"
                    value={pattern[row][track]}
                    onChange={(e) =>
                      handleCellChange(row, track, e.target.value)
                    }
                    onKeyDown={(e) => handleKeyDown(e, row, track)}
                    onFocus={(e) => e.target.select()}
                    maxLength={4}
                    className={`note-input ${isInvalidNote(pattern[row][track]) ? 'invalid' : ''}`}
                    placeholder="---"
                    data-row={row}
                    data-track={track}
                    title={
                      isInvalidNote(pattern[row][track])
                        ? `Invalid note: ${pattern[row][track]}`
                        : ''
                    }
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
