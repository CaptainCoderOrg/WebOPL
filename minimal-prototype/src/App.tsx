import { useState } from 'react';
import './App.css';

// Type definition for the global OPL class
declare global {
  interface Window {
    OPL?: any;
  }
}

function App() {
  const [initialized, setInitialized] = useState(false);
  const [opl, setOpl] = useState<any>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [scriptNode, setScriptNode] = useState<ScriptProcessorNode | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load a script dynamically
   */
  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  };

  /**
   * Initialize OPL3 and Web Audio
   */
  const initAudio = async () => {
    try {
      console.log('=== Initializing Audio ===');
      setError(null);

      // Step 1: Load the WASM module as a script tag (creates global 'opl' function)
      console.log('[1/5] Loading OPL WASM module...');
      await loadScript('/lib/opl.js');
      console.log('✅ WASM module loaded');

      // Step 2: Load the OPL wrapper class (uses the global 'opl')
      console.log('[2/5] Loading OPL wrapper...');
      await loadScript('/opl-wrapper.js');
      console.log('✅ OPL wrapper loaded');
      console.log('Window.OPL available?', typeof window.OPL);

      if (!window.OPL || typeof window.OPL.create !== 'function') {
        throw new Error('OPL class not found on window object');
      }

      // Step 3: Create OPL instance
      console.log('[3/5] Creating OPL instance...');
      const oplInstance = await window.OPL.create(49716, 2); // 49716 Hz, stereo
      console.log('✅ OPL instance created');

      // Step 4: Configure OPL
      console.log('[4/5] Configuring OPL...');
      oplInstance.write(0x01, 0x20); // Enable waveform selection
      console.log('✅ OPL configured');

      // Step 5: Create Web Audio Context
      console.log('[5/5] Creating AudioContext...');
      const ctx = new AudioContext({ sampleRate: 49716 });
      console.log('✅ AudioContext created');
      console.log('   Sample rate:', ctx.sampleRate);
      console.log('   State:', ctx.state);

      // Create ScriptProcessorNode
      const bufferSize = 4096;
      const node = ctx.createScriptProcessor(bufferSize, 0, 2);

      // Audio processing callback
      node.onaudioprocess = (event) => {
        const outputL = event.outputBuffer.getChannelData(0);
        const outputR = event.outputBuffer.getChannelData(1);
        const numSamples = outputL.length;

        // OPL can only generate 512 samples per call, so we need to chunk it
        const maxChunkSize = 512;
        let offset = 0;

        while (offset < numSamples) {
          const chunkSize = Math.min(maxChunkSize, numSamples - offset);

          // Generate samples from OPL (returns Int16Array by default)
          const samples = oplInstance.generate(chunkSize, Int16Array);

          // Convert Int16 to Float32 and copy to output
          for (let i = 0; i < chunkSize; i++) {
            const sample = samples[i] / 32768.0;
            outputL[offset + i] = sample;
            outputR[offset + i] = sample;
          }

          offset += chunkSize;
        }
      };

      node.connect(ctx.destination);
      console.log('✅ Audio processing node connected');

      setOpl(oplInstance);
      setAudioContext(ctx);
      setScriptNode(node);
      setInitialized(true);

      console.log('=== Audio Initialization Complete! ===');
    } catch (err) {
      console.error('❌ Initialization failed:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  /**
   * Play a test tone (middle C for 1 second)
   */
  const playTestTone = () => {
    if (!opl || !audioContext) {
      console.error('Audio not initialized');
      return;
    }

    console.log('=== Playing Test Tone ===');

    // Resume AudioContext if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
      console.log('Resuming AudioContext...');
      audioContext.resume();
    }

    // Setup a minimal instrument on channel 0
    console.log('Programming OPL registers for test instrument...');

    // Operator offsets for channel 0:
    // Modulator (operator 0): offset 0x00
    // Carrier (operator 1): offset 0x03

    // Modulator settings
    opl.write(0x20 + 0x00, 0x01); // MULT=1 (frequency multiplier)
    opl.write(0x40 + 0x00, 0x10); // Output level (0x00=loudest, 0x3F=quietest)
    opl.write(0x60 + 0x00, 0xF5); // Attack=15 (fast), Decay=5 (medium)
    opl.write(0x80 + 0x00, 0x77); // Sustain=7, Release=7
    opl.write(0xE0 + 0x00, 0x00); // Waveform=0 (sine)

    // Carrier settings
    opl.write(0x20 + 0x03, 0x01); // MULT=1
    opl.write(0x40 + 0x03, 0x00); // Output level (full volume)
    opl.write(0x60 + 0x03, 0xF5); // Attack=15, Decay=5
    opl.write(0x80 + 0x03, 0x77); // Sustain=7, Release=7
    opl.write(0xE0 + 0x03, 0x00); // Waveform=0 (sine)

    // Channel configuration
    opl.write(0xC0, 0x01); // Feedback=0, Connection=1 (additive synthesis)

    console.log('✅ Instrument programmed');

    // Calculate frequency for middle C (MIDI 60 = 261.63 Hz)
    const targetFreq = 261.63;
    console.log('Target frequency:', targetFreq, 'Hz');

    // Calculate OPL F-number and block
    // Formula: frequency = 49716 * F-Number / 2^(20-Block)
    // Inverse: F-Number = frequency * 2^(20-Block) / 49716
    let fnum = 0;
    let block = 0;

    for (let b = 0; b < 8; b++) {
      const f = Math.round((targetFreq * Math.pow(2, 20 - b)) / 49716);
      if (f >= 0 && f < 1024) {
        fnum = f;
        block = b;
        break;
      }
    }

    console.log('Calculated F-Number:', fnum, '(0x' + fnum.toString(16) + ')');
    console.log('Calculated Block:', block);

    // Write frequency to channel 0
    opl.write(0xA0, fnum & 0xFF); // F-number low 8 bits

    // Write key-on + block + F-number high 2 bits
    const keyOnByte = 0x20 | ((block & 0x07) << 2) | ((fnum >> 8) & 0x03);
    opl.write(0xB0, keyOnByte);

    console.log('✅ Note ON - playing for 1 second...');

    // Schedule note off after 1 second
    setTimeout(() => {
      console.log('✅ Note OFF');
      opl.write(0xB0, 0x00); // Clear key-on bit
    }, 1000);
  };

  return (
    <div className="app">
      <h1>🎵 OPL3 Proof of Concept</h1>

      <div className="status-section">
        <div className="status">
          <strong>Status:</strong>{' '}
          {error ? (
            <span style={{ color: '#ff4444' }}>❌ Error</span>
          ) : initialized ? (
            <span style={{ color: '#44ff44' }}>✅ Ready</span>
          ) : (
            <span style={{ color: '#ffaa00' }}>⏳ Not Initialized</span>
          )}
        </div>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {initialized && audioContext && (
          <div className="info">
            <div>AudioContext Sample Rate: {audioContext.sampleRate} Hz</div>
            <div>AudioContext State: {audioContext.state}</div>
          </div>
        )}
      </div>

      <div className="button-section">
        {!initialized ? (
          <button onClick={initAudio} className="btn-primary">
            Initialize Audio System
          </button>
        ) : (
          <button onClick={playTestTone} className="btn-play">
            🔊 Play Test Tone (1 second)
          </button>
        )}
      </div>

      <div className="instructions">
        <h3>Instructions:</h3>
        <ol>
          <li>Click "Initialize Audio System"</li>
          <li>Wait for ✅ Ready status</li>
          <li>Click "Play Test Tone"</li>
          <li>You should hear a 1-second beep</li>
          <li>Check browser console (F12) for detailed logs</li>
        </ol>

        <p><strong>Note:</strong> Browser autoplay policy requires user interaction to start audio.</p>
      </div>
    </div>
  );
}

export default App;
