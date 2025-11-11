# WebOrchestra - Minimal Prototype

## Overview

This directory contains detailed implementation plans for building a minimal OPL3 tracker prototype in 4 progressive parts.

**Goal:** Create the simplest possible working OPL3 music tracker to prove the technology works before building the full application.

**Total Time:** 6-9 hours (can be done over 2-3 days)

---

## Why Build a Minimal Prototype First?

### ✅ Advantages

1. **Validate Core Technology** - Prove OPL3 synthesis works in browser
2. **Quick Feedback** - Get something working in hours, not weeks
3. **Reduce Risk** - Find issues early before building full app
4. **Iterative Development** - Build → Test → Learn → Expand
5. **Working Product** - Have a usable tracker at each stage
6. **Confidence Builder** - Success at each part motivates next step

### ❌ Without Prototype

- Might spend weeks building to discover OPL library doesn't work
- Could hit audio API issues after full UI is built
- Harder to debug problems in large codebase
- Risk of abandoning project if first approach fails

---

## Implementation Strategy

Build in 4 sequential parts, testing each before proceeding:

```
Part 1 (1-2h) → Part 2 (1.5-2h) → Part 3 (2-3h) → Part 4 (1-2h)
   Proof          Core             Tracker          Polish
     ↓              ↓                 ↓                ↓
   Works?       Enhanced?         Complete?        Ready?
```

**Each part is independently testable and builds on the previous.**

---

## The 4 Parts

### [Part 1: Proof of Concept](Part1-ProofOfConcept.md)

**Time:** 1-2 hours
**Objective:** Single button that plays a 1-second OPL tone

**What You Build:**
- Vite + React + TypeScript project
- @malvineous/opl integration
- Web Audio API setup
- One button → hear tone

**What You Prove:**
- ✅ OPL3 works in browser
- ✅ Audio output works
- ✅ Core tech is viable

**Success Criteria:**
- Click button → hear 1-second beep
- No errors in console

---

### [Part 2: Core Engine](Part2-CoreEngine.md)

**Time:** 1.5-2 hours
**Objective:** Reusable audio engine with multiple voices

**What You Build:**
- `SimpleSynth` class - OPL wrapper
- `noteConversion` utilities - Note name ↔ MIDI
- Test suite with 5 audio tests

**What You Prove:**
- ✅ Can play single notes
- ✅ Can play chords (simultaneous)
- ✅ Can play scales (sequential)
- ✅ Note conversion works
- ✅ Multi-voice audio works

**Success Criteria:**
- All 5 test buttons work
- Hear correct pitches
- Multiple notes play together

---

### [Part 3: Tracker UI](Part3-TrackerUI.md)

**Time:** 2-3 hours
**Objective:** Playback engine + editable grid interface

**What You Build:**
- `SimplePlayer` class - Pattern playback
- `TrackerGrid` component - Note editor
- Full app integration (play/stop, BPM)

**What You Prove:**
- ✅ Pattern playback works
- ✅ Timing is accurate
- ✅ Can edit notes in grid
- ✅ Keyboard navigation works
- ✅ Current row highlighting works

**Success Criteria:**
- Can type notes into grid
- Click play → hear pattern
- Pattern loops automatically
- Arrow keys navigate cells
- BPM control works

---

### [Part 4: Polish](Part4-Polish.md)

**Time:** 1-2 hours
**Objective:** Professional UX and error handling

**What You Build:**
- Pattern validation
- Keyboard shortcuts (Space = play/stop)
- Loading screen
- Error handling
- Visual feedback

**What You Prove:**
- ✅ Invalid notes detected
- ✅ Shortcuts work
- ✅ Errors handled gracefully
- ✅ Professional UX
- ✅ Ready to show others!

**Success Criteria:**
- Invalid notes show in red
- Space bar play/stop works
- No crashes or errors
- Looks polished

---

## Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn
- Modern browser (Chrome recommended)
- Code editor (VS Code recommended)

### Start with Part 1

1. Read [Part1-ProofOfConcept.md](Part1-ProofOfConcept.md)
2. Follow step-by-step instructions
3. Test that you hear a tone
4. If successful → proceed to Part 2
5. If issues → debug before continuing

