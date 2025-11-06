/**
 * WAVEncoder - Encode PCM samples to WAV file format
 * Generates standard WAV file with RIFF header
 */
export class WAVEncoder {
  /**
   * Encode stereo PCM samples to WAV format
   * @param leftChannel - Left channel samples (Int16Array)
   * @param rightChannel - Right channel samples (Int16Array)
   * @param sampleRate - Sample rate in Hz (default: 49716)
   * @returns ArrayBuffer containing complete WAV file
   */
  static encode(
    leftChannel: Int16Array,
    rightChannel: Int16Array,
    sampleRate: number = 49716
  ): ArrayBuffer {
    const numChannels = 2;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const numSamples = leftChannel.length;
    const dataSize = numSamples * blockAlign;
    const fileSize = 44 + dataSize; // 44 bytes header + data

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
   * Write ASCII string to DataView
   */
  private static writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }
}
