/**
 * Sound Blaster 16 Audio Filter
 * Emulates the analog output stage of Creative Labs Sound Blaster 16
 *
 * Filter Chain:
 * 1. High-shelf filter (-2 dB @ 8 kHz) for analog warmth
 * 2. Low-pass filter (cutoff @ 16 kHz) for anti-aliasing
 * 3. Optional subtle saturation for analog character
 *
 * Based on Audio EQ Cookbook by Robert Bristow-Johnson
 */

export class SB16Filter {
  private sampleRate: number;

  // High-shelf filter state (for analog warmth)
  private hsA1: number = 0;
  private hsA2: number = 0;
  private hsB0: number = 0;
  private hsB1: number = 0;
  private hsB2: number = 0;
  private hsX1L: number = 0;
  private hsX2L: number = 0;
  private hsY1L: number = 0;
  private hsY2L: number = 0;
  private hsX1R: number = 0;
  private hsX2R: number = 0;
  private hsY1R: number = 0;
  private hsY2R: number = 0;

  // Low-pass filter state (for anti-aliasing)
  private lpA1: number = 0;
  private lpA2: number = 0;
  private lpB0: number = 0;
  private lpB1: number = 0;
  private lpB2: number = 0;
  private lpX1L: number = 0;
  private lpX2L: number = 0;
  private lpY1L: number = 0;
  private lpY2L: number = 0;
  private lpX1R: number = 0;
  private lpX2R: number = 0;
  private lpY1R: number = 0;
  private lpY2R: number = 0;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.calculateCoefficients();
  }

  /**
   * Calculate biquad filter coefficients
   * Based on Audio EQ Cookbook by Robert Bristow-Johnson
   */
  private calculateCoefficients(): void {
    // High-shelf filter: -2 dB @ 8000 Hz, Q = 0.707
    this.calculateHighShelfCoefficients(8000, 0.707, -2);

    // Low-pass filter: Cutoff @ 16000 Hz, Q = 0.707
    this.calculateLowPassCoefficients(16000, 0.707);
  }

  /**
   * Calculate high-shelf filter coefficients
   * @param freq Shelf frequency in Hz
   * @param q Q factor (0.707 = Butterworth)
   * @param gainDB Gain in dB (negative = attenuation)
   */
  private calculateHighShelfCoefficients(freq: number, q: number, gainDB: number): void {
    const w0 = (2 * Math.PI * freq) / this.sampleRate;
    const cosW0 = Math.cos(w0);
    const sinW0 = Math.sin(w0);
    const A = Math.pow(10, gainDB / 40); // Amplitude
    const beta = Math.sqrt(A) / q;

    // Coefficients
    const b0 = A * ((A + 1) + (A - 1) * cosW0 + beta * sinW0);
    const b1 = -2 * A * ((A - 1) + (A + 1) * cosW0);
    const b2 = A * ((A + 1) + (A - 1) * cosW0 - beta * sinW0);
    const a0 = (A + 1) - (A - 1) * cosW0 + beta * sinW0;
    const a1 = 2 * ((A - 1) - (A + 1) * cosW0);
    const a2 = (A + 1) - (A - 1) * cosW0 - beta * sinW0;

    // Normalize
    this.hsB0 = b0 / a0;
    this.hsB1 = b1 / a0;
    this.hsB2 = b2 / a0;
    this.hsA1 = a1 / a0;
    this.hsA2 = a2 / a0;
  }

  /**
   * Calculate low-pass filter coefficients
   * @param freq Cutoff frequency in Hz
   * @param q Q factor (0.707 = Butterworth)
   */
  private calculateLowPassCoefficients(freq: number, q: number): void {
    const w0 = (2 * Math.PI * freq) / this.sampleRate;
    const cosW0 = Math.cos(w0);
    const sinW0 = Math.sin(w0);
    const alpha = sinW0 / (2 * q);

    // Coefficients
    const b0 = (1 - cosW0) / 2;
    const b1 = 1 - cosW0;
    const b2 = (1 - cosW0) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cosW0;
    const a2 = 1 - alpha;

    // Normalize
    this.lpB0 = b0 / a0;
    this.lpB1 = b1 / a0;
    this.lpB2 = b2 / a0;
    this.lpA1 = a1 / a0;
    this.lpA2 = a2 / a0;
  }

  /**
   * Process stereo audio buffer
   * @param leftChannel Input left channel samples
   * @param rightChannel Input right channel samples
   * @returns Filtered stereo output
   */
  processStereo(leftChannel: Float32Array, rightChannel: Float32Array): {
    left: Float32Array;
    right: Float32Array;
  } {
    const outputLeft = new Float32Array(leftChannel.length);
    const outputRight = new Float32Array(rightChannel.length);

    for (let i = 0; i < leftChannel.length; i++) {
      // Process left channel
      outputLeft[i] = this.processSampleLeft(leftChannel[i]);

      // Process right channel
      outputRight[i] = this.processSampleRight(rightChannel[i]);
    }

    return { left: outputLeft, right: outputRight };
  }

  /**
   * Process single sample (left channel)
   */
  private processSampleLeft(input: number): number {
    // Stage 1: High-shelf filter (analog warmth)
    const hs = this.hsB0 * input + this.hsB1 * this.hsX1L + this.hsB2 * this.hsX2L
              - this.hsA1 * this.hsY1L - this.hsA2 * this.hsY2L;

    this.hsX2L = this.hsX1L;
    this.hsX1L = input;
    this.hsY2L = this.hsY1L;
    this.hsY1L = hs;

    // Stage 2: Low-pass filter (anti-aliasing)
    const lp = this.lpB0 * hs + this.lpB1 * this.lpX1L + this.lpB2 * this.lpX2L
              - this.lpA1 * this.lpY1L - this.lpA2 * this.lpY2L;

    this.lpX2L = this.lpX1L;
    this.lpX1L = hs;
    this.lpY2L = this.lpY1L;
    this.lpY1L = lp;

    // Stage 3: Subtle saturation (optional)
    return this.softClip(lp);
  }

  /**
   * Process single sample (right channel)
   */
  private processSampleRight(input: number): number {
    // Stage 1: High-shelf filter (analog warmth)
    const hs = this.hsB0 * input + this.hsB1 * this.hsX1R + this.hsB2 * this.hsX2R
              - this.hsA1 * this.hsY1R - this.hsA2 * this.hsY2R;

    this.hsX2R = this.hsX1R;
    this.hsX1R = input;
    this.hsY2R = this.hsY1R;
    this.hsY1R = hs;

    // Stage 2: Low-pass filter (anti-aliasing)
    const lp = this.lpB0 * hs + this.lpB1 * this.lpX1R + this.lpB2 * this.lpX2R
              - this.lpA1 * this.lpY1R - this.lpA2 * this.lpY2R;

    this.lpX2R = this.lpX1R;
    this.lpX1R = hs;
    this.lpY2R = this.lpY1R;
    this.lpY1R = lp;

    // Stage 3: Subtle saturation (optional)
    return this.softClip(lp);
  }

  /**
   * Soft clipping for subtle analog saturation
   * Uses tanh curve for smooth distortion
   */
  private softClip(input: number): number {
    const threshold = 0.95;
    const amount = 0.1; // Very subtle

    if (Math.abs(input) < threshold) {
      return input; // No clipping
    }

    // Soft clip using tanh
    return Math.tanh(input * (1 + amount));
  }

  /**
   * Reset filter state (call when starting new audio)
   */
  reset(): void {
    this.hsX1L = this.hsX2L = this.hsY1L = this.hsY2L = 0;
    this.hsX1R = this.hsX2R = this.hsY1R = this.hsY2R = 0;
    this.lpX1L = this.lpX2L = this.lpY1L = this.lpY2L = 0;
    this.lpX1R = this.lpX2R = this.lpY1R = this.lpY2R = 0;
  }
}
