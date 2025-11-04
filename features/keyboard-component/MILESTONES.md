# Piano Keyboard Component - Milestones

**Feature:** Reusable Interactive Piano Keyboard
**Created:** 2025-01-04
**Target Completion:** TBD

---

## Milestone Overview

| Phase | Description | Estimate | Status |
|-------|-------------|----------|--------|
| 0 | Design & Planning | 1-2 hours | ✅ Complete |
| 1 | Core Component | 2-3 hours | ✅ Complete |
| 2 | Interaction | 1-2 hours | ✅ Complete |
| 3 | Visual Polish | 1-2 hours | ⏸️ Not Started |
| 4 | Integration | 1-2 hours | ⏸️ Not Started |
| 5 | Testing | 1-2 hours | ⏸️ Not Started |

**Total Estimated Time:** 8-12 hours

---

## Milestone 0: Design & Planning ✅

**Goal:** Create comprehensive design documentation
**Duration:** ~1 hour
**Completed:** 2025-01-04

### Deliverables
- [x] DESIGN.md - Complete design specification
- [x] README.md - Feature overview
- [x] IMPLEMENTATION.md - Step-by-step guide
- [x] MILESTONES.md - This file

### Lessons from Previous Attempt
- [x] Documented why flexbox failed
- [x] Designed absolute positioning approach
- [x] Defined clear success criteria
- [x] Scoped V1 features vs future enhancements

---

## Milestone 1: Core Component & Geometry ✅

**Goal:** Build the foundation - rendering keys with correct positions
**Estimate:** 2-3 hours
**Status:** ✅ Complete
**Completed:** 2025-01-04

### Tasks

#### 1.1 Create Utility Functions
- [x] Create `src/utils/keyboardUtils.ts`
- [x] Implement `isBlackKey()`
- [x] Implement `getNoteName()`
- [x] Implement `getWhiteKeyIndex()` (with absolute positioning fix)
- [x] Implement `countWhiteKeys()`
- [x] Implement `calculateKeyGeometry()`
- [x] Implement `getTrackIndicators()`

#### 1.2 Create Component Structure
- [x] Create `src/components/PianoKeyboard/` directory
- [x] Create `PianoKeyboard.tsx`
- [x] Define `PianoKeyboardProps` interface
- [x] Implement basic component shell
- [x] Add memoized geometry calculations
- [x] Separate white and black keys for rendering
- [x] Add track indicator rendering

#### 1.3 Create Stylesheet
- [x] Create `PianoKeyboard.css`
- [x] Style white keys (gradient, borders, shadows)
- [x] Style black keys (gradient, borders, shadows)
- [x] Add hover states
- [x] Add active states
- [x] Add disabled states
- [x] Add label styles
- [x] Add track indicator styles

#### 1.4 Create Index File
- [x] Create `index.ts` with exports
- [x] Export component
- [x] Export props type

#### 1.5 Create Test Component
- [x] Create `PianoKeyboardTest.tsx`
- [x] Add route to App.tsx
- [x] Test 1 octave rendering
- [x] Test 2 octaves compact mode
- [x] Test custom range
- [x] Test instrument selection
- [x] Test different preset scenarios

### Verification Checklist

#### Visual
- [x] White keys render in correct positions
- [x] Black keys render between correct white keys
- [x] Black keys are properly centered on boundaries
- [x] No alignment issues (unlike previous attempt!)
- [x] Keys have correct dimensions (width/height)
- [x] Gaps between white keys are consistent
- [x] Labels display correctly (when enabled)

#### Technical
- [x] TypeScript compiles without errors
- [x] No console warnings
- [x] Component renders in test page
- [x] Props are properly typed
- [x] Memoization prevents unnecessary recalculations

### Success Criteria
- ✅ Navigate to `/test-keyboard` and see properly aligned piano keyboard
- ✅ Black keys positioned exactly between white keys (no flexbox issues!)
- ✅ Keyboard scales to different sizes (compact mode)
- ✅ Labels readable on white keys
- ✅ Start note changes work correctly with all ranges

### Bug Fixes
- **Start Note Bug**: Fixed `getWhiteKeyIndex()` to use absolute positioning instead of relative positioning, preventing broken keyboard layout when changing start note
- **Drag-to-Play**: Implemented mouse drag functionality with global mouse state tracking
- **Stuck Notes**: Fixed notes getting stuck during fast mouse movement with comprehensive cleanup on global mouse up

---

