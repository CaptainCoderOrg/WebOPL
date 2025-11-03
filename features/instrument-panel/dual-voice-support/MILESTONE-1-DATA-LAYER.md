# Milestone 1: Data Layer Implementation

**Status**: Ready to implement
**Effort**: 2-3 hours
**Risk**: Low
**Dependencies**: None

## Objective

Parse and store both Voice 1 and Voice 2 from GENMIDI.op2, update TypeScript interfaces, regenerate JSON, and verify data integrity **without changing any audio playback code**.

## Success Criteria

- ✅ GENMIDI.json contains both `voice1` and `voice2` for all 128 instruments
- ✅ JSON file size increases from ~83KB to ~150KB
- ✅ TypeScript compiles without errors
- ✅ App loads and plays instruments (using Voice 1 only, existing behavior)
- ✅ Can manually inspect JSON to verify Voice 2 data is different from Voice 1

---

## Task 1.1: Update Converter Script (45 minutes)

**File**: `minimal-prototype/scripts/convertDMXOPL.js`

**Current State**: Lines 68-69 say "Second operator instrument (offset + 20) - not used"

### Changes

1. **Add Voice 2 parsing after Voice 1** (after line 66):

```javascript
// First voice instrument (offset + 4)
const mod1 = parseOperator(buffer, offset + 4);
const feedback1 = buffer.readUInt8(offset + 10);
const car1 = parseOperator(buffer, offset + 11);
const unused1 = buffer.readUInt8(offset + 17);
const baseNote1 = buffer.readInt16LE(offset + 18);

// Second voice instrument (offset + 20)
const mod2 = parseOperator(buffer, offset + 20);
const feedback2 = buffer.readUInt8(offset + 26);
const car2 = parseOperator(buffer, offset + 27);
const unused2 = buffer.readUInt8(offset + 33);
const baseNote2 = buffer.readInt16LE(offset + 34);
```

2. **Update return object** (line 71+):

```javascript
return {
  id: index,
  name: name,
  note: note !== 0 ? note : undefined,

  // Voice 1
  voice1: {
    mod: mod1,
    car: car1,
    feedback: (feedback1 >> 1) & 0x07,
    additive: (feedback1 & 0x01) === 0,
    baseNote: baseNote1
  },

  // Voice 2
  voice2: {
    mod: mod2,
    car: car2,
    feedback: (feedback2 >> 1) & 0x07,
    additive: (feedback2 & 0x01) === 0,
    baseNote: baseNote2
  }
};
```

### Testing

```bash
cd minimal-prototype/scripts
node convertDMXOPL.js
```

### Verification

- [ ] Script runs without errors
- [ ] Output: "✅ DMXOPL3 patches successfully converted!"
- [ ] Check `public/instruments/GENMIDI.json` file size (should be ~150KB)

---

## Task 1.2: Update TypeScript Interfaces (30 minutes)

**File**: `minimal-prototype/src/types/OPLPatch.ts`

### Changes

1. **Create OPLVoice interface** (add after line 31):

```typescript
/**
 * Single voice in a dual-voice instrument
 * Each voice consists of 2 operators (modulator + carrier)
 */
export interface OPLVoice {
  modulator: OPLOperator;
  carrier: OPLOperator;
  feedback: number;              // 0-7: Modulator self-modulation depth
  connection: 'fm' | 'additive'; // FM (mod→car) vs Additive (mod+car mixed)
  baseNote?: number;             // Base note offset from GENMIDI (int16, -1200 to +1200 cents)
}
```

2. **Update OPLPatch interface** (replace lines 36-55):

```typescript
/**
 * Complete OPL3 instrument patch
 * Supports both single-voice (backward compatible) and dual-voice modes
 */
export interface OPLPatch {
  id: number;
  name: string;
  category?: string;

  // Backward compatibility: Single-voice format (Voice 1 only)
  modulator?: OPLOperator;
  carrier?: OPLOperator;
  feedback?: number;
  connection?: 'fm' | 'additive';

  // Dual-voice format (new)
  voice1?: OPLVoice;
  voice2?: OPLVoice;

  // Control flags
  dualVoiceEnabled?: boolean;    // Use both voices if true (default: false for now)

  // GENMIDI-specific
  noteOffset?: number;           // MIDI note offset (from GENMIDI 'note' field)

  // Metadata
  isCustom?: boolean;
  basePresetId?: number;
}
```

**Why both formats**: Backward compatibility. Old code using `modulator`/`carrier` still works. New code uses `voice1`/`voice2`.

### Testing

```bash
cd minimal-prototype
npm run build
```

### Verification

- [ ] TypeScript compiles without errors
- [ ] No type errors in VSCode

---

## Task 1.3: Update GENMIDI Parser (30 minutes)

**File**: `minimal-prototype/src/utils/genmidiParser.ts`

### Changes

1. **Update GENMIDIInstrument interface** (lines 28-36):

```typescript
interface GENMIDIInstrument {
  id: number;
  name: string;
  note?: number;

  // Voice 1
  voice1: {
    mod: GENMIDIOperator;
    car: GENMIDIOperator;
    feedback: number;
    additive: boolean;
    baseNote?: number;
  };

  // Voice 2
  voice2: {
    mod: GENMIDIOperator;
    car: GENMIDIOperator;
    feedback: number;
    additive: boolean;
    baseNote?: number;
  };
}
```

2. **Update convertInstrument function** (lines 67-77):

