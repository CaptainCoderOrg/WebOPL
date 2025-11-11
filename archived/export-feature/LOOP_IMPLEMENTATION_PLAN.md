# Perfect Loop Implementation Plan

## Overview
Implement two different techniques for creating seamless audio loops and compare their quality.

## Technique 1: Crossfade Method (Equal-Power)

### Concept
Mix the end of the audio with the beginning using equal-power fade curves to create a smooth transition.

### Implementation Steps
1. Render pattern once with standard tail
2. Extract crossfade region (e.g., 200ms):
   - Head: First 200ms of audio
   - Tail: Last 200ms of audio
3. Apply equal-power crossfade:
   - Tail fade-out: `amplitude * sqrt(1 - progress)`
   - Head fade-in: `amplitude * sqrt(progress)`
4. Mix crossfaded samples into loop boundary
5. Write standard WAV (no loop metadata)

### Pros
- Simple implementation
- Works with all players
- Guaranteed to loop

### Cons
- Alters audio (mixing reduces peaks)
- Can muddy complex passages
- Fixed loop - can't adjust later

### Code Structure
```
src/utils/CrossfadeLoopEncoder.ts
  - static applyCrossfade(left, right, sampleRate, fadeMs)
  - Returns: Modified audio buffers
```

## Technique 2: Extended Render + Loop Points (SMPL Chunk)

### Concept
Render extra audio past the loop point, then mark optimal loop boundaries using WAV metadata (SMPL chunk).

### Implementation Steps
1. Render pattern 1.5x or 2x:
   - Full pattern + half pattern (overlap region)
2. Find optimal loop point in overlap:
   - Search for zero-crossing near musical boundary
   - Prefer downbeat or musically significant points
3. Write WAV with SMPL chunk:
   - Loop start: 0
   - Loop end: Optimal point in sample units
   - Loop type: Forward

### Pros
- No audio alteration (pristine quality)
- Standard game audio format
- Adjustable loop points post-export
- Supported by Unity, Unreal, Kontakt, etc.

### Cons
- Larger file size (50% more audio)
- Requires SMPL chunk support
- More complex implementation

### Code Structure
```
src/utils/WAVEncoder.ts
  - static encodeWithLoop(left, right, sampleRate, loopStart, loopEnd)
  - Writes SMPL chunk with loop metadata

src/utils/LoopPointFinder.ts
  - static findBestLoopPoint(left, right, searchStart, searchEnd)
  - Returns: Optimal loop sample index
```

## SMPL Chunk Format

```
Offset  Size  Description
0       4     "smpl" (chunk ID)
4       4     Chunk size (minus 8)
8       4     Manufacturer (0)
12      4     Product (0)
16      4     Sample Period (nanoseconds)
20      4     MIDI Unity Note (60 = middle C)
24      4     MIDI Pitch Fraction (0)
28      4     SMPTE Format (0)
32      4     SMPTE Offset (0)
36      4     Num Sample Loops (1)
40      4     Sampler Data (0)

Loop Entry (per loop):
44      4     Cue Point ID (0)
48      4     Type (0 = forward loop)
52      4     Start sample
56      4     End sample
60      4     Fraction (0)
64      4     Play Count (0 = infinite)
```

## Integration Tests

### Test 1: Crossfade Loop Export
- Pattern: RPG Adventure (64 rows, 8 tracks)
- Crossfade: 200ms
- Filename: `rpg-adventure-crossfade-loop.wav`
- Verification:
  - Listen to loop boundary (should be seamless)
  - Check for volume dips
  - Compare with non-looped version

### Test 2: Extended Render + Loop Points
- Pattern: RPG Adventure (64 rows, 8 tracks)
- Render: 1.5x (64 + 32 rows overlap)
- Loop point: Auto-detected in overlap region
- Filename: `rpg-adventure-smpl-loop.wav`
- Verification:
  - Verify SMPL chunk with hex editor
  - Test in Unity/game engine
  - Listen to loop in DAW (should respect markers)
  - Compare pristine audio quality

### Test 3: Direct Comparison
- Load both files in Audacity
- Zoom to loop boundary
- Compare waveforms visually
- Listen back-to-back
- Document differences in test results

## Implementation Order

1. **Phase 1**: Implement CrossfadeLoopEncoder
   - Create utility class
   - Implement equal-power fade curves
   - Add integration test

2. **Phase 2**: Implement SMPL chunk support
   - Extend WAVEncoder with loop metadata
   - Create LoopPointFinder utility
   - Add integration test

3. **Phase 3**: Comparison and Documentation
   - Run both tests
   - Export comparison samples
   - Document findings
   - Recommend best approach

## Success Criteria

### Crossfade Method
- ✅ No clicks or pops at loop boundary
- ✅ Smooth volume transition
- ✅ Works in all audio players

### SMPL Method
- ✅ Loop markers correctly embedded
- ✅ Game engines respect loop points
- ✅ Zero audio alteration
- ✅ Musically aligned loop point

## Technical Details

### Zero-Crossing Detection
```typescript
function findZeroCrossing(samples: Int16Array, start: number): number {
  for (let i = start; i < samples.length - 1; i++) {
    // Look for sign change (zero crossing)
    if ((samples[i] >= 0 && samples[i + 1] < 0) ||
        (samples[i] < 0 && samples[i + 1] >= 0)) {
      return i;
    }
  }
  return start; // Fallback
}
```

### Equal-Power Crossfade
```typescript
function equalPowerCrossfade(
  tailSample: number,
  headSample: number,
  progress: number // 0.0 to 1.0
): number {
  const tailGain = Math.sqrt(1 - progress);
  const headGain = Math.sqrt(progress);
  return (tailSample * tailGain) + (headSample * headGain);
}
```

## Files to Create

1. `src/utils/CrossfadeLoopEncoder.ts` - Crossfade implementation
2. `src/utils/LoopPointFinder.ts` - Find optimal loop points
3. `src/utils/WAVEncoder.ts` - Extend with SMPL chunk support
4. `features/export-audio/integration-test.ts` - Add two new test functions

## Expected Outcomes

**Crossfade**: Clean loop, slightly softer at boundary, works everywhere

**SMPL**: Perfect audio quality, requires compatible player, industry standard for games

**Recommendation**: Use SMPL method for game assets, crossfade as fallback for simple playback
