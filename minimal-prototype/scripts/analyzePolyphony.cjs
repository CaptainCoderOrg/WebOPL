#!/usr/bin/env node

/**
 * Analyze MIDI file for polyphony (multiple simultaneous notes per channel)
 */

const fs = require('fs');
const path = require('path');
const { parseMidi } = require('midi-file');

if (process.argv.length < 3) {
  console.error('Usage: node analyzePolyphony.js <midi-file>');
  process.exit(1);
}

const midiPath = process.argv[2];
const midiData = parseMidi(fs.readFileSync(midiPath));

console.log(`\n📊 Polyphony Analysis: ${path.basename(midiPath)}\n`);
console.log(`Format: ${midiData.header.format}`);
console.log(`Tracks: ${midiData.tracks.length}`);
console.log(`Ticks per beat: ${midiData.header.ticksPerBeat}\n`);

// Build timeline with absolute timing
const timeline = [];

for (let trackIndex = 0; trackIndex < midiData.tracks.length; trackIndex++) {
  const track = midiData.tracks[trackIndex];
  let absoluteTime = 0;

  for (const event of track.events) {
    absoluteTime += event.deltaTime;

    if (event.type === 'noteOn' && event.velocity > 0) {
      timeline.push({
        time: absoluteTime,
        trackIndex,
        channel: event.channel,
        note: event.noteNumber,
        velocity: event.velocity,
        type: 'on'
      });
    } else if (event.type === 'noteOff' || (event.type === 'noteOn' && event.velocity === 0)) {
      timeline.push({
        time: absoluteTime,
        trackIndex,
        channel: event.channel,
        note: event.noteNumber,
        type: 'off'
      });
    }
  }
}

// Sort by time
timeline.sort((a, b) => a.time - b.time);

// Track active notes per channel at each moment
const channelState = {}; // channel -> Set of active notes
const polyphonyDetected = {}; // channel -> array of polyphonic moments

for (const event of timeline) {
  const channel = event.channel;

  if (!channelState[channel]) {
    channelState[channel] = new Set();
    polyphonyDetected[channel] = [];
  }

  if (event.type === 'on') {
    channelState[channel].add(event.note);

    // Check for polyphony
    if (channelState[channel].size > 1) {
      polyphonyDetected[channel].push({
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
console.log('═══════════════════════════════════════════════════════════════\n');
console.log('🎹 POLYPHONY DETECTION RESULTS\n');
console.log('═══════════════════════════════════════════════════════════════\n');

let totalPolyphonicEvents = 0;
let channelsWithPolyphony = 0;

for (let channel = 0; channel < 16; channel++) {
  if (!polyphonyDetected[channel] || polyphonyDetected[channel].length === 0) {
    continue;
  }

  channelsWithPolyphony++;
  const events = polyphonyDetected[channel];
  totalPolyphonicEvents += events.length;

  console.log(`\n📍 MIDI Channel ${channel + 1} (0-indexed: ${channel})`);
  console.log(`   Polyphonic events: ${events.length}`);

  // Find max polyphony
  const maxPolyphony = Math.max(...events.map(e => e.count));
  console.log(`   Max simultaneous notes: ${maxPolyphony}`);

  // Show first 5 examples
  console.log(`   Examples (first 5):`);
  for (let i = 0; i < Math.min(5, events.length); i++) {
    const e = events[i];
    const noteNames = e.notes.map(n => midiNoteToName(n)).join(', ');
    console.log(`     Time ${e.time}: ${e.count} notes [${noteNames}] (Track ${e.trackIndex})`);
  }

  if (events.length > 5) {
    console.log(`     ... and ${events.length - 5} more polyphonic events`);
  }
}

console.log('\n═══════════════════════════════════════════════════════════════\n');
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

console.log('═══════════════════════════════════════════════════════════════\n');

// Helper function
function midiNoteToName(midiNote) {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = noteNames[midiNote % 12];
  return `${noteName}-${octave}`;
}
