/**
 * ExportModal - WAV export UI and logic
 *
 * Provides two export modes:
 * 1. Standard Export - Direct export with optional fade in/out
 * 2. Seamless Loop Export - Context-aware rendering for perfect loops
 */

import { useState, useEffect } from 'react';
import type { OPLPatch } from '../types/OPLPatch';
import {
  calculateDuration,
  calculateFileSize,
  formatFileSize,
  formatDuration,
  sanitizeFilename,
} from '../utils/exportHelpers';
import {
  exportStandard,
  exportSeamlessLoop,
  downloadWAV,
} from '../export/exportPattern';
import { generateWaveformFromWAV } from '../utils/waveformGenerator';
import { normalizeAudio, applyFades } from '../utils/audioProcessing';
import { WaveformDisplay } from './WaveformDisplay';
import './ExportModal.css';

export interface ExportModalProps {
  /** Pattern name (for filename) */
  patternName?: string;

  /** Pattern data (2D array of cell strings) */
  pattern: string[][];

  /** Track instrument assignments */
  trackInstruments: number[];

  /** Instrument bank */
  instrumentBank: OPLPatch[];

  /** Beats per minute */
  bpm: number;

  /** Callback when modal should close */
  onClose: () => void;

  /** Callback when export completes successfully */
  onExportComplete?: (filename: string) => void;
}

