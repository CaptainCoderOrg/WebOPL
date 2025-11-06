# Export Audio Prototypes

**Incremental prototypes for WAV export feature**

---

## Purpose

Each prototype tests a specific capability in isolation before integration.

**Benefits:**
- Validate approach before coding full feature
- Catch issues early
- Build confidence incrementally
- Easy to test and debug

---

## Running Prototypes

Each prototype consists of:
- `.html` file - Test page (open in browser)
- `.ts` file - TypeScript implementation

### Option 1: Direct HTML (Quick Start)

1. Compile TypeScript:
   ```bash
   cd minimal-prototype
   npx tsc features/export-audio/prototypes/prototype-1-single-tone.ts --outDir features/export-audio/prototypes --target ES2020 --module ES2020
   ```

2. Open HTML in browser:
   ```bash
   # Windows
   start features/export-audio/prototypes/prototype-1-single-tone.html

   # Mac
   open features/export-audio/prototypes/prototype-1-single-tone.html

   # Linux
   xdg-open features/export-audio/prototypes/prototype-1-single-tone.html
   ```

### Option 2: Via Dev Server (Recommended)

1. Start Vite dev server:
   ```bash
   npm run dev
   ```

2. Navigate to:
   ```
   http://localhost:5173/features/export-audio/prototypes/prototype-1-single-tone.html
   ```

---

## Prototype Status

### ✅ = Complete | 🔄 = In Progress | ⬜ = Not Started

| # | Name | Status | Description |
|---|------|--------|-------------|
| 1 | Single Tone | ⬜ | 1-second C-4 note |
| 2 | Instrument Switch | ⬜ | Two notes, different instruments |
| 3 | Polyphonic + Sustain | ⬜ | Multi-track with sustained bass |
| 4 | Tempo Changes | ⬜ | Same pattern at different BPMs |

---

## Prototype Templates

### HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prototype N - Description</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      max-width: 800px;
      margin: 2rem auto;
      padding: 1rem;
    }
    button {
      padding: 0.5rem 1rem;
      font-size: 1rem;
      cursor: pointer;
    }
    .status {
      margin: 1rem 0;
      padding: 1rem;
      background: #f0f0f0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <h1>Prototype N: Description</h1>

  <div class="status">
    <strong>Status:</strong> <span id="status">Ready</span>
  </div>

  <button id="generateBtn">Generate WAV</button>
  <div id="downloadContainer" style="display: none;">
    <a id="downloadLink" download="prototype-n.wav">
      <button>Download WAV</button>
    </a>
  </div>

  <h2>Expected Result</h2>
  <p>Description of what the audio should sound like...</p>

  <h2>Console Output</h2>
  <p>Check browser console for detailed logs</p>

  <script type="module" src="./prototype-n.js"></script>
</body>
</html>
```

### TypeScript Template

```typescript
/**
 * Prototype N: Description
 *
 * Goal: What this prototype tests
 *
 * Expected output: Description of audio
 */

console.log('=== Prototype N: Description ===');

// Import OPL3 (will need to figure out path)
// import { OPL3 } from 'opl3';

async function generateWAV(): Promise<Blob> {
  console.log('[Step 1] Initializing...');

  // TODO: Create OPL3 instance
  // TODO: Load patch
  // TODO: Generate samples
  // TODO: Encode to WAV
  // TODO: Return blob

  throw new Error('Not implemented');
}

function downloadWAV(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.getElementById('downloadLink') as HTMLAnchorElement;
  link.href = url;
  link.download = filename;

  const container = document.getElementById('downloadContainer')!;
  container.style.display = 'block';

  console.log('✅ WAV ready for download');
}

// Wire up UI
document.getElementById('generateBtn')?.addEventListener('click', async () => {
  const statusEl = document.getElementById('status')!;

  try {
    statusEl.textContent = 'Generating...';

    const blob = await generateWAV();

    statusEl.textContent = 'Complete!';
    downloadWAV(blob, 'prototype-n.wav');

  } catch (error) {
    statusEl.textContent = 'Error!';
    console.error('Generation failed:', error);
  }
});
```

---

## Testing Checklist

For each prototype, verify:

### File Generation
- [ ] WAV file generates without errors
- [ ] File size is reasonable (see formula below)
- [ ] File downloads successfully

### Audio Quality
- [ ] Opens in VLC/Windows Media Player
- [ ] Plays without errors
- [ ] Correct duration
- [ ] Correct pitch(es)
- [ ] Correct instrument sound(s)
- [ ] No clicks at start
- [ ] No pops at end
- [ ] No glitches in middle

### Specific Requirements
- [ ] (Prototype 1) Single clean tone
- [ ] (Prototype 2) Two distinct instruments
- [ ] (Prototype 3) Bass sustains, chords repeat
- [ ] (Prototype 4) Timing matches BPM

### File Size Validation

```
Expected WAV size = (sampleRate × duration × 2 channels × 2 bytes) + 44

Examples:
- 1 sec @ 49,716 Hz = (49,716 × 1 × 2 × 2) + 44 = 198,908 bytes (≈194 KB)
- 2 sec @ 49,716 Hz = (49,716 × 2 × 2 × 2) + 44 = 397,816 bytes (≈388 KB)
- 4 sec @ 49,716 Hz = (49,716 × 4 × 2 × 2) + 44 = 795,632 bytes (≈777 KB)
```

If file size is very different, something is wrong!

---

## Common Issues & Solutions

### Issue: Can't import OPL3

**Solution:** Try different approaches:
1. Use bundled version from `node_modules/opl3/dist/opl3.js`
2. Copy OPL3 code directly
3. Use dynamic import

### Issue: No audio output

**Checklist:**
- Did you initialize the chip?
- Did you enable OPL3 mode (register 0x105)?
- Did you load a patch?
- Did you write frequency registers?
- Did you write key-on bit (0xB0)?

### Issue: Wrong pitch

**Check:**
- MIDI note conversion
- F-num calculation
- Block calculation
- Register writes (0xA0, 0xB0)

### Issue: Clicks/pops

**Causes:**
- Missing attack envelope
- Instant cutoff (no release)
- DC offset

**Solutions:**
- Verify ADSR parameters
- Add fade-in/out
- Check patch settings

---

## Debugging Tips

### Enable Verbose Logging

```typescript
const DEBUG = true;

function log(message: string, ...args: any[]) {
  if (DEBUG) {
    console.log(`[Prototype] ${message}`, ...args);
  }
}
```

### Verify Register Writes

```typescript
function writeOPL(register: number, value: number) {
  console.log(`Write: 0x${register.toString(16)} = 0x${value.toString(16)}`);
  chip.write(array, address, value);
}
```

### Check Sample Values

```typescript
const samples = chip.read(buffer);
console.log('Sample range:', Math.min(...samples), 'to', Math.max(...samples));

// Check for DC offset
const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
console.log('DC offset:', avg); // Should be near 0
```

### Verify WAV Header

```typescript
const view = new DataView(wavBuffer);
console.log('RIFF:', String.fromCharCode(...[view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)]));
console.log('File size:', view.getUint32(4, true));
console.log('Sample rate:', view.getUint32(24, true));
console.log('Channels:', view.getUint16(22, true));
```

---

## Next Steps

1. **Start with Prototype 1** - Get single tone working
2. **Validate everything** - Check file size, audio quality, timing
3. **Document learnings** - Update this README with findings
4. **Move to Prototype 2** - Build on what works
5. **Iterate** - Each prototype adds one new capability

---

**Good luck! 🎵**
