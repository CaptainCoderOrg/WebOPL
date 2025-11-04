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
import { InstrumentSelector } from './InstrumentSelector';
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

  // Pattern state: 16 rows × 4 tracks
  const [pattern, setPattern] = useState<string[][]>(() =>
    Array(16)
      .fill(null)
      .map(() => Array(4).fill('---'))
  );

  // Instrument selection: Track 0-3 → Patch index in instrumentBank
  const [trackInstruments, setTrackInstruments] = useState<number[]>([0, 1, 2, 3]);

  // Quick guide collapsed state
  const [guideCollapsed, setGuideCollapsed] = useState(false);

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
    console.log('Loading example pattern...');

    const example: string[][] = Array(16)
      .fill(null)
      .map(() => Array(4).fill('---'));

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
    console.log('Example pattern loaded!');
  };

  /**
   * Clear pattern
   */
  const clearPattern = () => {
    setPattern(
      Array(16)
        .fill(null)
        .map(() => Array(4).fill('---'))
    );
    console.log('Pattern cleared');
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

          <div className="position-display">
            Row: {currentRow.toString().padStart(2, '0')} / 16
          </div>
        </div>

        <div className="control-group">
          <button onClick={loadExample} disabled={isPlaying}>
            📝 Load Example
          </button>
          <button onClick={clearPattern} disabled={isPlaying}>
            🗑️ Clear
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

      {/* Instrument Selector */}
      {bankLoaded && (
        <InstrumentSelector
          trackInstruments={trackInstruments}
          instrumentBank={instrumentBank}
          onInstrumentChange={handleInstrumentChange}
          onEditClick={onEditInstrument}
        />
      )}

      {/* Tracker Grid */}
      <div className="tracker-section">
        <TrackerGrid
          rows={16}
          tracks={4}
          pattern={pattern}
          onUpdate={setPattern}
          currentRow={isPlaying ? currentRow : undefined}
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
