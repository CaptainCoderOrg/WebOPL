/**
 * Audio format constants used throughout the application
 */

// WAV file format constants
export const WAV_HEADER_SIZE = 44; // Bytes in standard WAV header
export const MAX_WAV_FILE_SIZE = 4294967295; // 2^32 - 1 bytes (4GB limit)
export const WARNING_FILE_SIZE = 500 * 1024 * 1024; // 500MB warning threshold

// PCM format constants
export const INT16_MAX = 32767; // Maximum value for 16-bit signed integer
export const INT16_MIN = -32768; // Minimum value for 16-bit signed integer
export const BYTES_PER_SAMPLE_16BIT = 2; // Bytes per sample for 16-bit audio
export const STEREO_CHANNELS = 2; // Number of channels in stereo audio

// OPL3 constants
export const SAMPLE_RATE = 49716; // OPL3 native sample rate

// Processing thresholds
export const CLIPPING_WARNING_THRESHOLD = 0.01; // Warn if >1% of samples clip