## Milestone 2: Interaction ✅

**Goal:** Make the keyboard interactive with mouse/touch
**Estimate:** 1-2 hours
**Status:** ✅ Complete
**Completed:** 2025-01-04

### Tasks

#### 2.1 Add Mouse Handlers
- [x] Implement `handleMouseDown()`
- [x] Implement `handleMouseEnter()` (for drag-to-play)
- [x] Implement `handleMouseLeave()`
- [x] Add `pressedKeys` state management
- [x] Add `isMouseDown` state for drag tracking
- [x] Add `lastDragNote` state for cleanup
- [x] Add global mouse up handler with full cleanup
- [x] Combine `pressedKeys` with `activeNotes` prop

#### 2.2 Add Touch Handlers
- [ ] Add `onTouchStart` handler (deferred to Phase 3)
- [ ] Add `onTouchEnd` handler (deferred to Phase 3)
- [ ] Prevent default touch behaviors (deferred to Phase 3)
- [ ] Test on touch device or emulator (deferred to Phase 3)

#### 2.3 Integrate Audio
- [x] Update test component with synth prop
- [x] Call `synth.noteOn()` in `onNoteOn` callback
- [x] Call `synth.noteOff()` in `onNoteOff` callback
- [x] Use channel 8 for preview
- [x] Track active notes state
- [x] Implement instrument selector in test page

### Verification Checklist

#### Mouse Interaction
- [x] Clicking white key plays sound
- [x] Clicking black key plays sound
- [x] Releasing mouse stops sound
- [x] Moving mouse off key while pressed stops sound
- [x] Keys highlight when pressed
- [x] Multiple rapid clicks handled correctly
- [x] **Drag-to-play**: Holding mouse button and dragging changes notes
- [x] **Fast dragging**: No stuck notes during rapid mouse movement

#### Touch Interaction
- [ ] Tapping white key plays sound (deferred to Phase 3)
- [ ] Tapping black key plays sound (deferred to Phase 3)
- [ ] Touch release stops sound (deferred to Phase 3)
- [ ] No scrolling when interacting with keyboard (deferred to Phase 3)
- [ ] Touch targets are large enough (mobile) (deferred to Phase 3)

#### Audio Integration
- [x] Sound plays immediately on click
- [x] Sound stops on release
- [x] Correct MIDI note is played
- [x] No stuck notes
- [x] Console logs show correct note numbers
- [x] Instrument changes affect playback

### Success Criteria
- ✅ Click any key → hear sound immediately
- ✅ Release key → sound stops
- ✅ Drag-to-play works smoothly (glissando effect)
- ✅ No stuck notes during fast dragging
- ✅ Visual feedback matches audio state
- Touch support deferred to Phase 3

---

## Milestone 3: Visual Polish

**Goal:** Refine aesthetics and animations
**Estimate:** 1-2 hours
**Status:** ⏸️ Not Started

### Tasks

#### 3.1 Refine Animations
- [ ] Add smooth transition to active state
- [ ] Add subtle transform on key press
- [ ] Add glow effect for active notes
- [ ] Test animation performance
- [ ] Ensure 60fps during interaction

#### 3.2 Color Refinement
- [ ] Test colors in light backgrounds
- [ ] Test colors in dark backgrounds
- [ ] Ensure sufficient contrast
- [ ] Verify active state visibility
- [ ] Test colorblind-friendly highlighting

#### 3.3 Responsive Adjustments
- [ ] Test at 320px width
- [ ] Test at 768px width
- [ ] Test at 1024px+ width
- [ ] Adjust font sizes for mobile
- [ ] Ensure touch targets are accessible

### Verification Checklist

#### Visual Quality
- [ ] Smooth transitions (no jarring changes)
- [ ] Active state clearly visible
- [ ] Hover state provides feedback
- [ ] Labels readable at all sizes
- [ ] No visual glitches during interaction

#### Performance
- [ ] No frame drops during interaction
- [ ] Animations run at 60fps
- [ ] No layout thrashing
- [ ] Smooth on lower-end devices

#### Accessibility
- [ ] Sufficient color contrast (WCAG AA)
- [ ] Active state works for colorblind users
- [ ] Touch targets minimum 44px (mobile)
- [ ] Focus states visible (for keyboard nav)

### Success Criteria
- Keyboard looks polished and professional
- Animations are smooth and responsive
- Works well on mobile and desktop
- Accessible to all users

---

## Milestone 4: Integration

