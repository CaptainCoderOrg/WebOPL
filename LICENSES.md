# Third-Party Licenses and Attributions

This document tracks all third-party components, patches, and libraries used in this project.

---

## DMXOPL3 - OPL3 Instrument Patches

**Source:** [DMXOPL by sneakernets](https://github.com/sneakernets/DMXOPL)
**Version:** 2.11d
**License:** MIT License
**Used in:** `minimal-prototype/public/instruments/GENMIDI.json`

### Description

DMXOPL3 is an enhanced General MIDI instrument patch set for OPL3 FM synthesis. These patches were professionally crafted by ConSiGno to mimic the Roland Sound Canvas (SC-55/SC-88) that Doom's music was originally composed for.

The instrument set includes 128 General MIDI instruments optimized for OPL3 chips, providing significantly better sound quality than standard OPL2 patches.

### License Text

```
MIT License

Copyright (c) ConSiGno

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Modifications

The original GENMIDI.op2 binary format was converted to JSON format for use in this web application. The conversion script is located at `minimal-prototype/scripts/convertDMXOPL.js`.

No modifications were made to the instrument parameters themselves. The conversion process:
1. Downloads GENMIDI.op2 from the DMXOPL repository
2. Parses the binary format according to the [Kaitai Struct specification](https://formats.kaitai.io/genmidi_op2/)
3. Converts to JSON format compatible with our OPLPatch interface
4. Preserves all original instrument parameters and names

### References

- **Repository:** https://github.com/sneakernets/DMXOPL
- **Format Specification:** https://formats.kaitai.io/genmidi_op2/
- **Original Usage:** Doom, Heretic, Hexen (via DMX sound library)

---

## OPL3 Emulation

**Source:** [opl3.wasm](https://github.com/dcodeIO/opl3) (used via CDN)
**Author:** Daniel Wirtz
**License:** Apache License 2.0
**Used in:** `minimal-prototype/index.html` (loaded via CDN)

### Description

WebAssembly-based OPL3 (Yamaha YMF262) emulation for the Web Audio API. Provides accurate FM synthesis emulation in the browser.

### License

Apache License 2.0 - See https://github.com/dcodeIO/opl3/blob/master/LICENSE

---

## Future Additions

As new third-party components are added, they should be documented here with:
- Source and version
- License type and full text
- Description of use
- Any modifications made
- Attribution requirements

---

## How to Update

When adding new third-party components:

1. Add a new section to this document with all required information
2. Include the full license text or link to it
3. Document any modifications made
4. Update the conversion/build scripts if needed
5. Commit both the component and this updated LICENSES.md file

---

**Last Updated:** 2025-01-03
**Maintained by:** WebOPL Project Contributors
