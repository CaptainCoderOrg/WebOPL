# Milestone 2: Channel Manager Implementation

**Status**: Ready to implement (after Milestone 1)
**Effort**: 3-4 hours
**Risk**: Medium
**Dependencies**: Milestone 1 complete

## Objective

Build a ChannelManager to dynamically allocate OPL3 hardware channels for single-voice and dual-voice instruments, with voice stealing when channels are exhausted.

## Success Criteria

- ✅ ChannelManager class allocates 1 or 2 channels per note
- ✅ LRU voice stealing works when all 9 channels are full
- ✅ Manual test harness verifies channel allocation behavior
- ✅ Edge cases handled (channel exhaustion, dual-voice notes)
- ✅ TypeScript compiles without errors
- ✅ No changes to SimpleSynth yet (just infrastructure)

---

## Task 2.1: Create ChannelManager Class (60 minutes)

**File**: `minimal-prototype/src/utils/ChannelManager.ts` (new file)

### Implementation

```typescript
/**
 * Channel Manager for OPL3 Hardware Channel Allocation
 *
 * Manages the 9 OPL3 hardware channels (0-8) for:
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
  private readonly MAX_CHANNELS = 9; // OPL3 hardware channels 0-8
  private allocations: Map<string, ChannelAllocation>; // noteId -> allocation
  private freeChannels: Set<number>; // Available channels

  constructor() {
    this.allocations = new Map();
    this.freeChannels = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  }

  /**
   * Allocate 1 channel for single-voice instrument
   * @returns Hardware channel number (0-8) or null if failed
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
    this.freeChannels = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  }

  // ===== Private Helper Methods =====

  private getFirstFreeChannel(): number {
    return this.freeChannels.values().next().value;
  }

  private getTwoFreeChannels(): [number, number] {
    const iter = this.freeChannels.values();
    const ch1 = iter.next().value;
    const ch2 = iter.next().value;
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
```

### Testing

```bash
cd minimal-prototype
npm run build
```

### Verification

- [ ] TypeScript compiles without errors
- [ ] No linting errors

---

## Task 2.2: Create Test Harness (60 minutes)

**File**: `minimal-prototype/src/utils/ChannelManager.test.ts` (new file)

### Purpose

Manual test harness to verify ChannelManager behavior in various scenarios.

### Implementation

```typescript
/**
 * Manual Test Harness for ChannelManager
 * Run this in browser console to verify behavior
 */

import { ChannelManager } from './ChannelManager';

export function testChannelManager() {
  console.log('=== ChannelManager Test Suite ===\n');

  const mgr = new ChannelManager();

  // Test 1: Allocate 9 single-voice notes
  console.log('Test 1: Allocate 9 single-voice notes');
  for (let i = 0; i < 9; i++) {
    const noteId = `note-${i}`;
    const channel = mgr.allocateChannel(noteId);
    console.log(`  ${noteId} -> channel ${channel}`);
  }
  console.log('Stats:', mgr.getStats()); // Should be: free=0, allocated=9
  console.log('Expected: free=0, allocated=9, dualVoiceNotes=0\n');

  // Test 2: Try to allocate 10th note (should trigger voice stealing)
  console.log('Test 2: Allocate 10th note (voice stealing)');
  const note10 = mgr.allocateChannel('note-10');
  console.log(`  note-10 -> channel ${note10} (should steal note-0)`);
  console.log('Stats:', mgr.getStats()); // Should be: free=0, allocated=9
  console.log('Expected: note-0 stolen, note-10 gets its channel\n');

  // Test 3: Reset and allocate dual-voice notes
  mgr.reset();
  console.log('Test 3: Allocate 4 dual-voice notes (uses 8 channels)');
  for (let i = 0; i < 4; i++) {
    const noteId = `dual-${i}`;
    const channels = mgr.allocateDualChannels(noteId);
    console.log(`  ${noteId} -> channels [${channels}]`);
  }
  console.log('Stats:', mgr.getStats()); // Should be: free=1, allocated=8, dualVoiceNotes=4
  console.log('Expected: free=1, allocated=8, dualVoiceNotes=4\n');

  // Test 4: Allocate 5th dual-voice note (needs to steal 1 channel)
  console.log('Test 4: Allocate 5th dual-voice (not enough free channels)');
  const dual5 = mgr.allocateDualChannels('dual-5');
  console.log(`  dual-5 -> channels [${dual5}]`);
  console.log('Stats:', mgr.getStats());
  console.log('Expected: Should degrade to single channel or steal\n');

  // Test 5: Mixed allocation
  mgr.reset();
  console.log('Test 5: Mixed single + dual allocations');
  mgr.allocateChannel('single-1');
  mgr.allocateChannel('single-2');
  mgr.allocateDualChannels('dual-1'); // Uses 2 channels
  mgr.allocateDualChannels('dual-2'); // Uses 2 channels
  mgr.allocateChannel('single-3');
  console.log('Stats:', mgr.getStats()); // Should be: free=2, allocated=7, dualVoiceNotes=2
  console.log('Expected: free=2, allocated=7, dualVoiceNotes=2\n');

  // Test 6: Release notes
  console.log('Test 6: Release notes');
  mgr.releaseNote('dual-1'); // Frees 2 channels
  console.log('After releasing dual-1:', mgr.getStats());
  console.log('Expected: free=4, allocated=5, dualVoiceNotes=1\n');

  console.log('=== Test Suite Complete ===');
}

// Auto-run in dev mode
if (import.meta.env.DEV) {
  // Expose to window for manual testing
  (window as any).testChannelManager = testChannelManager;
  console.log('Run testChannelManager() in console to test ChannelManager');
}
```

