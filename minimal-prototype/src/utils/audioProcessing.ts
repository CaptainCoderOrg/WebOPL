/**
 * Audio Processing Utilities
 * Functions for post-processing audio buffers
 */

/**
 * Normalize audio to a target dB level
 * @param wavBuffer - Input WAV file as ArrayBuffer
 * @param targetDb - Target peak level in dB (e.g., -0.1 for near-maximum without clipping)
 * @returns Normalized WAV file as ArrayBuffer
 */
export function normalizeAudio(wavBuffer: ArrayBuffer, targetDb: number): ArrayBuffer {
  // Parse WAV header
  const dataView = new DataView(wavBuffer);
  const headerSize = 44;

  // Read header information
  const subchunk2Size = dataView.getUint32(40, true);
  const bitsPerSample = dataView.getUint16(34, true);

  // Calculate total samples
  const bytesPerSample = bitsPerSample / 8;
  const totalSamples = subchunk2Size / bytesPerSample;

  // Find peak amplitude in the audio data
  let peakAmplitude = 0;
  for (let i = 0; i < totalSamples; i++) {
    const offset = headerSize + i * bytesPerSample;
    const sample = dataView.getInt16(offset, true);
    const absValue = Math.abs(sample);
    if (absValue > peakAmplitude) {
      peakAmplitude = absValue;
    }
  }

  // If audio is silent, return original
  if (peakAmplitude === 0) {
    return wavBuffer;
  }

  // Calculate normalization factor
  // Convert target dB to linear scale
  const targetLinear = Math.pow(10, targetDb / 20);
  const maxValue = 32767; // Max value for 16-bit signed integer
  const targetPeak = maxValue * targetLinear;
  const normalizationFactor = targetPeak / peakAmplitude;

  // Create new buffer with normalized audio
  const newBuffer = new ArrayBuffer(wavBuffer.byteLength);
  const newDataView = new DataView(newBuffer);

  // Copy header
  for (let i = 0; i < headerSize; i++) {
    newDataView.setUint8(i, dataView.getUint8(i));
  }

  // Normalize and copy audio data
  for (let i = 0; i < totalSamples; i++) {
    const offset = headerSize + i * bytesPerSample;
    const sample = dataView.getInt16(offset, true);
    const normalizedSample = Math.round(sample * normalizationFactor);

    // Clamp to prevent overflow
    const clampedSample = Math.max(-32768, Math.min(32767, normalizedSample));

    newDataView.setInt16(offset, clampedSample, true);
  }

  return newBuffer;
}

/**
 * Apply fade in and/or fade out to audio
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
  const headerSize = 44;

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

  // Create new buffer with faded audio
  const newBuffer = new ArrayBuffer(wavBuffer.byteLength);
  const newDataView = new DataView(newBuffer);

  // Copy header
  for (let i = 0; i < headerSize; i++) {
    newDataView.setUint8(i, dataView.getUint8(i));
  }

  // Apply fades to audio data
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
      const offset = headerSize + (i * numChannels + ch) * bytesPerSample;
      const sample = dataView.getInt16(offset, true);
      const fadedSample = Math.round(sample * gain);

      // Clamp to prevent overflow
      const clampedSample = Math.max(-32768, Math.min(32767, fadedSample));

      newDataView.setInt16(offset, clampedSample, true);
    }
  }

  return newBuffer;
}
