---
name: Map interaction model
description: Durable interaction guidance for the OpenKingdoms campaign map.
---

The campaign map should treat the focused province, front, and route as one shared interaction state across canvas, keyboard, touch, and accessible controls. Zoom should preserve the point under the pointer or pinch midpoint rather than jumping the map.

**Why:** Strategy-map actions feel unreliable when visual overlays, touch gestures, and the accessible province index select different targets or silently lose focus.

**How to apply:** Route every selection surface through the same App-level helpers, keep non-focused overlays from intercepting hits, announce misses and view changes, and preserve focus when temporary full-screen map modes close.