/**
 * Tracker Component
 * Self-contained music tracker with controls, instrument selection, grid, and guide
 */

import { useState, useEffect } from 'react';
import type { SimpleSynth } from '../SimpleSynth';
import type { SimplePlayer } from '../SimplePlayer';
import type { TrackerPattern, TrackerNote } from '../SimplePlayer';
import type { OPLPatch } from '../types/OPLPatch';
import { noteNameToMIDI } from '../utils/noteConversion';
import { validatePattern, formatValidationErrors } from '../utils/patternValidation';
import { TrackerGrid } from './TrackerGrid';
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
}

export function Tracker({
  synth,
  player,
  instrumentBank,
  bankLoaded,
  bankError,
  onEditInstrument,
}: TrackerProps) {
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentRow, setCurrentRow] = useState(0);
  const [bpm, setBpm] = useState(120);

  // Track count (dynamic)
  const [numTracks, setNumTracks] = useState(4);

  // Row count (dynamic, 8-64, increments of 4)
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

  // Selected example pattern
  const [selectedExample, setSelectedExample] = useState<string>('major-scale');

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
   * Load example pattern
   */
  const loadExample = () => {
    if (isPlaying) return;

    console.log(`Loading example pattern: ${selectedExample}`);

    if (selectedExample === 'rpg-adventure') {
      // RPG Adventure: 64 rows, 8 tracks
      // Set up the grid size first
      setNumRows(64);
      setNumTracks(8);

      // Create 64x8 pattern
      const example: string[][] = Array(64)
        .fill(null)
        .map(() => Array(8).fill('---'));

      // Track 0: Main melody (Lead instrument)
      // Bar 1 (rows 0-15): A minor melody
      example[0][0] = 'A-4';
      example[4][0] = 'C-5';
      example[8][0] = 'E-5';
      example[12][0] = 'D-5';
      // Bar 2 (rows 16-31): Development
      example[16][0] = 'C-5';
      example[20][0] = 'A-4';
      example[24][0] = 'G-4';
      example[28][0] = 'A-4';
      // Bar 3 (rows 32-47): Climax
      example[32][0] = 'F-5';
      example[36][0] = 'E-5';
      example[40][0] = 'D-5';
      example[44][0] = 'C-5';
      // Bar 4 (rows 48-63): Resolution
      example[48][0] = 'E-5';
      example[52][0] = 'D-5';
      example[56][0] = 'C-5';
      example[60][0] = 'A-4';

      // Track 1: Counter melody
      example[2][1] = 'E-4';
      example[6][1] = 'G-4';
      example[10][1] = 'A-4';
      example[14][1] = 'G-4';
      example[18][1] = 'E-4';
      example[22][1] = 'G-4';
      example[26][1] = 'E-4';
      example[30][1] = 'D-4';
      example[34][1] = 'A-4';
      example[38][1] = 'C-5';
      example[42][1] = 'G-4';
      example[46][1] = 'A-4';
      example[50][1] = 'C-5';
      example[54][1] = 'B-4';
      example[58][1] = 'A-4';
      example[62][1] = 'G-4';

      // Track 2: Bass line (walking bass)
      example[0][2] = 'A-2';
      example[4][2] = 'A-2';
      example[8][2] = 'A-2';
      example[12][2] = 'A-2';
      example[16][2] = 'C-3';
      example[20][2] = 'C-3';
      example[24][2] = 'G-2';
      example[28][2] = 'G-2';
      example[32][2] = 'F-2';
      example[36][2] = 'F-2';
      example[40][2] = 'G-2';
      example[44][2] = 'G-2';
      example[48][2] = 'A-2';
      example[52][2] = 'E-2';
      example[56][2] = 'A-2';
      example[60][2] = 'A-2';

      // Track 3: Chord progression
      example[0][3] = 'C-4';
      example[8][3] = 'E-4';
      example[16][3] = 'E-4';
      example[24][3] = 'D-4';
      example[32][3] = 'A-4';
      example[40][3] = 'B-4';
      example[48][3] = 'C-4';
      example[56][3] = 'E-4';

      // Track 4: Arpeggiated accompaniment
      example[1][4] = 'A-3';
      example[3][4] = 'C-4';
      example[5][4] = 'E-4';
      example[7][4] = 'C-4';
      example[9][4] = 'A-3';
      example[11][4] = 'C-4';
      example[13][4] = 'E-4';
      example[15][4] = 'C-4';
      example[17][4] = 'C-3';
      example[19][4] = 'E-4';
      example[21][4] = 'G-4';
      example[23][4] = 'E-4';
      example[25][4] = 'G-3';
      example[27][4] = 'B-4';
      example[29][4] = 'D-4';
      example[31][4] = 'B-4';
      example[33][4] = 'F-3';
      example[35][4] = 'A-4';
      example[37][4] = 'C-4';
      example[39][4] = 'A-4';
      example[41][4] = 'G-3';
      example[43][4] = 'B-4';
      example[45][4] = 'D-4';
      example[47][4] = 'B-4';
      example[49][4] = 'A-3';
      example[51][4] = 'C-4';
      example[53][4] = 'E-4';
      example[55][4] = 'C-4';
      example[57][4] = 'A-3';
      example[59][4] = 'C-4';
      example[61][4] = 'E-4';
      example[63][4] = 'A-3';

      // Track 5: Sustained pad notes
      example[0][5] = 'A-3';
      example[16][5] = 'C-4';
      example[32][5] = 'F-3';
      example[48][5] = 'A-3';

      // Track 6: Rhythmic accents
      example[0][6] = 'E-3';
      example[2][6] = 'E-3';
      example[4][6] = 'E-3';
      example[6][6] = 'E-3';
      example[8][6] = 'E-3';
      example[10][6] = 'E-3';
      example[12][6] = 'E-3';
      example[14][6] = 'E-3';
      example[16][6] = 'E-3';
      example[18][6] = 'E-3';
      example[20][6] = 'E-3';
      example[22][6] = 'E-3';
      example[24][6] = 'E-3';
      example[26][6] = 'E-3';
      example[28][6] = 'E-3';
      example[30][6] = 'E-3';
      example[32][6] = 'E-3';
      example[34][6] = 'E-3';
      example[36][6] = 'E-3';
      example[38][6] = 'E-3';
      example[40][6] = 'E-3';
      example[42][6] = 'E-3';
      example[44][6] = 'E-3';
      example[46][6] = 'E-3';
      example[48][6] = 'E-3';
      example[50][6] = 'E-3';
      example[52][6] = 'E-3';
      example[54][6] = 'E-3';
      example[56][6] = 'E-3';
      example[58][6] = 'E-3';
      example[60][6] = 'E-3';
      example[62][6] = 'E-3';

      // Track 7: Decorative high notes
      example[3][7] = 'E-5';
      example[11][7] = 'D-5';
      example[19][7] = 'G-5';
      example[27][7] = 'E-5';
      example[35][7] = 'A-5';
      example[43][7] = 'G-5';
      example[51][7] = 'E-5';
      example[59][7] = 'A-5';

      // Set up instruments for RPG feel
      const newInstruments = [
        0,  // Track 0: Lead melody
        1,  // Track 1: Counter melody
        2,  // Track 2: Bass
        3,  // Track 3: Chords
        0,  // Track 4: Arpeggios (lead sound)
        1,  // Track 5: Pad
        2,  // Track 6: Rhythm
        3,  // Track 7: Decoration
      ];

      // Update pattern and instruments
      setPattern(example);
      setTrackInstruments(newInstruments);

      // Initialize patches for new tracks
      if (synth && bankLoaded) {
        newInstruments.forEach((patchId, trackIndex) => {
          if (instrumentBank[patchId]) {
            synth.setTrackPatch(trackIndex, instrumentBank[patchId]);
          }
        });
      }

      console.log('RPG Adventure pattern loaded! (64 rows, 8 tracks)');
    } else {
      // Major Scale Polka: Original example (uses current rows/tracks)
      const example: string[][] = Array(numRows)
        .fill(null)
        .map(() => Array(numTracks).fill('---'));

      // Track 0: C major scale
      example[0][0] = 'C-4';
      example[1][0] = 'D-4';
      example[2][0] = 'E-4';
      example[3][0] = 'F-4';
      example[4][0] = 'G-4';
      example[5][0] = 'A-4';
      example[6][0] = 'B-4';
      example[7][0] = 'C-5';

      // Track 1: Bass notes
      example[0][1] = 'C-3';
      example[4][1] = 'G-3';
      example[8][1] = 'C-3';
      example[12][1] = 'G-3';

      // Track 2: Chords (every 4 rows)
      example[0][2] = 'E-4';
      example[4][2] = 'G-4';
      example[8][2] = 'E-4';
      example[12][2] = 'G-4';

      setPattern(example);
      console.log('Major Scale Polka pattern loaded!');
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
    if (isPlaying || numRows >= 64) return;

    const newNumRows = Math.min(numRows + 4, 64);
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
              disabled={isPlaying || numRows >= 64}
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
              disabled={isPlaying}
              className="example-selector"
            >
              <option value="major-scale">Major Scale Polka</option>
              <option value="rpg-adventure">RPG Adventure</option>
            </select>
          </label>
          <button onClick={loadExample} disabled={isPlaying}>
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
        </div>
      </div>

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
                    <strong>Rest:</strong> --- (or leave empty)
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
                    <strong>Delete:</strong> Clear cell
                  </li>
                  <li>
                    <strong>Space:</strong> Play/Stop (when not editing)
                  </li>
                  <li>
                    <strong>Escape:</strong> Stop playback
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
    </div>
  );
}
