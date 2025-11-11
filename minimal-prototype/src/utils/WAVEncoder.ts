/**
 * WAVEncoder - Encode PCM samples to WAV file format
 * Generates standard WAV file with RIFF header
 * Supports SMPL chunk for loop point metadata
 */

import {
  MAX_WAV_FILE_SIZE,
  WAV_HEADER_SIZE,
  WARNING_FILE_SIZE,
} from '../constants/audioConstants';

export class WAVEncoder {
  /**
   * Encode stereo PCM samples to WAV format
   *
   * @param leftChannel - Left channel samples (Int16Array)
   * @param rightChannel - Right channel samples (Int16Array)
   * @param sampleRate - Sample rate in Hz (default: 49716)
   * @returns ArrayBuffer containing complete WAV file
   * @throws Error if file would exceed 4GB WAV format limit or channels don't match
   */
  static encode(
    leftChannel: Int16Array,
    rightChannel: Int16Array,
    sampleRate: number = 49716
  ): ArrayBuffer {
    // Validate channels match
    if (leftChannel.length !== rightChannel.length) {
      throw new Error(
        `Channel length mismatch: left=${leftChannel.length}, right=${rightChannel.length}`
      );
    }

    const numChannels = 2;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const numSamples = leftChannel.length;
    const dataSize = numSamples * blockAlign;
    const fileSize = WAV_HEADER_SIZE + dataSize;

    // Check WAV file size limit (4GB)
    if (fileSize > MAX_WAV_FILE_SIZE) {
      const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
      const maxSizeMB = (MAX_WAV_FILE_SIZE / (1024 * 1024)).toFixed(2);
      const durationSeconds = (numSamples / sampleRate).toFixed(1);

      throw new Error(
        `WAV file too large: ${fileSizeMB} MB exceeds ${maxSizeMB} MB limit. ` +
        `Duration: ${durationSeconds}s. Try reducing loop count.`
      );
    }

    // Check for reasonable file size warning threshold (500MB)
    if (fileSize > WARNING_FILE_SIZE) {
      const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
      console.warn(
        `[WAVEncoder] Large file warning: ${fileSizeMB} MB. ` +
        `Consider reducing loop count for better performance.`
      );
    }

    // Create buffer for entire WAV file
    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    // Write RIFF header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, fileSize - 8, true); // File size - 8
    this.writeString(view, 8, 'WAVE');

    // Write fmt chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // Audio format (1 = PCM)
    view.setUint16(22, numChannels, true); // Number of channels
    view.setUint32(24, sampleRate, true); // Sample rate
    view.setUint32(28, sampleRate * blockAlign, true); // Byte rate
    view.setUint16(32, blockAlign, true); // Block align
    view.setUint16(34, bitsPerSample, true); // Bits per sample

    // Write data chunk header
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true); // Data size

    // Write interleaved stereo PCM data
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      view.setInt16(offset, leftChannel[i], true);
      offset += 2;
      view.setInt16(offset, rightChannel[i], true);
      offset += 2;
    }

    return buffer;
  }

  /**
   * Encode stereo PCM samples to WAV format with loop points (SMPL chunk)
   * @param leftChannel - Left channel samples (Int16Array)
   * @param rightChannel - Right channel samples (Int16Array)
   * @param sampleRate - Sample rate in Hz (default: 49716)
   * @param loopStart - Loop start position in samples
   * @param loopEnd - Loop end position in samples
   * @returns ArrayBuffer containing WAV file with SMPL chunk
   */
  static encodeWithLoop(
    leftChannel: Int16Array,
    rightChannel: Int16Array,
    sampleRate: number = 49716,
    loopStart: number = 0,
    loopEnd: number = 0
  ): ArrayBuffer {
    const numChannels = 2;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const numSamples = leftChannel.length;
    const dataSize = numSamples * blockAlign;
    const smplChunkSize = 60; // SMPL chunk with one loop
    const fileSize = 44 + dataSize + 8 + smplChunkSize; // headers + data + smpl chunk

    // Create buffer for entire WAV file
    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    // Write RIFF header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, fileSize - 8, true); // File size - 8
    this.writeString(view, 8, 'WAVE');

    // Write fmt chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // Audio format (1 = PCM)
    view.setUint16(22, numChannels, true); // Number of channels
    view.setUint32(24, sampleRate, true); // Sample rate
    view.setUint32(28, sampleRate * blockAlign, true); // Byte rate
    view.setUint16(32, blockAlign, true); // Block align
    view.setUint16(34, bitsPerSample, true); // Bits per sample

    // Write data chunk header
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true); // Data size

    // Write interleaved stereo PCM data
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      view.setInt16(offset, leftChannel[i], true);
      offset += 2;
      view.setInt16(offset, rightChannel[i], true);
      offset += 2;
    }

    // Write SMPL chunk
    const smplOffset = 44 + dataSize;
    this.writeString(view, smplOffset, 'smpl');
    view.setUint32(smplOffset + 4, smplChunkSize, true); // Chunk size (minus 8)

    // SMPL chunk data
    view.setUint32(smplOffset + 8, 0, true);   // Manufacturer
    view.setUint32(smplOffset + 12, 0, true);  // Product
    view.setUint32(smplOffset + 16, Math.floor(1000000000 / sampleRate), true); // Sample period (nanoseconds)
    view.setUint32(smplOffset + 20, 60, true); // MIDI unity note (middle C)
    view.setUint32(smplOffset + 24, 0, true);  // MIDI pitch fraction
    view.setUint32(smplOffset + 28, 0, true);  // SMPTE format
    view.setUint32(smplOffset + 32, 0, true);  // SMPTE offset
    view.setUint32(smplOffset + 36, 1, true);  // Num sample loops (1)
    view.setUint32(smplOffset + 40, 0, true);  // Sampler data

    // Sample loop data
    view.setUint32(smplOffset + 44, 0, true);  // Cue point ID
    view.setUint32(smplOffset + 48, 0, true);  // Type (0 = forward loop)
    view.setUint32(smplOffset + 52, loopStart, true); // Start sample
    view.setUint32(smplOffset + 56, loopEnd, true);   // End sample
    view.setUint32(smplOffset + 60, 0, true);  // Fraction
    view.setUint32(smplOffset + 64, 0, true);  // Play count (0 = infinite)

    console.log(`[WAVEncoder] SMPL chunk: loop ${loopStart} -> ${loopEnd} samples`);

    return buffer;
  }

  /**
   * Write ASCII string to DataView
   */
  private static writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }
}
