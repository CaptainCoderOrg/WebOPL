/**
 * InstrumentEditor Component
 * Modal for editing instrument parameters
 */

import { useState, useEffect } from 'react';
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

  // Reset local state when currentPatch changes
  useEffect(() => {
    setEditedPatch(currentPatch);
  }, [currentPatch]);

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
            <h3 className="editor-section-title">Test Keyboard</h3>
            <p className="editor-section-desc">
              Click keys to test the edited instrument
            </p>

            <div className="editor-keyboard-container">
              {synth ? (
                <PianoKeyboard
                  startNote={60}
                  endNote={72}
                  height={100}
                  showLabels={true}
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
