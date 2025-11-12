/**
 * Collection Selector Component
 *
 * Allows users to browse and switch between instrument collections
 */

import type { InstrumentCatalog } from '../types/Catalog';
import './CollectionSelector.css';

export interface CollectionSelectorProps {
  /** The instrument catalog */
  catalog: InstrumentCatalog | null;

  /** Currently selected collection ID */
  currentCollectionId: string | null;

  /** Callback when collection is changed */
  onCollectionChange: (collectionId: string) => void;

  /** Whether the selector is disabled */
  disabled?: boolean;
}

export function CollectionSelector({
  catalog,
  currentCollectionId,
  onCollectionChange,
  disabled = false
}: CollectionSelectorProps) {
  if (!catalog) {
    return (
      <div className="collection-selector loading">
        <label>Instrument Collection:</label>
        <select disabled>
          <option>Loading...</option>
        </select>
      </div>
    );
  }

  const currentCollection = catalog.collections.find(c => c.id === currentCollectionId);

  return (
    <div className="collection-selector">
      <label>
        <span className="label-text">🎼 Collection:</span>
        <select
          value={currentCollectionId || ''}
          onChange={(e) => onCollectionChange(e.target.value)}
          disabled={disabled}
          className="collection-select"
        >
          {catalog.collections.map((collection) => (
            <option key={collection.id} value={collection.id}>
              {collection.name} ({collection.instrumentCount} instruments)
            </option>
          ))}
        </select>
      </label>

      {currentCollection && (
        <div className="collection-info">
          <p className="collection-description">
            {currentCollection.description}
          </p>
          {currentCollection.game && (
            <p className="collection-meta">
              <strong>Game:</strong> {currentCollection.game}
              {currentCollection.year && ` (${currentCollection.year})`}
            </p>
          )}
          {currentCollection.author && (
            <p className="collection-meta">
              <strong>Author:</strong> {currentCollection.author}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
