import { useState, useEffect } from 'react';
import { SimpleSynth } from './SimpleSynth';
import { SimplePlayer } from './SimplePlayer';
import type { TrackerPattern, TrackerNote } from './SimplePlayer';
import { noteNameToMIDI } from './utils/noteConversion';
import { TrackerGrid } from './components/TrackerGrid';
import './App.css';

function App() {
  const [, setSynth] = useState<SimpleSynth | null>(null);
  const [player, setPlayer] = useState<SimplePlayer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentRow, setCurrentRow] = useState(0);
  const [bpm, setBpm] = useState(120);

  // Pattern state: 16 rows × 4 tracks
  const [pattern, setPattern] = useState<string[][]>(() =>
    Array(16)
      .fill(null)
      .map(() => Array(4).fill('---'))
  );

  // Initialize audio engine
  useEffect(() => {
    const init = async () => {
      try {
        console.log('=== Initializing WebOrchestra ===');

        // Initialize synthesizer
        const s = new SimpleSynth();
        await s.init();
        setSynth(s);

        // Initialize player
        const p = new SimplePlayer(s);
        p.setOnRowChange((row) => {
          setCurrentRow(row);
        });
        setPlayer(p);

        setIsReady(true);
        console.log('=== Ready! ===');
      } catch (error) {
        console.error('Initialization failed:', error);
        alert('Failed to initialize audio engine. Check console for details.');
      }
    };

    init();
  }, []);

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
      // Play
      console.log('--- Converting pattern to tracker format ---');

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

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1>🎵 WebOrchestra</h1>
          <div className="subtitle">Minimal Tracker Prototype</div>
        </div>
        <div className="status">
          {isReady ? '✅ Ready' : '⏳ Initializing...'}
        </div>
      </header>

      <div className="controls">
        <div className="control-group">
          <button
            onClick={handlePlayStop}
            disabled={!isReady}
            className={isPlaying ? 'btn-stop' : 'btn-play'}
          >
            {isPlaying ? '⏹ Stop' : '▶ Play'}
          </button>

          <label className="control-label">
            BPM:
            <input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
              onBlur={() => {
                // Clamp to valid range
                if (bpm < 60) setBpm(60);
                if (bpm > 240) setBpm(240);
              }}
              min={60}
              max={240}
              disabled={isPlaying}
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

      <div className="tracker-section">
        <TrackerGrid
          rows={16}
          tracks={4}
          pattern={pattern}
          onUpdate={setPattern}
          currentRow={isPlaying ? currentRow : undefined}
        />
      </div>

      <div className="help-section">
        <h3>How to use:</h3>
        <div className="help-columns">
          <div>
            <h4>Note Entry:</h4>
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
            </ul>
          </div>
          <div>
            <h4>Navigation:</h4>
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
                <strong>Click cell:</strong> Select for editing
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