```typescript
function convertInstrument(inst: GENMIDIInstrument): OPLPatch {
  return {
    id: inst.id,
    name: inst.name,
    noteOffset: inst.note,

    // Voice 1
    voice1: {
      modulator: convertOperator(inst.voice1.mod),
      carrier: convertOperator(inst.voice1.car),
      feedback: inst.voice1.feedback,
      connection: inst.voice1.additive ? 'additive' : 'fm',
      baseNote: inst.voice1.baseNote
    },

    // Voice 2
    voice2: {
      modulator: convertOperator(inst.voice2.mod),
      carrier: convertOperator(inst.voice2.car),
      feedback: inst.voice2.feedback,
      connection: inst.voice2.additive ? 'additive' : 'fm',
      baseNote: inst.voice2.baseNote
    },

    // Backward compatibility: expose Voice 1 as top-level
    modulator: convertOperator(inst.voice1.mod),
    carrier: convertOperator(inst.voice1.car),
    feedback: inst.voice1.feedback,
    connection: inst.voice1.additive ? 'additive' : 'fm',

    // Default: dual-voice disabled (will enable in Milestone 4)
    dualVoiceEnabled: false
  };
}
```

### Testing

App should compile and run

### Verification

```bash
npm run dev
```

- [ ] App loads without errors
- [ ] Instruments still play (using Voice 1 via backward compat)
- [ ] Open browser console, check for errors: none

---

## Task 1.4: Regenerate GENMIDI.json (15 minutes)

### Commands

```bash
cd minimal-prototype/scripts
node convertDMXOPL.js
```

### Verification Steps

1. **Check file size**:
```bash
ls -lh ../public/instruments/GENMIDI.json
```
Expected: ~150KB (was ~83KB)

2. **Manually inspect JSON** (first instrument):
```bash
head -n 100 ../public/instruments/GENMIDI.json
```

Expected structure:
```json
{
  "name": "DMXOPL3",
  "version": "2.11d",
  "instruments": [
    {
      "id": 0,
      "name": "Acoustic Grand Piano",
      "voice1": {
        "mod": { "trem": false, "vib": false, ... },
        "car": { ... },
        "feedback": 7,
        "additive": false
      },
      "voice2": {
        "mod": { ... },
        "car": { ... },
        "feedback": 6,
        "additive": true
      },
      "modulator": { ... },
      "carrier": { ... },
      "feedback": 7,
      "connection": "fm",
      "dualVoiceEnabled": false
    }
  ]
}
```

3. **Compare Voice 1 vs Voice 2** for a few instruments:
```bash
# Use jq or manually inspect JSON
cat ../public/instruments/GENMIDI.json | jq '.instruments[0].voice1.feedback'
cat ../public/instruments/GENMIDI.json | jq '.instruments[0].voice2.feedback'
```

If values differ → ✅ Voice 2 data is present and different!

### Verification Checklist

- [ ] GENMIDI.json file size ~150KB
- [ ] JSON contains both voice1 and voice2
- [ ] Voice 2 data differs from Voice 1 (spot check 5 instruments)

---

## Task 1.5: End-to-End Verification (15 minutes)

### Test Plan

1. **Run dev server**:
```bash
cd minimal-prototype
npm run dev
```

2. **Open browser** → http://localhost:5173

3. **Test InstrumentTester**:
   - Select "Acoustic Grand Piano"
   - Play C-4, D-4, E-4
   - **Expected**: Instruments still work (using Voice 1)
   - **Expected**: No console errors

4. **Test Sequencer**:
   - Add some notes to tracks
   - Press Play
   - **Expected**: Music plays normally
   - **Expected**: No crashes

5. **Check browser console**:
   - Look for any TypeScript errors
   - Look for GENMIDI loading errors
   - **Expected**: Clean console (no errors)

### Verification Checklist

- [ ] App runs without errors
- [ ] Instruments play normally
- [ ] No console errors
- [ ] Backward compatibility maintained

---

## Rollback Plan

If something breaks:

```bash
# Restore old converter
git checkout HEAD -- scripts/convertDMXOPL.js

# Restore old JSON
git checkout HEAD -- public/instruments/GENMIDI.json

# Restore old types
git checkout HEAD -- src/types/OPLPatch.ts
git checkout HEAD -- src/utils/genmidiParser.ts

# Rebuild
npm run build
```

---

## Milestone 1 Success Checklist

- [ ] Converter parses Voice 2 (offset 20-35)
- [ ] GENMIDI.json file size ~150KB
- [ ] JSON contains `voice1` and `voice2` for all 128 instruments
- [ ] Voice 2 data is different from Voice 1 (spot check 5 instruments)
- [ ] TypeScript compiles without errors
- [ ] App runs without errors
- [ ] Instruments play normally (using Voice 1)
- [ ] No console errors
- [ ] Backward compatibility maintained (old `modulator`/`carrier` fields present)

---

## Checkpoint: Commit Changes

```
feat(milestone-1): Add dual-voice data parsing and storage

- Parse Voice 2 from GENMIDI.op2 (offset 20-35)
- Update TypeScript interfaces for OPLVoice
- Regenerate GENMIDI.json with both voices (~150KB)
- Maintain backward compatibility with single-voice format
- All instruments still work (using Voice 1 only for now)

Refs: #dual-voice-support Phase 1
```

---

## Next Steps

After completing Milestone 1, proceed to:
- **Milestone 2**: Implement ChannelManager for dynamic channel allocation
- See: `MILESTONE-2-CHANNEL-MANAGER.md`
