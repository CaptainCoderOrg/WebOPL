# Sound Blaster 16 Mode

**Status**: 🚧 In Development
**Created**: 2025-11-12
**Purpose**: Emulate the analog output characteristics of real Sound Blaster 16 hardware for authentic DOS-era sound

---

## Overview

Sound Blaster 16 Mode adds post-processing filters to emulate the analog output stage of real Sound Blaster 16 sound cards. This produces a warmer, more authentic sound that matches the hardware users heard when running Doom and other DOS games in the 1990s.

### Why This Matters

OPL3 emulators like `ymfm` produce mathematically perfect digital output, but real Sound Blaster 16 cards had:
- **Analog DAC** with specific frequency response characteristics
- **Anti-aliasing filters** that rolled off high frequencies
- **Output stage coloration** from analog components
- **16-bit DAC artifacts** and noise floor

These analog characteristics are part of the "Sound Blaster 16 sound" that users remember from DOS gaming.

---

## Sound Blaster 16 Hardware Characteristics

### Audio Pipeline

```
OPL3 Chip → 16-bit DAC → Anti-Aliasing Filter → Line Out
  (ymfm)      (CT1747)        (Analog)           (3.5mm)
```

### Frequency Response

Based on Sound Blaster 16 CT1740 specifications and measurements:

| Frequency Range | Response | Notes |
|----------------|----------|-------|
| 20 Hz - 10 kHz | ±0.5 dB | Flat response (transparent) |
| 10 kHz - 16 kHz | -1 to -3 dB | Gentle rolloff (high-shelf) |
| 16 kHz - 20 kHz | -6 to -12 dB | Anti-aliasing filter (low-pass) |
| > 20 kHz | -20+ dB | Brick-wall filter |

### DAC Characteristics

- **Resolution**: 16-bit linear PCM
- **Sample Rate**: 44.1 kHz (typical for OPL3 output)
- **Dynamic Range**: ~90 dB (theoretical 96 dB for 16-bit)
- **THD+N**: <0.1% @ 1kHz
- **Output Level**: 2.0 Vrms (line level)

### Analog Coloration

- **Warmth**: Slight even-order harmonic distortion from output stage
- **Noise Floor**: -90 dB (barely audible analog noise)
- **Crosstalk**: <-70 dB between left/right channels

---

## Implementation Design

### Filter Chain

```
OPL3 Digital Output
    ↓
┌─────────────────────────┐
│ 1. High-Shelf Filter    │  -2 dB @ 8 kHz (analog warmth)
│    Q: 0.707             │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ 2. Low-Pass Filter      │  Cutoff: 16 kHz (anti-aliasing)
│    Q: 0.707             │  12 dB/octave rolloff
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ 3. Subtle Saturation    │  Soft clipping (analog warmth)
│    (Optional)           │  <1% THD at peaks
└─────────────────────────┘
    ↓
Final Output
```

### Filter Specifications

#### 1. High-Shelf Filter (Analog Warmth)
- **Type**: Biquad high-shelf
- **Frequency**: 8000 Hz
- **Q**: 0.707 (Butterworth response)
- **Gain**: -2 dB (subtle darkening)

**Purpose**: Emulates the slight high-frequency rolloff from analog output stage

#### 2. Low-Pass Filter (Anti-Aliasing)
- **Type**: Biquad low-pass (2nd order)
- **Cutoff**: 16000 Hz
- **Q**: 0.707 (Butterworth response)
- **Rolloff**: 12 dB/octave

**Purpose**: Emulates the anti-aliasing filter in the analog output path

#### 3. Subtle Saturation (Optional)
- **Type**: Soft clipping (tanh curve)
- **Threshold**: 0.95 (clips at 95% amplitude)
- **Amount**: Very subtle (<1% THD)

**Purpose**: Adds slight warmth from analog component saturation

---

## Files Modified

### Core Audio Processing

1. **`minimal-prototype/public/opl-worklet-processor.js`**
   - Add SB16Filter class
   - Apply filtering in real-time playback

2. **`minimal-prototype/src/export/OfflineAudioRenderer.ts`**
   - Add SB16Filter class
   - Apply filtering during WAV export

