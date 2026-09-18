---
name: Rival houses
description: Durable guidance for the autonomous House/lord layer on the OpenKingdoms campaign map.
---

Rival-held counties belong to named Houses (`src/houses.ts`: `HOUSES`, `HOUSE_MEMBERSHIP`), not to one undifferentiated "rival" mass. Each House has a personality (`expansionist` / `aggressive` / `opportunist` / `defensive`) that weights its own ambition, and each acts through `resolveHouseAmbitionTurn` in `App.tsx`, budgeted to a single annexation across *all* houses per turn — the same one-decision-per-turn discipline `resolveRivalTurn` and `resolveBanditTurn` already use, and for the same reason: an ambition layer that fires for every house every turn would snowball the map faster than the player can react, and would drown the turn summary in notices instead of reading as background world texture.

**Why:** A living world needs visible actors with names and temperament, not a single palette color that occasionally reinforces itself. Grouping counties into Houses gives future features (feuds between houses, marriages, a lord dying/succession, the player negotiating with a specific court instead of "the rival") a real entity to hang off of, without touching the existing per-region reinforcement/threat-response logic in `resolveRivalTurn`, which stays intact and keeps handling front-driven reinforcement.

**How to apply:**
- A region's house is `region.houseId ?? houseIdForRegionId(region.id)` — the explicit field wins (set at runtime when a House annexes a previously neutral county), the static lookup is the fallback for a county's original owner (including on saves from before this field existed; no migration code was needed because the save-merge in `worldRegions.map` already spreads `savedRegion` over `base`).
- Adding a new House means adding one entry to `HOUSES` and its `HOUSE_MEMBERSHIP` roster in `src/houses.ts` — never special-case a region id inside `resolveHouseAmbitionTurn` itself.
- A House can only annex a *neutral* neighbor, never another House's or the player's territory yet (that's the natural next step — house-vs-house skirmishes and house-vs-player raids beyond `resolveRivalTurn`'s existing threat response — deliberately deferred so this first layer stays small and easy to verify against `campaign-map.spec.ts`).
- Keep the AI deterministic from `(regions, turn)`, no `Math.random` — matches the rest of the turn-resolution family and keeps saves/tests reproducible.
- The campaign canvas draws a small accent-colored dot per House (`drawHouseMarker` in `campaign-canvas.tsx`, keyed by `house.accent`) next to the existing stronghold marker; a new House needs a distinct `accent` hex so it reads as a different lord on the map.
