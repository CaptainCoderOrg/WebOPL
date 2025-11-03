/**
 * DualVoiceTest - Interactive Test UI for Dual-Voice Playback
 *
 * Tests SimpleSynth dual-voice integration with ChannelManager.
 */

import { useState, useEffect } from 'react';
import { SimpleSynth } from '../SimpleSynth';
import type { OPLPatch } from '../types/OPLPatch';
import './DualVoiceTest.css';

interface DualVoiceTestProps {
  synth: SimpleSynth;
  patches: OPLPatch[];
}

export function DualVoiceTest({ synth, patches }: DualVoiceTestProps) {
  const [selectedPatchId, setSelectedPatchId] = useState(0);
  const [testLog, setTestLog] = useState<string[]>([]);
  const [channelStats, setChannelStats] = useState({ free: 9, allocated: 0, dualVoiceNotes: 0 });
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const [isDualVoiceEnabled, setIsDualVoiceEnabled] = useState(true);

  const currentPatch = patches[selectedPatchId];

  const log = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLog(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const updateStats = () => {
    setChannelStats(synth.getChannelManagerStats());
  };

  const clearLog = () => {
    setTestLog([]);
  };

  // Load patch when selection changes
  useEffect(() => {
    if (currentPatch) {
      // Create a copy of the patch with dual-voice toggle
      const patchCopy = {
        ...currentPatch,
        dualVoiceEnabled: isDualVoiceEnabled && currentPatch.dualVoiceEnabled
      };
      synth.loadPatch(0, patchCopy);
      log(`Loaded: ${currentPatch.name} (ID ${currentPatch.id})`);
      log(`  Dual-voice: ${patchCopy.dualVoiceEnabled ? 'ENABLED' : 'DISABLED'}`);
      if (currentPatch.dualVoiceEnabled) {
        log(`  Voice 1: feedback=${currentPatch.voice1?.feedback}, connection=${currentPatch.voice1?.connection}`);
        log(`  Voice 2: feedback=${currentPatch.voice2?.feedback}, connection=${currentPatch.voice2?.connection}`);
      }
    }
  }, [selectedPatchId, isDualVoiceEnabled, synth, currentPatch]);

  const playNote = (midiNote: number) => {
    if (activeNotes.has(midiNote)) return; // Already playing

    // Reload patch to ensure dual-voice setting is applied
    const patchCopy = {
      ...currentPatch,
      dualVoiceEnabled: isDualVoiceEnabled && currentPatch.dualVoiceEnabled
    };
    synth.loadPatch(0, patchCopy);

    synth.noteOn(0, midiNote, 100);
    setActiveNotes(prev => new Set(prev).add(midiNote));
    updateStats();
    log(`▶ Note ON: ${midiNote} (${getNoteName(midiNote)})`);
  };

  const stopNote = (midiNote: number) => {
    synth.noteOff(0, midiNote);
    setActiveNotes(prev => {
      const newSet = new Set(prev);
      newSet.delete(midiNote);
      return newSet;
    });
    updateStats();
    log(`⏹ Note OFF: ${midiNote} (${getNoteName(midiNote)})`);
  };

  const stopAllNotes = () => {
    synth.allNotesOff();
    setActiveNotes(new Set());
    updateStats();
    log('⏹ All notes OFF');
  };

  const testPolyphony = () => {
    log('=== Testing Polyphony (5 notes) ===');
    const notes = [60, 64, 67, 72, 76]; // C-E-G-C-E chord
    notes.forEach((note, idx) => {
      setTimeout(() => {
        playNote(note);
      }, idx * 100);
    });
  };

  const testVoiceStealing = () => {
    log('=== Testing Voice Stealing (10 notes rapidly) ===');
    stopAllNotes();
    const notes = [48, 50, 52, 53, 55, 57, 59, 60, 62, 64];
    notes.forEach((note, idx) => {
      setTimeout(() => {
        playNote(note);
      }, idx * 50);
    });
  };

  const getNoteName = (midiNote: number): string => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNote / 12) - 1;
    const noteName = noteNames[midiNote % 12];
    return `${noteName}${octave}`;
  };

  // Keyboard for playing notes
  const renderKeyboard = () => {
    const baseNote = 60; // Middle C
    const notes = [0, 2, 4, 5, 7, 9, 11, 12]; // C major scale
    return (
      <div className="keyboard">
        {notes.map(offset => {
          const midiNote = baseNote + offset;
          const isActive = activeNotes.has(midiNote);
          return (
            <button
              key={midiNote}
              className={`key ${isActive ? 'active' : ''}`}
              onMouseDown={() => playNote(midiNote)}
              onMouseUp={() => stopNote(midiNote)}
              onMouseLeave={() => activeNotes.has(midiNote) && stopNote(midiNote)}
            >
              <div className="key-label">{getNoteName(midiNote)}</div>
              <div className="key-number">{midiNote}</div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="dual-voice-test">
      <div className="test-header">
        <h2>🎹 Dual-Voice Playback Test</h2>
        <p>Interactive testing for dual-voice synthesis and channel management</p>
      </div>

      {/* Instrument Selector */}
      <div className="instrument-section">
        <h3>Instrument Selection</h3>
        <div className="instrument-controls">
          <select
            value={selectedPatchId}
            onChange={(e) => setSelectedPatchId(Number(e.target.value))}
            className="instrument-select"
          >
            {patches.map(patch => (
              <option key={patch.id} value={patch.id}>
                {patch.id}: {patch.name} {patch.dualVoiceEnabled ? '(Dual-Voice)' : ''}
              </option>
            ))}
          </select>

          <label className="dual-voice-toggle">
            <input
              type="checkbox"
              checked={isDualVoiceEnabled}
              onChange={(e) => {
                setIsDualVoiceEnabled(e.target.checked);
                log(`Dual-voice mode: ${e.target.checked ? 'ENABLED' : 'DISABLED'}`);
              }}
              disabled={!currentPatch?.dualVoiceEnabled}
            />
            <span>Enable Dual-Voice</span>
            {!currentPatch?.dualVoiceEnabled && (
              <span className="disabled-hint"> (not available for this instrument)</span>
            )}
          </label>
        </div>
      </div>

      {/* Channel Stats */}
      <div className="stats-panel">
        <h3>Channel Usage</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-label">Free Channels</div>
            <div className="stat-value" style={{
              color: channelStats.free > 3 ? '#00ff00' : channelStats.free > 0 ? '#ffaa00' : '#ff4444'
            }}>
              {channelStats.free}/9
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Allocated Channels</div>
            <div className="stat-value">{channelStats.allocated}/9</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Dual-Voice Notes</div>
            <div className="stat-value">{channelStats.dualVoiceNotes}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Active Notes</div>
            <div className="stat-value">{activeNotes.size}</div>
          </div>
        </div>

        {/* Channel Visualization */}
        <div className="channel-visualization">
          <h4>OPL3 Hardware Channels:</h4>
          <div className="channels">
            {Array.from({ length: 9 }, (_, i) => {
              const isFree = channelStats.free > 0 && channelStats.allocated <= i;
              return (
                <div
                  key={i}
                  className={`channel ${isFree ? 'free' : 'allocated'}`}
                  title={`Channel ${i}: ${isFree ? 'Free' : 'Allocated'}`}
                >
                  {i}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Keyboard Interface */}
      <div className="keyboard-section">
        <h3>Play Notes</h3>
        {renderKeyboard()}
        <div className="keyboard-hint">
          Click and hold keys to play notes. Release to stop.
        </div>
      </div>

      {/* Test Controls */}
      <div className="test-controls">
        <h3>Test Scenarios</h3>
        <div className="button-grid">
          <button onClick={testPolyphony} className="test-btn">
            Test Polyphony (5 notes)
          </button>
          <button onClick={testVoiceStealing} className="test-btn">
            Test Voice Stealing (10 notes)
          </button>
          <button onClick={stopAllNotes} className="test-btn btn-stop">
            Stop All Notes
          </button>
          <button onClick={clearLog} className="test-btn btn-secondary">
            Clear Log
          </button>
        </div>
      </div>

      {/* Test Log */}
      <div className="test-log">
        <h3>Event Log</h3>
        <div className="log-output">
          {testLog.length === 0 ? (
            <div className="log-empty">No events yet. Select an instrument and play notes.</div>
          ) : (
            testLog.map((line, idx) => (
              <div
                key={idx}
                className={`log-line ${
                  line.includes('===') ? 'log-header' :
                  line.includes('▶') ? 'log-note-on' :
                  line.includes('⏹') ? 'log-note-off' :
                  line.includes('Dual-voice:') ? 'log-dual-voice' :
                  ''
                }`}
              >
                {line}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Info Panel */}
      <div className="test-info">
        <h3>About This Test</h3>
        <div className="test-descriptions">
          <div className="test-desc">
            <strong>Dual-Voice Mode:</strong> When enabled, instruments use 2 OPL channels per note for richer sound.
          </div>
          <div className="test-desc">
            <strong>Channel Allocation:</strong> The ChannelManager dynamically assigns channels and steals oldest notes when all 9 channels are full.
          </div>
          <div className="test-desc">
            <strong>Degradation:</strong> If only 1 channel is free for a dual-voice note, it falls back to single-voice mode.
          </div>
          <div className="test-desc">
            <strong>Expected Behavior:</strong> Dual-voice instruments should sound noticeably richer. Watch the channel count increase faster (2 channels per note).
          </div>
        </div>
      </div>
    </div>
  );
}