export function ExportModal({
  patternName = 'Untitled Pattern',
  pattern,
  trackInstruments,
  instrumentBank,
  bpm,
  onClose,
  onExportComplete,
}: ExportModalProps) {
  // Export mode state
  const [seamlessLoop, setSeamlessLoop] = useState(false);

  // Loop options (always visible)
  const [loopCount, setLoopCount] = useState<number>(1);
  const [editingCustomLoop, setEditingCustomLoop] = useState(false);
  const [customLoopInput, setCustomLoopInput] = useState('5');

  // Seamless loop advanced options
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [contextRows, setContextRows] = useState(8);

  // Standard mode options
  const [fadeIn, setFadeIn] = useState(false);
  const [fadeInDuration, setFadeInDuration] = useState<number | ''>(1000); // ms
  const [fadeOut, setFadeOut] = useState(false);
  const [fadeOutDuration, setFadeOutDuration] = useState<number | ''>(1000); // ms

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [generatedWAV, setGeneratedWAV] = useState<ArrayBuffer | null>(null);
  const [originalWAV, setOriginalWAV] = useState<ArrayBuffer | null>(null);
  const [waveformData, setWaveformData] = useState<number[] | null>(null);

  // Post-processing state
  const [normalizeEnabled, setNormalizeEnabled] = useState(false);
  const [normalizeDb, setNormalizeDb] = useState<number>(-1); // Target dB (default to -1 dB)

  // Calculate pattern info
  const rows = pattern.length;
  const tracks = pattern[0]?.length || 0;
  const baseDuration = calculateDuration(rows, bpm, 4);

  // Calculate final duration (fades are applied over existing audio, not added)
  const finalDuration = baseDuration * loopCount;

  // Calculate file size
  const fileSize = calculateFileSize(finalDuration, 49716);

  // Generate filename
  const filename = `${sanitizeFilename(patternName)}.wav`;

  /**
   * Handle export button click
   */
  const handleExport = async () => {
    // Create abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);

    try {
      setIsExporting(true);
      setProgress(0);
      setProgressMessage('Starting export...');
      setError(null);
      setGeneratedWAV(null);
      setWaveformData(null);

      const onProgress = (progress: number, message: string) => {
        setProgress(progress);
        setProgressMessage(message);
      };

      let wavBuffer: ArrayBuffer;

      if (seamlessLoop) {
        // Seamless loop export
        wavBuffer = await exportSeamlessLoop({
          patternName,
          pattern,
          trackInstruments,
          instrumentBank,
          bpm,
          loopCount,
          contextRows,
          onProgress,
          abortSignal: controller.signal,
        });
      } else {
        // Standard export with optional fades
        wavBuffer = await exportStandard({
          patternName,
          pattern,
          trackInstruments,
          instrumentBank,
          bpm,
          loopCount,
          fadeIn,
          fadeInDuration: typeof fadeInDuration === 'number' ? fadeInDuration : 1000,
          fadeOut,
          fadeOutDuration: typeof fadeOutDuration === 'number' ? fadeOutDuration : 1000,
          onProgress,
          abortSignal: controller.signal,
        });
      }

      // Store the original WAV (before any post-processing)
      setOriginalWAV(wavBuffer);

      // Store the generated WAV (will be updated by post-processing)
      setGeneratedWAV(wavBuffer);

      // Generate waveform data for visualization
      const waveform = generateWaveformFromWAV(wavBuffer, 1000);
      setWaveformData(waveform);

      setIsExporting(false);
      setAbortController(null);

      // Call success callback
      onExportComplete?.(filename);

    } catch (err) {
      console.error('[ExportModal] Export failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      setError(errorMessage);
      setIsExporting(false);
      setAbortController(null);
    }
  };

  /**
   * Handle download button click
   */
  const handleDownload = () => {
    if (generatedWAV) {
      downloadWAV(generatedWAV, filename);
    }
  };

  /**
   * Handle cancel export
   */
  const handleCancelExport = () => {
    if (abortController) {
      abortController.abort();
      setIsExporting(false);
      setProgress(0);
      setProgressMessage('');
      setAbortController(null);
    }
  };

  /**
   * Handle loop count button click (1-4)
   */
  const handleLoopCountClick = (count: number) => {
    setLoopCount(count);
    setEditingCustomLoop(false);
  };

  /**
   * Handle custom loop count input (5+ button)
   */
  const handleCustomLoopClick = () => {
    setEditingCustomLoop(true);
    setCustomLoopInput(loopCount > 4 ? String(loopCount) : '5');
  };

  /**
   * Validate and apply custom loop count
   */
  const applyCustomLoopCount = () => {
    const parsed = parseInt(customLoopInput, 10);

    if (isNaN(parsed) || parsed < 1) {
      // Invalid or < 1: set to 1 and select button 1
      setLoopCount(1);
      setEditingCustomLoop(false);
    } else if (parsed >= 1 && parsed <= 4) {
      // 1-4: select the appropriate button
      setLoopCount(parsed);
      setEditingCustomLoop(false);
    } else {
      // > 4: keep custom
      setLoopCount(parsed);
      setEditingCustomLoop(false);
    }
  };

  /**
   * Handle custom loop input change
   */
  const handleCustomLoopInputChange = (value: string) => {
    // Only allow digits
    if (/^\d*$/.test(value)) {
      setCustomLoopInput(value);
    }
  };

  /**
   * Handle custom loop input mouse leave
   */
  const handleCustomLoopMouseLeave = () => {
    applyCustomLoopCount();
  };

  /**
   * Handle custom loop input key press
   */
  const handleCustomLoopKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      applyCustomLoopCount();
    } else if (e.key === 'Escape') {
      setEditingCustomLoop(false);
    }
  };

  /**
   * Convert slider position (0-100) to dB value (-16 to 0)
   * Non-linear mapping with 50% of slider dedicated to -1dB to -3dB
   * Flipped: 0% = -16 dB (left), 100% = 0 dB (right)
   */
  const sliderToDb = (sliderValue: number): number => {
    // Piecewise linear mapping (inverted):
    // 0-25% slider → -16 to -3 dB
    // 25-75% slider → -3 to -1 dB (50% of slider for 2 dB range)
    // 75-100% slider → -1 to 0 dB

    if (sliderValue <= 25) {
      // 0-25% → -16 to -3 dB
      const normalized = sliderValue / 25; // 0-1 within this range
      const db = -16 + (normalized * 13); // -16 to -3
      return Math.round(db * 10) / 10; // Round to 0.1
    } else if (sliderValue <= 75) {
      // 25-75% → -3 to -1 dB
      const normalized = (sliderValue - 25) / 50; // 0-1 within this range
      const db = -3 + (normalized * 2); // -3 to -1
      return Math.round(db * 10) / 10; // Round to 0.1
    } else {
      // 75-100% → -1 to 0 dB
      const normalized = (sliderValue - 75) / 25; // 0-1 within this range
      const db = -1 + (normalized * 1); // -1 to 0
      return Math.round(db * 10) / 10; // Round to 0.1
    }
  };

  /**
   * Convert dB value (-16 to 0) to slider position (0-100)
   * Inverse of sliderToDb
   * Flipped: -16 dB = 0% (left), 0 dB = 100% (right)
   */
  const dbToSlider = (db: number): number => {
    // Handle exact boundary values to ensure perfect alignment with markers
    if (db === -3) return 25;
    if (db === -1) return 75;

    if (db < -3) {
      // -16 to -3 dB → 0-25% slider
      const normalized = (db - (-16)) / 13; // 0-1 within -16 to -3 range
      return normalized * 25;
    } else if (db < -1) {
      // -3 to -1 dB → 25-75% slider
      const normalized = (db - (-3)) / 2; // 0-1 within -3 to -1 range
      return 25 + normalized * 50;
    } else {
      // -1 to 0 dB → 75-100% slider
      const normalized = (db - (-1)) / 1; // 0-1 within -1 to 0 range
      return 75 + normalized * 25;
    }
  };

  /**
   * Handle slider change - convert to dB with snapping
   */
  const handleNormalizeSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sliderValue = parseFloat(e.target.value);
    const db = sliderToDb(sliderValue);
    setNormalizeDb(db);
  };

  /**
   * Handle keyboard arrow keys for fine adjustment
   * Always adjusts by exactly 0.1 dB
   */
  const handleNormalizeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();

      const dbStep = 0.1; // Always adjust by 0.1 dB
      let newDb;

      if (e.key === 'ArrowLeft') {
        // Decrease dB (move left, quieter)
        newDb = Math.max(-16, normalizeDb - dbStep);
      } else {
        // Increase dB (move right, louder)
        newDb = Math.min(0, normalizeDb + dbStep);
      }

      // Round to nearest 0.1 to avoid floating point errors
      newDb = Math.round(newDb * 10) / 10;
      setNormalizeDb(newDb);
    }
  };

  /**
   * Apply post-processing (normalization and fades) when settings change
   */
  useEffect(() => {
    if (!originalWAV) return;

    let processedWAV = originalWAV;

    // Apply normalization if enabled
    if (normalizeEnabled && typeof normalizeDb === 'number') {
      processedWAV = normalizeAudio(processedWAV, normalizeDb);
    }

    // Apply fades if enabled
    if (fadeIn || fadeOut) {
      const fadeInMs = fadeIn && typeof fadeInDuration === 'number' ? fadeInDuration : 0;
      const fadeOutMs = fadeOut && typeof fadeOutDuration === 'number' ? fadeOutDuration : 0;
      processedWAV = applyFades(processedWAV, fadeInMs, fadeOutMs);
    }

    // Update the generated WAV and waveform
    setGeneratedWAV(processedWAV);
    const waveform = generateWaveformFromWAV(processedWAV, 1000);
    setWaveformData(waveform);
  }, [normalizeEnabled, normalizeDb, fadeIn, fadeInDuration, fadeOut, fadeOutDuration, originalWAV]);

  return (
    <div className="export-modal">
      {/* Pattern Info Card */}
      <div className="export-info-card">
        <h3 className="export-section-title">Pattern Information</h3>
        <div className="export-info-grid">
          <div className="export-info-item">
            <span className="export-info-label">Pattern:</span>
            <span className="export-info-value">{patternName}</span>
          </div>
          <div className="export-info-item">
            <span className="export-info-label">Rows:</span>
            <span className="export-info-value">{rows}</span>
          </div>
          <div className="export-info-item">
            <span className="export-info-label">Tracks:</span>
            <span className="export-info-value">{tracks}</span>
          </div>
          <div className="export-info-item">
            <span className="export-info-label">BPM:</span>
            <span className="export-info-value">{bpm}</span>
          </div>
          <div className="export-info-item">
            <span className="export-info-label">Base Duration:</span>
            <span className="export-info-value">{formatDuration(baseDuration)}</span>
          </div>
          <div className="export-info-item">
            <span className="export-info-label">Sample Rate:</span>
            <span className="export-info-value">49,716 Hz</span>
          </div>
        </div>
      </div>

      {/* Mode Section */}
      <div className="export-mode-section">
        <h3 className="export-section-title">Mode</h3>

        {/* Mode Selection */}
        <div className="export-mode-options">
          <label className="export-radio-label">
            <input
              type="radio"
              name="export-mode"
              checked={!seamlessLoop}
              onChange={() => setSeamlessLoop(false)}
              className="export-radio"
            />
            <span className="export-radio-text">Normal</span>
          </label>
          <label className="export-radio-label">
            <input
              type="radio"
              name="export-mode"
              checked={seamlessLoop}
              onChange={() => setSeamlessLoop(true)}
              className="export-radio"
            />
            <span className="export-radio-text">Seamless Loop</span>
          </label>
        </div>
        <p className="export-mode-description">
          {seamlessLoop
            ? 'Uses context-aware rendering to create a perfect loop with no audible clicks at the loop boundary.'
            : 'Standard export with optional fade in/out to prevent clicks at start/end.'}
        </p>

        {/* Loop Count */}
        <div className="export-option" style={{ marginTop: '20px' }}>
          <div className="export-loop-count-row">
            <label className="export-option-label">Loop Count</label>
            <div className="export-loop-count-buttons">
              {[1, 2, 3, 4].map((count) => (
                <button
                  key={count}
                  type="button"
                  className={`export-loop-count-button ${
                    loopCount === count && !editingCustomLoop ? 'active' : ''
                  }`}
                  onClick={() => handleLoopCountClick(count)}
                >
                  {count}
                </button>
              ))}
              {/* Custom Loop Count (5+) */}
              {editingCustomLoop ? (
                <input
                  type="text"
                  value={customLoopInput}
                  onChange={(e) => handleCustomLoopInputChange(e.target.value)}
                  onMouseLeave={handleCustomLoopMouseLeave}
                  onKeyDown={handleCustomLoopKeyDown}
                  className="export-loop-count-input"
                  placeholder="5+"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  className={`export-loop-count-button ${
                    loopCount > 4 ? 'active' : ''
                  }`}
                  onClick={handleCustomLoopClick}
                >
                  {loopCount > 4 ? loopCount : '5+'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Seamless Loop Advanced Settings */}
        {seamlessLoop && (
          <div className="export-option" style={{ marginTop: '20px' }}>
            <button
              type="button"
              className="export-advanced-toggle"
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            >
              <span className="export-advanced-toggle-icon">
                {showAdvancedSettings ? '▼' : '▶'}
              </span>
              Advanced Settings
            </button>

            {showAdvancedSettings && (
              <div style={{ marginTop: '12px' }}>
                <label className="export-option-label">
                  Context Rows: <strong>{contextRows}</strong>
                </label>
                <input
                  type="range"
                  min="4"
                  max="16"
                  value={contextRows}
                  onChange={(e) => setContextRows(parseInt(e.target.value, 10))}
                  className="export-slider"
                />
                <div className="export-slider-labels">
                  <span>4 (faster)</span>
                  <span>16 (more context)</span>
                </div>
                <p className="export-option-hint">
                  Renders [last {contextRows} rows | pattern | first {contextRows} rows],
                  then extracts the core pattern. Higher values provide more musical context
                  for seamless loops but increase render time slightly. Default: 8 rows.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Export Summary */}
      <div className="export-summary-section">
        <h3 className="export-section-title">Export Summary</h3>
        <div className="export-summary-grid">
          <div className="export-summary-item">
            <span className="export-summary-label">Filename:</span>
            <span className="export-summary-value">{filename}</span>
          </div>
          <div className="export-summary-item">
            <span className="export-summary-label">Duration:</span>
            <span className="export-summary-value">{formatDuration(finalDuration)}</span>
          </div>
          <div className="export-summary-item">
            <span className="export-summary-label">File Size:</span>
            <span className="export-summary-value">{formatFileSize(fileSize)}</span>
          </div>
          <div className="export-summary-item">
            <span className="export-summary-label">Format:</span>
            <span className="export-summary-value">WAV PCM 16-bit Stereo</span>
          </div>
        </div>
      </div>

      {/* Progress / Waveform Section */}
      {(isExporting || generatedWAV) && (
        <div className="export-progress-section">
          <div className="export-progress-row">
            {/* Show progress bar while exporting, waveform when complete */}
            {isExporting ? (
              <div className="export-progress-bar">
                <div
                  className="export-progress-fill"
                  style={{ width: `${progress}%` }}
                />
                <span className="export-progress-text">
                  {progress}% - {progressMessage || 'Processing...'}
                </span>
              </div>
            ) : waveformData ? (
              <WaveformDisplay
                waveformData={waveformData}
                wavBuffer={generatedWAV || undefined}
                width={600}
                height={80}
              />
            ) : null}

            {/* Cancel button while exporting, Save button when complete */}
            {isExporting ? (
              <button
                type="button"
                onClick={handleCancelExport}
                className="export-button export-button-secondary"
              >
                Cancel
              </button>
            ) : generatedWAV ? (
              <button
                type="button"
                onClick={handleDownload}
                className="export-button export-button-primary"
              >
                Save
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* Post-Processing Section */}
      {generatedWAV && !isExporting && (
        <div className="export-options-section">
          <h3 className="export-section-title">Post-Processing</h3>

          {/* Normalize Option */}
          <div className="export-option">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <label className="export-checkbox-label" style={{ flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={normalizeEnabled}
                    onChange={(e) => setNormalizeEnabled(e.target.checked)}
                    className="export-checkbox"
                  />
                  <span className="export-checkbox-text">Normalize</span>
                </label>

                {normalizeEnabled && (
                  <div style={{ flex: 1 }}>
                    {/* Slider with non-linear mapping */}
                    <div className="export-slider-container">
                      {/* Visual marker labels at -3dB (25%) and -1dB (75%) */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '-24px',
                          left: 'calc(25% + 4px)',
                          transform: 'translateX(-50%)',
                          fontSize: '11px',
                          color: '#4a9eff',
                          fontWeight: 600,
                          pointerEvents: 'none',
                        }}
                      >
                        -3 dB
                      </div>
                      <div
                        style={{
                          position: 'absolute',
                          top: '-24px',
                          left: 'calc(75% - 4px)',
                          transform: 'translateX(-50%)',
                          fontSize: '11px',
                          color: '#4a9eff',
                          fontWeight: 600,
                          pointerEvents: 'none',
                        }}
                      >
                        -1 dB
                      </div>

                      {/* Visual marker lines at -3dB (25%) and -1dB (75%) */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '0',
                          left: 'calc(25% + 4px)',
                          transform: 'translateX(-50%)',
                          width: '2px',
                          height: '10px',
                          background: '#4a9eff',
                          pointerEvents: 'none',
                        }}
                        title="-3 dB"
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '0',
                          left: 'calc(75% - 4px)',
                          transform: 'translateX(-50%)',
                          width: '2px',
                          height: '10px',
                          background: '#4a9eff',
                          pointerEvents: 'none',
                        }}
                        title="-1 dB"
                      />

                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.1"
                        value={dbToSlider(normalizeDb)}
                        onChange={handleNormalizeSliderChange}
                        onKeyDown={handleNormalizeKeyDown}
                        className="export-slider"
                        disabled={!normalizeEnabled}
                      />

                      {/* Current value label positioned at slider thumb */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '22px',
                          left: `${dbToSlider(normalizeDb)}%`,
                          transform: 'translateX(-50%)',
                          fontSize: '13px',
                          color: '#e0e0e0',
                          fontWeight: 600,
                          pointerEvents: 'none',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {normalizeDb.toFixed(1)} dB
                      </div>

                      <div className="export-slider-labels">
                        <span>-16 dB</span>
                        <span>0 dB</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Warning and helper text - spans full width */}
              {normalizeEnabled && (
                <>
                  {/* Warning when outside typical range */}
                  {(normalizeDb < -3 || normalizeDb > -1) && (
                    <p className="export-option-hint" style={{ color: '#ffaa44', fontWeight: 500, margin: 0 }}>
                      ⚠️ Typical normalization is between -1 dB and -3 dB
                    </p>
                  )}

                  <p className="export-option-hint" style={{ margin: 0 }}>
                    Sets the peak level of the audio. -1 dB to -3 dB is the typical range for
                    preventing clipping while maintaining loudness.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Fade Options */}
          <div className="export-option" style={{ marginTop: '20px' }}>
            <div className="export-fade-combined-row">
              {/* Fade In */}
              <div className="export-fade-control">
                <label className="export-checkbox-label">
                  <input
                    type="checkbox"
                    checked={fadeIn}
                    onChange={(e) => setFadeIn(e.target.checked)}
                    className="export-checkbox"
                  />
                  <span className="export-checkbox-text">Fade In</span>
                </label>
                <div className="export-fade-input-group">
                  <input
                    type="number"
                    min="10"
                    max="2000"
                    step="10"
                    value={fadeInDuration}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFadeInDuration(val === '' ? '' : parseInt(val, 10));
                    }}
                    onBlur={() => {
                      if (fadeInDuration === '' || isNaN(fadeInDuration) || fadeInDuration < 10) {
                        setFadeInDuration(1000);
                      }
                    }}
                    disabled={!fadeIn}
                    className="export-number-input"
                  />
                  <span className="export-fade-unit">ms</span>
                </div>
              </div>

              {/* Fade Out */}
              <div className="export-fade-control">
                <label className="export-checkbox-label">
                  <input
                    type="checkbox"
                    checked={fadeOut}
                    onChange={(e) => setFadeOut(e.target.checked)}
                    className="export-checkbox"
                  />
                  <span className="export-checkbox-text">Fade Out</span>
                </label>
                <div className="export-fade-input-group">
                  <input
                    type="number"
                    min="10"
                    max="2000"
                    step="10"
                    value={fadeOutDuration}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFadeOutDuration(val === '' ? '' : parseInt(val, 10));
                    }}
                    onBlur={() => {
                      if (fadeOutDuration === '' || isNaN(fadeOutDuration) || fadeOutDuration < 10) {
                        setFadeOutDuration(1000);
                      }
                    }}
                    disabled={!fadeOut}
                    className="export-number-input"
                  />
                  <span className="export-fade-unit">ms</span>
                </div>
              </div>
            </div>
            <p className="export-option-hint" style={{ margin: '12px 0 0 0' }}>
              Apply fade in and/or fade out effects to the audio. Fades are applied after normalization.
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="export-actions">
        <button
          type="button"
          onClick={onClose}
          className="export-button export-button-secondary"
          disabled={isExporting}
        >
          Close
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="export-button export-button-primary"
          disabled={isExporting}
        >
          {isExporting ? 'Exporting...' : generatedWAV ? 'Regenerate' : 'Generate'}
        </button>
      </div>

      {/* Error Section */}
      {error && (
        <div className="export-error-section">
          <p className="export-error-text">❌ {error}</p>
        </div>
      )}
    </div>
  );
}
