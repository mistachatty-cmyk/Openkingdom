---
name: Campaign events
description: Durable guidance for the OpenKingdoms living-event layer.
---

Campaign events should be deterministic from the turn and current campaign state, pause the next turn only while a choice is pending, and apply consequences through the same resource, relationship, front, and chronicle state as ordinary actions.

**Why:** A separate event feed can make peaceful turns feel alive without introducing a second simulation or silently bypassing the existing strategy rules.

**How to apply:** Author a small category rotation with eligible fallbacks, persist pending events and outcomes locally, expose choices as accessible buttons with resource reasons, and include both the prompt and result in the latest summary and dispatch history.