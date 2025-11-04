/**
 * SimpleSynth - OPL3 Synthesizer Wrapper (AudioWorklet Edition)
 *
 * Manages OPL3 instance and Web Audio API integration.
 * Supports 9 simultaneous voices (channels 0-8).
 *
 * FEATURE FLAG: USE_AUDIO_WORKLET
 * - true: Use modern AudioWorklet (recommended, better browser support)
 * - false: Fall back to deprecated ScriptProcessorNode (Edge compatibility)
 */

import type { OPLPatch, OPLOperator } from './types/OPLPatch';
import { defaultPatches } from './data/defaultPatches';
import { getOPLParams } from './constants/midiToOPL';
import { ChannelManager } from './utils/ChannelManager';
import { OPL3Wrapper } from './utils/OPL3Wrapper';

// Feature flag: Toggle between AudioWorklet and ScriptProcessorNode
const USE_AUDIO_WORKLET = true;

// Type definition for the global OPL class
declare global {
  interface Window {
    OPL?: any;
  }
}

export class SimpleSynth {
  // Common properties
  private audioContext: AudioContext | null = null;
  private activeNotes: Map<number, {
    noteId: string;
    channels: number[];
    note: number;
    isDualVoice: boolean;
  }> = new Map(); // MIDI channel → active note info
  private channelPatches: Map<number, OPLPatch> = new Map(); // OPL channel → loaded patch
  private channelManager: ChannelManager = new ChannelManager(); // Channel allocation for dual-voice
  private isInitialized: boolean = false;

  // AudioWorklet properties
  private workletNode: AudioWorkletNode | null = null;
  private workletReady: boolean = false;

  // ScriptProcessorNode properties (fallback)
  private opl: OPL3Wrapper | null = null;
  private scriptNode: ScriptProcessorNode | null = null;

