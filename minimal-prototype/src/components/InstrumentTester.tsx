/**
 * InstrumentTester - Test individual instruments across note range
 *
 * Provides a dropdown to select any instrument and buttons to play
 * notes from C-3 to B-4 to hear how each instrument sounds.
 */

import { useState } from 'react';
import type { SimpleSynth } from '../SimpleSynth';
import type { OPLPatch } from '../types/OPLPatch';
import { getOPLParams } from '../constants/midiToOPL';
import './InstrumentTester.css';

interface InstrumentTesterProps {
  synth: SimpleSynth | null;
  instrumentBank: OPLPatch[];
}

export function InstrumentTester({ synth, instrumentBank }: InstrumentTesterProps) {
  const [selectedInstrument, setSelectedInstrument] = useState(0);
  const [status, setStatus] = useState('Select an instrument and play notes');
  const [activeNote, setActiveNote] = useState<number | null>(null);

  // Parameters for manual testing (MIDI mode)
  const [debugParams, setDebugParams] = useState({
    channel: 0,
    midiNote: 48,
  });

  // Raw OPL3 parameters for direct register control
  const [rawOPLParams, setRawOPLParams] = useState({
    channel: 0,
    fnum: 690,
    block: 2,
  });

  const [useRawMode, setUseRawMode] = useState(false);
  const [showOperatorParams, setShowOperatorParams] = useState(false);

  // Get pre-calculated OPL3 parameters from lookup table
  const oplParams = getOPLParams(debugParams.midiNote);

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

  // Play note with raw OPL3 parameters
  const playRawNote = (channel: number, fnum: number, block: number) => {
    if (!synth) {
      setStatus('❌ Synth not initialized');
      return;
    }

    // Access the opl instance via window.synth (exposed in App.tsx)
    const opl = (window as any).synth?.opl;
    if (!opl) {
      setStatus('❌ OPL instance not available');
      return;
    }

    const patch = instrumentBank[selectedInstrument];

    // Write frequency registers directly
    opl.write(0xA0 + channel, fnum & 0xFF); // F-number low 8 bits

    // Write key-on + block + F-number high 2 bits
    const keyOnByte = 0x20 | ((block & 0x07) << 2) | ((fnum >> 8) & 0x03);
    opl.write(0xB0 + channel, keyOnByte);

    // Calculate frequency for display
    const freq = (fnum * 49716) / Math.pow(2, 20 - block);

    setStatus(`🎵 Raw Play: ch=${channel}, fnum=${fnum}, block=${block}, freq=${freq.toFixed(2)}Hz - ${patch?.name || 'Unknown'}`);

    // Auto-release after 500ms
    setTimeout(() => {
      opl.write(0xB0 + channel, 0x00);
      setStatus(`🔇 Note stopped - ${patch?.name || 'Unknown'}`);
    }, 500);
  };

  const playNote = (noteIndex: number) => {
    if (!synth) {
      setStatus('❌ Synth not initialized');
      return;
    }

    const midiNote = baseMidiNote + noteIndex;
    const noteName = noteNames[noteIndex];
    const patch = instrumentBank[selectedInstrument];
    const channel = 0;

    // Update debug parameters to show what's being sent
    setDebugParams({
      channel,
      midiNote,
    });

    // Also update raw OPL params to show what gets calculated
    const calculated = getOPLParams(midiNote);
    setRawOPLParams({
      channel,
      fnum: calculated.fnum,
      block: calculated.block,
    });

    synth.noteOn(channel, midiNote, 100);
    setActiveNote(noteIndex);
    setStatus(`🎵 Playing ${noteName} (MIDI ${midiNote}) - ${patch?.name || 'Unknown'}`);

    // Auto-release after 500ms
    setTimeout(() => {
      synth.noteOff(channel, midiNote);
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

        {/* Debug Parameters Panel */}
        <section className="tester-section parameters-panel">
          <div className="param-header">
            <h2>Debug Parameters</h2>
            <div className="mode-toggle">
              <button
                onClick={() => setUseRawMode(false)}
                className={`mode-button ${!useRawMode ? 'active' : ''}`}
              >
                MIDI Mode
              </button>
              <button
                onClick={() => setUseRawMode(true)}
                className={`mode-button ${useRawMode ? 'active' : ''}`}
              >
                Raw OPL3 Mode
              </button>
            </div>
          </div>

          <p className="param-description">
            {useRawMode
              ? 'Direct OPL3 register control. Edit fnum and block values to test raw frequency generation.'
              : 'MIDI parameters that get converted to OPL3 registers. Click any note button to populate these values.'}
          </p>

          {!useRawMode ? (
            // MIDI Mode
            <>
              <div className="param-grid">
                <div className="param-field">
                  <label htmlFor="param-channel">Channel:</label>
                  <input
                    id="param-channel"
                    type="number"
                    min="0"
                    max="8"
                    value={debugParams.channel}
                    onChange={(e) => setDebugParams({ ...debugParams, channel: parseInt(e.target.value, 10) })}
                    className="param-input"
                  />
                </div>

                <div className="param-field">
                  <label htmlFor="param-midi">MIDI Note:</label>
                  <input
                    id="param-midi"
                    type="number"
                    min="0"
                    max="127"
                    value={debugParams.midiNote}
                    onChange={(e) => setDebugParams({ ...debugParams, midiNote: parseInt(e.target.value, 10) })}
                    className="param-input"
                  />
                </div>

                <div className="param-field param-play-button-field">
                  <button
                    onClick={() => {
                      if (!synth) {
                        setStatus('❌ Synth not initialized');
                        return;
                      }
                      const patch = instrumentBank[selectedInstrument];
                      synth.noteOn(debugParams.channel, debugParams.midiNote, 100);
                      setStatus(`🎵 MIDI Play: ch=${debugParams.channel}, midi=${debugParams.midiNote} - ${patch?.name || 'Unknown'}`);

                      // Auto-release after 500ms
                      setTimeout(() => {
                        synth.noteOff(debugParams.channel, debugParams.midiNote);
                        setStatus(`🔇 Note stopped - ${patch?.name || 'Unknown'}`);
                      }, 500);
                    }}
                    disabled={!synth}
                    className="param-play-button"
                  >
                    ▶ Play Note
                  </button>
                </div>
              </div>

              <div className="param-info">
                <div><strong>Calculated OPL3 Parameters:</strong></div>
                <div>Frequency: {oplParams.freq.toFixed(2)} Hz</div>
                <div>F-Number: {oplParams.fnum}</div>
                <div>Block: {oplParams.block}</div>
              </div>
            </>
          ) : (
            // Raw OPL3 Mode
            <>
              <div className="param-grid">
                <div className="param-field">
                  <label htmlFor="raw-channel">Channel:</label>
                  <input
                    id="raw-channel"
                    type="number"
                    min="0"
                    max="8"
                    value={rawOPLParams.channel}
                    onChange={(e) => setRawOPLParams({ ...rawOPLParams, channel: parseInt(e.target.value, 10) })}
                    className="param-input"
                  />
                </div>

                <div className="param-field">
                  <label htmlFor="raw-fnum">F-Number (fnum):</label>
                  <input
                    id="raw-fnum"
                    type="number"
                    min="0"
                    max="1023"
                    value={rawOPLParams.fnum}
                    onChange={(e) => setRawOPLParams({ ...rawOPLParams, fnum: parseInt(e.target.value, 10) })}
                    className="param-input"
                  />
                </div>

                <div className="param-field">
                  <label htmlFor="raw-block">Block (octave):</label>
                  <input
                    id="raw-block"
                    type="number"
                    min="0"
                    max="7"
                    value={rawOPLParams.block}
                    onChange={(e) => setRawOPLParams({ ...rawOPLParams, block: parseInt(e.target.value, 10) })}
                    className="param-input"
                  />
                </div>

                <div className="param-field param-play-button-field">
                  <button
                    onClick={() => playRawNote(rawOPLParams.channel, rawOPLParams.fnum, rawOPLParams.block)}
                    disabled={!synth}
                    className="param-play-button"
                  >
                    ▶ Play Note
                  </button>
                </div>
              </div>

              <div className="param-info">
                <div><strong>Calculated Frequency:</strong></div>
                <div>{((rawOPLParams.fnum * 49716) / Math.pow(2, 20 - rawOPLParams.block)).toFixed(2)} Hz</div>
                <div className="param-hint">
                  Registers: 0xA0+ch={rawOPLParams.fnum & 0xFF}, 0xB0+ch={0x20 | ((rawOPLParams.block & 0x07) << 2) | ((rawOPLParams.fnum >> 8) & 0x03)}
                </div>
              </div>
            </>
          )}
        </section>

        {/* Loaded Operator Parameters */}
        <section className="tester-section operator-params-panel">
          <div className="param-header">
            <h2>Loaded Operator Parameters</h2>
            <button
              onClick={() => setShowOperatorParams(!showOperatorParams)}
              className="collapse-button"
            >
              {showOperatorParams ? '▼ Hide' : '▶ Show'}
            </button>
          </div>

          {showOperatorParams && (
            <>
              <p className="param-description">
                Current OPL3 operator values for the selected instrument. These control timbre, envelope, and modulation.
              </p>

              {instrumentBank[selectedInstrument] && (
            <div className="operator-params-grid">
              {/* Modulator Operator */}
              <div className="operator-section">
                <h3>Modulator (Op1)</h3>
                <div className="operator-params">
                  <div className="param-row">
                    <span className="param-label">Attack Rate:</span>
                    <span className="param-value">{instrumentBank[selectedInstrument].modulator.attackRate}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-label">Decay Rate:</span>
                    <span className="param-value">{instrumentBank[selectedInstrument].modulator.decayRate}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-label">Sustain Level:</span>
                    <span className="param-value">{instrumentBank[selectedInstrument].modulator.sustainLevel}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-label">Release Rate:</span>
                    <span className="param-value">{instrumentBank[selectedInstrument].modulator.releaseRate}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-label">Freq Multiplier:</span>
                    <span className="param-value">{instrumentBank[selectedInstrument].modulator.frequencyMultiplier}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-label">Waveform:</span>
                    <span className="param-value">{instrumentBank[selectedInstrument].modulator.waveform}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-label">Output Level:</span>
                    <span className="param-value">{instrumentBank[selectedInstrument].modulator.outputLevel}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-label">Key Scale Level:</span>
                    <span className="param-value">{instrumentBank[selectedInstrument].modulator.keyScaleLevel}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-label">AM/VIB/EG/KSR:</span>
                    <span className="param-value">
                      {instrumentBank[selectedInstrument].modulator.amplitudeModulation ? 'AM ' : ''}
                      {instrumentBank[selectedInstrument].modulator.vibrato ? 'VIB ' : ''}
                      {instrumentBank[selectedInstrument].modulator.envelopeType ? 'EG ' : ''}
                      {instrumentBank[selectedInstrument].modulator.keyScaleRate ? 'KSR' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Carrier Operator */}
              <div className="operator-section">
                <h3>Carrier (Op2)</h3>
                <div className="operator-params">
                  <div className="param-row">
                    <span className="param-label">Attack Rate:</span>
                    <span className="param-value">{instrumentBank[selectedInstrument].carrier.attackRate}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-label">Decay Rate:</span>
                    <span className="param-value">{instrumentBank[selectedInstrument].carrier.decayRate}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-label">Sustain Level:</span>
                    <span className="param-value">{instrumentBank[selectedInstrument].carrier.sustainLevel}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-label">Release Rate:</span>
                    <span className="param-value">{instrumentBank[selectedInstrument].carrier.releaseRate}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-label">Freq Multiplier:</span>
                    <span className="param-value">{instrumentBank[selectedInstrument].carrier.frequencyMultiplier}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-label">Waveform:</span>
                    <span className="param-value">{instrumentBank[selectedInstrument].carrier.waveform}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-label">Output Level:</span>
                    <span className="param-value">{instrumentBank[selectedInstrument].carrier.outputLevel}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-label">Key Scale Level:</span>
                    <span className="param-value">{instrumentBank[selectedInstrument].carrier.keyScaleLevel}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-label">AM/VIB/EG/KSR:</span>
                    <span className="param-value">
                      {instrumentBank[selectedInstrument].carrier.amplitudeModulation ? 'AM ' : ''}
                      {instrumentBank[selectedInstrument].carrier.vibrato ? 'VIB ' : ''}
                      {instrumentBank[selectedInstrument].carrier.envelopeType ? 'EG ' : ''}
                      {instrumentBank[selectedInstrument].carrier.keyScaleRate ? 'KSR' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Channel Configuration */}
              <div className="operator-section channel-config">
                <h3>Channel Config</h3>
                <div className="operator-params">
                  <div className="param-row">
                    <span className="param-label">Feedback:</span>
                    <span className="param-value">{instrumentBank[selectedInstrument].feedback}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-label">Connection:</span>
                    <span className="param-value">{instrumentBank[selectedInstrument].connection}</span>
                  </div>
                </div>
              </div>
            </div>
              )}
            </>
          )}
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
