# WebOrchestra - Development Guide

**Last Updated:** 2025-01-06

---

## Table of Contents

1. [Development Setup](#development-setup)
2. [Project Structure](#project-structure)
3. [Adding Features](#adding-features)
4. [Testing](#testing)
5. [Building for Production](#building-for-production)
6. [Common Tasks](#common-tasks)
7. [Troubleshooting](#troubleshooting)

---

## Development Setup

### Prerequisites

- **Node.js** 18+ (recommended: 20+)
- **npm** 9+
- Modern browser (Chrome, Firefox, Edge)

### Installation

```bash
cd minimal-prototype
npm install
```

### Start Dev Server

```bash
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173)

**Features:**
- Hot module replacement (HMR)
- Fast refresh for React components
- TypeScript type checking
- Source maps for debugging

### Project Scripts

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

---

## Project Structure

```
minimal-prototype/
├── public/               # Static assets (served as-is)
│   ├── instruments/      # Instrument banks (JSON)
│   ├── patterns/         # Example patterns (JSON)
│   └── opl-worklet-processor.js  # AudioWorklet (must be in public/)
│
├── src/
│   ├── components/       # React UI components
│   │   ├── Tracker.tsx   # Main tracker component
│   │   ├── TrackerGrid.tsx
│   │   ├── InstrumentEditor.tsx
│   │   └── ...
│   │
│   ├── constants/        # Constants and lookup tables
│   │   └── midiToOPL.ts
│   │
│   ├── data/            # Default data
│   │   └── defaultPatches.ts
│   │
│   ├── types/           # TypeScript type definitions
│   │   ├── OPLPatch.ts
│   │   ├── PatternFile.ts
│   │   └── opl3.d.ts
│   │
│   ├── utils/           # Utility functions
│   │   ├── noteConversion.ts
│   │   ├── patternValidation.ts
│   │   ├── ChannelManager.ts
│   │   └── ...
│   │
│   ├── SimpleSynth.ts   # Audio engine
│   ├── SimplePlayer.ts  # Pattern playback
│   ├── App.tsx          # Main React app
│   ├── main.tsx         # Entry point
│   └── [CSS files]
│
├── scripts/             # Build/utility scripts
│   └── convertDMXOPL.js
│
├── package.json         # Dependencies
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript config
└── eslint.config.js     # ESLint config
```

---

## Adding Features

### Adding a New Component

1. **Create component file:**

```typescript
// src/components/MyComponent.tsx
import { useState } from 'react';
import './MyComponent.css';

export interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  const [count, setCount] = useState(0);

  return (
    <div className="my-component">
      <h2>{title}</h2>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={onAction}>Action</button>
    </div>
  );
}
```

2. **Create CSS file:**

```css
/* src/components/MyComponent.css */
.my-component {
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.my-component h2 {
  margin-top: 0;
}
```

3. **Import in parent:**

```typescript
// src/App.tsx
import { MyComponent } from './components/MyComponent';

function App() {
  return (
    <MyComponent
      title="My Feature"
      onAction={() => console.log('Action clicked')}
    />
  );
}
```

### Adding a New Utility Function

1. **Create utility file:**

```typescript
// src/utils/myUtility.ts

/**
 * Convert tempo to milliseconds per beat
 * @param bpm Beats per minute
 * @returns Milliseconds per beat
 */
export function bpmToMs(bpm: number): number {
  return (60 / bpm) * 1000;
}

/**
 * Clamp value to range
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
```

2. **Add tests:**

```typescript
// src/utils/myUtility.test.ts
import { bpmToMs, clamp } from './myUtility';

console.log('=== Testing myUtility ===');

// Test bpmToMs
console.assert(bpmToMs(120) === 500, 'bpmToMs(120) should be 500ms');
console.assert(bpmToMs(60) === 1000, 'bpmToMs(60) should be 1000ms');

// Test clamp
console.assert(clamp(5, 0, 10) === 5, 'clamp(5, 0, 10) should be 5');
console.assert(clamp(-5, 0, 10) === 0, 'clamp(-5, 0, 10) should be 0');
console.assert(clamp(15, 0, 10) === 10, 'clamp(15, 0, 10) should be 10');

console.log('✅ All tests passed');
```

3. **Import and use:**

```typescript
import { bpmToMs } from './utils/myUtility';

const interval = bpmToMs(120); // 500ms
```

### Adding a New Pattern

1. **Create pattern JSON:**

```json
// public/patterns/my-melody.json
{
  "name": "My Melody",
  "description": "A simple melody",
  "author": "Your Name",
  "bpm": 120,
  "stepsPerBeat": 4,
  "rows": [
    { "0": "C-4" },
    { "0": "E-4" },
    { "0": "G-4" },
    { "0": "C-5" },
    { "0": "G-4" },
    { "0": "E-4" },
    { "0": "C-4" },
    { "0": "---" }
  ]
}
```

2. **Add to catalog:**

```json
// public/patterns/catalog.json
{
  "patterns": [
    {
      "id": "my-melody",
      "name": "My Melody",
      "description": "A simple melody",
      "file": "my-melody.json"
    }
  ]
}
```

3. **Load in UI:**
The pattern will automatically appear in the "Load Pattern" dropdown.

---

## Testing

### Unit Tests

Currently, unit tests are run in the browser console:

```typescript
// src/utils/noteConversion.test.ts
export function testNoteConversion() {
  console.log('=== Testing Note Conversion ===');

  // Test noteNameToMIDI
  console.assert(noteNameToMIDI('C-4') === 60, 'C-4 should be 60');
  console.assert(noteNameToMIDI('A-4') === 69, 'A-4 should be 69');

  // Test midiToNoteName
  console.assert(midiToNoteName(60) === 'C-4', '60 should be C-4');

  console.log('✅ All tests passed');
}
```

**Run tests:**
1. Start dev server: `npm run dev`
2. Open browser console
3. Tests run automatically on page load

### Manual Testing

**Audio Engine:**
1. Open dev server
2. Use test components:
   - `OPL3MigrationTest` - Raw OPL3 tests
   - `PatchTest` - Instrument testing
   - `PianoKeyboardTest` - Interactive keyboard

**Tracker:**
1. Load example pattern
2. Click Play
3. Verify:
   - Audio plays correctly
   - Current row highlights
   - Looping works
   - BPM changes take effect

**Instrument Editor:**
1. Select instrument
2. Click Edit
3. Adjust sliders
4. Click Test Note
5. Verify audio changes

### Browser Testing

**Recommended:** Chrome/Edge (best AudioWorklet support)

**Also test:**
- Firefox (good compatibility)
- Safari (may have issues)

**Check:**
- Console for errors
- Network tab for failed loads
- AudioContext state

---

## Building for Production

### Build Command

```bash
npm run build
```

**Output:** `dist/` directory

**Contents:**
```
dist/
├── index.html               # Main HTML
├── assets/
│   ├── index-[hash].js      # Bundled JavaScript (~300KB)
│   └── index-[hash].css     # Bundled CSS (~4KB)
├── instruments/             # Copied from public/
├── patterns/                # Copied from public/
└── node_modules/opl3/...    # OPL3 library
```

### Preview Build

```bash
npm run preview
```

Opens production build at [http://localhost:4173](http://localhost:4173)

### Deploy

**Static hosting (recommended):**
- Netlify
- Vercel
- GitHub Pages
- Cloudflare Pages

**Requirements:**
- Serve `dist/` directory as static files
- Must support client-side routing (for Wouter)
- HTTPS recommended (AudioContext requires user interaction)

**Example: Netlify**
```bash
npm run build
netlify deploy --prod --dir=dist
```

---

## Common Tasks

### Add a New OPL Register

1. **Find register in OPL3 documentation**
2. **Add to SimpleSynth:**

```typescript
// src/SimpleSynth.ts
writeCustomRegister(value: number) {
  this.writeOPL(0x???, value);
}
```

3. **Test in OPL3MigrationTest component**

### Modify Pattern Grid Size

```typescript
// src/components/Tracker.tsx
const [numRows, setNumRows] = useState(32); // Change from 16
const [numTracks, setNumTracks] = useState(8); // Change from 4
```

### Add New Waveform

1. **Add to waveform list:**

```typescript
// src/components/InstrumentEditor.tsx
const waveforms = [
  { value: 0, label: 'Sine' },
  { value: 1, label: 'Half-sine' },
  { value: 2, label: 'Abs-sine' },
  { value: 3, label: 'Quarter-sine' },
  { value: 4, label: 'My New Waveform' }, // Add here
];
```

2. **OPL3 will handle automatically**

### Debug Audio Issues

```typescript
// src/SimpleSynth.ts

// Add logging to noteOn
noteOn(channel: number, midiNote: number) {
  console.log('[SimpleSynth] noteOn:', { channel, midiNote });
  // ... rest of function
}

// Add logging to AudioWorklet
// public/opl-worklet-processor.js
chipWrite(register, value) {
  console.log('[Worklet] Write:', register.toString(16), value.toString(16));
  this.chip.write(array, address, value);
}
```

### Profile Performance

```typescript
// In SimpleSynth.ts
async init() {
  console.time('SimpleSynth.init');
  // ... initialization
  console.timeEnd('SimpleSynth.init');
}

// In SimplePlayer.ts
private playRow() {
  console.time('playRow');
  // ... process row
  console.timeEnd('playRow');
}
```

---

## Troubleshooting

### No Audio Output

**Check:**
1. AudioContext state: `audioContext.state === 'running'`
2. User interaction: Click to resume AudioContext
3. Console errors: Look for OPL3 load failures
4. Browser compatibility: Try Chrome

**Fix:**
```typescript
// Ensure AudioContext is resumed
await synth.resumeAudio();
```

### Pattern Not Playing

**Check:**
1. Pattern loaded: `player.loadPattern()` called
2. Pattern format: Valid TrackerPattern structure
3. Note conversion: Notes are valid ("C-4", not "c4")

**Debug:**
```typescript
console.log('Pattern:', player.pattern);
console.log('Is playing:', player.playing());
console.log('Current row:', player.getCurrentRow());
```

### TypeScript Errors

**Common issues:**
1. Missing type imports: Use `import type { ... }`
2. Unused variables: Rename to `_variable` or remove
3. Null checks: Add `if (!synth) return;`

**Fix:**
```bash
npm run lint
# Review errors
# Fix issues
```

### Build Failures

**Check:**
1. TypeScript errors: `npx tsc --noEmit`
2. Missing files: Verify all imports exist
3. Node version: Use Node 18+

**Clean build:**
```bash
rm -rf node_modules dist
npm install
npm run build
```

### AudioWorklet Not Loading

**Symptoms:**
- "worklet not initialized" errors
- No audio output
- Console: "Failed to load module"

**Check:**
1. File location: `public/opl-worklet-processor.js`
2. URL: `/opl-worklet-processor.js` (absolute path)
3. CORS: Dev server allows local files

**Fix:**
```typescript
// Verify path in SimpleSynth.ts
await this.audioContext.audioWorklet.addModule(
  '/opl-worklet-processor.js' // Must be absolute
);
```

### Vite Build Issues

**Module not found:**
- Check import paths (case-sensitive!)
- Verify file exists
- Use absolute imports: `/src/...`

**WASM/Binary files:**
- Move to `public/` directory
- Reference with absolute paths: `/file.wasm`

---

## Code Style Guidelines

### TypeScript

```typescript
// Use explicit types for function parameters
function myFunction(value: number, name: string): boolean {
  return value > 0 && name.length > 0;
}

// Use interfaces for objects
interface MyData {
  id: number;
  name: string;
}

// Use type for unions/primitives
type Status = 'pending' | 'active' | 'complete';
```

### React

```typescript
// Use functional components
export function MyComponent({ prop }: MyComponentProps) {
  return <div>{prop}</div>;
}

// Use hooks
const [state, setState] = useState(initialValue);
useEffect(() => { /* effect */ }, [dependencies]);

// Export interface with component
export interface MyComponentProps {
  prop: string;
}
```

### Naming Conventions

- **Components:** PascalCase (`TrackerGrid`)
- **Files:** PascalCase for components, camelCase for utils
- **Functions:** camelCase (`noteNameToMIDI`)
- **Constants:** UPPER_CASE (`MAX_CHANNELS`)
- **Private methods:** camelCase with `private` keyword

---

## Resources

### OPL3 Documentation

- [OPL3 Programming Guide](http://www.shipbrook.net/jeff/sb.html)
- [Yamaha YMF262 Datasheet](https://pdf1.alldatasheet.com/datasheet-pdf/view/84281/YAMAHA/YMF262.html)
- [DMXOPL Format](https://doomwiki.org/wiki/DMXOPL)

### Web Audio API

- [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [AudioWorklet Guide](https://developer.chrome.com/blog/audio-worklet/)

### Related Projects

- [opl3-wasm](https://github.com/Malvineous/opl3-wasm) - OPL3 emulator
- [FastTracker 2](https://en.wikipedia.org/wiki/FastTracker_2) - Tracker inspiration

---

## Next Steps

Ready to add the **WAV export feature**? See [WAV_EXPORT_PLAN.md](WAV_EXPORT_PLAN.md) for implementation plan.
