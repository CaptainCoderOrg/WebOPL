/**
 * SimpleSynth - OPL3 Synthesizer (Rebuilt from Working Test)
 *
 * Rebuilt using the exact patterns from opl3-chip-test.html
 * Uses AudioWorklet for modern, low-latency audio processing
 */

import type { OPLPatch } from './types/OPLPatch';
import { getOPLParams } from './constants/midiToOPL';

export class SimpleSynth {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private workletReady: boolean = false;
  private isInitialized: boolean = false;

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
   * Load an instrument patch to a specific channel
   * TODO: Implement in next phase
   */
  public loadPatch(channelId: number, patch: OPLPatch): void {
    console.log(`[SimpleSynth] TODO: Load patch "${patch.name}" to channel ${channelId}`);
  }

  /**
   * Get the currently loaded patch for a channel
   */
  public getChannelPatch(_channelId: number): OPLPatch | null {
    return null;
  }

  /**
   * Get all loaded patches
   */
  public getAllPatches(): Array<[number, string]> {
    return [];
  }

  /**
   * Play a note on a specific channel
   * Uses the pattern from opl3-chip-test.html
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

    console.log(`[SimpleSynth] Note ON: channel=${channel}, note=${midiNote}`);

    // Get OPL3 frequency parameters
    const { fnum, block } = getOPLParams(midiNote);

    // Write frequency low byte (A0-A8)
    this.writeOPL(this.getChannelRegister(0xA0, channel), fnum & 0xFF);

    // Write frequency high byte + block + key-on (B0-B8)
    // Bit 5 (0x20) = Key ON
    // Bits 2-4 = Block (octave)
    // Bits 0-1 = F-number high bits
    const keyOnByte = 0x20 | ((block & 0x07) << 2) | ((fnum >> 8) & 0x03);
    this.writeOPL(this.getChannelRegister(0xB0, channel), keyOnByte);
  }

  /**
   * Stop a note on a specific MIDI channel
   */
  noteOff(channel: number, midiNote: number): void {
    if (!this.isInitialized) return;
    if (channel < 0 || channel >= 9) return;

    console.log(`[SimpleSynth] Note OFF: channel=${channel}, note=${midiNote}`);

    // Clear key-on bit (bit 5) by writing 0x00 to B0 register
    this.writeOPL(this.getChannelRegister(0xB0, channel), 0x00);
  }

  /**
   * Stop all notes on all channels
   */
  allNotesOff(): void {
    console.log('[SimpleSynth] All notes off');

    // Clear key-on bit for all 18 OPL3 channels
    for (let channel = 0; channel < 18; channel++) {
      this.writeOPL(this.getChannelRegister(0xB0, channel), 0x00);
    }
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
    return 0;
  }

  /**
   * Get channel manager stats (for debugging)
   */
  getChannelManagerStats() {
    return { free: 18, allocated: 0, dualVoiceNotes: 0 };
  }
}
