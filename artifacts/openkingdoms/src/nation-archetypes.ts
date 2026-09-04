export type NationArchetypeId = 'freeholders' | 'riverward' | 'ironbound' | 'merchant' | 'lantern';
export type EmblemId = 'crown' | 'sun' | 'oak' | 'wave' | 'star';

export type NationArchetype = {
  id: NationArchetypeId;
  name: string;
  shortName: string;
  description: string;
  bonus: string;
  tradeoff: string;
  accent: string;
  secondary: string;
  geometry: 'crown' | 'river' | 'fortress' | 'market' | 'lantern';
  modifiers: {
    startingGold: number;
    startingFood: number;
    startingForces: number;
    startingReputation: number;
    recruitmentBonus: number;
    settlementCostDiscount: number;
    turnGoldBonus: number;
    tradeIncomeBonus: number;
    influencePerTurn: number;
  };
};

export const DEFAULT_NATION_ARCHETYPE_ID: NationArchetypeId = 'freeholders';
export const DEFAULT_EMBLEM_ID: EmblemId = 'crown';

export const EMBLEMS: Array<{ id: EmblemId; name: string; glyph: string }> = [
  { id: 'crown', name: 'Crown', glyph: '♛' },
  { id: 'sun', name: 'Sun', glyph: '✦' },
  { id: 'oak', name: 'Oak leaf', glyph: '❖' },
  { id: 'wave', name: 'Wave', glyph: '≈' },
  { id: 'star', name: 'North star', glyph: '✧' },
];

export const NATION_ARCHETYPES: NationArchetype[] = [
  {
    id: 'freeholders',
    name: 'Freeholders',
    shortName: 'Steady hands',
    description: 'A neutral starting charter with no special advantage or burden.',
    bonus: 'No modifier',
    tradeoff: 'Reliable in every season',
    accent: '#d9a83d',
    secondary: '#f1dfb3',
    geometry: 'crown',
    modifiers: {
      startingGold: 0,
      startingFood: 0,
      startingForces: 0,
      startingReputation: 0,
      recruitmentBonus: 0,
      settlementCostDiscount: 0,
      turnGoldBonus: 0,
      tradeIncomeBonus: 0,
      influencePerTurn: 0,
    },
  },
  {
    id: 'riverward',
    name: 'Riverward League',
    shortName: 'Patient builders',
    description: 'River towns that turn a full granary into lasting civic strength.',
    bonus: '+20 starting food · −15 gold on settlement charters',
    tradeoff: 'Begins with 5 less gold',
    accent: '#6da99a',
    secondary: '#d4b966',
    geometry: 'river',
    modifiers: {
      startingGold: -5,
      startingFood: 20,
      startingForces: 0,
      startingReputation: 2,
      recruitmentBonus: 0,
      settlementCostDiscount: 15,
      turnGoldBonus: 0,
      tradeIncomeBonus: 0,
      influencePerTurn: 0,
    },
  },
  {
    id: 'ironbound',
    name: 'Ironbound March',
    shortName: 'Hard border',
    description: 'A disciplined frontier that answers pressure with a ready levy.',
    bonus: '+12 starting soldiers · +4 soldiers per recruitment',
    tradeoff: 'Begins with 18 less gold',
    accent: '#c36b57',
    secondary: '#8c9ca2',
    geometry: 'fortress',
    modifiers: {
      startingGold: -18,
      startingFood: 0,
      startingForces: 12,
      startingReputation: 0,
      recruitmentBonus: 4,
      settlementCostDiscount: 0,
      turnGoldBonus: 0,
      tradeIncomeBonus: 0,
      influencePerTurn: 0,
    },
  },
  {
    id: 'merchant',
    name: 'Merchant Concord',
    shortName: 'Open roads',
    description: 'A road-minded league that makes every safe convoy worth more.',
    bonus: '+25 starting gold · +6 gold per active route',
    tradeoff: 'Begins with 8 fewer soldiers',
    accent: '#d2a34e',
    secondary: '#557d91',
    geometry: 'market',
    modifiers: {
      startingGold: 25,
      startingFood: 0,
      startingForces: -8,
      startingReputation: 1,
      recruitmentBonus: 0,
      settlementCostDiscount: 0,
      turnGoldBonus: 2,
      tradeIncomeBonus: 6,
      influencePerTurn: 0,
    },
  },
  {
    id: 'lantern',
    name: 'Lantern Court',
    shortName: 'Measured words',
    description: 'A court of patient envoys where trust and influence are resources too.',
    bonus: '+6 reputation · +1 influence each turn',
    tradeoff: 'Begins with 8 fewer food',
    accent: '#b28bd1',
    secondary: '#e6c878',
    geometry: 'lantern',
    modifiers: {
      startingGold: 0,
      startingFood: -8,
      startingForces: 0,
      startingReputation: 6,
      recruitmentBonus: 0,
      settlementCostDiscount: 0,
      turnGoldBonus: 0,
      tradeIncomeBonus: 0,
      influencePerTurn: 1,
    },
  },
];

export function getNationArchetype(id: unknown): NationArchetype {
  return NATION_ARCHETYPES.find((archetype) => archetype.id === id) ??
    NATION_ARCHETYPES.find((archetype) => archetype.id === DEFAULT_NATION_ARCHETYPE_ID)!;
}

export function isNationArchetypeId(value: unknown): value is NationArchetypeId {
  return NATION_ARCHETYPES.some((archetype) => archetype.id === value);
}

export function isEmblemId(value: unknown): value is EmblemId {
  return EMBLEMS.some((emblem) => emblem.id === value);
}

export function getEmblem(id: unknown) {
  return EMBLEMS.find((emblem) => emblem.id === id) ??
    EMBLEMS.find((emblem) => emblem.id === DEFAULT_EMBLEM_ID)!;
}