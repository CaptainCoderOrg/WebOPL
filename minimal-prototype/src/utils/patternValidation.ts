/**
 * Pattern Validation Utilities
 */

import { isValidNoteName } from './noteConversion';

export interface ValidationError {
  row: number;
  track: number;
  value: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate entire pattern
 * @param pattern - 2D array of note strings or objects
 * @returns Validation result with errors
 */
export function validatePattern(pattern: (string | { n: string; v?: number })[][]): ValidationResult {
  const errors: ValidationError[] = [];

  pattern.forEach((row, rowIndex) => {
    row.forEach((cell, trackIndex) => {
      // Extract note string from cell (handle both string and object formats)
      let noteStr: string;

      if (typeof cell === 'object' && cell !== null) {
        noteStr = cell.n;
      } else if (typeof cell === 'string') {
        noteStr = cell;
      } else {
        return; // Skip null/undefined
      }

      // Skip empty cells (they're valid rests)
      if (!noteStr || noteStr.trim() === '') {
        return;
      }

      // Check if note is valid
      if (!isValidNoteName(noteStr)) {
        errors.push({
          row: rowIndex,
          track: trackIndex,
          value: noteStr,
          message: `Invalid note: "${noteStr}"`,
        });
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a single note
 * @param note - Note string to validate
 * @returns True if valid note, rest, or OFF command
 */
export function validateNote(note: string): boolean {
  if (!note || note.trim() === '' || note === '---') {
    return true; // Rest is valid
  }

  if (note.trim().toUpperCase() === 'OFF') {
    return true; // OFF command is valid
  }

  return isValidNoteName(note);
}

/**
 * Get validation error message for display
 * @param errors - Array of validation errors
 * @returns Formatted error message
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return '';
  }

  const lines = errors.map((err) => {
    const rowStr = (err.row + 1).toString().padStart(2, '0');
    const trackStr = (err.track + 1).toString();
    return `Row ${rowStr}, Track ${trackStr}: ${err.message}`;
  });

  return lines.slice(0, 5).join('\n') +
    (errors.length > 5 ? `\n... and ${errors.length - 5} more errors` : '');
}