**Goal:** Integrate keyboard into InstrumentEditor
**Estimate:** 1-2 hours
**Status:** ⏸️ Not Started

### Tasks

#### 4.1 Add to InstrumentEditor
- [ ] Import PianoKeyboard component
- [ ] Add keyboard section after ADSR controls
- [ ] Configure props (range, labels, callbacks)
- [ ] Connect to synth with channel 8
- [ ] Load edited patch (not saved patch) for preview

#### 4.2 Layout Integration
- [ ] Ensure keyboard fits in modal
- [ ] Add proper spacing/padding
- [ ] Test with different screen sizes
- [ ] Verify scrolling behavior
- [ ] Check z-index stacking

#### 4.3 Interaction Testing
- [ ] Test keyboard while editing ADSR
- [ ] Verify edited patch is used for preview
- [ ] Test Preview button alongside keyboard
- [ ] Ensure no conflicts with Reset/Cancel/Save
- [ ] Test modal close with active notes

### Verification Checklist

#### Functional
- [ ] Keyboard appears in InstrumentEditor
- [ ] Clicking keys plays edited patch (not saved)
- [ ] ADSR changes affect keyboard playback immediately
- [ ] Preset changes affect keyboard playback
- [ ] Closing modal releases all notes

#### Layout
- [ ] Keyboard fits within modal width
- [ ] Modal scrolls correctly if needed
- [ ] No layout shift when keyboard added
- [ ] Keyboard centered or properly aligned
- [ ] Works on mobile modal view

#### UX
- [ ] Keyboard enhances editing workflow
- [ ] Doesn't conflict with existing Preview button
- [ ] Clear which patch is being played
- [ ] Intuitive for testing instruments

### Success Criteria
- Open InstrumentEditor → see keyboard below ADSR controls
- Click keyboard keys → hear edited instrument
- Change ADSR values → keyboard reflects changes immediately
- Professional integration with existing UI

---

## Milestone 5: Testing & Refinement

**Goal:** Comprehensive testing and bug fixes
**Estimate:** 1-2 hours
**Status:** ⏸️ Not Started

### Tasks

#### 5.1 Browser Testing
- [ ] Test in Chrome/Edge (Chromium)
- [ ] Test in Firefox
- [ ] Test in Safari (Mac/iOS)
- [ ] Document any browser-specific issues
- [ ] Add CSS vendor prefixes if needed

#### 5.2 Device Testing
- [ ] Test on desktop (Windows/Mac/Linux)
- [ ] Test on tablet (iPad, Android tablet)
- [ ] Test on mobile (iPhone, Android phone)
- [ ] Test with mouse
- [ ] Test with touchscreen

#### 5.3 Edge Case Testing
- [ ] Single note range (startNote === endNote)
- [ ] Very large range (4+ octaves)
- [ ] Extreme MIDI ranges (0-20, 100-127)
- [ ] Rapid clicking/tapping
- [ ] Multiple simultaneous notes
- [ ] Disabled state
- [ ] Missing onNoteOn/onNoteOff callbacks

#### 5.4 Performance Testing
- [ ] Profile component rendering
- [ ] Check memory usage
- [ ] Monitor for memory leaks
- [ ] Test with React DevTools Profiler
- [ ] Verify memoization is working

#### 5.5 Code Quality
- [ ] Run TypeScript compiler (no errors)
- [ ] Run ESLint (no warnings)
- [ ] Run Prettier (consistent formatting)
- [ ] Add JSDoc comments
- [ ] Review for code smells

### Verification Checklist

#### Comprehensive Testing
- [ ] No errors in console (any browser)
- [ ] No visual glitches (any device)
- [ ] Smooth interaction (any input method)
- [ ] Handles all edge cases gracefully
- [ ] Performance is acceptable

#### Code Quality
- [ ] TypeScript: 0 errors
- [ ] ESLint: 0 warnings
- [ ] Prettier: Formatted
- [ ] Documentation: Complete
- [ ] Tests: Passing (if written)

#### User Experience
- [ ] Intuitive to use
- [ ] Responsive feedback
- [ ] No unexpected behavior
- [ ] Works in all target environments

### Success Criteria
- Zero bugs found during testing
- Works flawlessly across all browsers/devices
- Code is clean, documented, and maintainable
- Ready for production use

---

## Completion Criteria

The keyboard component is considered **COMPLETE** when:

