import { useState } from 'react';
import { PianoKeyboard } from './PianoKeyboard';
import type { SimpleSynth } from '../SimpleSynth';
import './PianoKeyboardTest.css';

export interface PianoKeyboardTestProps {
  synth?: SimpleSynth;
}

export function PianoKeyboardTest({ synth }: PianoKeyboardTestProps) {
  // Configuration state
  const [startNote, setStartNote] = useState(60); // C-4
  const [endNote, setEndNote] = useState(72);     // C-5
  const [height, setHeight] = useState(100);
  const [showLabels, setShowLabels] = useState(true);
  const [compact, setCompact] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [playSound, setPlaySound] = useState(true);
  const [channel] = useState(8);

  // Active notes (for visualization testing)
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());

  // Track-based visualization state (for future use)
  const [activeNotesByTrack] = useState<Map<number, { notes: Set<number>; color: string }>>(new Map());

  // Handlers
  const handleNoteOn = (note: number) => {
    if (playSound && synth) {
      synth.noteOn(channel, note);
    }
    setActiveNotes(prev => new Set(prev).add(note));
  };

  const handleNoteOff = (note: number) => {
    if (playSound && synth) {
      synth.noteOff(channel, note);
    }
    setActiveNotes(prev => {
      const next = new Set(prev);
      next.delete(note);
      return next;
    });
  };

  // Test scenario presets
  const loadPreset = (preset: string) => {
    switch (preset) {
      case 'instrument-editor':
        setStartNote(60);
        setEndNote(72);
        setHeight(100);
        setShowLabels(true);
        setCompact(false);
        setDisabled(false);
        setPlaySound(true);
        break;
      case 'pattern-viz-all':
        setStartNote(48);
        setEndNote(84);
        setHeight(60);
        setShowLabels(false);
        setCompact(true);
        setDisabled(true);
        break;
      case 'note-input':
        setStartNote(60);
        setEndNote(84);
        setHeight(100);
        setShowLabels(true);
        setCompact(false);
        setDisabled(false);
        setPlaySound(false);
        break;
      case 'full-range':
        setStartNote(21);
        setEndNote(108);
        setHeight(80);
        setShowLabels(false);
        setCompact(true);
        setDisabled(false);
        setPlaySound(true);
        break;
    }
  };

  // Simulate random notes (for testing visualization)
  const simulatePlayback = () => {
    const notes = [60, 64, 67, 72, 76];
    const randomNote = notes[Math.floor(Math.random() * notes.length)];

    setActiveNotes(prev => new Set(prev).add(randomNote));

    setTimeout(() => {
      setActiveNotes(prev => {
        const next = new Set(prev);
        next.delete(randomNote);
        return next;
      });
    }, 500);
  };

  const keyCount = endNote - startNote + 1;

  return (
    <div className="keyboard-test">
      <h1>Piano Keyboard Test</h1>

      {/* Configuration Panel */}
      <div className="test-config">
        {/* Range Configuration */}
        <div className="config-section">
          <h3>Range</h3>
          <label>
            Start Note (MIDI):
            <input
              type="number"
              value={startNote}
              onChange={(e) => setStartNote(Number(e.target.value))}
              min={0}
              max={127}
            />
          </label>
          <label>
            End Note (MIDI):
            <input
              type="number"
              value={endNote}
              onChange={(e) => setEndNote(Number(e.target.value))}
              min={0}
              max={127}
            />
          </label>
        </div>

        {/* Visual Options */}
        <div className="config-section">
          <h3>Visual</h3>
          <label>
            Height (px):
            <input
              type="range"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              min={40}
              max={200}
            />
            <span>{height}px</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
            />
            Show Labels
          </label>
          <label>
            <input
              type="checkbox"
              checked={compact}
              onChange={(e) => setCompact(e.target.checked)}
            />
            Compact Mode
          </label>
        </div>

        {/* Interaction Options */}
        <div className="config-section">
          <h3>Interaction</h3>
          <label>
            <input
              type="checkbox"
              checked={disabled}
              onChange={(e) => setDisabled(e.target.checked)}
            />
            Disabled (visualization only)
          </label>
          <label>
            <input
              type="checkbox"
              checked={playSound}
              onChange={(e) => setPlaySound(e.target.checked)}
              disabled={disabled}
            />
            Play Sound
          </label>
          <button onClick={simulatePlayback}>Simulate Playback</button>
        </div>

        {/* Test Scenario Presets */}
        <div className="config-section">
          <h3>Test Scenarios</h3>
          <button onClick={() => loadPreset('instrument-editor')}>Instrument Editor</button>
          <button onClick={() => loadPreset('pattern-viz-all')}>Pattern Viz (All)</button>
          <button onClick={() => loadPreset('note-input')}>Note Input</button>
          <button onClick={() => loadPreset('full-range')}>Full Range</button>
        </div>
      </div>

      {/* Keyboard Component */}
      <div className="test-keyboard-container">
        <PianoKeyboard
          startNote={startNote}
          endNote={endNote}
          height={height}
          showLabels={showLabels}
          compact={compact}
          disabled={disabled}
          activeNotes={activeNotes}
          activeNotesByTrack={activeNotesByTrack}
          onNoteOn={disabled ? undefined : handleNoteOn}
          onNoteOff={disabled ? undefined : handleNoteOff}
        />
      </div>

      {/* Current Configuration Display */}
      <div className="test-info">
        <h3>Current Configuration</h3>
        <ul>
          <li>Range: {startNote}-{endNote} ({keyCount} keys)</li>
          <li>Height: {height}px</li>
          <li>Compact: {compact ? 'Yes' : 'No'}</li>
          <li>Labels: {showLabels ? 'Yes' : 'No'}</li>
          <li>Disabled: {disabled ? 'Yes' : 'No'}</li>
          <li>Play Sound: {playSound ? 'Yes' : 'No'}</li>
        </ul>
        <p>Active Notes: [{Array.from(activeNotes).join(', ')}]</p>
      </div>
    </div>
  );
}
