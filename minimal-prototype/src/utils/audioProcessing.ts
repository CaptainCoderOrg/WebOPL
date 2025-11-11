/**
 * Audio Processing Utilities
 * Functions for post-processing audio buffers
 */

// WAV file format constants
const WAV_HEADER_SIZE = 44; // Bytes in standard WAV header
const INT16_MAX = 32767;    // Maximum value for 16-bit signed integer
const INT16_MIN = -32768;   // Minimum value for 16-bit signed integer

// Processing constants
const CLIPPING_WARNING_THRESHOLD = 0.01; // Warn if >1% of samples clip

/**
 * Normalize audio to a target dB level
 *
 * Finds the peak amplitude in the audio and applies gain to reach
 * the target dB level (relative to full scale).
 *
 * @param wavBuffer - Input WAV file as ArrayBuffer
 * @param targetDb - Target peak level in dB (e.g., -1.0 for -1 dB)
 * @returns Normalized WAV file as ArrayBuffer
 */
export function normalizeAudio(wavBuffer: ArrayBuffer, targetDb: number): ArrayBuffer {
  // Parse WAV header
  const dataView = new DataView(wavBuffer);

  // Read header information
  const subchunk2Size = dataView.getUint32(40, true);
  const bitsPerSample = dataView.getUint16(34, true);

  // Calculate total samples
  const bytesPerSample = bitsPerSample / 8;
  const totalSamples = subchunk2Size / bytesPerSample;

  // Find peak amplitude in the audio data
  let peakAmplitude = 0;
  for (let i = 0; i < totalSamples; i++) {
    const offset = WAV_HEADER_SIZE + i * bytesPerSample;
    const sample = dataView.getInt16(offset, true);
    const absValue = Math.abs(sample);
    if (absValue > peakAmplitude) {
      peakAmplitude = absValue;
    }
  }

  // If audio is silent, return original
  if (peakAmplitude === 0) {
    console.warn('[normalizeAudio] Audio is silent, skipping normalization');
    return wavBuffer;
  }

  // Calculate normalization factor
  // Convert target dB to linear scale
  const targetLinear = Math.pow(10, targetDb / 20);
  const targetPeak = INT16_MAX * targetLinear;
  const normalizationFactor = targetPeak / peakAmplitude;

  console.log(
    `[normalizeAudio] Peak: ${peakAmplitude}, ` +
    `Target: ${targetPeak.toFixed(0)}, ` +
    `Factor: ${normalizationFactor.toFixed(3)}`
  );

  // Clone entire buffer at once (much faster than byte-by-byte)
  const newBuffer = wavBuffer.slice(0);
  const newDataView = new DataView(newBuffer);

  // Apply normalization to audio data (header is already copied)
  let clippedSamples = 0;
  for (let i = 0; i < totalSamples; i++) {
    const offset = WAV_HEADER_SIZE + i * bytesPerSample;
    const sample = dataView.getInt16(offset, true);
    const normalizedSample = Math.round(sample * normalizationFactor);

    // Clamp to prevent overflow
    const clampedSample = Math.max(INT16_MIN, Math.min(INT16_MAX, normalizedSample));

    if (normalizedSample !== clampedSample) {
      clippedSamples++;
    }

    newDataView.setInt16(offset, clampedSample, true);
  }

  // Warn if significant clipping occurred
  if (clippedSamples > totalSamples * CLIPPING_WARNING_THRESHOLD) {
    console.warn(
      `[normalizeAudio] ${clippedSamples} samples clipped ` +
      `(${(clippedSamples/totalSamples*100).toFixed(2)}%). ` +
      `Consider lower target dB.`
    );
  }

  return newBuffer;
}

/**
 * Apply fade in and/or fade out to audio
 *
 * Applies linear fades to the audio. Fade in goes from 0 to 1,
 * fade out goes from 1 to 0.
 *
 * @param wavBuffer - Input WAV file as ArrayBuffer
 * @param fadeInMs - Fade in duration in milliseconds (0 to skip)
 * @param fadeOutMs - Fade out duration in milliseconds (0 to skip)
 * @returns WAV file with fades applied as ArrayBuffer
 */
export function applyFades(
  wavBuffer: ArrayBuffer,
  fadeInMs: number,
  fadeOutMs: number
): ArrayBuffer {
  // Parse WAV header
  const dataView = new DataView(wavBuffer);

  // Read header information
  const sampleRate = dataView.getUint32(24, true);
  const subchunk2Size = dataView.getUint32(40, true);
  const bitsPerSample = dataView.getUint16(34, true);
  const numChannels = dataView.getUint16(22, true);

  // Calculate total samples (per channel)
  const bytesPerSample = bitsPerSample / 8;
  const totalSamplesPerChannel = subchunk2Size / (bytesPerSample * numChannels);

  // Convert fade durations to samples
  const fadeInSamples = Math.floor((fadeInMs / 1000) * sampleRate);
  const fadeOutSamples = Math.floor((fadeOutMs / 1000) * sampleRate);

  console.log(
    `[applyFades] Fade in: ${fadeInSamples} samples, ` +
    `Fade out: ${fadeOutSamples} samples, ` +
    `Total: ${totalSamplesPerChannel} samples`
  );

  // Clone entire buffer at once (much faster than byte-by-byte)
  const newBuffer = wavBuffer.slice(0);
  const newDataView = new DataView(newBuffer);

  // Apply fades to audio data (header is already copied)
  for (let i = 0; i < totalSamplesPerChannel; i++) {
    let gain = 1.0;

    // Apply fade in
    if (fadeInSamples > 0 && i < fadeInSamples) {
      gain *= i / fadeInSamples;
    }

    // Apply fade out
    if (fadeOutSamples > 0 && i >= totalSamplesPerChannel - fadeOutSamples) {
      const fadeOutProgress = (totalSamplesPerChannel - i) / fadeOutSamples;
      gain *= fadeOutProgress;
    }

    // Apply gain to all channels
    for (let ch = 0; ch < numChannels; ch++) {
      const offset = WAV_HEADER_SIZE + (i * numChannels + ch) * bytesPerSample;
      const sample = dataView.getInt16(offset, true);
      const fadedSample = Math.round(sample * gain);

      // Clamp to prevent overflow
      const clampedSample = Math.max(INT16_MIN, Math.min(INT16_MAX, fadedSample));

      newDataView.setInt16(offset, clampedSample, true);
    }
  }

  return newBuffer;
}
