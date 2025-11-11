/**
 * Tracker Component
 * Self-contained music tracker with controls, instrument selection, grid, and guide
 */

import { useState, useEffect } from 'react';
import type { SimpleSynth } from '../SimpleSynth';
import type { SimplePlayer } from '../SimplePlayer';
import type { TrackerPattern, TrackerNote } from '../SimplePlayer';
import type { OPLPatch } from '../types/OPLPatch';
import type { PatternCatalogEntry } from '../types/PatternFile';
import type { InstrumentCatalog } from '../types/Catalog';
import { noteNameToMIDI } from '../utils/noteConversion';
import { validatePattern, formatValidationErrors } from '../utils/patternValidation';
import { loadPatternCatalog, loadPattern } from '../utils/patternLoader';
import { hasNotes } from '../utils/exportHelpers';
import { TrackerGrid } from './TrackerGrid';
import { Modal } from './Modal';
import { ExportModal } from './ExportModal';
import { ErrorBoundary } from './ErrorBoundary';
import { CollectionSelector } from './CollectionSelector';
import './Tracker.css';

export interface TrackerProps {
  /** SimpleSynth instance */
  synth: SimpleSynth | null;

  /** SimplePlayer instance */
  player: SimplePlayer | null;

  /** Available instrument bank */
  instrumentBank: OPLPatch[];

  /** Whether instrument bank is loaded */
  bankLoaded: boolean;

  /** Bank loading error message */
  bankError: string | null;

  /** Callback when user clicks edit on an instrument */
  onEditInstrument: (trackId: number) => void;

  /** Instrument catalog */
  catalog?: InstrumentCatalog | null;

  /** Currently selected collection ID */
  currentCollectionId?: string | null;

  /** Callback when collection changes */
  onCollectionChange?: (collectionId: string) => void;
}

