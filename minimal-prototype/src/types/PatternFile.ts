/**
 * Pattern File Format
 * Defines the structure for YAML pattern files
 */

/**
 * Extended pattern cell with velocity and effects
 */
export interface PatternCell {
  /** Note name (e.g., "C-4", "---", "OFF") */
  n: string;
  /** Velocity (0-64, default: 64 = full volume) */
  v?: number;
  /** Effect command (e.g., "EC8", "ED4") */
  fx?: string;
}

/**
 * Pattern cell can be either a simple string or an extended object
 */
export type PatternCellData = string | PatternCell;

export interface PatternFile {
  /** Pattern metadata */
  name: string;
  description?: string;
  author?: string;

  /** Grid dimensions */
  rows: number;
  tracks: number;

  /** Tempo */
  bpm?: number;

  /** Timing resolution (rows per beat, default: 4 = 16th notes) */
  rowsPerBeat?: number;

  /** Tick resolution (ticks per row, default: 6) */
  ticksPerRow?: number;

  /** Instrument assignments (patch indices) */
  instruments: number[];

  /** Pattern data - array of rows, each row is an array of cells (string or object) */
  pattern: PatternCellData[][];
}

/**
 * Pattern catalog entry
 */
export interface PatternCatalogEntry {
  id: string;
  name: string;
  description?: string;
  file: string;
}
