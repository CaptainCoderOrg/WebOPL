/**
 * MIDI to WebOrchestra Pattern Converter
 *
 * Converts Standard MIDI Files (.mid) to WebOrchestra pattern format (.yaml)
 *
 * Usage:
 *   node convertMIDIToPattern.js input.mid output.yaml
 *   node convertMIDIToPattern.js input.mid output.yaml --tempo 140
 *
 * The converter will:
 * - Parse MIDI events (note on/off, tempo, program changes)
 * - Convert to tracker rows with appropriate note strings
 * - Map MIDI channels to tracker tracks
 * - Calculate timing based on MIDI ticks and tempo
 * - Detect MIDI channel 10 as percussion and assign Percussion Kit (ID 999)
 * - Support pitched percussion instruments on other channels
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse a Standard MIDI File
 */
function parseMIDI(buffer) {
  let offset = 0;

  // Read header chunk
  const headerMagic = buffer.toString('ascii', offset, offset + 4);
  if (headerMagic !== 'MThd') {
    throw new Error('Invalid MIDI file: missing MThd header');
  }
  offset += 4;

  const headerLength = buffer.readUInt32BE(offset);
  offset += 4;

  const format = buffer.readUInt16BE(offset);
  offset += 2;

  const trackCount = buffer.readUInt16BE(offset);
  offset += 2;

  const division = buffer.readUInt16BE(offset);
  offset += 2;

  // Calculate ticks per quarter note
  let ticksPerQuarterNote;
  if ((division & 0x8000) === 0) {
    // Ticks per quarter note
    ticksPerQuarterNote = division;
  } else {
    // SMPTE format (not commonly used)
    const framesPerSecond = -(division >> 8);
    const ticksPerFrame = division & 0xFF;
    ticksPerQuarterNote = framesPerSecond * ticksPerFrame;
  }

  console.log(`MIDI Format: ${format}`);
  console.log(`Tracks: ${trackCount}`);
  console.log(`Ticks per quarter note: ${ticksPerQuarterNote}`);

  // Parse tracks
  const tracks = [];
  for (let i = 0; i < trackCount; i++) {
    const track = parseTrack(buffer, offset);
    tracks.push(track);
    offset = track.nextOffset;
  }

  return {
    format,
    trackCount,
    ticksPerQuarterNote,
    tracks
  };
}

/**
 * Parse a MIDI track
 */