export function Tracker({
  synth,
  player,
  instrumentBank,
  bankLoaded,
  bankError,
  onEditInstrument,
  catalog,
  currentCollectionId,
  onCollectionChange,
}: TrackerProps) {
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentRow, setCurrentRow] = useState(0);
  const [bpm, setBpm] = useState(120);

  // Track count (dynamic)
  const [numTracks, setNumTracks] = useState(4);

  // Row count (dynamic, 8-128, increments of 4)
  const [numRows, setNumRows] = useState(16);

  // Pattern state: numRows rows × numTracks tracks
  const [pattern, setPattern] = useState<string[][]>(() =>
    Array(numRows)
      .fill(null)
      .map(() => Array(numTracks).fill('---'))
  );

  // Instrument selection: Track 0-(numTracks-1) → Patch index in instrumentBank
  const [trackInstruments, setTrackInstruments] = useState<number[]>(
    Array(numTracks).fill(0).map((_, i) => Math.min(i, 3))
  );

  // Quick guide collapsed state
  const [guideCollapsed, setGuideCollapsed] = useState(false);

  // Compact mode state (narrow columns, minimal headers)
  const [compactMode, setCompactMode] = useState(false);

  // Pattern catalog
  const [patternCatalog, setPatternCatalog] = useState<PatternCatalogEntry[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  // Selected example pattern
  const [selectedExample, setSelectedExample] = useState<string>('major-scale');

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);

  /**
   * Load pattern catalog on mount
   */
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const catalog = await loadPatternCatalog();
        setPatternCatalog(catalog);
        setCatalogLoaded(true);
        console.log('[Tracker] Loaded pattern catalog:', catalog.length, 'patterns');
      } catch (error) {
        console.error('[Tracker] Failed to load pattern catalog:', error);
        // Continue with empty catalog
        setCatalogLoaded(true);
      }
    };

    loadCatalog();
  }, []);

  /**
   * Set up player row change callback
   */
  useEffect(() => {
    if (!player) return;

    player.setOnRowChange((row) => {
      setCurrentRow(row);
    });
  }, [player]);

  /**
   * Initialize track patches when instrument bank loads
   */
  useEffect(() => {
    if (!synth || !bankLoaded) return;

    console.log('[Tracker] Initializing track patches...');
    trackInstruments.forEach((patchId, trackIndex) => {
      if (instrumentBank[patchId]) {
        synth.setTrackPatch(trackIndex, instrumentBank[patchId]);
        console.log(`[Tracker] Track ${trackIndex} -> Patch ${patchId}: ${instrumentBank[patchId].name}`);
      }
    });
  }, [synth, bankLoaded, instrumentBank, trackInstruments]);

  /**
   * Global keyboard handler for Space (Play/Stop)
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Space when not focused on an input element
      if (e.key === ' ' && e.target instanceof HTMLElement && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        handlePlayStop();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, player, pattern, bpm]);

  /**
   * Play/Stop toggle
   */
  const handlePlayStop = () => {
    if (!player) return;

    if (isPlaying) {
      // Stop
      player.stop();
      setIsPlaying(false);
      setCurrentRow(0);
    } else {
      // Check if pattern is completely empty
      const hasNotes = pattern.some(row =>
        row.some(cell => cell !== '---' && cell.trim() !== '')
      );

      if (!hasNotes) {
        console.warn('Pattern is empty');
        alert('Pattern is empty!\n\nLoad an example or enter some notes.');
        return;
      }

      // Validate pattern before playing
      const validation = validatePattern(pattern);

      if (!validation.valid) {
        console.error('Pattern validation failed:', validation.errors);

        // Show error to user
        const errorMessage = formatValidationErrors(validation.errors);
        alert(
          'Cannot play: Pattern contains invalid notes\n\n' + errorMessage
        );
        return;
      }

      // Play
      console.log('--- Converting pattern to tracker format ---');
      console.log('✅ Pattern validation passed');

      // Convert string pattern to TrackerPattern
      const trackerPattern: TrackerPattern = {
        bpm: bpm,
        stepsPerBeat: 4, // 16th notes
        rows: pattern.map((row) =>
          row.map((cell) => {
            const note = noteNameToMIDI(cell);
            return {
              note: note,
              instrument: 0,
            } as TrackerNote;
          })
        ),
      };

      player.loadPattern(trackerPattern);
      player.play();
      setIsPlaying(true);
    }
  };

  /**
   * Handle BPM change with validation
   */
  const handleBPMChange = (value: string) => {
    const num = parseInt(value, 10);

    // Allow empty or invalid while typing
    if (isNaN(num)) {
      setBpm(120); // Reset to default
      return;
    }

    // Clamp to valid range
    let newBpm: number;
    if (num < 60) {
      newBpm = 60;
    } else if (num > 240) {
      newBpm = 240;
    } else {
      newBpm = num;
    }

    setBpm(newBpm);

    // Update player if currently playing
    if (player && isPlaying) {
      player.setBPM(newBpm);
    }
  };

  /**
   * Load example pattern from YAML file
   */
  const loadExample = async () => {
    if (isPlaying) return;

    try {
      console.log(`[Tracker] Loading pattern: ${selectedExample}`);

      // Load the pattern file
      const patternFile = await loadPattern(selectedExample);

      // Set grid dimensions
      setNumRows(patternFile.rows);
      setNumTracks(patternFile.tracks);

      // Set BPM if specified
      if (patternFile.bpm) {
        setBpm(patternFile.bpm);
      }

      // Set pattern data
      setPattern(patternFile.pattern);

      // Set instrument assignments
      setTrackInstruments(patternFile.instruments);

      // Initialize patches for tracks
      if (synth && bankLoaded) {
        patternFile.instruments.forEach((patchId, trackIndex) => {
          if (instrumentBank[patchId]) {
            synth.setTrackPatch(trackIndex, instrumentBank[patchId]);
          }
        });
      }

      console.log(`[Tracker] Pattern loaded: ${patternFile.name} (${patternFile.rows}×${patternFile.tracks})`);
    } catch (error) {
      console.error('[Tracker] Failed to load pattern:', error);
      alert(`Failed to load pattern: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  /**
   * Clear pattern
   */
  const clearPattern = () => {
    setPattern(
      Array(numRows)
        .fill(null)
        .map(() => Array(numTracks).fill('---'))
    );
    console.log('Pattern cleared');
  };

  /**
   * Add a new track
   */
  const addTrack = () => {
    if (isPlaying) return;

    // Limit to 18 tracks (OPL3 has 18 channels)
    if (numTracks >= 18) {
      console.warn('Maximum track limit reached (18 tracks)');
      alert('Maximum track limit reached!\n\nThe OPL3 synthesizer supports up to 18 simultaneous channels.');
      return;
    }

    console.log('Adding new track...');

    // Add a new column to each row
    const newPattern = pattern.map(row => [...row, '---']);
    setPattern(newPattern);

    // Add a new instrument (cycle through 0-3 for visual distinction)
    const newInstruments = [...trackInstruments, numTracks % 4];
    setTrackInstruments(newInstruments);

    // Initialize patch for new track
    if (synth && bankLoaded && instrumentBank[numTracks % 4]) {
      synth.setTrackPatch(numTracks, instrumentBank[numTracks % 4]);
    }

    // Increment track count
    setNumTracks(numTracks + 1);
    console.log(`Track ${numTracks + 1} added`);
  };

  /**
   * Handle instrument selection change
   */
  const handleInstrumentChange = (trackIndex: number, patchId: number) => {
    console.log(`Track ${trackIndex} → Patch ${patchId}: ${instrumentBank[patchId]?.name}`);

    // Update track instruments array
    const newInstruments = [...trackInstruments];
    newInstruments[trackIndex] = patchId;
    setTrackInstruments(newInstruments);

    // Set patch for this track
    if (synth && instrumentBank[patchId]) {
      synth.setTrackPatch(trackIndex, instrumentBank[patchId]);
    }
  };

  /**
   * Delete a track
   */
  const handleDeleteTrack = (trackIndex: number) => {
    if (isPlaying) return;

    // Check if track has any notes
    const hasNotes = pattern.some(row => {
      const cell = row[trackIndex];
      return cell !== '---' && cell.trim() !== '';
    });

    // Confirm deletion if track has notes
    if (hasNotes) {
      const confirmed = window.confirm(
        `Track ${trackIndex + 1} contains notes.\n\nAre you sure you want to delete it?`
      );
      if (!confirmed) return;
    }

    console.log(`Deleting track ${trackIndex + 1}...`);

    // Remove the column from each row
    const newPattern = pattern.map(row => {
      const newRow = [...row];
      newRow.splice(trackIndex, 1);
      return newRow;
    });
    setPattern(newPattern);

    // Remove the instrument
    const newInstruments = [...trackInstruments];
    newInstruments.splice(trackIndex, 1);
    setTrackInstruments(newInstruments);

    // Decrement track count
    setNumTracks(numTracks - 1);
    console.log(`Track ${trackIndex + 1} deleted`);
  };

  /**
   * Increase number of rows
   */
  const increaseRows = () => {
    if (isPlaying || numRows >= 128) return;

    const newNumRows = Math.min(numRows + 4, 128);
    console.log(`Increasing rows from ${numRows} to ${newNumRows}...`);

    // Add new rows to the pattern
    const newPattern = [...pattern];
    for (let i = 0; i < (newNumRows - numRows); i++) {
      newPattern.push(Array(numTracks).fill('---'));
    }
    setPattern(newPattern);
    setNumRows(newNumRows);
  };

  /**
   * Decrease number of rows
   */
  const decreaseRows = () => {
    if (isPlaying || numRows <= 8) return;

    const newNumRows = Math.max(numRows - 4, 8);
    console.log(`Decreasing rows from ${numRows} to ${newNumRows}...`);

    // Check if any of the rows we're removing have notes
    const rowsToRemove = pattern.slice(newNumRows);
    const hasNotes = rowsToRemove.some(row =>
      row.some(cell => cell !== '---' && cell.trim() !== '')
    );

    if (hasNotes) {
      const confirmed = window.confirm(
        `Rows ${newNumRows + 1}-${numRows} contain notes.\n\nAre you sure you want to remove them?`
      );
      if (!confirmed) return;
    }

    // Remove rows from the pattern
    const newPattern = pattern.slice(0, newNumRows);
    setPattern(newPattern);
    setNumRows(newNumRows);
  };

  return (
    <div className="tracker">
      {/* Controls */}
      <div className="tracker-controls">
        <div className="control-group">
          <button
            onClick={handlePlayStop}
            disabled={!player}
            className={isPlaying ? 'btn-stop' : 'btn-play'}
          >
            {isPlaying ? '⏹ Stop' : '▶ Play'}
          </button>

          <label className="control-label">
            BPM:
            <input
              type="number"
              value={bpm}
              onChange={(e) => handleBPMChange(e.target.value)}
              min={60}
              max={240}
              className="bpm-input"
            />
          </label>

          <div className="position-control">
            <button
              onClick={decreaseRows}
              disabled={isPlaying || numRows <= 8}
              className="row-control-button"
              title="Decrease rows by 4"
            >
              −
            </button>
            <div className="position-display">
              Row: {currentRow.toString().padStart(2, '0')} / {numRows}
            </div>
            <button
              onClick={increaseRows}
              disabled={isPlaying || numRows >= 128}
              className="row-control-button"
              title="Increase rows by 4"
            >
              +
            </button>
          </div>
        </div>

        <div className="control-group">
          <label className="control-label">
            Example:
            <select
              value={selectedExample}
              onChange={(e) => setSelectedExample(e.target.value)}
              disabled={isPlaying || !catalogLoaded}
              className="example-selector"
            >
              {catalogLoaded && patternCatalog.length > 0 ? (
                patternCatalog.map((entry) => (
                  <option key={entry.id} value={entry.id} title={entry.description}>
                    {entry.name}
                  </option>
                ))
              ) : (
                <option value="">Loading patterns...</option>
              )}
            </select>
          </label>
          <button onClick={loadExample} disabled={isPlaying || !catalogLoaded}>
            📝 Load
          </button>
          <button onClick={clearPattern} disabled={isPlaying}>
            🗑️ Clear
          </button>
          <button
            onClick={() => setCompactMode(!compactMode)}
            className={compactMode ? 'btn-compact-active' : ''}
            title={compactMode ? 'Switch to full view' : 'Switch to compact view'}
          >
            {compactMode ? '📏 Full' : '📐 Compact'}
          </button>
          <button
            onClick={addTrack}
            disabled={isPlaying || numTracks >= 18}
            title={
              numTracks >= 18
                ? 'Maximum track limit reached (18 tracks)'
                : 'Add a new track'
            }
          >
            + Track
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            disabled={isPlaying || !hasNotes(pattern)}
            title={
              !hasNotes(pattern)
                ? 'Pattern is empty - add some notes first'
                : 'Export pattern to WAV file'
            }
          >
            💾 Export
          </button>
        </div>
      </div>

      {/* Collection Selector */}
      {catalog && onCollectionChange && (
        <CollectionSelector
          catalog={catalog}
          currentCollectionId={currentCollectionId || null}
          onCollectionChange={onCollectionChange}
          disabled={isPlaying || !bankLoaded}
        />
      )}

      {/* Instrument Bank Status */}
      {!bankLoaded && (
        <div className="loading-instruments">
          <div className="loading-spinner-small"></div>
          <span>Loading instrument bank...</span>
        </div>
      )}

      {bankError && (
        <div className="instrument-warning">
          ⚠️ Could not load GENMIDI: {bankError}
          <br />
          <small>Using {instrumentBank.length} default instruments</small>
        </div>
      )}

      {/* Tracker Grid */}
      <div className="tracker-section">
        <TrackerGrid
          rows={numRows}
          tracks={numTracks}
          pattern={pattern}
          onUpdate={setPattern}
          currentRow={isPlaying ? currentRow : undefined}
          trackInstruments={bankLoaded ? trackInstruments : undefined}
          instrumentBank={bankLoaded ? instrumentBank : undefined}
          onInstrumentChange={bankLoaded ? handleInstrumentChange : undefined}
          onEditClick={bankLoaded ? onEditInstrument : undefined}
          onDeleteClick={handleDeleteTrack}
          compact={compactMode}
        />
      </div>

      {/* Quick Guide */}
      <div className="tracker-guide">
        <button
          className="guide-toggle"
          onClick={() => setGuideCollapsed(!guideCollapsed)}
        >
          <span className="guide-toggle-icon">
            {guideCollapsed ? '▶' : '▼'}
          </span>
          <h3>📖 Quick Guide</h3>
        </button>

        {!guideCollapsed && (
          <div className="guide-content">
            <div className="help-columns">
              <div>
                <h4>🎹 Note Entry:</h4>
                <ul>
                  <li>
                    <strong>Format:</strong> C-4, D-4, E-4, F-4, G-4, A-4, B-4
                  </li>
                  <li>
                    <strong>Sharps:</strong> C#4, D#4, F#4, G#4, A#4
                  </li>
                  <li>
                    <strong>Sustain:</strong> --- (sustains previous note)
                  </li>
                  <li>
                    <strong>Note Off:</strong> OFF (stops the note)
                  </li>
                  <li>
                    <strong>Middle C:</strong> C-4 = MIDI 60
                  </li>
                  <li>
                    <strong>Octaves:</strong> C-0 to G-9
                  </li>
                </ul>
              </div>
              <div>
                <h4>⌨️ Navigation:</h4>
                <ul>
                  <li>
                    <strong>Arrow keys:</strong> Move between cells
                  </li>
                  <li>
                    <strong>Enter:</strong> Move down
                  </li>
                  <li>
                    <strong>Tab:</strong> Move right
                  </li>
                  <li>
                    <strong>Space:</strong> Play/Stop (when not editing)
                  </li>
                  <li>
                    <strong>Escape:</strong> Stop playback
                  </li>
                </ul>
              </div>
              <div>
                <h4>🎼 Note Entry:</h4>
                <ul>
                  <li>
                    <strong>A-G:</strong> Change note letter (or create new)
                  </li>
                  <li>
                    <strong>0-9:</strong> Change octave
                  </li>
                  <li>
                    <strong>#:</strong> Toggle sharp
                  </li>
                  <li>
                    <strong>Delete / -:</strong> Set to --- (advance)
                  </li>
                  <li>
                    <strong>O:</strong> Set to OFF (advance)
                  </li>
                </ul>
              </div>
            </div>

            <div className="help-tips">
              <h4>💡 Tips:</h4>
              <ul>
                <li>
                  Invalid notes appear in <span style={{ color: '#ff4444' }}>red</span>
                </li>
                <li>
                  Current playback row is <span style={{ color: '#00ff00' }}>highlighted</span>
                </li>
                <li>Pattern loops automatically</li>
                <li>BPM range: 60-240</li>
                <li>16 rows = 1 bar at 16th note resolution</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <Modal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          title="Export to WAV"
          width="medium"
        >
          <ErrorBoundary>
            <ExportModal
              patternName={selectedExample || 'Untitled Pattern'}
              pattern={pattern}
              trackInstruments={trackInstruments}
              instrumentBank={instrumentBank}
              bpm={bpm}
              onClose={() => setShowExportModal(false)}
              onExportComplete={(filename) => {
                console.log(`[Tracker] Export complete: ${filename}`);
              }}
            />
          </ErrorBoundary>
        </Modal>
      )}
    </div>
  );
}
