/**
 * Catalog Loader
 *
 * Loads the instrument collection catalog and individual collections.
 * Provides caching and fallback to legacy GENMIDI.json for backward compatibility.
 */

import type { InstrumentCatalog, CollectionEntry, InstrumentCollection } from '../types/Catalog';
import type { OPLPatch, InstrumentBank } from '../types/OPLPatch';

// Cache for loaded collections
const collectionCache = new Map<string, InstrumentBank>();

// Cache for catalog
let catalogCache: InstrumentCatalog | null = null;

/**
 * Transform JSON instrument format to OPLPatch format
 * Converts abbreviated field names (multi, attack, etc.) to full names (frequencyMultiplier, attackRate, etc.)
 */
function transformInstrument(json: any): OPLPatch {
  const voice1 = transformVoice(json.voice1);

  return {
    id: json.id,
    name: json.name,
    // Backward compatibility: populate top-level fields from voice1
    modulator: voice1.modulator,
    carrier: voice1.carrier,
    feedback: voice1.feedback,
    connection: voice1.connection === 1 ? 'additive' : 'fm',
    noteOffset: voice1.noteOffset,
    // Dual-voice support
    voice1: voice1,
    voice2: transformVoice(json.voice2),
    isDualVoice: json.isDualVoice !== undefined ? json.isDualVoice : false,
    isCustom: json.isCustom !== undefined ? json.isCustom : false
  };
}

/**
 * Transform JSON voice format to OPLVoice format
 */
function transformVoice(json: any): any {
  return {
    modulator: transformOperator(json.mod),
    carrier: transformOperator(json.car),
    feedback: json.feedback,
    connection: json.additive ? 1 : 0, // additive = 1 (parallel), else 0 (serial)
    noteOffset: json.baseNote || 0
  };
}

/**
 * Transform JSON operator format to OPLOperator format
 * Maps abbreviated field names to full field names
 */
function transformOperator(json: any): any {
  return {
    attackRate: json.attack,
    decayRate: json.decay,
    sustainLevel: json.sustain,
    releaseRate: json.release,
    frequencyMultiplier: json.multi,
    waveform: json.wave,
    outputLevel: json.out,
    keyScaleLevel: json.ksl,
    amplitudeModulation: json.trem,
    vibrato: json.vib,
    envelopeType: json.sus,
    keyScaleRate: json.ksr
  };
}

/**
 * Load the master catalog
 *
 * @returns The instrument collection catalog
 * @throws Error if catalog cannot be loaded
 */
export async function loadCatalog(): Promise<InstrumentCatalog> {
  // Return cached catalog if available
  if (catalogCache) {
    console.log('[Catalog] Using cached catalog');
    return catalogCache;
  }

  console.log('[Catalog] Loading instrument collection catalog...');

  try {
    const response = await fetch('/instruments/catalog.json');

    if (!response.ok) {
      throw new Error(`Failed to fetch catalog: ${response.status} ${response.statusText}`);
    }

    const catalog: InstrumentCatalog = await response.json();

    console.log(`[Catalog] Loaded catalog with ${catalog.collections.length} collections`);
    console.log(`[Catalog] Default collection: ${catalog.defaultCollection}`);

    // Cache the catalog
    catalogCache = catalog;

    return catalog;
  } catch (error) {
    console.error('[Catalog] Failed to load catalog:', error);

    // Fallback: Try to load legacy GENMIDI.json directly
    console.log('[Catalog] Falling back to legacy GENMIDI.json');
    return createLegacyCatalog();
  }
}

/**
 * Create a minimal catalog for legacy GENMIDI.json
 * Used as fallback if catalog.json doesn't exist
 */
async function createLegacyCatalog(): Promise<InstrumentCatalog> {
  return {
    version: '1.0',
    lastUpdated: new Date().toISOString().split('T')[0],
    defaultCollection: 'GENMIDI.json',
    collections: [
      {
        id: 'genmidi-legacy',
        name: 'GENMIDI (Default)',
        description: 'Legacy GENMIDI instrument bank',
        category: 'legacy',
        path: 'GENMIDI.json',
        instrumentCount: 128,
        tags: ['legacy', 'default'],
        isDefault: true
      }
    ]
  };
}

/**
 * Load a collection by ID from the catalog
 *
 * @param catalog - The catalog to search
 * @param collectionId - The collection ID to load
 * @returns The instrument bank
 * @throws Error if collection not found or cannot be loaded
 */