### Testing

1. **Build and run dev server**:
```bash
npm run dev
```

2. **Open browser console** → http://localhost:5173

3. **Run test**:
```javascript
testChannelManager()
```

### Verification

- [ ] All 6 tests run without errors
- [ ] Stats match expected values
- [ ] Voice stealing works correctly
- [ ] Dual-voice degradation works (falls back to single channel)

---

## Task 2.3: Edge Case Testing (45 minutes)

### Test Scenarios

#### Scenario 1: Channel Exhaustion

**Test**: Allocate 10 single-voice notes rapidly

**Expected**:
- First 9 notes get channels 0-8
- 10th note steals oldest (note 0)
- No crashes or errors

#### Scenario 2: Dual-Voice Degradation

**Test**: Allocate 5 dual-voice notes (needs 10 channels, only have 9)

**Expected**:
- First 4 dual-voice notes get 2 channels each (8 channels used)
- 5th dual-voice note gets 1 channel only (degraded mode)
- Console warning: "Dual-voice degraded to single channel"

#### Scenario 3: Release and Reuse

**Test**: Allocate 5 notes, release 2, allocate 2 more

**Expected**:
- Released channels are reused
- No channel leaks
- Stats show correct free/allocated counts

#### Scenario 4: Double Allocation

**Test**: Call `allocateChannel('note-1')` twice

**Expected**:
- Second call returns same channel as first call
- No duplicate allocations

#### Scenario 5: Release Non-Existent Note

**Test**: Call `releaseNote('fake-note-123')`

**Expected**:
- No error thrown
- No side effects

### Verification Checklist

- [ ] All edge cases handled gracefully
- [ ] No memory leaks (allocations map clears correctly)
- [ ] Voice stealing works in all scenarios
- [ ] Console warnings appear for degraded modes

---

## Task 2.4: Integration Preparation (30 minutes)

### Update SimpleSynth to Import ChannelManager

**File**: `minimal-prototype/src/SimpleSynth.ts`

**Change**: Add import at top of file (DO NOT modify noteOn/noteOff yet)

```typescript
import { ChannelManager } from './utils/ChannelManager';
```

**Add to SimpleSynth class**:

```typescript
export class SimpleSynth {
  private opl!: OPL;
  private channelManager: ChannelManager;
  // ... existing fields ...

  constructor() {
    this.channelManager = new ChannelManager();
    // ... existing constructor code ...
  }

  // Add getter for testing
  getChannelManagerStats() {
    return this.channelManager.getStats();
  }
}
```

### Testing

```bash
npm run build
npm run dev
```

### Verification

- [ ] App compiles without errors
- [ ] App runs normally (no behavior changes yet)
- [ ] No console errors

---

## Milestone 2 Success Checklist

- [ ] ChannelManager class created with all methods
- [ ] Allocates 1 channel for single-voice notes
- [ ] Allocates 2 channels for dual-voice notes
- [ ] LRU voice stealing works correctly
- [ ] Test harness runs all 6 tests successfully
- [ ] Edge cases handled (exhaustion, degradation, double allocation)
- [ ] SimpleSynth imports ChannelManager (but doesn't use it yet)
- [ ] TypeScript compiles without errors
- [ ] App runs without errors

---

## Checkpoint: Commit Changes

```
feat(milestone-2): Add ChannelManager for dynamic channel allocation

- Implement ChannelManager with single and dual-voice allocation
- Add LRU voice stealing when channels exhausted
- Create test harness for manual verification
- Handle edge cases (degradation, double allocation, etc.)
- Import ChannelManager in SimpleSynth (integration in Milestone 3)

Refs: #dual-voice-support Phase 2
```

---

## Next Steps

After completing Milestone 2, proceed to:
- **Milestone 3**: Integrate ChannelManager into SimpleSynth and implement dual-voice playback
- See: `MILESTONE-3-SYNTH-INTEGRATION.md`
