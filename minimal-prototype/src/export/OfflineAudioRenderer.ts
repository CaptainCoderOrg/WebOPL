/**
 * OfflineAudioRenderer - Render patterns to WAV offline
 * Orchestrates the entire rendering process
 */

import { SimpleSynth } from '../SimpleSynth';
import { DirectOPLChip } from '../adapters/DirectOPLChip';
import { PatternRenderer, type RenderablePattern } from './PatternRenderer';
import { WAVEncoder } from '../utils/WAVEncoder';
import { loadGENMIDI } from '../utils/genmidiParser';
import type { OPLPatch } from '../types/OPLPatch';
import type { PatternFile } from '../types/PatternFile';

export class OfflineAudioRenderer {
  private static readonly SAMPLE_RATE = 49716;

  /**
   * Render pattern to WAV file
   * @param pattern - Pattern data (PatternFile format)
   * @param patches - Instrument patches (use null to auto-load GENMIDI)
   * @param progressCallback - Optional progress callback (0.0 to 1.0)
   * @returns ArrayBuffer containing WAV file
   */
  static async renderToWAV(
    pattern: PatternFile,
    patches: OPLPatch[] | null = null,
    progressCallback?: (progress: number) => void
  ): Promise<ArrayBuffer> {
    // Load GENMIDI patches if not provided
    if (!patches) {
      console.log('[OfflineAudioRenderer] Loading GENMIDI patches...');
      const bank = await loadGENMIDI();
      patches = bank.patches;
      console.log(`[OfflineAudioRenderer] Loaded ${patches.length} patches`);
    }

    // Load OPL3 library
    console.log('[OfflineAudioRenderer] Loading OPL3 library...');
    await this.loadOPL3Library();
    console.log('[OfflineAudioRenderer] OPL3 library loaded');

    // Create OPL3 chip instance
    const OPL3Class = (globalThis as any).OPL3.OPL3;
    const chip = new OPL3Class();
    console.log('[OfflineAudioRenderer] OPL3 chip created');

    // Initialize OPL3 chip
    this.initializeOPL3Chip(chip);

    // Create DirectOPLChip adapter
    const directChip = new DirectOPLChip(chip);
    console.log('[OfflineAudioRenderer] DirectOPLChip adapter created');

    // Initialize SimpleSynth with DirectOPLChip
    const synth = new SimpleSynth();
    await synth.init(directChip);
    console.log('[OfflineAudioRenderer] SimpleSynth initialized');

    // Set track patches
    for (let trackIndex = 0; trackIndex < pattern.instruments.length; trackIndex++) {
      const patchIndex = pattern.instruments[trackIndex];
      const patch = patches[patchIndex];
      if (patch) {
        synth.setTrackPatch(trackIndex, patch);
        console.log(`[OfflineAudioRenderer] Track ${trackIndex} → Patch ${patchIndex}: ${patch.name}`);
      }
    }

    // Convert PatternFile to RenderablePattern
    const renderablePattern: RenderablePattern = {
      name: pattern.name,
      pattern: pattern.pattern,
      instruments: pattern.instruments,
      bpm: pattern.bpm,
      rowsPerBeat: 4, // 4 rows per beat (16th note resolution)
    };

    // Render pattern to timeline (time-based)
    const timeline = PatternRenderer.render(renderablePattern);
    console.log(`[OfflineAudioRenderer] Timeline: ${timeline.events.length} events, ${timeline.duration.toFixed(2)}s`);

    // Calculate total samples
    const totalSamples = Math.ceil(timeline.duration * this.SAMPLE_RATE);

    // Allocate buffers
    const leftChannel = new Int16Array(totalSamples);
    const rightChannel = new Int16Array(totalSamples);

    // Render samples
    let eventIndex = 0;
    const sampleBuffer = new Int16Array(2);

    for (let sampleIndex = 0; sampleIndex < totalSamples; sampleIndex++) {
      // Process any events at this sample time
      while (eventIndex < timeline.events.length) {
        const event = timeline.events[eventIndex];

        // Convert event time (seconds) to sample index
        const eventSampleIndex = Math.floor(event.time * this.SAMPLE_RATE);
        if (eventSampleIndex > sampleIndex) break; // Future event

        // Trigger event
        if (event.type === 'note-on') {
          synth.noteOn(event.track, event.midiNote, 100);
        } else {
          synth.noteOff(event.track, event.midiNote);
        }

        eventIndex++;
      }

      // Generate one stereo sample
      directChip.read(sampleBuffer);
      leftChannel[sampleIndex] = sampleBuffer[0];
      rightChannel[sampleIndex] = sampleBuffer[1];

      // Report progress every 10000 samples
      if (progressCallback && sampleIndex % 10000 === 0) {
        const progress = sampleIndex / totalSamples;
        progressCallback(progress);
      }
    }

    // Final progress report
    if (progressCallback) {
      progressCallback(1.0);
    }

    console.log('[OfflineAudioRenderer] Rendering complete, encoding to WAV...');

    // Encode to WAV
    const wavBuffer = WAVEncoder.encode(leftChannel, rightChannel, this.SAMPLE_RATE);

    console.log(`[OfflineAudioRenderer] WAV file generated: ${wavBuffer.byteLength} bytes`);

    return wavBuffer;
  }

  /**
   * Initialize OPL3 chip with standard settings
   */
  private static initializeOPL3Chip(chip: any): void {
    // Reset sequence
    chip.write(0, 0x04, 0x60);  // Reset Timer 1 and Timer 2
    chip.write(0, 0x04, 0x80);  // Reset IRQ
    chip.write(0, 0x01, 0x20);  // Enable waveform select
    chip.write(0, 0xBD, 0x00);  // Melodic mode (disable rhythm mode)

    // Enable OPL3 mode (register 0x105)
    chip.write(1, 0x05, 0x01);

    // Disable 4-operator mode (all channels in 2-op mode)
    chip.write(1, 0x04, 0x00);

    // Initialize C0-C8 registers
    for (let ch = 0; ch < 9; ch++) {
      chip.write(0, 0xC0 + ch, 0x00);  // Bank 0 channels 0-8
      chip.write(1, 0xC0 + ch, 0x00);  // Bank 1 channels 9-17
    }

    console.log('[OfflineAudioRenderer] OPL3 chip initialized');
  }

  /**
   * Load OPL3 library from node_modules
   * Uses script injection (not eval) for security
   */
  private static async loadOPL3Library(): Promise<void> {
    if (typeof (globalThis as any).OPL3?.OPL3 !== 'undefined') {
      return; // Already loaded
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/node_modules/opl3/dist/opl3.js';

      script.onload = () => {
        if (typeof (globalThis as any).OPL3?.OPL3 !== 'undefined') {
          resolve();
        } else {
          reject(new Error('OPL3 library loaded but OPL3.OPL3 not found'));
        }
      };

      script.onerror = () => {
        reject(new Error('Failed to load OPL3 script from /node_modules/opl3/dist/opl3.js'));
      };

      document.head.appendChild(script);
    });
  }
}
