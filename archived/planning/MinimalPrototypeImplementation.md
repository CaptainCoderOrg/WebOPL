# Minimal Prototype - Implementation Plan

## Overview

This plan walks through building the minimal OPL tracker prototype step-by-step. Each phase has clear deliverables, testing criteria, and troubleshooting guidance.

**Total Estimated Time:** 9-15 hours (2-3 days)

---

## Table of Contents

1. [Phase 0: Project Setup & Proof of Concept](#phase-0-project-setup--proof-of-concept)
2. [Phase 1: OPL Synthesizer Wrapper](#phase-1-opl-synthesizer-wrapper)
3. [Phase 2: Note Conversion Utilities](#phase-2-note-conversion-utilities)
4. [Phase 3: Simple Playback Engine](#phase-3-simple-playback-engine)
5. [Phase 4: Tracker Grid UI](#phase-4-tracker-grid-ui)
6. [Phase 5: Integration & Polish](#phase-5-integration--polish)
7. [Testing & Debugging Guide](#testing--debugging-guide)
8. [Next Steps After MVP](#next-steps-after-mvp)

---

## Phase 0: Project Setup & Proof of Concept

**Goal:** Get a single OPL tone playing in the browser.

**Time Estimate:** 1-2 hours

### Task 0.1: Initialize Vite Project

**Steps:**

1. Create the project:
   ```bash
   npm create vite@latest weborchestra-minimal -- --template react-ts
   cd weborchestra-minimal
   npm install
   ```

2. Install OPL dependency:
   ```bash
   npm install @malvineous/opl
   ```

3. Test that project runs:
   ```bash
   npm run dev
   ```
   - Should open browser to http://localhost:5173
   - Should see default Vite + React page

4. Clean up template files:
   - Remove default content from `src/App.tsx`
   - Remove Vite logo imports
   - Clear `src/App.css`

**Acceptance Criteria:**
- ✅ Project builds without errors
- ✅ Dev server runs
- ✅ @malvineous/opl installed successfully

---

### Task 0.2: Create Proof-of-Concept Tone

**Goal:** Single button that plays a 1-second tone.

**Steps:**

1. Create `src/App.tsx`:
   ```typescript
   import { useState } from 'react';
   import './App.css';

   // We'll import OPL dynamically
   let OPL: any = null;

   function App() {
     const [initialized, setInitialized] = useState(false);
     const [opl, setOpl] = useState<any>(null);
     const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
     const [scriptNode, setScriptNode] = useState<ScriptProcessorNode | null>(null);

     const initAudio = async () => {
       try {
         console.log('Importing OPL...');
         const oplModule = await import('@malvineous/opl');
         OPL = oplModule.default;

         console.log('Creating OPL instance...');
         const oplInstance = await OPL.create();
         console.log('OPL created!');

         // Enable waveform selection
         oplInstance.write(0x01, 0x20);

         // Create AudioContext
         const ctx = new AudioContext({ sampleRate: 49716 });
         console.log('AudioContext created, sample rate:', ctx.sampleRate);

         // Create ScriptProcessorNode
         const node = ctx.createScriptProcessor(4096, 0, 2);

         // Audio processing callback
         node.onaudioprocess = (event) => {
           const outputL = event.outputBuffer.getChannelData(0);
           const outputR = event.outputBuffer.getChannelData(1);
           const numSamples = outputL.length;

           // Generate samples from OPL
           const samples = oplInstance.generate(numSamples);

           // Convert and copy samples
           for (let i = 0; i < numSamples; i++) {
             // Check if samples are Int16Array or Float32Array
             const sample = samples instanceof Int16Array
               ? samples[i] / 32768.0
               : samples[i];
             outputL[i] = sample;
             outputR[i] = sample;
           }
         };

         // Connect to output
         node.connect(ctx.destination);

         setOpl(oplInstance);
         setAudioContext(ctx);
         setScriptNode(node);
         setInitialized(true);

         console.log('Audio system initialized!');
       } catch (error) {
         console.error('Failed to initialize audio:', error);
       }
     };

     const playTestTone = () => {
       if (!opl || !audioContext) {
         console.error('Audio not initialized');
         return;
       }

       console.log('Playing test tone...');

       // Resume AudioContext if needed (browser autoplay policy)
       if (audioContext.state === 'suspended') {
         audioContext.resume();
       }

       // Setup a simple instrument (minimal registers)
       // Modulator (operator 0 at channel 0)
       opl.write(0x20 + 0x00, 0x01); // Freq multiplier = 1
       opl.write(0x40 + 0x00, 0x10); // Output level
       opl.write(0x60 + 0x00, 0xF5); // Attack/Decay
       opl.write(0x80 + 0x00, 0x77); // Sustain/Release
       opl.write(0xE0 + 0x00, 0x00); // Waveform = sine

       // Carrier (operator 1 at channel 0)
       opl.write(0x20 + 0x03, 0x01); // Freq multiplier = 1
       opl.write(0x40 + 0x03, 0x00); // Output level (full)
       opl.write(0x60 + 0x03, 0xF5); // Attack/Decay
       opl.write(0x80 + 0x03, 0x77); // Sustain/Release
       opl.write(0xE0 + 0x03, 0x00); // Waveform = sine

       // Channel settings
       opl.write(0xC0, 0x01); // Feedback=0, Additive

       // Play middle C (MIDI 60 = 261.63 Hz)
       const freq = 261.63;

       // Calculate F-number and block
       let fnum = 0;
       let block = 0;
       for (let b = 0; b < 8; b++) {
         const f = Math.round((freq * Math.pow(2, 20 - b)) / 49716);
         if (f < 1024) {
           fnum = f;
           block = b;
           break;
         }
       }

       console.log('F-number:', fnum, 'Block:', block);

       // Write frequency (channel 0)
       opl.write(0xA0, fnum & 0xFF); // F-number low 8 bits
       opl.write(0xB0, 0x20 | (block << 2) | ((fnum >> 8) & 0x03)); // Key-on + block + F-num high

       // Stop after 1 second
       setTimeout(() => {
         console.log('Stopping tone...');
         opl.write(0xB0, 0x00); // Key off
       }, 1000);
     };

     return (
       <div className="app">
         <h1>OPL3 Proof of Concept</h1>

         {!initialized ? (
           <button onClick={initAudio} style={{ fontSize: '20px', padding: '10px 20px' }}>
             Initialize Audio
           </button>
         ) : (
           <button onClick={playTestTone} style={{ fontSize: '20px', padding: '10px 20px' }}>
             🔊 Play Test Tone (1 second)
           </button>
         )}

         <div style={{ marginTop: '20px', fontFamily: 'monospace' }}>
           <p>Status: {initialized ? '✅ Ready' : '⏳ Not initialized'}</p>
           <p>Check browser console for details</p>
         </div>
       </div>
     );
   }

   export default App;
   ```

2. Create minimal `src/App.css`:
   ```css
   .app {
     padding: 40px;
     font-family: Arial, sans-serif;
     max-width: 600px;
     margin: 0 auto;
   }

   button {
     cursor: pointer;
   }

   button:disabled {
     opacity: 0.5;
     cursor: not-allowed;
   }
   ```

**Testing Steps:**

1. Start dev server: `npm run dev`
2. Open browser to http://localhost:5173
3. Open browser console (F12)
4. Click "Initialize Audio" button
   - Watch console for logs
   - Should see "OPL created!", "AudioContext created"
5. Click "Play Test Tone" button
   - **Should hear a 1-second tone**
   - Console should show F-number and block

**Expected Results:**
- ✅ Hear audible tone (sounds like a beep/tone)
- ✅ Tone lasts 1 second
- ✅ No errors in console

**Troubleshooting:**

**If no sound:**
- Check browser console for errors
- Verify AudioContext is not suspended (should resume on button click)
- Check browser audio isn't muted
- Try different browser (Chrome works best)
- Check sample rate: console.log the sample rate
- Verify OPL.write calls are executing

**If wrong sample type error:**
- Check what type `opl.generate()` returns
- Add: `console.log('Sample type:', samples.constructor.name)`
- Adjust conversion accordingly (Int16Array vs Float32Array)

**If tone is too quiet:**
- Increase output level: `opl.write(0x40 + 0x03, 0x00)` (0x00 = loudest)
- Check system volume

**If tone is wrong pitch:**
- Log F-number and block calculation
- Verify frequency formula
- Try hardcoded values: fnum=356, block=4 (should be ~middle C)

**Acceptance Criteria:**
- ✅ Button plays audible tone
- ✅ Tone lasts approximately 1 second
- ✅ Console shows successful initialization
- ✅ Can click multiple times without errors

---

## Phase 1: OPL Synthesizer Wrapper

**Goal:** Create a reusable class for OPL synthesis.

**Time Estimate:** 2-3 hours

### Task 1.1: Create SimpleSynth Class

**Steps:**

1. Create `src/SimpleSynth.ts`:
   ```typescript
   /**
    * SimpleSynth - Minimal OPL3 Synthesizer Wrapper
    *
    * Manages OPL3 instance and Web Audio API integration.
    * Supports 9 voices (channels 0-8) for simplicity.
    */

   export class SimpleSynth {
     private opl: any = null;
     private audioContext: AudioContext | null = null;
     private scriptNode: ScriptProcessorNode | null = null;
     private activeChannels: Map<number, number> = new Map(); // channel -> MIDI note
     private isInitialized: boolean = false;

     /**
      * Initialize OPL and Web Audio
      */
     async init(): Promise<void> {
       if (this.isInitialized) {
         console.warn('SimpleSynth already initialized');
         return;
       }

       console.log('[SimpleSynth] Initializing...');

       try {
         // Dynamically import OPL
         const OPL = (await import('@malvineous/opl')).default;
         this.opl = await OPL.create();
         console.log('[SimpleSynth] OPL instance created');

         // Enable waveform selection
         this.opl.write(0x01, 0x20);

         // Setup default instrument on all channels
         for (let channel = 0; channel < 9; channel++) {
           this.setupDefaultInstrument(channel);
         }

         // Create AudioContext
         this.audioContext = new AudioContext({ sampleRate: 49716 });
         console.log('[SimpleSynth] AudioContext created, sample rate:', this.audioContext.sampleRate);

         // Create ScriptProcessorNode
         this.scriptNode = this.audioContext.createScriptProcessor(4096, 0, 2);
         this.scriptNode.onaudioprocess = this.processAudio.bind(this);
         this.scriptNode.connect(this.audioContext.destination);

         this.isInitialized = true;
         console.log('[SimpleSynth] Initialization complete');
       } catch (error) {
         console.error('[SimpleSynth] Initialization failed:', error);
         throw error;
       }
     }

     /**
      * Setup a basic instrument on a channel
      */
     private setupDefaultInstrument(channel: number): void {
       if (!this.opl) return;

       // Calculate operator offsets (irregular pattern!)
       const operatorOffsets = [
         [0x00, 0x03], // Channel 0
         [0x01, 0x04], // Channel 1
         [0x02, 0x05], // Channel 2
         [0x08, 0x0B], // Channel 3
         [0x09, 0x0C], // Channel 4
         [0x0A, 0x0D], // Channel 5
         [0x10, 0x13], // Channel 6
         [0x11, 0x14], // Channel 7
         [0x12, 0x15], // Channel 8
       ];

       const [modOffset, carOffset] = operatorOffsets[channel];

       // Modulator (operator 0)
       this.opl.write(0x20 + modOffset, 0x01); // MULT=1
       this.opl.write(0x40 + modOffset, 0x10); // Output level
       this.opl.write(0x60 + modOffset, 0xF5); // Attack=15, Decay=5
       this.opl.write(0x80 + modOffset, 0x77); // Sustain=7, Release=7
       this.opl.write(0xE0 + modOffset, 0x00); // Waveform=sine

       // Carrier (operator 1)
       this.opl.write(0x20 + carOffset, 0x01); // MULT=1
       this.opl.write(0x40 + carOffset, 0x00); // Output level (full)
       this.opl.write(0x60 + carOffset, 0xF5); // Attack=15, Decay=5
       this.opl.write(0x80 + carOffset, 0x77); // Sustain=7, Release=7
       this.opl.write(0xE0 + carOffset, 0x00); // Waveform=sine

       // Channel settings
       this.opl.write(0xC0 + channel, 0x01); // Feedback=0, Additive
     }

     /**
      * Audio processing callback
      */
     private processAudio(event: AudioProcessingEvent): void {
       if (!this.opl) return;

       const outputL = event.outputBuffer.getChannelData(0);
       const outputR = event.outputBuffer.getChannelData(1);
       const numSamples = outputL.length;

       // Generate samples from OPL
       const samples = this.opl.generate(numSamples);

       // Convert and copy
       for (let i = 0; i < numSamples; i++) {
         const sample = samples instanceof Int16Array
           ? samples[i] / 32768.0
           : samples[i];
         outputL[i] = sample;
         outputR[i] = sample;
       }
     }

     /**
      * Play a note on a specific channel
      */
     noteOn(channel: number, midiNote: number, velocity: number = 100): void {
       if (!this.opl || !this.isInitialized) {
         console.error('[SimpleSynth] Not initialized');
         return;
       }

       if (channel < 0 || channel >= 9) {
         console.error('[SimpleSynth] Invalid channel:', channel);
         return;
       }

       // Convert MIDI note to frequency
       const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

       // Calculate F-number and block
       const { fnum, block } = this.calculateFNum(freq);

       console.log(`[SimpleSynth] Note ON: ch=${channel}, note=${midiNote}, freq=${freq.toFixed(2)}Hz, fnum=${fnum}, block=${block}`);

       // Write frequency registers
       this.opl.write(0xA0 + channel, fnum & 0xFF); // F-number low
       this.opl.write(0xB0 + channel, 0x20 | (block << 2) | ((fnum >> 8) & 0x03)); // Key-on + block + F-num high

       // Track active note
       this.activeChannels.set(channel, midiNote);
     }

     /**
      * Stop a note on a specific channel
      */
     noteOff(channel: number, midiNote: number): void {
       if (!this.opl || !this.isInitialized) return;

       if (channel < 0 || channel >= 9) return;

       // Check if this note is playing on this channel
       if (this.activeChannels.get(channel) === midiNote) {
         console.log(`[SimpleSynth] Note OFF: ch=${channel}, note=${midiNote}`);

         // Key off (clear bit 5)
         this.opl.write(0xB0 + channel, 0x00);

         // Remove from active channels
         this.activeChannels.delete(channel);
       }
     }

     /**
      * Stop all notes
      */
     allNotesOff(): void {
       if (!this.opl) return;

       console.log('[SimpleSynth] All notes off');

       for (let channel = 0; channel < 9; channel++) {
         this.opl.write(0xB0 + channel, 0x00);
       }

       this.activeChannels.clear();
     }

     /**
      * Calculate F-number and block for a frequency
      */
     private calculateFNum(freq: number): { fnum: number; block: number } {
       // Try each block from 0 to 7
       for (let block = 0; block < 8; block++) {
         const fnum = Math.round((freq * Math.pow(2, 20 - block)) / 49716);

         // F-number must be 0-1023
         if (fnum >= 0 && fnum < 1024) {
           return { fnum, block };
         }
       }

       // Fallback (shouldn't happen for valid MIDI notes)
       console.warn('[SimpleSynth] Could not calculate F-number for frequency:', freq);
       return { fnum: 0, block: 0 };
     }

     /**
      * Start audio playback (resume AudioContext)
      */
     start(): void {
       if (this.audioContext && this.audioContext.state === 'suspended') {
         console.log('[SimpleSynth] Resuming AudioContext');
         this.audioContext.resume();
       }
     }

     /**
      * Stop audio playback (suspend AudioContext)
      */
     stop(): void {
       if (this.audioContext && this.audioContext.state === 'running') {
         console.log('[SimpleSynth] Suspending AudioContext');
         this.audioContext.suspend();
         this.allNotesOff();
       }
     }

     /**
      * Check if initialized
      */
     isReady(): boolean {
       return this.isInitialized;
     }
   }
   ```

**Acceptance Criteria:**
- ✅ File compiles without errors
- ✅ Class structure complete
- ✅ All methods implemented

---

### Task 1.2: Test SimpleSynth Class

**Steps:**

1. Update `src/App.tsx` to use SimpleSynth:
   ```typescript
   import { useState, useEffect } from 'react';
   import { SimpleSynth } from './SimpleSynth';
   import './App.css';

   function App() {
     const [synth, setSynth] = useState<SimpleSynth | null>(null);
     const [isReady, setIsReady] = useState(false);

     useEffect(() => {
       const initSynth = async () => {
         const s = new SimpleSynth();
         await s.init();
         setSynth(s);
         setIsReady(true);
       };

       initSynth();
     }, []);

     const playTestTone = () => {
       if (!synth) return;

       synth.start();

       // Play middle C
       synth.noteOn(0, 60);

       setTimeout(() => {
         synth.noteOff(0, 60);
       }, 1000);
     };

     const playChord = () => {
       if (!synth) return;

       synth.start();

       // C major chord (C, E, G)
       synth.noteOn(0, 60); // C
       synth.noteOn(1, 64); // E
       synth.noteOn(2, 67); // G

       setTimeout(() => {
         synth.noteOff(0, 60);
         synth.noteOff(1, 64);
         synth.noteOff(2, 67);
       }, 2000);
     };

     const playScale = () => {
       if (!synth) return;

       synth.start();

       // C major scale
       const notes = [60, 62, 64, 65, 67, 69, 71, 72]; // C D E F G A B C

       notes.forEach((note, i) => {
         setTimeout(() => {
           synth.noteOn(0, note);

           setTimeout(() => {
             synth.noteOff(0, note);
           }, 400);
         }, i * 500);
       });
     };

     return (
       <div className="app">
         <h1>SimpleSynth Test</h1>

         <div style={{ marginBottom: '20px' }}>
           Status: {isReady ? '✅ Ready' : '⏳ Initializing...'}
         </div>

         <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
           <button onClick={playTestTone} disabled={!isReady}>
             Play Single Note (1 sec)
           </button>

           <button onClick={playChord} disabled={!isReady}>
             Play Chord (2 sec)
           </button>

           <button onClick={playScale} disabled={!isReady}>
             Play C Major Scale
           </button>
         </div>
       </div>
     );
   }

   export default App;
   ```

**Testing Steps:**

1. Run `npm run dev`
2. Wait for "✅ Ready" status
3. Click "Play Single Note"
   - Should hear 1-second tone
4. Click "Play Chord"
   - Should hear 3 notes simultaneously for 2 seconds
5. Click "Play C Major Scale"
   - Should hear 8 notes in sequence (C D E F G A B C)

**Expected Results:**
- ✅ Single note plays correctly
- ✅ Chord has 3 simultaneous tones
- ✅ Scale plays correct notes in sequence
- ✅ No clicks or pops
- ✅ Notes stop cleanly

**Troubleshooting:**

**If chord doesn't sound right:**
- Each note should be on different channel
- Check channel numbers in noteOn calls
- Verify operator offsets are correct

**If notes overlap/don't stop:**
- Check noteOff is called with correct channel
- Verify channel tracking in activeChannels map
- Check register writes (0xB0 should be 0x00 for key-off)

**Acceptance Criteria:**
- ✅ SimpleSynth class works independently
- ✅ Can play single notes
- ✅ Can play multiple simultaneous notes
- ✅ Notes stop correctly
- ✅ No audio glitches

---

## Phase 2: Note Conversion Utilities

**Goal:** Convert between note names (C-4) and MIDI numbers.

**Time Estimate:** 1 hour

### Task 2.1: Create Note Conversion Module

**Steps:**

1. Create `src/utils/noteConversion.ts`:
   ```typescript
   /**
    * Note name to MIDI number conversion utilities
    *
    * Format: "C-4" = Note name + dash + octave
    * C-4 = Middle C = MIDI 60
    */

   const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
   const NOTE_NAMES_FLAT = ['C', 'DB', 'D', 'EB', 'E', 'F', 'GB', 'G', 'AB', 'A', 'BB', 'B'];

   /**
    * Convert note name to MIDI number
    * @param noteName - Format: "C-4", "C#4", "D-5", etc.
    * @returns MIDI note number (0-127) or null if invalid
    */
   export function noteNameToMIDI(noteName: string): number | null {
     // Handle empty or rest
     if (!noteName || noteName === '---' || noteName === '...' || noteName.trim() === '') {
       return null;
     }

     // Remove any whitespace and convert to uppercase
     noteName = noteName.trim().toUpperCase();

     // Try to parse "C-4" or "C#4" format
     const match = noteName.match(/^([A-G][#B]?)[-]?(\d+)$/);
     if (!match) {
       console.warn('Invalid note format:', noteName);
       return null;
     }

     const [, note, octaveStr] = match;
     const octave = parseInt(octaveStr);

     // Find note index (0-11)
     let noteIndex = NOTE_NAMES.indexOf(note);
     if (noteIndex === -1) {
       // Try flat notation
       noteIndex = NOTE_NAMES_FLAT.indexOf(note);
     }

     if (noteIndex === -1) {
       console.warn('Invalid note name:', note);
       return null;
     }

     // Calculate MIDI number
     // C-4 (middle C) = MIDI 60
     // Formula: (octave + 1) * 12 + noteIndex
     const midiNote = (octave + 1) * 12 + noteIndex;

     // Validate range
     if (midiNote < 0 || midiNote > 127) {
       console.warn('MIDI note out of range:', midiNote);
       return null;
     }

     return midiNote;
   }

   /**
    * Convert MIDI number to note name
    * @param midiNote - MIDI note number (0-127)
    * @returns Note name in "C-4" format
    */
   export function midiToNoteName(midiNote: number): string {
     if (midiNote < 0 || midiNote > 127) {
       return '---';
     }

     const octave = Math.floor(midiNote / 12) - 1;
     const noteIndex = midiNote % 12;
     const noteName = NOTE_NAMES[noteIndex];

     return `${noteName}-${octave}`;
   }

   /**
    * Validate note name format
    */
   export function isValidNoteName(noteName: string): boolean {
     if (!noteName || noteName === '---') return true; // Rest is valid
     return noteNameToMIDI(noteName) !== null;
   }

   /**
    * Format note name (normalize to consistent format)
    */
   export function formatNoteName(noteName: string): string {
     const midi = noteNameToMIDI(noteName);
     if (midi === null) return '---';
     return midiToNoteName(midi);
   }
   ```

2. Create test file `src/utils/noteConversion.test.ts` (optional but helpful):
   ```typescript
   import { noteNameToMIDI, midiToNoteName } from './noteConversion';

   // Simple console-based tests
   export function testNoteConversion() {
     console.log('=== Note Conversion Tests ===');

     // Test middle C
     const c4 = noteNameToMIDI('C-4');
     console.log('C-4 =', c4, '(expected 60):', c4 === 60 ? '✅' : '❌');

     // Test A440
     const a4 = noteNameToMIDI('A-4');
     console.log('A-4 =', a4, '(expected 69):', a4 === 69 ? '✅' : '❌');

     // Test sharps
     const cs4 = noteNameToMIDI('C#-4');
     console.log('C#-4 =', cs4, '(expected 61):', cs4 === 61 ? '✅' : '❌');

     // Test different formats
     const c4Alt = noteNameToMIDI('C4'); // Without dash
     console.log('C4 =', c4Alt, '(expected 60):', c4Alt === 60 ? '✅' : '❌');

     // Test rest
     const rest = noteNameToMIDI('---');
     console.log('--- =', rest, '(expected null):', rest === null ? '✅' : '❌');

     // Test reverse conversion
     const backToName = midiToNoteName(60);
     console.log('60 =', backToName, '(expected C-4):', backToName === 'C-4' ? '✅' : '❌');

     // Test edge cases
     const low = noteNameToMIDI('C-0'); // MIDI 12
     console.log('C-0 =', low, '(expected 12):', low === 12 ? '✅' : '❌');

     const high = noteNameToMIDI('G-9'); // MIDI 127
     console.log('G-9 =', high, '(expected 127):', high === 127 ? '✅' : '❌');

     console.log('=== Tests Complete ===');
   }
   ```

**Testing Steps:**

1. Add to `src/App.tsx`:
   ```typescript
   import { testNoteConversion } from './utils/noteConversion.test';

   // In useEffect:
   useEffect(() => {
     testNoteConversion(); // Run tests on load
     // ... rest of init
   }, []);
   ```

2. Check console for test results
   - All tests should show ✅

**Expected Results:**
- ✅ C-4 converts to 60
- ✅ A-4 converts to 69
- ✅ Sharps work (C#-4 = 61)
- ✅ Both "C-4" and "C4" formats work
- ✅ Rest ("---") returns null
- ✅ Reverse conversion works (60 → "C-4")

**Acceptance Criteria:**
- ✅ All conversion tests pass
- ✅ Can handle different note formats
- ✅ Validates MIDI range (0-127)
- ✅ Handles invalid input gracefully

---

## Phase 3: Simple Playback Engine

**Goal:** Schedule and play tracker patterns with timing.

**Time Estimate:** 2-3 hours

### Task 3.1: Create SimplePlayer Class

**Steps:**

1. Create `src/SimplePlayer.ts`:
   ```typescript
   /**
    * SimplePlayer - Basic pattern playback engine
    *
    * Plays tracker patterns with simple setTimeout scheduling.
    * Not sample-accurate but good enough for MVP.
    */

   import { SimpleSynth } from './SimpleSynth';

   export interface TrackerNote {
     note: number | null;    // MIDI note number, null = rest
     instrument: number;     // Instrument ID (unused for now)
   }

   export interface TrackerPattern {
     rows: TrackerNote[][];  // [row][track]
     bpm: number;
     stepsPerBeat: number;   // 4 = 16th notes
   }

   export class SimplePlayer {
     private synth: SimpleSynth;
     private pattern: TrackerPattern | null = null;
     private isPlaying: boolean = false;
     private currentRow: number = 0;
     private intervalId: number | null = null;
     private onRowChange?: (row: number) => void;

     constructor(synth: SimpleSynth) {
       this.synth = synth;
     }

     /**
      * Load a pattern for playback
      */
     loadPattern(pattern: TrackerPattern): void {
       console.log('[SimplePlayer] Loading pattern:', pattern);
       this.pattern = pattern;
     }

     /**
      * Start playback
      */
     play(): void {
       if (this.isPlaying) {
         console.warn('[SimplePlayer] Already playing');
         return;
       }

       if (!this.pattern) {
         console.error('[SimplePlayer] No pattern loaded');
         return;
       }

       console.log('[SimplePlayer] Starting playback');

       this.isPlaying = true;
       this.synth.start();

       // Calculate timing
       const msPerRow = this.calculateMsPerRow();
       console.log(`[SimplePlayer] BPM: ${this.pattern.bpm}, ms/row: ${msPerRow.toFixed(2)}`);

       // Start playback loop
       this.playRow();
       this.intervalId = window.setInterval(() => this.playRow(), msPerRow);
     }

     /**
      * Pause playback
      */
     pause(): void {
       if (!this.isPlaying) return;

       console.log('[SimplePlayer] Pausing');
       this.isPlaying = false;

       if (this.intervalId !== null) {
         clearInterval(this.intervalId);
         this.intervalId = null;
       }

       // Stop all currently playing notes
       this.synth.allNotesOff();
     }

     /**
      * Stop playback and reset to beginning
      */
     stop(): void {
       this.pause();
       this.currentRow = 0;
       console.log('[SimplePlayer] Stopped and reset');

       if (this.onRowChange) {
         this.onRowChange(this.currentRow);
       }
     }

     /**
      * Check if playing
      */
     playing(): boolean {
       return this.isPlaying;
     }

     /**
      * Get current row
      */
     getCurrentRow(): number {
       return this.currentRow;
     }

     /**
      * Register callback for row changes (for UI updates)
      */
     setOnRowChange(callback: (row: number) => void): void {
       this.onRowChange = callback;
     }

     /**
      * Play current row
      */
     private playRow(): void {
       if (!this.pattern) return;

       // Wrap around if at end
       if (this.currentRow >= this.pattern.rows.length) {
         this.currentRow = 0;
         console.log('[SimplePlayer] Looping to start');
       }

       const row = this.pattern.rows[this.currentRow];
       console.log(`[SimplePlayer] Row ${this.currentRow}:`, row);

       // Play notes in each track
       row.forEach((trackNote, trackIndex) => {
         if (trackNote.note !== null) {
           // Use track index as channel (0-3 for 4 tracks)
           this.synth.noteOn(trackIndex, trackNote.note, 100);

           // Schedule note off shortly before next row
           const msPerRow = this.calculateMsPerRow();
           const noteOffTime = msPerRow * 0.85; // Leave 15% gap

           setTimeout(() => {
             this.synth.noteOff(trackIndex, trackNote.note!);
           }, noteOffTime);
         }
       });

       // Update current row
       this.currentRow++;

       // Notify callback
       if (this.onRowChange) {
         this.onRowChange(this.currentRow);
       }
     }

     /**
      * Calculate milliseconds per row based on BPM
      */
     private calculateMsPerRow(): number {
       if (!this.pattern) return 500;

       // BPM = beats per minute
       // stepsPerBeat = how many rows per beat (4 for 16th notes)
       const beatsPerSecond = this.pattern.bpm / 60;
       const stepsPerSecond = beatsPerSecond * this.pattern.stepsPerBeat;
       const msPerStep = 1000 / stepsPerSecond;

       return msPerStep;
     }
   }
   ```

**Acceptance Criteria:**
- ✅ File compiles without errors
- ✅ Class structure complete
- ✅ Timing calculation correct

---

### Task 3.2: Test SimplePlayer with Hardcoded Pattern

**Steps:**

1. Update `src/App.tsx`:
   ```typescript
   import { useState, useEffect } from 'react';
   import { SimpleSynth } from './SimpleSynth';
   import { SimplePlayer, TrackerPattern } from './SimplePlayer';
   import './App.css';

   function App() {
     const [synth, setSynth] = useState<SimpleSynth | null>(null);
     const [player, setPlayer] = useState<SimplePlayer | null>(null);
     const [isReady, setIsReady] = useState(false);
     const [isPlaying, setIsPlaying] = useState(false);
     const [currentRow, setCurrentRow] = useState(0);

     useEffect(() => {
       const init = async () => {
         // Initialize synth
         const s = new SimpleSynth();
         await s.init();
         setSynth(s);

         // Initialize player
         const p = new SimplePlayer(s);
         p.setOnRowChange((row) => setCurrentRow(row));
         setPlayer(p);

         setIsReady(true);
       };

       init();
     }, []);

     const handlePlayStop = () => {
       if (!player) return;

       if (isPlaying) {
         player.stop();
         setIsPlaying(false);
       } else {
         // Create test pattern - C major scale
         const testPattern: TrackerPattern = {
           bpm: 120,
           stepsPerBeat: 4, // 16th notes
           rows: [
             [{ note: 60, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }], // C
             [{ note: 62, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }], // D
             [{ note: 64, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }], // E
             [{ note: 65, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }], // F
             [{ note: 67, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }], // G
             [{ note: 69, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }], // A
             [{ note: 71, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }], // B
             [{ note: 72, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }], // C
             // Rests
             [{ note: null, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }],
             [{ note: null, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }],
             [{ note: null, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }],
             [{ note: null, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }],
             [{ note: null, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }],
             [{ note: null, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }],
             [{ note: null, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }],
             [{ note: null, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }, { note: null, instrument: 0 }],
           ]
         };

         player.loadPattern(testPattern);
         player.play();
         setIsPlaying(true);
       }
     };

     return (
       <div className="app">
         <h1>SimplePlayer Test</h1>

         <div style={{ marginBottom: '20px' }}>
           Status: {isReady ? '✅ Ready' : '⏳ Initializing...'}
         </div>

         <div style={{ marginBottom: '20px' }}>
           <button onClick={handlePlayStop} disabled={!isReady} style={{ fontSize: '18px', padding: '10px 20px' }}>
             {isPlaying ? '⏹ Stop' : '▶ Play Test Pattern'}
           </button>
         </div>

         <div style={{ fontFamily: 'monospace' }}>
           Current Row: {currentRow} / 16
         </div>
       </div>
     );
   }

   export default App;
   ```

**Testing Steps:**

1. Run `npm run dev`
2. Click "Play Test Pattern"
3. Should hear C major scale
4. Watch "Current Row" counter increment
5. Pattern should loop after 16 rows
6. Click "Stop" - should stop and reset to row 0

**Expected Results:**
- ✅ Hears 8 notes (C D E F G A B C)
- ✅ Notes play at correct tempo (120 BPM)
- ✅ 8 rows of silence after scale
- ✅ Pattern loops automatically
- ✅ Row counter updates
- ✅ Stop button works

**Troubleshooting:**

**If timing is wrong:**
- Check BPM calculation
- Log `msPerRow` value
- At 120 BPM with 4 steps/beat: should be 125ms per row
- Formula: 60 / BPM / stepsPerBeat * 1000

**If notes overlap:**
- Check note-off scheduling
- Should be ~85% of row duration
- Adjust `noteOffTime` calculation

**If doesn't loop:**
- Check `currentRow` reset logic
- Should wrap to 0 when >= pattern.rows.length

**Acceptance Criteria:**
- ✅ Plays hardcoded pattern correctly
- ✅ Timing is accurate
- ✅ Pattern loops
- ✅ Stop/reset works
- ✅ Row counter updates

---

## Phase 4: Tracker Grid UI

**Goal:** Create editable grid for entering notes.

**Time Estimate:** 2-3 hours

### Task 4.1: Create TrackerGrid Component

**Steps:**

1. Create `src/components/TrackerGrid.tsx`:
   ```typescript
   /**
    * TrackerGrid - Editable grid for entering tracker notes
    */

   import React from 'react';
   import './TrackerGrid.css';

   interface TrackerGridProps {
     rows: number;
     tracks: number;
     pattern: string[][];          // [row][track] = "C-4" or "---"
     onUpdate: (pattern: string[][]) => void;
     currentRow?: number;          // For playback highlighting
   }

   export function TrackerGrid({ rows, tracks, pattern, onUpdate, currentRow }: TrackerGridProps) {
     const handleCellChange = (row: number, track: number, value: string) => {
       // Create new pattern array (immutable update)
       const newPattern = pattern.map(r => [...r]);

       // Normalize input
       let normalized = value.trim().toUpperCase();

       // If empty, set to rest
       if (normalized === '') {
         normalized = '---';
       }

       newPattern[row][track] = normalized;
       onUpdate(newPattern);
     };

     const handleKeyDown = (e: React.KeyboardEvent, row: number, track: number) => {
       // Handle arrow key navigation
       const input = e.target as HTMLInputElement;

       let nextRow = row;
       let nextTrack = track;

       switch (e.key) {
         case 'ArrowUp':
           if (row > 0) {
             nextRow = row - 1;
             e.preventDefault();
           }
           break;
         case 'ArrowDown':
         case 'Enter':
           if (row < rows - 1) {
             nextRow = row + 1;
             e.preventDefault();
           }
           break;
         case 'ArrowLeft':
           if (track > 0) {
             nextTrack = track - 1;
             e.preventDefault();
           }
           break;
         case 'ArrowRight':
         case 'Tab':
           if (track < tracks - 1) {
             nextTrack = track + 1;
             e.preventDefault();
           }
           break;
         case 'Delete':
         case 'Backspace':
           // Clear on delete (but don't prevent backspace during editing)
           if (input.selectionStart === 0 && input.selectionEnd === input.value.length) {
             handleCellChange(row, track, '---');
             e.preventDefault();
           }
           break;
         default:
           return;
       }

       // Focus next cell if navigation occurred
       if (nextRow !== row || nextTrack !== track) {
         const nextInput = document.querySelector(
           `input[data-row="${nextRow}"][data-track="${nextTrack}"]`
         ) as HTMLInputElement;

         if (nextInput) {
           nextInput.focus();
           nextInput.select();
         }
       }
     };

     return (
       <div className="tracker-grid-container">
         <table className="tracker-grid">
           <thead>
             <tr>
               <th className="row-header">Row</th>
               {Array.from({ length: tracks }, (_, i) => (
                 <th key={i} className="track-header">
                   Track {i + 1}
                 </th>
               ))}
             </tr>
           </thead>
           <tbody>
             {Array.from({ length: rows }, (_, row) => (
               <tr
                 key={row}
                 className={row === currentRow ? 'current-row' : ''}
               >
                 <td className="row-number">
                   {row.toString().padStart(2, '0')}
                 </td>
                 {Array.from({ length: tracks }, (_, track) => (
                   <td key={track} className="note-cell">
                     <input
                       type="text"
                       value={pattern[row][track]}
                       onChange={(e) => handleCellChange(row, track, e.target.value)}
                       onKeyDown={(e) => handleKeyDown(e, row, track)}
                       onFocus={(e) => e.target.select()}
                       maxLength={4}
                       className="note-input"
                       placeholder="---"
                       data-row={row}
                       data-track={track}
                     />
                   </td>
                 ))}
               </tr>
             ))}
           </tbody>
         </table>
       </div>
     );
   }
   ```

2. Create `src/components/TrackerGrid.css`:
   ```css
   .tracker-grid-container {
     overflow: auto;
     max-height: 600px;
     border: 2px solid #333;
     border-radius: 4px;
   }

   .tracker-grid {
     width: 100%;
     border-collapse: collapse;
     font-family: 'Courier New', 'Consolas', monospace;
     font-size: 14px;
     background-color: #1a1a1a;
     color: #00ff00;
   }

   .tracker-grid thead {
     position: sticky;
     top: 0;
     z-index: 10;
     background-color: #2a2a2a;
   }

   .tracker-grid th {
     padding: 8px;
     border: 1px solid #333;
     font-weight: bold;
     text-align: center;
   }

   .row-header {
     width: 50px;
     background-color: #2a2a2a;
   }

   .track-header {
     background-color: #2a2a2a;
     color: #ffff00;
   }

   .tracker-grid td {
     border: 1px solid #333;
     padding: 0;
   }

   .row-number {
     background-color: #252525;
     text-align: center;
     font-weight: bold;
     color: #888;
     padding: 4px 8px;
     user-select: none;
   }

   .current-row {
     background-color: #2a3a2a !important;
   }

   .current-row .row-number {
     background-color: #3a4a3a;
     color: #00ff00;
     font-weight: bold;
   }

   .note-cell {
     padding: 2px;
   }

   .note-input {
     width: 100%;
     min-width: 60px;
     padding: 4px 8px;
     background: transparent;
     border: none;
     color: #00ff00;
     font-family: inherit;
     font-size: inherit;
     text-align: center;
     text-transform: uppercase;
     outline: none;
   }

   .note-input:focus {
     background-color: #2a2a2a;
     outline: 2px solid #00ff00;
     outline-offset: -2px;
   }

   .note-input::placeholder {
     color: #444;
   }

   /* Hover effect */
   .tracker-grid tbody tr:hover {
     background-color: #222;
   }
   ```

**Acceptance Criteria:**
- ✅ Component renders without errors
- ✅ Grid displays with correct dimensions
- ✅ CSS styling applied

---

### Task 4.2: Integrate TrackerGrid with App

**Steps:**

1. Update `src/App.tsx`:
   ```typescript
   import { useState, useEffect } from 'react';
   import { SimpleSynth } from './SimpleSynth';
   import { SimplePlayer, TrackerPattern, TrackerNote } from './SimplePlayer';
   import { noteNameToMIDI } from './utils/noteConversion';
   import { TrackerGrid } from './components/TrackerGrid';
   import './App.css';

   function App() {
     const [synth, setSynth] = useState<SimpleSynth | null>(null);
     const [player, setPlayer] = useState<SimplePlayer | null>(null);
     const [isReady, setIsReady] = useState(false);
     const [isPlaying, setIsPlaying] = useState(false);
     const [currentRow, setCurrentRow] = useState(0);
     const [bpm, setBpm] = useState(120);

     // Initialize pattern with 16 rows x 4 tracks
     const [pattern, setPattern] = useState<string[][]>(() =>
       Array(16).fill(null).map(() => Array(4).fill('---'))
     );

     useEffect(() => {
       const init = async () => {
         const s = new SimpleSynth();
         await s.init();
         setSynth(s);

         const p = new SimplePlayer(s);
         p.setOnRowChange((row) => setCurrentRow(row));
         setPlayer(p);

         setIsReady(true);
       };

       init();
     }, []);

     const handlePlayStop = () => {
       if (!player) return;

       if (isPlaying) {
         player.stop();
         setIsPlaying(false);
         setCurrentRow(0);
       } else {
         // Convert string pattern to TrackerPattern
         const trackerPattern: TrackerPattern = {
           bpm: bpm,
           stepsPerBeat: 4,
           rows: pattern.map(row =>
             row.map(cell => ({
               note: noteNameToMIDI(cell),
               instrument: 0
             }))
           )
         };

         player.loadPattern(trackerPattern);
         player.play();
         setIsPlaying(true);
       }
     };

     const loadExample = () => {
       // Load C major scale as example
       const example: string[][] = Array(16).fill(null).map(() => Array(4).fill('---'));

       // Track 0: Melody
       example[0][0] = 'C-4';
       example[1][0] = 'D-4';
       example[2][0] = 'E-4';
       example[3][0] = 'F-4';
       example[4][0] = 'G-4';
       example[5][0] = 'A-4';
       example[6][0] = 'B-4';
       example[7][0] = 'C-5';

       // Track 1: Bass (root notes)
       example[0][1] = 'C-3';
       example[4][1] = 'G-3';
       example[8][1] = 'C-3';

       setPattern(example);
     };

     const clearPattern = () => {
       setPattern(Array(16).fill(null).map(() => Array(4).fill('---')));
     };

     return (
       <div className="app">
         <header className="header">
           <h1>🎵 WebOrchestra - Minimal Tracker</h1>
           <div className="status">
             {isReady ? '✅ Ready' : '⏳ Initializing...'}
           </div>
         </header>

         <div className="controls">
           <div className="control-group">
             <button
               onClick={handlePlayStop}
               disabled={!isReady}
               className="btn-primary"
             >
               {isPlaying ? '⏹ Stop' : '▶ Play'}
             </button>

             <label className="control-label">
               BPM:
               <input
                 type="number"
                 value={bpm}
                 onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
                 min={60}
                 max={240}
                 disabled={isPlaying}
                 className="bpm-input"
               />
             </label>
           </div>

           <div className="control-group">
             <button onClick={loadExample} disabled={isPlaying}>
               Load Example
             </button>
             <button onClick={clearPattern} disabled={isPlaying}>
               Clear
             </button>
           </div>
         </div>

         <div className="tracker-section">
           <TrackerGrid
             rows={16}
             tracks={4}
             pattern={pattern}
             onUpdate={setPattern}
             currentRow={isPlaying ? currentRow : undefined}
           />
         </div>

         <div className="help-section">
           <h3>How to use:</h3>
           <ul>
             <li><strong>Enter notes:</strong> C-4, D-4, E-4, F-4, G-4, A-4, B-4, C-5</li>
             <li><strong>Sharps:</strong> C#4, D#4, F#4, G#4, A#4</li>
             <li><strong>Rest:</strong> --- (or leave empty)</li>
             <li><strong>Navigate:</strong> Arrow keys, Enter, Tab</li>
             <li><strong>Clear cell:</strong> Delete key</li>
             <li><strong>Middle C:</strong> C-4 = MIDI 60</li>
           </ul>
         </div>
       </div>
     );
   }

   export default App;
   ```

2. Update `src/App.css`:
   ```css
   * {
     box-sizing: border-box;
   }

   body {
     margin: 0;
     padding: 0;
     font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
     background-color: #0a0a0a;
     color: #e0e0e0;
   }

   .app {
     max-width: 1200px;
     margin: 0 auto;
     padding: 20px;
   }

   .header {
     display: flex;
     justify-content: space-between;
     align-items: center;
     margin-bottom: 20px;
     padding-bottom: 10px;
     border-bottom: 2px solid #333;
   }

   .header h1 {
     margin: 0;
     font-size: 24px;
     color: #00ff00;
   }

   .status {
     font-size: 14px;
     padding: 5px 10px;
     background-color: #2a2a2a;
     border-radius: 4px;
   }

   .controls {
     display: flex;
     justify-content: space-between;
     align-items: center;
     margin-bottom: 20px;
     padding: 15px;
     background-color: #1a1a1a;
     border-radius: 4px;
     border: 1px solid #333;
   }

   .control-group {
     display: flex;
     gap: 10px;
     align-items: center;
   }

   .control-label {
     display: flex;
     align-items: center;
     gap: 8px;
     font-size: 14px;
   }

   button {
     padding: 8px 16px;
     font-size: 14px;
     font-weight: 500;
     border: 1px solid #444;
     border-radius: 4px;
     background-color: #2a2a2a;
     color: #e0e0e0;
     cursor: pointer;
     transition: all 0.2s;
   }

   button:hover:not(:disabled) {
     background-color: #3a3a3a;
     border-color: #555;
   }

   button:active:not(:disabled) {
     background-color: #1a1a1a;
   }

   button:disabled {
     opacity: 0.5;
     cursor: not-allowed;
   }

   .btn-primary {
     background-color: #00aa00;
     color: white;
     border-color: #00aa00;
     font-size: 16px;
     padding: 10px 20px;
   }

   .btn-primary:hover:not(:disabled) {
     background-color: #00cc00;
   }

   .bpm-input {
     width: 70px;
     padding: 6px 8px;
     font-size: 14px;
     background-color: #2a2a2a;
     border: 1px solid #444;
     border-radius: 4px;
     color: #e0e0e0;
   }

   .bpm-input:focus {
     outline: 2px solid #00ff00;
     outline-offset: 1px;
   }

   .tracker-section {
     margin-bottom: 30px;
   }

   .help-section {
     padding: 20px;
     background-color: #1a1a1a;
     border-radius: 4px;
     border: 1px solid #333;
   }

   .help-section h3 {
     margin-top: 0;
     color: #00ff00;
   }

   .help-section ul {
     margin: 10px 0;
     padding-left: 20px;
   }

   .help-section li {
     margin: 8px 0;
     line-height: 1.6;
   }

   .help-section strong {
     color: #ffff00;
   }
   ```

**Testing Steps:**

1. Run `npm run dev`
2. Click "Load Example"
   - Should fill grid with C major scale
3. Click "Play"
   - Should hear scale and bass notes
   - Current row should highlight in green
4. Click "Stop"
   - Should stop and reset
5. Edit a note:
   - Click cell with "C-4"
   - Type "G-4"
   - Press Enter
6. Play again
   - Should hear edited note
7. Test keyboard navigation:
   - Arrow keys should move between cells
   - Tab should move to next track
   - Enter should move to next row
   - Delete should clear cell

**Expected Results:**
- ✅ Grid displays correctly
- ✅ Can type notes into cells
- ✅ Keyboard navigation works
- ✅ Current row highlights during playback
- ✅ Edited notes are heard
- ✅ Example pattern loads
- ✅ Clear button works

**Acceptance Criteria:**
- ✅ Full tracker UI working
- ✅ Can enter notes via keyboard
- ✅ Navigation between cells works
- ✅ Pattern plays with entered notes
- ✅ Current row highlights during playback

---

## Phase 5: Integration & Polish

**Goal:** Fix bugs, improve UX, add final touches.

**Time Estimate:** 2-4 hours

### Task 5.1: Add Pattern Validation

**Steps:**

1. Create `src/utils/patternValidation.ts`:
   ```typescript
   import { isValidNoteName } from './noteConversion';

   export function validatePattern(pattern: string[][]): {
     valid: boolean;
     errors: string[];
   } {
     const errors: string[] = [];

     pattern.forEach((row, rowIndex) => {
       row.forEach((cell, trackIndex) => {
         if (!isValidNoteName(cell)) {
           errors.push(`Row ${rowIndex}, Track ${trackIndex}: Invalid note "${cell}"`);
         }
       });
     });

     return {
       valid: errors.length === 0,
       errors
     };
   }
   ```

2. Add validation to App.tsx before playing:
   ```typescript
   import { validatePattern } from './utils/patternValidation';

   const handlePlayStop = () => {
     if (!player) return;

     if (isPlaying) {
       player.stop();
       setIsPlaying(false);
       setCurrentRow(0);
     } else {
       // Validate pattern
       const validation = validatePattern(pattern);
       if (!validation.valid) {
         alert('Invalid notes in pattern:\n' + validation.errors.join('\n'));
         return;
       }

       // ... rest of play logic
     }
   };
   ```

---

### Task 5.2: Add Visual Feedback

**Steps:**

1. Add error highlighting to TrackerGrid:
   ```typescript
   // In TrackerGrid.tsx, add validation check
   const isInvalidNote = (note: string): boolean => {
     if (!note || note === '---') return false;
     return !isValidNoteName(note);
   };

   // In render, add className:
   <input
     className={`note-input ${isInvalidNote(pattern[row][track]) ? 'invalid' : ''}`}
     // ... rest of props
   />
   ```

2. Add CSS for invalid notes:
   ```css
   /* In TrackerGrid.css */
   .note-input.invalid {
     color: #ff0000 !important;
     background-color: #3a0000 !important;
   }
   ```

---

### Task 5.3: Add Keyboard Shortcuts

**Steps:**

1. Add global keyboard handler to App.tsx:
   ```typescript
   useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
       // Space bar: Play/Stop
       if (e.code === 'Space' && e.target === document.body) {
         e.preventDefault();
         handlePlayStop();
       }
     };

     document.addEventListener('keydown', handleKeyDown);
     return () => document.removeEventListener('keydown', handleKeyDown);
   }, [isPlaying, player]); // Dependencies
   ```

2. Update help section:
   ```tsx
   <li><strong>Keyboard shortcut:</strong> Space bar = Play/Stop</li>
   ```

---

### Task 5.4: Add Loading State

**Steps:**

1. Show loading message during init:
   ```typescript
   if (!isReady) {
     return (
       <div className="app" style={{ textAlign: 'center', paddingTop: '100px' }}>
         <h2>🎵 Initializing WebOrchestra...</h2>
         <p>Loading OPL3 synthesizer...</p>
       </div>
     );
   }
   ```

---

### Task 5.5: Final Testing Checklist

**Test all features:**

- [ ] Initialize audio on page load
- [ ] Load example pattern
- [ ] Edit notes in grid
- [ ] Keyboard navigation (arrows, tab, enter)
- [ ] Delete to clear cells
- [ ] Change BPM
- [ ] Play pattern
- [ ] Stop during playback
- [ ] Current row highlighting
- [ ] Pattern loops correctly
- [ ] Invalid note detection (try typing "Z-4")
- [ ] Space bar shortcut
- [ ] Clear pattern button
- [ ] Browser refresh and re-init

**Test edge cases:**

- [ ] Empty pattern (all rests)
- [ ] Very fast BPM (240)
- [ ] Very slow BPM (60)
- [ ] All tracks playing simultaneously
- [ ] Rapid play/stop clicks
- [ ] Playing while editing

---

## Testing & Debugging Guide

### Common Issues and Solutions

#### No Sound

**Check:**
1. Browser console for errors
2. AudioContext state (suspended vs running)
3. System volume
4. Browser audio permissions

**Debug:**
```typescript
console.log('AudioContext state:', audioContext.state);
console.log('ScriptNode connected:', scriptNode !== null);
```

**Fix:**
- Call `audioContext.resume()` on user interaction
- Check if audio is muted in browser

---

#### Wrong Timing

**Check:**
1. BPM calculation
2. `msPerRow` value
3. `setInterval` delay

**Debug:**
```typescript
console.log('BPM:', pattern.bpm);
console.log('Steps per beat:', pattern.stepsPerBeat);
console.log('Ms per row:', msPerRow);
```

**Expected at 120 BPM:**
- 120 BPM = 2 beats per second
- 4 steps per beat = 8 steps per second
- 1000ms / 8 = 125ms per step

---

#### Notes Overlapping

**Check:**
1. Note-off timing (should be ~85% of row duration)
2. Channel allocation
3. Active note tracking

**Debug:**
```typescript
console.log('Note ON:', channel, note);
console.log('Active channels:', Array.from(activeChannels.entries()));
```

**Fix:**
- Ensure note-off is called before next note-on
- Use different channel per track

---

#### Invalid Notes Not Playing

**Check:**
1. `noteNameToMIDI` returns null
2. Console warnings
3. Pattern validation

**Debug:**
```typescript
const midi = noteNameToMIDI('X-4');
console.log('MIDI:', midi); // Should be null for invalid note
```

---

### Performance Issues

**If audio glitches:**
- Increase ScriptProcessorNode buffer size (8192 instead of 4096)
- Check CPU usage in browser task manager
- Reduce console.log calls in audio callback

**If UI is slow:**
- Use React.memo for TrackerGrid
- Debounce pattern updates
- Virtualize grid for large patterns (future)

---

## Next Steps After MVP

Once the minimal prototype is working, you can expand it:

### Iteration 1: Better Sound (2-3 hours)
- Load actual GENMIDI instrument
- Proper register programming
- Better default instrument

### Iteration 2: Better Timing (2-3 hours)
- Replace setTimeout with requestAnimationFrame
- Look-ahead scheduling
- More accurate timing

### Iteration 3: More Features (5-8 hours)
- Multiple patterns
- Pattern chaining
- Note velocity editing
- 2-3 different instruments

### Iteration 4: Better UI (5-8 hours)
- Row highlighting on hover
- Copy/paste rows
- Undo/redo
- Pattern length adjustment
- Track mute/solo

### Iteration 5: Export (3-4 hours)
- WAV export
- Project save/load (JSON)

### Full Implementation
- Then proceed to full plan with:
  - Piano roll editor
  - Arrangement timeline
  - Full GENMIDI bank (128 instruments)
  - Tone.js integration for better timing
  - Advanced features

---

## Success Criteria Summary

**MVP is complete when:**

✅ Can initialize audio engine
✅ Can enter notes in tracker grid (C-4 format)
✅ Can play pattern with play/stop button
✅ Timing is approximately correct at 120 BPM
✅ Can adjust BPM
✅ 4 simultaneous notes work (4 tracks)
✅ Pattern loops automatically
✅ Current row highlights during playback
✅ Keyboard navigation works
✅ Example pattern loads and plays
✅ No major bugs or crashes

---

## Time Tracking

| Phase | Task | Estimated | Actual |
|-------|------|-----------|--------|
| 0 | Project setup | 1-2h | ___ |
| 0 | Proof of concept | | ___ |
| 1 | SimpleSynth class | 2-3h | ___ |
| 1 | Testing | | ___ |
| 2 | Note conversion | 1h | ___ |
| 3 | SimplePlayer class | 2-3h | ___ |
| 3 | Testing | | ___ |
| 4 | TrackerGrid UI | 2-3h | ___ |
| 4 | Integration | | ___ |
| 5 | Polish & debug | 2-4h | ___ |
| **Total** | | **9-15h** | ___ |

---

*Good luck with the implementation! Start with Phase 0 and test each piece before moving forward.*
