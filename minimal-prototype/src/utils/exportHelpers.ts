/**
 * Export Helper Utilities
 * Calculation and validation functions for export modal
 */

/**
 * Calculate pattern duration in seconds
 *
 * @param rows - Number of rows in pattern
 * @param bpm - Beats per minute
 * @param rowsPerBeat - Rows per beat (typically 4 for 16th note resolution)
 * @returns Duration in seconds
 *
 * @example
 * calculateDuration(64, 120, 4) // 8.0 seconds
 */
export function calculateDuration(
  rows: number,
  bpm: number,
  rowsPerBeat: number = 4
): number {
  const secondsPerRow = 60 / (bpm * rowsPerBeat);
  return rows * secondsPerRow;
}

/**
 * Calculate expected WAV file size
 * WAV PCM format: sampleRate × duration × 2 channels × 2 bytes + 44 byte header
 *
 * @param durationSeconds - Duration in seconds
 * @param sampleRate - Sample rate in Hz (default: 49716 for OPL3)
 * @returns File size in bytes
 *
 * @example
 * calculateFileSize(8.0, 49716) // ~1,589,312 bytes (1.52 MB)
 */
export function calculateFileSize(
  durationSeconds: number,
  sampleRate: number = 49716
): number {
  const samples = Math.floor(durationSeconds * sampleRate);
  const dataSize = samples * 2 * 2; // 2 channels × 2 bytes per sample
  return dataSize + 44; // + WAV header (44 bytes)
}

/**
 * Format file size as human-readable string
 *
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.52 MB", "256 KB", "128 bytes")
 *
 * @example
 * formatFileSize(1589312) // "1.52 MB"
 * formatFileSize(256000)  // "250.00 KB"
 * formatFileSize(128)     // "128 bytes"
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} bytes`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Format duration as human-readable string
 *
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "8.0s", "1m 30s")
 *
 * @example
 * formatDuration(8.0)   // "8.0s"
 * formatDuration(90.0)  // "1m 30s"
 * formatDuration(125.5) // "2m 6s"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}m ${secs}s`;
}

/**
 * Validate that pattern has at least one note
 *
 * @param pattern - Pattern data (2D array of cell strings)
 * @returns true if pattern has at least one note, false if empty
 *
 * @example
 * hasNotes([['C-4', '---'], ['---', 'E-4']]) // true
 * hasNotes([['---', '---'], ['---', '---']]) // false
 */
export function hasNotes(pattern: string[][]): boolean {
  return pattern.some(row =>
    row.some(cell => cell !== '---' && cell.trim() !== '')
  );
}

/**
 * Calculate duration with fade adjustments for standard export
 *
 * @param baseDuration - Base pattern duration in seconds
 * @param fadeInMs - Fade in duration in milliseconds (0 if disabled)
 * @param fadeOutMs - Fade out duration in milliseconds (0 if disabled)
 * @returns Total duration including fades
 *
 * @example
 * calculateDurationWithFades(8.0, 100, 500) // 8.6 seconds
 */
export function calculateDurationWithFades(
  baseDuration: number,
  fadeInMs: number,
  fadeOutMs: number
): number {
  const fadeInSec = fadeInMs / 1000;
  const fadeOutSec = fadeOutMs / 1000;
  return baseDuration + fadeInSec + fadeOutSec;
}

/**
 * Calculate duration for seamless loop export with multiple iterations
 *
 * @param baseDuration - Single pattern duration in seconds
 * @param loopCount - Number of loop iterations (1 or more)
 * @returns Total duration for all loops
 *
 * @example
 * calculateLoopDuration(8.0, 3) // 24.0 seconds (3 iterations)
 * calculateLoopDuration(8.0, 1) // 8.0 seconds (single loopable file)
 */
export function calculateLoopDuration(
  baseDuration: number,
  loopCount: number | 'infinite'
): number {
  // If infinite, export 1 iteration (user will loop in their player)
  const actualCount = loopCount === 'infinite' ? 1 : loopCount;
  return baseDuration * actualCount;
}

/**
 * Sanitize filename for safe file downloads
 * Removes/replaces characters that are invalid in filenames
 *
 * @param filename - Desired filename (without extension)
 * @returns Sanitized filename safe for all platforms
 *
 * @example
 * sanitizeFilename("My Song: Part 1") // "My Song - Part 1"
 * sanitizeFilename("Track #5/10")     // "Track 5-10"
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '-') // Replace invalid chars with dash
    .replace(/\s+/g, ' ')           // Collapse multiple spaces
    .trim()                         // Remove leading/trailing spaces
    .substring(0, 200);             // Limit length to 200 chars
}
