# Prototype 1: Single Tone WAV - Testing Guide

**Status:** 🔄 Ready to Test

---

## Quick Start

### 1. Start Dev Server

```bash
cd minimal-prototype
npm run dev
```

### 2. Open Prototype

Navigate to:
```
http://localhost:5173/features/export-audio/prototypes/prototype-1-single-tone.html
```

### 3. Generate WAV

1. Click **"🎹 Generate WAV"** button
2. Watch progress bar (0-100%)
3. Wait for "Generation Complete!" message
4. Click **"⬇️ Download WAV"** button
5. Open WAV file in media player

---

## What It Does

Generates a **1-second middle C piano note** and exports it as `prototype-1-single-tone.wav`.

### Process Flow

```
Load OPL3 Library (3.8 MB)
    ↓
Create Chip Instance
    ↓
Initialize OPL3 Mode
    ↓
Load Piano Patch
    ↓
Trigger Middle C (MIDI 60)
    ↓
Generate 49,716 Samples (1 sec)
    ↓
Encode to WAV Format
    ↓
Download File
```

### Expected Specifications

| Property | Value |
|----------|-------|
| **Note** | Middle C (C-4, MIDI 60) |
| **Frequency** | 261.63 Hz |
| **Duration** | 1.000 seconds |
| **Sample Rate** | 49,716 Hz |
| **Channels** | Stereo (2) |
| **Bit Depth** | 16-bit PCM |
| **File Size** | ~194 KB (198,908 bytes) |
| **Format** | WAV PCM |

---

## Success Criteria Checklist

Test each item after downloading:

### ✅ File Generation

- [ ] WAV file generates without errors
- [ ] Progress bar shows 0% → 100%
- [ ] Generation completes in < 5 seconds
- [ ] Download button appears
- [ ] File downloads successfully

### ✅ File Properties

- [ ] File size is **~194 KB** (198,908 bytes exactly)
- [ ] Filename is `prototype-1-single-tone.wav`
- [ ] File opens in VLC/Windows Media Player
- [ ] No errors when opening file

### ✅ Audio Quality

- [ ] Plays a clear **piano** sound
- [ ] Pitch sounds like **middle C**
- [ ] Duration is **exactly 1 second**
- [ ] No **click** at start (clean attack)
- [ ] No **pop** at end (clean release)
- [ ] No glitches or artifacts in middle
- [ ] Stereo (plays from both speakers)

### ✅ Console Output

Check browser console (F12) for:

- [ ] All 7 steps complete without errors
- [ ] Peak amplitude reported (should be > 0)
- [ ] Non-zero samples reported (should be ~100%)
- [ ] File size matches expected (~198,908 bytes)

---

## Expected Console Output

```
=== Starting WAV Generation ===
[Time] Step 1: Loading OPL3 library...
[Time] ✓ Fetched OPL3 code (3885699 bytes)
[Time] ✓ OPL3 library loaded successfully
[Time] Step 2: Creating OPL3 chip instance...
[Time] ✓ Chip instance created
[Time] Step 3: Initializing OPL3 mode...
[Time] ✓ OPL3 initialized
[Time] Step 4: Loading piano patch...
[Time] ✓ Piano patch loaded
[Time] Step 5: Triggering middle C (MIDI 60)...
[Time]   Frequency: 261.63 Hz
[Time]   F-num: 5518, Block: 0
[Time] ✓ Note triggered (key-on: 0x21)
[Time] Step 6: Generating audio samples...
[Time]   Generating 49716 samples...
[Time] ✓ Generated 49716 samples
[Time]   Peak amplitude: L=~1800, R=~1800
[Time]   Non-zero: L=49714/49716, R=49714/49716
[Time] Step 7: Encoding to WAV format...
[Time] ✓ WAV encoded
[Time]   File size: 198908 bytes (194.2 KB)
[Time]
[Time] === Generation Complete ===
[Time] ✅ WAV file ready for download
[Time]    Size: 198908 bytes
[Time]    Expected: ~198908 bytes
[Time]    ✅ Size matches expected value!
```

---

## Troubleshooting

### Issue: File size is wrong

**Expected:** 198,908 bytes
**If different:**
- Check sample count (should be 49,716)
- Check channels (should be 2)
- Check bit depth (should be 16-bit)

**Formula:**
```
Size = (sampleRate × duration × channels × bytesPerSample) + 44
     = (49,716 × 1 × 2 × 2) + 44
     = 198,908 bytes
```

### Issue: No sound when playing

**Check:**
1. Peak amplitude in console (should be > 0)
2. Non-zero samples (should be ~100%)
3. WAV header is correct
4. Media player supports 49,716 Hz sample rate

**Debug:**
- Try different media player (VLC is most compatible)
- Check file with audio editor (Audacity)
- Verify frequency calculation (should be 261.63 Hz)

### Issue: Click at start/end

**Start click:**
- Attack rate too fast? (currently AR=15)
- Try reducing attack rate to 12-13

**End click:**
- Release rate too fast? (currently RR=4)
- No note-off being sent (1 second of key-on then sudden stop)
- May need to add explicit note-off before end

### Issue: Wrong pitch

**Check:**
1. MIDI note is 60 (middle C)
2. Frequency is 261.63 Hz
3. F-num is 5518
4. Block is 0

**Compare:**
- Play in media player alongside real-time tracker
- Should sound identical

### Issue: Distortion/clipping

**Check:**
- Peak amplitude (should be < 32,767)
- Output level (TL) in patch (carrier TL=0, modulator TL=16)
- If clipping, increase carrier TL slightly

---

## Next Steps

### If All Tests Pass ✅

**Celebrate!** Then:

1. **Mark Prototype 1 as complete**
2. **Document any findings**
3. **Move to Prototype 2** - Instrument switching

### If Tests Fail ❌

**Debug and fix:**

1. Check console output for errors
2. Verify each step succeeds
3. Compare with test-opl3-direct-access (which worked)
4. Adjust parameters as needed
5. Re-test

---

## File Analysis

### Verify WAV File with Audacity

1. Open Audacity
2. Import `prototype-1-single-tone.wav`
3. Check waveform:
   - Should show smooth attack envelope
   - Sustain phase visible
   - Clean release
4. Check properties:
   - Sample Rate: 49716 Hz
   - Channels: 2 (stereo)
   - Duration: 1.000 seconds

### Verify with VLC

1. Open in VLC
2. Tools → Codec Information
3. Check:
   - Codec: PCM S16 LE
   - Channels: Stereo
   - Sample rate: 49716 Hz
   - Bits per sample: 16

---

## Technical Notes

### Sample Generation Pattern

**Critical:** Samples are generated **one at a time**:

```typescript
for (let i = 0; i < totalSamples; i++) {
  chip.read(buffer); // ← ONE sample per call
  leftChannel[i] = buffer[0];
  rightChannel[i] = buffer[1];
}
```

**Why:** OPL3 emulator maintains state that advances with each read.

### WAV Format

**Header structure:**
```
Offset  Size  Description
------  ----  -----------
0       4     "RIFF"
4       4     File size - 8
8       4     "WAVE"
12      4     "fmt "
16      4     16 (format chunk size)
20      2     1 (PCM)
22      2     2 (channels)
24      4     49716 (sample rate)
28      4     198864 (byte rate)
32      2     4 (block align)
34      2     16 (bits per sample)
36      4     "data"
40      4     198864 (data size)
44      ...   Sample data (interleaved L/R)
```

---

**Ready to test? Start the dev server and open the prototype page!**
