#!/usr/bin/env node

/**
 * Analyze MIDI file for polyphony (multiple simultaneous notes per channel)
 *
 * Usage: node analyzePolyphony.js <midi-file>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import MIDI parser from convertMIDIToPattern.js
// (We'll inline it for simplicity)

/**
 * Read variable-length quantity
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
 * Parse MIDI track
 */
function parseTrack(buffer, offset) {
  const trackMagic = buffer.toString('ascii', offset, offset + 4);
  if (trackMagic !== 'MTrk') {
    throw new Error('Invalid MIDI track');
  }
  offset += 4;

  const trackLength = buffer.readUInt32BE(offset);
  offset += 4;

  const trackEnd = offset + trackLength;
  const events = [];
  let runningStatus = 0;

  while (offset < trackEnd) {
    const deltaTime = readVariableLength(buffer, offset);
    offset = deltaTime.nextOffset;

    let statusByte = buffer.readUInt8(offset);

    if ((statusByte & 0x80) === 0) {
      statusByte = runningStatus;
    } else {
      offset++;
      runningStatus = statusByte;
    }

    const eventType = statusByte & 0xF0;
    const channel = statusByte & 0x0F;

    let event = { deltaTime: deltaTime.value, type: eventType, channel };

    if (eventType === 0x80 || eventType === 0x90) {
      const note = buffer.readUInt8(offset++);
      const velocity = buffer.readUInt8(offset++);
      event.note = note;
      event.velocity = velocity;
      event.eventName = eventType === 0x80 ? 'noteOff' : (velocity === 0 ? 'noteOff' : 'noteOn');
    } else if (eventType === 0xA0 || eventType === 0xB0 || eventType === 0xE0) {
      offset += 2;
    } else if (eventType === 0xC0 || eventType === 0xD0) {
      offset += 1;
    } else if (eventType === 0xF0) {
      if (statusByte === 0xFF) {
        const metaType = buffer.readUInt8(offset++);
        const length = readVariableLength(buffer, offset);
        offset = length.nextOffset + length.value;
      } else if (statusByte === 0xF0 || statusByte === 0xF7) {
        const length = readVariableLength(buffer, offset);
        offset = length.nextOffset + length.value;
      }
      continue;
    }

    events.push(event);
  }

  return { events, nextOffset: offset };
}

/**
 * Parse MIDI file
 */
function parseMIDI(buffer) {
  let offset = 0;

  const headerMagic = buffer.toString('ascii', offset, offset + 4);
  if (headerMagic !== 'MThd') {
    throw new Error('Invalid MIDI file');
  }
  offset += 8; // Skip header magic and length

  const format = buffer.readUInt16BE(offset);
  offset += 2;

  const trackCount = buffer.readUInt16BE(offset);
  offset += 2;

  const division = buffer.readUInt16BE(offset);
  offset += 2;

  const ticksPerQuarterNote = (division & 0x8000) === 0 ? division : 480;

  const tracks = [];
  for (let i = 0; i < trackCount; i++) {
    const track = parseTrack(buffer, offset);
    tracks.push(track);
    offset = track.nextOffset;
  }

  return { format, trackCount, ticksPerQuarterNote, tracks };
}

/**
 * Convert MIDI note to name
 */
function midiNoteToName(midiNote) {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = noteNames[midiNote % 12];
  return `${noteName}-${octave}`;
}

/**
 * Main analysis
 */
