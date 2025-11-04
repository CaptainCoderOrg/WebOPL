/**
 * Pattern File Format
 * Defines the structure for YAML pattern files
 */

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

  /** Instrument assignments (patch indices) */
  instruments: number[];

  /** Pattern data - array of rows, each row is an array of note strings */
  pattern: string[][];
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
