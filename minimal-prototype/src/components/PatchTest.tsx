import { useState } from 'react';
import type { SimpleSynth } from '../SimpleSynth';
import { defaultPatches } from '../data/defaultPatches';
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
      synth.loadPatch(0, defaultPatches[0]);
      setStatus(`✅ Loaded "${defaultPatches[0].name}" to channel 0`);
    } catch (error) {
      setStatus(`❌ Error: ${error}`);
    }
  };

  const handleLoadBass = () => {
    if (!synth) {
      setStatus('❌ Synth not initialized');
      return;
    }
    try {
      synth.loadPatch(1, defaultPatches[1]);
      setStatus(`✅ Loaded "${defaultPatches[1].name}" to channel 1`);
    } catch (error) {
      setStatus(`❌ Error: ${error}`);
    }
  };

  const handleLoadLead = () => {
    if (!synth) {
      setStatus('❌ Synth not initialized');
      return;
    }
    try {
      synth.loadPatch(2, defaultPatches[2]);
      setStatus(`✅ Loaded "${defaultPatches[2].name}" to channel 2`);
    } catch (error) {
      setStatus(`❌ Error: ${error}`);
    }
  };

  const handleLoadPad = () => {
    if (!synth) {
      setStatus('❌ Synth not initialized');
      return;
    }
    try {
      synth.loadPatch(3, defaultPatches[3]);
      setStatus(`✅ Loaded "${defaultPatches[3].name}" to channel 3`);
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

  const handlePlayBass = () => {
    if (!synth) {
      setStatus('❌ Synth not initialized');
      return;
    }
    synth.noteOn(1, 48); // Lower note for bass
    setStatus('🎵 Playing Bass (C3) on channel 1');
    setTimeout(() => {
      synth.noteOff(1, 48);
      setStatus('🔇 Bass note stopped');
    }, 1000);
  };

  const handlePlayLead = () => {
    if (!synth) {
      setStatus('❌ Synth not initialized');
      return;
    }
    synth.noteOn(2, 72); // Higher note for lead
    setStatus('🎵 Playing Lead (C5) on channel 2');
    setTimeout(() => {
      synth.noteOff(2, 72);
      setStatus('🔇 Lead note stopped');
    }, 1000);
  };

  const handlePlayPad = () => {
    if (!synth) {
      setStatus('❌ Synth not initialized');
      return;
    }
    synth.noteOn(3, 60);
    setStatus('🎵 Playing Pad (C4) on channel 3');
    setTimeout(() => {
      synth.noteOff(3, 60);
      setStatus('🔇 Pad note stopped');
    }, 2000); // Longer for pad
  };

  const handlePlayAll = () => {
    if (!synth) {
      setStatus('❌ Synth not initialized');
      return;
    }
    // Play all four simultaneously at different octaves
    synth.noteOn(0, 60); // Piano C4
    synth.noteOn(1, 48); // Bass C3
    synth.noteOn(2, 72); // Lead C5
    synth.noteOn(3, 60); // Pad C4
    setStatus('🎵 Playing all four instruments simultaneously');
    setTimeout(() => {
      synth.noteOff(0, 60);
      synth.noteOff(1, 48);
      synth.noteOff(2, 72);
      synth.noteOff(3, 60);
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
      synth.getChannelPatch(3),
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
          Test Milestone 2: Default Patches (Piano, Bass, Lead, Pad)
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
            <button onClick={handleLoadBass} className="btn-secondary">
              🎸 Load Bass (Ch 1)
            </button>
            <button onClick={handleLoadLead} className="btn-secondary">
              🎺 Load Lead (Ch 2)
            </button>
            <button onClick={handleLoadPad} className="btn-secondary">
              🎵 Load Pad (Ch 3)
            </button>
          </div>
        </section>

        <section className="test-section">
          <h2>Step 3: Play Notes</h2>
          <p>Test individual instruments (different octaves)</p>
          <div className="button-grid">
            <button onClick={handlePlayPiano} className="btn-play">
              ▶️ Play Piano (C4)
            </button>
            <button onClick={handlePlayBass} className="btn-play">
              ▶️ Play Bass (C3)
            </button>
            <button onClick={handlePlayLead} className="btn-play">
              ▶️ Play Lead (C5)
            </button>
            <button onClick={handlePlayPad} className="btn-play">
              ▶️ Play Pad (C4)
            </button>
          </div>
        </section>

        <section className="test-section">
          <h2>Step 4: Test Polyphony</h2>
          <p>Play all four instruments at once to verify different sounds</p>
          <button onClick={handlePlayAll} className="btn-primary">
            🎵 Play All Four Simultaneously
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
          <li>✅ Piano: Clear, percussive attack, moderate sustain</li>
          <li>✅ Bass: Deep, punchy, quick attack with warmth</li>
          <li>✅ Lead: Bright, cutting, sustained with square-like timbre</li>
          <li>✅ Pad: Slow attack, evolving, ethereal with vibrato</li>
          <li>✅ All four sound distinctly different when played together</li>
        </ul>
      </div>
    </div>
  );
}
