# OPL3 Instrument Library Sources

**Last Updated:** 2025-01-11

This directory contains documentation and resources for expanding the WebOrchestra instrument library beyond the default GENMIDI.op2 bank.

---

## Table of Contents

1. [Overview](#overview)
2. [Available Sources](#available-sources)
3. [Implementation Options](#implementation-options)
4. [Format Specifications](#format-specifications)
5. [Resources](#resources)

---

## Overview

WebOrchestra currently uses the GENMIDI.op2 instrument bank from Doom (175 instruments). This document catalogs additional OPL3 instrument sources that can be integrated to provide users with more instrument collections.

### Current Implementation

- **Script:** `minimal-prototype/scripts/convertDMXOPL.js`
- **Format:** DMXOPL3 GENMIDI.op2 (binary)
- **Output:** JSON format compatible with WebOrchestra
- **Instruments:** 128 melodic (General MIDI compatible)

---

## Available Sources

### 1. libADLMIDI ⭐ RECOMMENDED

**Repository:** https://github.com/Wohlstand/libADLMIDI

The most comprehensive collection with **79+ instrument banks** from classic PC games.

**Organization:**
```
fm_banks/
├── ail/          # AIL Sound System banks
├── bnk_files/    # HMI/AdLib .bnk format
├── dmx/          # DMX/DMXOPL banks (Doom, Heretic, etc.)
├── hmi/          # HMI banks organized by game
├── ibk_files/    # SoundBlaster .ibk banks
├── junglevision/ # Junglevision patches
├── misc_files/   # Bisqwit and other collections
├── tmb_files/    # Apogee TMB timbre files
└── wopl_files/   # WOPL format banks
```

**Key Collections:**

| Format | Games/Sources | File Count |
|--------|--------------|------------|
| **DMX (.op2)** | Doom, Doom 2, Heretic, Hexen, Raptor, Strife | 6+ files |
| **AIL (.opl, .ad)** | Star Control 3, Warcraft 2, Syndicate, Discworld | 10+ files |
| **HMI (.bnk)** | Descent 1/2, Shattered Steel, Theme Park, Normality | 20+ games |
| **Junglevision (.op3)** | Various 2-op and 4-op patches | Multiple files |
| **WOPL (.wopl)** | Modern multi-bank format | Several banks |

**Notable Banks from banks.ini:**

| Bank # | Name | File Path | Notes |
|--------|------|-----------|-------|
| 0 | AIL (The Fat Man 2op set) | `ail/star_control_3.opl` | Default AIL bank |
| 1 | Bisqwit (4op and 2op) | `misc_files/bisqwit.adlraw` | Community favorite |
| 2 | HMI (Descent, Asterix) | `hmi/Descent/melodic.bnk` | Classic game music |
| 14 | DMX (Bobby Prince v2) | `dmx/doom2.op2` | Doom 2 instruments |
| 15 | DMX (Cygnus Studios) | `dmx/heretic.op2` | Default DMX |
| 16 | DMX (Bobby Prince v1) | `dmx/doom1.op2` | Original Doom |
| 18 | AIL (Warcraft 2) | `ail/warcraft2.ad` | Warcraft instruments |
| 58 | Apogee IMF (Duke Nukem 2) | `tmb_files/duke2.tmb` | Apogee Sound System |

**Direct Access:** https://github.com/Wohlstand/libADLMIDI/tree/master/fm_banks

---

### 2. OPL3BankEditor Example Banks

**Repository:** https://github.com/Wohlstand/OPL3BankEditor

Official example banks for the OPL3 Bank Editor tool.

**Contents:**

**WOPL Format (Native):**
- `Earthsieg.wopl`
- `Mobilnik-v2.wopl`
- `Mobilnik.wopl`
- `example.wopl`
- `test.wopl`, `test-2.wopl`

**OP2/OP3 Format (DMX/Junglevision):**
- `dmx_dmx.op2`, `dmx_doom1.op2`, `dmx_doom2.op2`
- `dmx_raptor.op2`, `dmx_strife.op2`
- `d3dtimbr.op2`, `Wolfinstein.OP2`
- `2x2.op3`, `fat2.op3`, `fat4.op3`
- `jv_2op.op3`, `wallace.op3`

**SBI Format (Individual Instruments):**
- `FingerBass.sbi`
- `Hammond.sbi`
- `StellDrums.sbi`
- `tumubar-bell-dmx.sbi`

**Other Formats:**
- `DRUMOPL.IBK`, `DRUMOPL.tmb`
- Various .ad, .opl, .o3, .sb files

**Subdirectories:**
- `AdlibTracker2/` - AdLib Tracker instrument collections
- `DOSBox/` - DOSBox-extracted instruments
- `Reality AdLib tracker/` - Reality AdLib patches
- `Sci samples/` - Sierra SCI game instruments

**Direct Access:** https://github.com/Wohlstand/OPL3BankEditor/tree/master/Bank_Examples

---

### 3. JuceOPLVSTi Instrument Collection

**Repository:** https://github.com/bsutherland/JuceOPLVSTi

Community-contributed SBI instrument files.

**Organization:**
```
Instruments/
├── AdlibTracker/  # AdLib Tracker presets
├── bbr-gmus/      # BBR-GMUS collection
├── games/         # Game-extracted instruments
├── original/      # Original user creations
└── synth.bbs/     # Synth.bbs collection
```

**Format:** SBI (Sound Blaster Instrument)
- 50 bytes per file
- Single instrument per file
- Easiest format to parse

**Direct Access:** https://github.com/bsutherland/JuceOPLVSTi/tree/master/Instruments

**Note:** Project is unmaintained but instruments remain functional.

---

## Implementation Options

### Option 1: Add DMX Banks (Easiest) ⭐

**Difficulty:** Easy
**Time Estimate:** 2-4 hours
**Compatibility:** Uses existing parser

#### Description

Add additional DMX (.op2) banks from libADLMIDI. These use the **same format** as the current GENMIDI.op2, so the existing `convertDMXOPL.js` script can be reused with minimal modifications.

#### Available Banks

- `doom1.op2` - Original Doom (Bobby Prince v1)
- `doom2.op2` - Doom 2 (Bobby Prince v2)
- `heretic.op2` - Heretic (Cygnus Studios, default DMX)
- `hexen.op2` - Hexen
- `raptor.op2` - Raptor: Call of the Shadows
- `strife.op2` - Strife

#### TODO List

- [ ] **Download DMX Banks**
  - [ ] Clone libADLMIDI repository or download raw files
  - [ ] Copy .op2 files from `fm_banks/dmx/` to local directory
  - [ ] Verify file integrity (check headers)

- [ ] **Update convertDMXOPL.js**
  - [ ] Add command-line argument for input file path
  - [ ] Add command-line argument for output file name
  - [ ] Update output path to be configurable
  - [ ] Add bank metadata (source game, version, author)
  - [ ] Test with each .op2 file

- [ ] **Convert All Banks**
  - [ ] Run converter on `doom1.op2` → `DOOM1.json`
  - [ ] Run converter on `doom2.op2` → `DOOM2.json`
  - [ ] Run converter on `heretic.op2` → `HERETIC.json`
  - [ ] Run converter on `hexen.op2` → `HEXEN.json`
  - [ ] Run converter on `raptor.op2` → `RAPTOR.json`
  - [ ] Run converter on `strife.op2` → `STRIFE.json`

- [ ] **Organize Output**
  - [ ] Create `public/instruments/dmx/` subdirectory
  - [ ] Move all DMX JSON files to subdirectory
  - [ ] Create catalog JSON listing all DMX banks
  - [ ] Add bank descriptions and metadata

- [ ] **Update WebOrchestra UI**
  - [ ] Modify instrument loader to support multiple banks
  - [ ] Add bank selection dropdown/menu
  - [ ] Update InstrumentSelector to show current bank
  - [ ] Add bank switching functionality
  - [ ] Test instrument playback from each bank

- [ ] **Documentation**
  - [ ] Document each bank's characteristics
  - [ ] Add usage examples
  - [ ] Update main README with new banks
  - [ ] Create bank comparison guide

---

### Option 2: Support WOPL Format (Most Flexible)

**Difficulty:** Medium
**Time Estimate:** 8-16 hours
**Compatibility:** Requires new parser

#### Description

Implement WOPL (Wohlstand OPL) format parser. WOPL is a modern, well-documented format that supports multiple banks, both 2-op and 4-op instruments, and extensive metadata.

#### Advantages

- **Multi-bank support** - 128+ melodic instruments per bank
- **Rich metadata** - Instrument names, categories, descriptions
- **Modern format** - Actively maintained with full specification
- **Largest collection** - Access to dozens of WOPL banks
- **4-operator support** - Future-proof for advanced instruments

#### WOPL Format Overview

**File Structure:**
```
Header (magic: "WOPL3-BANK\0")
├── Version (uint16)
├── Bank metadata
│   ├── Melodic bank count
│   ├── Percussion bank count
│   └── Global flags
├── Melodic banks (array)
│   └── Instruments (128 per bank)
│       ├── Name (32 bytes)
│       ├── Note offset
│       ├── Operators (2 or 4)
│       └── Voice parameters
└── Percussion banks (array)
```

#### TODO List

- [ ] **Study WOPL Specification**
  - [ ] Read format specification document
  - [ ] Understand header structure (magic, version, metadata)
  - [ ] Study bank organization (melodic vs percussion)
  - [ ] Learn instrument structure (2-op vs 4-op)
  - [ ] Review operator parameter encoding
  - [ ] Understand flag bits and enumerations

- [ ] **Create WOPL Parser Script**
  - [ ] Create `scripts/convertWOPL.js` file
  - [ ] Implement binary buffer reading utilities
  - [ ] Parse file header and validate magic number
  - [ ] Parse global bank metadata
  - [ ] Parse melodic bank array
  - [ ] Parse percussion bank array (optional)
  - [ ] Handle big-endian vs little-endian

- [ ] **Implement Instrument Parser**
  - [ ] Parse instrument header (name, flags, note offset)
  - [ ] Parse operator data (ADSR, multiplier, waveform)
  - [ ] Handle 2-operator instruments
  - [ ] Handle 4-operator instruments
  - [ ] Parse feedback and connection mode
  - [ ] Extract velocity offset and fine-tuning

- [ ] **Convert to WebOrchestra Format**
  - [ ] Map WOPL operators to OPLPatch format
  - [ ] Convert 2-op instruments to voice1/voice2
  - [ ] Decide how to handle 4-op instruments
  - [ ] Preserve note offset and metadata
  - [ ] Generate unique instrument IDs
  - [ ] Add category and source information

- [ ] **Download and Convert WOPL Banks**
  - [ ] Download WOPL files from libADLMIDI
  - [ ] Download WOPL files from OPL3BankEditor
  - [ ] Convert each bank to JSON
  - [ ] Validate converted instruments
  - [ ] Test in WebOrchestra

- [ ] **Testing**
  - [ ] Create unit tests for WOPL parser
  - [ ] Test with various WOPL files
  - [ ] Verify instrument playback
  - [ ] Compare with original banks (if possible)
  - [ ] Test edge cases (empty banks, 4-op, etc.)

- [ ] **Integration**
  - [ ] Update instrument loader to support WOPL-sourced banks
  - [ ] Add WOPL bank metadata to UI
  - [ ] Implement bank selection UI
  - [ ] Add error handling for malformed WOPL files

- [ ] **Documentation**
  - [ ] Document WOPL format parsing
  - [ ] Add conversion examples
  - [ ] Create troubleshooting guide
  - [ ] Document 4-op handling decisions

**Specification:** https://github.com/Wohlstand/OPL3BankEditor/blob/master/Specifications/WOPL-and-OPLI-Specification.txt

---

### Option 3: Parse Individual SBI Files (Simplest Format)

**Difficulty:** Easy
**Time Estimate:** 4-6 hours
**Compatibility:** Requires simple new parser

#### Description

Parse individual SBI (Sound Blaster Instrument) files. SBI is the **simplest format** at only 50 bytes per file, making it easy to implement and perfect for user-contributed instruments.

#### SBI Format Structure

**Total Size:** 50 bytes

```
Offset | Size | Description
-------|------|-------------
0x00   | 4    | Header: "SBI\x1A" (magic bytes)
0x04   | 32   | Instrument name (null-terminated ASCII)
0x24   | 1    | Modulator: AM/VIB/EGT/KSR/MULT
0x25   | 1    | Carrier: AM/VIB/EGT/KSR/MULT
0x26   | 1    | Modulator: KSL/Output Level
0x27   | 1    | Carrier: KSL/Output Level
0x28   | 1    | Modulator: Attack/Decay
0x29   | 1    | Carrier: Attack/Decay
0x2A   | 1    | Modulator: Sustain/Release
0x2B   | 1    | Carrier: Sustain/Release
0x2C   | 1    | Modulator: Waveform
0x2D   | 1    | Carrier: Waveform
0x2E   | 1    | Feedback/Connection
0x2F   | 5    | Reserved (unused)
```

#### TODO List

- [ ] **Create SBI Parser Script**
  - [ ] Create `scripts/convertSBI.js` file
  - [ ] Implement 50-byte binary file reader
  - [ ] Validate SBI header magic bytes ("SBI\x1A")
  - [ ] Parse instrument name (32 bytes, null-terminated)
  - [ ] Parse 11 bytes of OPL register data
  - [ ] Extract modulator operator parameters
  - [ ] Extract carrier operator parameters
  - [ ] Parse feedback and connection byte

- [ ] **Map SBI to WebOrchestra Format**
  - [ ] Convert register data to OPLOperator structure
  - [ ] Extract ADSR envelope (attack, decay, sustain, release)
  - [ ] Extract frequency multiplier and waveform
  - [ ] Extract output level and key scale level
  - [ ] Extract AM/VIB/EGT/KSR flags
  - [ ] Parse feedback (bits 1-3) and connection (bit 0)
  - [ ] Generate unique instrument ID

- [ ] **Batch Processing**
  - [ ] Create batch conversion script
  - [ ] Recursively scan directories for .sbi files
  - [ ] Process multiple SBI files in one run
  - [ ] Generate single JSON bank from multiple SBI files
  - [ ] Preserve directory structure as categories

- [ ] **Download SBI Collections**
  - [ ] Download JuceOPLVSTi Instruments folder
  - [ ] Organize by source (AdlibTracker, games, original)
  - [ ] Download OPL3BankEditor SBI examples
  - [ ] Find additional SBI collections online

- [ ] **Convert SBI Collections**
  - [ ] Convert AdlibTracker instruments
  - [ ] Convert game-extracted instruments
  - [ ] Convert BBR-GMUS collection
  - [ ] Convert original/user-created instruments
  - [ ] Create categorized JSON banks

- [ ] **Create SBI Collection Manager**
  - [ ] Build catalog of all SBI instruments
  - [ ] Add category/tag metadata
  - [ ] Add source attribution
  - [ ] Create searchable index
  - [ ] Generate collection statistics

- [ ] **User Import Feature (Optional)**
  - [ ] Add "Import SBI" button to UI
  - [ ] Implement client-side SBI parser
  - [ ] Allow drag-and-drop SBI files
  - [ ] Save imported instruments to LocalStorage
  - [ ] Export user collection as JSON

- [ ] **Testing**
  - [ ] Test with various SBI files
  - [ ] Verify instrument playback accuracy
  - [ ] Compare with original SBI playback (DOSBox)
  - [ ] Test batch conversion on large collections

- [ ] **Documentation**
  - [ ] Document SBI format structure
  - [ ] Add conversion examples
  - [ ] Create user guide for importing SBI files
  - [ ] List available SBI collections

**Format Reference:** https://moddingwiki.shikadi.net/wiki/SBI_Format

---

### Option 4: Convert Other Formats Using OPL3BankEditor

**Difficulty:** Easy (manual) / Medium (automated)
**Time Estimate:** Variable
**Compatibility:** Uses external tool

#### Description

Use the OPL3BankEditor GUI application to convert various formats (.bnk, .ibk, .tmb, .ad, .opl) to either OP2 (DMX) or WOPL format, then use existing parsers.

#### Supported Input Formats

- **.OP3** - Junglevision patch files
- **.OP2** - DMX OPL-2 banks
- **.TMB** - Apogee Sound System timbre files
- **.IBK** - SoundBlaster IBK files
- **.BNK** - AdLib/HMI and Adlib Gold formats
- **.SND/.TIM** - AdLib Timbre bank files
- **.AD/.OPL** - Global Timbre Library files
- **.ADLRAW** - Bisqwit's ADLMIDI banks

#### TODO List

##### Manual Conversion Approach

- [ ] **Download OPL3BankEditor**
  - [ ] Visit releases page: https://github.com/Wohlstand/OPL3BankEditor/releases
  - [ ] Download latest version for your OS (Windows/macOS/Linux)
  - [ ] Install/extract the application
  - [ ] Test application launch

- [ ] **Download Source Banks**
  - [ ] Download libADLMIDI fm_banks directory
  - [ ] Download OPL3BankEditor Bank_Examples
  - [ ] Organize by format (.bnk, .ibk, .tmb, etc.)
  - [ ] Create working directory structure

- [ ] **Convert AIL Banks (.opl, .ad)**
  - [ ] Open each AIL file in OPL3BankEditor
  - [ ] Export as OP2 format
  - [ ] Export as WOPL format
  - [ ] Save to `converted/ail/` directory
  - [ ] Document conversion settings used

- [ ] **Convert HMI Banks (.bnk)**
  - [ ] Open each HMI .bnk file
  - [ ] Export as OP2 format
  - [ ] Export as WOPL format
  - [ ] Save to `converted/hmi/` directory
  - [ ] Note any conversion warnings/errors

- [ ] **Convert SoundBlaster Banks (.ibk)**
  - [ ] Open each .ibk file
  - [ ] Export as OP2 format
  - [ ] Export as WOPL format
  - [ ] Save to `converted/ibk/` directory

- [ ] **Convert Apogee TMB Files (.tmb)**
  - [ ] Open each .tmb file
  - [ ] Export as OP2 format
  - [ ] Export as WOPL format
  - [ ] Save to `converted/tmb/` directory

- [ ] **Convert Junglevision Banks (.op3)**
  - [ ] Open each .op3 file
  - [ ] Export as OP2 format (if compatible)
  - [ ] Export as WOPL format
  - [ ] Save to `converted/junglevision/` directory

- [ ] **Process Converted Files**
  - [ ] Run existing convertDMXOPL.js on OP2 files
  - [ ] Run convertWOPL.js (from Option 2) on WOPL files
  - [ ] Generate JSON for all banks
  - [ ] Validate all conversions

##### Automated Conversion Approach

- [ ] **Research OPL3BankEditor CLI**
  - [ ] Check if command-line interface exists
  - [ ] Read documentation for CLI usage
  - [ ] Test basic CLI conversion
  - [ ] Document CLI parameters

- [ ] **Create Batch Conversion Script**
  - [ ] Create `scripts/batchConvert.sh` (or .bat)
  - [ ] Loop through all input files
  - [ ] Call OPL3BankEditor CLI for each file
  - [ ] Convert to target format (OP2 or WOPL)
  - [ ] Organize output by source format
  - [ ] Log conversion results and errors

- [ ] **Alternative: Use OPL3BankEditor Library**
  - [ ] Check if library/API is available
  - [ ] Investigate embedding in Node.js script
  - [ ] Create programmatic conversion tool
  - [ ] Test with various formats

##### Integration

- [ ] **Organize Converted Banks**
  - [ ] Create `public/instruments/ail/` directory
  - [ ] Create `public/instruments/hmi/` directory
  - [ ] Create `public/instruments/junglevision/` directory
  - [ ] Create `public/instruments/apogee/` directory
  - [ ] Move JSON files to appropriate directories

- [ ] **Update Bank Catalog**
  - [ ] Add all converted banks to catalog.json
  - [ ] Include source format information
  - [ ] Add game/application attribution
  - [ ] Include conversion date and tool version

- [ ] **Testing**
  - [ ] Test playback of each converted bank
  - [ ] Compare with original format (if possible)
  - [ ] Note any conversion artifacts or issues
  - [ ] Document quality/fidelity of conversions

- [ ] **Documentation**
  - [ ] Document conversion workflow
  - [ ] List OPL3BankEditor version used
  - [ ] Note any format-specific issues
  - [ ] Create conversion troubleshooting guide
  - [ ] Document bank characteristics and recommended uses

**Tool Download:** https://github.com/Wohlstand/OPL3BankEditor/releases

---

## Format Specifications

### DMX/GENMIDI (.op2)

**Current format used by WebOrchestra**

- **Size:** Variable (typically 6-8 KB)
- **Header:** `#OPL_II#` (8 bytes)
- **Instruments:** 175 total (128 melodic + 47 percussion)
- **Structure:** 36 bytes per instrument
  - 2 bytes flags
  - 1 byte fine-tune
  - 1 byte note number
  - 16 bytes voice 1 (operators + feedback)
  - 16 bytes voice 2 (dual-voice support)
- **Names:** 32 bytes per name (at end of file)

**Specification:** https://formats.kaitai.io/genmidi_op2/

### WOPL (.wopl)

**Modern multi-bank format**

- **Magic:** `WOPL3-BANK\0` (11 bytes)
- **Version:** 3 (uint16)
- **Features:**
  - Multiple melodic banks (128 instruments each)
  - Multiple percussion banks
  - 2-operator and 4-operator support
  - Rich metadata and flags
  - Note offset and fine-tuning
- **Endianness:** Big-endian for counts

**Specification:** https://github.com/Wohlstand/OPL3BankEditor/blob/master/Specifications/WOPL-and-OPLI-Specification.txt

### SBI (.sbi)

**Sound Blaster Instrument - single instrument format**

- **Magic:** `SBI\x1A` (4 bytes)
- **Size:** Exactly 50 bytes
- **Structure:**
  - 4 bytes header
  - 32 bytes instrument name
  - 11 bytes OPL register data
  - 5 bytes reserved
- **Simplicity:** Easiest format to parse
- **Usage:** One file per instrument

**Specification:** https://moddingwiki.shikadi.net/wiki/SBI_Format

### IBK (.ibk)

**Instrument Bank - SoundBlaster bank format**

- **Structure:** Array of 128 instruments
- **Per-Instrument:** 16 bytes
  - 11 bytes OPL register data
  - 5 bytes reserved
- **Names:** Optional 32-byte names (padded to 8 bytes per entry)

### Other Formats

- **.BNK** - HMI/AdLib Gold banks
- **.TMB** - Apogee Sound System timbre files
- **.AD/.OPL** - Global Timbre Library
- **.OP3** - Junglevision patches
- **.ADLRAW** - Bisqwit's raw format

All can be converted via OPL3BankEditor.

---

## Resources

### Tools

- **OPL3BankEditor** - GUI editor and converter
  - https://github.com/Wohlstand/OPL3BankEditor
  - Cross-platform (Windows, Linux, macOS)
  - Supports all major OPL bank formats

### Libraries

- **libADLMIDI** - MIDI synthesizer with OPL3 emulation
  - https://github.com/Wohlstand/libADLMIDI
  - 79+ embedded banks
  - Reference implementation

- **OPL3 npm package** - WebOrchestra's current emulator
  - https://www.npmjs.com/package/opl3
  - JavaScript/WASM OPL3 emulator

### Documentation

- **WOPL Specification**
  - https://github.com/Wohlstand/OPL3BankEditor/blob/master/Specifications/WOPL-and-OPLI-Specification.txt

- **GENMIDI/OP2 Format**
  - https://formats.kaitai.io/genmidi_op2/
  - https://doomwiki.org/wiki/DMXOPL

- **SBI Format**
  - https://moddingwiki.shikadi.net/wiki/SBI_Format

- **OPL Programming**
  - http://www.shipbrook.net/jeff/sb.html (Programmer's Guide)
  - https://www.fit.vutbr.cz/~arnost/opl/opl3.html (Register Reference)

### Communities

- **VOGONS Forum** - Vintage DOS gaming and OPL discussion
  - https://www.vogons.org/

- **ModdingWiki** - File format documentation
  - https://moddingwiki.shikadi.net/

---

## Next Steps

### Recommended Implementation Order

1. **Start with Option 1** (DMX banks)
   - Quick win with existing parser
   - Adds 6+ new themed banks
   - Tests multi-bank UI architecture

2. **Implement Option 3** (SBI files)
   - Simple format, easy to parse
   - Enables user-contributed instruments
   - Good learning exercise

3. **Tackle Option 2** (WOPL format)
   - Unlocks largest collection
   - Future-proof for 4-op support
   - Most flexible format

4. **Use Option 4 as needed**
   - Convert specific banks on demand
   - Handle edge cases and rare formats
   - Quality-check automated conversions

### Success Criteria

- ✅ Users can select from multiple instrument banks
- ✅ Each bank is themed/sourced (Doom, Descent, etc.)
- ✅ Instrument metadata is preserved and displayed
- ✅ All conversions are tested and validated
- ✅ Documentation is complete for each format

---

**Last Updated:** 2025-01-11