function parseTrack(buffer, offset) {
  const trackMagic = buffer.toString('ascii', offset, offset + 4);
  if (trackMagic !== 'MTrk') {
    throw new Error('Invalid MIDI track: missing MTrk header');
  }
  offset += 4;

  const trackLength = buffer.readUInt32BE(offset);
  offset += 4;

  const trackEnd = offset + trackLength;
  const events = [];
  let runningStatus = 0;

  while (offset < trackEnd) {
    // Read delta time (variable length)
    const deltaTime = readVariableLength(buffer, offset);
    offset = deltaTime.nextOffset;

    // Read event
    let statusByte = buffer.readUInt8(offset);

    // Handle running status
    if ((statusByte & 0x80) === 0) {
      // This is a data byte, use running status
      statusByte = runningStatus;
    } else {
      offset++;
      runningStatus = statusByte;
    }

    const eventType = statusByte & 0xF0;
    const channel = statusByte & 0x0F;

    let event = {
      deltaTime: deltaTime.value,
      type: eventType,
      channel: channel
    };

    // Parse event data
    if (eventType === 0x80 || eventType === 0x90) {
      // Note Off / Note On
      const note = buffer.readUInt8(offset++);
      const velocity = buffer.readUInt8(offset++);
      event.note = note;
      event.velocity = velocity;
      event.eventName = eventType === 0x80 ? 'noteOff' : (velocity === 0 ? 'noteOff' : 'noteOn');
    } else if (eventType === 0xA0) {
      // Polyphonic Key Pressure
      offset += 2;
    } else if (eventType === 0xB0) {
      // Control Change
      const controller = buffer.readUInt8(offset++);
      const value = buffer.readUInt8(offset++);
      event.controller = controller;
      event.value = value;
      event.eventName = 'controlChange';
    } else if (eventType === 0xC0) {
      // Program Change
      const program = buffer.readUInt8(offset++);
      event.program = program;
      event.eventName = 'programChange';
    } else if (eventType === 0xD0) {
      // Channel Pressure
      offset += 1;
    } else if (eventType === 0xE0) {
      // Pitch Bend
      const lsb = buffer.readUInt8(offset++);
      const msb = buffer.readUInt8(offset++);
      event.value = (msb << 7) | lsb;
      event.eventName = 'pitchBend';
    } else if (statusByte === 0xFF) {
      // Meta event
      const metaType = buffer.readUInt8(offset++);
      const length = readVariableLength(buffer, offset);
      offset = length.nextOffset;

      event.eventName = 'meta';
      event.metaType = metaType;

      if (metaType === 0x51) {
        // Set Tempo
        const tempo = (buffer.readUInt8(offset) << 16) |
                     (buffer.readUInt8(offset + 1) << 8) |
                     buffer.readUInt8(offset + 2);
        event.tempo = tempo; // Microseconds per quarter note
        event.bpm = Math.round(60000000 / tempo);
      } else if (metaType === 0x2F) {
        // End of Track
        event.eventName = 'endOfTrack';
      }

      offset += length.value;
    } else if (statusByte === 0xF0 || statusByte === 0xF7) {
      // SysEx event
      const length = readVariableLength(buffer, offset);
      offset = length.nextOffset + length.value;
    }

    events.push(event);
  }

  return {
    events,
    nextOffset: offset
  };
}

/**
 * Read variable-length quantity (MIDI format)
 */
function readVariableLength(buffer, offset) {
  let value = 0;
  let byte;

  do {
    byte = buffer.readUInt8(offset++);
    value = (value << 7) | (byte & 0x7F);
  } while (byte & 0x80);

  return { value, nextOffset: offset };
}

/**
 * Convert MIDI to WebOrchestra pattern
 */
