export type ExpansionPackId = 'diplomacy' | 'commerce';

export type ExpansionSelection = Record<ExpansionPackId, boolean>;

export type ExpansionPreset = 'baseline' | 'all' | 'custom';

export type ExpansionPackDefinition = {
  id: ExpansionPackId;
  name: string;
  shortName: string;
  version: number;
  defaultEnabled: boolean;
  dependencies: ExpansionPackId[];
  description: string;
  dormantDescription: string;
};

export const EXPANSION_PACKS: readonly ExpansionPackDefinition[] = [
  {
    id: 'diplomacy',
    name: 'Diplomacy & Alliances',
    shortName: 'Diplomacy',
    version: 1,
    defaultEnabled: false,
    dependencies: [],
    description: 'Envoys, court trust, treaties, aid, peace terms, and embargoes.',
    dormantDescription: 'Court relations and treaty data are preserved, but diplomacy has no effect.',
  },
  {
    id: 'commerce',
    name: 'Commerce & Industry',
    shortName: 'Commerce',
    version: 1,
    defaultEnabled: false,
    dependencies: [],
    description: 'Production, consumption, shortages, trade routes, and route risk.',
    dormantDescription: 'Stores and convoy charters are preserved, but production and routes are dormant.',
  },
];

export const BASELINE_EXPANSIONS: ExpansionSelection = {
  diplomacy: false,
  commerce: false,
};

export const ALL_EXPANSIONS: ExpansionSelection = {
  diplomacy: true,
  commerce: true,
};

export function getExpansionPreset(selection: ExpansionSelection): ExpansionPreset {
  if (EXPANSION_PACKS.every((pack) => !selection[pack.id])) return 'baseline';
  if (EXPANSION_PACKS.every((pack) => selection[pack.id])) return 'all';
  return 'custom';
}

export function getExpansionDefinition(id: ExpansionPackId) {
  return EXPANSION_PACKS.find((pack) => pack.id === id);
}

export function isExpansionEnabled(selection: ExpansionSelection, id: ExpansionPackId) {
  return selection[id] === true;
}

export function validateExpansionSelection(selection: ExpansionSelection) {
  const errors: string[] = [];
  EXPANSION_PACKS.forEach((pack) => {
    if (!selection[pack.id]) return;
    pack.dependencies.forEach((dependency) => {
      if (!selection[dependency]) {
        const dependencyName = getExpansionDefinition(dependency)?.name ?? dependency;
        errors.push(`${pack.name} requires ${dependencyName}.`);
      }
    });
  });
  return { valid: errors.length === 0, errors };
}

export function normalizeExpansionSelection(value: unknown, fallback: ExpansionSelection = BASELINE_EXPANSIONS): ExpansionSelection {
  if (!value || typeof value !== 'object') return { ...fallback };
  const candidate = value as Partial<Record<ExpansionPackId, unknown>>;
  const selection: ExpansionSelection = {
    diplomacy: candidate.diplomacy === true,
    commerce: candidate.commerce === true,
  };
  return validateExpansionSelection(selection).valid ? selection : { ...fallback };
}