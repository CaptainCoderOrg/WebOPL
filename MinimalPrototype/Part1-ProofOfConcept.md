# Part 1: Proof of Concept - Single OPL Tone

## Objective

Prove that OPL3 synthesis works in the browser by creating the simplest possible working example: a button that plays a 1-second tone.

**Time Estimate:** 30-60 minutes

**Success Criteria:**
- ✅ Vite project runs
- ✅ Button click plays audible OPL tone
- ✅ Tone lasts 1 second
- ✅ No errors in console

---

## What We're Building

```
Single HTML page with:
- "Initialize Audio" button
- "Play Tone" button
- Status display
- Console logging for debug
```

**Tech Stack:**
- Vite + React + TypeScript
- @malvineous/opl (OPL3 WebAssembly emulator)
- Web Audio API (ScriptProcessorNode)

---

## Step-by-Step Implementation

### Step 1: Create Vite Project

**Commands:**

```bash
cd c:\Users\josep\git\WebOrchestra
npm create vite@latest minimal-prototype -- --template react-ts
cd minimal-prototype
npm install
npm install @malvineous/opl
```

**Expected Output:**
```
✔ Scaffolding project in minimal-prototype...
✔ Done. Now run:
  cd minimal-prototype
  npm install
  npm run dev
```

**Verification:**
```bash
npm run dev
```
- Should open browser to http://localhost:5173
- Should see default Vite + React page

**If it fails:**
- Check Node.js version: `node --version` (should be 18+)
- Check npm version: `npm --version` (should be 9+)
- Try clearing npm cache: `npm cache clean --force`

---

### Step 2: Clean Up Template Files

**Files to modify:**

1. **Delete default assets:**
   - Remove `src/assets/` folder (not needed)

2. **Clear `src/App.css`:**
   ```bash
   # Windows:
   echo. > src/App.css

   # Or just open and delete all content
   ```

3. **Update `src/index.css`** (optional, for dark theme):
   ```css
   body {
     margin: 0;
     padding: 0;
     font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
     background-color: #0a0a0a;
     color: #e0e0e0;
   }
   ```

---

### Step 3: Create Proof-of-Concept App Component

**File:** `src/App.tsx`

**Full Code:**

```typescript
import { useState } from 'react';
import './App.css';

// OPL will be imported dynamically
let OPL: any = null;

function App() {
  const [initialized, setInitialized] = useState(false);
  const [opl, setOpl] = useState<any>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [scriptNode, setScriptNode] = useState<ScriptProcessorNode | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize OPL3 and Web Audio
   */
  const initAudio = async () => {
    try {
      console.log('=== Initializing Audio ===');
      setError(null);

      // Step 1: Import OPL library
      console.log('[1/5] Importing @malvineous/opl...');
      const oplModule = await import('@malvineous/opl');
      OPL = oplModule.default;
      console.log('✅ OPL module imported');

      // Step 2: Create OPL instance
      console.log('[2/5] Creating OPL instance...');
      const oplInstance = await OPL.create();
      console.log('✅ OPL instance created');

      // Step 3: Enable waveform selection (OPL3 feature)
      console.log('[3/5] Configuring OPL registers...');
      oplInstance.write(0x01, 0x20); // Enable waveform selection
      console.log('✅ OPL configured');

      // Step 4: Create Web Audio Context
      console.log('[4/5] Creating AudioContext...');
      const ctx = new AudioContext({ sampleRate: 49716 });
      console.log('✅ AudioContext created');
      console.log('   Sample rate:', ctx.sampleRate);
      console.log('   State:', ctx.state);

      // Step 5: Create ScriptProcessorNode
      console.log('[5/5] Creating audio processing node...');
      const bufferSize = 4096; // Larger buffer = more stable, more latency
      const node = ctx.createScriptProcessor(bufferSize, 0, 2); // 0 inputs, 2 outputs (stereo)

      // Audio processing callback - generates audio samples
      node.onaudioprocess = (event) => {
        const outputL = event.outputBuffer.getChannelData(0);
        const outputR = event.outputBuffer.getChannelData(1);
        const numSamples = outputL.length;

        // Generate samples from OPL
        const samples = oplInstance.generate(numSamples);

        // Copy samples to output (with format conversion if needed)
        for (let i = 0; i < numSamples; i++) {
          // Check sample type and convert to Float32
          let sample: number;
          if (samples instanceof Int16Array) {
            // Int16 range: -32768 to 32767
            sample = samples[i] / 32768.0;
          } else {
            // Already float
            sample = samples[i];
          }

          // Copy to both channels (mono -> stereo)
          outputL[i] = sample;
          outputR[i] = sample;
        }
      };

      // Connect to speakers
      node.connect(ctx.destination);
      console.log('✅ Audio processing node connected');

      // Save state
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
```

---

### Step 4: Create Minimal Styling

**File:** `src/App.css`

