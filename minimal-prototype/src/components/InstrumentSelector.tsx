/**
 * InstrumentSelector - Track-level instrument selection
 *
 * Displays dropdown menus to choose instruments per track.
 * Includes edit buttons for future instrument editor integration.
 */

import './InstrumentSelector.css';
import type { OPLPatch } from '../types/OPLPatch';

interface InstrumentSelectorProps {
  trackInstruments: number[];           // Array of 4 patch IDs (one per track)
  instrumentBank: OPLPatch[];           // All available patches
  onInstrumentChange: (trackIndex: number, patchId: number) => void;
  onEditClick: (trackIndex: number) => void;
  disabled?: boolean;                   // Disable during playback
}

export function InstrumentSelector({
  trackInstruments,
  instrumentBank,
  onInstrumentChange,
  onEditClick,
  disabled = false,
}: InstrumentSelectorProps) {
  // Track colors for visual distinction
  const trackColors = ['#00ff00', '#00aaff', '#ffaa00', '#ff00ff'];
  const trackNames = ['Track 1', 'Track 2', 'Track 3', 'Track 4'];

  return (
    <div className="instrument-selector">
      <label className="selector-label">🎸 Instruments:</label>

      <div className="selector-tracks">
        {trackInstruments.map((patchId, trackIndex) => {
          const trackColor = trackColors[trackIndex];

          return (
            <div key={trackIndex} className="track-instrument">
              <span
                className="track-label"
                style={{ color: trackColor }}
              >
                {trackNames[trackIndex]}:
              </span>

              <select
                value={patchId}
                onChange={(e) => onInstrumentChange(trackIndex, parseInt(e.target.value, 10))}
                disabled={disabled}
                className="instrument-dropdown"
                aria-label={`Instrument for ${trackNames[trackIndex]}`}
              >
                {instrumentBank.map((p, idx) => (
                  <option key={idx} value={idx}>
                    {String(idx).padStart(3, '0')} - {p.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => onEditClick(trackIndex)}
                disabled={disabled}
                className="edit-button"
                title={`Edit instrument for ${trackNames[trackIndex]}`}
                aria-label={`Edit instrument for ${trackNames[trackIndex]}`}
              >
                ✏️
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