function midiToPattern(midiData, options = {}) {
  const {
    rowsPerBeat = 4,
    maxChannels = 16,
    defaultTempo = 120,
    percussionChannel = 9, // MIDI channel 10 (0-indexed as 9)
    percussionKitId = 999  // ID of the Percussion Kit instrument
  } = options;

  // Merge all tracks into a single timeline
  const timeline = [];
  let globalTempo = defaultTempo;

  for (let trackIndex = 0; trackIndex < midiData.tracks.length; trackIndex++) {
    const track = midiData.tracks[trackIndex];
    let absoluteTime = 0;

    for (const event of track.events) {
      absoluteTime += event.deltaTime;

      timeline.push({
        time: absoluteTime,
        trackIndex,
        ...event
      });

      // Update global tempo from meta events
      if (event.eventName === 'meta' && event.metaType === 0x51) {
        globalTempo = event.bpm;
      }
    }
  }

  // Sort by time
  timeline.sort((a, b) => a.time - b.time);

  // Convert to rows
  const ticksPerRow = midiData.ticksPerQuarterNote / rowsPerBeat;
  const rows = [];
  const channelState = {}; // Track active notes and instruments per channel

  let currentRow = 0;
  let lastRowTime = 0;

  for (const event of timeline) {
    const rowTime = Math.round(event.time / ticksPerRow);

    // Create empty rows up to current event
    while (currentRow < rowTime) {
      if (!rows[currentRow]) {
        rows[currentRow] = createEmptyRow(maxChannels);
      }
      currentRow++;
    }

    // Ensure current row exists
    if (!rows[currentRow]) {
      rows[currentRow] = createEmptyRow(maxChannels);
    }

    const channel = event.channel;
    if (channel >= maxChannels) continue;

    // Initialize channel state
    if (!channelState[channel]) {
      // Check if this is a percussion channel (MIDI channel 10)
      const isPercussionChannel = (channel === percussionChannel);

      channelState[channel] = {
        instrument: isPercussionChannel ? percussionKitId : 0,
        activeNotes: new Map(),
        isPercussionChannel: isPercussionChannel
      };

      if (isPercussionChannel) {
        console.log(`🥁 Detected percussion on MIDI channel ${channel + 1} (0-indexed: ${channel})`);
      }
    }

    // Process event
    if (event.eventName === 'noteOn') {
      rows[currentRow][channel] = {
        note: midiNoteToName(event.note),
        instrument: channelState[channel].instrument,
        volume: Math.round((event.velocity / 127) * 64),
        effect: null,
        effectValue: null
      };
      channelState[channel].activeNotes.set(event.note, currentRow);
    } else if (event.eventName === 'noteOff') {
      // Find the row where this note started
      const startRow = channelState[channel].activeNotes.get(event.note);
      if (startRow !== undefined) {
        // Could add note-off marker here if needed
        channelState[channel].activeNotes.delete(event.note);
      }
    } else if (event.eventName === 'programChange') {
      // Percussion channels (MIDI channel 10) ignore program changes in General MIDI
      if (channelState[channel].isPercussionChannel) {
        console.log(`🥁 Ignoring program change ${event.program} on percussion channel ${channel + 1}`);
        continue;
      }

      // For non-percussion channels, update instrument
      channelState[channel].instrument = event.program;

      // Add program change command to current row
      if (rows[currentRow][channel].note === null) {
        rows[currentRow][channel] = {
          note: null,
          instrument: event.program,
          volume: null,
          effect: 'I',
          effectValue: event.program
        };
      }
    }
  }

  // Convert to pattern format
  return {
    name: 'Converted from MIDI',
    tempo: globalTempo,
    rowsPerBeat: rowsPerBeat,
    channels: maxChannels,
    channelState: channelState, // Include channel state for instrument detection
    rows: rows.filter(row => row !== undefined)
  };
}

/**
 * Create an empty row
 */
function createEmptyRow(channels) {
  const row = [];
  for (let i = 0; i < channels; i++) {
    row.push({
      note: null,
      instrument: null,
      volume: null,
      effect: null,
      effectValue: null
    });
  }
  return row;
}

/**
 * Convert MIDI note number to note name
 */
function midiNoteToName(midiNote) {
  const noteNames = ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-'];
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = noteNames[midiNote % 12];
  return `${noteName}${octave}`;
}

/**
 * Convert pattern to YAML format
 */