**Important:** Don't skip ahead! Each part builds on the previous.

---

## What You'll Have After Each Part

| After Part | Features | Can You... |
|------------|----------|------------|
| **Part 1** | Single tone button | Hear OPL sound? |
| **Part 2** | Multi-voice engine | Play chords and scales? |
| **Part 3** | Full tracker | Edit and play patterns? |
| **Part 4** | Polished product | Show it to others? |

---

## Feature Comparison

### Minimal Prototype (This)

| Feature | Status |
|---------|--------|
| OPL3 synthesis | ✅ |
| Multiple voices (4 tracks) | ✅ |
| Tracker grid (16 rows) | ✅ |
| Note entry (keyboard) | ✅ |
| Play/Stop | ✅ |
| BPM control | ✅ |
| Pattern looping | ✅ |
| Keyboard navigation | ✅ |
| Pattern validation | ✅ |
| Keyboard shortcuts | ✅ |
| Example patterns | ✅ |
| **Total Time** | **6-9 hours** |

### Full Implementation (Later)

| Feature | Status |
|---------|--------|
| Everything above | ✅ |
| Piano roll editor | ⏳ Later |
| Multiple patterns | ⏳ Later |
| Arrangement timeline | ⏳ Later |
| 128 GM instruments | ⏳ Later |
| Instrument editor | ⏳ Later |
| WAV export | ⏳ Later |
| Project save/load | ⏳ Later |
| Effects | ⏳ Later |
| **Total Time** | **40-60 hours** |

---

## Decision Points

After completing the minimal prototype, you have options:

### Option A: Use It As-Is

**Best if:**
- You want a simple tracker now
- Happy with 4 tracks, 16 rows
- Don't need piano roll or export
- Want to make music immediately

**Time investment:** Done! (6-9 hours)

---

### Option B: Incremental Expansion

**Best if:**
- Want to add features gradually
- Learn as you go
- Prioritize specific features

**Suggested order:**
1. Better instrument (2-3h) → Better sound
2. WAV export (3-4h) → Share music
3. Project save/load (2-3h) → Persist work
4. More patterns (4-5h) → Longer songs
5. Piano roll (8-10h) → Alternative editor

**Time investment:** Add features as needed

---

### Option C: Full Implementation

**Best if:**
- Want complete DAW features
- Have 40-60 hours available
- Want professional result
- Following full plan from start

**Time investment:** 40-60 hours total

---

## Troubleshooting Guide

### Part 1 Issues

