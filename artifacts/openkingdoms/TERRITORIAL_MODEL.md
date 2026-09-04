# OpenKingdoms territorial model

The Canvas edition treats the map as a connected political world rather than a decorative landmass. A province is a playable county-sized territory with its own owner, settlement, forces, terrain, landmark, borders, and optional stronghold.

## Current layers

- **Counties / provinces** are the smallest playable territorial units. They can be selected from the map or the accessible province index and can change owner.
- **Settlements** are the economic center of a county. Villages, towns, and cities affect local output and remain separate from military construction.
- **Barracks** are recruitment infrastructure. They increase the size of each new levy and are not a substitute for a county stronghold.
- **Strongholds** are optional defensive investments attached to a county. Open province → Watchpost → Bastion → Citadel adds defense, recovery, and recruitment support without making a county invulnerable.
- **Fronts and routes** connect counties across shared borders. Fronts describe staged military movement; trade routes describe recurring commerce.
- **Nation-states and rivals** are political owners of multiple counties. The player’s nation is one owner among several, not a replacement for the underlying county layer.
- **Bandit-held territories** are led by the Blackroad Camp rather than a court. After the opening grace, the camp claims the weakest adjacent open county; when no open county is available, it pressures an adjacent crown county by draining local forces without immediately changing ownership.

## Future political types

The county layer is intentionally extensible so later campaigns can introduce:

- **Bandit-held territories** that pressure roads without behaving like a normal nation-state.
- **Different civilizations** with their own settlement patterns, diplomacy, and military rules.
- **Colonies** that belong to a distant nation while developing local identity and infrastructure.
- **Growing or expanding entities** that can claim, split, federate, or absorb counties over time.

These future types should continue to use the same readable map selection model: one focused county, one authoritative accessible index entry, and clear ownership and border affordances. A new political type should add behavior and presentation without collapsing counties, settlements, barracks, or strongholds into one generic structure.

The Canvas edition authors one bandit-held county at The Pale Road. Its turn resolver is separate from nation-state rival behavior, and its claims, pressure, and owner changes are written to the campaign chronicle. County infrastructure remains attached to the county when the camp claims it, so the territorial layer stays independent from political ownership.

## Design constraints

1. Peaceful development must remain a complete play path. Strongholds are never a required combat objective.
2. Territorial identity survives ownership changes unless a future rule explicitly says otherwise. In particular, a captured county keeps its settlement, barracks, and stronghold state.
3. Defensive investments create time and recovery, not invulnerability. A stronger army can still overcome a fortified county.
4. New layers must be persisted and migrated with a neutral default so older local saves remain playable.