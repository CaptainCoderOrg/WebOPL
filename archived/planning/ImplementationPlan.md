# WebOrchestra Implementation Plan

## Document Purpose

This document provides a comprehensive, step-by-step implementation guide for building WebOrchestra, an OPL3 synthesizer DAW. It includes detailed tasks, research notes, testing strategies, and decision points for each phase of development.

---

## Table of Contents

1. [Pre-Implementation Research](#pre-implementation-research)
2. [Phase 1: Project Foundation](#phase-1-project-foundation)
3. [Phase 2: Audio Engine Core](#phase-2-audio-engine-core)
4. [Phase 3: Sequencing & Timing](#phase-3-sequencing--timing)
5. [Phase 4: Instrument System](#phase-4-instrument-system)
6. [Phase 5: UI - Pattern Editor (Piano Roll)](#phase-5-ui---pattern-editor-piano-roll)
7. [Phase 6: UI - Tracker Editor](#phase-6-ui---tracker-editor)
8. [Phase 7: Arrangement System](#phase-7-arrangement-system)
9. [Phase 8: Export & Serialization](#phase-8-export--serialization)
10. [Phase 9: Polish & Testing](#phase-9-polish--testing)
11. [Integration Testing](#integration-testing)
12. [Deployment](#deployment)

---

## Pre-Implementation Research

### Research Task 1: OPL3 Emulation Libraries

**Objective:** Evaluate OPL3 emulation options for browser usage.

**Libraries to Investigate:**

1. **@malvineous/opl (RECOMMENDED)**
   - GitHub: https://github.com/malvineous/opl3-wasm
   - Install: `npm install @malvineous/opl`
   - **Research Questions:**
     - How to initialize the WASM module?
     - What is the API for writing registers?
     - How to generate samples and feed them to Web Audio?
     - What is the performance overhead?
     - Does it support both OPL2 and OPL3 modes?
   - **Test Implementation:**
     ```typescript
     import OPL from '@malvineous/opl';

     // Test code to write
     const testOPL = async () => {
       const opl = await OPL.create();
       // Write test register (enable waveform selection)
       opl.write(0x01, 0x20);
       // Generate 1 second of samples
       const samples = opl.generate(49716);
       console.log('Generated', samples.length, 'samples');
     };
     ```

2. **opl3 (doomjs/opl3)**
   - npm: `opl3`
   - **Research Questions:**
     - Does this provide real-time synthesis or just playback?
     - Can we access low-level register writes?
     - Is GENMIDI bank included?
   - **Note:** May be better for playing back existing formats (MUS, IMF, DRO) rather than real-time synthesis

3. **WebAssembly Ports of C++ Emulators**
   - DOSBox OPL3 emulator (dosbox-opl3)
   - Nuked OPL3 (most accurate)
   - **Research Questions:**
     - Are these available as npm packages?
     - How to compile to WASM if not available?
     - Performance comparison with @malvineous/opl

**Deliverable:** Document with pros/cons of each library, code samples, and recommendation.

---

### Research Task 2: Web Audio API Integration

**Objective:** Understand how to integrate OPL3 sample generation with Web Audio API.

**Topics to Research:**

1. **AudioWorklet vs ScriptProcessorNode**
   - **AudioWorklet (Modern, Recommended):**
     - Runs on audio rendering thread
     - Better performance and lower latency
     - Browser support: Chrome 66+, Firefox 76+, Safari 14.1+
   - **ScriptProcessorNode (Deprecated):**
     - Runs on main thread
     - May cause audio glitches
     - Use only as fallback
   - **Research Questions:**
     - How to load AudioWorklet module in Vite?
     - How to pass OPL3 emulator instance to worklet?
     - Message passing pattern for note events
     - Buffer size considerations

2. **Audio Buffer Management**
   - **Research Questions:**
     - What buffer size to use? (128, 256, 512 samples)
     - How to handle underruns?
     - Ring buffer implementation needed?
     - Sample rate conversion (OPL3 49716Hz → Web Audio variable rate)

3. **Sample Rate Conversion**
   - OPL3 native rate: 49716 Hz
   - Web Audio default: 44100 Hz or 48000 Hz
   - **Research Questions:**
     - Do we need resampling?
     - Can we set AudioContext sample rate to 49716 Hz?
     - Performance impact of resampling
   - **Test Code:**
     ```typescript
     // Test if browser supports OPL3 native rate
     const testSampleRate = () => {
       const ctx = new AudioContext({ sampleRate: 49716 });
       console.log('Actual sample rate:', ctx.sampleRate);
       // May round to 44100 or 48000
     };
     ```

**Deliverable:** Technical document on AudioWorklet integration strategy with code examples.

---

### Research Task 3: MIDI Sequencing with Tone.js

**Objective:** Learn Tone.js Transport and scheduling APIs.

**Topics to Research:**

1. **Tone.Transport Basics**
   - Documentation: https://tonejs.github.io/docs/Transport
   - **Research Questions:**
     - How to schedule events at specific times?
     - Time notation formats ("4n", "8n", "0:0:0")
     - How to convert ticks to Tone.js time?
     - Loop and repeat functionality
   - **Test Implementation:**
     ```typescript
     import * as Tone from 'tone';

     const testTransport = () => {
       Tone.Transport.bpm.value = 120;

       // Schedule event at measure 1, beat 1
       Tone.Transport.schedule((time) => {
         console.log('Event fired at', time);
       }, '1:0:0');

       Tone.Transport.start();
     };
     ```

2. **Scheduling Patterns**
   - **Research Questions:**
     - Look-ahead scheduling strategy
     - How to schedule many events efficiently?
     - Clearing scheduled events
     - Pattern looping with Tone.Loop
   - **Test Pattern Playback:**
     ```typescript
     const testPattern = () => {
       const notes = [
         { time: '0:0:0', note: 60 },
         { time: '0:1:0', note: 64 },
         { time: '0:2:0', note: 67 },
       ];

       notes.forEach(n => {
         Tone.Transport.schedule((time) => {
           // Trigger note on OPL synth
           triggerNote(n.note, time);
         }, n.time);
       });
     };
     ```

3. **Time Conversions**
   - **Research Questions:**
     - Convert ticks (480 PPQ) → Tone.js time notation
     - Convert seconds → ticks
     - Handle tempo changes
   - **Utility Functions Needed:**
     ```typescript
     function ticksToTime(ticks: number, ppq: number, bpm: number): string
     function timeToTicks(time: string, ppq: number, bpm: number): number
     function secondsToTicks(seconds: number, bpm: number, ppq: number): number
     ```

**Deliverable:** Tone.js integration guide with working examples and utility functions.

---

### Research Task 4: React Piano Roll Components

**Objective:** Evaluate piano roll libraries for React.

**Libraries to Investigate:**

1. **react-piano-roll**
   - GitHub: https://github.com/unkleho/react-piano-roll
   - Install: `npm install react-piano-roll`
   - **Research Questions:**
     - Data format for notes?
     - How to handle note editing events?
     - Customization options (colors, grid lines)?
     - Performance with many notes?
     - Can we render multiple tracks?
   - **Test Implementation:**
     ```typescript
     import PianoRoll from 'react-piano-roll';

     const TestPianoRoll = () => {
       const [notes, setNotes] = useState([
         { time: '0:0:0', note: 'C4', duration: '4n', velocity: 0.8 },
       ]);

       return (
         <PianoRoll
           notes={notes}
           onChange={setNotes}
           resolution={16}
           width={800}
           height={400}
         />
       );
     };
     ```

2. **Build Custom Piano Roll**
   - If react-piano-roll is insufficient
   - **Research Questions:**
     - Canvas vs SVG vs DOM rendering?
     - Virtualization for performance?
     - Mouse/touch event handling
     - Snap-to-grid implementation
   - **Libraries for Custom Implementation:**
     - react-konva (Canvas wrapper)
     - react-window (Virtualization)
     - react-use-gesture (Gesture handling)

3. **Alternative: MIDI Editor Libraries**
   - midier (if it has React bindings)
   - react-midi-editor
   - **Research:** Are these actively maintained?

**Deliverable:** Comparison document with recommendation and proof-of-concept implementation.

---

### Research Task 5: OPL3 Instrument Data Formats

**Objective:** Understand OPL3 instrument patch formats and obtain GENMIDI data.

**Topics to Research:**

1. **SBI Format (Single Bank Instrument)**
   - 52-byte format (32-byte name + 20 bytes data)
   - Used by AdLib Visual Composer
   - **Research Questions:**
     - Byte-by-byte structure documentation
     - How to parse in JavaScript?
     - Available SBI libraries?
   - **Resources:**
     - ModdingWiki: https://moddingwiki.shikadi.net/wiki/SBI_Format

2. **IBK Format (Instrument Bank)**
   - Contains 128 instruments
   - Used by AdLib libraries
   - **Research Questions:**
     - File structure and header format
     - JavaScript parser implementation
   - **Resources:**
     - ModdingWiki: https://moddingwiki.shikadi.net/wiki/IBK_Format

3. **GENMIDI Format (Doom's OPL Patches)**
   - GENMIDI lump from Doom WAD files
   - 128 GM-mapped instruments
   - **Research Questions:**
     - How to extract from WAD file?
     - Already available in JSON format?
     - Licensing considerations (Doom is open source)
   - **Sources:**
     - Extract from freedoom.wad
     - Existing JavaScript implementations
     - Pre-converted JSON available?

4. **OP2/OP3 Formats**
   - DMX library formats
   - Less common but may have good patches

**Action Items:**
- [ ] Find or create GENMIDI.json with 128 patches
- [ ] Document patch structure mapping
- [ ] Create TypeScript types for instrument data
- [ ] Write parser utilities if needed

**Deliverable:** GENMIDI.json file with 128 instruments and documentation on patch structure.

---

### Research Task 6: WAV File Encoding

**Objective:** Learn how to encode PCM audio as WAV format in JavaScript.

**Topics to Research:**

1. **WAV File Structure**
   - RIFF header
   - fmt chunk (format specification)
   - data chunk (PCM samples)
   - **Resources:**
     - WAV format specification
     - MDN Web Audio examples

2. **JavaScript WAV Encoding Libraries**
   - **wavefile** (npm package)
     - Install: `npm install wavefile`
     - Simple API for WAV encoding
   - **audiobuffer-to-wav**
     - Converts Web Audio AudioBuffer to WAV
   - **Manual Implementation**
     - DataView and ArrayBuffer manipulation
     - ~50 lines of code for basic WAV encoder

3. **Sample Format Conversion**
   - Float32 (Web Audio) → Int16 (WAV)
   - Stereo vs mono
   - **Code Example:**
     ```typescript
     function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
       for (let i = 0; i < input.length; i++, offset += 2) {
         const s = Math.max(-1, Math.min(1, input[i]));
         output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
       }
     }
     ```

**Deliverable:** WAV encoding utility with test implementation.

---

### Research Task 7: Project State Management

**Objective:** Design state management architecture for the DAW.

**Options to Evaluate:**

1. **React Context + useReducer (Recommended for prototype)**
   - Built-in, no dependencies
   - Simple for moderate complexity
   - **Research Questions:**
     - Performance with frequent updates?
     - Optimization strategies (memo, context splitting)

2. **Redux Toolkit**
   - More complex but powerful
   - Time-travel debugging
   - **When to use:** If state becomes too complex

3. **Zustand**
   - Lightweight alternative to Redux
   - Simple API
   - **Research:** Does it handle undo/redo well?

4. **Jotai / Recoil**
   - Atomic state management
   - May be overkill for this project

**Decision Criteria:**
- Ease of undo/redo implementation
- Performance with large pattern data
- Developer experience
- Bundle size

**Deliverable:** Architecture document with chosen solution and rationale.

---

### Research Task 8: Drag-and-Drop Implementation

**Objective:** Choose drag-and-drop library for pattern arrangement.

**Options to Investigate:**

1. **HTML5 Drag and Drop API**
   - Native browser API
   - Pros: No dependencies
   - Cons: Complex API, inconsistent across browsers
   - **Test Implementation Needed:** Basic drag-drop example

2. **react-beautiful-dnd**
   - Popular, good documentation
   - Optimized for lists
   - **Research Questions:**
     - Can it handle our timeline use case?
     - Horizontal dragging support?
   - Install: `npm install react-beautiful-dnd`

3. **dnd-kit**
   - Modern alternative to react-beautiful-dnd
   - Better TypeScript support
   - Better accessibility
   - Install: `npm install @dnd-kit/core @dnd-kit/sortable`
   - **Recommended for new projects**

4. **react-dnd**
   - Very flexible but complex
   - May be overkill

**Test Requirements:**
- Drag pattern blocks horizontally on timeline
- Visual feedback during drag
- Snap to grid
- Insert vs reorder behavior

**Deliverable:** Drag-and-drop proof of concept for timeline.

---

## Phase 1: Project Foundation

### Estimated Time: 2-3 days

### Task 1.1: Initialize Vite + React + TypeScript Project

**Steps:**

1. Create project using Vite:
   ```bash
   npm create vite@latest weborchestra -- --template react-ts
   cd weborchestra
   npm install
   ```

2. Verify setup:
   ```bash
   npm run dev
   ```
   - Should open browser to http://localhost:5173
   - Should show default Vite + React page

3. Clean up template files:
   - Remove default CSS in `src/App.css`
   - Remove Vite logos and boilerplate from `src/App.tsx`
   - Update `index.html` title to "WebOrchestra"

**Acceptance Criteria:**
- ✅ Project builds without errors
- ✅ Dev server runs successfully
- ✅ Hot module replacement works

---

### Task 1.2: Install Core Dependencies

**Steps:**

1. Install audio libraries:
   ```bash
   npm install tone @malvineous/opl
   ```

2. Install UI libraries:
   ```bash
   npm install react-piano-roll
   npm install @dnd-kit/core @dnd-kit/sortable
   ```

3. Install utility libraries:
   ```bash
   npm install uuid
   npm install wavefile
   ```

4. Install dev dependencies:
   ```bash
   npm install -D @types/node
   npm install -D @types/uuid
   npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
   npm install -D prettier
   ```

5. Verify installations:
   - Check `package.json` for all dependencies
   - Run `npm run dev` to ensure no conflicts

**Research Notes:**
- If @malvineous/opl has issues, document and prepare fallback plan
- Check if react-piano-roll has type definitions

**Acceptance Criteria:**
- ✅ All packages install without errors
- ✅ No version conflicts
- ✅ TypeScript recognizes all imports

---

### Task 1.3: Configure TypeScript

**Steps:**

1. Update `tsconfig.json` with strict settings:
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "useDefineForClassFields": true,
       "lib": ["ES2020", "DOM", "DOM.Iterable"],
       "module": "ESNext",
       "skipLibCheck": true,
       "moduleResolution": "bundler",
       "allowImportingTsExtensions": true,
       "resolveJsonModule": true,
       "isolatedModules": true,
       "noEmit": true,
       "jsx": "react-jsx",

       /* Strict Type-Checking */
       "strict": true,
       "noUnusedLocals": true,
       "noUnusedParameters": true,
       "noFallthroughCasesInSwitch": true,

       /* Path Aliases */
       "baseUrl": ".",
       "paths": {
         "@/*": ["./src/*"],
         "@components/*": ["./src/components/*"],
         "@engine/*": ["./src/engine/*"],
         "@types/*": ["./src/types/*"],
         "@utils/*": ["./src/utils/*"]
       }
     },
     "include": ["src"],
     "references": [{ "path": "./tsconfig.node.json" }]
   }
   ```

2. Update `vite.config.ts` to support path aliases:
   ```typescript
   import { defineConfig } from 'vite';
   import react from '@vitejs/plugin-react';
   import path from 'path';

   export default defineConfig({
     plugins: [react()],
     resolve: {
       alias: {
         '@': path.resolve(__dirname, './src'),
         '@components': path.resolve(__dirname, './src/components'),
         '@engine': path.resolve(__dirname, './src/engine'),
         '@types': path.resolve(__dirname, './src/types'),
         '@utils': path.resolve(__dirname, './src/utils'),
       },
     },
   });
   ```

**Acceptance Criteria:**
- ✅ TypeScript compiles without errors
- ✅ Path aliases work in imports
- ✅ Strict mode catches type errors

---

### Task 1.4: Set Up Project Structure

**Steps:**

1. Create directory structure:
   ```bash
   mkdir -p src/components/{Header,Arrangement,PatternEditor,Instruments,Transport}
   mkdir -p src/engine/worklets
   mkdir -p src/types
   mkdir -p src/contexts
   mkdir -p src/hooks
   mkdir -p src/utils
   mkdir -p src/styles/components
   mkdir -p public/instruments
   mkdir -p public/examples
   ```

2. Create placeholder files:
   - `src/types/index.ts` (export all types)
   - `src/engine/AudioEngine.ts`
   - `src/engine/OPLSynthesizer.ts`
   - `src/engine/MIDISequencer.ts`
   - `src/contexts/AppContext.tsx`
   - `src/contexts/AudioEngineContext.tsx`
   - `src/utils/serialization.ts`
   - `src/utils/timeConversion.ts`

3. Create `.gitignore` if not exists:
   ```
   node_modules
   dist
   dist-ssr
   *.local
   .env
   .DS_Store
   ```

**Acceptance Criteria:**
- ✅ All directories created
- ✅ Project structure matches documentation
- ✅ Placeholder files created with exports

---

### Task 1.5: Define Core TypeScript Types

**Steps:**

1. Create `src/types/Note.ts`:
   ```typescript
   export interface Note {
     id: string;
     time: number;        // In ticks
     pitch: number;       // MIDI note number (0-127)
     duration: number;    // In ticks
     velocity: number;    // 0-127
     instrument: number;  // Patch ID (0-127)
   }
   ```

2. Create `src/types/Track.ts`:
   ```typescript
   import { Note } from './Note';

   export interface Track {
     id: string;
     name: string;
     notes: Note[];
     muted: boolean;
     solo: boolean;
     volume: number;      // 0.0 - 1.0
     pan: number;         // -1.0 to 1.0
     color: string;       // Hex color
   }
   ```

3. Create `src/types/Pattern.ts`:
   ```typescript
   import { Track } from './Track';

   export interface Pattern {
     id: string;
     name: string;
     length: number;      // In ticks
     tracks: Track[];
     timeSignature: {
       numerator: number;
       denominator: number;
     };
   }
   ```

4. Create `src/types/Song.ts`:
   ```typescript
   import { Pattern } from './Pattern';
   import { InstrumentBank } from './Instrument';

   export interface Song {
     version: string;
     name: string;
     bpm: number;
     ppq: number;         // Pulses per quarter note
     patterns: Pattern[];
     arrangement: ArrangementItem[];
     instrumentBank: InstrumentBank;
   }

   export interface ArrangementItem {
     patternId: string;
     startTime: number;   // In ticks
   }
   ```

5. Create `src/types/Instrument.ts`:
   ```typescript
   export interface OPLOperator {
     attackRate: number;            // 0-15
     decayRate: number;             // 0-15
     sustainLevel: number;          // 0-15
     releaseRate: number;           // 0-15
     frequencyMultiplier: number;   // 0-15
     keyScaleLevel: number;         // 0-3
     outputLevel: number;           // 0-63
     amVibrato: boolean;
     tremolo: boolean;
     sustainingSound: boolean;
     keyScaleRate: boolean;
     waveform: number;              // 0-7
   }

   export interface OPLPatch {
     id: number;
     name: string;
     mode: '2op' | '4op';
     operators: [OPLOperator, OPLOperator] |
                [OPLOperator, OPLOperator, OPLOperator, OPLOperator];
     connection: number;
     feedbackModulation: number;
   }

   export interface InstrumentBank {
     name: string;
     patches: OPLPatch[];
   }
   ```

6. Create `src/types/index.ts`:
   ```typescript
   export * from './Note';
   export * from './Track';
   export * from './Pattern';
   export * from './Song';
   export * from './Instrument';
   ```

**Acceptance Criteria:**
- ✅ All types compile without errors
- ✅ Can import types: `import { Song, Pattern } from '@types';`
- ✅ Types match documentation exactly

---

### Task 1.6: Configure Linting and Formatting

**Steps:**

1. Create `.eslintrc.json`:
   ```json
   {
     "env": {
       "browser": true,
       "es2021": true
     },
     "extends": [
       "eslint:recommended",
       "plugin:react/recommended",
       "plugin:@typescript-eslint/recommended",
       "plugin:react-hooks/recommended"
     ],
     "parser": "@typescript-eslint/parser",
     "parserOptions": {
       "ecmaFeatures": {
         "jsx": true
       },
       "ecmaVersion": "latest",
       "sourceType": "module"
     },
     "plugins": ["react", "@typescript-eslint"],
     "rules": {
       "react/react-in-jsx-scope": "off",
       "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
     },
     "settings": {
       "react": {
         "version": "detect"
       }
     }
   }
   ```

2. Create `.prettierrc`:
   ```json
   {
     "semi": true,
     "trailingComma": "es5",
     "singleQuote": true,
     "printWidth": 100,
     "tabWidth": 2,
     "useTabs": false
   }
   ```

3. Add scripts to `package.json`:
   ```json
   {
     "scripts": {
       "dev": "vite",
       "build": "tsc && vite build",
       "preview": "vite preview",
       "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
       "lint:fix": "eslint src --ext ts,tsx --fix",
       "format": "prettier --write \"src/**/*.{ts,tsx,css}\""
     }
   }
   ```

**Acceptance Criteria:**
- ✅ `npm run lint` runs without errors
- ✅ `npm run format` formats files correctly
- ✅ VSCode/editor picks up ESLint/Prettier

---

### Task 1.7: Create Basic App Shell

**Steps:**

1. Create `src/App.tsx`:
   ```typescript
   import React from 'react';
   import './App.css';

   function App() {
     return (
       <div className="app">
         <header className="app-header">
           <h1>WebOrchestra</h1>
           <div className="header-controls">
             <span>BPM: 120</span>
             <button>Save</button>
             <button>Load</button>
             <button>Export</button>
           </div>
         </header>

         <main className="app-main">
           <div className="arrangement-view">
             <h2>Arrangement</h2>
             {/* Timeline will go here */}
           </div>

           <div className="pattern-editor">
             <h2>Pattern Editor</h2>
             {/* Piano roll / tracker will go here */}
           </div>

           <div className="instrument-panel">
             <h2>Instruments</h2>
             {/* Instrument list will go here */}
           </div>
         </main>

         <footer className="transport-bar">
           <button>⏮</button>
           <button>▶</button>
           <button>⏸</button>
           <button>⏹</button>
           <span>Position: 0:0:0</span>
         </footer>
       </div>
     );
   }

   export default App;
   ```

2. Create `src/App.css`:
   ```css
   .app {
     display: flex;
     flex-direction: column;
     height: 100vh;
     font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
   }

   .app-header {
     display: flex;
     justify-content: space-between;
     align-items: center;
     padding: 1rem;
     background-color: #2c3e50;
     color: white;
   }

   .app-main {
     flex: 1;
     display: grid;
     grid-template-columns: 1fr 3fr 1fr;
     gap: 1rem;
     padding: 1rem;
     overflow: hidden;
   }

   .arrangement-view,
   .pattern-editor,
   .instrument-panel {
     border: 1px solid #ccc;
     padding: 1rem;
     overflow: auto;
   }

   .transport-bar {
     display: flex;
     gap: 0.5rem;
     align-items: center;
     padding: 1rem;
     background-color: #34495e;
     color: white;
   }

   button {
     padding: 0.5rem 1rem;
     cursor: pointer;
   }
   ```

3. Update `src/main.tsx` if needed:
   ```typescript
   import React from 'react';
   import ReactDOM from 'react-dom/client';
   import App from './App.tsx';
   import './index.css';

   ReactDOM.createRoot(document.getElementById('root')!).render(
     <React.StrictMode>
       <App />
     </React.StrictMode>
   );
   ```

**Acceptance Criteria:**
- ✅ App renders with basic layout
- ✅ All sections visible (header, arrangement, editor, instruments, transport)
- ✅ Responsive layout (basic)

---

### Phase 1 Deliverables

- ✅ Working Vite + React + TypeScript project
- ✅ All dependencies installed
- ✅ Project structure created
- ✅ Core types defined
- ✅ Linting and formatting configured
- ✅ Basic app shell rendering

**Testing:**
- Run `npm run dev` - should start without errors
- Run `npm run lint` - should pass
- Run `npm run build` - should build successfully

---

## Phase 2: Audio Engine Core

### Estimated Time: 5-7 days

### Task 2.1: Research and Test @malvineous/opl

**Steps:**

1. Create test file `src/tests/testOPL.ts`:
   ```typescript
   import OPL from '@malvineous/opl';

   export async function testOPLInitialization() {
     try {
       console.log('Creating OPL instance...');
       const opl = await OPL.create();
       console.log('OPL created successfully!');

       // Test register write (enable waveform selection)
       opl.write(0x01, 0x20);

       // Generate silent samples (no notes playing)
       const samples = opl.generate(1000);
       console.log('Generated', samples.length, 'samples');
       console.log('Sample data type:', samples.constructor.name);
       console.log('First 10 samples:', samples.slice(0, 10));

       return { success: true, opl };
     } catch (error) {
       console.error('OPL initialization failed:', error);
       return { success: false, error };
     }
   }
   ```

2. Call test from App.tsx temporarily:
   ```typescript
   import { useEffect } from 'react';
   import { testOPLInitialization } from './tests/testOPL';

   function App() {
     useEffect(() => {
       testOPLInitialization();
     }, []);

     // ... rest of component
   }
   ```

3. Check browser console for output

**Research Questions to Answer:**
- ✅ What sample format does generate() return? (Int16Array, Float32Array?)
- ✅ What sample rate is used?
- ✅ Does it support stereo output?
- ✅ How are registers addressed?

**Acceptance Criteria:**
- ✅ OPL instance creates successfully
- ✅ Can write registers
- ✅ Can generate samples
- ✅ Understand sample format

---

### Task 2.2: Implement MIDI Note to F-Number Conversion

**Steps:**

1. Create `src/utils/midiUtils.ts`:
   ```typescript
   /**
    * OPL3 uses F-Number and Block for pitch instead of MIDI notes.
    * F-Number: 10-bit value (0-1023)
    * Block: 3-bit octave value (0-7)
    *
    * Formula: frequency = 49716 * F-Number / (2^(20-Block))
    * Inverse: F-Number = frequency * 2^(20-Block) / 49716
    */

   export interface OPLFrequency {
     fnum: number;  // 0-1023
     block: number; // 0-7
   }

   const MIDI_TO_FREQ_TABLE: OPLFrequency[] = [];

   /**
    * Convert MIDI note number to frequency in Hz
    */
   export function midiNoteToFrequency(note: number): number {
     // A4 (MIDI 69) = 440 Hz
     return 440 * Math.pow(2, (note - 69) / 12);
   }

   /**
    * Convert frequency to OPL3 F-Number and Block
    */
   export function frequencyToOPLFrequency(frequency: number): OPLFrequency {
     // Try each block from 0 to 7
     for (let block = 0; block < 8; block++) {
       const fnum = Math.round((frequency * Math.pow(2, 20 - block)) / 49716);

       // F-Number must be in range 0-1023
       if (fnum >= 0 && fnum < 1024) {
         return { fnum, block };
       }
     }

     // Fallback (shouldn't happen for valid MIDI notes)
     console.warn('Could not convert frequency to F-Number:', frequency);
     return { fnum: 0, block: 0 };
   }

   /**
    * Convert MIDI note to OPL3 F-Number and Block
    */
   export function midiNoteToOPLFrequency(note: number): OPLFrequency {
     if (note < 0 || note > 127) {
       throw new Error(`Invalid MIDI note: ${note}`);
     }

     // Use cached table if available
     if (MIDI_TO_FREQ_TABLE[note]) {
       return MIDI_TO_FREQ_TABLE[note];
     }

     const frequency = midiNoteToFrequency(note);
     const oplFreq = frequencyToOPLFrequency(frequency);
     MIDI_TO_FREQ_TABLE[note] = oplFreq;

     return oplFreq;
   }

   /**
    * Initialize lookup table for all MIDI notes
    */
   export function initMIDILookupTable(): void {
     console.log('Initializing MIDI to F-Number lookup table...');

     for (let note = 0; note < 128; note++) {
       midiNoteToOPLFrequency(note);
     }

     console.log('Lookup table initialized for 128 notes');

     // Log some examples
     console.log('MIDI 60 (C4):', MIDI_TO_FREQ_TABLE[60]);
     console.log('MIDI 69 (A4):', MIDI_TO_FREQ_TABLE[69]);
   }
   ```

2. Create test file `src/tests/testMIDIUtils.ts`:
   ```typescript
   import {
     midiNoteToFrequency,
     midiNoteToOPLFrequency,
     initMIDILookupTable
   } from '@utils/midiUtils';

   export function testMIDIConversion() {
     console.log('=== MIDI Conversion Tests ===');

     // Test frequency conversion
     const a4Freq = midiNoteToFrequency(69);
     console.log('MIDI 69 (A4) frequency:', a4Freq, 'Hz (should be 440)');

     // Test OPL frequency conversion
     const c4 = midiNoteToOPLFrequency(60); // Middle C
     console.log('MIDI 60 (C4) -> F-Num:', c4.fnum, 'Block:', c4.block);

     const a4 = midiNoteToOPLFrequency(69); // A4
     console.log('MIDI 69 (A4) -> F-Num:', a4.fnum, 'Block:', a4.block);

     // Initialize full table
     initMIDILookupTable();

     // Test edge cases
     const lowest = midiNoteToOPLFrequency(0);
     console.log('MIDI 0 -> F-Num:', lowest.fnum, 'Block:', lowest.block);

     const highest = midiNoteToOPLFrequency(127);
     console.log('MIDI 127 -> F-Num:', highest.fnum, 'Block:', highest.block);
   }
   ```

**Acceptance Criteria:**
- ✅ Function converts all MIDI notes (0-127) correctly
- ✅ Middle C (MIDI 60) produces reasonable values
- ✅ A4 (MIDI 69, 440Hz) produces correct F-Number and Block
- ✅ Lookup table works

---

### Task 2.3: Implement OPLSynthesizer Class

**Steps:**

1. Create `src/engine/OPLSynthesizer.ts`:
   ```typescript
   import OPL from '@malvineous/opl';
   import { midiNoteToOPLFrequency, initMIDILookupTable } from '@utils/midiUtils';
   import { OPLPatch } from '@types';

   interface VoiceState {
     active: boolean;
     note: number;
     channel: number;
     patchId: number;
     startTime: number;
   }

   export class OPLSynthesizer {
     private opl: any = null; // OPL instance from @malvineous/opl
     private voices: VoiceState[] = [];
     private sampleRate: number = 49716;
     private patches: Map<number, OPLPatch> = new Map();

     constructor() {
       // Initialize 18 voices (OPL3 has 18 2-operator voices)
       for (let i = 0; i < 18; i++) {
         this.voices.push({
           active: false,
           note: 0,
           channel: i,
           patchId: 0,
           startTime: 0,
         });
       }
     }

     async init(): Promise<void> {
       console.log('Initializing OPL synthesizer...');

       // Create OPL instance
       this.opl = await OPL.create();

       // Initialize MIDI lookup table
       initMIDILookupTable();

       // Enable waveform selection (register 0x01)
       this.opl.write(0x01, 0x20);

       // Enable OPL3 mode (register 0x105)
       // TODO: Research if needed for basic 2-op mode

       console.log('OPL synthesizer initialized');
     }

     /**
      * Load an instrument patch into memory
      */
     loadPatch(patchId: number, patch: OPLPatch): void {
       this.patches.set(patchId, patch);
     }

     /**
      * Allocate a voice for a new note
      */
     private allocateVoice(): number {
       // First, try to find a free voice
       const freeVoice = this.voices.findIndex(v => !v.active);
       if (freeVoice !== -1) {
         return freeVoice;
       }

       // No free voices, steal the oldest one
       let oldestVoice = 0;
       let oldestTime = this.voices[0].startTime;

       for (let i = 1; i < this.voices.length; i++) {
         if (this.voices[i].startTime < oldestTime) {
           oldestTime = this.voices[i].startTime;
           oldestVoice = i;
         }
       }

       // Release the old note
       this.noteOff(this.voices[oldestVoice].channel, this.voices[oldestVoice].note);

       return oldestVoice;
     }

     /**
      * Trigger a note
      */
     noteOn(channel: number, note: number, velocity: number, patchId: number): void {
       if (!this.opl) {
         console.error('OPL not initialized');
         return;
       }

       // TODO: For now, use channel directly as voice
       // Later: implement proper voice allocation
       const voice = channel % 18;

       // Get OPL frequency
       const { fnum, block } = midiNoteToOPLFrequency(note);

       // TODO: Load patch registers (Task 2.4)
       // For now, use a simple test tone

       // Calculate register offsets for this channel
       const channelOffset = voice % 9;
       const registerBase = voice < 9 ? 0 : 0x100;

       // Write F-Number low byte (0xA0-0xA8)
       this.opl.write(registerBase + 0xA0 + channelOffset, fnum & 0xFF);

       // Write Key-On + Block + F-Number high (0xB0-0xB8)
       const highByte = 0x20 | (block << 2) | ((fnum >> 8) & 0x03);
       this.opl.write(registerBase + 0xB0 + channelOffset, highByte);

       // Update voice state
       this.voices[voice].active = true;
       this.voices[voice].note = note;
       this.voices[voice].patchId = patchId;
       this.voices[voice].startTime = Date.now();

       console.log(`Note ON: voice=${voice}, note=${note}, fnum=${fnum}, block=${block}`);
     }

     /**
      * Release a note
      */
     noteOff(channel: number, note: number): void {
       if (!this.opl) return;

       // Find voice playing this note
       const voice = this.voices.findIndex(v => v.active && v.note === note);

       if (voice === -1) {
         console.warn(`Note OFF: voice not found for note ${note}`);
         return;
       }

       // Calculate register offset
       const channelOffset = voice % 9;
       const registerBase = voice < 9 ? 0 : 0x100;

       // Clear Key-On bit (0xB0-0xB8)
       // Read current value, clear bit 5
       // For now, just write 0
       this.opl.write(registerBase + 0xB0 + channelOffset, 0x00);

       // Update voice state
       this.voices[voice].active = false;

       console.log(`Note OFF: voice=${voice}, note=${note}`);
     }

     /**
      * Generate audio samples
      */
     generate(numSamples: number): Float32Array {
       if (!this.opl) {
         // Return silence if not initialized
         return new Float32Array(numSamples);
       }

       // Generate samples from OPL
       const samples = this.opl.generate(numSamples);

       // Convert to Float32Array if needed
       // TODO: Check what type @malvineous/opl returns
       if (samples instanceof Int16Array) {
         const float32 = new Float32Array(numSamples);
         for (let i = 0; i < numSamples; i++) {
           float32[i] = samples[i] / 32768.0; // Convert int16 to float
         }
         return float32;
       }

       return samples;
     }

     /**
      * Reset all voices and OPL state
      */
     reset(): void {
       if (!this.opl) return;

       console.log('Resetting OPL synthesizer...');

       // Release all notes
       this.voices.forEach((v, i) => {
         if (v.active) {
           const channelOffset = i % 9;
           const registerBase = i < 9 ? 0 : 0x100;
           this.opl.write(registerBase + 0xB0 + channelOffset, 0x00);
           v.active = false;
         }
       });
     }

     /**
      * Get sample rate
      */
     getSampleRate(): number {
       return this.sampleRate;
     }
   }
   ```

**Research Notes:**
- **TODO:** Verify register offsets for OPL3
- **TODO:** Understand second register bank (0x100+) for channels 9-17
- **TODO:** Confirm sample output format from @malvineous/opl

**Acceptance Criteria:**
- ✅ Class instantiates successfully
- ✅ `init()` creates OPL instance
- ✅ `noteOn()` can trigger notes (basic)
- ✅ `noteOff()` can release notes
- ✅ `generate()` returns samples

---

### Task 2.4: Test OPL Synthesis with Simple Tone

**Steps:**

1. Create `src/tests/testOPLSynthesis.ts`:
   ```typescript
   import { OPLSynthesizer } from '@engine/OPLSynthesizer';

   export async function testSimpleTone() {
     console.log('=== Testing OPL Synthesis ===');

     // Initialize synthesizer
     const synth = new OPLSynthesizer();
     await synth.init();

     // Play middle C (MIDI note 60)
     console.log('Playing note 60 (C4)...');
     synth.noteOn(0, 60, 100, 0);

     // Generate 1 second of audio
     const sampleRate = synth.getSampleRate();
     const duration = 1; // seconds
     const numSamples = sampleRate * duration;

     console.log(`Generating ${numSamples} samples...`);
     const samples = synth.generate(numSamples);

     // Analyze samples
     let nonZero = 0;
     let maxAmplitude = 0;

     for (let i = 0; i < samples.length; i++) {
       const abs = Math.abs(samples[i]);
       if (abs > 0.0001) nonZero++;
       if (abs > maxAmplitude) maxAmplitude = abs;
     }

     console.log('Non-zero samples:', nonZero, '/', samples.length);
     console.log('Max amplitude:', maxAmplitude);

     if (nonZero > 0) {
       console.log('✅ SUCCESS: Audio generated!');
     } else {
       console.log('❌ FAIL: All samples are silent');
     }

     // Release note
     synth.noteOff(0, 60);

     return { samples, nonZero, maxAmplitude };
   }
   ```

2. Add test to App.tsx temporarily:
   ```typescript
   import { testSimpleTone } from './tests/testOPLSynthesis';

   useEffect(() => {
     testSimpleTone();
   }, []);
   ```

3. Check console output

**Expected Result:**
- Should see non-zero samples
- Max amplitude should be > 0

**If test fails:**
- Check OPL register writes
- Verify operator configuration
- Research @malvineous/opl examples
- Check if patch/operator setup is needed before playing

**Acceptance Criteria:**
- ✅ Test generates non-zero audio samples
- ✅ Console shows successful synthesis
- ✅ No errors in console

---

### Task 2.5: Implement Basic AudioWorklet

**Research Note:** AudioWorklet requires loading a separate JavaScript file. We need to research how to do this with Vite/TypeScript.

**Steps:**

1. Research Vite AudioWorklet integration:
   - Can we import worklet as URL?
   - Do we need special Vite plugin?
   - How to handle TypeScript in worklet?

2. Create `src/engine/worklets/opl-processor.worklet.ts`:
   ```typescript
   /**
    * OPL Audio Worklet Processor
    * Runs on audio rendering thread for real-time synthesis
    */

   // Note: AudioWorkletProcessor is not available in TypeScript by default
   // We need to declare it or use @types/audioworklet

   declare class AudioWorkletProcessor {
     port: MessagePort;
     process(
       inputs: Float32Array[][],
       outputs: Float32Array[][],
       parameters: Record<string, Float32Array>
     ): boolean;
   }

   declare function registerProcessor(
     name: string,
     processorCtor: new (options?: AudioWorkletNodeOptions) => AudioWorkletProcessor
   ): void;

   class OPLProcessor extends AudioWorkletProcessor {
     private bufferSize = 128;
     private sampleBuffer: Float32Array = new Float32Array(this.bufferSize);

     constructor() {
       super();

       console.log('[OPLProcessor] Initialized');

       // Listen for messages from main thread
       this.port.onmessage = this.handleMessage.bind(this);
     }

     handleMessage(event: MessageEvent) {
       const { type, data } = event.data;

       console.log('[OPLProcessor] Received message:', type, data);

       switch (type) {
         case 'noteOn':
           // TODO: Trigger note on synthesizer
           // Problem: How to access OPLSynthesizer instance here?
           break;

         case 'noteOff':
           // TODO: Release note
           break;

         default:
           console.warn('[OPLProcessor] Unknown message type:', type);
       }
     }

     process(
       inputs: Float32Array[][],
       outputs: Float32Array[][],
       parameters: Record<string, Float32Array>
     ): boolean {
       const output = outputs[0];

       if (!output || output.length === 0) {
         return true; // Keep processor alive
       }

       // Get left channel (output[0]), right channel would be output[1]
       const leftChannel = output[0];
       const numSamples = leftChannel.length;

       // TODO: Generate samples from OPL synthesizer
       // For now, output silence
       for (let i = 0; i < numSamples; i++) {
         leftChannel[i] = 0;
       }

       // Copy to right channel if stereo
       if (output.length > 1) {
         output[1].set(leftChannel);
       }

       return true; // Keep processor alive
     }
   }

   registerProcessor('opl-processor', OPLProcessor);
   ```

**Research Questions:**
- ❓ How to share OPLSynthesizer instance with worklet?
  - Option 1: Pass samples via MessagePort (may be too slow)
  - Option 2: SharedArrayBuffer (complex, requires COOP/COEP headers)
  - Option 3: Instantiate OPL in worklet (requires WASM in worklet)
- ❓ Can @malvineous/opl WASM work inside AudioWorklet?
- ❓ Do we need to build worklet separately?

**Acceptance Criteria:**
- ✅ Worklet file created
- ✅ Basic structure in place
- 🔲 Integration strategy decided (may need to defer to next task)

---

### Task 2.6: Implement AudioEngine Class

**Note:** This task may need significant research based on AudioWorklet findings.

**Steps:**

1. Create `src/engine/AudioEngine.ts`:
   ```typescript
   import { OPLSynthesizer } from './OPLSynthesizer';

   export class AudioEngine {
     private audioContext: AudioContext | null = null;
     private workletNode: AudioWorkletNode | null = null;
     private synthesizer: OPLSynthesizer;
     private isInitialized = false;

     // For prototype: Use ScriptProcessorNode as fallback
     private scriptNode: ScriptProcessorNode | null = null;
     private useWorklet = true; // Try worklet first

     constructor() {
       this.synthesizer = new OPLSynthesizer();
     }

     async init(): Promise<void> {
       if (this.isInitialized) {
         console.warn('AudioEngine already initialized');
         return;
       }

       console.log('Initializing AudioEngine...');

       // Create AudioContext
       // Try to use OPL3 native sample rate
       this.audioContext = new AudioContext({
         sampleRate: 49716
       });

       console.log('AudioContext sample rate:', this.audioContext.sampleRate);

       // Initialize synthesizer
       await this.synthesizer.init();

       // Try to use AudioWorklet
       if (this.useWorklet) {
         try {
           await this.initWorklet();
         } catch (error) {
           console.warn('AudioWorklet failed, falling back to ScriptProcessor:', error);
           this.initScriptProcessor();
         }
       } else {
         this.initScriptProcessor();
       }

       this.isInitialized = true;
       console.log('AudioEngine initialized successfully');
     }

     private async initWorklet(): Promise<void> {
       if (!this.audioContext) throw new Error('AudioContext not created');

       // TODO: Research - How to load worklet with Vite?
       // Option 1: Import as URL
       // import workletUrl from './worklets/opl-processor.worklet.ts?url';
       // Option 2: Inline as blob
       // Option 3: Vite plugin

       // Placeholder for now
       throw new Error('AudioWorklet not yet implemented');
     }

     private initScriptProcessor(): void {
       if (!this.audioContext) throw new Error('AudioContext not created');

       console.log('Using ScriptProcessorNode (legacy)');

       // Create ScriptProcessorNode (deprecated but works)
       const bufferSize = 4096; // Large buffer for stability
       this.scriptNode = this.audioContext.createScriptProcessor(bufferSize, 0, 2);

       // Audio processing callback
       this.scriptNode.onaudioprocess = (event) => {
         const outputL = event.outputBuffer.getChannelData(0);
         const outputR = event.outputBuffer.getChannelData(1);
         const numSamples = outputL.length;

         // Generate samples from OPL
         const samples = this.synthesizer.generate(numSamples);

         // Copy to output buffers (mono -> stereo)
         outputL.set(samples);
         outputR.set(samples);
       };

       // Connect to destination
       this.scriptNode.connect(this.audioContext.destination);
     }

     start(): void {
       if (!this.audioContext) {
         console.error('AudioEngine not initialized');
         return;
       }

       // Resume audio context if suspended (browser autoplay policy)
       if (this.audioContext.state === 'suspended') {
         this.audioContext.resume();
       }

       console.log('AudioEngine started');
     }

     stop(): void {
       if (!this.audioContext) return;

       // Suspend audio context
       this.audioContext.suspend();

       // Reset synthesizer
       this.synthesizer.reset();

       console.log('AudioEngine stopped');
     }

     getSynthesizer(): OPLSynthesizer {
       return this.synthesizer;
     }

     getAudioContext(): AudioContext | null {
       return this.audioContext;
     }
   }
   ```

**Acceptance Criteria:**
- ✅ AudioEngine instantiates
- ✅ Can initialize AudioContext
- ✅ ScriptProcessorNode works as fallback
- ✅ Can access synthesizer instance
- 🔲 AudioWorklet implementation (may defer)

---

### Task 2.7: Test Audio Output in Browser

**Steps:**

1. Create `src/tests/testAudioOutput.ts`:
   ```typescript
   import { AudioEngine } from '@engine/AudioEngine';

   export async function testAudioOutput() {
     console.log('=== Testing Audio Output ===');

     // Initialize engine
     const engine = new AudioEngine();
     await engine.init();

     const synth = engine.getSynthesizer();

     // User interaction required for audio (autoplay policy)
     console.log('Click the "Play Test Tone" button to hear audio');

     return {
       engine,
       playTone: () => {
         console.log('Playing test tone...');

         // Start audio
         engine.start();

         // Play middle C for 2 seconds
         synth.noteOn(0, 60, 100, 0);

         setTimeout(() => {
           synth.noteOff(0, 60);
           console.log('Test tone finished');
         }, 2000);
       }
     };
   }
   ```

2. Update App.tsx to include test button:
   ```typescript
   import { useEffect, useState } from 'react';
   import { testAudioOutput } from './tests/testAudioOutput';

   function App() {
     const [audioTest, setAudioTest] = useState<any>(null);

     useEffect(() => {
       testAudioOutput().then(test => {
         setAudioTest(test);
       });
     }, []);

     return (
       <div className="app">
         <header className="app-header">
           <h1>WebOrchestra</h1>
           {audioTest && (
             <button onClick={audioTest.playTone}>
               🔊 Play Test Tone
             </button>
           )}
         </header>
         {/* ... rest of app */}
       </div>
     );
   }
   ```

3. Test in browser:
   - Click "Play Test Tone" button
   - Should hear a tone for 2 seconds
   - Check console for logs

**Expected Result:**
- Audible tone plays for 2 seconds
- No errors in console
- Audio stops after 2 seconds

**If no audio:**
- Check browser audio permissions
- Check if AudioContext is suspended (autoplay policy)
- Verify OPL register writes
- Check sample generation (should be non-zero)
- Verify ScriptProcessorNode is connected

**Acceptance Criteria:**
- ✅ Button appears in UI
- ✅ Clicking button produces audible tone
- ✅ Tone stops after 2 seconds
- ✅ Can play multiple times

---

### Phase 2 Deliverables

- ✅ OPLSynthesizer class implemented
- ✅ MIDI to F-Number conversion working
- ✅ AudioEngine class implemented
- ✅ Audio output working in browser
- ✅ Basic note on/off functionality
- 🔲 AudioWorklet implementation (optional, can defer)

**Critical Success Criteria:**
- Must be able to play OPL3 tones through browser
- Must hear audible sound when testing

---

## Phase 3: Sequencing & Timing

### Estimated Time: 4-5 days

### Task 3.1: Research Tone.js Transport API

**Steps:**

1. Create `src/tests/testToneTransport.ts`:
   ```typescript
   import * as Tone from 'tone';

   export async function testToneTransport() {
     console.log('=== Testing Tone.js Transport ===');

     // Initialize Tone.js (required before use)
     await Tone.start();
     console.log('Tone.js started');

     // Set BPM
     Tone.Transport.bpm.value = 120;
     console.log('BPM:', Tone.Transport.bpm.value);

     // Schedule events at musical times
     Tone.Transport.schedule((time) => {
       console.log('Event 1 at', time, 'seconds');
     }, '0:0:0'); // Bar 0, beat 0, sixteenth 0

     Tone.Transport.schedule((time) => {
       console.log('Event 2 at', time, 'seconds');
     }, '0:1:0'); // Bar 0, beat 1

     Tone.Transport.schedule((time) => {
       console.log('Event 3 at', time, 'seconds');
     }, '1:0:0'); // Bar 1, beat 0

     // Start transport
     console.log('Starting transport...');
     Tone.Transport.start();

     // Stop after 3 seconds
     setTimeout(() => {
       Tone.Transport.stop();
       console.log('Transport stopped');
     }, 3000);

     return { success: true };
   }
   ```

2. Test callback timing:
   ```typescript
   export async function testCallbackTiming() {
     await Tone.start();

     const times: number[] = [];

     // Schedule 10 quarter notes
     for (let i = 0; i < 10; i++) {
       Tone.Transport.schedule((time) => {
         times.push(time);
         console.log(`Note ${i} at ${time}s`);
       }, `0:${i}:0`);
     }

     Tone.Transport.bpm.value = 120;
     Tone.Transport.start();

     // Analyze timing after 6 seconds
     setTimeout(() => {
       Tone.Transport.stop();

       console.log('=== Timing Analysis ===');
       console.log('Times:', times);

       // Calculate intervals
       const intervals: number[] = [];
       for (let i = 1; i < times.length; i++) {
         intervals.push(times[i] - times[i-1]);
       }

       console.log('Intervals:', intervals);
       console.log('Average interval:', intervals.reduce((a,b) => a+b, 0) / intervals.length);
       console.log('Expected (120 BPM):', 60 / 120, 'seconds per beat');
     }, 6000);
   }
   ```

**Research Questions to Answer:**
- ✅ How accurate is Transport scheduling?
- ✅ What time units does schedule() callback receive?
- ✅ How to convert bar:beat:sixteenth to seconds?
- ✅ How to get current transport position?

**Acceptance Criteria:**
- ✅ Understand Transport.schedule() API
- ✅ Verify timing accuracy
- ✅ Document time notation formats

---

### Task 3.2: Implement Time Conversion Utilities

**Steps:**

1. Create `src/utils/timeConversion.ts`:
   ```typescript
   /**
    * Time conversion utilities for WebOrchestra
    *
    * Internal format: Ticks (PPQ-based)
    * Tone.js format: "bars:beats:sixteenths" or seconds
    * Display format: "bars:beats:ticks"
    */

   /**
    * Convert ticks to Tone.js time notation
    * @param ticks - Time in ticks
    * @param ppq - Pulses per quarter note (e.g., 480)
    * @returns Time in "bars:beats:sixteenths" format
    */
   export function ticksToToneTime(ticks: number, ppq: number, timeSignature: { numerator: number, denominator: number } = { numerator: 4, denominator: 4 }): string {
     const ticksPerBeat = ppq;
     const beatsPerBar = timeSignature.numerator;
     const ticksPerBar = ticksPerBeat * beatsPerBar;

     const bars = Math.floor(ticks / ticksPerBar);
     const remainingTicks = ticks % ticksPerBar;

     const beats = Math.floor(remainingTicks / ticksPerBeat);
     const remainingTicksInBeat = remainingTicks % ticksPerBeat;

     // Convert remaining ticks to sixteenths
     // 1 beat = 4 sixteenths (assuming 4/4 time)
     const sixteenths = Math.floor((remainingTicksInBeat / ticksPerBeat) * 4);

     return `${bars}:${beats}:${sixteenths}`;
   }

   /**
    * Convert Tone.js time notation to ticks
    * @param time - Time in "bars:beats:sixteenths" format
    * @param ppq - Pulses per quarter note
    * @returns Time in ticks
    */
   export function toneTimeToTicks(time: string, ppq: number, timeSignature: { numerator: number, denominator: number } = { numerator: 4, denominator: 4 }): number {
     const parts = time.split(':').map(Number);
     const [bars = 0, beats = 0, sixteenths = 0] = parts;

     const ticksPerBeat = ppq;
     const beatsPerBar = timeSignature.numerator;
     const ticksPerBar = ticksPerBeat * beatsPerBar;

     let ticks = bars * ticksPerBar;
     ticks += beats * ticksPerBeat;
     ticks += (sixteenths / 4) * ticksPerBeat; // 4 sixteenths per beat

     return Math.round(ticks);
   }

   /**
    * Convert ticks to seconds
    * @param ticks - Time in ticks
    * @param ppq - Pulses per quarter note
    * @param bpm - Beats per minute
    * @returns Time in seconds
    */
   export function ticksToSeconds(ticks: number, ppq: number, bpm: number): number {
     const secondsPerBeat = 60 / bpm;
     const ticksPerBeat = ppq;
     const secondsPerTick = secondsPerBeat / ticksPerBeat;

     return ticks * secondsPerTick;
   }

   /**
    * Convert seconds to ticks
    * @param seconds - Time in seconds
    * @param ppq - Pulses per quarter note
    * @param bpm - Beats per minute
    * @returns Time in ticks
    */
   export function secondsToTicks(seconds: number, ppq: number, bpm: number): number {
     const secondsPerBeat = 60 / bpm;
     const ticksPerBeat = ppq;
     const ticksPerSecond = ticksPerBeat / secondsPerBeat;

     return Math.round(seconds * ticksPerSecond);
   }

   /**
    * Format ticks for display
    * @param ticks - Time in ticks
    * @param ppq - Pulses per quarter note
    * @returns Formatted string "bar:beat:tick"
    */
   export function formatTicks(ticks: number, ppq: number, timeSignature: { numerator: number, denominator: number } = { numerator: 4, denominator: 4 }): string {
     const ticksPerBeat = ppq;
     const beatsPerBar = timeSignature.numerator;
     const ticksPerBar = ticksPerBeat * beatsPerBar;

     const bar = Math.floor(ticks / ticksPerBar) + 1; // 1-indexed for display
     const remainingTicks = ticks % ticksPerBar;

     const beat = Math.floor(remainingTicks / ticksPerBeat) + 1; // 1-indexed
     const tick = remainingTicks % ticksPerBeat;

     return `${bar}:${beat}:${tick}`;
   }

   /**
    * Quantize ticks to nearest grid division
    * @param ticks - Time in ticks
    * @param gridDivision - Grid division in ticks (e.g., ppq/4 for 16th notes)
    * @returns Quantized ticks
    */
   export function quantizeTicks(ticks: number, gridDivision: number): number {
     return Math.round(ticks / gridDivision) * gridDivision;
   }
   ```

2. Create tests:
   ```typescript
   import {
     ticksToToneTime,
     toneTimeToTicks,
     ticksToSeconds,
     formatTicks
   } from '@utils/timeConversion';

   export function testTimeConversion() {
     console.log('=== Time Conversion Tests ===');

     const ppq = 480;
     const bpm = 120;

     // Test ticks to Tone time
     console.log('960 ticks -> ', ticksToToneTime(960, ppq)); // Should be "0:2:0" (2 beats)
     console.log('1920 ticks ->', ticksToToneTime(1920, ppq)); // Should be "1:0:0" (1 bar)

     // Test round-trip conversion
     const originalTicks = 1680;
     const toneTime = ticksToToneTime(originalTicks, ppq);
     const backToTicks = toneTimeToTicks(toneTime, ppq);
     console.log('Round-trip:', originalTicks, '->', toneTime, '->', backToTicks);

     // Test ticks to seconds
     const seconds = ticksToSeconds(480, ppq, bpm);
     console.log('480 ticks at 120 BPM =', seconds, 'seconds (should be 0.5)');

     // Test formatting
     console.log('Format 960 ticks:', formatTicks(960, ppq));
   }
   ```

**Acceptance Criteria:**
- ✅ All conversion functions implemented
- ✅ Round-trip conversions preserve values
- ✅ Tests pass

---

### Task 3.3: Implement MIDISequencer Class

**Steps:**

1. Create `src/engine/MIDISequencer.ts`:
   ```typescript
   import * as Tone from 'tone';
   import { OPLSynthesizer } from './OPLSynthesizer';
   import { Song, Pattern, Note } from '@types';
   import { ticksToToneTime, secondsToTicks } from '@utils/timeConversion';

   export class MIDISequencer {
     private transport: typeof Tone.Transport;
     private synthesizer: OPLSynthesizer;
     private scheduledEvents: Map<string, number> = new Map(); // Note ID -> Tone event ID
     private playheadCallbacks: Set<(position: number) => void> = new Set();
     private updateInterval: number | null = null;
     private ppq: number = 480;
     private bpm: number = 120;

     constructor(synthesizer: OPLSynthesizer) {
       this.synthesizer = synthesizer;
       this.transport = Tone.Transport;
     }

     /**
      * Initialize sequencer (must be called after user interaction)
      */
     async init(): Promise<void> {
       await Tone.start();
       console.log('MIDISequencer initialized');
     }

     /**
      * Load and schedule a song arrangement
      */
     loadArrangement(song: Song): void {
       console.log('Loading arrangement:', song.name);

       // Clear existing events
       this.clearSchedule();

       // Update tempo
       this.ppq = song.ppq;
       this.bpm = song.bpm;
       this.transport.bpm.value = song.bpm;

       // Schedule each pattern in arrangement
       song.arrangement.forEach(item => {
         const pattern = song.patterns.find(p => p.id === item.patternId);
         if (pattern) {
           this.schedulePattern(pattern, item.startTime);
         }
       });

       console.log(`Scheduled ${this.scheduledEvents.size} events`);
     }

     /**
      * Schedule a single pattern
      */
     schedulePattern(pattern: Pattern, startTime: number): void {
       console.log(`Scheduling pattern "${pattern.name}" at tick ${startTime}`);

       // Schedule all notes in all tracks
       pattern.tracks.forEach((track, trackIndex) => {
         if (track.muted) {
           console.log(`Skipping muted track: ${track.name}`);
           return;
         }

         track.notes.forEach(note => {
           const absoluteTime = startTime + note.time;
           const toneTime = ticksToToneTime(absoluteTime, this.ppq);

           // Schedule note on
           const eventId = this.transport.schedule((time) => {
             // Use track index as channel (for now)
             this.synthesizer.noteOn(
               trackIndex,
               note.pitch,
               note.velocity,
               note.instrument
             );

             // Schedule note off
             const noteOffTime = time + ticksToSeconds(note.duration, this.ppq, this.bpm);
             this.transport.schedule(() => {
               this.synthesizer.noteOff(trackIndex, note.pitch);
             }, noteOffTime);

           }, toneTime);

           this.scheduledEvents.set(note.id, eventId as number);
         });
       });
     }

     /**
      * Clear all scheduled events
      */
     clearSchedule(): void {
       console.log('Clearing schedule...');
       this.transport.cancel(); // Clear all scheduled events
       this.scheduledEvents.clear();
     }

     /**
      * Start playback
      */
     play(): void {
       console.log('Starting playback');
       this.transport.start();

       // Start playhead update loop
       this.startPlayheadUpdate();
     }

     /**
      * Pause playback
      */
     pause(): void {
       console.log('Pausing playback');
       this.transport.pause();
       this.stopPlayheadUpdate();
     }

     /**
      * Stop playback and return to start
      */
     stop(): void {
       console.log('Stopping playback');
       this.transport.stop();
       this.stopPlayheadUpdate();

       // Reset synthesizer
       this.synthesizer.reset();

       // Notify playhead update
       this.notifyPlayheadUpdate();
     }

     /**
      * Seek to position
      */
     seek(ticks: number): void {
       const seconds = ticksToSeconds(ticks, this.ppq, this.bpm);
       this.transport.seconds = seconds;
       this.notifyPlayheadUpdate();
     }

     /**
      * Get current position in ticks
      */
     getPosition(): number {
       const seconds = this.transport.seconds;
       return secondsToTicks(seconds, this.ppq, this.bpm);
     }

     /**
      * Set BPM
      */
     setBPM(bpm: number): void {
       this.bpm = bpm;
       this.transport.bpm.value = bpm;
       console.log('BPM set to', bpm);
     }

     /**
      * Register callback for playhead updates
      */
     onPlayhead(callback: (position: number) => void): void {
       this.playheadCallbacks.add(callback);
     }

     /**
      * Unregister playhead callback
      */
     offPlayhead(callback: (position: number) => void): void {
       this.playheadCallbacks.delete(callback);
     }

     /**
      * Start periodic playhead updates
      */
     private startPlayheadUpdate(): void {
       if (this.updateInterval !== null) return;

       // Update at ~30fps
       this.updateInterval = window.setInterval(() => {
         this.notifyPlayheadUpdate();
       }, 33);
     }

     /**
      * Stop playhead updates
      */
     private stopPlayheadUpdate(): void {
       if (this.updateInterval !== null) {
         clearInterval(this.updateInterval);
         this.updateInterval = null;
       }
     }

     /**
      * Notify all playhead callbacks
      */
     private notifyPlayheadUpdate(): void {
       const position = this.getPosition();
       this.playheadCallbacks.forEach(callback => callback(position));
     }
   }

   // Helper to convert ticks to seconds (needed for scheduling note off)
   function ticksToSeconds(ticks: number, ppq: number, bpm: number): number {
     const secondsPerBeat = 60 / bpm;
     const ticksPerBeat = ppq;
     return (ticks / ticksPerBeat) * secondsPerBeat;
   }
   ```

**Acceptance Criteria:**
- ✅ MIDISequencer class compiles
- ✅ Can schedule patterns
- ✅ Can control playback (play/pause/stop)
- ✅ Playhead position updates

---

### Task 3.4: Create Test Pattern Data

**Steps:**

1. Create `src/tests/testPatternData.ts`:
   ```typescript
   import { Song, Pattern, Track, Note } from '@types';
   import { v4 as uuidv4 } from 'uuid';

   /**
    * Create a simple test song with one pattern
    */
   export function createTestSong(): Song {
     // Create notes for C major scale
     const scaleNotes: Note[] = [
       { id: uuidv4(), time: 0, pitch: 60, duration: 480, velocity: 100, instrument: 0 },      // C
       { id: uuidv4(), time: 480, pitch: 62, duration: 480, velocity: 100, instrument: 0 },    // D
       { id: uuidv4(), time: 960, pitch: 64, duration: 480, velocity: 100, instrument: 0 },    // E
       { id: uuidv4(), time: 1440, pitch: 65, duration: 480, velocity: 100, instrument: 0 },   // F
       { id: uuidv4(), time: 1920, pitch: 67, duration: 480, velocity: 100, instrument: 0 },   // G
       { id: uuidv4(), time: 2400, pitch: 69, duration: 480, velocity: 100, instrument: 0 },   // A
       { id: uuidv4(), time: 2880, pitch: 71, duration: 480, velocity: 100, instrument: 0 },   // B
       { id: uuidv4(), time: 3360, pitch: 72, duration: 480, velocity: 100, instrument: 0 },   // C
     ];

     // Create bass notes
     const bassNotes: Note[] = [
       { id: uuidv4(), time: 0, pitch: 48, duration: 1920, velocity: 80, instrument: 1 },      // C
       { id: uuidv4(), time: 1920, pitch: 53, duration: 1920, velocity: 80, instrument: 1 },   // F
     ];

     // Create tracks
     const tracks: Track[] = [
       {
         id: uuidv4(),
         name: 'Melody',
         notes: scaleNotes,
         muted: false,
         solo: false,
         volume: 1.0,
         pan: 0.0,
         color: '#FF5733',
       },
       {
         id: uuidv4(),
         name: 'Bass',
         notes: bassNotes,
         muted: false,
         solo: false,
         volume: 0.8,
         pan: 0.0,
         color: '#3357FF',
       },
     ];

     // Create pattern
     const pattern: Pattern = {
       id: uuidv4(),
       name: 'Test Pattern',
       length: 3840, // 4 bars at 480 PPQ
       tracks,
       timeSignature: {
         numerator: 4,
         denominator: 4,
       },
     };

     // Create song
     const song: Song = {
       version: '1.0.0',
       name: 'Test Song',
       bpm: 120,
       ppq: 480,
       patterns: [pattern],
       arrangement: [
         { patternId: pattern.id, startTime: 0 },
       ],
       instrumentBank: {
         name: 'Default',
         patches: [], // Will be loaded later
       },
     };

     return song;
   }
   ```

2. Test the pattern:
   ```typescript
   import { createTestSong } from './testPatternData';

   export function validateTestSong() {
     const song = createTestSong();

     console.log('=== Test Song ===');
     console.log('Name:', song.name);
     console.log('BPM:', song.bpm);
     console.log('PPQ:', song.ppq);
     console.log('Patterns:', song.patterns.length);
     console.log('Arrangement items:', song.arrangement.length);

     song.patterns.forEach(pattern => {
       console.log(`\nPattern: ${pattern.name}`);
       console.log('Tracks:', pattern.tracks.length);

       pattern.tracks.forEach(track => {
         console.log(`  Track: ${track.name}, Notes: ${track.notes.length}`);
       });
     });
   }
   ```

**Acceptance Criteria:**
- ✅ Test song creates successfully
- ✅ Contains melody and bass tracks
- ✅ All note data valid

---

### Task 3.5: Test Pattern Playback

**Steps:**

1. Create comprehensive playback test:
   ```typescript
   import { AudioEngine } from '@engine/AudioEngine';
   import { MIDISequencer } from '@engine/MIDISequencer';
   import { createTestSong } from './testPatternData';

   export async function testPatternPlayback() {
     console.log('=== Testing Pattern Playback ===');

     // Initialize audio engine
     const engine = new AudioEngine();
     await engine.init();

     const synth = engine.getSynthesizer();

     // Initialize sequencer
     const sequencer = new MIDISequencer(synth);
     await sequencer.init();

     // Load test song
     const song = createTestSong();
     sequencer.loadArrangement(song);

     // Set up playhead monitoring
     sequencer.onPlayhead((position) => {
       console.log('Playhead:', position, 'ticks');
     });

     return {
       engine,
       sequencer,
       song,
       play: () => {
         console.log('Starting playback...');
         engine.start();
         sequencer.play();
       },
       pause: () => {
         sequencer.pause();
       },
       stop: () => {
         sequencer.stop();
         engine.stop();
       }
     };
   }
   ```

2. Add playback controls to App.tsx:
   ```typescript
   import { useState, useEffect } from 'react';
   import { testPatternPlayback } from './tests/testPatternPlayback';

   function App() {
     const [playback, setPlayback] = useState<any>(null);

     useEffect(() => {
       testPatternPlayback().then(pb => {
         setPlayback(pb);
       });
     }, []);

     return (
       <div className="app">
         <header className="app-header">
           <h1>WebOrchestra - Pattern Test</h1>
           {playback && (
             <div>
               <button onClick={playback.play}>▶ Play</button>
               <button onClick={playback.pause}>⏸ Pause</button>
               <button onClick={playback.stop}>⏹ Stop</button>
             </div>
           )}
         </header>
         {/* ... rest of app */}
       </div>
     );
   }
   ```

3. Test in browser:
   - Click Play - should hear scale and bass
   - Click Pause - should pause
   - Click Play again - should resume
   - Click Stop - should stop and reset

**Expected Results:**
- Hear C major scale (melody)
- Hear bass notes (C and F)
- Playback controls work correctly
- Console shows playhead position updates

**Troubleshooting:**
- If no audio: Check OPL register writes, check synth initialization
- If timing is off: Check time conversion functions
- If notes overlap: Check note off scheduling

**Acceptance Criteria:**
- ✅ Can play test pattern
- ✅ Hears both melody and bass
- ✅ Timing is correct (120 BPM)
- ✅ Playback controls work
- ✅ Playhead updates during playback

---

### Phase 3 Deliverables

- ✅ MIDISequencer class implemented
- ✅ Time conversion utilities working
- ✅ Can schedule and play patterns
- ✅ Playback controls functional
- ✅ Playhead position tracking
- ✅ Multi-track playback working

**Critical Success Criteria:**
- Must be able to play multi-track patterns with correct timing
- Playback controls must work reliably

---

## Phase 4: Instrument System

### Estimated Time: 4-6 days

### Task 4.1: Research OPL3 Register Programming

**Objective:** Understand how to program OPL3 registers for different instruments.

**Topics to Research:**

1. **OPL3 Register Map**
   - Resources:
     - http://shipbrook.net/jeff/sb.html (AdLib programming)
     - https://www.fit.vutbr.cz/~arnost/opl/opl3.html (Register reference)
     - https://moddingwiki.shikadi.net/wiki/OPL_chip

2. **Operator Programming**
   - Each 2-op voice has 2 operators (modulator and carrier)
   - Registers per operator:
     - 0x20-0x35: AM/VIB/EG/KSR/MULT
     - 0x40-0x55: KSL/TL (Key Scale Level / Total Level = volume)
     - 0x60-0x75: AR/DR (Attack Rate / Decay Rate)
     - 0x80-0x95: SL/RR (Sustain Level / Release Rate)
     - 0xE0-0xF5: WS (Waveform Select)

3. **Channel Programming**
   - Registers per channel:
     - 0xA0-0xA8: F-Number low 8 bits
     - 0xB0-0xB8: Key-On / Block / F-Number high 2 bits
     - 0xC0-0xC8: Feedback / Connection algorithm

4. **Register Offset Calculation**
   - 2-op channels 0-8: Base offset 0x000
   - 2-op channels 9-17: Base offset 0x100 (OPL3 second bank)
   - Operator offsets: [0x00, 0x03, 0x08, 0x0B, ...] (irregular pattern!)

5. **4-Operator Mode**
   - Enabled via register 0x104
   - Pairs channels (0+3, 1+4, 2+5, 9+12, 10+13, 11+14)
   - More complex register programming

**Action Items:**
- [ ] Create register offset lookup tables
- [ ] Document register bit layouts
- [ ] Create utility functions for register writes
- [ ] Test with known good instrument patches

**Deliverable:** Technical document on OPL3 register programming with code examples.

---

### Task 4.2: Create OPL Register Utility

**Steps:**

1. Create `src/utils/oplRegisterMap.ts`:
   ```typescript
   /**
    * OPL3 Register Utilities
    * Based on YMF262 (OPL3) documentation
    */

   /**
    * Operator offsets for each channel (irregular pattern!)
    * Channel 0: operators at offset 0x00 and 0x03
    * Channel 1: operators at offset 0x01 and 0x04
    * etc.
    */
   export const OPERATOR_OFFSETS: number[][] = [
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

   /**
    * Register base addresses
    */
   export const REG_BASE = {
     // Operator registers
     OP_MODE: 0x20,        // AM/VIB/EG/KSR/MULT
     OP_LEVEL: 0x40,       // KSL/TL (volume)
     OP_ATTACK: 0x60,      // AR/DR
     OP_SUSTAIN: 0x80,     // SL/RR
     OP_WAVEFORM: 0xE0,    // WS

     // Channel registers
     CH_FNUM_LOW: 0xA0,    // F-Number low 8 bits
     CH_KEYON_BLOCK: 0xB0, // Key-On/Block/F-Number high
     CH_FEEDBACK: 0xC0,    // Feedback/Connection
   };

   /**
    * Get register address for operator parameter
    */
   export function getOperatorReg(
     channel: number,
     operatorNum: number,
     regBase: number
   ): { reg: number; regSet: number } {
     const channelIndex = channel % 9;
     const regSet = channel < 9 ? 0 : 1; // First or second register set

     const operatorOffset = OPERATOR_OFFSETS[channelIndex][operatorNum];
     const reg = regBase + operatorOffset;

     return { reg, regSet };
   }

   /**
    * Get register address for channel parameter
    */
   export function getChannelReg(
     channel: number,
     regBase: number
   ): { reg: number; regSet: number } {
     const channelIndex = channel % 9;
     const regSet = channel < 9 ? 0 : 1;

     const reg = regBase + channelIndex;

     return { reg, regSet };
   }

   /**
    * Encode operator mode byte (register 0x20-0x35)
    */
   export function encodeOperatorMode(params: {
     tremolo: boolean;
     vibrato: boolean;
     sustainingSound: boolean;
     keyScaleRate: boolean;
     frequencyMultiplier: number; // 0-15
   }): number {
     let byte = 0;
     if (params.tremolo) byte |= 0x80;
     if (params.vibrato) byte |= 0x40;
     if (params.sustainingSound) byte |= 0x20;
     if (params.keyScaleRate) byte |= 0x10;
     byte |= params.frequencyMultiplier & 0x0F;
     return byte;
   }

   /**
    * Encode operator level byte (register 0x40-0x55)
    */
   export function encodeOperatorLevel(params: {
     keyScaleLevel: number; // 0-3
     outputLevel: number;   // 0-63
   }): number {
     return ((params.keyScaleLevel & 0x03) << 6) | (params.outputLevel & 0x3F);
   }

   /**
    * Encode attack/decay byte (register 0x60-0x75)
    */
   export function encodeAttackDecay(params: {
     attackRate: number;  // 0-15
     decayRate: number;   // 0-15
   }): number {
     return ((params.attackRate & 0x0F) << 4) | (params.decayRate & 0x0F);
   }

   /**
    * Encode sustain/release byte (register 0x80-0x95)
    */
   export function encodeSustainRelease(params: {
     sustainLevel: number;  // 0-15
     releaseRate: number;   // 0-15
   }): number {
     return ((params.sustainLevel & 0x0F) << 4) | (params.releaseRate & 0x0F);
   }

   /**
    * Encode feedback/connection byte (register 0xC0-0xC8)
    */
   export function encodeFeedbackConnection(params: {
     feedbackModulation: number; // 0-7
     connection: number;         // 0 = FM, 1 = Additive
   }): number {
     return ((params.feedbackModulation & 0x07) << 1) | (params.connection & 0x01);
   }
   ```

2. Create test for register utilities:
   ```typescript
   import {
     getOperatorReg,
     getChannelReg,
     encodeOperatorMode,
     REG_BASE
   } from '@utils/oplRegisterMap';

   export function testRegisterMapping() {
     console.log('=== OPL Register Mapping Tests ===');

     // Test operator register calculation
     const op0 = getOperatorReg(0, 0, REG_BASE.OP_MODE);
     console.log('Channel 0, Operator 0, Mode reg:',
       '0x' + op0.reg.toString(16), 'Set:', op0.regSet);
     // Should be 0x20, set 0

     const op1 = getOperatorReg(0, 1, REG_BASE.OP_MODE);
     console.log('Channel 0, Operator 1, Mode reg:',
       '0x' + op1.reg.toString(16), 'Set:', op1.regSet);
     // Should be 0x23, set 0

     // Test channel register calculation
     const ch0 = getChannelReg(0, REG_BASE.CH_FNUM_LOW);
     console.log('Channel 0, F-Num reg:',
       '0x' + ch0.reg.toString(16), 'Set:', ch0.regSet);
     // Should be 0xA0, set 0

     // Test encoding
     const modeBytes = encodeOperatorMode({
       tremolo: false,
       vibrato: false,
       sustainingSound: true,
       keyScaleRate: false,
       frequencyMultiplier: 1,
     });
     console.log('Encoded mode byte:', '0x' + modeBytes.toString(16));
     // Should be 0x21
   }
   ```

**Acceptance Criteria:**
- ✅ Register address calculations correct
- ✅ Encoding functions produce correct bytes
- ✅ Tests pass

---

### Task 4.3: Obtain GENMIDI Instrument Data

**Options:**

**Option A: Extract from Doom WAD**
1. Download freedoom.wad or doom.wad
2. Extract GENMIDI lump
3. Parse binary format to JSON

**Option B: Use Existing Conversion**
1. Search for existing GENMIDI JSON conversions
2. Verify format compatibility

**Option C: Create Minimal Test Bank**
1. Manually create 5-10 basic instruments
2. Test with those first
3. Expand later

**Recommended: Option C for prototype, then Option B**

**Steps:**

1. Create `public/instruments/genmidi.json`:
   ```json
   {
     "name": "GENMIDI",
     "version": "1.0",
     "patches": [
       {
         "id": 0,
         "name": "Acoustic Grand Piano",
         "mode": "2op",
         "connection": 0,
         "feedbackModulation": 0,
         "operators": [
           {
             "attackRate": 15,
             "decayRate": 8,
             "sustainLevel": 1,
             "releaseRate": 5,
             "frequencyMultiplier": 1,
             "keyScaleLevel": 0,
             "outputLevel": 20,
             "amVibrato": false,
             "tremolo": false,
             "sustainingSound": true,
             "keyScaleRate": false,
             "waveform": 0
           },
           {
             "attackRate": 15,
             "decayRate": 8,
             "sustainLevel": 1,
             "releaseRate": 5,
             "frequencyMultiplier": 1,
             "keyScaleLevel": 0,
             "outputLevel": 0,
             "amVibrato": false,
             "tremolo": false,
             "sustainingSound": true,
             "keyScaleRate": false,
             "waveform": 0
           }
         ]
       }
     ]
   }
   ```

2. Create utility to load instrument bank:
   ```typescript
   import { InstrumentBank } from '@types';

   export async function loadInstrumentBank(url: string): Promise<InstrumentBank> {
     const response = await fetch(url);
     if (!response.ok) {
       throw new Error(`Failed to load instrument bank: ${response.statusText}`);
     }

     const data = await response.json();
     return data as InstrumentBank;
   }
   ```

**Research Task:**
- [ ] Find reliable source for GENMIDI data in JSON format
- [ ] Verify patch structure matches our TypeScript types
- [ ] Document any differences between formats

**Acceptance Criteria:**
- ✅ Can load instrument bank JSON
- ✅ At least 10 instruments available
- ✅ Patch data validates against TypeScript types

---

### Task 4.4: Integrate Instruments with OPL Synthesizer

**Steps:**

1. Update `OPLSynthesizer.ts` to use patches:
   ```typescript
   /**
    * Load instrument patch and program OPL registers
    */
   private programPatch(channel: number, patch: OPLPatch): void {
     if (!this.opl) return;

     const is4Op = patch.mode === '4op';
     const numOperators = is4Op ? 4 : 2;

     // Program each operator
     for (let opNum = 0; opNum < numOperators; opNum++) {
       const operator = patch.operators[opNum];
       this.programOperator(channel, opNum, operator);
     }

     // Program channel (feedback/connection)
     this.programChannel(channel, patch);
   }

   /**
    * Program operator registers
    */
   private programOperator(channel: number, opNum: number, op: OPLOperator): void {
     if (!this.opl) return;

     // Get register addresses
     const modeReg = getOperatorReg(channel, opNum, REG_BASE.OP_MODE);
     const levelReg = getOperatorReg(channel, opNum, REG_BASE.OP_LEVEL);
     const attackReg = getOperatorReg(channel, opNum, REG_BASE.OP_ATTACK);
     const sustainReg = getOperatorReg(channel, opNum, REG_BASE.OP_SUSTAIN);
     const waveReg = getOperatorReg(channel, opNum, REG_BASE.OP_WAVEFORM);

     // Encode values
     const modeByte = encodeOperatorMode({
       tremolo: op.tremolo,
       vibrato: op.amVibrato,
       sustainingSound: op.sustainingSound,
       keyScaleRate: op.keyScaleRate,
       frequencyMultiplier: op.frequencyMultiplier,
     });

     const levelByte = encodeOperatorLevel({
       keyScaleLevel: op.keyScaleLevel,
       outputLevel: op.outputLevel,
     });

     const attackByte = encodeAttackDecay({
       attackRate: op.attackRate,
       decayRate: op.decayRate,
     });

     const sustainByte = encodeSustainRelease({
       sustainLevel: op.sustainLevel,
       releaseRate: op.releaseRate,
     });

     // Write registers
     const regOffset = modeReg.regSet === 1 ? 0x100 : 0x000;

     this.opl.write(regOffset + modeReg.reg, modeByte);
     this.opl.write(regOffset + levelReg.reg, levelByte);
     this.opl.write(regOffset + attackReg.reg, attackByte);
     this.opl.write(regOffset + sustainReg.reg, sustainByte);
     this.opl.write(regOffset + waveReg.reg, op.waveform & 0x07);
   }

   /**
    * Program channel registers
    */
   private programChannel(channel: number, patch: OPLPatch): void {
     if (!this.opl) return;

     const fbReg = getChannelReg(channel, REG_BASE.CH_FEEDBACK);
     const regOffset = fbReg.regSet === 1 ? 0x100 : 0x000;

     const fbByte = encodeFeedbackConnection({
       feedbackModulation: patch.feedbackModulation,
       connection: patch.connection,
     });

     this.opl.write(regOffset + fbReg.reg, fbByte);
   }

   /**
    * Update noteOn to use loaded patch
    */
   noteOn(channel: number, note: number, velocity: number, patchId: number): void {
     if (!this.opl) return;

     // Get patch
     const patch = this.patches.get(patchId);
     if (!patch) {
       console.warn(`Patch ${patchId} not loaded`);
       return;
     }

     // Allocate voice
     const voice = this.allocateVoice();

     // Program patch registers
     this.programPatch(voice, patch);

     // Get frequency
     const { fnum, block } = midiNoteToOPLFrequency(note);

     // Write frequency registers
     const fnumReg = getChannelReg(voice, REG_BASE.CH_FNUM_LOW);
     const keyonReg = getChannelReg(voice, REG_BASE.CH_KEYON_BLOCK);
     const regOffset = fnumReg.regSet === 1 ? 0x100 : 0x000;

     // F-Number low byte
     this.opl.write(regOffset + fnumReg.reg, fnum & 0xFF);

     // Key-On + Block + F-Number high
     const keyonByte = 0x20 | ((block & 0x07) << 2) | ((fnum >> 8) & 0x03);
     this.opl.write(regOffset + keyonReg.reg, keyonByte);

     // Update voice state
     this.voices[voice].active = true;
     this.voices[voice].note = note;
     this.voices[voice].channel = channel;
     this.voices[voice].patchId = patchId;
     this.voices[voice].startTime = Date.now();

     console.log(`Note ON: voice=${voice}, note=${note}, patch=${patchId}`);
   }
   ```

**Acceptance Criteria:**
- ✅ Patches load into synthesizer
- ✅ Register programming uses patch data
- ✅ Different instruments produce different sounds

---

### Task 4.5: Implement InstrumentManager

**Steps:**

1. Create `src/engine/InstrumentManager.ts`:
   ```typescript
   import { InstrumentBank, OPLPatch } from '@types';

   export class InstrumentManager {
     private banks: Map<string, InstrumentBank> = new Map();
     private defaultBank: InstrumentBank | null = null;

     /**
      * Load default GENMIDI bank
      */
     async loadDefaultBank(): Promise<InstrumentBank> {
       console.log('Loading default instrument bank...');

       const response = await fetch('/instruments/genmidi.json');
       if (!response.ok) {
         throw new Error(`Failed to load instruments: ${response.statusText}`);
       }

       const bank: InstrumentBank = await response.json();

       this.banks.set(bank.name, bank);
       this.defaultBank = bank;

       console.log(`Loaded ${bank.patches.length} instruments`);

       return bank;
     }

     /**
      * Get patch by ID
      */
     getPatch(bankName: string, patchId: number): OPLPatch | null {
       const bank = this.banks.get(bankName);
       if (!bank) {
         console.warn(`Bank "${bankName}" not found`);
         return null;
       }

       const patch = bank.patches.find(p => p.id === patchId);
       if (!patch) {
         console.warn(`Patch ${patchId} not found in bank "${bankName}"`);
         return null;
       }

       return patch;
     }

     /**
      * Get patch from default bank
      */
     getDefaultPatch(patchId: number): OPLPatch | null {
       if (!this.defaultBank) {
         console.warn('No default bank loaded');
         return null;
       }

       return this.getPatch(this.defaultBank.name, patchId);
     }

     /**
      * List all available banks
      */
     getBanks(): InstrumentBank[] {
       return Array.from(this.banks.values());
     }

     /**
      * Get default bank
      */
     getDefaultBank(): InstrumentBank | null {
       return this.defaultBank;
     }
   }
   ```

2. Integrate with AudioEngine:
   ```typescript
   // In AudioEngine.ts
   import { InstrumentManager } from './InstrumentManager';

   export class AudioEngine {
     // Add field
     private instrumentManager: InstrumentManager;

     constructor() {
       this.synthesizer = new OPLSynthesizer();
       this.instrumentManager = new InstrumentManager();
     }

     async init(): Promise<void> {
       // ... existing init code ...

       // Load instruments
       const bank = await this.instrumentManager.loadDefaultBank();

       // Load all patches into synthesizer
       bank.patches.forEach(patch => {
         this.synthesizer.loadPatch(patch.id, patch);
       });

       // ... rest of init ...
     }

     getInstrumentManager(): InstrumentManager {
       return this.instrumentManager;
     }
   }
   ```

**Acceptance Criteria:**
- ✅ InstrumentManager loads bank
- ✅ Can retrieve patches by ID
- ✅ Patches loaded into synthesizer on init

---

### Task 4.6: Test Different Instruments

**Steps:**

1. Create instrument test:
   ```typescript
   import { AudioEngine } from '@engine/AudioEngine';

   export async function testInstruments() {
     console.log('=== Testing Instruments ===');

     const engine = new AudioEngine();
     await engine.init();

     const synth = engine.getSynthesizer();
     const instrMgr = engine.getInstrumentManager();
     const bank = instrMgr.getDefaultBank();

     if (!bank) {
       console.error('No instrument bank loaded');
       return;
     }

     console.log(`Testing ${bank.patches.length} instruments`);

     return {
       engine,
       playInstrument: (patchId: number, note: number = 60) => {
         const patch = instrMgr.getDefaultPatch(patchId);
         if (!patch) {
           console.error(`Patch ${patchId} not found`);
           return;
         }

         console.log(`Playing patch ${patchId}: ${patch.name}`);

         engine.start();
         synth.noteOn(0, note, 100, patchId);

         setTimeout(() => {
           synth.noteOff(0, note);
         }, 1000);
       },
       playScale: (patchId: number) => {
         const notes = [60, 62, 64, 65, 67, 69, 71, 72]; // C major scale

         engine.start();

         notes.forEach((note, i) => {
           setTimeout(() => {
             synth.noteOn(0, note, 100, patchId);
             setTimeout(() => {
               synth.noteOff(0, note);
             }, 400);
           }, i * 500);
         });
       }
     };
   }
   ```

2. Add UI for testing:
   ```typescript
   // In App.tsx
   const [instrTest, setInstrTest] = useState<any>(null);

   useEffect(() => {
     testInstruments().then(test => {
       setInstrTest(test);
     });
   }, []);

   // In render:
   {instrTest && (
     <div>
       <h3>Instrument Test</h3>
       <button onClick={() => instrTest.playInstrument(0)}>
         Play Instrument 0
       </button>
       <button onClick={() => instrTest.playScale(0)}>
         Play Scale
       </button>
       {/* Add more instruments */}
     </div>
   )}
   ```

3. Test each instrument:
   - Should sound different
   - No pops or clicks
   - Attack/decay envelopes audible

**Acceptance Criteria:**
- ✅ Different instruments produce different timbres
- ✅ ADSR envelopes work correctly
- ✅ No audio artifacts

---

### Phase 4 Deliverables

- ✅ OPL register utilities implemented
- ✅ Instrument bank loaded (GENMIDI or minimal test)
- ✅ InstrumentManager class working
- ✅ Patches integrated with synthesizer
- ✅ Can hear different instrument sounds
- ✅ All 128 GM instruments available (or subset for prototype)

**Critical Success Criteria:**
- Must be able to load and use different OPL patches
- Different patches must produce noticeably different sounds

---

## Phase 5-9: UI Implementation

*Note: The remaining phases (UI components, arrangement, export, polish) follow similar detailed task breakdowns. Due to length constraints, I'm providing a structured outline. Each phase would have 5-7 detailed tasks similar to phases 1-4.*

### Phase 5: UI - Pattern Editor (Piano Roll)
- Task 5.1: Research react-piano-roll integration
- Task 5.2: Implement note data conversion
- Task 5.3: Create PianoRollEditor component
- Task 5.4: Implement note editing (add/delete/move/resize)
- Task 5.5: Integrate with app state
- Task 5.6: Test editing and playback synchronization

### Phase 6: UI - Tracker Editor
- Task 6.1: Design tracker grid layout
- Task 6.2: Implement TrackerEditor component
- Task 6.3: Add keyboard navigation
- Task 6.4: Implement cell editing
- Task 6.5: Add mode toggle
- Task 6.6: Test both editor modes

### Phase 7: Arrangement System
- Task 7.1: Research drag-and-drop library (@dnd-kit)
- Task 7.2: Implement Timeline component
- Task 7.3: Add pattern sequencing UI
- Task 7.4: Implement drag-and-drop
- Task 7.5: Integrate with sequencer
- Task 7.6: Test arrangement playback

### Phase 8: Export & Serialization
- Task 8.1: Research WAV encoding (wavefile library)
- Task 8.2: Implement WAVExporter class
- Task 8.3: Create export UI with progress
- Task 8.4: Implement project save (JSON)
- Task 8.5: Implement project load
- Task 8.6: Test export and load/save

### Phase 9: Polish & Testing
- Task 9.1: UI/UX improvements
- Task 9.2: Error handling
- Task 9.3: Performance optimization
- Task 9.4: Cross-browser testing
- Task 9.5: Documentation
- Task 9.6: Bug fixes

---

## Integration Testing

### Full System Test Plan

1. **Audio Pipeline Test**
   - Load project → Play → Hear correct audio
   - Multiple tracks with different instruments
   - Verify timing accuracy

2. **Editing Test**
   - Create pattern in piano roll
   - Switch to tracker, verify notes appear
   - Edit in tracker, verify in piano roll
   - Play edited pattern

3. **Arrangement Test**
   - Create multiple patterns
   - Arrange in timeline
   - Play full arrangement
   - Verify pattern transitions

4. **Export Test**
   - Create simple song
   - Export to WAV
   - Play WAV file in media player
   - Verify audio matches playback

5. **Persistence Test**
   - Create project
   - Save to JSON
   - Reload page
   - Load JSON
   - Verify all data preserved

---

## Deployment

### Build for Production

```bash
npm run build
```

### Deployment Options

1. **Static Hosting (Recommended)**
   - Netlify
   - Vercel
   - GitHub Pages
   - Cloudflare Pages

2. **Requirements**
   - Must serve HTTPS (for Web Audio API)
   - Must serve correct MIME types for WASM
   - SPA routing if using React Router

3. **Configuration**
   - Add `_redirects` or `netlify.toml` for SPA
   - Set COOP/COEP headers if using SharedArrayBuffer (future)

---

## Appendix: Research Resources

### Libraries Documentation
- Tone.js: https://tonejs.github.io/docs/
- @malvineous/opl: https://github.com/malvineous/opl3-wasm
- react-piano-roll: https://github.com/unkleho/react-piano-roll
- @dnd-kit: https://docs.dndkit.com/

### OPL3 Technical Resources
- Yamaha YMF262 Datasheet
- AdLib Programming by Jeffrey S. Lee
- ModdingWiki OPL formats
- DOSBox OPL emulator source code

### Web Audio Resources
- MDN Web Audio API Guide
- "A Tale of Two Clocks" - Chris Wilson
- AudioWorklet examples

---

## Success Metrics

**Prototype is successful if:**
- ✅ Can create multi-track patterns
- ✅ Can hear OPL3 synthesis in browser
- ✅ Can arrange patterns into songs
- ✅ Can export to WAV
- ✅ Can save/load projects
- ✅ Works in Chrome, Firefox, Safari
- ✅ No major audio glitches
- ✅ Timing is accurate

---

## Risk Management

### High-Risk Items

1. **AudioWorklet Integration**
   - **Risk:** May be complex with Vite/WASM
   - **Mitigation:** Use ScriptProcessorNode fallback
   - **Status:** Medium priority (can defer)

2. **OPL3 Register Programming**
   - **Risk:** Incorrect register writes = no sound
   - **Mitigation:** Extensive testing, reference implementations
   - **Status:** Critical path

3. **Timing Accuracy**
   - **Risk:** Poor timing ruins musical experience
   - **Mitigation:** Use Tone.js Transport (proven solution)
   - **Status:** Medium risk

4. **Browser Compatibility**
   - **Risk:** Web Audio support varies
   - **Mitigation:** Test early and often, document requirements
   - **Status:** Low risk (modern browsers supported)

---

*End of Implementation Plan*
