/**
 * SimpleSynth - OPL3 Synthesizer (Rebuilt from Working Test)
 *
 * Rebuilt using the exact patterns from opl3-chip-test.html
 * Uses AudioWorklet for modern, low-latency audio processing
 */

import type { OPLPatch, OPLOperator, OPLVoice } from './types/OPLPatch';
import { getOPLParams } from './constants/midiToOPL';
import { ChannelManager } from './utils/ChannelManager';

export class SimpleSynth {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private workletReady: boolean = false;
  private isInitialized: boolean = false;
  private channelPatches: Map<number, OPLPatch> = new Map(); // Track loaded patches per channel
  private channelManager: ChannelManager = new ChannelManager(); // Channel allocation for dual-voice
  private activeNotes: Map<number, {
    noteId: string;
    channels: number[];
    note: number;
    isDualVoice: boolean;
  }> = new Map(); // MIDI channel → active note info

  /**
   * Initialize OPL3 and Web Audio
   * Uses the exact pattern from opl3-chip-test.html
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      console.warn('[SimpleSynth] Already initialized');
      return;
    }

    console.log('[SimpleSynth] Initializing OPL3 (using opl3-chip-test.html pattern)...');

    try {
      // Create AudioContext with OPL3's native sample rate
      this.audioContext = new AudioContext({ sampleRate: 49716 });
      console.log('[SimpleSynth] ✅ AudioContext created (sample rate: 49716 Hz)');

      // Load OPL3 browser bundle code
      console.log('[SimpleSynth] Loading OPL3 browser bundle...');
      const opl3Code = await this.fetchOPL3Code();
      console.log('[SimpleSynth] ✅ OPL3 browser bundle loaded');

      // Load AudioWorklet processor
      console.log('[SimpleSynth] Loading AudioWorklet processor...');
      await this.audioContext.audioWorklet.addModule('/opl-worklet-processor.js');
      console.log('[SimpleSynth] ✅ AudioWorklet processor loaded');

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

      this.isInitialized = true;
      console.log('[SimpleSynth] ✅ Initialization complete!');
    } catch (error) {
      console.error('[SimpleSynth] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Fetch OPL3 browser bundle code
   * Uses dist/opl3.js which exposes window.OPL3.OPL3
   */
  private async fetchOPL3Code(): Promise<string> {
    const response = await fetch('/node_modules/opl3/dist/opl3.js');
    if (!response.ok) {
      throw new Error(`Failed to fetch OPL3 code: ${response.statusText}`);
    }
    return await response.text();
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
        console.log('[SimpleSynth] ✅ OPL3 chip ready in AudioWorklet');
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
   * Write to OPL3 register
   * Converts our 0x000-0x1FF format to worklet commands
   */
  private writeOPL(register: number, value: number): void {
    if (!this.workletNode) {
      console.warn('[SimpleSynth] Cannot write, worklet not initialized');
      return;
    }

    this.workletNode.port.postMessage({
      type: 'write',
      payload: { register, value }
    });
  }

  /**
   * Write to OPL register directly (public method for debugging/testing)
   */
  public writeRegister(register: number, value: number): void {
    this.writeOPL(register, value);
  }

  /**
   * Get the correct register address for a channel
   * Channels 0-8: Bank 0 (0x00-0xFF)
   * Channels 9-17: Bank 1 (0x100-0x1FF)
   */
  private getChannelRegister(baseRegister: number, channelId: number): number {
    if (channelId < 9) {
      return baseRegister + channelId;
    } else {
      return baseRegister + 0x100 + (channelId - 9);
    }
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
   * Write all registers for a single operator
   */
  private writeOperatorRegisters(operatorOffset: number, operator: OPLOperator): void {
    // Register 0x20-0x35: AM, VIB, EGT, KSR, MULT
    const reg20 =
      operator.frequencyMultiplier |
      (operator.keyScaleRate ? 0x10 : 0) |
      (operator.envelopeType ? 0x20 : 0) |
      (operator.vibrato ? 0x40 : 0) |
      (operator.amplitudeModulation ? 0x80 : 0);
    this.writeOPL(0x20 + operatorOffset, reg20);

    // Register 0x40-0x55: KSL, TL (Output Level)
    const reg40 = operator.outputLevel | (operator.keyScaleLevel << 6);
    this.writeOPL(0x40 + operatorOffset, reg40);

    // Register 0x60-0x75: AR, DR (Attack Rate, Decay Rate)
    const reg60 = operator.decayRate | (operator.attackRate << 4);
    this.writeOPL(0x60 + operatorOffset, reg60);

    // Register 0x80-0x95: SL, RR (Sustain Level, Release Rate)
    const reg80 = operator.releaseRate | (operator.sustainLevel << 4);
    this.writeOPL(0x80 + operatorOffset, reg80);

    // Register 0xE0-0xF5: Waveform Select
    this.writeOPL(0xE0 + operatorOffset, operator.waveform);
  }

  /**
   * Load an instrument patch to a specific channel
   * Programs modulator, carrier, feedback, and connection
   */
  public loadPatch(channelId: number, patch: OPLPatch): void {
    if (channelId < 0 || channelId >= 18) {
      throw new Error(`Invalid channel: ${channelId}. Must be 0-17.`);
    }

    console.log(`[SimpleSynth] Loading patch "${patch.name}" to channel ${channelId}`);

    // Store patch reference
    this.channelPatches.set(channelId, patch);

    // Get operator offsets for this channel
    const [modOffset, carOffset] = this.getOperatorOffsets(channelId);

    // Program modulator (operator 1)
    this.writeOperatorRegisters(modOffset, patch.modulator);

    // Program carrier (operator 2)
    this.writeOperatorRegisters(carOffset, patch.carrier);

    // Program feedback + connection (register 0xC0-0xC8 / 0x1C0-0x1C8)
    // Following working test pattern: initialize to 0x00 first
    const c0Register = this.getChannelRegister(0xC0, channelId);
    this.writeOPL(c0Register, 0x00); // Reset first (DOSBox workaround)

    // Now set feedback and connection
    // Bits 1-3: Feedback (0-7)
    // Bit 0: Connection (0=FM, 1=Additive)
    // Bits 4-5: Output routing (we set to 0x30 for stereo)
    const feedbackByte = (patch.feedback << 1) | (patch.connection === 'additive' ? 1 : 0);
    const regC0 = feedbackByte | 0x30; // 0x30 = stereo output (CHA + CHB)
    this.writeOPL(c0Register, regC0);

    console.log(`[SimpleSynth] ✅ Patch loaded to channel ${channelId}`);
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
   */
  private programVoice(
    oplChannel: number,
    voice: OPLVoice,
    patch: OPLPatch
  ): void {
    const [modOffset, carOffset] = this.getOperatorOffsets(oplChannel);

    // Program modulator (operator 1)
    this.writeOperatorRegisters(modOffset, voice.modulator);

    // Program carrier (operator 2)
    this.writeOperatorRegisters(carOffset, voice.carrier);

    // Program feedback + connection
    const c0Register = this.getChannelRegister(0xC0, oplChannel);
    this.writeOPL(c0Register, 0x00); // Reset first (DOSBox workaround)

    const feedbackByte = (voice.feedback << 1) | (voice.connection === 'additive' ? 1 : 0);
    const regC0 = feedbackByte | 0x30; // 0x30 = stereo output
    this.writeOPL(c0Register, regC0);

    // Store patch reference for this channel
    this.channelPatches.set(oplChannel, patch);
  }

  /**
   * Play a note on a specific channel
   * Supports both single-voice and dual-voice instruments
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

    // Get patch for this MIDI channel (use channel 0 as default for now)
    const patch = this.channelPatches.get(0);
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
   * Resume audio context (required by browsers after user interaction)
   */
  async resumeAudio(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      console.log('[SimpleSynth] Resuming AudioContext');
      await this.audioContext.resume();
      console.log('[SimpleSynth] AudioContext state:', this.audioContext.state);
    }
  }

  /**
   * Start audio playback
   */
  start(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * Stop audio playback
   */
  stop(): void {
    if (this.audioContext && this.audioContext.state === 'running') {
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