function analyzeMIDIPolyphony(midiPath) {
  console.log(`\n📊 Polyphony Analysis: ${path.basename(midiPath)}\n`);

  const buffer = fs.readFileSync(midiPath);
  const midiData = parseMIDI(buffer);

  console.log(`Format: ${midiData.format}`);
  console.log(`Tracks: ${midiData.trackCount}`);
  console.log(`Ticks per beat: ${midiData.ticksPerQuarterNote}\n`);

  // Build timeline with absolute timing
  const timeline = [];

  for (let trackIndex = 0; trackIndex < midiData.tracks.length; trackIndex++) {
    const track = midiData.tracks[trackIndex];
    let absoluteTime = 0;

    for (const event of track.events) {
      absoluteTime += event.deltaTime;

      if (event.eventName === 'noteOn') {
        timeline.push({
          time: absoluteTime,
          trackIndex,
          channel: event.channel,
          note: event.note,
          velocity: event.velocity,
          type: 'on'
        });
      } else if (event.eventName === 'noteOff') {
        timeline.push({
          time: absoluteTime,
          trackIndex,
          channel: event.channel,
          note: event.note,
          type: 'off'
        });
      }
    }
  }

  // Sort by time
  timeline.sort((a, b) => a.time - b.time);

  // Track active notes per channel
  const channelState = {};
  const polyphonyEvents = {};

  for (const event of timeline) {
    const channel = event.channel;

    if (!channelState[channel]) {
      channelState[channel] = new Set();
      polyphonyEvents[channel] = [];
    }

    if (event.type === 'on') {
      channelState[channel].add(event.note);

      // Detect polyphony
      if (channelState[channel].size > 1) {
        polyphonyEvents[channel].push({
          time: event.time,
          trackIndex: event.trackIndex,
          notes: Array.from(channelState[channel]),
          count: channelState[channel].size
        });
      }
    } else if (event.type === 'off') {
      channelState[channel].delete(event.note);
    }
  }

  // Report findings
  console.log('═'.repeat(70));
  console.log('🎹 POLYPHONY DETECTION RESULTS\n');
  console.log('═'.repeat(70) + '\n');

  let totalPolyphonicEvents = 0;
  let channelsWithPolyphony = 0;

  for (let channel = 0; channel < 16; channel++) {
    if (!polyphonyEvents[channel] || polyphonyEvents[channel].length === 0) {
      continue;
    }

    channelsWithPolyphony++;
    const events = polyphonyEvents[channel];
    totalPolyphonicEvents += events.length;

    console.log(`📍 MIDI Channel ${channel + 1} (0-indexed: ${channel})`);
    console.log(`   Polyphonic events: ${events.length}`);

    const maxPolyphony = Math.max(...events.map(e => e.count));
    console.log(`   Max simultaneous notes: ${maxPolyphony}`);

    // Show first 5 examples
    console.log(`   Examples (first 5):`);
    for (let i = 0; i < Math.min(5, events.length); i++) {
      const e = events[i];
      const noteNames = e.notes.map(n => midiNoteToName(n)).join(', ');
      console.log(`     Time ${e.time.toString().padStart(6)}: ${e.count} notes [${noteNames}]`);
    }

    if (events.length > 5) {
      console.log(`     ... and ${events.length - 5} more polyphonic events\n`);
    } else {
      console.log('');
    }
  }

  console.log('═'.repeat(70));
  console.log(`📊 SUMMARY\n`);
  console.log(`   Channels with polyphony: ${channelsWithPolyphony}/16`);
  console.log(`   Total polyphonic events: ${totalPolyphonicEvents}`);

  if (totalPolyphonicEvents > 0) {
    console.log(`\n⚠️  WARNING: This MIDI file uses polyphony (multiple notes per channel).`);
    console.log(`   Our current tracker format can only store ONE note per channel per row.`);
    console.log(`   We are LOSING ${totalPolyphonicEvents} polyphonic note events during conversion!\n`);
  } else {
    console.log(`\n✅ No polyphony detected. Each channel plays one note at a time.\n`);
  }

  console.log('═'.repeat(70) + '\n');
}

// Main
if (process.argv.length < 3) {
  console.error('Usage: node analyzePolyphony.js <midi-file>');
  process.exit(1);
}

const midiPath = process.argv[2];

try {
  analyzeMIDIPolyphony(midiPath);
} catch (error) {
  console.error('Error analyzing MIDI file:', error.message);
  process.exit(1);
}
