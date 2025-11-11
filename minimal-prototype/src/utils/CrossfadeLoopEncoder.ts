/**
 * CrossfadeLoopEncoder - DEPRECATED
 *
 * This approach was replaced with context-aware rendering in exportPattern.ts.
 * The context-aware approach renders [last N rows | pattern | first N rows]
 * and extracts the core pattern, which naturally handles the loop boundary
 * without needing crossfade analysis.
 *
 * Kept for reference and potential future use.
 *
 * @deprecated Use context-aware rendering instead (exportSeamlessLoop)
 * @see export/exportPattern.ts - exportSeamlessLoop function
 * @see features/export-audio/SEAMLESS_LOOPS.md - Full documentation
 *
 * NOTE: This file is not currently used in the codebase.
 */

export class CrossfadeLoopEncoder {
  /**
   * Extract seamless loop from context-aware rendered audio
   *
   * This method expects audio with lead-in and lead-out context.
   * Algorithm:
   * 1. Input is [last N rows | full pattern | first N rows]
   * 2. Extract the core pattern (middle section)
   * 3. Context ensures seamless loop boundary (row end → row 0)
   *
   * @param leftChannel - Left channel samples (with lead-in/out context)
   * @param rightChannel - Right channel samples (with lead-in/out context)
   * @param sampleRate - Sample rate in Hz
   * @param leadInSamples - Number of context samples at the beginning (padding before pattern)
   * @param coreSamples - Number of samples in the core pattern to extract
   * @param fadeDurationMs - [Unused] Kept for API compatibility (default: 200ms)
   * @returns Extracted seamless loop (core pattern only)
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
   * Helper: Calculate sample count from musical rows
   *
   * @param rows - Number of rows
   * @param bpm - Beats per minute
   * @param rowsPerBeat - Rows per beat (typically 4 for 16th note resolution)
   * @param sampleRate - Sample rate in Hz (default: 49716)
   * @returns Number of samples
   */
  static rowsToSamples(
    rows: number,
    bpm: number,
    rowsPerBeat: number = 4,
    sampleRate: number = 49716
  ): number {
    const secondsPerRow = 60 / (bpm * rowsPerBeat);
    const duration = rows * secondsPerRow;
    return Math.floor(duration * sampleRate);
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
