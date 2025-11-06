# Testing OPL3 Direct Access

## How to Run the Test

### 1. Start the Dev Server

```bash
cd minimal-prototype
npm run dev
```

The server should start on port 5173.

### 2. Open the Test Page

Navigate to:
```
http://localhost:5173/features/export-audio/test-opl3-direct-access.html
```

### 3. Run the Tests

1. Click the **"Run Tests"** button
2. Watch the console output in the browser
3. Check the test results summary

## What the Test Does

The test performs 7 sequential checks:

1. ✅ **Load OPL3 Library** - Fetches and evaluates the OPL3 browser bundle
2. ✅ **Create Chip Instance** - Instantiates `new OPL3.OPL3()`
3. ✅ **Initialize OPL3 Mode** - Enables OPL3 features (register 0x105)
4. ✅ **Load Simple Patch** - Programs a basic piano sound
5. ✅ **Trigger Note** - Plays middle C (MIDI 60)
6. ✅ **Generate Samples** - Reads 1000 samples from the chip
7. ✅ **Verify Audio** - Confirms samples are non-zero (actual sound)

## Expected Results

### ✅ Success Case

```
All Tests Passed ✅

🎉 SUCCESS! We can use direct OPL3 access for WAV export!

This means we can:
  - Create a separate OPL3 instance in main thread
  - Generate samples synchronously
  - No need for AudioWorklet message passing
  - Much simpler implementation!
```

**What this means:**
- We can proceed with the planned prototype approach
- Each prototype will create its own OPL3 instance
- WAV export will be straightforward

### ❌ Failure Case

```
Some Tests Failed ❌

❌ FAILURE: Some tests did not pass
We may need to use AudioWorklet recording approach instead
```

**What this means:**
- We can't create OPL3 instances in main thread
- Will need to use AudioWorklet message passing
- More complex implementation
- May need Web Workers

## Troubleshooting

### Test won't load

**Problem:** Page shows 404 or blank

**Solution:**
1. Verify dev server is running: `npm run dev`
2. Check URL is correct: `http://localhost:5173/features/export-audio/test-opl3-direct-access.html`
3. Check file exists: `features/export-audio/test-opl3-direct-access.html`

### OPL3 library not found

**Problem:** Test 1 fails with "Failed to fetch"

**Solution:**
1. Check that `node_modules/opl3/dist/opl3.js` exists
2. Run `npm install` to ensure dependencies are installed
3. Check Vite config allows serving from node_modules

### All samples are zero

**Problem:** Test 7 fails - no audio being generated

**Possible causes:**
1. Patch not loaded correctly (check Test 4)
2. Note not triggered (check Test 5)
3. Registers written incorrectly
4. Chip not initialized properly (check Test 3)

**Debug steps:**
1. Open browser console (F12)
2. Look for detailed logs
3. Check register writes (should see `Write: 0x... = 0x...`)
4. Verify key-on register (0xB0 should have bit 5 set)

### TypeScript errors

**Problem:** Console shows TypeScript compilation errors

**Solution:**
- Vite handles TypeScript automatically
- Check that `test-opl3-direct-access.ts` has no syntax errors
- Try refreshing the page

## What to Do Next

### If Tests Pass ✅

1. **Celebrate!** Direct access works
2. **Proceed with Prototype 1** - Single tone WAV
3. Use this pattern:
   ```typescript
   // Fetch OPL3 code
   const response = await fetch('/node_modules/opl3/dist/opl3.js');
   const opl3Code = await response.text();

   // Evaluate in global scope
   (0, eval)(opl3Code);

   // Create chip
   const chip = new globalThis.OPL3.OPL3();

   // Use chip for WAV generation
   ```

### If Tests Fail ❌

1. **Debug the failure** - Check which test failed and why
2. **Try alternative approaches:**
   - Web Worker with OPL3
   - AudioWorklet recording
   - Different OPL3 library version
3. **Update the plan** - Revise prototype approach based on constraints

## Browser Compatibility

**Should work in:**
- Chrome 90+ ✅
- Edge 90+ ✅
- Firefox 88+ ✅

**May not work in:**
- Safari (WebAssembly/AudioWorklet issues)
- Older browsers

## Files Created

```
features/export-audio/
├── test-opl3-direct-access.html  ← Main test page
├── test-opl3-direct-access.ts    ← Test logic
└── TEST_INSTRUCTIONS.md          ← This file
```

---

**Ready to test? Start the dev server and navigate to the test page!**