function patternToYAML(pattern, filename) {
  const lines = [];

  // Header comments
  lines.push(`# ${pattern.name}`);
  lines.push(`# Converted from MIDI file: ${filename}`);
  lines.push('');

  // Identify which tracks have any notes
  const trackHasNotes = [];
  for (let trackIdx = 0; trackIdx < pattern.channels; trackIdx++) {
    let hasNotes = false;
    for (const row of pattern.rows) {
      if (row[trackIdx].note !== null) {
        hasNotes = true;
        break;
      }
    }
    trackHasNotes.push(hasNotes);
  }

  // Build mapping of old track indices to new track indices
  const trackMapping = [];
  let newTrackIdx = 0;
  for (let oldTrackIdx = 0; oldTrackIdx < pattern.channels; oldTrackIdx++) {
    if (trackHasNotes[oldTrackIdx]) {
      trackMapping[oldTrackIdx] = newTrackIdx;
      newTrackIdx++;
    } else {
      trackMapping[oldTrackIdx] = -1; // Mark as removed
    }
  }

  const activeTrackCount = newTrackIdx;

  // Determine instrument for each active track
  const trackInstruments = [];
  for (let trackIdx = 0; trackIdx < pattern.channels; trackIdx++) {
    if (!trackHasNotes[trackIdx]) continue;

    let instrument = 0; // Default to instrument 0 (Acoustic Grand Piano)

    // Use channelState if available (has instrument info including percussion)
    if (pattern.channelState && pattern.channelState[trackIdx]) {
      instrument = pattern.channelState[trackIdx].instrument;
    } else {
      // Fallback: search through all rows to find the first instrument used on this track
      for (const row of pattern.rows) {
        if (row[trackIdx].instrument !== null) {
          instrument = row[trackIdx].instrument;
          break;
        }
      }
    }

    trackInstruments.push(instrument);
  }

  // Metadata
  lines.push(`name: ${pattern.name}`);
  lines.push(`description: Converted from MIDI`);
  lines.push(`author: MIDI Converter`);
  lines.push(`rows: ${pattern.rows.length}`);
  lines.push(`tracks: ${activeTrackCount}`);
  lines.push(`bpm: ${pattern.tempo}`);
  lines.push('');

  lines.push('# Instrument assignments (patch indices)');

  // Add comment showing percussion tracks
  if (pattern.channelState) {
    const percussionTracks = [];
    let outputTrackIdx = 0;
    for (let trackIdx = 0; trackIdx < pattern.channels; trackIdx++) {
      if (!trackHasNotes[trackIdx]) continue;
      if (pattern.channelState[trackIdx]?.isPercussionChannel) {
        percussionTracks.push(outputTrackIdx);
      }
      outputTrackIdx++;
    }
    if (percussionTracks.length > 0) {
      lines.push(`# Note: Track(s) ${percussionTracks.join(', ')} use Percussion Kit (ID 999)`);
    }
  }

  lines.push(`instruments: [${trackInstruments.join(', ')}]`);
  lines.push('');

  // Pattern data
  lines.push('# Pattern data');
  lines.push('pattern:');

  for (let rowIdx = 0; rowIdx < pattern.rows.length; rowIdx++) {
    const row = pattern.rows[rowIdx];
    const notes = [];

    // Only include notes from active tracks
    for (let trackIdx = 0; trackIdx < pattern.channels; trackIdx++) {
      if (trackHasNotes[trackIdx]) {
        notes.push(row[trackIdx].note || '---');
      }
    }

    const notesStr = notes.map(n => `"${n}"`).join(', ');
    lines.push(`  - [${notesStr}]`);
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node convertMIDIToPattern.js <input.mid> <output.yaml> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --tempo <bpm>        Default tempo if not specified in MIDI (default: 120)');
    console.log('  --rows-per-beat <n>  Number of rows per beat (default: 4)');
    console.log('  --tracks <n>         Maximum number of tracks (default: 16)');
    process.exit(1);
  }

  const inputPath = args[0];
  const outputPath = args[1];

  // Parse options
  const options = {
    defaultTempo: 120,
    rowsPerBeat: 4,
    maxChannels: 16
  };

  for (let i = 2; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];

    if (flag === '--tempo') options.defaultTempo = parseInt(value);
    if (flag === '--rows-per-beat') options.rowsPerBeat = parseInt(value);
    if (flag === '--tracks') options.maxChannels = parseInt(value);
  }

  console.log('🎵 MIDI to WebOrchestra Pattern Converter');
  console.log('==========================================\n');

  // Read MIDI file
  console.log(`📖 Reading MIDI file: ${inputPath}`);
  const buffer = fs.readFileSync(inputPath);
  const filename = path.basename(inputPath);

  // Parse MIDI
  console.log('🔍 Parsing MIDI data...');
  const midiData = parseMIDI(buffer);

  // Convert to pattern
  console.log('🔄 Converting to pattern format...');
  const pattern = midiToPattern(midiData, options);

  console.log(`✓ Converted to ${pattern.rows.length} rows`);
  console.log(`✓ Tempo: ${pattern.tempo} BPM`);
  console.log(`✓ Tracks: ${pattern.channels}`);

  // Convert to YAML
  console.log('📝 Generating YAML...');
  const yaml = patternToYAML(pattern, filename);

  // Write output
  console.log(`💾 Writing pattern: ${outputPath}`);
  fs.writeFileSync(outputPath, yaml);

  console.log('\n✅ Conversion complete!');
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
