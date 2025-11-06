# WAV Export Feature

## Overview

The WAV export feature allows users to render patterns to downloadable WAV audio files. The export process uses an OfflineAudioContext to render audio without blocking the browser UI, with a progress indicator to show generation status.

## User Flow

1. User clicks "Export" button in the main UI
2. Export modal opens showing:
   - Description of export feature
   - Export options (loop count, fade out, etc.)
   - "Generate WAV" button
   - "Cancel" button to close modal
3. User clicks "Generate WAV"
   - Button becomes disabled
   - Progress bar appears showing 0%
   - Generation begins
4. During generation:
   - Progress bar updates in real-time
   - User can click "Cancel" to abort generation
5. When complete:
   - Progress bar shows 100%
   - "Download" button appears
   - User can download the WAV file
   - User can generate again or close modal

## Technical Approach

### Non-Blocking Rendering

To prevent browser lockup during long exports (e.g., 128-row patterns with multiple loops):

1. **OfflineAudioContext**: Render audio offline without real-time playback
2. **Chunked Processing**: Break pattern playback into chunks (e.g., 16 rows at a time)
3. **setTimeout/requestIdleCallback**: Yield control back to browser between chunks
4. **Progress Callbacks**: Report progress percentage after each chunk

### Generation Process

```
1. Calculate total duration: (rows / bpm * 60) * loop_count
2. Create OfflineAudioContext with calculated duration
3. Initialize OPL3Synth connected to offline context
4. Load pattern and set instruments
5. Play through pattern row-by-row:
   - Process in chunks of N rows
   - Yield to browser between chunks
   - Update progress bar
   - Check for cancellation
6. Start rendering offline context
7. Convert AudioBuffer to WAV format
8. Create downloadable Blob
9. Enable download button
```

### WAV Encoding

Use standard WAV format:
- PCM 16-bit samples
- 44100 Hz sample rate
- Stereo (2 channels)
- WAV header with proper chunk sizes

## Implementation Plan

### Phase 1: Core Infrastructure

**Files to create:**
- `src/features/export/ExportModal.tsx` - Modal component
- `src/features/export/PatternExporter.ts` - Export logic
- `src/features/export/WavEncoder.ts` - WAV format encoding
- `src/features/export/types.ts` - TypeScript interfaces

**Tasks:**
1. Create `features/export/` directory structure
2. Implement `WavEncoder.ts`:
   - Function to convert AudioBuffer to WAV format
   - Create proper WAV headers
   - Handle stereo interleaving
3. Implement `PatternExporter.ts`:
   - Class to manage export process
   - OfflineAudioContext setup
   - Chunked pattern playback
   - Progress tracking
   - Cancellation support
4. Create basic `ExportModal.tsx` component structure

### Phase 2: UI Components

**Tasks:**
1. Design `ExportModal` layout:
   - Modal container with backdrop
   - Header with title and close button
   - Export options section
   - Progress section (hidden initially)
   - Button row (Cancel, Generate WAV, Download)
2. Implement progress bar component
3. Add export button to main TrackerPage
4. Connect modal open/close logic

### Phase 3: Export Logic Integration

**Tasks:**
1. Wire up "Generate WAV" button:
   - Disable button when clicked
   - Initialize PatternExporter
   - Pass current pattern data
   - Set up progress callback
2. Implement progress updates:
   - Update progress bar in real-time
   - Show percentage text
3. Implement cancellation:
   - Cancel button sets flag
   - PatternExporter checks flag between chunks
   - Clean up resources on cancel
4. Handle completion:
   - Show download button
   - Create blob URL
   - Trigger download on click

### Phase 4: Polish & Testing

**Tasks:**
1. Add export options:
   - Loop count selector (1-8 loops)
   - Fade out duration (0-5 seconds)
   - Sample rate selector (22050, 44100, 48000)
2. Error handling:
   - Show error messages in modal
   - Handle OPL3 initialization failures
   - Handle browser compatibility issues
3. UX improvements:
   - Loading spinner during initialization
   - Estimated time remaining
   - Success message on completion
4. Testing:
   - Test with short patterns (16 rows)
   - Test with long patterns (128 rows)
   - Test with all instrument types
   - Test cancellation at various stages
   - Test multiple exports in sequence

## File Structure

```
src/features/export/
├── ExportModal.tsx           # Main modal component
├── ExportModal.css           # Modal styles
├── ExportOptions.tsx         # Options form (loop count, fade, etc.)
├── ProgressBar.tsx           # Progress indicator component
├── PatternExporter.ts        # Export orchestration logic
├── OfflinePlayer.ts          # Pattern playback in offline context
├── WavEncoder.ts             # AudioBuffer -> WAV conversion
├── types.ts                  # TypeScript interfaces
└── index.ts                  # Public exports
```

## Data Flow

```
TrackerPage
  └─> [Export Button] clicked
        └─> ExportModal opens
              └─> User configures options
                    └─> [Generate WAV] clicked
                          └─> PatternExporter.export(pattern, options)
                                ├─> Create OfflineAudioContext
                                ├─> Initialize OPL3Synth
                                ├─> OfflinePlayer.play(pattern)
                                │     ├─> Play row chunks
                                │     ├─> Yield between chunks
                                │     └─> Update progress
                                ├─> Render audio
                                ├─> WavEncoder.encode(audioBuffer)
                                └─> Return Blob
                          └─> Enable [Download] button
                                └─> Create download link
                                      └─> User clicks -> download starts
```

## TypeScript Interfaces

```typescript
interface ExportOptions {
  loopCount: number;        // How many times to loop the pattern
  fadeOutDuration: number;  // Fade out duration in seconds
  sampleRate: number;       // Sample rate (44100, 48000, etc.)
}

interface ExportProgress {
  phase: 'initializing' | 'playing' | 'rendering' | 'encoding' | 'complete';
  progress: number;         // 0-1
  message: string;          // Human-readable status
}

interface ExportResult {
  blob: Blob;               // WAV file blob
  duration: number;         // Duration in seconds
  sampleRate: number;       // Sample rate used
  fileSize: number;         // Size in bytes
}
```

## Dependencies

- Existing: `OPL3Synth`, `Pattern` types, MIDI utilities
- New: None (uses Web Audio API built-in)

## Browser Compatibility

- Requires Web Audio API (all modern browsers)
- OfflineAudioContext support (all modern browsers)
- Blob and URL.createObjectURL (all modern browsers)

## Future Enhancements

- Export to other formats (MP3, OGG)
- Export multiple patterns at once
- Export with effects (reverb, delay)
- Preview audio before download
- Save export presets
