/**
 * OPL3 Migration Test Page
 *
 * Simple test to verify the OPL3 migration is working.
 * Click buttons to play individual notes.
 */

import { useState } from 'react';
import { SimpleSynth } from '../SimpleSynth';
import { defaultPatches } from '../data/defaultPatches';

export function OPL3MigrationTest() {
  const [synth, setSynth] = useState<SimpleSynth | null>(null);
  const [status, setStatus] = useState<string>('Not initialized');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedPatchIndex, setSelectedPatchIndex] = useState<number>(0);

  const init = async () => {
    try {
      setStatus('Initializing...');
      const newSynth = new SimpleSynth();
      await newSynth.init();

      // Load default instrument on channel 0
      console.log('OPL3 Test: Loading default patch...');
      newSynth.loadPatch(0, defaultPatches[selectedPatchIndex]);

      setSynth(newSynth);
      setStatus(`✅ Ready! (${defaultPatches[selectedPatchIndex].name})`);
      console.log('OPL3 Test: Synth initialized with default patch');
    } catch (error) {
      setStatus(`❌ Error: ${error}`);
      console.error('OPL3 Test: Init failed:', error);
    }
  };

  const changePatch = (patchIndex: number) => {
    if (!synth) return;

    setSelectedPatchIndex(patchIndex);
    const patch = defaultPatches[patchIndex];
    console.log(`OPL3 Test: Switching to "${patch.name}"`);
    synth.loadPatch(0, patch);
    setStatus(`✅ Ready! (${patch.name})`);
  };

  const playNote = async (midiNote: number, noteName: string) => {
    if (!synth) {
      setStatus('❌ Not initialized');
      return;
    }

    try {
      setIsPlaying(true);
      console.log(`Playing ${noteName} (MIDI ${midiNote})`);

      // Resume audio context if needed (required by browsers)
      await synth.resumeAudio();

      // Play note on channel 0
      synth.noteOn(0, midiNote, 100);

      // Stop after 1 second
      setTimeout(() => {
        synth.noteOff(0, midiNote);
        setIsPlaying(false);
        console.log(`Stopped ${noteName}`);
      }, 1000);

      setStatus(`🔊 Playing ${noteName}`);
    } catch (error) {
      setStatus(`❌ Play error: ${error}`);
      console.error('Play error:', error);
      setIsPlaying(false);
    }
  };

  const testNotes = [
    { midi: 60, name: 'C4' },
    { midi: 62, name: 'D4' },
    { midi: 64, name: 'E4' },
    { midi: 65, name: 'F4' },
    { midi: 67, name: 'G4' },
    { midi: 69, name: 'A4' },
    { midi: 71, name: 'B4' },
    { midi: 72, name: 'C5' },
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', backgroundColor: '#1e1e1e', color: '#e0e0e0', minHeight: '100vh' }}>
      <h1 style={{ color: '#ffffff' }}>🎹 OPL3 Migration Test</h1>

      <div style={{
        padding: '15px',
        marginBottom: '20px',
        backgroundColor: '#2d2d2d',
        borderRadius: '5px',
        border: '2px solid #4a4a4a'
      }}>
        <h2 style={{ color: '#ffffff' }}>Status</h2>
        <p style={{ fontSize: '18px', margin: '10px 0', color: '#e0e0e0' }}>{status}</p>

        {!synth && (
          <button
            onClick={init}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#4CAF50',
              color: '#ffffff',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Initialize OPL3
          </button>
        )}
      </div>

      {synth && (
        <div>
          <div style={{
            padding: '15px',
            marginBottom: '20px',
            backgroundColor: '#2d2d2d',
            borderRadius: '5px',
            border: '2px solid #4a4a4a'
          }}>
            <h2 style={{ color: '#ffffff' }}>Instrument</h2>
            <p style={{ marginBottom: '10px', color: '#e0e0e0' }}>
              Select an instrument to test:
            </p>
            <select
              value={selectedPatchIndex}
              onChange={(e) => changePatch(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '16px',
                backgroundColor: '#1e1e1e',
                color: '#e0e0e0',
                border: '1px solid #4a4a4a',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              {defaultPatches.map((patch, index) => (
                <option key={index} value={index}>
                  {patch.id}: {patch.name} {patch.category ? `(${patch.category})` : ''}
                </option>
              ))}
            </select>
          </div>

          <h2 style={{ color: '#ffffff' }}>Test Notes</h2>
          <p style={{ marginBottom: '15px', color: '#e0e0e0' }}>
            Click any note to hear it play for 1 second:
          </p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {testNotes.map(note => (
              <button
                key={note.midi}
                onClick={() => playNote(note.midi, note.name)}
                disabled={isPlaying}
                style={{
                  padding: '15px 25px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  backgroundColor: isPlaying ? '#555555' : '#2196F3',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: isPlaying ? 'not-allowed' : 'pointer',
                  minWidth: '80px'
                }}
              >
                {note.name}
              </button>
            ))}
          </div>

          <div style={{
            marginTop: '30px',
            padding: '15px',
            backgroundColor: '#2d4a2d',
            borderRadius: '5px',
            border: '1px solid #4a7c4a'
          }}>
            <h3 style={{ color: '#88ff88' }}>✅ Success Criteria</h3>
            <ul style={{ color: '#e0e0e0' }}>
              <li>Status shows "✅ Ready!"</li>
              <li>Clicking a button plays a clear musical tone</li>
              <li>Notes sound different (higher/lower)</li>
              <li>No console errors</li>
              <li>Console shows OPL3 initialization messages</li>
            </ul>
          </div>

          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#3d3520',
            borderRadius: '5px',
            border: '1px solid #6a5a30'
          }}>
            <h3 style={{ color: '#ffdd88' }}>📊 Check Console</h3>
            <p style={{ color: '#e0e0e0' }}>You should see these messages in the browser console:</p>
            <pre style={{
              backgroundColor: '#1a1a1a',
              color: '#88ff88',
              padding: '10px',
              overflow: 'auto',
              fontSize: '12px',
              border: '1px solid #4a4a4a'
            }}>
{`[SimpleSynth] Initializing OPL3...
[SimpleSynth] ✅ AudioContext created (sample rate: 49716 Hz)
[SimpleSynth] ✅ OPL3 browser bundle loaded
[OPLWorkletProcessor] ✅ OPL3 browser bundle loaded
[OPLWorkletProcessor] ✅ OPL3 chip created
[OPLWorkletProcessor] ✅ OPL3 mode enabled, ready for patch loading
[SimpleSynth] ✅ OPL3 chip ready in AudioWorklet
[SimpleSynth] ✅ Initialization complete!
[SimpleSynth] Loading patch "Acoustic Grand Piano" to channel 0
[SimpleSynth] ✅ Patch loaded to channel 0`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
