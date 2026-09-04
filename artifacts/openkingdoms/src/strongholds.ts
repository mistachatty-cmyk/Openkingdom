export type StrongholdLevel = 0 | 1 | 2 | 3;

export type StrongholdTier = {
  level: StrongholdLevel;
  name: string;
  shortName: string;
  description: string;
  cost: number;
  upkeep: number;
  garrison: number;
  defense: number;
  recovery: number;
  recruitment: number;
};

export const MAX_STRONGHOLD_LEVEL: StrongholdLevel = 3;

export const STRONGHOLD_TIERS: StrongholdTier[] = [
  {
    level: 0,
    name: 'Open province',
    shortName: 'No stronghold',
    description: 'No dedicated fortification has been raised here.',
    cost: 0,
    upkeep: 0,
    garrison: 0,
    defense: 0,
    recovery: 0,
    recruitment: 0,
  },
  {
    level: 1,
    name: 'Watchpost',
    shortName: 'Watchpost',
    description: 'A timber watchpost keeps scouts, stores, and a small reserve close to the road. Staff it for a modest recurring cost.',
    cost: 70,
    upkeep: 2,
    garrison: 0,
    defense: 8,
    recovery: 2,
    recruitment: 2,
  },
  {
    level: 2,
    name: 'Bastion',
    shortName: 'Bastion',
    description: 'A stone bastion gives the county a deeper line and time to recover after pressure, but keeps a small permanent garrison on watch.',
    cost: 150,
    upkeep: 5,
    garrison: 4,
    defense: 18,
    recovery: 4,
    recruitment: 4,
  },
  {
    level: 3,
    name: 'Citadel',
    shortName: 'Citadel',
    description: 'A citadel anchors the border with a commanding garrison, but its 10-soldier commitment and heavy upkeep compete with expansion and field armies.',
    cost: 280,
    upkeep: 10,
    garrison: 10,
    defense: 32,
    recovery: 7,
    recruitment: 6,
  },
];

export function normalizeStrongholdLevel(value: unknown): StrongholdLevel {
  if (value === 1 || value === 2 || value === 3) return value;
  return 0;
}

export function getStrongholdTier(value: unknown): StrongholdTier {
  return STRONGHOLD_TIERS[normalizeStrongholdLevel(value)];
}

export function getNextStrongholdTier(value: unknown): StrongholdTier | undefined {
  const level = normalizeStrongholdLevel(value);
  return level >= MAX_STRONGHOLD_LEVEL ? undefined : STRONGHOLD_TIERS[level + 1];
}