**No sound?**
→ Check [Part1-ProofOfConcept.md](Part1-ProofOfConcept.md#troubleshooting) troubleshooting section

**OPL module won't load?**
→ Verify `npm install @malvineous/opl` succeeded

**AudioContext error?**
→ Try different browser (Chrome best)

### Part 2 Issues

**Chord sounds wrong?**
→ Check channels are different (0, 1, 2)

**Notes don't stop?**
→ Verify noteOff called with correct channel

### Part 3 Issues

**Timing is off?**
→ Check BPM calculation in SimplePlayer

**Can't type in grid?**
→ Verify input not disabled, onChange fires

### Part 4 Issues

**Validation not working?**
→ Check import paths for patternValidation

**Keyboard shortcuts interfere?**
→ Check if target is input element

---

## Testing Checklist

After completing all 4 parts:

### Core Functionality
- [ ] Can initialize audio
- [ ] Can hear OPL tones
- [ ] Can play single notes
- [ ] Can play multiple simultaneous notes
- [ ] Can edit notes in grid
- [ ] Can play edited patterns
- [ ] Pattern timing is correct
- [ ] Pattern loops automatically

### UI/UX
- [ ] Keyboard navigation works
- [ ] Arrow keys move between cells
- [ ] Enter/Tab navigation works
- [ ] Delete clears cells
- [ ] Space bar play/stop works
- [ ] Current row highlights
- [ ] Invalid notes show in red
- [ ] Loading screen displays

### Controls
- [ ] Play button works
- [ ] Stop button works
- [ ] BPM control works
- [ ] Load example works
- [ ] Clear button works

### Edge Cases
- [ ] Empty pattern handled
- [ ] Invalid notes blocked
- [ ] BPM validates (60-240)
- [ ] Rapid clicks handled
- [ ] No console errors

---

## File Structure

After completing all parts:

```
minimal-prototype/
├── public/
├── src/
│   ├── components/
│   │   ├── TrackerGrid.tsx
│   │   └── TrackerGrid.css
│   ├── utils/
│   │   ├── noteConversion.ts
│   │   ├── noteConversion.test.ts
│   │   └── patternValidation.ts
│   ├── SimpleSynth.ts
│   ├── SimplePlayer.ts
│   ├── ErrorBoundary.tsx
│   ├── App.tsx
│   ├── App.css
│   ├── main.tsx
│   └── index.css
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

**Total Lines of Code:** ~1500 lines (TypeScript + CSS)

---

## Success Metrics

**Minimal prototype is successful if:**

✅ Can hear OPL3 sound in browser
✅ Can enter notes in tracker format
✅ Can play patterns with correct timing
✅ Can edit and hear changes
✅ Keyboard navigation works
✅ No crashes or errors
✅ Looks professional
✅ Ready to show others

**If all ✅, the core technology is proven and you can confidently proceed to full implementation!**

---

## Next Steps

### After Minimal Prototype Success

1. **Celebrate!** 🎉 - You have a working OPL tracker
2. **Make Music** - Use it, test it, break it
3. **Gather Feedback** - Show to friends/community
4. **Decide Direction** - Use as-is, expand, or full implementation
5. **Reference Docs** - Keep these plans for expanding later

### Expansion Resources

- **Full Implementation Plan:** `../ImplementationPlan.md`
- **Architecture Overview:** `../WebOrchestraOverview.md`
- **Minimal Design Doc:** `../MinimalPrototype.md`

---

## Philosophy

> "Make it work, make it right, make it fast."
> — Kent Beck

**Minimal prototype = "Make it work"**
- Proves core technology
- Validates assumptions
- Builds confidence

**Later iterations = "Make it right"**
- Add features
- Improve architecture
- Refactor code

**Final polish = "Make it fast"**
- Optimize performance
- Professional UX
- Production ready

**Start with minimal. Everything else follows naturally.**

---

## Time Investment Summary

| Approach | Time | Result |
|----------|------|--------|
| **Minimal Prototype** | 6-9 hours | Working tracker |
| **+ Incremental Features** | +2-5h per feature | Custom solution |
| **Full Implementation** | 40-60 hours | Complete DAW |

**Recommendation:** Start minimal. You can always expand later, but you can't "un-build" a complex system that doesn't work.

---

## Questions?

### "Should I skip the minimal prototype?"

**No.** Even if you plan to build the full version, the minimal prototype:
- Validates technology works (1-2 hours vs weeks wasted)
- Teaches you the codebase incrementally
- Provides working reference implementation
- Can be completed in one focused session

### "Can I modify the plan?"

**Yes!** These are guidelines, not rules. Feel free to:
- Adjust feature priorities
- Change UI design
- Add/remove features
- Use different libraries

The core idea (start minimal, prove tech, expand) stays the same.

### "What if Part 1 doesn't work?"

**Then you saved weeks of work!** Better to find out in 1-2 hours that:
- OPL library has issues → research alternatives
- Audio API doesn't work → try different approach
- Browser compatibility problems → adjust strategy

**This is exactly why we build a minimal prototype.**

---

## Support

If you get stuck:

1. **Check troubleshooting sections** in each part
2. **Review console logs** for specific errors
3. **Test incrementally** - don't skip parts
4. **Document what works** before changing it
5. **Ask for help** with specific error messages

Remember: Every working part is progress, even if you hit blockers later.

---

## Final Thoughts

Building software is iterative. This minimal prototype lets you:

- ✅ Prove the idea works
- ✅ Learn the technology
- ✅ Have something to show
- ✅ Build confidence
- ✅ Make informed decisions

**Start with Part 1. Everything else follows.** 🚀

Good luck, and have fun making retro OPL music! 🎵

---

*Last Updated: 2025-01-02*
