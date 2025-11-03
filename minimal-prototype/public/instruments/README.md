# Instrument Bank

This directory contains OPL3 instrument patch banks in JSON format.

## GENMIDI.json

**Source:** [DMXOPL3 v2.11d](https://github.com/sneakernets/DMXOPL) by ConSiGno
**License:** MIT License
**Format:** Converted from GENMIDI.op2 binary format

### Description

This file contains 128 General MIDI instruments optimized for OPL3 (Yamaha YMF262) FM synthesis. These patches were professionally crafted to mimic the Roland Sound Canvas (SC-55/SC-88) that Doom's music was originally composed for.

### Contents

- 128 General MIDI instruments (IDs 0-127)
- Professional-grade OPL3 parameters
- Authentic patches from classic Doom engine
- Enhanced sound quality over standard OPL2 patches

### Conversion

The original GENMIDI.op2 binary format was converted to JSON using the converter script at `scripts/convertDMXOPL.js`. The conversion process:

1. Downloads GENMIDI.op2 from the DMXOPL repository
2. Parses the binary format according to the [Kaitai Struct specification](https://formats.kaitai.io/genmidi_op2/)
3. Converts to our OPLPatch JSON format
4. Preserves all original instrument parameters and names

No modifications were made to the instrument parameters themselves.

### To Regenerate

If you need to update the patches or regenerate the JSON:

```bash
cd minimal-prototype
node scripts/convertDMXOPL.js
```

This will download the latest GENMIDI.op2 from the DMXOPL repository and convert it.

### License

See [LICENSES.md](/LICENSES.md) for full license text and attribution requirements.

### Credits

- **Patch Design:** ConSiGno
- **DMXOPL3 Project:** https://github.com/sneakernets/DMXOPL
- **Format Specification:** https://formats.kaitai.io/genmidi_op2/
- **Original Usage:** Doom, Heretic, Hexen (DMX sound library)

### References

- **DMXOPL3 Repository:** https://github.com/sneakernets/DMXOPL
- **OPL3 Chip:** Yamaha YMF262 (1994)
- **General MIDI Specification:** 128 standard instrument sounds
- **Roland Sound Canvas:** SC-55, SC-88 (target hardware for Doom's music)
