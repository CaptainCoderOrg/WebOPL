import { useState, useEffect } from 'react';
import { Route, Link } from 'wouter';
import { SimpleSynth } from './SimpleSynth';
import { SimplePlayer } from './SimplePlayer';
import type { TrackerPattern, TrackerNote } from './SimplePlayer';
import { noteNameToMIDI } from './utils/noteConversion';
import { TrackerGrid } from './components/TrackerGrid';
import { PatchTest } from './components/PatchTest';
import { InstrumentSelector } from './components/InstrumentSelector';
import { InstrumentTester } from './components/InstrumentTester';
import { validatePattern, formatValidationErrors } from './utils/patternValidation';
import { defaultPatches } from './data/defaultPatches';
import { loadGENMIDI } from './utils/genmidiParser';
import type { OPLPatch } from './types/OPLPatch';
import './App.css';

function App() {
  const [synth, setSynth] = useState<SimpleSynth | null>(null);
  const [player, setPlayer] = useState<SimplePlayer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentRow, setCurrentRow] = useState(0);
  const [bpm, setBpm] = useState(120);
  const [initError, setInitError] = useState<string | null>(null);

  // Instrument selection: Track 0-3 → Patch index in instrumentBank
  const [trackInstruments, setTrackInstruments] = useState<number[]>([0, 1, 2, 3]);

  // Instrument bank (starts with defaults)
  const [instrumentBank, setInstrumentBank] = useState<OPLPatch[]>(defaultPatches);

  // Bank loading status
  const [bankLoaded, setBankLoaded] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

  // Pattern state: 16 rows × 4 tracks
  const [pattern, setPattern] = useState<string[][]>(() =>
    Array(16)
      .fill(null)
      .map(() => Array(4).fill('---'))
  );

  // Initialize audio engine
  useEffect(() => {
    // Guard against double initialization in React Strict Mode
    if (synth || isReady) {
      console.log('[App] Already initialized, skipping');
      return;
    }

    const init = async () => {
      try {
        console.log('=== Initializing WebOrchestra ===');

        // Initialize synthesizer
        const s = new SimpleSynth();
        await s.init();
        setSynth(s);

        // Expose synth globally for console testing (development only)
        if (import.meta.env.DEV) {
          (window as any).synth = s;
          console.log('[App] Synth exposed as window.synth for testing');

          // Log loaded instruments
          console.log('%c=== Loaded Instruments ===', 'color: #00ff00; font-weight: bold');
          s.getAllPatches().slice(0, 4).forEach(([ch, name]) => {
            console.log(`%cTrack ${ch}: ${name}`, 'color: #ffaa00');
          });
        }

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
        const errorMsg = error instanceof Error ? error.message : String(error);
        setInitError(errorMsg);
      }
    };

    init();
  }, [synth, isReady]);

  /**
   * Load GENMIDI instrument bank
   */
  useEffect(() => {
    const loadInstruments = async () => {
      // Only load once, after synth is ready
      if (!isReady || bankLoaded || instrumentBank.length > 4) return;

      try {
        console.log('[App] Loading GENMIDI instrument bank...');
        setBankError(null);

        const bank = await loadGENMIDI();

        console.log(`[App] Loaded ${bank.patches.length} instruments from ${bank.name}`);
        setInstrumentBank(bank.patches);
        setBankLoaded(true);

        // Re-apply current track instruments with new bank
        trackInstruments.forEach((patchId, trackIndex) => {
          if (synth && bank.patches[patchId]) {
            synth.loadPatch(trackIndex, bank.patches[patchId]);
          }
        });

        console.log('[App] GENMIDI bank loaded successfully');
      } catch (error) {
        console.error('[App] Failed to load GENMIDI:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setBankError(errorMsg);

        // Keep using default patches
        console.log('[App] Using default instrument patches as fallback');
        setBankLoaded(true); // Mark as "loaded" to prevent retry loop
      }
    };

    loadInstruments();
  }, [isReady, synth, bankLoaded, instrumentBank.length, trackInstruments]);

  /**
   * Global keyboard shortcuts
   */
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only handle if not focused on an input
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (isInput) {
        // Don't interfere with note entry
        return;
      }

      // Space bar: Toggle play/stop
      if (e.code === 'Space') {
        e.preventDefault();
        if (isReady && player) {
          handlePlayStop();
        }
      }

      // Escape: Stop playback
      if (e.code === 'Escape' && isPlaying) {
        e.preventDefault();
        handlePlayStop();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isReady, isPlaying, player]);

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
    if (num < 60) {
      setBpm(60);
    } else if (num > 240) {
      setBpm(240);
    } else {
      setBpm(num);
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

    // Load patch to corresponding channel
    if (synth && instrumentBank[patchId]) {
      synth.loadPatch(trackIndex, instrumentBank[patchId]);
    }
  };

  /**
   * Handle edit button click (placeholder for M6)
   */
  const handleEditClick = (trackIndex: number) => {
    console.log(`Edit clicked for track ${trackIndex}`);
    alert(`Instrument editor coming in Milestone 6!\n\nTrack: ${trackIndex + 1}\nCurrent: ${instrumentBank[trackInstruments[trackIndex]]?.name}`);
  };

  // Show loading/error screen if not ready
  if (!isReady) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <h1>🎵 WebOrchestra</h1>

          {initError ? (
            <>
              <div className="error-icon">❌</div>
              <h2>Initialization Failed</h2>
              <p className="error-message">{initError}</p>
              <button onClick={() => window.location.reload()}>
                Retry
              </button>
            </>
          ) : (
            <>
              <div className="loading-spinner"></div>
              <p>Initializing audio engine...</p>
              <p className="loading-subtext">
                Loading OPL3 synthesizer and Web Audio API
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1>🎵 WebOrchestra</h1>
          <div className="subtitle">Minimal Tracker Prototype</div>
        </div>
        <nav className="nav-links">
          <Link href="/" className="nav-link">
            🎹 Tracker
          </Link>
          <Link href="/test" className="nav-link">
            🧪 Patch Test
          </Link>
          <Link href="/instrument-tester" className="nav-link">
            🎸 Instrument Tester
          </Link>
        </nav>
        <div className="status">
          {isReady ? '✅ Ready' : '⏳ Initializing...'}
        </div>
      </header>

      <Route path="/">
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
              onChange={(e) => handleBPMChange(e.target.value)}
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
          onEditClick={handleEditClick}
          disabled={isPlaying}
        />
      )}

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
        <h3>📖 Quick Guide</h3>
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
      </Route>

      <Route path="/test">
        <PatchTest synth={synth} />
      </Route>

      <Route path="/instrument-tester">
        <InstrumentTester synth={synth} instrumentBank={instrumentBank} />
      </Route>
    </div>
  );
}

export default App;