export async function loadCollectionById(
  catalog: InstrumentCatalog,
  collectionId: string
): Promise<InstrumentBank> {
  const entry = catalog.collections.find(c => c.id === collectionId);

  if (!entry) {
    throw new Error(`Collection not found: ${collectionId}`);
  }

  return loadCollection(entry);
}

/**
 * Load a collection from a catalog entry
 *
 * @param entry - The collection entry from the catalog
 * @returns The instrument bank
 * @throws Error if collection cannot be loaded
 */
export async function loadCollection(entry: CollectionEntry): Promise<InstrumentBank> {
  // Check cache first
  if (collectionCache.has(entry.id)) {
    console.log(`[Catalog] Using cached collection: ${entry.name}`);
    return collectionCache.get(entry.id)!;
  }

  console.log(`[Catalog] Loading collection: ${entry.name} (${entry.path})`);

  try {
    const response = await fetch(`/instruments/${entry.path}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch collection: ${response.status} ${response.statusText}`);
    }

    const json: InstrumentCollection = await response.json();

    console.log(`[Catalog] Loaded ${json.instruments.length} instruments from ${json.name}`);

    // Convert to InstrumentBank format
    // Transform abbreviated JSON field names to full TypeScript field names
    const bank: InstrumentBank = {
      name: json.name,
      version: json.version,
      patches: json.instruments.map((inst: any) => transformInstrument(inst)),
      metadata: {
        source: json.source,
        license: json.license,
        author: json.author,
        game: json.game,
        year: json.year
      }
    };

    // Cache the collection
    collectionCache.set(entry.id, bank);

    return bank;
  } catch (error) {
    console.error(`[Catalog] Failed to load collection ${entry.name}:`, error);
    throw error;
  }
}

/**
 * Load the default collection from the catalog
 *
 * @param catalog - The catalog to use
 * @returns The default instrument bank
 * @throws Error if default collection cannot be loaded
 */
export async function loadDefaultCollection(catalog: InstrumentCatalog): Promise<InstrumentBank> {
  console.log('[Catalog] Loading default collection...');

  // Find the default collection entry
  const defaultEntry = catalog.collections.find(c => c.isDefault) || catalog.collections[0];

  if (!defaultEntry) {
    throw new Error('No default collection found in catalog');
  }

  return loadCollection(defaultEntry);
}

/**
 * Get a collection entry by ID
 *
 * @param catalog - The catalog to search
 * @param collectionId - The collection ID
 * @returns The collection entry or undefined if not found
 */
export function getCollectionEntry(
  catalog: InstrumentCatalog,
  collectionId: string
): CollectionEntry | undefined {
  return catalog.collections.find(c => c.id === collectionId);
}

/**
 * Get all collection entries from a catalog, optionally filtered by category
 *
 * @param catalog - The catalog to query
 * @param category - Optional category filter
 * @returns Array of collection entries
 */
export function getCollections(
  catalog: InstrumentCatalog,
  category?: string
): CollectionEntry[] {
  if (category) {
    return catalog.collections.filter(c => c.category === category);
  }
  return catalog.collections;
}

/**
 * Get unique categories from the catalog
 *
 * @param catalog - The catalog to query
 * @returns Array of unique category names
 */
export function getCategories(catalog: InstrumentCatalog): string[] {
  const categories = new Set(catalog.collections.map(c => c.category));
  return Array.from(categories).sort();
}

/**
 * Search collections by name or tags
 *
 * @param catalog - The catalog to search
 * @param query - Search query string
 * @returns Array of matching collection entries
 */
export function searchCollections(
  catalog: InstrumentCatalog,
  query: string
): CollectionEntry[] {
  const lowerQuery = query.toLowerCase();

  return catalog.collections.filter(c => {
    // Search in name
    if (c.name.toLowerCase().includes(lowerQuery)) return true;

    // Search in description
    if (c.description.toLowerCase().includes(lowerQuery)) return true;

    // Search in game
    if (c.game?.toLowerCase().includes(lowerQuery)) return true;

    // Search in author
    if (c.author?.toLowerCase().includes(lowerQuery)) return true;

    // Search in tags
    if (c.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))) return true;

    return false;
  });
}

/**
 * Clear the collection cache
 * Useful for debugging or forcing reload
 */
export function clearCollectionCache(): void {
  collectionCache.clear();
  console.log('[Catalog] Collection cache cleared');
}

/**
 * Clear the catalog cache
 * Useful for debugging or forcing reload
 */
export function clearCatalogCache(): void {
  catalogCache = null;
  console.log('[Catalog] Catalog cache cleared');
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  clearCollectionCache();
  clearCatalogCache();
  console.log('[Catalog] All caches cleared');
}
