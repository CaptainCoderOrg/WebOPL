/**
 * Pattern Loader
 * Loads pattern files from YAML
 */

import yaml from 'js-yaml';
import type { PatternFile, PatternCatalogEntry } from '../types/PatternFile';

/**
 * Load the pattern catalog
 */
export async function loadPatternCatalog(): Promise<PatternCatalogEntry[]> {
  try {
    const response = await fetch('/patterns/catalog.json');
    if (!response.ok) {
      throw new Error(`Failed to load catalog: ${response.statusText}`);
    }
    const catalog = await response.json();
    return catalog;
  } catch (error) {
    console.error('[PatternLoader] Failed to load catalog:', error);
    throw error;
  }
}

/**
 * Load a pattern file by ID
 */
export async function loadPattern(patternId: string): Promise<PatternFile> {
  try {
    // Load catalog to get file name
    const catalog = await loadPatternCatalog();
    const entry = catalog.find(e => e.id === patternId);

    if (!entry) {
      throw new Error(`Pattern not found: ${patternId}`);
    }

    // Fetch the YAML file
    const response = await fetch(`/patterns/${entry.file}`);
    if (!response.ok) {
      throw new Error(`Failed to load pattern: ${response.statusText}`);
    }

    const yamlText = await response.text();
    const pattern = yaml.load(yamlText) as PatternFile;

    // Validate the pattern
    if (!pattern.name || !pattern.rows || !pattern.tracks || !pattern.pattern) {
      throw new Error('Invalid pattern file format');
    }

    // Validate dimensions
    if (pattern.pattern.length !== pattern.rows) {
      throw new Error(`Pattern has ${pattern.pattern.length} rows but declares ${pattern.rows}`);
    }

    for (let i = 0; i < pattern.pattern.length; i++) {
      if (pattern.pattern[i].length !== pattern.tracks) {
        throw new Error(`Row ${i} has ${pattern.pattern[i].length} tracks but declares ${pattern.tracks}`);
      }
    }

    console.log(`[PatternLoader] Loaded pattern: ${pattern.name} (${pattern.rows}×${pattern.tracks})`);
    return pattern;
  } catch (error) {
    console.error(`[PatternLoader] Failed to load pattern ${patternId}:`, error);
    throw error;
  }
}
