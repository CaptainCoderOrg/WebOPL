# Phase 3 Testing Guide

**Status:** Ready for Testing
**Date:** 2025-11-11

---

## Quick Start

1. Start the development server:
   ```bash
   cd minimal-prototype
   npm run dev
   ```

2. Open the tracker in your browser (typically http://localhost:5173)

3. Follow the testing checklist below

---

## Testing Checklist

### ✅ Visual Verification

- [ ] **CollectionSelector appears** in the tracker UI
  - Should appear below the instrument bank dropdown
  - Should show a dropdown/select element
  - Should display "Collection:" label with info icon

- [ ] **Dropdown displays 6 collections:**
  - GENMIDI (DMXOPL3) - 128 instruments
  - Doom (Bobby Prince v1) - 128 instruments
  - Doom 2 (Bobby Prince v2) - 128 instruments
  - Heretic (Cygnus Studios) - 128 instruments
  - Raptor: Call of the Shadows - 128 instruments
  - Strife - 128 instruments

- [ ] **Collection metadata displays** (when collection is selected):
  - Description text (italic, gray)
  - Game name
  - Author name
  - Year

- [ ] **Default collection is selected** on first load
  - Should be "GENMIDI (DMXOPL3)"
  - Check if `isDefault: true` in catalog.json

---

### ✅ Functionality Testing

#### Collection Loading

- [ ] **Page loads successfully** without errors
  - Check browser console (F12) for errors
  - Should see logs like:
    ```
    [App] Loading instrument catalog...
    [App] Using default collection: genmidi-dmxopl3
    [App] Loading collection: genmidi-dmxopl3
    [App] Loaded 128 instruments from GENMIDI (DMXOPL3)
    ```

- [ ] **Instruments load from default collection**
  - Instrument dropdown should show 128 instruments
  - Instruments should have names from GENMIDI

- [ ] **CollectionSelector is disabled during playback**
  - Start playback (press Play button)
  - CollectionSelector should be disabled/grayed out
  - Stop playback
  - CollectionSelector should re-enable

#### Collection Switching

- [ ] **Switch to Doom collection**
  - Select "Doom (Bobby Prince v1)" from dropdown
  - Should see console log: `[App] Switching to collection: doom1-bobby-prince-v1`
  - Instrument bank should reload with new instruments
  - Check console for: `[App] Loaded 128 instruments from Doom (Bobby Prince v1)`

- [ ] **Switch to Doom 2 collection**
  - Select "Doom 2 (Bobby Prince v2)"
  - Verify instruments reload

- [ ] **Switch to Heretic collection**
  - Select "Heretic (Cygnus Studios)"
  - Verify instruments reload

- [ ] **Switch to Raptor collection**
  - Select "Raptor: Call of the Shadows"
  - Verify instruments reload

- [ ] **Switch to Strife collection**
  - Select "Strife"
  - Verify instruments reload

- [ ] **Switch back to default**
  - Select "GENMIDI (DMXOPL3)"
  - Verify instruments reload

#### Instrument Playback

- [ ] **Play a note with default collection**
  - Select an instrument
  - Click a cell in the tracker grid
  - Should hear sound

- [ ] **Play a note with Doom collection**
  - Switch to Doom collection
  - Select an instrument
  - Play a note
  - Should hear sound (may sound different from default)

- [ ] **Play a note with each collection**
  - Repeat for all 6 collections
  - Verify sound plays correctly

- [ ] **Compare instrument sounds across collections**
  - Same instrument number may sound different in different collections
  - This is expected behavior

#### localStorage Persistence

- [ ] **Selection persists across refresh**
  - Select "Doom 2 (Bobby Prince v2)"
  - Refresh the page (F5)
  - Should still show "Doom 2 (Bobby Prince v2)" selected
  - Check localStorage in DevTools:
    - Key: `selected-collection-id`
    - Value: `doom2-bobby-prince-v2`

- [ ] **Clear localStorage and verify default**
  - Open browser DevTools (F12)
  - Go to Application/Storage → Local Storage
  - Delete `selected-collection-id` key
  - Refresh page
  - Should default to "GENMIDI (DMXOPL3)"

---

### ✅ Error Handling

#### Graceful Degradation

- [ ] **Test fallback to legacy GENMIDI**
  - Temporarily rename catalog.json
  - Refresh page
  - Should see console log: `[App] Falling back to legacy GENMIDI loading`
  - Instruments should still load from `legacy/GENMIDI.json`
  - CollectionSelector should not appear

- [ ] **Test fallback to default patches**
  - Temporarily rename both catalog.json and GENMIDI.json
  - Refresh page
  - Should see: `[App] Using default instrument patches as fallback`
  - Should load hardcoded default patches

- [ ] **Restore files after testing**
  - Restore catalog.json and GENMIDI.json
  - Verify normal operation resumes

#### Missing Collection File

- [ ] **Test missing collection file** (optional)
  - Temporarily rename one collection file (e.g., doom1.json)
  - Try selecting that collection
  - Should see error in console
  - Should fall back gracefully

---

### ✅ UI/UX Testing

#### Visual Design

- [ ] **Styling matches existing UI**
  - CollectionSelector should blend with existing components
  - Colors, fonts, spacing should be consistent
  - Check CSS in [CollectionSelector.css](../minimal-prototype/src/components/CollectionSelector.css)

- [ ] **Responsive design** (optional)
  - Resize browser window
  - CollectionSelector should adjust appropriately

- [ ] **Loading states**
  - Check if loading indicator appears during collection load
  - Should see `loading` class applied during load

- [ ] **Disabled state**
  - Start playback
  - CollectionSelector should appear disabled/grayed
  - Hover should show "not-allowed" cursor

#### Accessibility

- [ ] **Keyboard navigation**
  - Tab to CollectionSelector
  - Use arrow keys to change selection
  - Press Enter to confirm

- [ ] **Screen reader support** (if applicable)
  - Labels should be properly associated with elements
  - Info icon should have accessible text

---

### ✅ Performance Testing

- [ ] **Initial load time**
  - Measure time from page load to ready
  - Should be under 2 seconds

- [ ] **Collection switching speed**
  - Measure time to switch collections
  - First switch: ~200-500ms (network + parsing)
  - Subsequent switches: <100ms (cached)

- [ ] **Memory usage** (optional)
  - Open DevTools → Performance/Memory
  - Switch between collections multiple times
  - Check for memory leaks

---

### ✅ Console Logs to Expect

#### Successful Load Sequence

```
=== Initializing WebOrchestra ===
[App] Synth exposed as window.synth for testing
=== Ready! ===
[App] Loading instrument catalog...
[App] Using default collection: genmidi-dmxopl3
[App] Loading collection: genmidi-dmxopl3
[App] Loaded 128 instruments from GENMIDI (DMXOPL3)
[App] Collection loaded successfully
```

#### Collection Switch

```
[App] Switching to collection: doom1-bobby-prince-v1
[App] Loading collection: doom1-bobby-prince-v1
[catalogLoader] Loading collection: doom1-bobby-prince-v1
[catalogLoader] Using cached collection: doom1-bobby-prince-v1
[App] Loaded 128 instruments from Doom (Bobby Prince v1)
[App] Collection loaded successfully
```

#### Fallback to Legacy

```
[App] Failed to load catalog: [error message]
[App] Falling back to legacy GENMIDI loading
[App] Loading legacy GENMIDI instrument bank...
[App] Loaded 128 instruments from GENMIDI
[App] GENMIDI bank loaded successfully
```

---

## Known Issues to Watch For

### Issue 1: Collection Not Loading

**Symptoms:**
- Dropdown shows collections but instruments don't change
- Console shows 404 errors

**Check:**
- Verify all JSON files exist in `public/instruments/`
- Check file paths in catalog.json match actual files
- Check network tab in DevTools for failed requests

### Issue 2: CollectionSelector Not Appearing

**Symptoms:**
- No dropdown visible in UI

**Check:**
- Verify App.tsx passes catalog props to Tracker
- Check if `catalog` is null (check console logs)
- Verify CollectionSelector component is imported in Tracker.tsx

### Issue 3: localStorage Not Persisting

**Symptoms:**
- Selection doesn't persist after refresh

**Check:**
- Verify localStorage is enabled in browser
- Check if `handleCollectionChange` in App.tsx saves to localStorage
- Open DevTools → Application → Local Storage

### Issue 4: Instruments Sound Wrong

**Symptoms:**
- Instruments play but sound incorrect

**Check:**
- This may be expected - different collections have different patches
- Compare with original Doom/Doom2 to verify authenticity
- Check if correct collection is actually loaded (console logs)

---

## Testing Report Template

After testing, fill out this report:

```markdown
## Phase 3 Testing Report

**Tester:** [Your Name]
**Date:** [Date]
**Browser:** [Chrome/Firefox/Safari/Edge]
**Version:** [Browser Version]

### Test Results

#### Visual Verification
- [ ] PASS / [ ] FAIL - CollectionSelector appears
- [ ] PASS / [ ] FAIL - Dropdown displays 6 collections
- [ ] PASS / [ ] FAIL - Metadata displays correctly

#### Functionality
- [ ] PASS / [ ] FAIL - Page loads successfully
- [ ] PASS / [ ] FAIL - Default collection loads
- [ ] PASS / [ ] FAIL - Collection switching works
- [ ] PASS / [ ] FAIL - Instruments play correctly

#### Persistence
- [ ] PASS / [ ] FAIL - localStorage persists selection

#### Error Handling
- [ ] PASS / [ ] FAIL - Fallback to legacy GENMIDI
- [ ] PASS / [ ] FAIL - Fallback to default patches

### Issues Found

1. **[Issue Title]**
   - Severity: High/Medium/Low
   - Description: [What went wrong]
   - Steps to reproduce: [How to trigger the issue]
   - Expected: [What should happen]
   - Actual: [What actually happened]

### Notes

[Any additional observations or comments]

### Conclusion

- [ ] Phase 3 is complete and ready for use
- [ ] Phase 3 needs fixes (see issues above)
```

---

## Next Steps After Testing

### If Tests Pass

1. Mark "Test the implementation" as completed
2. Update PHASE3-COMPLETE.md with results
3. Proceed to Phase 4 (Enhanced UI) or consider Phase 3 complete

### If Tests Fail

1. Document failures in testing report
2. Fix issues found
3. Re-run tests
4. Update documentation

---

## Additional Testing (Optional)

### Edge Cases

- [ ] Test with no internet connection (should work - all local files)
- [ ] Test with very slow network (artificial throttling)
- [ ] Test with browser cache disabled
- [ ] Test in private/incognito mode
- [ ] Test with multiple tabs open simultaneously

### Cross-Browser Testing

- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (Mac only)
- [ ] Edge

### Mobile Testing (if applicable)

- [ ] Test on mobile device
- [ ] Test touch interactions
- [ ] Test landscape/portrait orientation

---

## Support

If you encounter issues:

1. Check console logs (F12 → Console)
2. Check network tab (F12 → Network)
3. Review this testing guide
4. Check [PHASE1-2-COMPLETE.md](./PHASE1-2-COMPLETE.md) for architecture
5. Review [COLLECTION-ARCHITECTURE.md](./COLLECTION-ARCHITECTURE.md)

---

**Last Updated:** 2025-11-11
**Status:** Ready for Testing
