/**
 * Waveform Generator
 * Creates downsampled waveform data for visualization
 */

/**
 * Generate waveform data from WAV ArrayBuffer
 * Uses peak/RMS sampling for better visual representation
 */
export function generateWaveformFromWAV(
  wavBuffer: ArrayBuffer,
  targetPoints: number = 1000
): number[] {
  // WAV header is 44 bytes, then 16-bit stereo PCM data follows
  const dataView = new DataView(wavBuffer);
  const headerSize = 44;

  // Calculate total number of samples (stereo pairs)
  const totalBytes = wavBuffer.byteLength - headerSize;
  const samplesPerChannel = totalBytes / 4; // 2 bytes per sample, 2 channels

  // Calculate how many samples per point
  const samplesPerPoint = Math.floor(samplesPerChannel / targetPoints);

  const waveform: number[] = [];

  for (let i = 0; i < targetPoints; i++) {
    const startSample = i * samplesPerPoint;
    const endSample = Math.min((i + 1) * samplesPerPoint, samplesPerChannel);

    let maxAmplitude = 0;

    // Find peak amplitude in this segment (mono mix of stereo)
    for (let j = startSample; j < endSample; j++) {
      const offset = headerSize + j * 4;

      // Read left and right channels (16-bit signed integers)
      const left = dataView.getInt16(offset, true);
      const right = dataView.getInt16(offset + 2, true);

      // Mix to mono and normalize to 0-1 range
      const mono = (Math.abs(left) + Math.abs(right)) / 2 / 32768;

      maxAmplitude = Math.max(maxAmplitude, mono);
    }

    waveform.push(maxAmplitude);
  }

  return waveform;
}
