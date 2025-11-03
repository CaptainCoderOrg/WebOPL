import { useState } from 'react';
import type { SimpleSynth } from '../SimpleSynth';
import { testPiano, testOrgan, testBell } from '../testPatches';
import './PatchTest.css';

interface PatchTestProps {
  synth: SimpleSynth | null;
}

export function PatchTest({ synth }: PatchTestProps) {
  const [status, setStatus] = useState<string>('Ready to test');
  const [audioState, setAudioState] = useState<string>('unknown');

  const updateAudioState = () => {
    if (!synth) {
      setAudioState('Synth not initialized');
      return;
    }
    const state = (synth as any).audioContext?.state || 'unknown';
    setAudioState(state);
  };

  const handleResumeAudio = () => {
    if (!synth) {
      setStatus('❌ Synth not initialized');
      return;
    }
    synth.start();
    setStatus('✅ Audio context resumed');
    updateAudioState();
  };

  const handleLoadPiano = () => {
    if (!synth) {
      setStatus('❌ Synth not initialized');
      return;
    }
    try {
      synth.loadPatch(0, testPiano);
      setStatus(`✅ Loaded "${testPiano.name}" to channel 0`);
    } catch (error) {
      setStatus(`❌ Error: ${error}`);
    }
  };

  const handleLoadOrgan = () => {
    if (!synth) {
      setStatus('❌ Synth not initialized');
      return;
    }
    try {
      synth.loadPatch(1, testOrgan);
      setStatus(`✅ Loaded "${testOrgan.name}" to channel 1`);
    } catch (error) {
      setStatus(`❌ Error: ${error}`);
    }
  };

  const handleLoadBell = () => {
    if (!synth) {
      setStatus('❌ Synth not initialized');
      return;
    }
    try {
      synth.loadPatch(2, testBell);
      setStatus(`✅ Loaded "${testBell.name}" to channel 2`);
    } catch (error) {
      setStatus(`❌ Error: ${error}`);
    }
  };

  const handlePlayPiano = () => {
    if (!synth) {
      setStatus('❌ Synth not initialized');
      return;
    }
    synth.noteOn(0, 60);
    setStatus('🎵 Playing Piano (C4) on channel 0');
    setTimeout(() => {
      synth.noteOff(0, 60);
      setStatus('🔇 Piano note stopped');
    }, 1000);
  };

  const handlePlayOrgan = () => {
    if (!synth) {
      setStatus('❌ Synth not initialized');
      return;
    }
    synth.noteOn(1, 60);
    setStatus('🎵 Playing Organ (C4) on channel 1');
    setTimeout(() => {
      synth.noteOff(1, 60);
      setStatus('🔇 Organ note stopped');
    }, 1000);
  };

  const handlePlayBell = () => {
    if (!synth) {
      setStatus('❌ Synth not initialized');
      return;
    }
    synth.noteOn(2, 60);
    setStatus('🎵 Playing Bell (C4) on channel 2');
    setTimeout(() => {
      synth.noteOff(2, 60);
      setStatus('🔇 Bell note stopped');
    }, 2000);
  };

  const handlePlayAll = () => {
    if (!synth) {
      setStatus('❌ Synth not initialized');
      return;
    }
    // Play all three simultaneously
    synth.noteOn(0, 60);
    synth.noteOn(1, 60);
    synth.noteOn(2, 60);
    setStatus('🎵 Playing all three instruments simultaneously');
    setTimeout(() => {
      synth.noteOff(0, 60);
      synth.noteOff(1, 60);
      synth.noteOff(2, 60);
      setStatus('🔇 All notes stopped');
    }, 2000);
  };

  const handleGetPatchInfo = () => {
    if (!synth) {
      setStatus('❌ Synth not initialized');
      return;
    }
    const patches = [
      synth.getChannelPatch(0),
      synth.getChannelPatch(1),
      synth.getChannelPatch(2),
    ];
    const info = patches
      .map((p, i) => `Ch${i}: ${p?.name || 'none'}`)
      .join(', ');
    setStatus(`📋 Loaded patches: ${info}`);
  };

  return (
    <div className="patch-test">
      <div className="test-header">
        <h1>🎹 Patch Loading Test</h1>
        <p className="test-description">
          Test Milestone 1: Type Definitions & Manual Patch Loading
        </p>
      </div>

      <div className="status-bar">
        <div className="status-message">{status}</div>
        <div className="audio-state">
          AudioContext: <span className={audioState === 'running' ? 'state-running' : 'state-suspended'}>{audioState}</span>
          <button onClick={updateAudioState} className="btn-small">
            Refresh
          </button>
        </div>
      </div>

      <div className="test-sections">
        <section className="test-section">
          <h2>Step 1: Resume Audio</h2>
          <p>Browser requires user interaction to enable audio</p>
          <button onClick={handleResumeAudio} className="btn-primary">
            ▶️ Resume Audio Context
          </button>
        </section>

        <section className="test-section">
          <h2>Step 2: Load Patches</h2>
          <p>Load different instrument patches to different channels</p>
          <div className="button-grid">
            <button onClick={handleLoadPiano} className="btn-secondary">
              🎹 Load Piano (Ch 0)
            </button>
            <button onClick={handleLoadOrgan} className="btn-secondary">
              🎺 Load Organ (Ch 1)
            </button>
            <button onClick={handleLoadBell} className="btn-secondary">
              🔔 Load Bell (Ch 2)
            </button>
          </div>
        </section>

        <section className="test-section">
          <h2>Step 3: Play Notes</h2>
          <p>Test individual instruments (plays middle C for 1-2 seconds)</p>
          <div className="button-grid">
            <button onClick={handlePlayPiano} className="btn-play">
              ▶️ Play Piano
            </button>
            <button onClick={handlePlayOrgan} className="btn-play">
              ▶️ Play Organ
            </button>
            <button onClick={handlePlayBell} className="btn-play">
              ▶️ Play Bell
            </button>
          </div>
        </section>

        <section className="test-section">
          <h2>Step 4: Test Polyphony</h2>
          <p>Play all three instruments at once to verify different sounds</p>
          <button onClick={handlePlayAll} className="btn-primary">
            🎵 Play All Three Simultaneously
          </button>
        </section>

        <section className="test-section">
          <h2>Step 5: Verify Loaded Patches</h2>
          <p>Check which patches are currently loaded</p>
          <button onClick={handleGetPatchInfo} className="btn-secondary">
            📋 Get Patch Info
          </button>
        </section>
      </div>

      <div className="test-footer">
        <h3>Expected Results:</h3>
        <ul>
          <li>✅ Piano: Smooth, sustained tone</li>
          <li>✅ Organ: Brighter, more immediate sound (octave higher carrier)</li>
          <li>✅ Bell: Metallic, decaying sound with longer release</li>
          <li>✅ All three sound distinctly different when played together</li>
        </ul>
      </div>
    </div>
  );
}
