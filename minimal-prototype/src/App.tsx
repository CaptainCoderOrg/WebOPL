import { useState, useEffect } from 'react';
import { Route, Link } from 'wouter';
import { SimpleSynth } from './SimpleSynth';
import { SimplePlayer } from './SimplePlayer';
import { Tracker } from './components/Tracker';
import { PatchTest } from './components/PatchTest';
import { InstrumentEditor } from './components/InstrumentEditor';
import { InstrumentTester } from './components/InstrumentTester';
import { ChannelManagerTest } from './components/ChannelManagerTest';
import { DualVoiceTest } from './components/DualVoiceTest';
import { OPL3MigrationTest } from './components/OPL3MigrationTest';
import { PianoKeyboardTest } from './components/PianoKeyboardTest';
import { VolumeControl } from './components/VolumeControl';
import { defaultPatches } from './data/defaultPatches';
import { loadGENMIDI } from './utils/genmidiParser';
import type { OPLPatch } from './types/OPLPatch';
import './App.css';

function App() {
  const [synth, setSynth] = useState<SimpleSynth | null>(null);
  const [player, setPlayer] = useState<SimplePlayer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Instrument bank (starts with defaults)
  const [instrumentBank, setInstrumentBank] = useState<OPLPatch[]>(defaultPatches);

  // Bank loading status
  const [bankLoaded, setBankLoaded] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

  // Instrument editor modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTrackId, setEditingTrackId] = useState<number>(0);

  // Initialize audio engine
  useEffect(() => {
    // Guard against double initialization in React Strict Mode
    if (synth || isReady) {
      console.log('[App] Already initialized, skipping');
      return;
    }

    const init = async () => {
      try {
        console.log('=== Initializing WebOrchestra ===');

        // Initialize synthesizer
        const s = new SimpleSynth();
        await s.init();
        setSynth(s);

        // Expose synth globally for console testing (development only)
        if (import.meta.env.DEV) {
          (window as any).synth = s;
          console.log('[App] Synth exposed as window.synth for testing');

          // Log will be done after instruments are loaded
        }

        // Initialize player
        const p = new SimplePlayer(s);
        setPlayer(p);

        setIsReady(true);
        console.log('=== Ready! ===');
      } catch (error) {
        console.error('Initialization failed:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        setInitError(errorMsg);
      }
    };

    init();
  }, [synth, isReady]);


  /**
   * Load GENMIDI instrument bank
   */
  useEffect(() => {
    const loadInstruments = async () => {
      // Only load once, after synth is ready
      if (!isReady || bankLoaded || instrumentBank.length > 4) return;

      try {
        console.log('[App] Loading GENMIDI instrument bank...');
        setBankError(null);

        const bank = await loadGENMIDI();

        console.log(`[App] Loaded ${bank.patches.length} instruments from ${bank.name}`);
        setInstrumentBank(bank.patches);
        setBankLoaded(true);

        console.log('[App] GENMIDI bank loaded successfully');
      } catch (error) {
        console.error('[App] Failed to load GENMIDI:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setBankError(errorMsg);

        // Keep using default patches
        console.log('[App] Using default instrument patches as fallback');
        setBankLoaded(true); // Mark as "loaded" to prevent retry loop
      }
    };

    loadInstruments();
  }, [isReady, synth, bankLoaded, instrumentBank.length]);


  /**
   * Open instrument editor for a specific track
   */
  const handleEditClick = (trackIndex: number) => {
    console.log(`[App] Opening editor for track ${trackIndex}`);
    setEditingTrackId(trackIndex);
    setEditorOpen(true);
  };

  /**
   * Save edited instrument
   */
  const handleSaveInstrument = (trackId: number, patch: OPLPatch) => {
    console.log(`[App] Saving instrument for track ${trackId}:`, patch.name);

    // Find the patch ID in the instrument bank
    const patchIndex = instrumentBank.findIndex(p => p.id === patch.id);

    if (patchIndex >= 0) {
      // Update the patch in the bank if it's custom
      if (patch.isCustom) {
        setInstrumentBank(prev => {
          const next = [...prev];
          next[patchIndex] = patch;
          return next;
        });
      }
    } else {
      // New custom patch - add to bank
      setInstrumentBank(prev => [...prev, patch]);
    }

    // Load the patch to the synth
    if (synth) {
      synth.setTrackPatch(trackId, patch);
    }

    // Close modal
    setEditorOpen(false);
  };

  /**
   * Cancel editing
   */
  const handleCancelEdit = () => {
    console.log('[App] Cancelled editing');
    setEditorOpen(false);
  };

  // Show loading/error screen if not ready
  if (!isReady) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <h1>🎵 WebOrchestra</h1>

          {initError ? (
            <>
              <div className="error-icon">❌</div>
              <h2>Initialization Failed</h2>
              <p className="error-message">{initError}</p>
              <button onClick={() => window.location.reload()}>
                Retry
              </button>
            </>
          ) : (
            <>
              <div className="loading-spinner"></div>
              <p>Initializing audio engine...</p>
              <p className="loading-subtext">
                Loading OPL3 synthesizer and Web Audio API
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1>🎵 WebOrchestra</h1>
          <div className="subtitle">Minimal Tracker Prototype</div>
        </div>
        <VolumeControl synth={synth} initialVolume={6} />
        <nav className="nav-links">
          <Link href="/" className="nav-link">
            🎹 Tracker
          </Link>
          <Link href="/test" className="nav-link">
            🧪 Patch Test
          </Link>
          <Link href="/instrument-tester" className="nav-link">
            🎸 Instrument Tester
          </Link>
          <Link href="/channel-test" className="nav-link">
            🎛️ Channel Manager
          </Link>
          <Link href="/dual-voice-test" className="nav-link">
            🎵 Dual-Voice Test
          </Link>
          <Link href="/opl3-test" className="nav-link">
            🔬 OPL3 Test
          </Link>
          <Link href="/test-keyboard" className="nav-link">
            🎹 Keyboard Test
          </Link>
        </nav>
        <div className="status">
          {isReady ? '✅ Ready' : '⏳ Initializing...'}
        </div>
      </header>

      <Route path="/">
        <Tracker
          synth={synth}
          player={player}
          instrumentBank={instrumentBank}
          bankLoaded={bankLoaded}
          bankError={bankError}
          onEditInstrument={handleEditClick}
        />
      </Route>

      <Route path="/test">
        <PatchTest synth={synth} />
      </Route>

      <Route path="/instrument-tester">
        <InstrumentTester synth={synth} instrumentBank={instrumentBank} />
      </Route>

      <Route path="/channel-test">
        <ChannelManagerTest />
      </Route>

      <Route path="/dual-voice-test">
        {synth && <DualVoiceTest synth={synth} patches={instrumentBank} />}
      </Route>

      <Route path="/opl3-test">
        <OPL3MigrationTest />
      </Route>

      <Route path="/test-keyboard">
        <PianoKeyboardTest synth={synth || undefined} instrumentBank={instrumentBank} />
      </Route>

      {/* Instrument Editor Modal */}
      {editorOpen && synth && (
        <InstrumentEditor
          trackId={editingTrackId}
          currentPatch={
            synth.getTrackPatch(editingTrackId) || instrumentBank[0]
          }
          availablePatches={instrumentBank}
          onSave={handleSaveInstrument}
          onCancel={handleCancelEdit}
          synth={synth}
        />
      )}
    </div>
  );
}

export default App;
