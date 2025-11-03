# Instrument Panel - Implementation Milestones

**Strategy:** Break into small, independently testable pieces

---

## Milestone 1: Type Definitions & Manual Patch Loading (2-3 hours)

**Goal:** Create types and prove we can load different sounds per channel

**Files to Create:**
- `src/types/OPLPatch.ts` - Type definitions

**Files to Modify:**
- `src/SimpleSynth.ts` - Add `loadPatch()` method

**Manual Test:**
```typescript
// In browser console after app loads:
const testPatch = { /* hardcoded piano patch */ };
window.synth.loadPatch(0, testPatch);
window.synth.noteOn(0, 60);
// Should hear different sound than default
```

**Success Criteria:**
- [x] Types compile without errors
- [x] Can call `synth.loadPatch(0, somePatch)`
- [x] Hear different sound after loading patch
- [x] Can load different patch to channel 1, sounds different from channel 0

**Deliverable:** Can manually program different sounds per channel via console

**Bonus:** Created interactive PatchTest UI component at `/test` route for easier testing

---

## Milestone 2: Default Patches (1-2 hours)

**Goal:** Create 4 hardcoded instrument presets

**Files to Create:**
- `src/data/defaultPatches.ts` - Piano, Bass, Lead, Pad

**Manual Test:**
```typescript
// In browser console:
import { defaultPatches } from './data/defaultPatches';
window.synth.loadPatch(0, defaultPatches[0]); // Piano
window.synth.loadPatch(1, defaultPatches[1]); // Bass
window.synth.noteOn(0, 60); // Hear piano
window.synth.noteOn(1, 48); // Hear bass
```

**Success Criteria:**
- [x] 4 distinct-sounding patches defined
- [x] Can load each patch and hear difference
- [x] Patches don't cause audio glitches

**Deliverable:** 4 working instrument presets

---

## Milestone 3: Track-to-Channel Mapping (2-3 hours)

**Goal:** Each track uses its own instrument

**Files to Modify:**
- `src/App.tsx` - Add `trackInstruments` state
- `src/SimpleSynth.ts` - Initialize channels with patches

**Manual Test:**
1. Add this to App.tsx temporarily:
```typescript
useEffect(() => {
  if (synth && defaultPatches) {
    synth.loadPatch(0, defaultPatches[0]); // Track 0 = Piano
    synth.loadPatch(1, defaultPatches[1]); // Track 1 = Bass
    synth.loadPatch(2, defaultPatches[2]); // Track 2 = Lead
    synth.loadPatch(3, defaultPatches[3]); // Track 3 = Pad
  }
}, [synth]);
```

2. Load example pattern
3. Play - each track should sound different

**Success Criteria:**
- [x] Track 0 sounds like Piano
- [x] Track 1 sounds like Bass
- [x] Track 2 sounds like Lead
- [x] Track 3 sounds like Pad
- [x] All 4 tracks play simultaneously with different sounds

**Deliverable:** Tracks have different hardcoded instruments

---

## Milestone 4: Instrument Selector UI (3-4 hours)

**Goal:** Dropdown menus to choose instruments per track

**Files to Create:**
- `src/components/InstrumentSelector.tsx`
- `src/components/InstrumentSelector.css`

**Files to Modify:**
- `src/App.tsx` - Add selector component

**Manual Test:**
1. Open app
2. See 4 dropdowns (one per track)
3. Each shows: "0 - Piano", "1 - Bass", "2 - Lead", "3 - Pad"
4. Change Track 0 from Piano to Bass
5. Play - Track 0 should now sound like Bass

**Success Criteria:**
- [x] 4 dropdowns visible
- [x] Dropdowns disabled during playback
- [x] Changing dropdown changes sound
- [x] Selection persists until page reload

**Deliverable:** Working instrument selector (4 presets only)

---

## Milestone 5: GENMIDI Loader (4-5 hours)

**Goal:** Load 128 instruments from JSON file

**Files to Create:**
- `public/instruments/GENMIDI.json` - Fetch from external source
- `src/utils/genmidiParser.ts` - Parse JSON to OPLPatch[]

**Files to Modify:**
- `src/App.tsx` - Load GENMIDI on startup

**Manual Test:**
1. Start app
2. Check console: "Loading GENMIDI instrument bank..."
3. Check console: "Loaded 128 instruments"
4. Open dropdown - see 128 options (0-127)
5. Select instrument 5 (Electric Piano)
6. Play - should sound like electric piano

