# Pattern Files

This directory contains pattern files for the WebOPL tracker. Patterns are defined in YAML format for easy editing and sharing.

## File Format

Pattern files use YAML format with the following structure:

```yaml
# Pattern metadata
name: My Pattern Name
description: A brief description of the pattern
author: Your Name (optional)

# Grid dimensions
rows: 16        # Number of rows (8-64)
tracks: 4       # Number of tracks (1-18)

# Tempo (optional, defaults to 120)
bpm: 140

# Instrument assignments (array of patch indices)
# One entry per track, referring to patch IDs in the instrument bank
instruments: [0, 1, 2, 3]

# Pattern data
# Array of rows, each row is an array of note strings
# Use standard tracker notation: C-4, D#5, etc.
# Use "---" for rests/empty cells
pattern:
  - ["C-4", "---", "E-4", "---"]
  - ["D-4", "C-3", "---", "---"]
  # ... continue for all rows
```

## Note Format

Notes use tracker notation:
- Format: `NOTE-OCTAVE`
- Examples: `C-4`, `D#5`, `Gb3`
- Valid notes: C, C#, D, D#, E, F, F#, G, G#, A, A#, B
- Valid octaves: 0-9
- Sustain: `---` (sustains the previous note)
- Note Off: `OFF` (explicitly stops the note)
- Middle C is `C-4` (MIDI note 60)

### Note Behavior

- **New note**: Stops previous note (if any) and plays new note
- **`---`**: Sustains the previous note (no change)
- **`OFF`**: Explicitly stops the note on that track

## Adding New Patterns

1. Create a new `.yaml` file in this directory
2. Follow the format above
3. Add an entry to `catalog.json`:

```json
{
  "id": "my-pattern",
  "name": "My Pattern Name",
  "description": "Brief description",
  "file": "my-pattern.yaml"
}
```

4. The pattern will appear in the tracker's example dropdown

## Tips

- Keep patterns between 8-64 rows
- Use 1-18 tracks (OPL3 hardware limit)
- Instrument indices refer to the GENMIDI bank (0-127+)
- Comments in YAML start with `#`
- YAML is whitespace-sensitive, use consistent indentation
