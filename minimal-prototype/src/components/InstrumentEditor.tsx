/**
 * InstrumentEditor Component
 * Modal for editing instrument parameters
 */

import { useState, useEffect, useRef } from 'react';
import type { OPLPatch } from '../types/OPLPatch';
import { PianoKeyboard } from './PianoKeyboard';
import './InstrumentEditor.css';

export interface InstrumentEditorProps {
  /** Track being edited (0-3) */
  trackId: number;

  /** Current patch loaded on this track */
  currentPatch: OPLPatch;

  /** All available patches for preset selection */
  availablePatches: OPLPatch[];

  /** Called when user saves changes */
  onSave: (trackId: number, patch: OPLPatch) => void;

  /** Called when user closes without saving */
  onCancel: () => void;

  /** SimpleSynth instance for preview */
  synth?: any;
}

export function InstrumentEditor({
  trackId,
  currentPatch,
  availablePatches,
  onSave,
  onCancel,
  synth
}: InstrumentEditorProps) {
  // Local state for editing (not applied until Save)
  const [editedPatch, setEditedPatch] = useState<OPLPatch>(currentPatch);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [demoMode, setDemoMode] = useState<'none' | 'solo' | 'chords' | 'arpeggios'>('none');
  const [currentSoloNote, setCurrentSoloNote] = useState<number | null>(null);
  const [currentChordNotes, setCurrentChordNotes] = useState<Set<number>>(new Set());
  const [currentArpeggioNote, setCurrentArpeggioNote] = useState<number | null>(null);

  // Ref to track current edited patch for Solo/Chords playback (avoids restarting)
  const editedPatchRef = useRef<OPLPatch>(editedPatch);

  // Reset local state when currentPatch changes
  useEffect(() => {
    setEditedPatch(currentPatch);
  }, [currentPatch]);

  // Update patch ref whenever editedPatch changes (for Solo playback)
  useEffect(() => {
    editedPatchRef.current = editedPatch;
  }, [editedPatch]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  // Prevent scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Solo melody playback
  useEffect(() => {
    if (demoMode !== 'solo' || !synth) {
      setCurrentSoloNote(null);
      return;
    }

    const PREVIEW_CHANNEL = 8;

    // 12-bar blues melody in C using blues scale (C Eb F F# G Bb)
    // Generic blues lick pattern over 12 bars
    const melody = [
      // Bar 1-2 (C7) - Opening blues phrase
      { note: 60, duration: 300 }, // C
      { note: 63, duration: 300 }, // Eb
      { note: 65, duration: 300 }, // F
      { note: 67, duration: 600 }, // G (hold)
      { note: 65, duration: 300 }, // F
      { note: 63, duration: 300 }, // Eb
      { note: 60, duration: 600 }, // C (hold)

      // Bar 3-4 (C7) - Repeat with variation
      { note: 60, duration: 300 }, // C
      { note: 63, duration: 300 }, // Eb
      { note: 65, duration: 300 }, // F
      { note: 66, duration: 150 }, // F# (blues note)
      { note: 67, duration: 750 }, // G (hold longer)

      // Bar 5-6 (F7) - Up to F
      { note: 65, duration: 300 }, // F
      { note: 68, duration: 300 }, // Ab
      { note: 70, duration: 300 }, // Bb
      { note: 72, duration: 600 }, // C (high)
      { note: 70, duration: 300 }, // Bb
      { note: 68, duration: 300 }, // Ab
      { note: 65, duration: 600 }, // F (hold)

      // Bar 7-8 (C7) - Back to C
      { note: 60, duration: 300 }, // C
      { note: 63, duration: 300 }, // Eb
      { note: 65, duration: 300 }, // F
      { note: 67, duration: 900 }, // G (hold)

      // Bar 9 (G7) - Turnaround setup
      { note: 67, duration: 300 }, // G
      { note: 70, duration: 300 }, // Bb
      { note: 72, duration: 300 }, // C (high)
      { note: 74, duration: 300 }, // D

      // Bar 10 (F7) - Descending
      { note: 72, duration: 300 }, // C
      { note: 70, duration: 300 }, // Bb
      { note: 68, duration: 300 }, // Ab
      { note: 65, duration: 300 }, // F

      // Bar 11-12 (C7 - G7) - Final phrase
      { note: 60, duration: 300 }, // C
      { note: 63, duration: 300 }, // Eb
      { note: 65, duration: 300 }, // F
      { note: 67, duration: 300 }, // G
      { note: 65, duration: 300 }, // F
      { note: 63, duration: 300 }, // Eb
      { note: 60, duration: 600 }, // C (resolve)
    ];

    let currentNoteIndex = 0;
    let timeoutId: number;

    const playNextNote = () => {
      if (demoMode !== 'solo') return;

      // Load edited patch (use ref to get latest patch without restarting melody)
      synth.setTrackPatch(PREVIEW_CHANNEL, editedPatchRef.current);

      const currentNote = melody[currentNoteIndex];

      // Highlight the note being played
      setCurrentSoloNote(currentNote.note);

      // Play note
      synth.noteOn(PREVIEW_CHANNEL, currentNote.note);

      // Stop note after duration (with slight gap for articulation)
      setTimeout(() => {
        synth.noteOff(PREVIEW_CHANNEL, currentNote.note);
        setCurrentSoloNote(null);
      }, currentNote.duration * 0.8);

      // Move to next note
      currentNoteIndex = (currentNoteIndex + 1) % melody.length;

      // Schedule next note
      timeoutId = window.setTimeout(playNextNote, currentNote.duration);
    };

    // Start playing
    playNextNote();

    // Cleanup
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Stop any playing notes
      melody.forEach(({ note }) => {
        synth.noteOff(PREVIEW_CHANNEL, note);
      });
      setCurrentSoloNote(null);
    };
  }, [demoMode, synth]);

  // Chord progression playback (C blues)
  useEffect(() => {
    if (demoMode !== 'chords' || !synth) {
      setCurrentChordNotes(new Set());
      return;
    }

    // Use channels 8-11 for 4-note chords (avoiding conflict with tracker channels 0-3)
    const CHORD_CHANNELS = [8, 9, 10, 11];

    // C Blues chord progression (12-bar blues)
    // Each chord is defined as [root, third, fifth, seventh]
    const chordProgression = [
      { name: 'C7', notes: [48, 52, 55, 58], duration: 1000 },   // C7 (C, E, G, Bb)
      { name: 'C7', notes: [48, 52, 55, 58], duration: 1000 },   // C7
      { name: 'C7', notes: [48, 52, 55, 58], duration: 1000 },   // C7
      { name: 'C7', notes: [48, 52, 55, 58], duration: 1000 },   // C7
      { name: 'F7', notes: [53, 57, 60, 63], duration: 1000 },   // F7 (F, A, C, Eb)
      { name: 'F7', notes: [53, 57, 60, 63], duration: 1000 },   // F7
      { name: 'C7', notes: [48, 52, 55, 58], duration: 1000 },   // C7
      { name: 'C7', notes: [48, 52, 55, 58], duration: 1000 },   // C7
      { name: 'G7', notes: [55, 59, 62, 65], duration: 1000 },   // G7 (G, B, D, F)
      { name: 'F7', notes: [53, 57, 60, 63], duration: 1000 },   // F7
      { name: 'C7', notes: [48, 52, 55, 58], duration: 1000 },   // C7
      { name: 'G7', notes: [55, 59, 62, 65], duration: 1000 },   // G7 (turnaround)
    ];

    let currentChordIndex = 0;
    let timeoutId: number;

    const playNextChord = () => {
      if (demoMode !== 'chords') return;

      const currentChord = chordProgression[currentChordIndex];

      // Highlight the notes being played
      setCurrentChordNotes(new Set(currentChord.notes));

      // Play all notes in the chord using separate MIDI channels
      currentChord.notes.forEach((note, index) => {
        const channel = CHORD_CHANNELS[index];
        // Load edited patch (use ref to get latest patch without restarting progression)
        synth.setTrackPatch(channel, editedPatchRef.current);
        synth.noteOn(channel, note);
      });

      // Stop chord after duration (with slight gap for articulation)
      setTimeout(() => {
        currentChord.notes.forEach((note, index) => {
          const channel = CHORD_CHANNELS[index];
          synth.noteOff(channel, note);
        });
        setCurrentChordNotes(new Set());
      }, currentChord.duration * 0.9);

      // Move to next chord
      currentChordIndex = (currentChordIndex + 1) % chordProgression.length;

      // Schedule next chord
      timeoutId = window.setTimeout(playNextChord, currentChord.duration);
    };

    // Start playing
    playNextChord();

    // Cleanup
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Stop any playing notes on all chord channels
      CHORD_CHANNELS.forEach(channel => {
        chordProgression.forEach(chord => {
          chord.notes.forEach(note => {
            synth.noteOff(channel, note);
          });
        });
      });
      setCurrentChordNotes(new Set());
    };
  }, [demoMode, synth]);

  // Arpeggio playback (minor chord progression)
  useEffect(() => {
    if (demoMode !== 'arpeggios' || !synth) {
      setCurrentArpeggioNote(null);
      return;
    }

    const PREVIEW_CHANNEL = 8;

    // Minor chord progression: Am - Dm - Em - Am
    // Each chord: root, minor third, fifth (ascending then descending)
    const arpeggioPattern = [
      // Am (A, C, E)
      { note: 57, duration: 200 }, // A
      { note: 60, duration: 200 }, // C
      { note: 64, duration: 200 }, // E
      { note: 69, duration: 200 }, // A (high)
      { note: 64, duration: 200 }, // E
      { note: 60, duration: 200 }, // C

      // Dm (D, F, A)
      { note: 62, duration: 200 }, // D
      { note: 65, duration: 200 }, // F
      { note: 69, duration: 200 }, // A
      { note: 74, duration: 200 }, // D (high)
      { note: 69, duration: 200 }, // A
      { note: 65, duration: 200 }, // F

      // Em (E, G, B)
      { note: 64, duration: 200 }, // E
      { note: 67, duration: 200 }, // G
      { note: 71, duration: 200 }, // B
      { note: 76, duration: 200 }, // E (high)
      { note: 71, duration: 200 }, // B
      { note: 67, duration: 200 }, // G

      // Am (A, C, E) - resolution
      { note: 57, duration: 200 }, // A
      { note: 60, duration: 200 }, // C
      { note: 64, duration: 200 }, // E
      { note: 69, duration: 200 }, // A (high)
      { note: 64, duration: 200 }, // E
      { note: 60, duration: 200 }, // C
      { note: 57, duration: 400 }, // A (hold)
    ];

    let currentNoteIndex = 0;
    let timeoutId: number;

    const playNextNote = () => {
      if (demoMode !== 'arpeggios') return;

      // Load edited patch
      synth.setTrackPatch(PREVIEW_CHANNEL, editedPatchRef.current);

      const currentNote = arpeggioPattern[currentNoteIndex];

      // Highlight the note being played
      setCurrentArpeggioNote(currentNote.note);

      // Play note
      synth.noteOn(PREVIEW_CHANNEL, currentNote.note);

      // Stop note after duration (with slight gap for articulation)
      setTimeout(() => {
        synth.noteOff(PREVIEW_CHANNEL, currentNote.note);
        setCurrentArpeggioNote(null);
      }, currentNote.duration * 0.8);

      // Move to next note
      currentNoteIndex = (currentNoteIndex + 1) % arpeggioPattern.length;

      // Schedule next note
      timeoutId = window.setTimeout(playNextNote, currentNote.duration);
    };

    // Start playing
    playNextNote();

    // Cleanup
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Stop any playing notes
      arpeggioPattern.forEach(({ note }) => {
        synth.noteOff(PREVIEW_CHANNEL, note);
      });
      setCurrentArpeggioNote(null);
    };
  }, [demoMode, synth]);

  /**
   * Preview the current edited patch
   * Temporarily loads it to channel 8 (unused by tracker)
   */
  const handlePreview = () => {
    if (!synth || isPreviewPlaying) return;

    const PREVIEW_CHANNEL = 8; // Channel 8 unused by 4-track pattern
    const PREVIEW_NOTE = 60;   // Middle C
    const PREVIEW_DURATION = 1000; // 1 second

    console.log('[Editor] Previewing patch:', editedPatch.name);

    // Load edited patch to preview channel
    synth.setTrackPatch(PREVIEW_CHANNEL, editedPatch);

    // Play note
    synth.noteOn(PREVIEW_CHANNEL, PREVIEW_NOTE);
    setIsPreviewPlaying(true);

    // Stop after duration
    setTimeout(() => {
      synth.noteOff(PREVIEW_CHANNEL, PREVIEW_NOTE);
      setIsPreviewPlaying(false);
    }, PREVIEW_DURATION);
  };

  const handleSave = () => {
    onSave(trackId, editedPatch);
  };

  const handleReset = () => {
    console.log('[Editor] Resetting to original patch:', currentPatch.name);
    setEditedPatch(currentPatch);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop itself, not its children
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div className="editor-backdrop" onClick={handleBackdropClick}>
      <div className="editor-modal">
        {/* Header */}
        <div className="editor-header">
          <h2>Edit Instrument - Track {trackId + 1}</h2>
          <button
            className="editor-close"
            onClick={onCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="editor-body">
          <div className="editor-info">
            <p className="current-instrument">
              Current: <strong>{currentPatch.name}</strong>
            </p>
            {currentPatch.category && (
              <p className="instrument-category">
                Category: {currentPatch.category}
              </p>
            )}
          </div>

          {/* Preset Selection */}
          <div className="editor-section">
            <label className="editor-label" htmlFor="preset-select">
              Select Preset
            </label>
            <select
              id="preset-select"
              className="editor-preset-select"
              value={editedPatch.id}
              onChange={(e) => {
                const newPatchId = parseInt(e.target.value, 10);
                const newPatch = availablePatches.find(p => p.id === newPatchId);
                if (newPatch) {
                  setEditedPatch(newPatch);
                }
              }}
            >
              {availablePatches.map(patch => (
                <option key={patch.id} value={patch.id}>
                  {String(patch.id).padStart(3, '0')} - {patch.name}
                  {patch.category ? ` (${patch.category})` : ''}
                </option>
              ))}
            </select>

            {editedPatch.id !== currentPatch.id && (
              <p className="editor-change-notice">
                ⚠️ Preset changed. Click Save to apply.
              </p>
            )}
          </div>

          {/* ADSR Envelope */}
          <div className="editor-section">
            <h3 className="editor-section-title">Envelope (ADSR)</h3>
            <p className="editor-section-desc">
              Controls how the sound evolves over time
            </p>

            {/* Attack */}
            <div className="editor-param">
              <label className="editor-param-label">Attack</label>
              <div className="editor-slider-row">
                <span className="editor-operator-label">Mod:</span>
                <input
                  type="range"
                  className="editor-slider"
                  min="0"
                  max="15"
                  value={editedPatch.modulator.attackRate}
                  onChange={(e) => setEditedPatch({
                    ...editedPatch,
                    modulator: { ...editedPatch.modulator, attackRate: parseInt(e.target.value) }
                  })}
                />
                <span className="editor-value">{editedPatch.modulator.attackRate}</span>
                <span className="editor-operator-label">Car:</span>
                <input
                  type="range"
                  className="editor-slider"
                  min="0"
                  max="15"
                  value={editedPatch.carrier.attackRate}
                  onChange={(e) => setEditedPatch({
                    ...editedPatch,
                    carrier: { ...editedPatch.carrier, attackRate: parseInt(e.target.value) }
                  })}
                />
                <span className="editor-value">{editedPatch.carrier.attackRate}</span>
              </div>
              <p className="editor-param-hint">Higher = faster attack (15 = instant)</p>
            </div>

            {/* Decay */}
            <div className="editor-param">
              <label className="editor-param-label">Decay</label>
              <div className="editor-slider-row">
                <span className="editor-operator-label">Mod:</span>
                <input
                  type="range"
                  className="editor-slider"
                  min="0"
                  max="15"
                  value={editedPatch.modulator.decayRate}
                  onChange={(e) => setEditedPatch({
                    ...editedPatch,
                    modulator: { ...editedPatch.modulator, decayRate: parseInt(e.target.value) }
                  })}
                />
                <span className="editor-value">{editedPatch.modulator.decayRate}</span>
                <span className="editor-operator-label">Car:</span>
                <input
                  type="range"
                  className="editor-slider"
                  min="0"
                  max="15"
                  value={editedPatch.carrier.decayRate}
                  onChange={(e) => setEditedPatch({
                    ...editedPatch,
                    carrier: { ...editedPatch.carrier, decayRate: parseInt(e.target.value) }
                  })}
                />
                <span className="editor-value">{editedPatch.carrier.decayRate}</span>
              </div>
              <p className="editor-param-hint">How fast volume drops to sustain</p>
            </div>

            {/* Sustain */}
            <div className="editor-param">
              <label className="editor-param-label">Sustain Level</label>
              <div className="editor-slider-row">
                <span className="editor-operator-label">Mod:</span>
                <input
                  type="range"
                  className="editor-slider"
                  min="0"
                  max="15"
                  value={editedPatch.modulator.sustainLevel}
                  onChange={(e) => setEditedPatch({
                    ...editedPatch,
                    modulator: { ...editedPatch.modulator, sustainLevel: parseInt(e.target.value) }
                  })}
                />
                <span className="editor-value">{editedPatch.modulator.sustainLevel}</span>
                <span className="editor-operator-label">Car:</span>
                <input
                  type="range"
                  className="editor-slider"
                  min="0"
                  max="15"
                  value={editedPatch.carrier.sustainLevel}
                  onChange={(e) => setEditedPatch({
                    ...editedPatch,
                    carrier: { ...editedPatch.carrier, sustainLevel: parseInt(e.target.value) }
                  })}
                />
                <span className="editor-value">{editedPatch.carrier.sustainLevel}</span>
              </div>
              <p className="editor-param-hint">Volume while held (0 = loudest, 15 = quietest)</p>
            </div>

            {/* Release */}
            <div className="editor-param">
              <label className="editor-param-label">Release</label>
              <div className="editor-slider-row">
                <span className="editor-operator-label">Mod:</span>
                <input
                  type="range"
                  className="editor-slider"
                  min="0"
                  max="15"
                  value={editedPatch.modulator.releaseRate}
                  onChange={(e) => setEditedPatch({
                    ...editedPatch,
                    modulator: { ...editedPatch.modulator, releaseRate: parseInt(e.target.value) }
                  })}
                />
                <span className="editor-value">{editedPatch.modulator.releaseRate}</span>
                <span className="editor-operator-label">Car:</span>
                <input
                  type="range"
                  className="editor-slider"
                  min="0"
                  max="15"
                  value={editedPatch.carrier.releaseRate}
                  onChange={(e) => setEditedPatch({
                    ...editedPatch,
                    carrier: { ...editedPatch.carrier, releaseRate: parseInt(e.target.value) }
                  })}
                />
                <span className="editor-value">{editedPatch.carrier.releaseRate}</span>
              </div>
              <p className="editor-param-hint">How fast sound fades after release</p>
            </div>
          </div>

          {/* Piano Keyboard Preview */}
          <div className="editor-section">
            <div className="editor-keyboard-container">
              {synth ? (
                <>
                  <PianoKeyboard
                    startNote={48}
                    endNote={72}
                    height={100}
                    showLabels={true}
                    compact={true}
                    activeNotes={(() => {
                      const activeNotes = new Set<number>();
                      if (currentSoloNote !== null) activeNotes.add(currentSoloNote);
                      if (currentArpeggioNote !== null) activeNotes.add(currentArpeggioNote);
                      currentChordNotes.forEach(note => activeNotes.add(note));
                      return activeNotes.size > 0 ? activeNotes : undefined;
                    })()}
                    onNoteOn={(note) => {
                      // Load edited patch to preview channel before playing
                      const PREVIEW_CHANNEL = 8;
                      synth.setTrackPatch(PREVIEW_CHANNEL, editedPatch);
                      synth.noteOn(PREVIEW_CHANNEL, note);
                    }}
                    onNoteOff={(note) => {
                      const PREVIEW_CHANNEL = 8;
                      synth.noteOff(PREVIEW_CHANNEL, note);
                    }}
                  />
                  <div className="editor-demos-control">
                    <label className="editor-demos-title">Demos</label>
                    <div className="editor-demos-options">
                      <label className="editor-demo-option">
                        <input
                          type="radio"
                          name="demo-mode"
                          value="none"
                          checked={demoMode === 'none'}
                          onChange={() => setDemoMode('none')}
                        />
                        <span>None</span>
                      </label>
                      <label className="editor-demo-option">
                        <input
                          type="radio"
                          name="demo-mode"
                          value="solo"
                          checked={demoMode === 'solo'}
                          onChange={() => setDemoMode('solo')}
                        />
                        <span>Solo</span>
                      </label>
                      <label className="editor-demo-option">
                        <input
                          type="radio"
                          name="demo-mode"
                          value="chords"
                          checked={demoMode === 'chords'}
                          onChange={() => setDemoMode('chords')}
                        />
                        <span>Chords</span>
                      </label>
                      <label className="editor-demo-option">
                        <input
                          type="radio"
                          name="demo-mode"
                          value="arpeggios"
                          checked={demoMode === 'arpeggios'}
                          onChange={() => setDemoMode('arpeggios')}
                        />
                        <span>Arpeggios</span>
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <p className="editor-keyboard-disabled">
                  Synth not available
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="editor-footer">
          <button
            className="editor-button editor-button-preview"
            onClick={handlePreview}
            disabled={!synth || isPreviewPlaying}
          >
            {isPreviewPlaying ? 'Playing...' : '▶ Preview'}
          </button>
          <button
            className="editor-button editor-button-reset"
            onClick={handleReset}
          >
            Reset
          </button>
          <button
            className="editor-button editor-button-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="editor-button editor-button-save"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
