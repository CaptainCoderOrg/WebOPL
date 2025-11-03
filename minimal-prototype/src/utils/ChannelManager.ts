/**
 * Channel Manager for OPL3 Hardware Channel Allocation
 *
 * Manages the 18 OPL3 hardware channels (0-17) for:
 * - Single-voice instruments (1 channel)
 * - Dual-voice instruments (2 channels)
 * - Voice stealing (LRU algorithm)
 */

export interface ChannelAllocation {
  noteId: string;           // Unique note identifier (e.g., "ch0-note60")
  channels: number[];       // Allocated hardware channels [ch] or [ch1, ch2]
  startTime: number;        // Performance.now() timestamp
  isDualVoice: boolean;     // True if this note uses 2 channels
}

export class ChannelManager {
  private readonly MAX_CHANNELS = 18; // OPL3 hardware channels 0-17
  private allocations: Map<string, ChannelAllocation>; // noteId -> allocation
  private freeChannels: Set<number>; // Available channels

  constructor() {
    this.allocations = new Map();
    this.freeChannels = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
  }

  /**
   * Allocate 1 channel for single-voice instrument
   * @returns Hardware channel number (0-17) or null if failed
   */
  allocateChannel(noteId: string): number | null {
    // If already allocated, return existing
    if (this.allocations.has(noteId)) {
      return this.allocations.get(noteId)!.channels[0];
    }

    // Try to allocate a free channel
    if (this.freeChannels.size > 0) {
      const channel = this.getFirstFreeChannel();
      this.freeChannels.delete(channel);

      this.allocations.set(noteId, {
        noteId,
        channels: [channel],
        startTime: performance.now(),
        isDualVoice: false
      });

      return channel;
    }

    // Voice stealing: steal LRU single-voice note
    const victimNoteId = this.findLRUSingleVoiceNote();
    if (victimNoteId) {
      const victimAlloc = this.allocations.get(victimNoteId)!;
      const channel = victimAlloc.channels[0];

      // Free victim allocation
      this.releaseNote(victimNoteId);

      // Allocate to new note
      this.freeChannels.delete(channel);
      this.allocations.set(noteId, {
        noteId,
        channels: [channel],
        startTime: performance.now(),
        isDualVoice: false
      });

      return channel;
    }

    // No channels available
    console.warn('[ChannelManager] Failed to allocate channel for', noteId);
    return null;
  }

  /**
   * Allocate 2 channels for dual-voice instrument
   * @returns [channel1, channel2] or null if failed
   */
  allocateDualChannels(noteId: string): [number, number] | null {
    // If already allocated, return existing
    if (this.allocations.has(noteId)) {
      const alloc = this.allocations.get(noteId)!;
      if (alloc.isDualVoice && alloc.channels.length === 2) {
        return [alloc.channels[0], alloc.channels[1]];
      }
    }

    // Need 2 free channels
    if (this.freeChannels.size >= 2) {
      const [ch1, ch2] = this.getTwoFreeChannels();
      this.freeChannels.delete(ch1);
      this.freeChannels.delete(ch2);

      this.allocations.set(noteId, {
        noteId,
        channels: [ch1, ch2],
        startTime: performance.now(),
        isDualVoice: true
      });

      return [ch1, ch2];
    }

    // Voice stealing: try to free up 2 channels
    const freedChannels = this.stealChannelsForDualVoice();
    if (freedChannels && freedChannels.length === 2) {
      const [ch1, ch2] = freedChannels;
      this.freeChannels.delete(ch1);
      this.freeChannels.delete(ch2);

      this.allocations.set(noteId, {
        noteId,
        channels: [ch1, ch2],
        startTime: performance.now(),
        isDualVoice: true
      });

      return [ch1, ch2];
    }

    // Fallback: allocate single channel for dual-voice note (degraded mode)
    console.warn('[ChannelManager] Dual-voice degraded to single channel for', noteId);
    const singleChannel = this.allocateChannel(noteId);
    if (singleChannel !== null) {
      // Update allocation to mark as dual-voice (even though only 1 channel)
      const alloc = this.allocations.get(noteId)!;
      alloc.isDualVoice = true; // Flag for tracking
      return [singleChannel, singleChannel]; // Use same channel twice (caller handles)
    }

    // Complete failure
    console.error('[ChannelManager] Failed to allocate dual channels for', noteId);
    return null;
  }

  /**
   * Release note and free its channels
   */
  releaseNote(noteId: string): void {
    const alloc = this.allocations.get(noteId);
    if (!alloc) return;

    // Free channels
    for (const channel of alloc.channels) {
      this.freeChannels.add(channel);
    }

    this.allocations.delete(noteId);
  }

  /**
   * Get allocation info for a note
   */
  getAllocation(noteId: string): ChannelAllocation | undefined {
    return this.allocations.get(noteId);
  }

  /**
   * Get current channel usage stats
   */
  getStats(): { free: number; allocated: number; dualVoiceNotes: number } {
    const dualVoiceNotes = Array.from(this.allocations.values())
      .filter(a => a.isDualVoice && a.channels.length === 2).length;

    return {
      free: this.freeChannels.size,
      allocated: this.MAX_CHANNELS - this.freeChannels.size,
      dualVoiceNotes
    };
  }

  /**
   * Clear all allocations (for reset)
   */
  reset(): void {
    this.allocations.clear();
    this.freeChannels = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
  }

  // ===== Private Helper Methods =====

  private getFirstFreeChannel(): number {
    return this.freeChannels.values().next().value!;
  }

  private getTwoFreeChannels(): [number, number] {
    const iter = this.freeChannels.values();
    const ch1 = iter.next().value!;
    const ch2 = iter.next().value!;
    return [ch1, ch2];
  }

  /**
   * Find LRU single-voice note to steal
   */
  private findLRUSingleVoiceNote(): string | null {
    let oldestTime = Infinity;
    let oldestNoteId: string | null = null;

    for (const [noteId, alloc] of this.allocations.entries()) {
      if (!alloc.isDualVoice && alloc.startTime < oldestTime) {
        oldestTime = alloc.startTime;
        oldestNoteId = noteId;
      }
    }

    return oldestNoteId;
  }

  /**
   * Steal 2 channels by removing the 2 oldest single-voice notes
   * @returns [ch1, ch2] or null if not enough single-voice notes
   */
  private stealChannelsForDualVoice(): [number, number] | null {
    // Get all single-voice allocations sorted by age (oldest first)
    const singleVoiceNotes = Array.from(this.allocations.values())
      .filter(a => !a.isDualVoice)
      .sort((a, b) => a.startTime - b.startTime);

    if (singleVoiceNotes.length < 2) {
      return null; // Not enough single-voice notes to steal
    }

    // Steal the 2 oldest
    const victim1 = singleVoiceNotes[0];
    const victim2 = singleVoiceNotes[1];

    const ch1 = victim1.channels[0];
    const ch2 = victim2.channels[0];

    this.releaseNote(victim1.noteId);
    this.releaseNote(victim2.noteId);

    return [ch1, ch2];
  }
}
