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
 * @param pattern - 2D array of note strings
 * @returns Validation result with errors
 */
export function validatePattern(pattern: string[][]): ValidationResult {
  const errors: ValidationError[] = [];

  pattern.forEach((row, rowIndex) => {
    row.forEach((cell, trackIndex) => {
      // Skip empty cells (they're valid rests)
      if (!cell || cell.trim() === '') {
        return;
      }

      // Check if note is valid
      if (!isValidNoteName(cell)) {
        errors.push({
          row: rowIndex,
          track: trackIndex,
          value: cell,
          message: `Invalid note: "${cell}"`,
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