  /**
   * Initialize OPL3 and Web Audio
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      console.warn('[SimpleSynth] Already initialized');
      return;
    }

    console.log('[SimpleSynth] Initializing...');
    console.log(`[SimpleSynth] Mode: ${USE_AUDIO_WORKLET ? 'AudioWorklet' : 'ScriptProcessorNode'}`);

    try {
      // Create AudioContext
      this.audioContext = new AudioContext({ sampleRate: 49716 });
      console.log('[SimpleSynth] ✅ AudioContext created');
      console.log('[SimpleSynth]    Sample rate:', this.audioContext.sampleRate);

      if (USE_AUDIO_WORKLET && 'audioWorklet' in this.audioContext) {
        await this.initAudioWorklet();
      } else {
        console.warn('[SimpleSynth] AudioWorklet not supported, falling back to ScriptProcessorNode');
        await this.initScriptProcessor();
      }

      this.isInitialized = true;
      console.log('[SimpleSynth] Initialization complete!');
    } catch (error) {
      console.error('[SimpleSynth] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize using AudioWorklet (modern approach)
   */
  private async initAudioWorklet(): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not created');
    }

    console.log('[SimpleSynth] Using AudioWorklet mode...');

    // Load OPL3 JavaScript code
    console.log('[SimpleSynth] Loading OPL3 code...');
    const opl3Code = await this.fetchOPL3Code();
    console.log('[SimpleSynth] ✅ OPL3 code loaded');

    // Load AudioWorklet module
    console.log('[SimpleSynth] Loading AudioWorklet processor...');
    await this.audioContext.audioWorklet.addModule('/opl-worklet-processor.js');
    console.log('[SimpleSynth] ✅ AudioWorklet module loaded');

    // Create AudioWorkletNode
    this.workletNode = new AudioWorkletNode(this.audioContext, 'opl-worklet-processor');

    // Listen for messages from worklet
    this.workletNode.port.onmessage = (event) => {
      this.handleWorkletMessage(event.data);
    };

    // Connect to audio output
    this.workletNode.connect(this.audioContext.destination);
    console.log('[SimpleSynth] ✅ AudioWorkletNode connected');

    // Send OPL3 code to worklet
    console.log('[SimpleSynth] Sending OPL3 code to worklet...');
    this.workletNode.port.postMessage({
      type: 'load-opl3',
      payload: { opl3Code }
    });

    // Wait for worklet to be ready
    await this.waitForWorkletReady();

    // Load default instruments
    console.log('[SimpleSynth] Loading default instruments...');
    for (let ch = 0; ch < 4; ch++) {
      const patch = defaultPatches[ch];
      this.loadPatch(ch, patch);
      console.log(`[SimpleSynth] Channel ${ch}: ${patch.name}`);
    }

    // Channels 4-17 get piano as default
    for (let ch = 4; ch < 18; ch++) {
      this.loadPatch(ch, defaultPatches[0]);
    }

    console.log('[SimpleSynth] All channels initialized with default patches');
  }

  /**
   * Fetch OPL3 JavaScript code
   */
  private async fetchOPL3Code(): Promise<string> {
    const response = await fetch('/node_modules/opl3/lib/opl3.js');
    if (!response.ok) {
      throw new Error(`Failed to fetch OPL3 code: ${response.statusText}`);
    }
    let code = await response.text();

    // Wrap the code to expose OPL3 on globalThis
    // Provide polyfills for Node.js modules (util, require)
    code = `
      (function() {
        // Polyfill for util.inherits (used for class inheritance in opl3.js)
        var util = {
          inherits: function(ctor, superCtor) {
            ctor.super_ = superCtor;
            ctor.prototype = Object.create(superCtor.prototype, {
              constructor: {
                value: ctor,
                enumerable: false,
                writable: true,
                configurable: true
              }
            });
          }
        };

        // Polyfill for extend (object merging used by opl3.js)
        function extend(target) {
          for (var i = 1; i < arguments.length; i++) {
            var source = arguments[i];
            if (source) {
              for (var key in source) {
                if (source.hasOwnProperty(key)) {
                  target[key] = source[key];
                }
              }
            }
          }
          return target;
        }

        // Minimal require() implementation for opl3.js
        function require(name) {
          if (name === 'util') {
            return util;
          }
          if (name === 'extend') {
            return extend;
          }
          throw new Error('Module not found: ' + name);
        }

        var module = { exports: {} };
        ${code}
        globalThis.OPL3 = module.exports;
      })();
    `;

    return code;
  }


  /**
   * Initialize using ScriptProcessorNode (fallback for older browsers)
   */
  private async initScriptProcessor(): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not created');
    }

    console.log('[SimpleSynth] Using ScriptProcessorNode mode (fallback)...');

    // Create OPL3 instance (pure JavaScript, no WASM)
    console.log('[SimpleSynth] Creating OPL3 instance...');
    this.opl = new OPL3Wrapper();
    console.log('[SimpleSynth] ✅ OPL3 instance created and initialized');

    // Load default instruments
    console.log('[SimpleSynth] Loading default instruments...');
    for (let ch = 0; ch < 4; ch++) {
      const patch = defaultPatches[ch];
      this.loadPatch(ch, patch);
      console.log(`[SimpleSynth] Channel ${ch}: ${patch.name}`);
    }

    // Channels 4-17 get piano as default
    for (let ch = 4; ch < 18; ch++) {
      this.loadPatch(ch, defaultPatches[0]);
    }

    console.log('[SimpleSynth] All channels initialized with default patches');

    // Create ScriptProcessorNode
    const bufferSize = 4096;
    this.scriptNode = this.audioContext.createScriptProcessor(bufferSize, 0, 2);
    this.scriptNode.onaudioprocess = this.processAudio.bind(this);
    this.scriptNode.connect(this.audioContext.destination);
    console.log('[SimpleSynth] ✅ Audio processor connected');
  }

  /**
   * Wait for AudioWorklet to signal it's ready
   */
  private waitForWorkletReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('AudioWorklet initialization timeout'));
      }, 5000);

      const checkReady = () => {
        if (this.workletReady) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };

      checkReady();
    });
  }

  /**
   * Handle messages from AudioWorklet
   */
  private handleWorkletMessage(data: any): void {
    const { type, payload } = data;

    switch (type) {
      case 'ready':
        console.log('[SimpleSynth] ✅ OPL3 initialized in worklet');
        this.workletReady = true;
        break;

      case 'error':
        console.error('[SimpleSynth] Worklet error:', payload.message);
        break;

      default:
        console.warn('[SimpleSynth] Unknown message from worklet:', type);
    }
  }

  /**
   * Write to OPL register (handles both modes)
   */
  private writeOPL(register: number, value: number): void {
    if (USE_AUDIO_WORKLET && this.workletNode) {
      // Send to AudioWorklet
      this.workletNode.port.postMessage({
        type: 'write',
        payload: { register, value }
      });
    } else if (this.opl) {
      // Direct write (ScriptProcessorNode mode)
      this.opl.write(register, value);
    }
  }

  /**
   * Write to OPL register directly (public method for debugging/testing)
   * @param register OPL register address
   * @param value Value to write to register
   */
  public writeRegister(register: number, value: number): void {
    this.writeOPL(register, value);
  }

  /**
   * Get operator offsets for a channel (supports OPL3's 18 channels)
   * Channels 0-8: First chip (registers 0x00-0xFF)
   * Channels 9-17: Second chip (registers 0x100-0x1FF)
   */
  private getOperatorOffsets(channelId: number): [number, number] {
    const baseOperatorMap: [number, number][] = [
      [0x00, 0x03], [0x01, 0x04], [0x02, 0x05],
      [0x08, 0x0B], [0x09, 0x0C], [0x0A, 0x0D],
      [0x10, 0x13], [0x11, 0x14], [0x12, 0x15],
    ];

    if (channelId < 9) {
      return baseOperatorMap[channelId];
    } else {
      // Channels 9-17 use second register set (add 0x100)
      const localChannel = channelId - 9;
      const [mod, car] = baseOperatorMap[localChannel];
      return [mod + 0x100, car + 0x100];
    }
  }

  /**
   * Get the correct register address for a channel-specific register
   * Handles OPL3's two register sets (0x00-0xFF and 0x100-0x1FF)
   */
  private getChannelRegister(baseRegister: number, channelId: number): number {
    if (channelId < 9) {
      return baseRegister + channelId;
    } else {
      return baseRegister + 0x100 + (channelId - 9);
    }
  }

  /**
   * Write all registers for a single operator
   */
  private writeOperatorRegisters(operatorOffset: number, operator: OPLOperator): void {
    const reg20 =
      operator.frequencyMultiplier |
      (operator.keyScaleRate ? 0x10 : 0) |
      (operator.envelopeType ? 0x20 : 0) |
      (operator.vibrato ? 0x40 : 0) |
      (operator.amplitudeModulation ? 0x80 : 0);
    this.writeOPL(0x20 + operatorOffset, reg20);

    const reg40 = operator.outputLevel | (operator.keyScaleLevel << 6);
    this.writeOPL(0x40 + operatorOffset, reg40);

    const reg60 = operator.decayRate | (operator.attackRate << 4);
    this.writeOPL(0x60 + operatorOffset, reg60);

    const reg80 = operator.releaseRate | (operator.sustainLevel << 4);
    this.writeOPL(0x80 + operatorOffset, reg80);

    this.writeOPL(0xE0 + operatorOffset, operator.waveform);
  }

  /**
   * Load an instrument patch to a specific channel
   */
  public loadPatch(channelId: number, patch: OPLPatch): void {
    if (channelId < 0 || channelId >= 18) {
      throw new Error(`Invalid channel: ${channelId}. Must be 0-17.`);
    }

    console.log(`[SimpleSynth] Loading patch "${patch.name}" to channel ${channelId}`);

    this.channelPatches.set(channelId, patch);

    const [modOffset, carOffset] = this.getOperatorOffsets(channelId);

    this.writeOperatorRegisters(modOffset, patch.modulator);
    this.writeOperatorRegisters(carOffset, patch.carrier);

    const regC0 = (patch.feedback << 1) | (patch.connection === 'fm' ? 1 : 0);
    const c0Register = channelId < 9 ? 0xC0 + channelId : 0x1C0 + (channelId - 9);
    this.writeOPL(c0Register, regC0);

    console.log(`[SimpleSynth] Patch loaded successfully to channel ${channelId}`);
  }

  /**
   * Get the currently loaded patch for a channel
   */
  public getChannelPatch(channelId: number): OPLPatch | null {
    return this.channelPatches.get(channelId) || null;
  }

  /**
   * Get all loaded patches
   */
  public getAllPatches(): Array<[number, string]> {
    const result: Array<[number, string]> = [];
    for (let ch = 0; ch < 18; ch++) {
      const patch = this.channelPatches.get(ch);
      if (patch) {
        result.push([ch, patch.name]);
      }
    }
    return result;
  }

  /**
   * Program a single voice to a hardware channel (for dual-voice support)
   * @param oplChannel OPL3 hardware channel (0-17)
   * @param voice Voice data (modulator, carrier, feedback, connection)
   * @param patch Parent patch (for metadata)
   */
  private programVoice(
    oplChannel: number,
    voice: {
      modulator: OPLOperator;
      carrier: OPLOperator;
      feedback: number;
      connection: 'fm' | 'additive';
      baseNote?: number;
    },
    patch: OPLPatch
  ): void {
    const [modOffset, carOffset] = this.getOperatorOffsets(oplChannel);

    // Program modulator (operator 1)
    this.writeOperatorRegisters(modOffset, voice.modulator);

    // Program carrier (operator 2)
    this.writeOperatorRegisters(carOffset, voice.carrier);

    // Program feedback + connection
    const feedbackByte = (voice.feedback << 1) | (voice.connection === 'fm' ? 1 : 0);
    const c0Register = oplChannel < 9 ? 0xC0 + oplChannel : 0x1C0 + (oplChannel - 9);
    this.writeOPL(c0Register, feedbackByte);

    // Store patch reference for this channel
    this.channelPatches.set(oplChannel, patch);
  }

  /**
   * Audio processing callback (ScriptProcessorNode mode only)
   */
  private processAudio(event: AudioProcessingEvent): void {
    if (!this.opl) return;

    const outputL = event.outputBuffer.getChannelData(0);
    const outputR = event.outputBuffer.getChannelData(1);
    const numSamples = outputL.length;

    // Generate stereo samples (returns interleaved [L, R, L, R, ...])
    const samples = this.opl.generate(numSamples);

    // De-interleave stereo samples
    for (let i = 0; i < numSamples; i++) {
      outputL[i] = samples[i * 2] / 32768.0;      // Left channel
      outputR[i] = samples[i * 2 + 1] / 32768.0;  // Right channel
    }
  }

  /**
   * Play a note on a specific channel
   */
  noteOn(channel: number, midiNote: number, _velocity: number = 100): void {
    if (!this.isInitialized) {
      console.error('[SimpleSynth] Not initialized');
      return;
    }

    if (channel < 0 || channel >= 9) {
      console.error('[SimpleSynth] Invalid MIDI channel:', channel);
      return;
    }

    if (midiNote < 0 || midiNote > 127) {
      console.error('[SimpleSynth] Invalid MIDI note:', midiNote);
      return;
    }

    // Get patch for this MIDI channel
    const patch = this.channelPatches.get(channel);
    if (!patch) {
      console.warn(`[SimpleSynth] No patch loaded for MIDI channel ${channel}`);
      return;
    }

    // Apply GENMIDI note offset if present (for pitch correction)
    let adjustedNote = midiNote;
    if (patch.noteOffset !== undefined) {
      adjustedNote = midiNote - patch.noteOffset;
      adjustedNote = Math.max(0, Math.min(127, adjustedNote));
    }

    // Generate unique note ID for channel manager
    const noteId = `ch${channel}-note${midiNote}`;

    // Check if dual-voice is enabled AND both voices exist
    const isDualVoice = patch.dualVoiceEnabled && patch.voice1 && patch.voice2;

    if (isDualVoice) {
      // === DUAL-VOICE PATH ===
      const channels = this.channelManager.allocateDualChannels(noteId);
      if (!channels) {
        console.warn(`[SimpleSynth] Failed to allocate dual channels for ${noteId}`);
        return;
      }

      const [ch1, ch2] = channels;
      console.log(`[SimpleSynth] Dual-voice: ${noteId} -> OPL channels [${ch1}, ${ch2}]`);

      // Program Voice 1 on channel 1
      this.programVoice(ch1, patch.voice1!, patch);

      // Program Voice 2 on channel 2 (if we got 2 different channels)
      if (ch1 !== ch2) {
        this.programVoice(ch2, patch.voice2!, patch);
      } else {
        // Degraded mode: only 1 channel available, use Voice 1 only
        console.warn(`[SimpleSynth] Dual-voice degraded to single channel for ${noteId}`);
      }

      // Trigger both channels with same note
      const { fnum, block } = getOPLParams(adjustedNote);

      // Trigger channel 1
      this.writeOPL(this.getChannelRegister(0xA0, ch1), fnum & 0xFF);
      const keyOnByte = 0x20 | ((block & 0x07) << 2) | ((fnum >> 8) & 0x03);
      this.writeOPL(this.getChannelRegister(0xB0, ch1), keyOnByte);

      // Trigger channel 2 (if different)
      if (ch1 !== ch2) {
        this.writeOPL(this.getChannelRegister(0xA0, ch2), fnum & 0xFF);
        this.writeOPL(this.getChannelRegister(0xB0, ch2), keyOnByte);
      }

      // Track active note
      this.activeNotes.set(channel, {
        noteId,
        channels: [ch1, ch2],
        note: adjustedNote,
        isDualVoice: true
      });

    } else {
      // === SINGLE-VOICE PATH (backward compatible) ===
      const oplChannel = this.channelManager.allocateChannel(noteId);
      if (oplChannel === null) {
        console.warn(`[SimpleSynth] Failed to allocate channel for ${noteId}`);
        return;
      }

      console.log(`[SimpleSynth] Single-voice: ${noteId} -> OPL channel ${oplChannel}`);

      // Use backward-compatible single-voice programming
      this.loadPatch(oplChannel, patch);

      // Trigger note
      const { fnum, block } = getOPLParams(adjustedNote);
      this.writeOPL(this.getChannelRegister(0xA0, oplChannel), fnum & 0xFF);
      const keyOnByte = 0x20 | ((block & 0x07) << 2) | ((fnum >> 8) & 0x03);
      this.writeOPL(this.getChannelRegister(0xB0, oplChannel), keyOnByte);

      // Track active note
      this.activeNotes.set(channel, {
        noteId,
        channels: [oplChannel],
        note: adjustedNote,
        isDualVoice: false
      });
    }
  }

  /**
   * Stop a note on a specific MIDI channel
   */
  noteOff(channel: number, midiNote: number): void {
    if (!this.isInitialized) return;
    if (channel < 0 || channel >= 9) return;

    const activeNote = this.activeNotes.get(channel);
    if (!activeNote) return;

    // Release all allocated OPL channels for this note
    for (const oplChannel of activeNote.channels) {
      console.log(`[SimpleSynth] Note OFF: MIDI ch=${channel}, OPL ch=${oplChannel}, note=${midiNote}`);
      this.writeOPL(this.getChannelRegister(0xB0, oplChannel), 0x00);
    }

    // Release from channel manager
    this.channelManager.releaseNote(activeNote.noteId);

    // Remove from active notes
    this.activeNotes.delete(channel);
  }

  /**
   * Stop all notes on all channels
   */
  allNotesOff(): void {
    console.log('[SimpleSynth] All notes off');

    // Release all OPL hardware channels
    for (let channel = 0; channel < 18; channel++) {
      this.writeOPL(this.getChannelRegister(0xB0, channel), 0x00);
    }

    // Clear tracking
    this.activeNotes.clear();
    this.channelManager.reset();
  }

  /**
   * Start audio playback
   */
  start(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      console.log('[SimpleSynth] Resuming AudioContext');
      this.audioContext.resume();
    }
  }

  /**
   * Stop audio playback
   */
  stop(): void {
    if (this.audioContext && this.audioContext.state === 'running') {
      console.log('[SimpleSynth] Suspending AudioContext');
      this.audioContext.suspend();
      this.allNotesOff();
    }
  }

  /**
   * Check if initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get number of active notes
   */
  getActiveNoteCount(): number {
    return this.activeNotes.size;
  }

  /**
   * Get channel manager stats (for debugging)
   */
  getChannelManagerStats() {
    return this.channelManager.getStats();
  }
}
