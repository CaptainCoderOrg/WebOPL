/**
 * LoopPointFinder - Find optimal loop points in extended audio renders
 *
 * Searches for zero-crossings near musical boundaries to minimize
 * clicks and pops when audio loops back to the beginning.
 */

export class LoopPointFinder {
  /**
   * Find the best loop point in an overlap region
   *
   * @param leftChannel - Left channel samples
   * @param rightChannel - Right channel samples
   * @param searchStart - Start of search region (sample index)
   * @param searchEnd - End of search region (sample index)
   * @returns Optimal loop point (sample index)
   */
  static findBestLoopPoint(
    leftChannel: Int16Array,
    rightChannel: Int16Array,
    searchStart: number,
    searchEnd: number
  ): number {
    console.log(`[LoopPointFinder] Searching for loop point between samples ${searchStart} and ${searchEnd}`);

    // Start search from the ideal musical boundary (searchStart)
    // Look for zero-crossings in both channels within a small window
    const windowSize = Math.min(1000, searchEnd - searchStart); // Search within 1000 samples

    let bestCandidate = searchStart;
    let bestScore = Infinity;

    for (let i = searchStart; i < searchStart + windowSize && i < searchEnd - 1; i++) {
      // Check for zero-crossings in both channels
      const leftZeroCrossing = this.isZeroCrossing(leftChannel[i], leftChannel[i + 1]);
      const rightZeroCrossing = this.isZeroCrossing(rightChannel[i], rightChannel[i + 1]);

      // Score this position (lower is better)
      let score = 0;

      // Prefer positions where both channels cross zero
      if (leftZeroCrossing && rightZeroCrossing) {
        score = 0; // Perfect candidate
      } else if (leftZeroCrossing || rightZeroCrossing) {
        score = 10; // Good candidate (one channel crosses)
      } else {
        // Score based on amplitude (prefer low amplitude)
        const leftAmp = Math.abs(leftChannel[i]);
        const rightAmp = Math.abs(rightChannel[i]);
        score = 100 + (leftAmp + rightAmp) / 2;
      }

      // Prefer positions closer to the start (musical boundary)
      const distancePenalty = (i - searchStart) * 0.1;
      score += distancePenalty;

      if (score < bestScore) {
        bestScore = score;
        bestCandidate = i;
      }

      // Early exit if we found a perfect zero-crossing in both channels
      if (score === 0) {
        break;
      }
    }

    const leftAmp = Math.abs(leftChannel[bestCandidate]);
    const rightAmp = Math.abs(rightChannel[bestCandidate]);
    console.log(`[LoopPointFinder] Found loop point at sample ${bestCandidate} (score: ${bestScore.toFixed(2)}, amps: L=${leftAmp}, R=${rightAmp})`);

    return bestCandidate;
  }

  /**
   * Check if there's a zero-crossing between two samples
   */
  private static isZeroCrossing(sample1: number, sample2: number): boolean {
    // Zero-crossing occurs when sign changes
    return (sample1 >= 0 && sample2 < 0) || (sample1 < 0 && sample2 >= 0);
  }

  /**
   * Find zero-crossing closest to a target position
   *
   * @param samples - Audio samples to search
   * @param targetPos - Ideal position to start search
   * @param maxDistance - Maximum distance to search (default: 500 samples)
   * @returns Sample index of nearest zero-crossing
   */
  static findNearestZeroCrossing(
    samples: Int16Array,
    targetPos: number,
    maxDistance: number = 500
  ): number {
    // Search forward and backward from target
    let forwardDist = 0;
    let backwardDist = 0;

    while (forwardDist < maxDistance || backwardDist < maxDistance) {
      // Check forward
      if (forwardDist < maxDistance) {
        const idx = targetPos + forwardDist;
        if (idx < samples.length - 1 && this.isZeroCrossing(samples[idx], samples[idx + 1])) {
          return idx;
        }
        forwardDist++;
      }

      // Check backward
      if (backwardDist < maxDistance) {
        const idx = targetPos - backwardDist;
        if (idx >= 0 && idx < samples.length - 1 && this.isZeroCrossing(samples[idx], samples[idx + 1])) {
          return idx;
        }
        backwardDist++;
      }
    }

    // No zero-crossing found, return target position
    console.warn(`[LoopPointFinder] No zero-crossing found within ${maxDistance} samples of ${targetPos}`);
    return targetPos;
  }
}
