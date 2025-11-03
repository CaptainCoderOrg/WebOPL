import { useState, useEffect } from 'react';
import { SimpleSynth } from './SimpleSynth';
import { noteNameToMIDI, testNoteConversion } from './utils/noteConversion';
import './App.css';

function App() {
  const [synth, setSynth] = useState<SimpleSynth | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initSynth = async () => {
      try {
        console.log('=== Initializing SimpleSynth ===');

        // Run note conversion tests
        testNoteConversion();

        // Initialize synthesizer
        const s = new SimpleSynth();
        await s.init();
        setSynth(s);
        setIsReady(true);

        console.log('=== Ready to Play! ===');
      } catch (err) {
        console.error('Failed to initialize:', err);
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    initSynth();
  }, []);

  // Test 1: Single note
  const playSingleNote = () => {
    if (!synth) return;

    console.log('--- Test: Single Note ---');
    synth.start();

    // Play middle C for 1 second
    const midiNote = noteNameToMIDI('C-4')!;
    synth.noteOn(0, midiNote);

    setTimeout(() => {
      synth.noteOff(0, midiNote);
    }, 1000);
  };

  // Test 2: Chord (3 simultaneous notes)
  const playChord = () => {
    if (!synth) return;

    console.log('--- Test: C Major Chord ---');
    synth.start();

    // C major chord: C E G
    const notes = ['C-4', 'E-4', 'G-4'];
    const midiNotes = notes.map(n => noteNameToMIDI(n)!);

    // Play on channels 0, 1, 2
    midiNotes.forEach((midi, channel) => {
      synth.noteOn(channel, midi);
    });

    // Release after 2 seconds
    setTimeout(() => {
      midiNotes.forEach((midi, channel) => {
        synth.noteOff(channel, midi);
      });
    }, 2000);
  };

  // Test 3: Scale (sequence of notes)
  const playScale = () => {
    if (!synth) return;

    console.log('--- Test: C Major Scale ---');
    synth.start();

    // C major scale
    const notes = ['C-4', 'D-4', 'E-4', 'F-4', 'G-4', 'A-4', 'B-4', 'C-5'];
    const midiNotes = notes.map(n => noteNameToMIDI(n)!);

    // Play each note sequentially
    midiNotes.forEach((midi, i) => {
      setTimeout(() => {
        synth.noteOn(0, midi);

        setTimeout(() => {
          synth.noteOff(0, midi);
        }, 400); // Note duration
      }, i * 500); // Delay between notes
    });
  };

  // Test 4: Arpeggio (fast sequence)
  const playArpeggio = () => {
    if (!synth) return;

    console.log('--- Test: Arpeggio ---');
    synth.start();

    // C major arpeggio (repeating)
    const pattern = ['C-4', 'E-4', 'G-4', 'C-5', 'G-4', 'E-4'];
    const midiNotes = pattern.map(n => noteNameToMIDI(n)!);

    midiNotes.forEach((midi, i) => {
      setTimeout(() => {
        synth.noteOn(0, midi);

        setTimeout(() => {
          synth.noteOff(0, midi);
        }, 180); // Short note
      }, i * 200); // Fast tempo
    });
  };

  // Test 5: Polyphonic (multiple tracks)
  const playPolyphonic = () => {
    if (!synth) return;

    console.log('--- Test: Polyphonic Sequence ---');
    synth.start();

    // Track 1: Melody
    const melody = ['C-4', 'E-4', 'G-4', 'E-4'];
    const melodyMidi = melody.map(n => noteNameToMIDI(n)!);

    melodyMidi.forEach((midi, i) => {
      setTimeout(() => {
        synth.noteOn(0, midi);
        setTimeout(() => synth.noteOff(0, midi), 400);
      }, i * 500);
    });

    // Track 2: Bass (plays simultaneously)
    const bass = ['C-3', 'C-3', 'G-3', 'G-3'];
    const bassMidi = bass.map(n => noteNameToMIDI(n)!);

    bassMidi.forEach((midi, i) => {
      setTimeout(() => {
        synth.noteOn(1, midi);
        setTimeout(() => synth.noteOff(1, midi), 400);
      }, i * 500);
    });
  };

  return (
    <div className="app">
      <h1>🎵 SimpleSynth Test Suite</h1>

      <div className="status-section">
        <div className="status">
          <strong>Status:</strong>{' '}
          {error ? (
            <span style={{ color: '#ff4444' }}>❌ Error</span>
          ) : isReady ? (
            <span style={{ color: '#44ff44' }}>✅ Ready</span>
          ) : (
            <span style={{ color: '#ffaa00' }}>⏳ Initializing...</span>
          )}
        </div>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      <div className="test-section">
        <h3>Audio Tests:</h3>

        <div className="test-grid">
          <div className="test-card">
            <h4>Test 1: Single Note</h4>
            <p>Plays middle C for 1 second</p>
            <button onClick={playSingleNote} disabled={!isReady}>
              Play Single Note
            </button>
          </div>

          <div className="test-card">
            <h4>Test 2: Chord</h4>
            <p>C major chord (3 simultaneous notes)</p>
            <button onClick={playChord} disabled={!isReady}>
              Play Chord
            </button>
          </div>

          <div className="test-card">
            <h4>Test 3: Scale</h4>
            <p>C major scale (8 notes)</p>
            <button onClick={playScale} disabled={!isReady}>
              Play Scale
            </button>
          </div>

          <div className="test-card">
            <h4>Test 4: Arpeggio</h4>
            <p>Fast repeating pattern</p>
            <button onClick={playArpeggio} disabled={!isReady}>
              Play Arpeggio
            </button>
          </div>

          <div className="test-card">
            <h4>Test 5: Polyphonic</h4>
            <p>Melody + Bass simultaneously</p>
            <button onClick={playPolyphonic} disabled={!isReady}>
              Play Polyphonic
            </button>
          </div>
        </div>
      </div>

      <div className="instructions">
        <h3>Instructions:</h3>
        <ol>
          <li>Wait for ✅ Ready status</li>
          <li>Click any test button to hear audio</li>
          <li>Check browser console (F12) for detailed logs</li>
        </ol>

        <h4>What each test proves:</h4>
        <ul>
          <li><strong>Single Note:</strong> Basic note on/off works</li>
          <li><strong>Chord:</strong> Multiple simultaneous voices work</li>
          <li><strong>Scale:</strong> Sequential notes work</li>
          <li><strong>Arpeggio:</strong> Fast timing works</li>
          <li><strong>Polyphonic:</strong> Multiple tracks work</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
