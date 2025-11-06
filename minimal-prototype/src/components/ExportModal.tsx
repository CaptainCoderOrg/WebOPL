/**
 * ExportModal - WAV export UI and logic
 *
 * Provides two export modes:
 * 1. Standard Export - Direct export with optional fade in/out
 * 2. Seamless Loop Export - Context-aware rendering for perfect loops
 */

import { useState } from 'react';
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
} from '../export/exportPattern';
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

      const onProgress = (progress: number, message: string) => {
        setProgress(progress);
        setProgressMessage(message);
      };

      if (seamlessLoop) {
        // Seamless loop export
        await exportSeamlessLoop({
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
        await exportStandard({
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

      // Call success callback
      onExportComplete?.(filename);

      // Keep modal open for a moment to show success
      setTimeout(() => {
        setIsExporting(false);
        setProgress(0);
        setProgressMessage('');
        setAbortController(null);
      }, 1000);

    } catch (err) {
      console.error('[ExportModal] Export failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      setError(errorMessage);
      setIsExporting(false);
      setAbortController(null);
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

        {/* Standard Export Fade Options */}
        {!seamlessLoop && (
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

      {/* Action Buttons */}
      <div className="export-actions">
        <button
          type="button"
          onClick={onClose}
          className="export-button export-button-secondary"
          disabled={isExporting}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="export-button export-button-primary"
          disabled={isExporting}
        >
          {isExporting ? 'Exporting...' : 'Generate WAV'}
        </button>
      </div>

      {/* Progress Section */}
      {isExporting && (
        <div className="export-progress-section">
          <div className="export-progress-bar">
            <div
              className="export-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="export-progress-text">
            {progress}% - {progressMessage || 'Processing...'}
          </p>
          <button
            type="button"
            onClick={handleCancelExport}
            className="export-button export-button-secondary"
            style={{ marginTop: '12px' }}
          >
            Cancel Export
          </button>
        </div>
      )}

      {/* Error Section */}
      {error && (
        <div className="export-error-section">
          <p className="export-error-text">❌ {error}</p>
        </div>
      )}
    </div>
  );
}
