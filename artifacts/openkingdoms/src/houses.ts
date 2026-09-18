export type HousePersonality = 'expansionist' | 'aggressive' | 'opportunist' | 'defensive';

export type HouseDef = {
  id: string;
  name: string;
  personality: HousePersonality;
  accent: string;
  tagline: string;
};

export const HOUSES: HouseDef[] = [
  {
    id: 'house-bracken',
    name: 'House Bracken',
    personality: 'defensive',
    accent: '#5c6b3a',
    tagline: 'Hedge-lords who watch the river crossings and rarely strike first.',
  },
  {
    id: 'house-ironwood',
    name: 'The Ironwood Clans',
    personality: 'aggressive',
    accent: '#3c4a2e',
    tagline: 'Forest raiders whose army moves quietly under the boughs.',
  },
  {
    id: 'house-northwatch',
    name: 'House Northwatch',
    personality: 'expansionist',
    accent: '#4a5568',
    tagline: 'A stone city-state hungry for the roads at its gates.',
  },
  {
    id: 'house-frostcrown',
    name: 'House Frostcrown',
    personality: 'expansionist',
    accent: '#6b7fa3',
    tagline: 'A cold northern court that measures strength in claimed ground.',
  },
  {
    id: 'house-thornfield',
    name: 'House Thornfield',
    personality: 'defensive',
    accent: '#7a6a4f',
    tagline: 'Western holdouts content to fortify what they already hold.',
  },
  {
    id: 'house-marrowcoast',
    name: 'House Marrowcoast',
    personality: 'opportunist',
    accent: '#4f7a72',
    tagline: 'Coastal opportunists who strike only when the odds are safe.',
  },
  {
    id: 'house-silverbell',
    name: 'House Silverbell',
    personality: 'aggressive',
    accent: '#9a5a4a',
    tagline: "The south's largest court, and the least patient.",
  },
];

// Which starting regions belong to which house. Adding a member here is enough to make it
// eligible for that house's ambition turn — see resolveHouseAmbitionTurn in App.tsx.
export const HOUSE_MEMBERSHIP: Record<string, string[]> = {
  'house-bracken': ['bracken'],
  'house-ironwood': ['ironwood'],
  'house-northwatch': ['northwatch'],
  'house-frostcrown': ['north-03', 'north-04', 'north-07', 'north-09'],
  'house-thornfield': ['west-02', 'west-04', 'west-07'],
  'house-marrowcoast': ['east-02', 'east-04', 'east-07'],
  'house-silverbell': ['south-02', 'south-04', 'south-07', 'south-09'],
};

const REGION_TO_HOUSE: Record<string, string> = Object.fromEntries(
  Object.entries(HOUSE_MEMBERSHIP).flatMap(([houseId, regionIds]) =>
    regionIds.map((regionId) => [regionId, houseId]),
  ),
);

// Static fallback used for a region's original owner when a saved/runtime region doesn't
// carry its own houseId yet (older saves, or a county never touched by a house).
export function houseIdForRegionId(regionId: string): string | undefined {
  return REGION_TO_HOUSE[regionId];
}

export function getHouse(houseId: string | undefined): HouseDef | undefined {
  return houseId ? HOUSES.find((house) => house.id === houseId) : undefined;
}
