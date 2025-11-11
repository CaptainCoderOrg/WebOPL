/**
 * Type definitions for the instrument collection catalog system
 */

/**
 * Represents a single instrument collection in the catalog
 */
export interface CollectionEntry {
  /** Unique identifier (kebab-case) */
  id: string;

  /** Display name for UI */
  name: string;

  /** Brief description of collection */
  description: string;

  /** Category: dmx, ail, hmi, community, legacy */
  category: string;

  /** Relative path to JSON file */
  path: string;

  /** Source URL (GitHub, etc.) */
  source?: string;

  /** License type */
  license?: string;

  /** Original author/creator */
  author?: string;

  /** Associated game */
  game?: string;

  /** Year of creation */
  year?: number;

  /** Number of instruments in collection */
  instrumentCount: number;

  /** Searchable tags */
  tags?: string[];

  /** Is this the default collection? */
  isDefault?: boolean;
}

/**
 * The master catalog structure
 */
export interface InstrumentCatalog {
  /** Catalog version */
  version: string;

  /** Last update date (YYYY-MM-DD) */
  lastUpdated: string;

  /** Path to default collection */
  defaultCollection: string;

  /** Array of all collections */
  collections: CollectionEntry[];
}

/**
 * Instrument collection file format
 */
export interface InstrumentCollection {
  /** Collection name */
  name: string;

  /** Collection version */
  version: string;

  /** Source URL */
  source: string;

  /** License */
  license: string;

  /** Author */
  author?: string;

  /** Associated game */
  game?: string;

  /** Year */
  year?: number;

  /** Array of instruments */
  instruments: any[]; // OPLPatch type from existing code
}
