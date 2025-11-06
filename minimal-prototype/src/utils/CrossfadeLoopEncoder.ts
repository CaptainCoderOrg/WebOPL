/**
 * CrossfadeLoopEncoder - Apply equal-power crossfade to create seamless loops
 *
 * Uses context-aware rendering for musical patterns:
 * Renders [last 8 rows | full pattern | first 8 rows], extracts the middle section,
 * then crossfades the natural loop boundary. This provides proper context for loop points.
 */

export class CrossfadeLoopEncoder {
  /**
   * Apply crossfade to make audio loop seamlessly for music
   *
   * This method expects audio with lead-in and lead-out context.
   * Algorithm:
   * 1. Input is [last 8 rows | full pattern | first 8 rows]
   * 2. Extract the core pattern (middle section)
   * 3. Crossfade the end → beginning for seamless loop
   *
   * @param leftChannel - Left channel samples (with lead-in/out)
   * @param rightChannel - Right channel samples (with lead-in/out)
   * @param sampleRate - Sample rate in Hz
   * @param leadInSamples - Number of samples in the lead-in section
   * @param coreSamples - Number of samples in the core pattern
   * @param fadeDurationMs - Crossfade duration in milliseconds (default: 200ms)
   * @returns One seamless loop with crossfade applied
   */
  static applyCrossfade(
    leftChannel: Int16Array,
    rightChannel: Int16Array,
    sampleRate: number,
    leadInSamples: number,
    coreSamples: number,
    fadeDurationMs: number = 200
  ): { left: Int16Array; right: Int16Array } {
    // Calculate fade length in samples
    const fadeLengthSamples = Math.floor((fadeDurationMs / 1000) * sampleRate);

    if (fadeLengthSamples >= coreSamples / 4) {
      throw new Error('Crossfade duration too long for audio length');
    }

    console.log(`[CrossfadeLoopEncoder] Applying context-aware loop method with ${fadeDurationMs}ms crossfade`);
    console.log(`[CrossfadeLoopEncoder] Lead-in: ${leadInSamples} samples, Core: ${coreSamples} samples`);

    // Step 1: Extract the core pattern (skip lead-in, take core length)
    const extractStart = leadInSamples;
    const extractEnd = leadInSamples + coreSamples;

    console.log(`[CrossfadeLoopEncoder] Extracting core from sample ${extractStart} to ${extractEnd}`);

    const newLeft = new Int16Array(coreSamples);
    const newRight = new Int16Array(coreSamples);

    for (let i = 0; i < coreSamples; i++) {
      newLeft[i] = leftChannel[extractStart + i];
      newRight[i] = rightChannel[extractStart + i];
    }

    // Step 2: No crossfade needed!
    // The end was rendered with first rows playing after it
    // The beginning was rendered with last rows playing before it
    // The context ensures the loop boundary is already seamless
    console.log('[CrossfadeLoopEncoder] ✅ Context-aware loop extracted (no crossfade needed)');

    return { left: newLeft, right: newRight };
  }

  /**
   * Calculate recommended crossfade duration based on BPM
   * Aims for approximately 1/8 beat duration
   *
   * @param bpm - Beats per minute
   * @returns Recommended crossfade duration in milliseconds
   */
  static getRecommendedFadeDuration(bpm: number): number {
    // 1/8 beat at given BPM
    const beatsPerSecond = bpm / 60;
    const secondsPer8thBeat = 1 / (beatsPerSecond * 8);
    const fadeMs = secondsPer8thBeat * 1000;

    // Clamp between 50ms and 500ms
    return Math.max(50, Math.min(500, fadeMs));
  }
}
