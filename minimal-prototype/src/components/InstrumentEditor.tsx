/**
 * InstrumentEditor Component
 * Modal for editing instrument parameters
 */

import { useState, useEffect, useRef } from 'react';
import type { OPLPatch } from '../types/OPLPatch';
import { PianoKeyboard } from './PianoKeyboard';
import './InstrumentEditor.css';

export interface InstrumentEditorProps {
  /** Track being edited (0-3) */
  trackId: number;

  /** Current patch loaded on this track */
  currentPatch: OPLPatch;

  /** All available patches for preset selection */
  availablePatches: OPLPatch[];

  /** Called when user saves changes */
  onSave: (trackId: number, patch: OPLPatch) => void;

  /** Called when user closes without saving */
  onCancel: () => void;

  /** SimpleSynth instance for preview */
  synth?: any;
}

export function InstrumentEditor({
  trackId,
  currentPatch,
  availablePatches,
  onSave,
  onCancel,
  synth
}: InstrumentEditorProps) {
  // Local state for editing (not applied until Save)
  const [editedPatch, setEditedPatch] = useState<OPLPatch>(currentPatch);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [demoMode, setDemoMode] = useState<'none' | 'solo' | 'chords' | 'arpeggios' | 'percussion' | 'sustain' | 'bass' | 'trill' | 'chromatic' | 'octave-jump'>('none');
  const [currentSoloNote, setCurrentSoloNote] = useState<number | null>(null);
  const [currentChordNotes, setCurrentChordNotes] = useState<Set<number>>(new Set());
  const [currentArpeggioNote, setCurrentArpeggioNote] = useState<number | null>(null);
  const [currentPercussionNote, setCurrentPercussionNote] = useState<number | null>(null);
  const [currentSustainNotes, setCurrentSustainNotes] = useState<Set<number>>(new Set());
  const [currentBassNote, setCurrentBassNote] = useState<number | null>(null);
  const [currentTrillNote, setCurrentTrillNote] = useState<number | null>(null);
  const [currentChromaticNote, setCurrentChromaticNote] = useState<number | null>(null);
  const [currentOctaveJumpNote, setCurrentOctaveJumpNote] = useState<number | null>(null);
  const [octaveOffset, setOctaveOffset] = useState<number>(0); // 0 = base octave (C3-C5)

  // Ref to track current edited patch for Solo/Chords playback (avoids restarting)
  const editedPatchRef = useRef<OPLPatch>(editedPatch);

  // Reset local state when currentPatch changes
  useEffect(() => {
    setEditedPatch(currentPatch);
  }, [currentPatch]);

  // Update patch ref whenever editedPatch changes (for Solo playback)
  useEffect(() => {
    editedPatchRef.current = editedPatch;
  }, [editedPatch]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  // Prevent scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Solo melody playback
  useEffect(() => {
    if (demoMode !== 'solo' || !synth) {
      setCurrentSoloNote(null);
      return;
    }

    const PREVIEW_CHANNEL = 8;
    const transpose = octaveOffset * 12; // Transpose amount based on octave offset

    // 12-bar blues melody in C using blues scale (C Eb F F# G Bb)
    // Generic blues lick pattern over 12 bars
    const melody = [
      // Bar 1-2 (C7) - Opening blues phrase
      { note: 60, duration: 300 }, // C
      { note: 63, duration: 300 }, // Eb
      { note: 65, duration: 300 }, // F
      { note: 67, duration: 600 }, // G (hold)
      { note: 65, duration: 300 }, // F
      { note: 63, duration: 300 }, // Eb
      { note: 60, duration: 600 }, // C (hold)

      // Bar 3-4 (C7) - Repeat with variation
      { note: 60, duration: 300 }, // C
      { note: 63, duration: 300 }, // Eb
      { note: 65, duration: 300 }, // F
      { note: 66, duration: 150 }, // F# (blues note)
      { note: 67, duration: 750 }, // G (hold longer)

      // Bar 5-6 (F7) - Up to F
      { note: 65, duration: 300 }, // F
      { note: 68, duration: 300 }, // Ab
      { note: 70, duration: 300 }, // Bb
      { note: 72, duration: 600 }, // C (high)
      { note: 70, duration: 300 }, // Bb
      { note: 68, duration: 300 }, // Ab
      { note: 65, duration: 600 }, // F (hold)

      // Bar 7-8 (C7) - Back to C
      { note: 60, duration: 300 }, // C
      { note: 63, duration: 300 }, // Eb
      { note: 65, duration: 300 }, // F
      { note: 67, duration: 900 }, // G (hold)

      // Bar 9 (G7) - Turnaround setup
      { note: 67, duration: 300 }, // G
      { note: 70, duration: 300 }, // Bb
      { note: 72, duration: 300 }, // C (high)
      { note: 74, duration: 300 }, // D

      // Bar 10 (F7) - Descending
      { note: 72, duration: 300 }, // C
      { note: 70, duration: 300 }, // Bb
      { note: 68, duration: 300 }, // Ab
      { note: 65, duration: 300 }, // F

      // Bar 11-12 (C7 - G7) - Final phrase
      { note: 60, duration: 300 }, // C
      { note: 63, duration: 300 }, // Eb
      { note: 65, duration: 300 }, // F
      { note: 67, duration: 300 }, // G
      { note: 65, duration: 300 }, // F
      { note: 63, duration: 300 }, // Eb
      { note: 60, duration: 600 }, // C (resolve)
    ];

    let currentNoteIndex = 0;
    let timeoutId: number;

    const playNextNote = () => {
      if (demoMode !== 'solo') return;

      // Load edited patch (use ref to get latest patch without restarting melody)
      synth.setTrackPatch(PREVIEW_CHANNEL, editedPatchRef.current);

      const currentNote = melody[currentNoteIndex];
      const transposedNote = currentNote.note + transpose;

      // Highlight the note being played
      setCurrentSoloNote(transposedNote);

      // Play note
      synth.noteOn(PREVIEW_CHANNEL, transposedNote);

      // Stop note after duration (with slight gap for articulation)
      setTimeout(() => {
        synth.noteOff(PREVIEW_CHANNEL, transposedNote);
        setCurrentSoloNote(null);
      }, currentNote.duration * 0.8);

      // Move to next note
      currentNoteIndex = (currentNoteIndex + 1) % melody.length;

      // Schedule next note
      timeoutId = window.setTimeout(playNextNote, currentNote.duration);
    };

    // Start playing
    playNextNote();

    // Cleanup
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Stop any playing notes (with transpose)
      melody.forEach(({ note }) => {
        synth.noteOff(PREVIEW_CHANNEL, note + transpose);
      });
      setCurrentSoloNote(null);
    };
  }, [demoMode, synth, octaveOffset]);

  // Classical piece playback (Bach's Minuet in G Major - left hand bass + right hand melody)
  useEffect(() => {
    if (demoMode !== 'chords' || !synth) {
      setCurrentChordNotes(new Set());
      return;
    }

    // Use channels 8-11 for left hand (bass + chords), channel 12 for right hand (melody)
    const LEFT_HAND_CHANNELS = [8, 9, 10, 11];
    const RIGHT_HAND_CHANNEL = 12;
    const transpose = octaveOffset * 12; // Transpose amount based on octave offset

    // Bach - Minuet in G Major (BWV Anh. 114) - simplified arrangement
    // Each entry: left hand bass/chord + right hand melody note
    const arrangement = [
      // Measure 1: G major - melody ascends
      { leftHand: [43, 50, 55, 59], melody: 67, duration: 400 },  // G bass, D-G-B chord, G melody
      { leftHand: [43, 50, 55, 59], melody: 69, duration: 400 },  // A
      { leftHand: [43, 50, 55, 59], melody: 71, duration: 400 },  // B
      { leftHand: [43, 50, 55, 59], melody: 72, duration: 400 },  // C

      // Measure 2: D major - melody continues
      { leftHand: [50, 54, 57, 62], melody: 74, duration: 400 },  // D bass, F#-A-D chord, D melody
      { leftHand: [50, 54, 57, 62], melody: 67, duration: 400 },  // G
      { leftHand: [50, 54, 57, 62], melody: 67, duration: 800 },  // G (half note)

      // Measure 3: G major - melody rises again
      { leftHand: [43, 50, 55, 59], melody: 67, duration: 400 },  // G
      { leftHand: [43, 50, 55, 59], melody: 69, duration: 400 },  // A
      { leftHand: [43, 50, 55, 59], melody: 71, duration: 400 },  // B
      { leftHand: [43, 50, 55, 59], melody: 72, duration: 400 },  // C

      // Measure 4: D major - phrase ending
      { leftHand: [50, 54, 57, 62], melody: 74, duration: 400 },  // D
      { leftHand: [50, 54, 57, 62], melody: 71, duration: 400 },  // B
      { leftHand: [50, 54, 57, 62], melody: 71, duration: 800 },  // B (half note)

      // Measure 5: C major - middle section
      { leftHand: [48, 52, 55, 60], melody: 72, duration: 400 },  // C bass, E-G-C chord, C melody
      { leftHand: [48, 52, 55, 60], melody: 74, duration: 400 },  // D
      { leftHand: [48, 52, 55, 60], melody: 76, duration: 400 },  // E
      { leftHand: [48, 52, 55, 60], melody: 74, duration: 400 },  // D

      // Measure 6: G major
      { leftHand: [43, 50, 55, 59], melody: 72, duration: 400 },  // C
      { leftHand: [43, 50, 55, 59], melody: 71, duration: 400 },  // B
      { leftHand: [43, 50, 55, 59], melody: 71, duration: 800 },  // B (half note)

      // Measure 7: D major - descending
      { leftHand: [50, 54, 57, 62], melody: 69, duration: 400 },  // A
      { leftHand: [50, 54, 57, 62], melody: 71, duration: 400 },  // B
      { leftHand: [50, 54, 57, 62], melody: 69, duration: 400 },  // A
      { leftHand: [50, 54, 57, 62], melody: 67, duration: 400 },  // G

      // Measure 8: G major - resolution
      { leftHand: [43, 50, 55, 59], melody: 66, duration: 400 },  // F#
      { leftHand: [43, 50, 55, 59], melody: 67, duration: 400 },  // G
      { leftHand: [43, 50, 55, 59], melody: 67, duration: 800 },  // G (half note - resolution)
    ];

    let currentNoteIndex = 0;
    let timeoutId: number;

    const playNext = () => {
      if (demoMode !== 'chords') return;

      const current = arrangement[currentNoteIndex];

      // Transpose all notes
      const transposedLeftHand = current.leftHand.map(note => note + transpose);
      const transposedMelody = current.melody + transpose;

      // Collect all notes being played (left hand + melody)
      const allNotes = new Set([...transposedLeftHand, transposedMelody]);
      setCurrentChordNotes(allNotes);

      // Load patch for all channels
      LEFT_HAND_CHANNELS.forEach(ch => synth.setTrackPatch(ch, editedPatchRef.current));
      synth.setTrackPatch(RIGHT_HAND_CHANNEL, editedPatchRef.current);

      // Play left hand (bass + chord)
      transposedLeftHand.forEach((note, index) => {
        const channel = LEFT_HAND_CHANNELS[index];
        synth.noteOn(channel, note);
      });

      // Play right hand (melody)
      synth.noteOn(RIGHT_HAND_CHANNEL, transposedMelody);

      // Stop notes after duration
      setTimeout(() => {
        transposedLeftHand.forEach((note, index) => {
          const channel = LEFT_HAND_CHANNELS[index];
          synth.noteOff(channel, note);
        });
        synth.noteOff(RIGHT_HAND_CHANNEL, transposedMelody);
        setCurrentChordNotes(new Set());
      }, current.duration * 0.9);

      // Move to next note
      currentNoteIndex = (currentNoteIndex + 1) % arrangement.length;

      // Schedule next
      timeoutId = window.setTimeout(playNext, current.duration);
    };

    // Start playing
    playNext();

    // Cleanup
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Stop all notes (with transpose)
      LEFT_HAND_CHANNELS.forEach(channel => {
        arrangement.forEach(item => {
          item.leftHand.forEach(note => {
            synth.noteOff(channel, note + transpose);
          });
        });
      });
      arrangement.forEach(item => {
        synth.noteOff(RIGHT_HAND_CHANNEL, item.melody + transpose);
      });
      setCurrentChordNotes(new Set());
    };
  }, [demoMode, synth, octaveOffset]);

  // Arpeggio playback (minor chord progression)
  useEffect(() => {
    if (demoMode !== 'arpeggios' || !synth) {
      setCurrentArpeggioNote(null);
      return;
    }

    const PREVIEW_CHANNEL = 8;
    const transpose = octaveOffset * 12; // Transpose amount based on octave offset

    // Minor chord progression: Am - Dm - Em - Am
    // Each chord: root, minor third, fifth (ascending then descending)
    const arpeggioPattern = [
      // Am (A, C, E)
      { note: 57, duration: 200 }, // A
      { note: 60, duration: 200 }, // C
      { note: 64, duration: 200 }, // E
      { note: 69, duration: 200 }, // A (high)
      { note: 64, duration: 200 }, // E
      { note: 60, duration: 200 }, // C

      // Dm (D, F, A)
      { note: 62, duration: 200 }, // D
      { note: 65, duration: 200 }, // F
      { note: 69, duration: 200 }, // A
      { note: 74, duration: 200 }, // D (high)
      { note: 69, duration: 200 }, // A
      { note: 65, duration: 200 }, // F

      // Em (E, G, B)
      { note: 64, duration: 200 }, // E
      { note: 67, duration: 200 }, // G
      { note: 71, duration: 200 }, // B
      { note: 76, duration: 200 }, // E (high)
      { note: 71, duration: 200 }, // B
      { note: 67, duration: 200 }, // G

      // Am (A, C, E) - resolution
      { note: 57, duration: 200 }, // A
      { note: 60, duration: 200 }, // C
      { note: 64, duration: 200 }, // E
      { note: 69, duration: 200 }, // A (high)
      { note: 64, duration: 200 }, // E
      { note: 60, duration: 200 }, // C
      { note: 57, duration: 400 }, // A (hold)
    ];

    let currentNoteIndex = 0;
    let timeoutId: number;

    const playNextNote = () => {
      if (demoMode !== 'arpeggios') return;

      // Load edited patch
      synth.setTrackPatch(PREVIEW_CHANNEL, editedPatchRef.current);

      const currentNote = arpeggioPattern[currentNoteIndex];
      const transposedNote = currentNote.note + transpose;

      // Highlight the note being played
      setCurrentArpeggioNote(transposedNote);

      // Play note
      synth.noteOn(PREVIEW_CHANNEL, transposedNote);

      // Stop note after duration (with slight gap for articulation)
      setTimeout(() => {
        synth.noteOff(PREVIEW_CHANNEL, transposedNote);
        setCurrentArpeggioNote(null);
      }, currentNote.duration * 0.8);

      // Move to next note
      currentNoteIndex = (currentNoteIndex + 1) % arpeggioPattern.length;

      // Schedule next note
      timeoutId = window.setTimeout(playNextNote, currentNote.duration);
    };

    // Start playing
    playNextNote();

    // Cleanup
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Stop any playing notes (with transpose)
      arpeggioPattern.forEach(({ note }) => {
        synth.noteOff(PREVIEW_CHANNEL, note + transpose);
      });
      setCurrentArpeggioNote(null);
    };
  }, [demoMode, synth, octaveOffset]);

  // Percussion demo (fast staccato drum-like pattern)
  useEffect(() => {
    if (demoMode !== 'percussion' || !synth) {
      setCurrentPercussionNote(null);
      return;
    }

    const PREVIEW_CHANNEL = 8;
    const transpose = octaveOffset * 12;

    // Drum-like rhythm pattern (kick-snare-hihat)
    const pattern = [
      { note: 48, duration: 100 }, // Kick (C)
      { note: 48, duration: 100 }, // Kick
      { note: 62, duration: 80 },  // Snare (D)
      { note: 72, duration: 60 },  // Hihat (C high)
      { note: 48, duration: 100 }, // Kick
      { note: 72, duration: 60 },  // Hihat
      { note: 62, duration: 80 },  // Snare
      { note: 72, duration: 60 },  // Hihat
      { note: 48, duration: 100 }, // Kick
      { note: 72, duration: 60 },  // Hihat
      { note: 48, duration: 100 }, // Kick
      { note: 62, duration: 80 },  // Snare
      { note: 72, duration: 60 },  // Hihat
      { note: 72, duration: 60 },  // Hihat
      { note: 62, duration: 80 },  // Snare
      { note: 72, duration: 60 },  // Hihat
    ];

    let currentNoteIndex = 0;
    let timeoutId: number;

    const playNextNote = () => {
      if (demoMode !== 'percussion') return;

      synth.setTrackPatch(PREVIEW_CHANNEL, editedPatchRef.current);

      const currentNote = pattern[currentNoteIndex];
      const transposedNote = currentNote.note + transpose;

      setCurrentPercussionNote(transposedNote);
      synth.noteOn(PREVIEW_CHANNEL, transposedNote);

      // Very short duration for percussive effect
      setTimeout(() => {
        synth.noteOff(PREVIEW_CHANNEL, transposedNote);
        setCurrentPercussionNote(null);
      }, currentNote.duration * 0.5);

      currentNoteIndex = (currentNoteIndex + 1) % pattern.length;
      timeoutId = window.setTimeout(playNextNote, currentNote.duration);
    };

    playNextNote();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      pattern.forEach(({ note }) => {
        synth.noteOff(PREVIEW_CHANNEL, note + transpose);
      });
      setCurrentPercussionNote(null);
    };
  }, [demoMode, synth, octaveOffset]);

  // Sustain/Pad demo (long held notes)
  useEffect(() => {
    if (demoMode !== 'sustain' || !synth) {
      setCurrentSustainNotes(new Set());
      return;
    }

    const PREVIEW_CHANNEL = 8;
    const transpose = octaveOffset * 12;

    // Ambient pad progression - C major -> F major -> G major -> C major
    const chordProgression = [
      { notes: [60, 64, 67], duration: 4000 }, // C major (C E G)
      { notes: [65, 69, 72], duration: 4000 }, // F major (F A C)
      { notes: [67, 71, 74], duration: 4000 }, // G major (G B D)
      { notes: [60, 64, 67], duration: 4000 }, // C major (C E G)
    ];

    let currentChordIndex = 0;
    let timeoutId: number;

    const playNextChord = () => {
      if (demoMode !== 'sustain') return;

      synth.setTrackPatch(PREVIEW_CHANNEL, editedPatchRef.current);

      const currentChord = chordProgression[currentChordIndex];
      const transposedNotes = currentChord.notes.map(note => note + transpose);

      setCurrentSustainNotes(new Set(transposedNotes));

      // Play all notes in the chord
      transposedNotes.forEach(note => {
        synth.noteOn(PREVIEW_CHANNEL, note);
      });

      // Hold for full duration
      setTimeout(() => {
        transposedNotes.forEach(note => {
          synth.noteOff(PREVIEW_CHANNEL, note);
        });
        setCurrentSustainNotes(new Set());
      }, currentChord.duration * 0.95);

      currentChordIndex = (currentChordIndex + 1) % chordProgression.length;
      timeoutId = window.setTimeout(playNextChord, currentChord.duration);
    };

    playNextChord();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      chordProgression.forEach(chord => {
        chord.notes.forEach(note => {
          synth.noteOff(PREVIEW_CHANNEL, note + transpose);
        });
      });
      setCurrentSustainNotes(new Set());
    };
  }, [demoMode, synth, octaveOffset]);

  // Bass Line demo (walking bass in low register)
  useEffect(() => {
    if (demoMode !== 'bass' || !synth) {
      setCurrentBassNote(null);
      return;
    }

    const PREVIEW_CHANNEL = 8;
    const transpose = octaveOffset * 12;

    // Funky walking bass line
    const bassLine = [
      { note: 36, duration: 400 }, // C (low)
      { note: 43, duration: 400 }, // G
      { note: 41, duration: 400 }, // F
      { note: 38, duration: 400 }, // D
      { note: 36, duration: 400 }, // C
      { note: 38, duration: 400 }, // D
      { note: 40, duration: 400 }, // E
      { note: 41, duration: 400 }, // F
      { note: 43, duration: 400 }, // G
      { note: 41, duration: 400 }, // F
      { note: 40, duration: 400 }, // E
      { note: 38, duration: 400 }, // D
      { note: 36, duration: 800 }, // C (hold)
    ];

    let currentNoteIndex = 0;
    let timeoutId: number;

    const playNextNote = () => {
      if (demoMode !== 'bass') return;

      synth.setTrackPatch(PREVIEW_CHANNEL, editedPatchRef.current);

      const currentNote = bassLine[currentNoteIndex];
      const transposedNote = currentNote.note + transpose;

      setCurrentBassNote(transposedNote);
      synth.noteOn(PREVIEW_CHANNEL, transposedNote);

      setTimeout(() => {
        synth.noteOff(PREVIEW_CHANNEL, transposedNote);
        setCurrentBassNote(null);
      }, currentNote.duration * 0.9);

      currentNoteIndex = (currentNoteIndex + 1) % bassLine.length;
      timeoutId = window.setTimeout(playNextNote, currentNote.duration);
    };

    playNextNote();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      bassLine.forEach(({ note }) => {
        synth.noteOff(PREVIEW_CHANNEL, note + transpose);
      });
      setCurrentBassNote(null);
    };
  }, [demoMode, synth, octaveOffset]);

  // Trill demo (rapid alternation between two notes)
  useEffect(() => {
    if (demoMode !== 'trill' || !synth) {
      setCurrentTrillNote(null);
      return;
    }

    const PREVIEW_CHANNEL = 8;
    const transpose = octaveOffset * 12;

    // Fast trill pattern between adjacent notes
    const trillPattern = [
      { note: 60, duration: 120 }, // C
      { note: 62, duration: 120 }, // D
      { note: 60, duration: 120 }, // C
      { note: 62, duration: 120 }, // D
      { note: 60, duration: 120 }, // C
      { note: 62, duration: 120 }, // D
      { note: 60, duration: 120 }, // C
      { note: 62, duration: 120 }, // D
      // Change to different interval
      { note: 64, duration: 120 }, // E
      { note: 65, duration: 120 }, // F
      { note: 64, duration: 120 }, // E
      { note: 65, duration: 120 }, // F
      { note: 64, duration: 120 }, // E
      { note: 65, duration: 120 }, // F
      { note: 64, duration: 120 }, // E
      { note: 65, duration: 120 }, // F
      // Descending trill
      { note: 67, duration: 120 }, // G
      { note: 65, duration: 120 }, // F
      { note: 67, duration: 120 }, // G
      { note: 65, duration: 120 }, // F
      { note: 67, duration: 120 }, // G
      { note: 65, duration: 120 }, // F
      { note: 67, duration: 200 }, // G (slightly longer)
      { note: 60, duration: 400 }, // C (resolve)
    ];

    let currentNoteIndex = 0;
    let timeoutId: number;

    const playNextNote = () => {
      if (demoMode !== 'trill') return;

      synth.setTrackPatch(PREVIEW_CHANNEL, editedPatchRef.current);

      const currentNote = trillPattern[currentNoteIndex];
      const transposedNote = currentNote.note + transpose;

      setCurrentTrillNote(transposedNote);
      synth.noteOn(PREVIEW_CHANNEL, transposedNote);

      setTimeout(() => {
        synth.noteOff(PREVIEW_CHANNEL, transposedNote);
        setCurrentTrillNote(null);
      }, currentNote.duration * 0.7);

      currentNoteIndex = (currentNoteIndex + 1) % trillPattern.length;
      timeoutId = window.setTimeout(playNextNote, currentNote.duration);
    };

    playNextNote();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      trillPattern.forEach(({ note }) => {
        synth.noteOff(PREVIEW_CHANNEL, note + transpose);
      });
      setCurrentTrillNote(null);
    };
  }, [demoMode, synth, octaveOffset]);

  // Chromatic Scale demo (all 12 notes)
  useEffect(() => {
    if (demoMode !== 'chromatic' || !synth) {
      setCurrentChromaticNote(null);
      return;
    }

    const PREVIEW_CHANNEL = 8;
    const transpose = octaveOffset * 12;

    // Chromatic scale up and down
    const chromaticPattern = [
      // Ascending
      { note: 60, duration: 250 }, // C
      { note: 61, duration: 250 }, // C#
      { note: 62, duration: 250 }, // D
      { note: 63, duration: 250 }, // D#
      { note: 64, duration: 250 }, // E
      { note: 65, duration: 250 }, // F
      { note: 66, duration: 250 }, // F#
      { note: 67, duration: 250 }, // G
      { note: 68, duration: 250 }, // G#
      { note: 69, duration: 250 }, // A
      { note: 70, duration: 250 }, // A#
      { note: 71, duration: 250 }, // B
      { note: 72, duration: 400 }, // C (high, hold)
      // Descending
      { note: 71, duration: 250 }, // B
      { note: 70, duration: 250 }, // A#
      { note: 69, duration: 250 }, // A
      { note: 68, duration: 250 }, // G#
      { note: 67, duration: 250 }, // G
      { note: 66, duration: 250 }, // F#
      { note: 65, duration: 250 }, // F
      { note: 64, duration: 250 }, // E
      { note: 63, duration: 250 }, // D#
      { note: 62, duration: 250 }, // D
      { note: 61, duration: 250 }, // C#
      { note: 60, duration: 600 }, // C (resolve)
    ];

    let currentNoteIndex = 0;
    let timeoutId: number;

    const playNextNote = () => {
      if (demoMode !== 'chromatic') return;

      synth.setTrackPatch(PREVIEW_CHANNEL, editedPatchRef.current);

      const currentNote = chromaticPattern[currentNoteIndex];
      const transposedNote = currentNote.note + transpose;

      setCurrentChromaticNote(transposedNote);
      synth.noteOn(PREVIEW_CHANNEL, transposedNote);

      setTimeout(() => {
        synth.noteOff(PREVIEW_CHANNEL, transposedNote);
        setCurrentChromaticNote(null);
      }, currentNote.duration * 0.8);

      currentNoteIndex = (currentNoteIndex + 1) % chromaticPattern.length;
      timeoutId = window.setTimeout(playNextNote, currentNote.duration);
    };

    playNextNote();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      chromaticPattern.forEach(({ note }) => {
        synth.noteOff(PREVIEW_CHANNEL, note + transpose);
      });
      setCurrentChromaticNote(null);
    };
  }, [demoMode, synth, octaveOffset]);

  // Octave Jump demo (wide interval leaps)
  useEffect(() => {
    if (demoMode !== 'octave-jump' || !synth) {
      setCurrentOctaveJumpNote(null);
      return;
    }

    const PREVIEW_CHANNEL = 8;
    const transpose = octaveOffset * 12;

    // Pattern with large interval jumps
    const jumpPattern = [
      { note: 48, duration: 400 }, // C (low)
      { note: 72, duration: 400 }, // C (high) - octave jump
      { note: 52, duration: 400 }, // E (low)
      { note: 76, duration: 400 }, // E (high) - octave jump
      { note: 55, duration: 400 }, // G (low)
      { note: 79, duration: 400 }, // G (high) - octave jump
      { note: 60, duration: 400 }, // C (mid)
      { note: 84, duration: 400 }, // C (very high) - two octaves
      { note: 55, duration: 400 }, // G (low)
      { note: 67, duration: 400 }, // G (mid) - octave jump
      { note: 52, duration: 400 }, // E (low)
      { note: 64, duration: 400 }, // E (mid) - octave jump
      { note: 48, duration: 800 }, // C (low) - resolve
    ];

    let currentNoteIndex = 0;
    let timeoutId: number;

    const playNextNote = () => {
      if (demoMode !== 'octave-jump') return;

      synth.setTrackPatch(PREVIEW_CHANNEL, editedPatchRef.current);

      const currentNote = jumpPattern[currentNoteIndex];
      const transposedNote = currentNote.note + transpose;

      setCurrentOctaveJumpNote(transposedNote);
      synth.noteOn(PREVIEW_CHANNEL, transposedNote);

      setTimeout(() => {
        synth.noteOff(PREVIEW_CHANNEL, transposedNote);
        setCurrentOctaveJumpNote(null);
      }, currentNote.duration * 0.85);

      currentNoteIndex = (currentNoteIndex + 1) % jumpPattern.length;
      timeoutId = window.setTimeout(playNextNote, currentNote.duration);
    };

    playNextNote();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      jumpPattern.forEach(({ note }) => {
        synth.noteOff(PREVIEW_CHANNEL, note + transpose);
      });
      setCurrentOctaveJumpNote(null);
    };
  }, [demoMode, synth, octaveOffset]);

  /**
   * Preview the current edited patch
   * Temporarily loads it to channel 8 (unused by tracker)
   */
  const handlePreview = () => {
    if (!synth || isPreviewPlaying) return;

    const PREVIEW_CHANNEL = 8; // Channel 8 unused by 4-track pattern
    const PREVIEW_NOTE = 60;   // Middle C
    const PREVIEW_DURATION = 1000; // 1 second

    console.log('[Editor] Previewing patch:', editedPatch.name);

    // Load edited patch to preview channel
    synth.setTrackPatch(PREVIEW_CHANNEL, editedPatch);

    // Play note
    synth.noteOn(PREVIEW_CHANNEL, PREVIEW_NOTE);
    setIsPreviewPlaying(true);

    // Stop after duration
    setTimeout(() => {
      synth.noteOff(PREVIEW_CHANNEL, PREVIEW_NOTE);
      setIsPreviewPlaying(false);
    }, PREVIEW_DURATION);
  };

  const handleSave = () => {
    onSave(trackId, editedPatch);
  };

  const handleReset = () => {
    console.log('[Editor] Resetting to original patch:', currentPatch.name);
    setEditedPatch(currentPatch);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop itself, not its children
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  // Calculate keyboard range based on octave offset
  const BASE_START_NOTE = 48; // C3
  const BASE_END_NOTE = 72;   // C5
  const keyboardStartNote = BASE_START_NOTE + (octaveOffset * 12);
  const keyboardEndNote = BASE_END_NOTE + (octaveOffset * 12);

  // Octave shift handlers (constrain to valid MIDI range 0-127)
  const handleOctaveDown = () => {
    const newStartNote = keyboardStartNote - 12;
    if (newStartNote >= 0) {
      setOctaveOffset(octaveOffset - 1);
    }
  };

  const handleOctaveUp = () => {
    const newEndNote = keyboardEndNote + 12;
    if (newEndNote <= 127) {
      setOctaveOffset(octaveOffset + 1);
    }
  };

  const canShiftDown = keyboardStartNote - 12 >= 0;
  const canShiftUp = keyboardEndNote + 12 <= 127;

  return (
    <div className="editor-backdrop" onClick={handleBackdropClick}>
      <div className="editor-modal">
        {/* Header */}
        <div className="editor-header">
          <h2>Edit Instrument - Track {trackId + 1}</h2>
          <button
            className="editor-close"
            onClick={onCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="editor-body">
          <div className="editor-info">
            <p className="current-instrument">
              Current: <strong>{currentPatch.name}</strong>
            </p>
            {currentPatch.category && (
              <p className="instrument-category">
                Category: {currentPatch.category}
              </p>
            )}
          </div>

          {/* Preset Selection */}
          <div className="editor-section">
            <label className="editor-label" htmlFor="preset-select">
              Select Preset
            </label>
            <select
              id="preset-select"
              className="editor-preset-select"
              value={editedPatch.id}
              onChange={(e) => {
                const newPatchId = parseInt(e.target.value, 10);
                const newPatch = availablePatches.find(p => p.id === newPatchId);
                if (newPatch) {
                  setEditedPatch(newPatch);
                }
              }}
            >
              {availablePatches.map(patch => (
                <option key={patch.id} value={patch.id}>
                  {String(patch.id).padStart(3, '0')} - {patch.name}
                  {patch.category ? ` (${patch.category})` : ''}
                </option>
              ))}
            </select>

            {editedPatch.id !== currentPatch.id && (
              <p className="editor-change-notice">
                ⚠️ Preset changed. Click Save to apply.
              </p>
            )}
          </div>

          {/* ADSR Envelope */}
          <div className="editor-section">
            <h3 className="editor-section-title">Envelope (ADSR)</h3>
            <p className="editor-section-desc">
              Controls how the sound evolves over time
            </p>

            {/* Attack */}
            <div className="editor-param">
              <label className="editor-param-label">Attack</label>
              <div className="editor-slider-row">
                <span className="editor-operator-label">Mod:</span>
                <input
                  type="range"
                  className="editor-slider"
                  min="0"
                  max="15"
                  value={editedPatch.modulator.attackRate}
                  onChange={(e) => setEditedPatch({
                    ...editedPatch,
                    modulator: { ...editedPatch.modulator, attackRate: parseInt(e.target.value) }
                  })}
                />
                <span className="editor-value">{editedPatch.modulator.attackRate}</span>
                <span className="editor-operator-label">Car:</span>
                <input
                  type="range"
                  className="editor-slider"
                  min="0"
                  max="15"
                  value={editedPatch.carrier.attackRate}
                  onChange={(e) => setEditedPatch({
                    ...editedPatch,
                    carrier: { ...editedPatch.carrier, attackRate: parseInt(e.target.value) }
                  })}
                />
                <span className="editor-value">{editedPatch.carrier.attackRate}</span>
              </div>
              <p className="editor-param-hint">Higher = faster attack (15 = instant)</p>
            </div>

            {/* Decay */}
            <div className="editor-param">
              <label className="editor-param-label">Decay</label>
              <div className="editor-slider-row">
                <span className="editor-operator-label">Mod:</span>
                <input
                  type="range"
                  className="editor-slider"
                  min="0"
                  max="15"
                  value={editedPatch.modulator.decayRate}
                  onChange={(e) => setEditedPatch({
                    ...editedPatch,
                    modulator: { ...editedPatch.modulator, decayRate: parseInt(e.target.value) }
                  })}
                />
                <span className="editor-value">{editedPatch.modulator.decayRate}</span>
                <span className="editor-operator-label">Car:</span>
                <input
                  type="range"
                  className="editor-slider"
                  min="0"
                  max="15"
                  value={editedPatch.carrier.decayRate}
                  onChange={(e) => setEditedPatch({
                    ...editedPatch,
                    carrier: { ...editedPatch.carrier, decayRate: parseInt(e.target.value) }
                  })}
                />
                <span className="editor-value">{editedPatch.carrier.decayRate}</span>
              </div>
              <p className="editor-param-hint">How fast volume drops to sustain</p>
            </div>

            {/* Sustain */}
            <div className="editor-param">
              <label className="editor-param-label">Sustain Level</label>
              <div className="editor-slider-row">
                <span className="editor-operator-label">Mod:</span>
                <input
                  type="range"
                  className="editor-slider"
                  min="0"
                  max="15"
                  value={editedPatch.modulator.sustainLevel}
                  onChange={(e) => setEditedPatch({
                    ...editedPatch,
                    modulator: { ...editedPatch.modulator, sustainLevel: parseInt(e.target.value) }
                  })}
                />
                <span className="editor-value">{editedPatch.modulator.sustainLevel}</span>
                <span className="editor-operator-label">Car:</span>
                <input
                  type="range"
                  className="editor-slider"
                  min="0"
                  max="15"
                  value={editedPatch.carrier.sustainLevel}
                  onChange={(e) => setEditedPatch({
                    ...editedPatch,
                    carrier: { ...editedPatch.carrier, sustainLevel: parseInt(e.target.value) }
                  })}
                />
                <span className="editor-value">{editedPatch.carrier.sustainLevel}</span>
              </div>
              <p className="editor-param-hint">Volume while held (0 = loudest, 15 = quietest)</p>
            </div>

            {/* Release */}
            <div className="editor-param">
              <label className="editor-param-label">Release</label>
              <div className="editor-slider-row">
                <span className="editor-operator-label">Mod:</span>
                <input
                  type="range"
                  className="editor-slider"
                  min="0"
                  max="15"
                  value={editedPatch.modulator.releaseRate}
                  onChange={(e) => setEditedPatch({
                    ...editedPatch,
                    modulator: { ...editedPatch.modulator, releaseRate: parseInt(e.target.value) }
                  })}
                />
                <span className="editor-value">{editedPatch.modulator.releaseRate}</span>
                <span className="editor-operator-label">Car:</span>
                <input
                  type="range"
                  className="editor-slider"
                  min="0"
                  max="15"
                  value={editedPatch.carrier.releaseRate}
                  onChange={(e) => setEditedPatch({
                    ...editedPatch,
                    carrier: { ...editedPatch.carrier, releaseRate: parseInt(e.target.value) }
                  })}
                />
                <span className="editor-value">{editedPatch.carrier.releaseRate}</span>
              </div>
              <p className="editor-param-hint">How fast sound fades after release</p>
            </div>
          </div>

          {/* Piano Keyboard Preview */}
          <div className="editor-section">
            <div className="editor-keyboard-container">
              {synth ? (
                <>
                  <div className="editor-keyboard-with-arrows">
                    <button
                      className="editor-octave-arrow editor-octave-arrow-left"
                      onClick={handleOctaveDown}
                      disabled={!canShiftDown}
                      aria-label="Shift octave down"
                      title="Shift octave down"
                    >
                      ◀
                    </button>
                    <PianoKeyboard
                      startNote={keyboardStartNote}
                      endNote={keyboardEndNote}
                      height={90}
                      maxWidth={411}
                      showLabels={true}
                      compact={true}
                      activeNotes={(() => {
                        const activeNotes = new Set<number>();
                        if (currentSoloNote !== null) activeNotes.add(currentSoloNote);
                        if (currentArpeggioNote !== null) activeNotes.add(currentArpeggioNote);
                        if (currentPercussionNote !== null) activeNotes.add(currentPercussionNote);
                        if (currentBassNote !== null) activeNotes.add(currentBassNote);
                        if (currentTrillNote !== null) activeNotes.add(currentTrillNote);
                        if (currentChromaticNote !== null) activeNotes.add(currentChromaticNote);
                        if (currentOctaveJumpNote !== null) activeNotes.add(currentOctaveJumpNote);
                        currentChordNotes.forEach(note => activeNotes.add(note));
                        currentSustainNotes.forEach(note => activeNotes.add(note));
                        return activeNotes.size > 0 ? activeNotes : undefined;
                      })()}
                      onNoteOn={(note) => {
                        // Load edited patch to preview channel before playing
                        const PREVIEW_CHANNEL = 8;
                        synth.setTrackPatch(PREVIEW_CHANNEL, editedPatch);
                        synth.noteOn(PREVIEW_CHANNEL, note);
                      }}
                      onNoteOff={(note) => {
                        const PREVIEW_CHANNEL = 8;
                        synth.noteOff(PREVIEW_CHANNEL, note);
                      }}
                    />
                    <button
                      className="editor-octave-arrow editor-octave-arrow-right"
                      onClick={handleOctaveUp}
                      disabled={!canShiftUp}
                      aria-label="Shift octave up"
                      title="Shift octave up"
                    >
                      ▶
                    </button>
                  </div>
                  <div className="editor-demos-control">
                    <label className="editor-demos-title">Demos</label>
                    <div className="editor-demos-options">
                      <label className="editor-demo-option">
                        <input
                          type="radio"
                          name="demo-mode"
                          value="none"
                          checked={demoMode === 'none'}
                          onChange={() => setDemoMode('none')}
                        />
                        <span>None</span>
                      </label>
                      <label className="editor-demo-option">
                        <input
                          type="radio"
                          name="demo-mode"
                          value="solo"
                          checked={demoMode === 'solo'}
                          onChange={() => setDemoMode('solo')}
                        />
                        <span>Solo</span>
                      </label>
                      <label className="editor-demo-option">
                        <input
                          type="radio"
                          name="demo-mode"
                          value="chords"
                          checked={demoMode === 'chords'}
                          onChange={() => setDemoMode('chords')}
                        />
                        <span>Chords</span>
                      </label>
                      <label className="editor-demo-option">
                        <input
                          type="radio"
                          name="demo-mode"
                          value="arpeggios"
                          checked={demoMode === 'arpeggios'}
                          onChange={() => setDemoMode('arpeggios')}
                        />
                        <span>Arpeggios</span>
                      </label>
                      <label className="editor-demo-option">
                        <input
                          type="radio"
                          name="demo-mode"
                          value="percussion"
                          checked={demoMode === 'percussion'}
                          onChange={() => setDemoMode('percussion')}
                        />
                        <span>Percussion</span>
                      </label>
                      <label className="editor-demo-option">
                        <input
                          type="radio"
                          name="demo-mode"
                          value="sustain"
                          checked={demoMode === 'sustain'}
                          onChange={() => setDemoMode('sustain')}
                        />
                        <span>Sustain</span>
                      </label>
                      <label className="editor-demo-option">
                        <input
                          type="radio"
                          name="demo-mode"
                          value="bass"
                          checked={demoMode === 'bass'}
                          onChange={() => setDemoMode('bass')}
                        />
                        <span>Bass</span>
                      </label>
                      <label className="editor-demo-option">
                        <input
                          type="radio"
                          name="demo-mode"
                          value="trill"
                          checked={demoMode === 'trill'}
                          onChange={() => setDemoMode('trill')}
                        />
                        <span>Trill</span>
                      </label>
                      <label className="editor-demo-option">
                        <input
                          type="radio"
                          name="demo-mode"
                          value="chromatic"
                          checked={demoMode === 'chromatic'}
                          onChange={() => setDemoMode('chromatic')}
                        />
                        <span>Chromatic</span>
                      </label>
                      <label className="editor-demo-option">
                        <input
                          type="radio"
                          name="demo-mode"
                          value="octave-jump"
                          checked={demoMode === 'octave-jump'}
                          onChange={() => setDemoMode('octave-jump')}
                        />
                        <span>Octave Jump</span>
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <p className="editor-keyboard-disabled">
                  Synth not available
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="editor-footer">
          <button
            className="editor-button editor-button-preview"
            onClick={handlePreview}
            disabled={!synth || isPreviewPlaying}
          >
            {isPreviewPlaying ? 'Playing...' : '▶ Preview'}
          </button>
          <button
            className="editor-button editor-button-reset"
            onClick={handleReset}
          >
            Reset
          </button>
          <button
            className="editor-button editor-button-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="editor-button editor-button-save"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