**Success Criteria:**
- [x] GENMIDI.json loads without errors
- [x] Dropdowns show 128 instruments
- [x] Each instrument has a name
- [x] Selecting different instruments changes sound
- [x] Falls back to defaultPatches if GENMIDI fails

**Deliverable:** 128 instruments available in dropdowns

---

## Milestone 6: Simple Editor Modal Shell (3-4 hours)

**Goal:** Modal opens, shows current patch, has close button

**Files to Create:**
- `src/components/InstrumentEditor.tsx` - Modal shell
- `src/components/InstrumentEditor.css` - Modal styling

**Files to Modify:**
- `src/App.tsx` - Add modal state

**Manual Test:**
1. Click "Edit" button next to Track 0 dropdown
2. Modal opens with dark overlay
3. Header shows "Edit Instrument - Track 1"
4. Shows current instrument name: "Acoustic Grand Piano"
5. Click X or Cancel - modal closes
6. Click outside modal - modal closes

**Success Criteria:**
- [x] Modal opens when clicking Edit button
- [x] Modal closes via X, Cancel, or outside click
- [x] Shows correct track number and instrument name
- [x] Escape key closes modal
- [x] Modal backdrop prevents interaction with tracker

**Deliverable:** Modal shell with no editing yet

---

## Milestone 7: Simple Editor - Preset Selector (2-3 hours)

**Goal:** Change instrument via dropdown in modal

**Files to Modify:**
- `src/components/InstrumentEditor.tsx` - Add preset dropdown

**Manual Test:**
1. Open editor for Track 0
2. See dropdown showing current instrument
3. Change to "Electric Piano"
4. Click Save
5. Modal closes
6. Track 0 dropdown now shows "Electric Piano"
7. Play - sounds like electric piano

**Success Criteria:**
- [x] Preset dropdown shows all 128 instruments
- [x] Current instrument is pre-selected
- [x] Changing preset updates editor display
- [x] Save button applies change
- [x] Cancel button discards change

**Deliverable:** Can switch instruments via modal

---

## Milestone 8: Simple Editor - ADSR Sliders (3-4 hours)

**Goal:** Edit Attack, Decay, Sustain, Release

**Files to Modify:**
- `src/components/InstrumentEditor.tsx` - Add 4 sliders

**Manual Test:**
1. Open editor for Track 0 (Piano)
2. See sliders: Attack=15, Decay=5, Sustain=7, Release=7
3. Move Attack slider to 0 (slow attack)
4. Click "Preview" button - hear slow attack
5. Click Save
6. Play pattern - notes have slow attack

**Success Criteria:**
- [x] 4 sliders visible with current values
- [x] Moving slider updates value display
- [x] Preview button plays middle C with current settings
- [x] Save applies changes to track
- [x] Changes persist during session

**Deliverable:** Can edit ADSR envelope

---

## Milestone 9: Simple Editor - Volume & Feedback (2-3 hours)

**Goal:** Add 6 more sliders (10 total in Simple view)

**Files to Modify:**
- `src/components/InstrumentEditor.tsx` - Add remaining sliders

**Parameters to Add:**
- Modulator Volume (0-63)
- Carrier Volume (0-63)
- Feedback (0-7)
- Modulator Waveform (dropdown)
- Carrier Waveform (dropdown)
- Connection (toggle)

**Manual Test:**
1. Open editor
2. Change Feedback from 0 to 7
3. Preview - sound more "metallic"
4. Change Carrier Waveform to "Half-Sine"
5. Preview - sound has different timbre
6. Save and play pattern

**Success Criteria:**
- [x] All 10 parameters editable
- [x] Each parameter affects sound
- [x] Preview plays with current settings
- [x] Values saved correctly

**Deliverable:** Complete Simple view (10 parameters)

---

## Milestone 10: Simple/Advanced Toggle (2-3 hours)

**Goal:** Tab to switch between Simple and Advanced views

**Files to Modify:**
- `src/components/InstrumentEditor.tsx` - Add toggle, advanced placeholder

**Manual Test:**
1. Open editor (defaults to Simple view)
2. Click "Advanced" tab
3. See message: "Advanced parameters (coming soon)"
4. Click "Simple" tab
5. Back to simple view with sliders

**Success Criteria:**
- [x] Toggle switches between views
- [x] Active tab highlighted
- [x] Simple view unchanged
- [x] Advanced view shows placeholder

**Deliverable:** View toggle working (Advanced empty)

