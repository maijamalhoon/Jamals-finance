# JALVORO Icon Rollout Boundary

The current product UI keeps its established icon library and existing visual behavior.

The JALVORO icon system remains an isolated first-party design library. It must not be connected through package aliases, compatibility fallbacks, or repository-wide codemods.

A future JALVORO icon may enter the product only after individual visual review confirms:

- a unique and recognizable semantic shape;
- clean rendering without default wave, zigzag, sparkle, or decorative inner strokes;
- correct appearance at 16, 20, 24, and 32 pixels;
- light and dark mode readability;
- preserved product sizing, color, spacing, hover, and active-state behavior;
- explicit approval against the existing icon it would replace.