### Functional Requirements ✅
- [ ] Renders any MIDI note range correctly
- [ ] Interactive (mouse and touch)
- [ ] Fires onNoteOn/onNoteOff callbacks
- [ ] Highlights activeNotes prop
- [ ] Respects disabled state
- [ ] Shows labels when requested
- [ ] Supports compact mode

### Quality Requirements ✅
- [ ] No alignment issues (black keys perfect)
- [ ] Smooth animations
- [ ] Accessible (ARIA labels, contrast)
- [ ] Responsive (mobile to desktop)
- [ ] Performant (60fps, no lag)
- [ ] Cross-browser compatible

### Integration Requirements ✅
- [ ] Works in InstrumentEditor
- [ ] Plays edited patch correctly
- [ ] No conflicts with existing UI
- [ ] Professional appearance

### Code Requirements ✅
- [ ] TypeScript: No errors
- [ ] ESLint: No warnings
- [ ] Well documented
- [ ] Properly memoized
- [ ] Follows project conventions

---

## Future Enhancements (V2)

After V1 is complete and stable:

### Phase V2.1: Enhanced Interaction
- [ ] Keyboard shortcuts (computer keyboard → piano keys)
- [ ] Velocity sensitivity (click speed affects volume)
- [ ] Sustain pedal simulation
- [ ] Multi-touch chord support

### Phase V2.2: Visualization Features
- [ ] Integration with pattern player
- [ ] Real-time note highlighting during playback
- [ ] Animated note trails
- [ ] Waveform overlay per key

### Phase V2.3: Input Mode
- [ ] Click to add notes to pattern
- [ ] Record mode (capture played sequence)
- [ ] Quantization options
- [ ] Undo/redo support

---

## Blockers & Risks

### Current Blockers
_None (design phase)_

### Potential Risks

#### Risk: Black Key Alignment Issues (High)
**Impact:** Major visual bug, component unusable
**Mitigation:** Use absolute positioning with calculated offsets (not flexbox)
**Status:** Addressed in design

#### Risk: Performance with Large Ranges (Medium)
**Impact:** Lag when rendering 3+ octaves
**Mitigation:** Memoize geometry calculations, use CSS transforms
**Status:** Addressed in implementation plan

#### Risk: Touch Input Conflicts (Medium)
**Impact:** Scrolling interferes with keyboard interaction
**Mitigation:** Use `touch-action: none` CSS, prevent default on handlers
**Status:** Addressed in implementation plan

#### Risk: Browser Compatibility (Low)
**Impact:** May not work in older browsers
**Mitigation:** Use standard CSS, test in target browsers, add fallbacks
**Status:** Will verify during Phase 5

---

## Decision Log

### 2025-01-04: Initial Design
- **Decision:** Use absolute positioning for all keys (not flexbox)
- **Rationale:** Previous flexbox attempt had persistent alignment issues
- **Impact:** More complex positioning logic, but reliable layout

### 2025-01-04: Scaling Strategy
- **Decision:** Fixed key widths + CSS transform for scaling
- **Rationale:** Simpler than dynamic width calculations
- **Impact:** Consistent key proportions at all sizes

### 2025-01-04: Touch Handling
- **Decision:** Prevent default touch behavior
- **Rationale:** Avoid scrolling conflicts
- **Impact:** Requires explicit touch handlers

### 2025-01-04: V1 Scope
- **Decision:** Defer keyboard nav, velocity, and recording to V2
- **Rationale:** Keep V1 focused and achievable
- **Impact:** Faster delivery, lower risk

---

## Notes

### Key Learnings from Previous Attempt
1. **Flexbox is not suitable for piano keyboards** - black key positioning requires explicit pixel values
2. **Test positioning early** - visual bugs are hard to fix later
3. **Start simple** - focus on core functionality before polish

### Development Tips
1. Test each utility function in isolation first
2. Verify key geometry calculations with console logs
3. Use browser DevTools to inspect element positions
4. Test touch on actual device, not just emulator

### Performance Considerations
- Memoize expensive calculations (geometry, note lists)
- Use CSS transforms for animations (hardware accelerated)
- Avoid inline styles where possible (use classes)
- Profile with React DevTools before optimization

---

## Sign-off

### Phase 0: Design Complete ✅
- **Completed By:** Claude
- **Date:** 2025-01-04
- **Review Status:** Approved
- **Next Phase:** Phase 1 (Core Component)

---

**Last Updated:** 2025-01-04
**Document Version:** 1.0