3. **`minimal-prototype/src/audio/SB16Filter.ts`** (NEW)
   - Reusable filter implementation
   - Biquad filter calculations
   - Filter state management

### UI Components

4. **`minimal-prototype/src/components/Tracker.tsx`**
   - Add "Sound Blaster 16 Mode" toggle button
   - Pass setting to audio worklet

5. **`minimal-prototype/src/components/ExportModal.tsx`**
   - Add SB16 mode checkbox to export dialog
   - Pass setting to offline renderer

### State Management

6. **`minimal-prototype/src/store/audioSettings.ts`** (NEW)
   - Store SB16 mode preference
   - Persist to localStorage

---

## Usage

### Real-Time Playback

1. Click the **"SB16 Mode"** button in the Tracker UI
2. Audio output will be filtered in real-time
3. Setting persists across sessions

### WAV Export

1. Click **"Export"** button
2. Check **"Sound Blaster 16 Mode"** in export dialog
3. Exported WAV will have SB16 filtering applied

### API Usage

```typescript
import { SB16Filter } from './audio/SB16Filter';

// Initialize filter
const filter = new SB16Filter(44100); // sample rate

// Process audio buffer
const inputBuffer = new Float32Array(1024);
const outputBuffer = filter.process(inputBuffer);
```

---

## Testing Plan

### Frequency Response Verification

1. Generate test tone sweep (20 Hz - 20 kHz)
2. Process through SB16 filter
3. Analyze output spectrum
4. Compare to real SB16 measurements

**Expected Results**:
- Flat response 20 Hz - 10 kHz
- -2 dB at 8-12 kHz
- -6 dB at 16 kHz
- -12 dB at 18 kHz

### Subjective Listening Tests

1. **E1M1 Comparison**
   - Play with SB16 mode OFF (clean digital)
   - Play with SB16 mode ON (filtered analog)
   - Compare to real DOS hardware (if available)

2. **White Noise Test**
   - Generate white noise
   - Listen for high-frequency rolloff
   - Should sound "warmer" and "softer"

3. **Percussion Test**
   - Play drums/hi-hats
   - Verify no harshness
   - Should sound less "digital"

### Performance Testing

1. **CPU Usage**
   - Monitor CPU with SB16 mode on/off
   - Should be <2% additional CPU

2. **Latency**
   - Measure audio latency
   - Should be identical to non-filtered mode

---

## References

### Sound Blaster 16 Documentation

- **Creative Labs CT1740 Datasheet**: Original SB16 specifications
- **OPL3 Programming Guide**: http://www.shikadi.net/moddingwiki/OPL_chip
- **Vintage Audio Forum**: Real hardware measurements

### Filter Design

- **Biquad Filter Cookbook**: Robert Bristow-Johnson
- **Digital Signal Processing**: Julius O. Smith III
- **Audio EQ Cookbook**: https://webaudio.github.io/Audio-EQ-Cookbook/

### Related Projects

- **DOSBox**: Uses similar filtering for SB16 emulation
- **Chocolate Doom**: OPL emulation (uses Nuked OPL3)
- **ZDoom**: Advanced OPL filtering options

---

## Future Enhancements

### Additional Sound Card Modes

- **OPL2 Mode** (AdLib / Sound Blaster 1.0/2.0)
  - Mono output
  - More aggressive filtering (lower cutoff)
  - 9 channels only

- **Sound Blaster AWE32/64 Mode**
  - Different filter characteristics
  - Reverb effects

### Advanced Filtering

- **Vintage Mode**: Exaggerated analog characteristics
- **Clean Mode**: Minimal filtering (high-fidelity)
- **Custom Mode**: User-adjustable filter parameters

### Impulse Response Convolution

- Use real hardware impulse responses
- More accurate analog modeling
- Higher CPU cost

---

## Implementation Status

- [ ] Design filter specifications ✅ (this document)
- [ ] Implement SB16Filter class
- [ ] Add real-time filtering to audio worklet
- [ ] Add offline filtering to WAV export
- [ ] Add UI toggle button
- [ ] Add export checkbox
- [ ] Test frequency response
- [ ] Test with E1M1
- [ ] Performance profiling
- [ ] Documentation complete

---

**Last Updated**: 2025-11-12
**Author**: Claude (with user direction)
