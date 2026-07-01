---
"click-to-agent": patch
---

Fix Alt+Right-click component hierarchy and menu positioning.

- Filter out framework internals that fail source resolution (e.g. Next.js SegmentViewNode / *Boundary) so the ancestry menu only lists user components with resolved source paths.
- Re-clamp the context menu to the viewport when switching between the ancestry list and the action picker, preventing the taller picker from being cut off at the bottom edge.
- Cancel the pending hover-preview debounce when opening the menu so the props panel no longer flashes on top of it.