```css
.app {
  max-width: 800px;
  margin: 50px auto;
  padding: 30px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

h1 {
  text-align: center;
  color: #00ff00;
  margin-bottom: 30px;
}

.status-section {
  margin: 30px 0;
  padding: 20px;
  background-color: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
}

.status {
  font-size: 18px;
  margin-bottom: 10px;
}

.error-message {
  margin-top: 15px;
  padding: 15px;
  background-color: #3a0000;
  border: 1px solid #ff0000;
  border-radius: 4px;
  color: #ff4444;
}

.info {
  margin-top: 15px;
  padding: 10px;
  background-color: #0a2a0a;
  border: 1px solid #00aa00;
  border-radius: 4px;
  font-family: monospace;
  font-size: 14px;
}

.info div {
  margin: 5px 0;
}

.button-section {
  text-align: center;
  margin: 30px 0;
}

button {
  padding: 15px 30px;
  font-size: 18px;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #0066cc;
  color: white;
}

.btn-primary:hover {
  background-color: #0088ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 102, 204, 0.3);
}

.btn-play {
  background-color: #00aa00;
  color: white;
}

.btn-play:hover {
  background-color: #00cc00;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 170, 0, 0.3);
}

button:active {
  transform: translateY(0);
}

.instructions {
  margin-top: 40px;
  padding: 20px;
  background-color: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
}

.instructions h3 {
  margin-top: 0;
  color: #ffaa00;
}

.instructions ol {
  line-height: 1.8;
}

.instructions p {
  margin-top: 15px;
  color: #ffaa00;
  font-style: italic;
}
```

---

### Step 5: Run and Test

**Commands:**

```bash
npm run dev
```

**Expected behavior:**

1. **Page loads:**
   - See heading: "🎵 OPL3 Proof of Concept"
   - See status: "⏳ Not Initialized"
   - See blue button: "Initialize Audio System"

2. **Click "Initialize Audio System":**
   - Check browser console (press F12)
   - Should see logs:
     ```
     === Initializing Audio ===
     [1/5] Importing @malvineous/opl...
     ✅ OPL module imported
     [2/5] Creating OPL instance...
     ✅ OPL instance created
     [3/5] Configuring OPL registers...
     ✅ OPL configured
     [4/5] Creating AudioContext...
     ✅ AudioContext created
        Sample rate: 49716
        State: running
     [5/5] Creating audio processing node...
     ✅ Audio processing node connected
     === Audio Initialization Complete! ===
     ```
   - Status should change to "✅ Ready"
   - Button should change to green "🔊 Play Test Tone"

3. **Click "Play Test Tone":**
   - Check console for:
     ```
     === Playing Test Tone ===
     Resuming AudioContext...
     Programming OPL registers for test instrument...
     ✅ Instrument programmed
     Target frequency: 261.63 Hz
     Calculated F-Number: 356 (0x164)
     Calculated Block: 4
     ✅ Note ON - playing for 1 second...
     ✅ Note OFF
     ```
   - **SHOULD HEAR A 1-SECOND TONE** 🔊
   - Tone should stop after 1 second

4. **Can click "Play Test Tone" multiple times:**
   - Each click should play tone again

---

## Testing Checklist

**Basic Functionality:**
- [ ] Page loads without errors
- [ ] Initialize button appears
- [ ] Click Initialize - no errors in console
- [ ] Status changes to ✅ Ready
- [ ] Play button appears
- [ ] Click Play - **HEAR AUDIBLE TONE**
- [ ] Tone lasts approximately 1 second
- [ ] Tone stops cleanly (no click/pop)
- [ ] Can play tone multiple times

**Console Verification:**
- [ ] All initialization steps log successfully
- [ ] OPL instance created
- [ ] AudioContext sample rate is 49716 Hz (or close)
- [ ] F-Number calculated (should be ~356)
- [ ] Block calculated (should be 4)
- [ ] No errors or warnings

---

## Troubleshooting

### Problem: No Sound