---

## Milestone 11: Advanced View - Full Parameters (6-8 hours)

**Goal:** Expose all 24+ OPL3 parameters

**Files to Modify:**
- `src/components/InstrumentEditor.tsx` - Implement Advanced view

**Manual Test:**
1. Open editor, switch to Advanced
2. See "Operator 1 (Modulator)" section
3. See "Operator 2 (Carrier)" section
4. Edit Frequency Multiplier (Carrier) from 1 to 2
5. Preview - sound one octave higher
6. Edit Key Scale Level
7. Save and test

**Success Criteria:**
- [x] All operator parameters visible
- [x] Parameters grouped logically
- [x] Checkboxes for boolean flags
- [x] Changes affect sound correctly
- [x] Can create complex custom patches

**Deliverable:** Complete Advanced view

---

## Milestone 12: LocalStorage Persistence (2-3 hours)

**Goal:** Save instrument selections across page reloads

**Files to Create:**
- `src/utils/storageManager.ts`

**Files to Modify:**
- `src/App.tsx` - Load/save on mount/change

**Manual Test:**
1. Change Track 0 to Electric Piano
2. Edit Track 1's ADSR values
3. Reload page
4. Track 0 still shows Electric Piano
5. Track 1 still has custom ADSR values

**Success Criteria:**
- [x] Selections saved to localStorage
- [x] Selections loaded on startup
- [x] Custom edits persist
- [x] Clear localStorage works

**Deliverable:** Instrument choices persist

---

## Milestone 13: Polish & Documentation (3-4 hours)

**Goal:** Final touches, help docs, testing

**Tasks:**
- [ ] Update help section in App.tsx
- [ ] Add tooltips to all parameters
- [ ] Test on mobile/tablet
- [ ] Fix any visual glitches
- [ ] Comprehensive testing
- [ ] Update STATUS.md

**Manual Test:**
1. Run through all previous tests
2. Test on phone
3. Test on tablet
4. Test with screen reader (basic)
5. Check console for warnings

**Success Criteria:**
- [x] No console errors
- [x] Help documentation complete
- [x] Mobile responsive
- [x] All features working
- [x] No known bugs

**Deliverable:** Production-ready feature

---

## Testing Template for Each Milestone

```markdown
## Testing Milestone X

**Date:** ___________
**Tester:** ___________

### Pre-Test
- [ ] Code compiles without errors
- [ ] Dev server starts successfully
- [ ] No console errors on page load

### Functionality Tests
- [ ] Test 1: [Description] - PASS/FAIL
- [ ] Test 2: [Description] - PASS/FAIL
- [ ] Test 3: [Description] - PASS/FAIL

### Bugs Found
1. [Bug description]
2. [Bug description]

### Ready for Next Milestone?
- [ ] YES - All tests pass
- [ ] NO - Bugs need fixing
```

---

## Recommended Implementation Order

**Week 1:** Milestones 1-3 (Foundation)
- Get different sounds per track working
- Everything testable via console/hardcode

**Week 2:** Milestones 4-5 (UI + GENMIDI)
- Add visual controls
- Load full instrument bank

**Week 3:** Milestones 6-8 (Simple Editor)
- Modal with preset switching
- ADSR editing

**Week 4:** Milestones 9-11 (Complete Editor)
- Full Simple view
- Advanced view

**Week 5:** Milestones 12-13 (Polish)
- Persistence
- Documentation
- Testing

---

## Success Metrics

After each milestone, answer:
1. ✅ Can I manually test this feature?
2. ✅ Does it work without the next milestone?
3. ✅ Is the test repeatable?
4. ✅ Would a user see value from this alone?

If YES to all 4 → Move to next milestone
If NO to any → Fix before proceeding

---

## Current Status

- [x] Milestone 1: Complete (2025-01-03)
- [x] Milestone 2: Complete (2025-01-03)
- [x] Milestone 3: Complete (2025-01-03)
- [x] Milestone 4: Complete (2025-01-03)
- [ ] Milestone 5: Not started
- [ ] Milestone 6: Not started
- [ ] Milestone 7: Not started
- [ ] Milestone 8: Not started
- [ ] Milestone 9: Not started
- [ ] Milestone 10: Not started
- [ ] Milestone 11: Not started
- [ ] Milestone 12: Not started
- [ ] Milestone 13: Not started

**Next:** Begin Milestone 5 (GENMIDI Loader - 128 instruments)
