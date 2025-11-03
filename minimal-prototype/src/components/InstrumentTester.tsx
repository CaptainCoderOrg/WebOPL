/**
 * InstrumentTester - Test individual instruments across note range
 *
 * Provides a dropdown to select any instrument and buttons to play
 * notes from C-3 to B-4 to hear how each instrument sounds.
 */

import { useState } from 'react';
import type { SimpleSynth } from '../SimpleSynth';
import type { OPLPatch } from '../types/OPLPatch';
import './InstrumentTester.css';

interface InstrumentTesterProps {
  synth: SimpleSynth | null;
  instrumentBank: OPLPatch[];
}

export function InstrumentTester({ synth, instrumentBank }: InstrumentTesterProps) {
  const [selectedInstrument, setSelectedInstrument] = useState(0);
  const [status, setStatus] = useState('Select an instrument and play notes');
  const [activeNote, setActiveNote] = useState<number | null>(null);

  // Note names for C-3 through B-4 (MIDI 48-71)
  const noteNames = [
    'C-3', 'C#3', 'D-3', 'D#3', 'E-3', 'F-3', 'F#3', 'G-3', 'G#3', 'A-3', 'A#3', 'B-3',
    'C-4', 'C#4', 'D-4', 'D#4', 'E-4', 'F-4', 'F#4', 'G-4', 'G#4', 'A-4', 'A#4', 'B-4',
  ];
  const baseMidiNote = 48; // C-3

  const handleInstrumentChange = (instrumentId: number) => {
    if (!synth) {
      setStatus('❌ Synth not initialized');
      return;
    }

    setSelectedInstrument(instrumentId);
    const patch = instrumentBank[instrumentId];

    if (patch) {
      // Load to channel 0 for testing
      synth.loadPatch(0, patch);
      setStatus(`✅ Loaded: ${patch.name}`);
    }
  };

  const playNote = (noteIndex: number) => {
    if (!synth) {
      setStatus('❌ Synth not initialized');
      return;
    }

    const midiNote = baseMidiNote + noteIndex;
    const noteName = noteNames[noteIndex];
    const patch = instrumentBank[selectedInstrument];

    synth.noteOn(0, midiNote);
    setActiveNote(noteIndex);
    setStatus(`🎵 Playing ${noteName} (MIDI ${midiNote}) - ${patch?.name || 'Unknown'}`);

    // Auto-release after 500ms
    setTimeout(() => {
      synth.noteOff(0, midiNote);
      setActiveNote(null);
      setStatus(`🔇 Note stopped - ${patch?.name || 'Unknown'}`);
    }, 500);
  };

  const isBlackKey = (noteIndex: number) => {
    const noteInOctave = noteIndex % 12;
    return [1, 3, 6, 8, 10].includes(noteInOctave); // C#, D#, F#, G#, A#
  };

  return (
    <div className="instrument-tester">
      <div className="tester-header">
        <h1>🎹 Instrument Tester</h1>
        <p className="tester-description">
          Test any instrument across 2 octaves (C-3 to B-4)
        </p>
      </div>

      <div className="status-bar">
        <div className="status-message">{status}</div>
      </div>

      <div className="tester-content">
        {/* Instrument Selector */}
        <section className="tester-section">
          <h2>Select Instrument</h2>
          <div className="instrument-selector-row">
            <select
              value={selectedInstrument}
              onChange={(e) => handleInstrumentChange(parseInt(e.target.value, 10))}
              className="instrument-dropdown-large"
            >
              {instrumentBank.map((patch, idx) => (
                <option key={idx} value={idx}>
                  {String(idx).padStart(3, '0')} - {patch.name}
                </option>
              ))}
            </select>

            <div className="instrument-info">
              <strong>Current:</strong> {instrumentBank[selectedInstrument]?.name || 'None'}
            </div>
          </div>
        </section>

        {/* Octave 3 (C-3 to B-3) */}
        <section className="tester-section">
          <h2>Octave 3 (C-3 to B-3)</h2>
          <div className="piano-keyboard">
            {noteNames.slice(0, 12).map((noteName, idx) => (
              <button
                key={idx}
                onClick={() => playNote(idx)}
                className={`
                  piano-key
                  ${isBlackKey(idx) ? 'black-key' : 'white-key'}
                  ${activeNote === idx ? 'active' : ''}
                `}
                disabled={!synth}
              >
                {noteName}
              </button>
            ))}
          </div>
        </section>

        {/* Octave 4 (C-4 to B-4) */}
        <section className="tester-section">
          <h2>Octave 4 (C-4 to B-4)</h2>
          <div className="piano-keyboard">
            {noteNames.slice(12, 24).map((noteName, idx) => {
              const noteIndex = idx + 12;
              return (
                <button
                  key={noteIndex}
                  onClick={() => playNote(noteIndex)}
                  className={`
                    piano-key
                    ${isBlackKey(noteIndex) ? 'black-key' : 'white-key'}
                    ${activeNote === noteIndex ? 'active' : ''}
                  `}
                  disabled={!synth}
                >
                  {noteName}
                </button>
              );
            })}
          </div>
        </section>

        {/* Instructions */}
        <section className="tester-section tester-instructions">
          <h3>Instructions</h3>
          <ul>
            <li>Select an instrument from the dropdown above</li>
            <li>Click any note button to hear the instrument at that pitch</li>
            <li>Notes play for 500ms then automatically stop</li>
            <li>White keys = natural notes (C, D, E, F, G, A, B)</li>
            <li>Black keys = sharps/flats (C#, D#, F#, G#, A#)</li>
            <li>Test range spans 2 octaves (24 chromatic notes)</li>
          </ul>
        </section>

        {/* Instrument Info */}
        <section className="tester-section tester-info">
          <h3>Current Instrument Details</h3>
          {instrumentBank[selectedInstrument] && (
            <div className="instrument-details">
              <div className="detail-row">
                <span className="detail-label">ID:</span>
                <span className="detail-value">{selectedInstrument}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{instrumentBank[selectedInstrument].name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Feedback:</span>
                <span className="detail-value">{instrumentBank[selectedInstrument].feedback}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Connection:</span>
                <span className="detail-value">{instrumentBank[selectedInstrument].connection}</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