**Check 1: Browser Console**
- Look for errors in red
- Common issues:
  - CORS errors (shouldn't happen with Vite)
  - AudioContext suspended (should auto-resume)
  - OPL module not loading

**Check 2: System Audio**
- Is system volume up?
- Are headphones/speakers connected?
- Try playing a YouTube video to verify audio works

**Check 3: Browser Support**
- Use Chrome or Edge (best Web Audio support)
- Firefox should work but may have different sample rates
- Safari may require manual AudioContext resume

**Check 4: AudioContext State**
- Look at info box - should show "State: running"
- If "suspended", try clicking button again
- Some browsers require explicit resume() call

**Check 5: Sample Type**
- Add debug log:
  ```typescript
  const samples = oplInstance.generate(numSamples);
  console.log('Sample type:', samples.constructor.name);
  console.log('First 10 samples:', samples.slice(0, 10));
  ```
- Should be Int16Array or Float32Array
- Should have non-zero values when playing

**Fix Attempts:**

1. **Force AudioContext Resume:**
   ```typescript
   const playTestTone = async () => {
     await audioContext.resume();
     console.log('State after resume:', audioContext.state);
     // ... rest of function
   };
   ```

2. **Try Different Sample Rate:**
   ```typescript
   const ctx = new AudioContext({ sampleRate: 44100 });
   // Note: May cause pitch shift
   ```

3. **Increase Volume:**
   ```typescript
   // In carrier settings:
   opl.write(0x40 + 0x03, 0x00); // Already at max
   // Try modulator:
   opl.write(0x40 + 0x00, 0x00); // Set to max
   ```

---

### Problem: Wrong Sample Type Error

**Symptom:** Console error like "Cannot read property '0' of undefined"

**Cause:** `opl.generate()` returns unexpected type

**Debug:**
```typescript
const samples = oplInstance.generate(numSamples);
console.log('Type:', samples.constructor.name);
console.log('Length:', samples.length);
console.log('Sample 0:', samples[0]);
```

**Fix:** Adjust conversion logic based on actual type

---

### Problem: Initialization Fails

**Symptom:** Error in console during initialization

**Common Causes:**
1. **OPL module not found**
   - Run: `npm install @malvineous/opl`
   - Verify in `package.json`

2. **Import syntax issue**
   - Try: `import * as OPL from '@malvineous/opl'`
   - Then: `const oplInstance = await OPL.default.create()`

3. **TypeScript errors**
   - Add `// @ts-ignore` above import if needed
   - Create types file if necessary

---

### Problem: Tone Pitch is Wrong

**Symptom:** Tone plays but sounds too high or too low

**Debug:**
- Log F-number and block
- For middle C (261.63 Hz):
  - Expected F-num: ~356 (0x164)
  - Expected block: 4

**Verify Formula:**
```typescript
// Check reverse calculation:
const actualFreq = 49716 * fnum / Math.pow(2, 20 - block);
console.log('Actual frequency:', actualFreq, 'Hz');
// Should be close to 261.63
```

**Common Issues:**
- Sample rate mismatch (if not 49716)
- Wrong formula (division vs multiplication)
- Block calculation off by one

---

### Problem: Tone is Too Quiet

**Fix 1: Increase Carrier Output Level**
```typescript
opl.write(0x40 + 0x03, 0x00); // 0x00 = loudest
```

**Fix 2: Increase System Volume**
- Check Windows volume mixer
- Check browser tab volume

**Fix 3: Change Connection Type**
```typescript
opl.write(0xC0, 0x00); // Try FM instead of additive
```

---

### Problem: Tone Doesn't Stop

**Symptom:** Tone continues after 1 second

**Cause:** Key-off not working

**Debug:**
```typescript
setTimeout(() => {
  console.log('Turning off note...');
  opl.write(0xB0, 0x00);
  console.log('Register 0xB0 set to 0x00');
}, 1000);
```

**Fix:** Ensure register write executes
- Check setTimeout fires
- Verify opl object still valid
- Try writing multiple times

---

## Success Criteria

✅ **Part 1 is complete when:**

1. ✅ Vite project runs without errors
2. ✅ Can click "Initialize Audio" without errors
3. ✅ Console shows all 5 initialization steps
4. ✅ Status shows "✅ Ready"
5. ✅ Can click "Play Test Tone"
6. ✅ **HEAR AUDIBLE 1-SECOND TONE**
7. ✅ Tone stops after 1 second
8. ✅ Can play tone multiple times
9. ✅ No errors in console
10. ✅ AudioContext state is "running"

---

## What We Proved

If all tests pass, we have proven:
- ✅ @malvineous/opl works in browser
- ✅ OPL3 WebAssembly module loads correctly
- ✅ Can program OPL registers
- ✅ Can generate audio samples
- ✅ Web Audio API integration works
- ✅ ScriptProcessorNode audio callback works
- ✅ Can calculate frequencies correctly
- ✅ **Core tech is viable for full project**

---

## Next Steps

**After Part 1 succeeds:**
→ Proceed to **Part 2: Core Engine** (SimpleSynth class, multiple voices, note conversion)

**If Part 1 fails:**
→ Debug issues before continuing
→ Research @malvineous/opl documentation
→ Try alternative OPL libraries

---

## Files Created

```
minimal-prototype/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx         ← Main proof-of-concept code
│   ├── App.css         ← Styling
│   └── index.css       ← Global styles
```

**Total Lines of Code:** ~250 lines

---

## Time Log

| Task | Estimated | Actual |
|------|-----------|--------|
| Create Vite project | 5 min | ___ |
| Install dependencies | 2 min | ___ |
| Write App.tsx | 15 min | ___ |
| Write App.css | 5 min | ___ |
| Testing and debugging | 20 min | ___ |
| **TOTAL** | **~45 min** | ___ |

---

**Once you hear that tone, the hardest part is done! The rest is building on top of working technology.** 🎉
