/**
 * TrackerGrid - Editable tracker note grid
 *
 * Displays a grid of note inputs with keyboard navigation.
 */

import React, { useEffect } from 'react';
import './TrackerGrid.css';
import { validateNote } from '../utils/patternValidation';

interface TrackerGridProps {
  rows: number;               // Number of rows (e.g., 16)
  tracks: number;             // Number of tracks (e.g., 4)
  pattern: string[][];        // [row][track] = "C-4" or "---"
  onUpdate: (pattern: string[][]) => void;
  currentRow?: number;        // Current playback row (for highlighting)
}

export function TrackerGrid({
  rows,
  tracks,
  pattern,
  onUpdate,
  currentRow,
}: TrackerGridProps) {
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
        // Clear cell on delete key
        handleCellChange(row, track, '---');
        e.preventDefault();
        break;

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
    <div className="tracker-grid-container">
      <table className="tracker-grid">
        <thead>
          <tr>
            <th className="row-header">Row</th>
            {Array.from({ length: tracks }, (_, i) => (
              <th key={i} className="track-header">
                Track {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, row) => (
            <tr
              key={row}
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
