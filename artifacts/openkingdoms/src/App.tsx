import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Accessibility,
  ArrowRight,
  BookOpen,
  Castle,
  Check,
  ChevronRight,
  Coins,
  Crown,
  Flag,
  Handshake,
  Hammer,
  Landmark,
  Maximize2,
  Menu,
  Minimize2,
  Moon,
  Minus,
  Mountain,
  Palette,
  Route,
  Swords,
  Sun,
  Users,
  Volume2,
  Wheat,
  X,
} from 'lucide-react';
import {
  CampaignCanvas,
  type CanvasPalette,
  type CanvasFront,
  type CanvasRegion,
  type CanvasRoute,
} from '@/components/campaign-canvas';
import {
  AccessibleRegionIndex,
  CampaignPrimer,
  CampaignEventPanel,
  DispatchList,
  MilestonePanel,
  ResourceStrip,
  TurnSummaryPanel,
  type CampaignMilestone,
  type CampaignEvent,
  type CampaignEventCategory,
  type CampaignEventChoice,
  type TurnSummary,
} from '@/components/campaign-panels';
import {
  FrontDossier,
  FrontIndex,
  FrontPlanner,
  type FrontSourceOption,
  type FrontSummary,
} from '@/components/front-staging-panel';
import {
  DiplomacyPanel,
  EconomyPanel,
  RESOURCE_TYPES,
  TradePanel,
  type DiplomacyPartnerView,
  type RelationshipState,
  type ResourceLedger,
  type ResourceType,
  type TradeSourceOption,
  type TradeRouteStatus,
  type TradeRouteView,
  type TreatyKind,
} from '@/components/economy-diplomacy-panels';
import {
  ExpansionPackControl,
  ExpansionPackSelector,
} from '@/components/expansion-pack-selector';
import { FoundingPreview } from '@/components/founding-preview';
import {
  DEFAULT_EMBLEM_ID,
  DEFAULT_NATION_ARCHETYPE_ID,
  EMBLEMS,
  NATION_ARCHETYPES,
  getEmblem,
  getNationArchetype,
  isEmblemId,
  isNationArchetypeId,
  type EmblemId,
  type NationArchetypeId,
} from '@/nation-archetypes';
import {
  getNextStrongholdTier,
  getStrongholdTier,
  MAX_STRONGHOLD_LEVEL,
  normalizeStrongholdLevel,
  type StrongholdLevel,
} from '@/strongholds';
import {
  ALL_EXPANSIONS,
  BASELINE_EXPANSIONS,
  isExpansionEnabled,
  normalizeExpansionSelection,
  type ExpansionSelection,
} from '@/expansion-packs';

type Banner = { name: string; color: string; secondary: string };
type RegionKind = 'player' | 'rival' | 'neutral';
type Settlement = 'Village' | 'Town' | 'City';
type Terrain = 'plains' | 'forest' | 'highland' | 'marsh' | 'coast';
type Region = {
  id: string;
  chunkId?: string;
  name: string;
  kind: RegionKind;
  settlement: Settlement;
  forces: number;
  barracks: boolean;
  adjacent: string[];
  description: string;
  terrain?: Terrain;
  landmark?: string;
  path: string;
  label: [number, number];
  strongholdLevel?: StrongholdLevel;
};
type FrontStatus = 'staged' | 'marching' | 'arrived' | 'resolved';
type Front = {
  id: string;
  name: string;
  sourceRegionId: string;
  targetRegionId: string;
  committedForces: number;
  travelTurns: number;
  status: FrontStatus;
};
type Treaty = {
  id: string;
  partnerRegionId: string;
  kind: TreatyKind;
  startedTurn: number;
  duration: number;
};
type TradeRoute = {
  id: string;
  sourceRegionId: string;
  partnerRegionId: string;
  exportResource: ResourceType;
  importResource: ResourceType;
  income: number;
  upkeep: number;
  remainingTurns: number;
  risk: number;
  status: TradeRouteStatus;
};
type DiplomaticPosture = 'conciliatory' | 'balanced' | 'assertive';
type DiplomacyState = {
  posture: DiplomaticPosture;
  influence: number;
  envoyCooldowns: Record<string, number>;
};
type CampaignStatus = 'active' | 'victory';
type Campaign = {
  edition: 'Canvas';
  worldVersion: 2;
  featureVersion: number;
  status: CampaignStatus;
  victoryTurn?: number;
  expansions: ExpansionSelection;
  nation: string;
  banner: Banner;
  archetypeId: NationArchetypeId;
  emblemId: EmblemId;
  turn: number;
  gold: number;
  food: number;
  resources: ResourceLedger;
  forces: number;
  regions: Region[];
  fronts: Front[];
  relationships: Record<string, RelationshipState>;
  treaties: Treaty[];
  tradeRoutes: TradeRoute[];
  reputation: number;
  militaryAid: number;
  embargoes: string[];
  diplomacy: DiplomacyState;
  log: string[];
  lastTurnSummary?: TurnSummary;
  activeEvent?: CampaignEvent;
};

type ThemeKey = 'parchment' | 'midnight' | 'meadow';
type FeedbackLevel = 'full' | 'subtle' | 'text';
type FeedbackTone = 'general' | 'welcome' | 'build' | 'upgrade' | 'recruit' | 'victory' | 'harvest' | 'error';
type FeedbackNotice = { text: string; error?: boolean; tone: FeedbackTone; id: number };

type ThemePreset = {
  name: string;
  description: string;
  canvas: CanvasPalette;
};

const KINGDOM_GOAL = 3;
const RIVAL_DECISION_BUDGET = 1;
const RIVAL_OPENING_GRACE_END_TURN = 2;
const RIVAL_PASSIVE_PULSE = 3;
const RIVAL_MAX_ACTION_REINFORCEMENT = 7;
const RIVAL_MAX_FORCES = 160;

const banners: Banner[] = [
  { name: 'Ember', color: '#bb5141', secondary: '#e6bd58' },
  { name: 'Tide', color: '#50768a', secondary: '#d9b75d' },
  { name: 'Moss', color: '#557c68', secondary: '#d8b45c' },
  { name: 'Dusk', color: '#695978', secondary: '#d7a961' },
  { name: 'Ivory', color: '#c7a86c', secondary: '#334760' },
];

const themePresets: Record<ThemeKey, ThemePreset> = {
  parchment: {
    name: 'Parchment',
    description: 'The original illuminated chronicle',
    canvas: {
      water: '#d2ddcf',
      land: '#e6d9ba',
      player: '#7d9f8d',
      rival: '#bf826e',
      neutral: '#d7bd7e',
      ink: '#29384f',
      mutedInk: '#685c4a',
      road: '#9f835b',
      selection: '#253247',
    },
  },
  midnight: {
    name: 'Midnight',
    description: 'Deep ink with ember borders',
    canvas: {
      water: '#21354a',
      land: '#39475a',
      player: '#4e8879',
      rival: '#ad6558',
      neutral: '#aa8954',
      ink: '#f1e3c5',
      mutedInk: '#d4c18e',
      road: '#c7a967',
      selection: '#f2c45d',
    },
  },
  meadow: {
    name: 'Meadow',
    description: 'A gentler field map for long sessions',
    canvas: {
      water: '#c7ddd2',
      land: '#e7e0bf',
      player: '#5d9272',
      rival: '#a75e55',
      neutral: '#c29b55',
      ink: '#1f4038',
      mutedInk: '#536c5a',
      road: '#8b754e',
      selection: '#1b3932',
    },
  },
};

const baseRegions: Region[] = [
  {
    id: 'aurelian',
    name: 'Aurelian Reach',
    kind: 'player',
    settlement: 'Village',
    forces: 48,
    barracks: false,
    adjacent: ['bracken', 'saltmere', 'highvale'],
    description: 'A green fold of river country, rich enough to feed a crown that has not yet been forged.',
    path: 'M92 184 L156 142 L231 157 L264 207 L232 268 L164 278 L112 247 Z',
    label: [174, 213],
  },
  {
    id: 'bracken',
    name: 'Bracken March',
    kind: 'rival',
    settlement: 'Town',
    forces: 62,
    barracks: true,
    adjacent: ['aurelian', 'ironwood', 'northwatch'],
    description: 'A hard borderland of dark hedges and watchfires. Its lord has begun to eye your river crossings.',
    path: 'M91 184 L69 130 L114 72 L190 75 L231 157 L156 142 Z',
    label: [141, 121],
  },
  {
    id: 'saltmere',
    name: 'Saltmere Coast',
    kind: 'neutral',
    settlement: 'Village',
    forces: 30,
    barracks: false,
    adjacent: ['aurelian', 'ironwood', 'sunfall'],
    description: 'A wind-cut coast where salt pans gleam like little mirrors and no banner flies for long.',
    path: 'M264 207 L329 176 L400 208 L420 275 L352 314 L277 286 L232 268 Z',
    label: [326, 250],
  },
  {
    id: 'highvale',
    name: 'Highvale',
    kind: 'neutral',
    settlement: 'Village',
    forces: 24,
    barracks: false,
    adjacent: ['aurelian', 'sunfall'],
    description: 'A high country of bell towers and cold springs. The valley roads make it a prize worth preparing for.',
    path: 'M232 268 L264 207 L329 176 L362 122 L435 139 L452 211 L420 275 L352 314 L277 286 Z',
    label: [355, 221],
  },
  {
    id: 'ironwood',
    name: 'Ironwood',
    kind: 'rival',
    settlement: 'Town',
    forces: 76,
    barracks: true,
    adjacent: ['bracken', 'saltmere', 'northwatch', 'sunfall'],
    description: 'Old forest, old grudges. The Ironwood clans have an army that moves quietly under the boughs.',
    path: 'M190 75 L272 52 L349 77 L362 122 L329 176 L264 207 L231 157 Z',
    label: [278, 122],
  },
  {
    id: 'northwatch',
    name: 'Northwatch',
    kind: 'rival',
    settlement: 'City',
    forces: 106,
    barracks: true,
    adjacent: ['bracken', 'ironwood', 'sunfall'],
    description: 'A stone city at the edge of the known map. Its towers are visible from three borders.',
    path: 'M349 77 L442 51 L530 75 L559 138 L501 181 L435 139 L362 122 Z',
    label: [451, 105],
  },
  {
    id: 'sunfall',
    name: 'Sunfall Plains',
    kind: 'neutral',
    settlement: 'Village',
    forces: 39,
    barracks: false,
    adjacent: ['saltmere', 'highvale', 'ironwood', 'northwatch'],
    description: 'Wide wheat fields beneath a copper sky. Whoever holds Sunfall holds the road east.',
    path: 'M420 275 L452 211 L501 181 L559 138 L634 168 L675 234 L639 311 L552 335 L472 320 Z',
    label: [548, 262],
  },
];

const WORLD_WIDTH = 2600;
const WORLD_HEIGHT = 1600;
const CORE_SCALE = 1.45;
const CORE_OFFSET: [number, number] = [760, 520];
const terrainByRegionId: Record<string, Terrain> = {
  aurelian: 'plains',
  bracken: 'forest',
  saltmere: 'coast',
  highvale: 'highland',
  ironwood: 'forest',
  northwatch: 'highland',
  sunfall: 'plains',
};
const landmarkByRegionId: Record<string, string> = {
  aurelian: 'River crown',
  bracken: 'Hedgewatch',
  saltmere: 'Salt pans',
  highvale: 'Bell tower',
  ironwood: 'Old grove',
  northwatch: 'Stone citadel',
  sunfall: 'Copper road',
};

function transformPath(path: string, scale: number, [offsetX, offsetY]: [number, number]) {
  let coordinateIndex = 0;
  return path.replace(/-?\d+(?:\.\d+)?/g, (value) => {
    const number = Number(value);
    const transformed = coordinateIndex % 2 === 0
      ? number * scale + offsetX
      : number * scale + offsetY;
    coordinateIndex += 1;
    return String(Math.round(transformed * 10) / 10);
  });
}

function chunkIdForPoint(x: number, y: number) {
  return `chunk-${Math.floor(x / 500)}-${Math.floor(y / 350)}`;
}

const coreRegions: Region[] = baseRegions.map((region) => ({
  ...region,
  chunkId: chunkIdForPoint(region.label[0] * CORE_SCALE + CORE_OFFSET[0], region.label[1] * CORE_SCALE + CORE_OFFSET[1]),
  terrain: terrainByRegionId[region.id],
  landmark: landmarkByRegionId[region.id],
  path: transformPath(region.path, CORE_SCALE, CORE_OFFSET),
  label: [
    Math.round(region.label[0] * CORE_SCALE + CORE_OFFSET[0]),
    Math.round(region.label[1] * CORE_SCALE + CORE_OFFSET[1]),
  ],
}));

type FrontierDescriptor = {
  id: string;
  name: string;
  x: number;
  y: number;
  kind: RegionKind;
  settlement: Settlement;
  forces: number;
};

const frontierDescriptors: FrontierDescriptor[] = [
  { id: 'north-01', name: 'Rimegate', x: 40, y: 180, kind: 'neutral', settlement: 'Village', forces: 22 },
  { id: 'north-02', name: 'Candlefen', x: 320, y: 180, kind: 'neutral', settlement: 'Village', forces: 28 },
  { id: 'north-03', name: 'Frostmere', x: 600, y: 180, kind: 'rival', settlement: 'Town', forces: 54 },
  { id: 'north-04', name: 'Ashen Crown', x: 880, y: 180, kind: 'rival', settlement: 'Town', forces: 68 },
  { id: 'north-05', name: 'The Pale Road', x: 1160, y: 180, kind: 'neutral', settlement: 'Village', forces: 31 },
  { id: 'north-06', name: 'Glimmer Pass', x: 1440, y: 180, kind: 'neutral', settlement: 'Village', forces: 26 },
  { id: 'north-07', name: 'Old Cairn', x: 1720, y: 180, kind: 'rival', settlement: 'City', forces: 112 },
  { id: 'north-08', name: 'Starfall', x: 2000, y: 180, kind: 'neutral', settlement: 'Town', forces: 45 },
  { id: 'north-09', name: 'Windscar', x: 2280, y: 180, kind: 'rival', settlement: 'Town', forces: 72 },
  { id: 'west-01', name: 'Morrow Glen', x: 40, y: 400, kind: 'neutral', settlement: 'Village', forces: 19 },
  { id: 'west-02', name: 'Thornfield', x: 40, y: 620, kind: 'rival', settlement: 'Town', forces: 48 },
  { id: 'west-03', name: 'Greenwake', x: 580, y: 400, kind: 'neutral', settlement: 'Town', forces: 36 },
  { id: 'west-04', name: 'Foxhollow', x: 580, y: 620, kind: 'rival', settlement: 'Village', forces: 42 },
  { id: 'west-05', name: 'Low Lanterns', x: 40, y: 840, kind: 'neutral', settlement: 'Village', forces: 24 },
  { id: 'east-01', name: 'Copperstrand', x: 2280, y: 400, kind: 'neutral', settlement: 'Village', forces: 27 },
  { id: 'east-02', name: 'Marrow Coast', x: 2280, y: 620, kind: 'rival', settlement: 'Town', forces: 59 },
  { id: 'east-03', name: 'Vesper Fields', x: 1740, y: 620, kind: 'neutral', settlement: 'Town', forces: 37 },
  { id: 'east-04', name: 'Redwater', x: 2280, y: 840, kind: 'rival', settlement: 'Town', forces: 63 },
  { id: 'east-05', name: 'Far Meridian', x: 2280, y: 1060, kind: 'neutral', settlement: 'Village', forces: 21 },
  { id: 'south-01', name: 'Hearthplain', x: 40, y: 1280, kind: 'neutral', settlement: 'Village', forces: 25 },
  { id: 'south-02', name: 'Silverbell', x: 320, y: 1280, kind: 'rival', settlement: 'Town', forces: 57 },
  { id: 'south-03', name: 'Amberstep', x: 600, y: 1280, kind: 'neutral', settlement: 'Village', forces: 29 },
  { id: 'south-04', name: 'Southwatch', x: 880, y: 1280, kind: 'rival', settlement: 'Town', forces: 64 },
  { id: 'south-05', name: 'Dawnmouth', x: 1160, y: 1280, kind: 'neutral', settlement: 'Town', forces: 44 },
  { id: 'south-06', name: 'Goldmere', x: 1440, y: 1280, kind: 'neutral', settlement: 'Village', forces: 23 },
  { id: 'south-07', name: 'Brass Orchard', x: 1720, y: 1280, kind: 'rival', settlement: 'City', forces: 98 },
  { id: 'south-08', name: 'Saltwind', x: 2000, y: 1280, kind: 'neutral', settlement: 'Village', forces: 30 },
  { id: 'south-09', name: 'The Last Ford', x: 2280, y: 1280, kind: 'rival', settlement: 'Town', forces: 70 },
  { id: 'west-06', name: 'Mossway', x: 580, y: 840, kind: 'neutral', settlement: 'Town', forces: 34 },
  { id: 'west-07', name: 'Gloam Basin', x: 580, y: 1060, kind: 'rival', settlement: 'Village', forces: 46 },
  { id: 'west-08', name: 'Wickfen', x: 40, y: 1060, kind: 'neutral', settlement: 'Village', forces: 20 },
  { id: 'east-06', name: 'Roseward', x: 1740, y: 840, kind: 'neutral', settlement: 'Town', forces: 41 },
  { id: 'east-07', name: 'Larkspur Vale', x: 1740, y: 1060, kind: 'rival', settlement: 'Village', forces: 52 },
];

function frontierPath(x: number, y: number) {
  return `M${x} ${y + 54} L${x + 42} ${y + 8} L${x + 196} ${y} L${x + 286} ${y + 34} L${x + 306} ${y + 116} L${x + 250} ${y + 202} L${x + 72} ${y + 210} L${x - 8} ${y + 148} Z`;
}

const frontierRegions: Region[] = frontierDescriptors.map((descriptor) => ({
  id: descriptor.id,
  chunkId: chunkIdForPoint(descriptor.x + 110, descriptor.y + 85),
  name: descriptor.name,
  kind: descriptor.kind,
  settlement: descriptor.settlement,
  forces: descriptor.forces,
  barracks: descriptor.settlement !== 'Village',
  adjacent: [],
  description: `${descriptor.name} lies beyond the settled crown, a distinct place with roads, stores, and a history of its own.`,
  terrain: descriptor.id.includes('north') ? 'highland' : descriptor.id.includes('west') ? 'forest' : descriptor.id.includes('east') ? 'coast' : 'plains',
  landmark: descriptor.id.endsWith('03') ? 'Waystone' : descriptor.id.endsWith('07') ? 'Watchtower' : undefined,
  path: frontierPath(descriptor.x, descriptor.y),
  label: [descriptor.x + 110, descriptor.y + 82],
}));

function frontierNeighbors(region: Region) {
  const descriptor = frontierDescriptors.find((candidate) => candidate.id === region.id);
  if (!descriptor) return [];
  return frontierDescriptors
    .filter((candidate) => candidate.id !== region.id)
    .filter((candidate) => (
      (candidate.x === descriptor.x && Math.abs(candidate.y - descriptor.y) <= 240) ||
      (candidate.y === descriptor.y && Math.abs(candidate.x - descriptor.x) <= 320)
    ))
    .map((candidate) => candidate.id);
}

const worldLinks: Record<string, string[]> = {
  aurelian: ['west-06', 'south-04'],
  bracken: ['west-04', 'north-04'],
  saltmere: ['east-06', 'south-05'],
  highvale: ['east-03', 'south-05'],
  ironwood: ['north-05', 'west-03'],
  northwatch: ['north-07', 'east-03'],
  sunfall: ['east-06', 'south-07'],
};

const frontierCrossLinks: Record<string, string[]> = {
  'west-01': ['west-03'],
  'west-02': ['west-04'],
  'west-05': ['west-06'],
  'west-08': ['west-07'],
  'east-01': ['east-03'],
  'east-02': ['east-03'],
  'east-04': ['east-06'],
  'east-05': ['east-07'],
};

const continentalCoastlinePath = 'M 120 340 C 260 228 430 174 640 156 C 900 94 1110 122 1300 148 C 1510 106 1770 120 1980 170 C 2220 188 2420 258 2506 408 C 2560 520 2470 640 2500 762 C 2540 930 2470 1080 2510 1200 C 2400 1368 2200 1440 1980 1416 C 1750 1470 1510 1430 1280 1450 C 1040 1480 820 1430 620 1460 C 420 1430 238 1360 136 1220 C 72 1090 132 942 96 820 C 60 682 94 518 120 340 Z';

const worldRegions: Region[] = [
  ...coreRegions.map((region) => ({
    ...region,
    adjacent: [...region.adjacent, ...(worldLinks[region.id] ?? [])],
  })),
  ...frontierRegions.map((region) => ({
    ...region,
    adjacent: [
      ...frontierNeighbors(region),
      ...(frontierCrossLinks[region.id] ?? []),
      ...Object.entries(frontierCrossLinks)
        .filter(([, links]) => links.includes(region.id))
        .map(([linkedId]) => linkedId),
      ...Object.entries(worldLinks)
        .filter(([, links]) => links.includes(region.id))
        .map(([coreId]) => coreId),
    ],
  })),
];

const regionEconomy: Record<string, { production: ResourceLedger; consumption: ResourceLedger }> = {
  aurelian: { production: { grain: 22, timber: 5, iron: 1, salt: 0 }, consumption: { grain: 9, timber: 1, iron: 1, salt: 0 } },
  bracken: { production: { grain: 13, timber: 6, iron: 8, salt: 1 }, consumption: { grain: 11, timber: 1, iron: 1, salt: 1 } },
  saltmere: { production: { grain: 6, timber: 3, iron: 1, salt: 15 }, consumption: { grain: 8, timber: 2, iron: 0, salt: 1 } },
  highvale: { production: { grain: 18, timber: 5, iron: 2, salt: 1 }, consumption: { grain: 8, timber: 1, iron: 1, salt: 0 } },
  ironwood: { production: { grain: 5, timber: 18, iron: 9, salt: 1 }, consumption: { grain: 12, timber: 2, iron: 1, salt: 1 } },
  northwatch: { production: { grain: 4, timber: 4, iron: 19, salt: 7 }, consumption: { grain: 16, timber: 3, iron: 2, salt: 1 } },
  sunfall: { production: { grain: 28, timber: 3, iron: 1, salt: 5 }, consumption: { grain: 13, timber: 1, iron: 1, salt: 0 } },
};

function emptyLedger(): ResourceLedger {
  return { grain: 0, timber: 0, iron: 0, salt: 0 };
}

function safeLedger(value: unknown, fallback: ResourceLedger): ResourceLedger {
  if (!value || typeof value !== 'object') return { ...fallback };
  const candidate = value as Partial<Record<ResourceType, unknown>>;
  return RESOURCE_TYPES.reduce((ledger, resource) => {
    const amount = candidate[resource];
    ledger[resource] = typeof amount === 'number' && Number.isFinite(amount) && amount >= 0
      ? Math.floor(amount)
      : fallback[resource];
    return ledger;
  }, emptyLedger());
}

function isRelationshipState(value: unknown): value is RelationshipState {
  return value === 'neutral' || value === 'friendly' || value === 'trading' || value === 'allied' || value === 'hostile' || value === 'war';
}

function isTreatyKind(value: unknown): value is TreatyKind {
  return value === 'trade' || value === 'non-aggression' || value === 'defensive-alliance' || value === 'military-aid' || value === 'peace';
}

function isTradeRouteStatus(value: unknown): value is TradeRouteStatus {
  return value === 'active' || value === 'disrupted' || value === 'blocked' || value === 'shortage' || value === 'embargoed' || value === 'expired';
}

function isDiplomaticPosture(value: unknown): value is DiplomaticPosture {
  return value === 'conciliatory' || value === 'balanced' || value === 'assertive';
}

function defaultDiplomacy(): DiplomacyState {
  return { posture: 'balanced', influence: 20, envoyCooldowns: {} };
}

function normalizeDiplomacy(value: unknown): DiplomacyState {
  if (!value || typeof value !== 'object') return defaultDiplomacy();
  const candidate = value as Partial<DiplomacyState>;
  const cooldowns = candidate.envoyCooldowns && typeof candidate.envoyCooldowns === 'object'
    ? Object.fromEntries(
      Object.entries(candidate.envoyCooldowns)
        .filter(([id, turns]) => typeof id === 'string' && typeof turns === 'number' && Number.isFinite(turns) && turns > 0)
        .map(([id, turns]) => [id, Math.min(6, Math.floor(turns as number))]),
    )
    : {};
  return {
    posture: isDiplomaticPosture(candidate.posture) ? candidate.posture : 'balanced',
    influence: typeof candidate.influence === 'number' ? Math.max(0, Math.min(100, Math.floor(candidate.influence))) : 20,
    envoyCooldowns: cooldowns,
  };
}

function settlementOutputMultiplier(settlement: Settlement) {
  return settlement === 'Village' ? 1 : settlement === 'Town' ? 1.35 : 1.8;
}

function economyForRegion(region: Region) {
  const base = regionEconomy[region.id] ?? {
    production: {
      grain: 8 + (region.id.length % 7),
      timber: 3 + (region.id.charCodeAt(0) % 5),
      iron: 1 + (region.id.charCodeAt(region.id.length - 1) % 4),
      salt: region.id.includes('east') || region.id.includes('south') ? 4 : 1,
    },
    consumption: { grain: 7, timber: 1, iron: 1, salt: 1 },
  };
  const multiplier = settlementOutputMultiplier(region.settlement);
  const production = emptyLedger();
  const consumption = emptyLedger();
  RESOURCE_TYPES.forEach((resource) => {
    production[resource] = Math.floor(base.production[resource] * multiplier);
    consumption[resource] = Math.ceil(base.consumption[resource] * (1 + (multiplier - 1) * .45));
  });
  return { production, consumption };
}

function realmEconomy(regions: Region[]) {
  const production = emptyLedger();
  const consumption = emptyLedger();
  regions.filter((region) => region.kind === 'player').forEach((region) => {
    const local = economyForRegion(region);
    RESOURCE_TYPES.forEach((resource) => {
      production[resource] += local.production[resource];
      consumption[resource] += local.consumption[resource];
    });
  });
  return { production, consumption };
}

const regionById = (regions: Region[], id: string) => regions.find((region) => region.id === id);

function strongholdUpgradeCost(level: unknown) {
  return getNextStrongholdTier(level)?.cost ?? 0;
}

function strongholdStatusReason(region: Region, campaign: Campaign) {
  const level = normalizeStrongholdLevel(region.strongholdLevel);
  if (level >= MAX_STRONGHOLD_LEVEL) return 'This province has reached its maximum stronghold level.';
  const next = getNextStrongholdTier(level);
  if (!next) return 'No further stronghold tier is available.';
  if (campaign.gold < next.cost) return `You need ${next.cost} gold to raise this ${next.shortName.toLowerCase()}.`;
  return undefined;
}

function hasSharedBorder(regions: Region[], firstId: string, secondId: string) {
  const first = regionById(regions, firstId);
  const second = regionById(regions, secondId);
  return Boolean(first?.adjacent.includes(secondId) && second?.adjacent.includes(firstId));
}

function hasFoundedKingdom(regions: Region[]) {
  return regions.filter((region) => region.kind === 'player').length >= KINGDOM_GOAL;
}

function isFrontStatus(value: unknown): value is FrontStatus {
  return value === 'staged' || value === 'marching' || value === 'arrived' || value === 'resolved';
}

function frontTravelDuration(source: Region, target: Region) {
  const distance = Math.hypot(source.label[0] - target.label[0], source.label[1] - target.label[1]);
  return Math.max(1, Math.min(3, Math.ceil(distance / 150)));
}

function isCampaignEventCategory(value: unknown): value is CampaignEventCategory {
  return value === 'harvest' ||
    value === 'settlement' ||
    value === 'border' ||
    value === 'scouting' ||
    value === 'trade' ||
    value === 'diplomacy' ||
    value === 'readiness';
}

function normalizeCampaignEvent(value: unknown): CampaignEvent | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<CampaignEvent>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.turn !== 'number' ||
    !isCampaignEventCategory(candidate.category) ||
    typeof candidate.title !== 'string' ||
    typeof candidate.description !== 'string' ||
    typeof candidate.prompt !== 'string' ||
    !Array.isArray(candidate.choices)
  ) return undefined;
  const choices = candidate.choices.flatMap((choice) => {
    if (
      !choice ||
      typeof choice !== 'object' ||
      typeof choice.id !== 'string' ||
      typeof choice.label !== 'string' ||
      typeof choice.description !== 'string'
    ) return [];
    return [{
      id: choice.id.slice(0, 60),
      label: choice.label.slice(0, 90),
      description: choice.description.slice(0, 220),
    }];
  }).slice(0, 3);
  if (choices.length < 2) return undefined;
  return {
    id: candidate.id.slice(0, 80),
    turn: Math.max(1, Math.floor(candidate.turn)),
    category: candidate.category,
    title: candidate.title.slice(0, 140),
    description: candidate.description.slice(0, 360),
    prompt: candidate.prompt.slice(0, 220),
    subjectRegionId: typeof candidate.subjectRegionId === 'string' ? candidate.subjectRegionId.slice(0, 80) : undefined,
    subjectName: typeof candidate.subjectName === 'string' ? candidate.subjectName.slice(0, 100) : undefined,
    choices,
  };
}

function makeCampaignEvent(
  campaign: Campaign,
  turn: number,
  regions: Region[],
  fronts: Front[],
  routes: TradeRoute[],
): CampaignEvent {
  const playerRegions = regions.filter((region) => region.kind === 'player');
  const playerRegion = playerRegions[(turn + playerRegions.length) % playerRegions.length] ?? regions[0];
  const rivalBorder = regions.find((region) =>
    region.kind === 'rival' &&
    playerRegions.some((player) => hasSharedBorder(regions, player.id, region.id)),
  );
  const neutralBorder = regions.find((region) =>
    region.kind === 'neutral' &&
    playerRegions.some((player) => hasSharedBorder(regions, player.id, region.id)),
  );
  const activeRoute = routes.find((route) => route.status === 'active' && route.remainingTurns > 0);
  const court = regions.find((region) => region.kind !== 'player' && (campaign.relationships[region.id] ?? 'neutral') !== 'war');
  const front = fronts.find((candidate) => candidate.committedForces > 0);
  const eventId = `event-${turn}-${playerRegion?.id ?? 'realm'}`;
  const subject = (region?: Region) => region ? { subjectRegionId: region.id, subjectName: region.name } : {};

  switch (turn % 7) {
    case 2:
      if (rivalBorder) {
        return {
          id: eventId,
          turn,
          category: 'border',
          title: `${rivalBorder.name} raises its watchfires`,
          description: `Scouts report fresh fires along ${rivalBorder.name}. No army has crossed the line, but the neighboring court is measuring your readiness.`,
          prompt: 'How should the crown answer a warning that has not yet become a battle?',
          ...subject(rivalBorder),
          choices: [
            { id: 'border-scouts', label: 'Send scouts', description: 'Learn the border’s weakness and gain 3 reputation without committing an army.' },
            { id: 'border-reinforce', label: 'Reinforce the watch', description: 'Spend 8 gold to add 6 soldiers at your nearest held border.' },
          ],
        };
      }
      break;
    case 3:
      if (neutralBorder) {
        return {
          id: eventId,
          turn,
          category: 'scouting',
          title: `Wayfinders arrive from ${neutralBorder.name}`,
          description: `Travelers from ${neutralBorder.name} offer a careful map of the roads between your settlements. Their route can open a friendship or simply sharpen your own patrols.`,
          prompt: 'Choose whether to welcome the wayfinders or keep their map at arm’s length.',
          ...subject(neutralBorder),
          choices: [
            { id: 'scouting-welcome', label: 'Welcome the wayfinders', description: 'Spend 8 gold on hospitality and improve the court’s view of your crown.' },
            { id: 'scouting-map', label: 'Keep the map', description: 'The patrol learns the road; gain 5 gold from safer local movement.' },
          ],
        };
      }
      break;
    case 4:
      if (isExpansionEnabled(campaign.expansions, 'commerce') && activeRoute) {
        const partner = regionById(regions, activeRoute.partnerRegionId);
        return {
          id: eventId,
          turn,
          category: 'trade',
          title: `A convoy arrives from ${partner?.name ?? 'the road'}`,
          description: `The convoy master reports a narrow crossing and asks whether the crown will protect the next delivery or take the safer, smaller margin.`,
          prompt: 'Commerce is optional, but this choice will shape the next dispatch.',
          ...subject(partner),
          choices: [
            { id: 'trade-escort', label: 'Fund an escort', description: 'Spend 6 gold to protect the charter and receive 5 extra gold now.' },
            { id: 'trade-margin', label: 'Keep the margin', description: 'Accept the risk and take 8 gold from the current delivery.' },
          ],
        };
      }
      break;
    case 5:
      if (isExpansionEnabled(campaign.expansions, 'diplomacy') && court) {
        return {
          id: eventId,
          turn,
          category: 'diplomacy',
          title: `A sealed letter from ${court.name}`,
          description: `${court.name} asks whether your growing crown intends to be a neighbor, a rival, or something more deliberate. The letter is not a treaty, but it will be remembered.`,
          prompt: 'Set the tone before the next formal exchange.',
          ...subject(court),
          choices: [
            { id: 'diplomacy-assurances', label: 'Send assurances', description: 'Spend 12 gold to gain 5 influence and improve relations.' },
            { id: 'diplomacy-stand', label: 'Stand firmly', description: 'Keep the treasury closed and gain 2 reputation through a clear public stance.' },
          ],
        };
      }
      break;
    case 6:
      if (front && playerRegion) {
        return {
          id: eventId,
          turn,
          category: 'readiness',
          title: `The levy at ${playerRegion.name} needs a decision`,
          description: `Officers at ${playerRegion.name} report that soldiers are drilling between ordinary duties. Their discipline can strengthen the realm, even if no attack is ever ordered.`,
          prompt: 'Use the quiet turn to prepare, or preserve the treasury for construction.',
          ...subject(playerRegion),
          choices: [
            { id: 'readiness-drill', label: 'Drill the garrison', description: 'Spend 10 gold to add 8 soldiers to the selected held province.' },
            { id: 'readiness-reserve', label: 'Keep the reserve', description: 'Save the treasury and gain 6 gold from careful provisioning.' },
          ],
        };
      }
      break;
    case 1:
      if (playerRegion) {
        return {
          id: eventId,
          turn,
          category: 'settlement',
          title: `A new season in ${playerRegion.name}`,
          description: `The settlement’s households ask for a small public work. A crown that invests earns loyalty; a crown that waits keeps room for a larger charter.`,
          prompt: 'Choose the kind of prosperity this turn should leave behind.',
          ...subject(playerRegion),
          choices: [
            { id: 'settlement-fair', label: 'Fund a market fair', description: 'Spend 10 gold and gain 3 reputation as local trade and trust grow.' },
            { id: 'settlement-stores', label: 'Fill the stores', description: 'Keep the gold and add 12 food to the granary.' },
          ],
        };
      }
      break;
    default:
      break;
  }

  return {
    id: eventId,
    turn,
    category: 'harvest',
    title: `The harvest reaches ${playerRegion?.name ?? 'the crown'}`,
    description: `Stewards report a steady season across the held provinces. The stores are healthy enough to support either patience or a little generosity.`,
    prompt: 'Choose what the harvest should make possible next.',
    ...subject(playerRegion),
    choices: [
      { id: 'harvest-granary', label: 'Open the granaries', description: 'Add 16 food to the stores so peaceful growth remains comfortable.' },
      { id: 'harvest-treasury', label: 'Reserve the surplus', description: 'Convert the surplus into 12 gold for a future charter.' },
    ],
  };
}

type RivalTurnInput = {
  regions: Region[];
  fronts: Front[];
  relationships: Record<string, RelationshipState>;
  treaties: Treaty[];
  tradeRoutes: TradeRoute[];
  embargoes: string[];
  diplomacy: DiplomacyState;
  turn: number;
  diplomacyEnabled: boolean;
  commerceEnabled: boolean;
};

type RivalTurnResult = {
  regions: Region[];
  notices: string[];
};

function resolveRivalTurn({
  regions,
  fronts,
  relationships,
  treaties,
  tradeRoutes,
  embargoes,
  diplomacy,
  turn,
  diplomacyEnabled,
  commerceEnabled,
}: RivalTurnInput): RivalTurnResult {
  if (turn <= RIVAL_OPENING_GRACE_END_TURN) return { regions, notices: [] };

  const playerRegions = regions.filter((region) => region.kind === 'player');
  const candidates = regions
    .filter((region) => region.kind === 'rival')
    .map((rival) => {
      const playerBorder = playerRegions.some((player) => hasSharedBorder(regions, player.id, rival.id));
      const borderStrongholdLevel = playerRegions
        .filter((player) => hasSharedBorder(regions, player.id, rival.id))
        .reduce((highest, player) => Math.max(highest, normalizeStrongholdLevel(player.strongholdLevel)), 0);
      const frontThreat = fronts
        .filter((front) =>
          front.targetRegionId === rival.id &&
          front.committedForces > 0 &&
          front.status !== 'resolved',
        )
        .sort((first, second) =>
          second.committedForces - first.committedForces || first.id.localeCompare(second.id),
        )[0];
      const relationship = relationships[rival.id] ?? 'neutral';
      const embargoed = diplomacyEnabled && embargoes.includes(rival.id);
      const protectedTreaty = diplomacyEnabled && treaties.some((treaty) =>
        treaty.partnerRegionId === rival.id &&
        (treaty.kind === 'non-aggression' || treaty.kind === 'defensive-alliance' || treaty.kind === 'peace') &&
        treaty.startedTurn + treaty.duration > turn,
      );
      const activeRoute = commerceEnabled && tradeRoutes.some((route) =>
        route.partnerRegionId === rival.id &&
        route.status === 'active' &&
        route.remainingTurns > 0,
      );

      if (protectedTreaty || (!frontThreat && (!playerBorder || turn % RIVAL_PASSIVE_PULSE !== 0))) return null;
      if (!frontThreat && (relationship === 'friendly' || relationship === 'trading' || relationship === 'allied')) return null;

      const postureWeight = diplomacyEnabled
        ? diplomacy.posture === 'assertive' ? 12 : diplomacy.posture === 'conciliatory' ? -8 : 0
        : 0;
      const threatWeight = frontThreat
        ? 1000 + frontThreat.committedForces + (frontThreat.status === 'arrived' ? 40 : frontThreat.status === 'marching' ? 20 : 5)
        : 100;
      const relationshipWeight = relationship === 'war' ? 30 : relationship === 'hostile' ? 20 : 0;

      return {
        rival,
        frontThreat,
        activeRoute,
        borderStrongholdLevel,
        embargoed,
        relationship,
        priority: threatWeight + relationshipWeight + postureWeight,
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
    .sort((first, second) => second.priority - first.priority || first.rival.id.localeCompare(second.rival.id));

  const selected = candidates.slice(0, RIVAL_DECISION_BUDGET)[0];
  if (!selected) return { regions, notices: [] };

  let reinforcement = selected.frontThreat
    ? selected.frontThreat.status === 'arrived' ? 5 : 3
    : 2;
  if (diplomacyEnabled && (selected.relationship === 'war' || selected.relationship === 'hostile')) reinforcement += 2;
  if (diplomacyEnabled && diplomacy.posture === 'assertive') reinforcement += 1;
  if (commerceEnabled && selected.activeRoute) reinforcement -= 1;
  if (selected.embargoed) reinforcement += 1;
  reinforcement -= Math.min(2, selected.borderStrongholdLevel);
  reinforcement = Math.max(1, Math.min(RIVAL_MAX_ACTION_REINFORCEMENT, reinforcement));

  const nextRegions = regions.map((region) =>
    region.id === selected.rival.id
      ? { ...region, forces: Math.min(RIVAL_MAX_FORCES, region.forces + reinforcement) }
      : region,
  );
  const fortificationNote = selected.borderStrongholdLevel
    ? ` A nearby level ${selected.borderStrongholdLevel} stronghold kept the response measured.`
    : '';
  const notice = selected.frontThreat
    ? `${selected.rival.name} reinforced the threatened border with ${reinforcement} forces while ${selected.frontThreat.name} ${selected.frontThreat.status === 'arrived' ? 'waits at the line' : 'approaches'}${selected.embargoed ? '; the embargo hardened its response' : ''}.${fortificationNote}`
    : `${selected.rival.name} conducted a border drill and added ${reinforcement} forces${selected.activeRoute ? '; its open trade road kept the response measured' : selected.embargoed ? '; the embargo hardened its response' : ''}.${fortificationNote}`;

  return { regions: nextRegions, notices: [notice] };
}

function routeCondition(campaign: Campaign, route: TradeRoute) {
  const partner = regionById(campaign.regions, route.partnerRegionId);
  const relationship = campaign.relationships[route.partnerRegionId] ?? 'neutral';
  if (route.remainingTurns <= 0) return { status: 'expired' as const, reason: 'The charter has expired. Renew it to reopen the road.' };
  if (isExpansionEnabled(campaign.expansions, 'diplomacy') && campaign.embargoes.includes(route.partnerRegionId)) return { status: 'embargoed' as const, reason: 'An embargo is blocking this exchange until it is lifted.' };
  if (!hasSharedBorder(campaign.regions, route.sourceRegionId, route.partnerRegionId)) return { status: 'blocked' as const, reason: 'The source and partner no longer share an open border.' };
  if (isExpansionEnabled(campaign.expansions, 'diplomacy') && (relationship === 'war' || relationship === 'hostile')) return { status: 'disrupted' as const, reason: 'Hostilities have closed the crossing and interrupted the route.' };
  if ((campaign.resources[route.exportResource] ?? 0) < 2) return { status: 'shortage' as const, reason: `The stores lack ${route.exportResource} for this convoy.` };
  return { status: 'active' as const, reason: `The road to ${partner?.name ?? 'your partner'} is open and earning its charter.` };
}

function treatyLabel(kind: TreatyKind) {
  return kind === 'trade'
    ? 'Trade agreement'
    : kind === 'non-aggression'
      ? 'Non-aggression pact'
      : kind === 'defensive-alliance'
        ? 'Defensive alliance'
        : kind === 'military-aid'
          ? 'Military aid charter'
          : 'Peace terms';
}

function treatyDuration(kind: TreatyKind) {
  return kind === 'trade' ? 6 : kind === 'non-aggression' ? 4 : kind === 'defensive-alliance' ? 6 : kind === 'military-aid' ? 3 : 3;
}

function treatyInfluenceCost(kind: TreatyKind) {
  return kind === 'trade' ? 4 : kind === 'non-aggression' ? 6 : kind === 'defensive-alliance' ? 12 : kind === 'military-aid' ? 8 : 4;
}

type DiplomaticMove = 'envoy' | TreatyKind;
type DiplomaticResponse = {
  accepted: boolean;
  message: string;
};

function courtTemperament(regionId: string) {
  return [...regionId].reduce((total, character, index) => total + character.charCodeAt(0) * (index + 1), 0) % 3;
}

function resolveDiplomaticResponse(campaign: Campaign, partnerId: string, move: DiplomaticMove): DiplomaticResponse {
  const partner = regionById(campaign.regions, partnerId);
  if (!partner) return { accepted: false, message: 'The intended court could not be found, so no reply was returned.' };

  const relationship = campaign.relationships[partnerId] ?? 'neutral';
  const activeTreaties = campaign.treaties.filter((treaty) =>
    treaty.partnerRegionId === partnerId &&
    treaty.startedTurn + treaty.duration > campaign.turn,
  );
  const activeTreaty = move !== 'envoy'
    ? activeTreaties.find((treaty) => treaty.kind === move)
    : undefined;
  const embargoed = campaign.embargoes.includes(partnerId);

  if (move === 'envoy') {
    if (embargoed) {
      return {
        accepted: false,
        message: `${partner.name} refused the envoy; the embargo has closed its court to your seal.`,
      };
    }
    const protectedTreaty = activeTreaties.find((treaty) =>
      treaty.kind === 'non-aggression' || treaty.kind === 'defensive-alliance' || treaty.kind === 'peace',
    );
    const accepted = relationship !== 'war' || Boolean(protectedTreaty) || campaign.diplomacy.posture === 'conciliatory';
    return accepted
      ? {
          accepted: true,
          message: protectedTreaty
            ? `${partner.name} accepted the envoy and reaffirmed its ${treatyLabel(protectedTreaty.kind).toLowerCase()}.`
            : `${partner.name} accepted the envoy and offered a warmer diplomatic channel.`,
        }
      : {
          accepted: false,
          message: `${partner.name} refused the envoy; its court will not soften while the border remains at war.`,
        };
  }

  if (activeTreaty) {
    return {
      accepted: false,
      message: `${partner.name} refused the proposal; its ${treatyLabel(activeTreaty.kind).toLowerCase()} is already active.`,
    };
  }
  if (move === 'trade' && embargoed) {
    return {
      accepted: false,
      message: `${partner.name} refused the trade agreement; the active embargo still bars the road.`,
    };
  }
  if (relationship === 'war' && move !== 'peace') {
    return {
      accepted: false,
      message: `${partner.name} refused the ${treatyLabel(move).toLowerCase()}; war has closed every other form of accord.`,
    };
  }

  const relationshipTrust =
    relationship === 'allied' ? 4 :
      relationship === 'trading' ? 3 :
        relationship === 'friendly' ? 2 :
          relationship === 'hostile' ? -1 :
            relationship === 'war' ? -2 : 0;
  const reputationTrust = campaign.reputation >= 50 ? 2 : campaign.reputation >= 30 ? 1 : 0;
  const postureTrust = campaign.diplomacy.posture === 'conciliatory' ? 1 : campaign.diplomacy.posture === 'assertive' ? -1 : 0;
  const tradeTrust = activeTreaties.some((treaty) => treaty.kind === 'trade') ? 1 : 0;
  const trust = relationshipTrust + reputationTrust + postureTrust + tradeTrust - courtTemperament(partnerId);
  const requiredTrust =
    move === 'trade' ? 1 :
      move === 'non-aggression' ? 2 :
        move === 'defensive-alliance' ? 3 :
          move === 'military-aid' ? 2 : 0;
  const accepted = trust >= requiredTrust;

  return accepted
    ? {
        accepted: true,
        message: `${partner.name} accepted your ${treatyLabel(move).toLowerCase()} proposal and sealed the terms.`,
      }
    : {
        accepted: false,
        message: `${partner.name} refused your ${treatyLabel(move).toLowerCase()} proposal; its court wants stronger assurances.`,
      };
}

function postureLabel(posture: DiplomaticPosture) {
  return posture === 'conciliatory' ? 'Conciliatory' : posture === 'assertive' ? 'Assertive' : 'Balanced';
}

function postureDescription(posture: DiplomaticPosture) {
  return posture === 'conciliatory'
    ? 'Trust grows faster, but rivals read your borders as patient.'
    : posture === 'assertive'
      ? 'Your court signals a firmer edge, but envoy work costs more influence.'
      : 'A steady court with no special diplomatic tilt.';
}

function makeNewCampaign(
  nation: string,
  banner: Banner,
  expansions: ExpansionSelection,
  archetypeId: NationArchetypeId,
  emblemId: EmblemId,
): Campaign {
  const archetype = getNationArchetype(archetypeId);
  return {
    edition: 'Canvas',
    worldVersion: 2,
    featureVersion: 2,
    status: 'active',
    expansions: { ...expansions },
    nation: nation.trim() || 'The Unnamed Crown',
    banner,
    archetypeId,
    emblemId,
    turn: 1,
    gold: Math.max(0, 145 + archetype.modifiers.startingGold),
    food: Math.max(0, 120 + archetype.modifiers.startingFood),
    resources: { grain: Math.max(0, 120 + archetype.modifiers.startingFood), timber: 24, iron: 12, salt: 10 },
    forces: Math.max(1, 48 + archetype.modifiers.startingForces),
    regions: worldRegions.map((region) => ({ ...region, adjacent: [...region.adjacent], strongholdLevel: 0 as StrongholdLevel })),
    fronts: [],
    relationships: {},
    treaties: [],
    tradeRoutes: [],
    reputation: Math.max(0, Math.min(100, 50 + archetype.modifiers.startingReputation)),
    militaryAid: 0,
    embargoes: [],
    diplomacy: defaultDiplomacy(),
    log: ['The first standard was raised at Aurelian Reach.'],
    lastTurnSummary: undefined,
    activeEvent: undefined,
  };
}

function settlementCharterCost(settlement: Settlement, archetypeId: NationArchetypeId) {
  const baseCost: Record<Settlement, number> = { Village: 110, Town: 190, City: 9999 };
  return Math.max(1, baseCost[settlement] - getNationArchetype(archetypeId).modifiers.settlementCostDiscount);
}

function readCampaign(): Campaign | null {
  try {
    const raw = localStorage.getItem('openkingdoms-campaign');
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<Campaign>;
    if (
      !saved ||
      typeof saved.nation !== 'string' ||
      !Array.isArray(saved.regions)
    ) {
      return null;
    }

    const hasExpansionState = Boolean(saved.expansions && typeof saved.expansions === 'object');
    const expansions = normalizeExpansionSelection(saved.expansions, hasExpansionState ? BASELINE_EXPANSIONS : ALL_EXPANSIONS);
    const savedRegions = saved.regions as Partial<Region>[];
    const regions = worldRegions.map((base) => {
      const savedRegion = savedRegions.find((region) => region.id === base.id);
      if (!savedRegion) return { ...base };
      const savedKind =
        savedRegion.kind === 'player' ||
        savedRegion.kind === 'rival' ||
        savedRegion.kind === 'neutral'
          ? savedRegion.kind
          : base.kind;
      const savedSettlement =
        savedRegion.settlement === 'Village' ||
        savedRegion.settlement === 'Town' ||
        savedRegion.settlement === 'City'
          ? savedRegion.settlement
          : base.settlement;
      return {
        ...base,
        ...savedRegion,
        chunkId: base.chunkId,
        adjacent: [...base.adjacent],
        terrain: base.terrain,
        landmark: base.landmark,
        path: base.path,
        label: base.label,
        kind: savedKind,
        settlement: savedSettlement,
        forces:
          typeof savedRegion.forces === 'number' && savedRegion.forces >= 0
            ? savedRegion.forces
            : base.forces,
        barracks: Boolean(savedRegion.barracks),
        strongholdLevel: normalizeStrongholdLevel(savedRegion.strongholdLevel),
      };
    });

    const savedFronts = Array.isArray(saved.fronts) ? saved.fronts : [];
    const fronts: Front[] = savedFronts.flatMap((front) => {
      if (
        !front ||
        typeof front !== 'object' ||
        typeof front.id !== 'string' ||
        typeof front.name !== 'string' ||
        typeof front.sourceRegionId !== 'string' ||
        typeof front.targetRegionId !== 'string'
      ) {
        return [];
      }
      const source = regions.find((region) => region.id === front.sourceRegionId);
      const target = regions.find((region) => region.id === front.targetRegionId);
      const committedForces =
        typeof front.committedForces === 'number' && front.committedForces >= 0
          ? Math.floor(front.committedForces)
          : 0;
      if (
        !source ||
        !target ||
        source.kind !== 'player' ||
        target.kind === 'player' ||
        !source.adjacent.includes(target.id) ||
        !target.adjacent.includes(source.id)
      ) {
        return [];
      }
      const savedStatus = isFrontStatus(front.status) ? front.status : 'staged';
      const status = savedStatus === 'resolved' ? 'arrived' : savedStatus;
      const savedTravelTurns =
        typeof front.travelTurns === 'number' && Number.isFinite(front.travelTurns)
          ? Math.min(3, Math.max(0, Math.floor(front.travelTurns)))
          : frontTravelDuration(source, target);
      return [{
        id: front.id.slice(0, 80),
        name: front.name.slice(0, 48) || `${target.name} Front`,
        sourceRegionId: source.id,
        targetRegionId: target.id,
        committedForces,
        travelTurns: status === 'arrived' ? 0 : savedTravelTurns || 1,
        status,
      }];
    });
    const defaultResources = { grain: typeof saved.food === 'number' && saved.food >= 0 ? Math.floor(saved.food) : 120, timber: 24, iron: 12, salt: 10 };
    const resources = safeLedger(saved.resources, defaultResources);
    const relationships: Record<string, RelationshipState> = {};
    if (saved.relationships && typeof saved.relationships === 'object') {
      Object.entries(saved.relationships).forEach(([regionId, relationship]) => {
        if (regions.some((region) => region.id === regionId && region.kind !== 'player') && isRelationshipState(relationship)) {
          relationships[regionId] = relationship;
        }
      });
    }
    const treaties: Treaty[] = Array.isArray(saved.treaties)
      ? saved.treaties.flatMap((treaty) => {
        if (
          !treaty ||
          typeof treaty !== 'object' ||
          typeof treaty.id !== 'string' ||
          typeof treaty.partnerRegionId !== 'string' ||
          !isTreatyKind(treaty.kind)
        ) return [];
        const partner = regions.find((region) => region.id === treaty.partnerRegionId);
        if (!partner || partner.kind === 'player') return [];
        return [{
          id: treaty.id.slice(0, 80),
          partnerRegionId: partner.id,
          kind: treaty.kind,
          startedTurn: typeof treaty.startedTurn === 'number' ? Math.max(1, Math.floor(treaty.startedTurn)) : 1,
          duration: typeof treaty.duration === 'number' ? Math.max(1, Math.min(12, Math.floor(treaty.duration))) : 4,
        }];
      })
      : [];
    const tradeRoutes: TradeRoute[] = Array.isArray(saved.tradeRoutes)
      ? saved.tradeRoutes.flatMap((route) => {
        if (
          !route ||
          typeof route !== 'object' ||
          typeof route.id !== 'string' ||
          typeof route.sourceRegionId !== 'string' ||
          typeof route.partnerRegionId !== 'string' ||
          typeof route.exportResource !== 'string' ||
          typeof route.importResource !== 'string'
        ) return [];
        const source = regions.find((region) => region.id === route.sourceRegionId);
        const partner = regions.find((region) => region.id === route.partnerRegionId);
        if (!source || source.kind !== 'player' || !partner || partner.kind === 'player') return [];
        return [{
          id: route.id.slice(0, 80),
          sourceRegionId: source.id,
          partnerRegionId: partner.id,
          exportResource: RESOURCE_TYPES.includes(route.exportResource as ResourceType) ? route.exportResource as ResourceType : 'grain',
          importResource: RESOURCE_TYPES.includes(route.importResource as ResourceType) ? route.importResource as ResourceType : 'salt',
          income: typeof route.income === 'number' ? Math.max(1, Math.floor(route.income)) : 16,
          upkeep: typeof route.upkeep === 'number' ? Math.max(0, Math.floor(route.upkeep)) : 4,
          remainingTurns: typeof route.remainingTurns === 'number' ? Math.max(0, Math.min(12, Math.floor(route.remainingTurns))) : 6,
          risk: typeof route.risk === 'number' ? Math.max(0, Math.min(100, Math.floor(route.risk))) : 20,
          status: isTradeRouteStatus(route.status) ? route.status : 'active',
        }];
      })
      : [];
    const savedTurnSummary = saved.lastTurnSummary;
    const lastTurnSummary: TurnSummary | undefined =
      savedTurnSummary &&
      typeof savedTurnSummary === 'object' &&
      typeof savedTurnSummary.turn === 'number' &&
      typeof savedTurnSummary.headline === 'string' &&
      Array.isArray(savedTurnSummary.items)
        ? {
            turn: Math.max(1, Math.floor(savedTurnSummary.turn)),
            headline: savedTurnSummary.headline.slice(0, 140),
            items: savedTurnSummary.items
              .filter((item): item is string => typeof item === 'string')
              .slice(0, 8)
              .map((item) => item.slice(0, 220)),
          }
        : undefined;
    const activeEvent = normalizeCampaignEvent(saved.activeEvent);
    const savedStatus: CampaignStatus = saved.status === 'victory' && hasFoundedKingdom(regions) ? 'victory' : 'active';

    return {
      edition: 'Canvas',
      worldVersion: 2,
      featureVersion: 2,
      status: savedStatus,
      victoryTurn:
        savedStatus === 'victory' && typeof saved.victoryTurn === 'number'
          ? Math.max(1, Math.floor(saved.victoryTurn))
          : undefined,
      expansions,
      nation: saved.nation.slice(0, 28),
      banner:
        saved.banner &&
        typeof saved.banner.name === 'string' &&
        typeof saved.banner.color === 'string' &&
        typeof saved.banner.secondary === 'string'
          ? saved.banner
          : banners[0],
      archetypeId: isNationArchetypeId(saved.archetypeId) ? saved.archetypeId : DEFAULT_NATION_ARCHETYPE_ID,
      emblemId: isEmblemId(saved.emblemId) ? saved.emblemId : DEFAULT_EMBLEM_ID,
      turn: typeof saved.turn === 'number' && saved.turn > 0 ? saved.turn : 1,
      gold: typeof saved.gold === 'number' && saved.gold >= 0 ? saved.gold : 145,
      food: typeof saved.food === 'number' && saved.food >= 0 ? saved.food : 120,
      resources,
      forces:
        typeof saved.forces === 'number' && saved.forces >= 0
          ? saved.forces
          : 48,
      regions,
      fronts,
      relationships,
      treaties,
      tradeRoutes,
      reputation: typeof saved.reputation === 'number' ? Math.max(0, Math.min(100, Math.floor(saved.reputation))) : 50,
      militaryAid: typeof saved.militaryAid === 'number' ? Math.max(0, Math.floor(saved.militaryAid)) : 0,
      embargoes: Array.isArray(saved.embargoes)
        ? saved.embargoes.filter((id): id is string => typeof id === 'string' && regions.some((region) => region.id === id && region.kind !== 'player'))
        : [],
      diplomacy: normalizeDiplomacy(saved.diplomacy),
      log: Array.isArray(saved.log)
        ? saved.log.filter((entry): entry is string => typeof entry === 'string')
        : ['The first standard was raised at Aurelian Reach.'],
      lastTurnSummary,
      activeEvent,
    };
  } catch (error) {
    console.error('Could not restore campaign save', error);
    return null;
  }
}

function ThemeControl({
  theme,
  setTheme,
  reducedMotion,
  setReducedMotion,
  soundEnabled,
  setSoundEnabled,
  feedbackLevel,
  setFeedbackLevel,
  open,
  setOpen,
}: {
  theme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
  reducedMotion: boolean;
  setReducedMotion: (value: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (value: boolean) => void;
  feedbackLevel: FeedbackLevel;
  setFeedbackLevel: (value: FeedbackLevel) => void;
  open: boolean;
  setOpen: (value: boolean) => void;
}) {
  return (
    <div className="theme-control">
      <button
        className="button-quiet theme-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="theme-menu"
        data-testid="button-open-appearance"
      >
        <Palette size={14} />
        <span>Appearance</span>
      </button>
      {open && (
        <div className="theme-menu" id="theme-menu" role="dialog" aria-label="Appearance settings">
          <div className="theme-menu-heading">
            <div>
              <div className="panel-kicker">Royal preferences</div>
              <strong>Shape the atmosphere</strong>
            </div>
            <button
              className="close-button"
              onClick={() => setOpen(false)}
              aria-label="Close appearance settings"
              data-testid="button-close-appearance"
            >
              <X size={16} />
            </button>
          </div>
          <div className="theme-options">
            {(Object.keys(themePresets) as ThemeKey[]).map((key) => (
              <button
                key={key}
                className={`theme-option ${theme === key ? 'is-selected' : ''}`}
                onClick={() => setTheme(key)}
                aria-pressed={theme === key}
                data-testid={`button-theme-${key}`}
              >
                <span className={`theme-swatch theme-swatch-${key}`} />
                <span>
                  <strong>{themePresets[key].name}</strong>
                  <small>{themePresets[key].description}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="feedback-settings">
            <div className="feedback-settings-label">Decision feedback</div>
            <label className="motion-option feedback-sound-option">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(event) => setSoundEnabled(event.target.checked)}
                data-testid="checkbox-sound-feedback"
              />
              <Volume2 size={14} />
              <span>Play decision sounds</span>
            </label>
            <label className="feedback-level-option" htmlFor="feedback-level">
              <span>Visual flourish</span>
              <select
                id="feedback-level"
                value={feedbackLevel}
                onChange={(event) => setFeedbackLevel(event.target.value as FeedbackLevel)}
                data-testid="select-feedback-level"
              >
                <option value="full">Full heraldry</option>
                <option value="subtle">Subtle ink</option>
                <option value="text">Text only</option>
              </select>
            </label>
          </div>
          <label className="motion-option">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(event) => setReducedMotion(event.target.checked)}
              data-testid="checkbox-reduced-motion"
            />
            <Accessibility size={14} />
            <span>Reduce motion</span>
          </label>
        </div>
      )}
    </div>
  );
}

function readTheme(): ThemeKey {
  try {
    const saved = localStorage.getItem('openkingdoms-theme');
    return saved === 'midnight' || saved === 'meadow' ? saved : 'parchment';
  } catch {
    return 'parchment';
  }
}

function readReducedMotion(): boolean {
  try {
    const saved = localStorage.getItem('openkingdoms-reduced-motion');
    if (saved !== null) return saved === 'true';
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

function readSoundEnabled(): boolean {
  try {
    const saved = localStorage.getItem('openkingdoms-sound-feedback');
    return saved === null ? true : saved !== 'false';
  } catch {
    return true;
  }
}

function readFeedbackLevel(): FeedbackLevel {
  try {
    const saved = localStorage.getItem('openkingdoms-feedback-level');
    return saved === 'subtle' || saved === 'text' ? saved : 'full';
  } catch {
    return 'full';
  }
}

function FeedbackIcon({ tone }: { tone: FeedbackTone }) {
  if (tone === 'build') return <Hammer size={16} />;
  if (tone === 'upgrade') return <Landmark size={16} />;
  if (tone === 'recruit') return <Users size={16} />;
  if (tone === 'victory') return <Swords size={16} />;
  if (tone === 'harvest') return <Wheat size={16} />;
  if (tone === 'error') return <X size={16} />;
  return <Crown size={16} />;
}

function App() {
  const [campaign, setCampaign] = useState<Campaign | null>(() => readCampaign());
  const [nationName, setNationName] = useState('');
  const [bannerIndex, setBannerIndex] = useState(0);
  const [nationArchetypeId, setNationArchetypeId] = useState<NationArchetypeId>(DEFAULT_NATION_ARCHETYPE_ID);
  const [emblemId, setEmblemId] = useState<EmblemId>(DEFAULT_EMBLEM_ID);
  const [newExpansions, setNewExpansions] = useState<ExpansionSelection>({ ...BASELINE_EXPANSIONS });
  const [selectedId, setSelectedId] = useState<string | null>('aurelian');
  const [guideOpen, setGuideOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackNotice | null>(null);
  const [theme, setTheme] = useState<ThemeKey>(() => readTheme());
  const [reducedMotion, setReducedMotion] = useState(() => readReducedMotion());
  const [soundEnabled, setSoundEnabled] = useState(() => readSoundEnabled());
  const [feedbackLevel, setFeedbackLevel] = useState<FeedbackLevel>(() => readFeedbackLevel());
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [systemsOpen, setSystemsOpen] = useState(false);
  const [activeFrontId, setActiveFrontId] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [frontDraftName, setFrontDraftName] = useState('');
  const [frontDraftSourceId, setFrontDraftSourceId] = useState('');
  const [frontDraftAllocation, setFrontDraftAllocation] = useState(0);
  const [tradeDraftSourceId, setTradeDraftSourceId] = useState('');
  const [tradeDraftExport, setTradeDraftExport] = useState<ResourceType>('grain');
  const [tradeDraftImport, setTradeDraftImport] = useState<ResourceType>('salt');
  const guideCloseRef = useRef<HTMLButtonElement>(null);
  const mapExpandButtonRef = useRef<HTMLButtonElement>(null);
  const feedbackSequenceRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (campaign) localStorage.setItem('openkingdoms-campaign', JSON.stringify(campaign));
  }, [campaign]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('openkingdoms-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reducedMotion);
    localStorage.setItem('openkingdoms-reduced-motion', String(reducedMotion));
  }, [reducedMotion]);

  useEffect(() => {
    localStorage.setItem('openkingdoms-sound-feedback', String(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('openkingdoms-feedback-level', feedbackLevel);
  }, [feedbackLevel]);

  useEffect(() => () => {
    void audioContextRef.current?.close();
  }, []);

  useEffect(() => {
    if (!guideOpen) return;
    guideCloseRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setGuideOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [guideOpen]);

  useEffect(() => {
    if (!mapExpanded) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMapExpanded(false);
        window.setTimeout(() => mapExpandButtonRef.current?.focus(), 0);
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [mapExpanded]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const selected = useMemo(
    () => (campaign && selectedId ? regionById(campaign.regions, selectedId) : undefined),
    [campaign, selectedId],
  );
  const playerRegions = campaign?.regions.filter((region) => region.kind === 'player') ?? [];
  const campaignComplete = campaign?.status === 'victory';
  const objectiveProgress = hasFoundedKingdom(playerRegions)
    ? 100
    : Math.min(100, Math.round((playerRegions.length / KINGDOM_GOAL) * 100));
  const canvasRegions: CanvasRegion[] = campaign?.regions ?? [];
  const canvasPalette = themePresets[theme].canvas;
  const diplomacyEnabled = campaign ? isExpansionEnabled(campaign.expansions, 'diplomacy') : false;
  const commerceEnabled = campaign ? isExpansionEnabled(campaign.expansions, 'commerce') : false;
  const activeArchetype = getNationArchetype(campaign?.archetypeId ?? nationArchetypeId);
  const selectedRecruitmentYield = selected
    ? (selected.barracks ? 16 : 10) + activeArchetype.modifiers.recruitmentBonus + getStrongholdTier(selected.strongholdLevel).recruitment
    : 0;
  const frontSummaries = useMemo<FrontSummary[]>(() => {
    if (!campaign) return [];
    return campaign.fronts.flatMap((front) => {
      const source = regionById(campaign.regions, front.sourceRegionId);
      const target = regionById(campaign.regions, front.targetRegionId);
      if (!source || !target) return [];
      const projectedDefendingForces = source.forces + front.committedForces;
      const targetStronghold = getStrongholdTier(target.strongholdLevel);
       const allySupport = diplomacyEnabled && campaign.militaryAid > 0 && campaign.treaties.some((treaty) =>
        treaty.kind === 'defensive-alliance' &&
        treaty.partnerRegionId !== target.id &&
        treaty.startedTurn + treaty.duration > campaign.turn &&
        hasSharedBorder(campaign.regions, treaty.partnerRegionId, target.id),
      ) ? Math.min(12, campaign.militaryAid) : 0;
      const attackStrength = front.committedForces + allySupport;
       const defenderStrength = target.forces + targetStronghold.defense;
       const outcome: FrontSummary['outcome'] =
        front.committedForces <= 0
          ? 'No forces staged'
           : attackStrength >= defenderStrength + 12
            ? 'Strong advantage'
             : attackStrength > defenderStrength
              ? 'Uncertain'
              : 'Outmatched';
      return [{
        id: front.id,
        name: front.name,
        sourceRegionId: source.id,
        targetRegionId: target.id,
        sourceName: source.name,
        targetName: target.name,
        sourceForces: source.forces,
        committedForces: front.committedForces,
        targetForces: target.forces,
         strongholdLevel: targetStronghold.level,
         strongholdDefense: targetStronghold.defense,
        projectedDefendingForces,
        allySupport,
        supply: source.kind === 'player' && source.adjacent.includes(target.id) ? 'Supplied' : 'Broken supply',
         status: front.status,
        travelTurns: front.travelTurns,
        outcome,
      }];
    });
  }, [campaign, diplomacyEnabled]);
  const selectedTarget = selected && selected.kind !== 'player' ? selected : undefined;
  const selectedTargetFronts = selectedTarget
    ? frontSummaries.filter((front) => front.targetRegionId === selectedTarget.id)
    : [];
  const activeFrontSummary =
    frontSummaries.find((front) => front.id === activeFrontId) ?? selectedTargetFronts[0];
  const canvasFronts: CanvasFront[] = frontSummaries.flatMap((front) => {
    const source = regionById(campaign?.regions ?? [], front.sourceRegionId);
    const target = regionById(campaign?.regions ?? [], front.targetRegionId);
    if (!source || !target) return [];
    return [{
      id: front.id,
      name: front.name,
      sourceRegionId: front.sourceRegionId,
      targetRegionId: front.targetRegionId,
      source: source.label,
      target: target.label,
      committedForces: front.committedForces,
       status: front.status,
       travelTurns: front.travelTurns,
    }];
  });
  const canvasRoutes = useMemo<CanvasRoute[]>(() => {
    if (!campaign) return [];
    return campaign.tradeRoutes.flatMap((route) => {
      const source = regionById(campaign.regions, route.sourceRegionId);
      const partner = regionById(campaign.regions, route.partnerRegionId);
      if (!source || !partner) return [];
      return [{
        id: route.id,
        source: source.label,
        target: partner.label,
        partnerRegionId: partner.id,
        status: routeCondition(campaign, route).status,
      }];
    });
  }, [campaign]);
  const frontSourceOptions = useMemo<FrontSourceOption[]>(() => {
    if (!campaign || !selectedTarget) return [];
    return campaign.regions
      .filter((region) =>
        region.kind === 'player' &&
        region.adjacent.includes(selectedTarget.id) &&
        selectedTarget.adjacent.includes(region.id) &&
        !campaign.fronts.some(
          (front) => front.sourceRegionId === region.id && front.targetRegionId === selectedTarget.id,
        ),
      )
      .map((region) => ({ id: region.id, name: region.name, forces: region.forces }));
  }, [campaign, selectedTarget]);

  const economy = useMemo(() => (campaign && commerceEnabled ? realmEconomy(campaign.regions) : { production: emptyLedger(), consumption: emptyLedger() }), [campaign?.regions, commerceEnabled]);
  const economyShortages = commerceEnabled
    ? RESOURCE_TYPES.filter((resource) => (campaign?.resources[resource] ?? 0) < economy.consumption[resource])
    : [];
  const selectedLocalEconomy = selected ? economyForRegion(selected) : null;
  const selectedLocalShortages = selectedLocalEconomy && commerceEnabled
    ? RESOURCE_TYPES.filter((resource) => (campaign?.resources[resource] ?? 0) < selectedLocalEconomy.consumption[resource])
    : [];
  const selectedAdjacentRegions = selected
    ? selected.adjacent
      .map((regionId) => regionById(campaign?.regions ?? [], regionId))
      .filter((region): region is Region => Boolean(region))
    : [];
  const campaignMilestones = useMemo<CampaignMilestone[]>(() => {
    if (!campaign) return [];
    const held = playerRegions.length;
    const developed = playerRegions.filter((region) => region.settlement !== 'Village').length;
    const hasArmyOrder = campaign.fronts.length > 0 || campaign.log.some((entry) => entry.includes('established with'));
    const buildMilestone = (milestone: Omit<CampaignMilestone, 'complete'>): CampaignMilestone => ({
      ...milestone,
      complete: milestone.progress >= milestone.target,
    });
    return [
      buildMilestone({
        id: 'hold-the-core',
        title: 'Hold the core',
        description: 'Grow from your founding province into a secure foothold.',
        progress: held,
        target: KINGDOM_GOAL,
        detail: `${held} / ${KINGDOM_GOAL} held`,
      }),
      buildMilestone({
        id: 'shape-a-stronghold',
        title: 'Grow a settlement',
        description: 'Upgrade one settlement so your economy and levies can compound.',
        progress: Math.min(1, developed),
        target: 1,
        detail: developed ? 'Town or city ready' : 'Upgrade a village',
      }),
      buildMilestone({
        id: 'put-an-army-on-the-road',
        title: 'Put an army on the road',
        description: 'Establish a border order and learn the rhythm of staging, marching, and arrival.',
        progress: Math.min(1, hasArmyOrder ? 1 : 0),
        target: 1,
        detail: hasArmyOrder ? 'Border order recorded' : 'Select a neighboring border',
      }),
    ];
  }, [campaign, playerRegions]);
  const routeViews = useMemo<TradeRouteView[]>(() => {
    if (!campaign || !commerceEnabled) return [];
    return campaign.tradeRoutes.flatMap((route) => {
      const partner = regionById(campaign.regions, route.partnerRegionId);
      const source = regionById(campaign.regions, route.sourceRegionId);
      if (!partner || !source) return [];
      const condition = routeCondition(campaign, route);
      return [{
        id: route.id,
        partnerRegionId: route.partnerRegionId,
        partnerName: partner.name,
        sourceName: source.name,
        exportResource: route.exportResource,
        importResource: route.importResource,
        income: route.income,
        upkeep: route.upkeep,
        remainingTurns: route.remainingTurns,
        risk: route.risk,
        status: condition.status,
        statusReason: condition.reason,
      }];
    });
  }, [campaign, commerceEnabled]);
  const tradeIncome = routeViews.filter((route) => route.status === 'active').reduce((total, route) => total + route.income, 0);
  const tradeUpkeep = routeViews.filter((route) => route.status === 'active').reduce((total, route) => total + route.upkeep, 0);
  const selectedTradeRoute = selectedTarget
    ? routeViews.find((route) => route.partnerRegionId === selectedTarget.id) ?? null
    : null;
  const tradeSourceOptions = useMemo<TradeSourceOption[]>(() => {
    if (!campaign || !selectedTarget) return [];
    return campaign.regions
      .filter((region) => region.kind === 'player' && hasSharedBorder(campaign.regions, region.id, selectedTarget.id))
      .map((region) => ({ id: region.id, name: region.name, resources: [...RESOURCE_TYPES] }));
  }, [campaign, selectedTarget]);
  const selectedPartner = useMemo<DiplomacyPartnerView | null>(() => {
    if (!campaign || !selectedTarget || !diplomacyEnabled) return null;
    const relationship = campaign.relationships[selectedTarget.id] ?? 'neutral';
    const posture = campaign.diplomacy.posture;
    const influence = campaign.diplomacy.influence;
    const envoyCooldown = campaign.diplomacy.envoyCooldowns[selectedTarget.id] ?? 0;
    const treaties = campaign.treaties
      .filter((treaty) => treaty.partnerRegionId === selectedTarget.id)
      .map((treaty) => ({
        id: treaty.id,
        kind: treaty.kind,
        label: treatyLabel(treaty.kind),
        remainingTurns: Math.max(0, treaty.startedTurn + treaty.duration - campaign.turn),
      }));
    const hasTreaty = (kind: TreatyKind) => treaties.some((treaty) => treaty.kind === kind && treaty.remainingTurns > 0);
    const hostile = relationship === 'hostile' || relationship === 'war';
    const friendlyEnough = relationship === 'friendly' || relationship === 'trading' || relationship === 'allied';
    const sharedBorder = tradeSourceOptions.length > 0;
    const envoyInfluenceCost = posture === 'assertive' ? 8 : 5;
    const canAfford = (kind: TreatyKind) => influence >= treatyInfluenceCost(kind);
    return {
      id: selectedTarget.id,
      name: selectedTarget.name,
      relationship,
      relationshipReason:
        relationship === 'neutral'
          ? `No formal ties; the border is watching. ${postureDescription(posture)}`
          : relationship === 'friendly'
            ? 'An envoy has opened a cordial channel.'
            : relationship === 'trading'
              ? 'Commerce is binding both courts together.'
              : relationship === 'allied'
                ? 'A sworn ally expects support in return.'
                : relationship === 'hostile'
                  ? 'Recent insults and broken promises have hardened the court.'
          : `Open war has closed the diplomatic channel. ${postureDescription(posture)}`,
      sharedBorder,
      embargoed: campaign.embargoes.includes(selectedTarget.id),
      treaties,
      route: selectedTradeRoute,
      posture,
      influence,
      envoyCooldown,
      offers: {
        envoy: {
          enabled: (relationship === 'neutral' || relationship === 'hostile') && campaign.gold >= 20 && envoyCooldown === 0 && influence >= envoyInfluenceCost,
          reason: envoyCooldown > 0
            ? `The envoy office is cooling down for ${envoyCooldown} more turn${envoyCooldown === 1 ? '' : 's'}.`
            : influence < envoyInfluenceCost
              ? `Needs ${envoyInfluenceCost} influence; the court has ${influence}.`
              : relationship === 'hostile'
                ? `Costs 20 gold and ${envoyInfluenceCost} influence; offers a path back from hostility.`
                : relationship === 'neutral'
                  ? `Costs 20 gold and ${envoyInfluenceCost} influence; opens a friendly channel.`
                  : 'The relationship is already beyond a first introduction.',
        },
        trade: {
          enabled: friendlyEnough && !hasTreaty('trade') && !hostile && !campaign.embargoes.includes(selectedTarget.id) && canAfford('trade'),
          reason: hasTreaty('trade') ? 'A trade agreement is already active.' : hostile ? 'Trade cannot be proposed while the border is hostile.' : !canAfford('trade') ? `Needs ${treatyInfluenceCost('trade')} influence to draft.` : 'Requires friendly relations and an open border.',
        },
        nonAggression: {
          enabled: (relationship === 'friendly' || relationship === 'trading') && !hasTreaty('non-aggression') && canAfford('non-aggression'),
          reason: hasTreaty('non-aggression') ? 'This pact is already protecting the border.' : !canAfford('non-aggression') ? `Needs ${treatyInfluenceCost('non-aggression')} influence to draft.` : 'Friendly courts can promise four turns without war.',
        },
        alliance: {
          enabled: (relationship === 'friendly' || relationship === 'trading') && !hasTreaty('defensive-alliance') && campaign.reputation >= 35 && canAfford('defensive-alliance'),
          reason: hasTreaty('defensive-alliance') ? 'The defensive alliance is already sworn.' : campaign.reputation < 35 ? 'Reputation is too low to ask for a mutual defense oath.' : !canAfford('defensive-alliance') ? `Needs ${treatyInfluenceCost('defensive-alliance')} influence to draft.` : 'Trade or friendship must come before an alliance.',
        },
        militaryAid: {
          enabled: relationship === 'allied' && !hasTreaty('military-aid') && canAfford('military-aid'),
          reason: relationship !== 'allied' ? 'Only an ally will answer a military aid request.' : !canAfford('military-aid') ? `Needs ${treatyInfluenceCost('military-aid')} influence to request.` : 'An ally can send 12 soldiers for the next front.',
        },
        peace: {
          enabled: relationship === 'war' && canAfford('peace'),
          reason: relationship !== 'war' ? 'Peace terms are only needed while at war.' : !canAfford('peace') ? `Needs ${treatyInfluenceCost('peace')} influence to offer.` : 'Offer three turns of peace to reopen the border.',
        },
      },
    };
  }, [campaign, selectedTarget, selectedTradeRoute, tradeSourceOptions, diplomacyEnabled]);
  const tradeCanEstablish = Boolean(
    campaign &&
    commerceEnabled &&
    selectedTarget &&
    selectedTradeRoute === null &&
    (!diplomacyEnabled || (
      selectedPartner?.offers.trade.enabled === false &&
      (campaign.relationships[selectedTarget.id] === 'trading' || campaign.relationships[selectedTarget.id] === 'allied') &&
      campaign.treaties.some((treaty) => treaty.partnerRegionId === selectedTarget.id && treaty.kind === 'trade')
    )) &&
    tradeSourceOptions.some((source) => source.id === tradeDraftSourceId) &&
    (!diplomacyEnabled || !campaign.embargoes.includes(selectedTarget.id)) &&
    campaign.resources[tradeDraftExport] >= 2 &&
    campaign.gold >= 4,
  );
  const tradeEstablishReason = !selectedTarget
    ? 'Select a neighboring realm first.'
    : !commerceEnabled
      ? 'Commerce & Industry is dormant. Awaken the pack in Campaign systems to charter routes.'
    : selectedTradeRoute
      ? 'A route is already chartered with this partner.'
      : diplomacyEnabled && !selectedPartner?.offers.trade.enabled && !campaign?.treaties.some((treaty) => treaty.partnerRegionId === selectedTarget.id && treaty.kind === 'trade')
        ? 'Propose a trade agreement before chartering a route.'
        : !tradeSourceOptions.length
          ? 'No owned region shares an open border with this realm.'
          : diplomacyEnabled && campaign?.embargoes.includes(selectedTarget.id)
            ? 'Lift the embargo before reopening commerce.'
            : (campaign?.resources[tradeDraftExport] ?? 0) < 2
              ? `The stores need at least 2 ${tradeDraftExport} for a dependable convoy.`
              : (campaign?.gold ?? 0) < 4
                ? 'Keep 4 gold available for the route upkeep.'
                : 'The route is ready to charter.';

  useEffect(() => {
    if (!selectedTarget) {
      setFrontDraftName('');
      setFrontDraftSourceId('');
      setFrontDraftAllocation(0);
      setActiveFrontId(null);
      return;
    }
    const firstSource = frontSourceOptions[0];
    setFrontDraftName(`${selectedTarget.name} Front`);
    setFrontDraftSourceId(firstSource?.id ?? '');
    setFrontDraftAllocation(0);
    setActiveFrontId(selectedTargetFronts[0]?.id ?? null);
    setTradeDraftSourceId(tradeSourceOptions[0]?.id ?? '');
    setTradeDraftExport('grain');
    setTradeDraftImport('salt');
  }, [selectedId]);

  const playFeedbackSound = (tone: FeedbackTone) => {
    if (!soundEnabled || tone === 'general' || typeof window === 'undefined') return;
    const AudioContextConstructor = window.AudioContext
      ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const context = audioContextRef.current ?? new AudioContextConstructor();
    audioContextRef.current = context;
    void context.resume().catch(() => undefined);

    const notes: Record<Exclude<FeedbackTone, 'general'>, number[]> = {
      welcome: [392, 523],
      build: [196, 294, 392],
      upgrade: [261, 329, 392, 523],
      recruit: [196, 247, 294],
      victory: [392, 494, 587, 784],
      harvest: [330, 440, 660],
      error: [146, 110],
    };
    const now = context.currentTime;
    const gap = tone === 'victory' ? 0.1 : 0.075;
    const duration = 0.18;
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(tone === 'error' ? 0.045 : 0.065, now + 0.015);
    master.gain.exponentialRampToValueAtTime(0.0001, now + notes[tone].length * gap + duration);
    master.connect(context.destination);

    notes[tone].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = tone === 'error' ? 'sawtooth' : tone === 'victory' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(frequency, now + index * gap);
      oscillator.connect(master);
      oscillator.start(now + index * gap);
      oscillator.stop(now + index * gap + duration);
    });
  };

  const announce = (text: string, error = false, tone: FeedbackTone = error ? 'error' : 'general') => {
    const id = ++feedbackSequenceRef.current;
    setFeedback({ text, error, tone, id });
    playFeedbackSound(tone);
  };

  const selectRegion = (id: string) => {
    setActiveFrontId(null);
    setSelectedId(id);
  };

  const selectFront = (frontId: string) => {
    const front = frontSummaries.find((candidate) => candidate.id === frontId);
    if (!front) {
      announce('That front is no longer on the border.', true);
      return;
    }
    setActiveFrontId(frontId);
    setSelectedId(front.targetRegionId);
  };

  const selectRoute = (partnerRegionId: string) => {
    setActiveFrontId(null);
    setSelectedId(partnerRegionId);
  };

  const getEventChoiceDisabledReason = (choice: CampaignEventChoice) => {
    if (!campaign) return 'Start a chronicle before answering an event.';
    const costs: Record<string, number> = {
      'border-reinforce': 8,
      'scouting-welcome': 8,
      'trade-escort': 6,
      'diplomacy-assurances': 12,
      'readiness-drill': 10,
      'settlement-fair': 10,
    };
    const cost = costs[choice.id] ?? 0;
    return cost > campaign.gold ? `Needs ${cost} gold; the treasury has ${campaign.gold}.` : undefined;
  };

  const chooseCampaignEvent = (choiceId: string) => {
    if (!guardCampaignActive(campaign) || !campaign.activeEvent) return;
    const event = campaign.activeEvent;
    const choice = event.choices.find((candidate) => candidate.id === choiceId);
    if (!choice) return announce('That event response is no longer available.', true);
    const disabledReason = getEventChoiceDisabledReason(choice);
    if (disabledReason) return announce(disabledReason, true);

    updateCampaign((current) => {
      if (!current.activeEvent || current.activeEvent.id !== event.id) return current;
      let goldDelta = 0;
      let foodDelta = 0;
      let reputationDelta = 0;
      let influenceDelta = 0;
      let forceDelta = 0;
      let subjectForceDelta = 0;
      let relationshipUpdate: RelationshipState | undefined;
      let routeRiskDelta = 0;
      let outcome = `${event.title}: ${choice.label}.`;

      switch (choice.id) {
        case 'harvest-granary':
          foodDelta = 16;
          outcome = `${event.title}: the granaries opened and the realm gained 16 food for the peaceful season.`;
          break;
        case 'harvest-treasury':
          goldDelta = 12;
          foodDelta = -4;
          outcome = `${event.title}: the surplus was reserved, adding 12 gold while 4 food went to the winter stores.`;
          break;
        case 'settlement-fair':
          goldDelta = -10;
          reputationDelta = 3;
          outcome = `${event.title}: a market fair cost 10 gold and earned 3 reputation with the settlement.`;
          break;
        case 'settlement-stores':
          foodDelta = 12;
          outcome = `${event.title}: the settlement filled its stores, adding 12 food without spending the treasury.`;
          break;
        case 'border-scouts':
          reputationDelta = 3;
          outcome = `${event.title}: scouts mapped the watchfires and the crown gained 3 reputation without opening a war.`;
          break;
        case 'border-reinforce':
          goldDelta = -8;
          forceDelta = 6;
          subjectForceDelta = 6;
          outcome = `${event.title}: 8 gold funded the watch, adding 6 soldiers to ${event.subjectName ?? 'the nearest border'}.`;
          break;
        case 'scouting-welcome':
          goldDelta = -8;
          reputationDelta = 3;
          relationshipUpdate = 'friendly';
          outcome = `${event.title}: 8 gold welcomed the wayfinders, earning 3 reputation and a warmer channel.`;
          break;
        case 'scouting-map':
          goldDelta = 5;
          outcome = `${event.title}: the patrol kept the route map and recovered 5 gold through safer movement.`;
          break;
        case 'trade-escort':
          goldDelta = -1;
          routeRiskDelta = -8;
          outcome = `${event.title}: the escort cost 6 gold, protected the charter, and returned 5 gold in secured cargo.`;
          break;
        case 'trade-margin':
          goldDelta = 8;
          outcome = `${event.title}: the crown kept the margin and received 8 gold from the current delivery.`;
          break;
        case 'diplomacy-assurances':
          goldDelta = -12;
          influenceDelta = 5;
          reputationDelta = 1;
          relationshipUpdate = 'friendly';
          outcome = `${event.title}: 12 gold bought a patient answer, adding 5 influence and improving the channel.`;
          break;
        case 'diplomacy-stand':
          reputationDelta = 2;
          outcome = `${event.title}: the court stood firmly and gained 2 reputation without spending gold.`;
          break;
        case 'readiness-drill':
          goldDelta = -10;
          forceDelta = 8;
          subjectForceDelta = 8;
          outcome = `${event.title}: 10 gold funded a drill, adding 8 soldiers at ${event.subjectName ?? 'the garrison'}.`;
          break;
        case 'readiness-reserve':
          goldDelta = 6;
          outcome = `${event.title}: careful provisioning returned 6 gold to the reserve.`;
          break;
      }

      const nextResources = { ...current.resources };
      if (current.expansions.commerce) {
        nextResources.grain = Math.max(0, nextResources.grain + foodDelta);
      }
      const nextRegions = current.regions.map((region) =>
        region.id === current.activeEvent?.subjectRegionId && subjectForceDelta
          ? { ...region, forces: region.forces + subjectForceDelta }
          : region,
      );
      const nextRelationships = relationshipUpdate && current.expansions.diplomacy && current.activeEvent.subjectRegionId
        ? { ...current.relationships, [current.activeEvent.subjectRegionId]: relationshipUpdate }
        : current.relationships;
      const nextRoutes = routeRiskDelta
        ? current.tradeRoutes.map((route) =>
          route.partnerRegionId === current.activeEvent?.subjectRegionId
            ? { ...route, risk: Math.max(0, Math.min(100, route.risk + routeRiskDelta)), status: 'active' as const }
            : route,
        )
        : current.tradeRoutes;
      const nextTurnSummary = current.lastTurnSummary
        ? {
          ...current.lastTurnSummary,
          headline: `${event.title} resolved`,
          items: [...current.lastTurnSummary.items, `Event choice: ${outcome}`].slice(0, 8),
        }
        : undefined;

      return {
        ...current,
        gold: Math.max(0, current.gold + goldDelta),
        food: current.expansions.commerce ? nextResources.grain : Math.max(0, current.food + foodDelta),
        resources: nextResources,
        forces: Math.max(0, current.forces + forceDelta),
        regions: nextRegions,
        relationships: nextRelationships,
        tradeRoutes: nextRoutes,
        reputation: Math.max(0, Math.min(100, current.reputation + reputationDelta)),
        diplomacy: {
          ...current.diplomacy,
          influence: Math.max(0, Math.min(100, current.diplomacy.influence + influenceDelta)),
        },
        activeEvent: undefined,
        lastTurnSummary: nextTurnSummary,
        log: [outcome, ...current.log],
      };
    });
    announce(
      `${choice.label}: ${event.subjectName ? `${event.subjectName} responds. ` : ''}${choice.description}`,
      false,
      event.category === 'harvest' ? 'harvest' : 'general',
    );
  };

  const startCampaign = () => {
    const next = makeNewCampaign(nationName, banners[bannerIndex], newExpansions, nationArchetypeId, emblemId);
    setCampaign(next);
    setSelectedId('aurelian');
    announce(`${next.nation} enters the chronicle.`, false, 'welcome');
  };

  const restartCampaign = () => {
    if (!window.confirm('Restart this campaign? Your current chronicle will be erased.')) return;
    localStorage.removeItem('openkingdoms-campaign');
    setCampaign(null);
    setNationName('');
    setNationArchetypeId(DEFAULT_NATION_ARCHETYPE_ID);
    setEmblemId(DEFAULT_EMBLEM_ID);
    setSelectedId('aurelian');
    announce('The map has been cleared.');
  };

  const updateCampaign = (transform: (current: Campaign) => Campaign) => {
    setCampaign((current) => (current ? transform(current) : current));
  };

  const guardCampaignActive = (current: Campaign | null): current is Campaign => {
    if (!current) return false;
    if (current.status === 'victory') {
      announce('This chronicle is complete. Review the kingdom or begin a new chronicle when you are ready.', false, 'victory');
      return false;
    }
    return true;
  };

  const updateExpansionSelection = (selection: ExpansionSelection) => {
    if (!guardCampaignActive(campaign)) return;
    const previous = campaign.expansions;
    updateCampaign((current) => ({ ...current, expansions: { ...selection } }));
    const changed = Object.keys(selection).filter((id) => previous[id as keyof ExpansionSelection] !== selection[id as keyof ExpansionSelection]);
    if (changed.length) {
      const enabled = changed.filter((id) => selection[id as keyof ExpansionSelection]).map((id) => id === 'diplomacy' ? 'Diplomacy' : 'Commerce');
      const disabled = changed.filter((id) => !selection[id as keyof ExpansionSelection]).map((id) => id === 'diplomacy' ? 'Diplomacy' : 'Commerce');
      announce(
        `${enabled.length ? `${enabled.join(' and ')} awakened` : ''}${enabled.length && disabled.length ? '; ' : ''}${disabled.length ? `${disabled.join(' and ')} dormant` : ''}. Existing chronicles remain preserved.`,
        false,
        'general',
      );
    }
  };

  const updateDiplomaticPosture = (posture: DiplomaticPosture) => {
    if (!guardCampaignActive(campaign) || !diplomacyEnabled || campaign.diplomacy.posture === posture) return;
    updateCampaign((current) => ({
      ...current,
      diplomacy: { ...current.diplomacy, posture },
      log: [`Court posture set to ${postureLabel(posture)}.`, ...current.log],
    }));
    announce(`${postureLabel(posture)} posture adopted. ${postureDescription(posture)}`, false, 'general');
  };
  const createFront = () => {
    if (!guardCampaignActive(campaign) || !selectedTarget) return;
    const source = regionById(campaign.regions, frontDraftSourceId);
    if (!source || source.kind !== 'player' || !source.adjacent.includes(selectedTarget.id)) {
      return announce('Choose a neighboring region under your crown.', true);
    }
    const id = `front-${source.id}-${selectedTarget.id}`;
    if (campaign.fronts.some((front) => front.id === id)) {
      return announce('That border already has a front. Select it to adjust its order.', true);
    }
    const committedForces = Math.max(
      0,
      Math.min(source.forces, Math.floor(Number.isFinite(frontDraftAllocation) ? frontDraftAllocation : 0)),
    );
    const name = frontDraftName.trim().slice(0, 48) || `${selectedTarget.name} Front`;
    const travelTurns = frontTravelDuration(source, selectedTarget);
    updateCampaign((current) => ({
      ...current,
      regions: current.regions.map((region) =>
        region.id === source.id
          ? { ...region, forces: region.forces - committedForces }
          : region,
      ),
      fronts: [
        ...current.fronts,
        {
          id,
          name,
          sourceRegionId: source.id,
          targetRegionId: selectedTarget.id,
          committedForces,
            travelTurns,
          status: 'staged',
        },
      ],
      log: [`${name} established with ${committedForces} soldiers staged.`, ...current.log],
    }));
    setActiveFrontId(id);
    announce(
      committedForces
        ? `${name} established. ${committedForces} soldiers are staged; arrival in ${travelTurns} turn${travelTurns === 1 ? '' : 's'}.`
        : `${name} established. Stage soldiers when the army is ready.`,
      false,
      'build',
    );
  };

  const updateFrontAllocation = (frontId: string, desiredForces: number) => {
    if (!guardCampaignActive(campaign)) return;
    let nextCommitted = 0;
    let changed = false;
    updateCampaign((current) => {
      const front = current.fronts.find((candidate) => candidate.id === frontId);
      if (!front) return current;
      const source = regionById(current.regions, front.sourceRegionId);
      if (!source || source.kind !== 'player') return current;
      const requested = Number.isFinite(desiredForces) ? Math.floor(desiredForces) : 0;
      const next = Math.max(0, Math.min(source.forces + front.committedForces, requested));
      const delta = next - front.committedForces;
      nextCommitted = next;
      changed = delta !== 0;
      if (!delta) return current;
      return {
        ...current,
        regions: current.regions.map((region) =>
          region.id === source.id ? { ...region, forces: region.forces - delta } : region,
        ),
        fronts: current.fronts.map((candidate) =>
          candidate.id === frontId ? { ...candidate, committedForces: next } : candidate,
        ),
      };
    });
    if (!changed && desiredForces < 0) announce('A front cannot commit a negative number of soldiers.', true);
    if (changed) setActiveFrontId(frontId);
  };

  const recallFront = (frontId: string) => {
    if (!guardCampaignActive(campaign)) return;
    updateCampaign((current) => {
      const front = current.fronts.find((candidate) => candidate.id === frontId);
      if (!front || front.committedForces <= 0) return current;
      const source = regionById(current.regions, front.sourceRegionId);
      const target = regionById(current.regions, front.targetRegionId);
      return {
        ...current,
        regions: current.regions.map((region) =>
          region.id === front.sourceRegionId
            ? { ...region, forces: region.forces + front.committedForces }
            : region,
        ),
        fronts: current.fronts.map((candidate) =>
           candidate.id === frontId
             ? {
               ...candidate,
               committedForces: 0,
               status: 'staged',
               travelTurns: source && target
                 ? frontTravelDuration(source, target)
                 : Math.max(1, candidate.travelTurns),
             }
             : candidate,
        ),
        log: [`Forces recalled from ${front.name}.`, ...current.log],
      };
    });
    announce('The staged forces have returned to their source region and the order is back in staging.', false, 'general');
  };

  const cancelFront = (frontId: string) => {
    if (!guardCampaignActive(campaign)) return;
    const front = campaign?.fronts.find((candidate) => candidate.id === frontId);
    if (!front) return;
    updateCampaign((current) => ({
      ...current,
      regions: current.regions.map((region) =>
        region.id === front.sourceRegionId
          ? { ...region, forces: region.forces + front.committedForces }
          : region,
      ),
      fronts: current.fronts.filter((candidate) => candidate.id !== frontId),
      log: [`${front.name} was cancelled; soldiers returned to ${regionById(current.regions, front.sourceRegionId)?.name ?? 'the border'}.`, ...current.log],
    }));
    setActiveFrontId(null);
    announce(`${front.name} cancelled. Its soldiers are back on defense.`, false, 'general');
  };

  const selectedPartnerId = selectedTarget?.id;

  const sendEnvoy = () => {
    if (!guardCampaignActive(campaign) || !diplomacyEnabled || !selectedPartnerId) return;
    const cooldown = campaign.diplomacy.envoyCooldowns[selectedPartnerId] ?? 0;
    if (cooldown > 0) return announce(`The envoy office needs ${cooldown} more turn${cooldown === 1 ? '' : 's'} before it can return.`, true);
    const influenceCost = campaign.diplomacy.posture === 'assertive' ? 8 : 5;
    if (campaign.gold < 20) return announce('The treasury cannot fund another envoy yet.', true);
    if (campaign.diplomacy.influence < influenceCost) return announce(`The court needs ${influenceCost} influence to send this envoy.`, true);
    const response = resolveDiplomaticResponse(campaign, selectedPartnerId, 'envoy');
    updateCampaign((current) => ({
      ...current,
      gold: current.gold - 20,
      reputation: response.accepted ? Math.min(100, current.reputation + 2) : current.reputation,
      diplomacy: {
        ...current.diplomacy,
        influence: Math.max(0, current.diplomacy.influence - influenceCost + (current.diplomacy.posture === 'conciliatory' ? 4 : 0)),
        envoyCooldowns: { ...current.diplomacy.envoyCooldowns, [selectedPartnerId]: 3 },
      },
      relationships: response.accepted
        ? { ...current.relationships, [selectedPartnerId]: 'friendly' }
        : current.relationships,
      log: [response.message, ...current.log],
    }));
    announce(response.message, !response.accepted, response.accepted ? 'general' : 'error');
  };

  const proposeTreaty = (kind: TreatyKind) => {
    if (!guardCampaignActive(campaign) || !diplomacyEnabled || !selectedPartnerId || !selectedPartner) return;
    const offer = kind === 'trade'
      ? selectedPartner.offers.trade
      : kind === 'non-aggression'
        ? selectedPartner.offers.nonAggression
        : kind === 'defensive-alliance'
          ? selectedPartner.offers.alliance
          : kind === 'military-aid'
            ? selectedPartner.offers.militaryAid
            : selectedPartner.offers.peace;
    if (!offer.enabled) return announce(offer.reason, true);
    const influenceCost = treatyInfluenceCost(kind);
    if (campaign.diplomacy.influence < influenceCost) return announce(`The court needs ${influenceCost} influence to make this proposal.`, true);
    const response = resolveDiplomaticResponse(campaign, selectedPartnerId, kind);
    if (!response.accepted) {
      updateCampaign((current) => ({
        ...current,
        diplomacy: { ...current.diplomacy, influence: Math.max(0, current.diplomacy.influence - influenceCost) },
        log: [response.message, ...current.log],
      }));
      announce(response.message, true, 'error');
      return;
    }
    updateCampaign((current) => ({
      ...current,
      diplomacy: { ...current.diplomacy, influence: Math.max(0, current.diplomacy.influence - influenceCost) },
      relationships: {
        ...current.relationships,
        [selectedPartnerId]: kind === 'defensive-alliance' ? 'allied' : kind === 'trade' ? 'trading' : kind === 'peace' ? 'friendly' : current.relationships[selectedPartnerId] ?? 'friendly',
      },
      treaties: [
        ...current.treaties,
        {
          id: `${kind}-${selectedPartnerId}-${current.turn}-${current.treaties.length}`,
          partnerRegionId: selectedPartnerId,
          kind,
          startedTurn: current.turn,
          duration: treatyDuration(kind),
        },
      ],
      militaryAid: kind === 'military-aid' ? current.militaryAid + 12 : current.militaryAid,
      log: [response.message, ...current.log],
    }));
    announce(response.message, false, kind === 'defensive-alliance' ? 'victory' : 'general');
  };

  const toggleEmbargo = () => {
    if (!guardCampaignActive(campaign) || !diplomacyEnabled || !selectedPartnerId) return;
    const partnerName = regionById(campaign.regions, selectedPartnerId)?.name ?? 'the neighboring court';
    const imposing = !campaign.embargoes.includes(selectedPartnerId);
    updateCampaign((current) => ({
      ...current,
      embargoes: imposing
        ? [...current.embargoes, selectedPartnerId]
        : current.embargoes.filter((id) => id !== selectedPartnerId),
      relationships: imposing
        ? { ...current.relationships, [selectedPartnerId]: 'hostile' }
        : current.relationships,
      log: [`${imposing ? 'Embargo imposed on' : 'Embargo lifted from'} ${partnerName}.`, ...current.log],
    }));
    announce(imposing ? `Trade with ${partnerName} is embargoed.` : `The embargo on ${partnerName} has been lifted.`, imposing, 'general');
  };

  const breakTreaty = (treatyId: string) => {
    if (!guardCampaignActive(campaign) || !diplomacyEnabled) return;
    const treaty = campaign.treaties.find((candidate) => candidate.id === treatyId);
    if (!treaty) return;
    const partnerName = regionById(campaign.regions, treaty.partnerRegionId)?.name ?? 'the neighboring court';
    const reputationCost = treaty.kind === 'defensive-alliance' ? 18 : treaty.kind === 'non-aggression' ? 14 : 10;
    updateCampaign((current) => ({
      ...current,
      reputation: Math.max(0, current.reputation - reputationCost),
      relationships: { ...current.relationships, [treaty.partnerRegionId]: 'hostile' },
      treaties: current.treaties.filter((candidate) => candidate.id !== treatyId),
      tradeRoutes: treaty.kind === 'trade'
        ? current.tradeRoutes.filter((route) => route.partnerRegionId !== treaty.partnerRegionId)
        : current.tradeRoutes,
      log: [`${treatyLabel(treaty.kind)} with ${partnerName} broken; reputation fell ${reputationCost}.`, ...current.log],
    }));
    announce(`Treaty broken. Reputation fell ${reputationCost}; ${partnerName} is now hostile.`, true);
  };

  const establishTradeRoute = () => {
    if (!guardCampaignActive(campaign) || !commerceEnabled || !selectedTarget || !tradeCanEstablish) return announce(tradeEstablishReason, true);
    const source = regionById(campaign.regions, tradeDraftSourceId);
    if (!source) return announce('Choose a valid source region for the convoy.', true);
    const partnerName = selectedTarget.name;
    const route: TradeRoute = {
      id: `route-${source.id}-${selectedTarget.id}`,
      sourceRegionId: source.id,
      partnerRegionId: selectedTarget.id,
      exportResource: tradeDraftExport,
      importResource: tradeDraftImport,
        income: 16 + (source.settlement === 'City' ? 8 : source.settlement === 'Town' ? 4 : 0) + activeArchetype.modifiers.tradeIncomeBonus,
      upkeep: 4,
      remainingTurns: 6,
      risk: source.barracks ? 14 : 22,
      status: 'active',
    };
    updateCampaign((current) => ({
      ...current,
      tradeRoutes: [...current.tradeRoutes, route],
      log: [`Trade route opened from ${source.name} to ${partnerName}.`, ...current.log],
    }));
    announce(`The convoy now runs to ${partnerName}. Its first return comes next turn.`, false, 'harvest');
  };

  const cancelTradeRoute = () => {
    if (!guardCampaignActive(campaign) || !selectedPartnerId) return;
    updateCampaign((current) => ({
      ...current,
      tradeRoutes: current.tradeRoutes.filter((route) => route.partnerRegionId !== selectedPartnerId),
      log: [`Trade route to ${regionById(current.regions, selectedPartnerId)?.name ?? 'the partner'} cancelled.`, ...current.log],
    }));
    announce('The convoy was recalled and its charter closed.', false, 'general');
  };

  const renewTradeRoute = () => {
    if (!guardCampaignActive(campaign) || !selectedPartnerId) return;
    const route = campaign.tradeRoutes.find((candidate) => candidate.partnerRegionId === selectedPartnerId);
    if (!route) return;
    const condition = routeCondition(campaign, route);
    if (condition.status === 'embargoed' || condition.status === 'blocked' || condition.status === 'disrupted') {
      return announce(condition.reason, true);
    }
    if (campaign.gold < route.upkeep) return announce(`Keep ${route.upkeep} gold available to renew this charter.`, true);
    updateCampaign((current) => ({
      ...current,
      gold: current.gold - route.upkeep,
      tradeRoutes: current.tradeRoutes.map((candidate) => candidate.id === route.id ? { ...candidate, remainingTurns: 6, status: 'active' } : candidate),
      log: [`Trade route to ${regionById(current.regions, selectedPartnerId)?.name ?? 'the partner'} renewed for six turns.`, ...current.log],
    }));
    announce('The trade charter was renewed.', false, 'general');
  };

  const buildBarracks = () => {
    if (!guardCampaignActive(campaign) || !selected || selected.kind !== 'player') return;
    if (selected.barracks) return announce('A barracks already stands here.', true);
    if (campaign.gold < 80) return announce('The treasury cannot fund this construction yet.', true);
    updateCampaign((current) => ({
      ...current,
      gold: current.gold - 80,
      regions: current.regions.map((region) =>
        region.id === selected.id ? { ...region, barracks: true } : region,
      ),
      log: [`Barracks raised at ${selected.name}.`, ...current.log],
    }));
    announce(`Barracks raised at ${selected.name}. Your levy grows stronger.`, false, 'build');
  };

  const upgradeSettlement = () => {
    if (!guardCampaignActive(campaign) || !selected || selected.kind !== 'player') return;
    const nextSettlement: Record<Settlement, Settlement> = { Village: 'Town', Town: 'City', City: 'City' };
    const cost = settlementCharterCost(selected.settlement, campaign.archetypeId);
    if (selected.settlement === 'City') return announce('A city is the highest form of settlement.', true);
    if (campaign.gold < cost) return announce(`You need ${cost} gold to fund this charter.`, true);
    updateCampaign((current) => ({
      ...current,
      gold: current.gold - cost,
      regions: current.regions.map((region) =>
        region.id === selected.id
          ? { ...region, settlement: nextSettlement[region.settlement] }
          : region,
      ),
      log: [`${selected.name} chartered as a ${nextSettlement[selected.settlement]}.`, ...current.log],
    }));
    announce(`${selected.name} is now a ${nextSettlement[selected.settlement]}.`, false, 'upgrade');
  };

  const upgradeStronghold = () => {
    if (!guardCampaignActive(campaign) || !selected || selected.kind !== 'player') return;
    const level = normalizeStrongholdLevel(selected.strongholdLevel);
    const next = getNextStrongholdTier(level);
    if (!next) return announce('This county has reached the Citadel tier.', true);
    if (campaign.gold < next.cost) return announce(`You need ${next.cost} gold to raise the ${next.shortName.toLowerCase()}.`, true);
    updateCampaign((current) => ({
      ...current,
      gold: current.gold - next.cost,
      regions: current.regions.map((region) =>
        region.id === selected.id ? { ...region, strongholdLevel: next.level } : region,
      ),
      lastTurnSummary: {
        turn: current.turn,
        headline: `${selected.name} raised a ${next.shortName}.`,
        items: [
          `Stronghold: ${selected.name} advanced to ${next.name}.`,
          `Defense: +${next.defense} defending strength · recovery +${next.recovery} · recruitment +${next.recruitment}.`,
          `Treasury: −${next.cost} gold for the county works.`,
        ],
      },
      log: [`${selected.name} raised a ${next.name}; its county defenses gained ${next.defense}.`, ...current.log],
    }));
    announce(`${selected.name} raised a ${next.name}. The county can now hold the line longer.`, false, 'build');
  };

  const recruitForces = () => {
    if (!guardCampaignActive(campaign) || !selected || selected.kind !== 'player') return;
    const cost = 25;
    if (campaign.gold < cost || campaign.food < 10 || (commerceEnabled && campaign.resources.grain < 10)) return announce('Not enough gold or grain to call a new levy.', true);
    const stronghold = getStrongholdTier(selected.strongholdLevel);
    const bonus = (selected.barracks ? 16 : 10) + activeArchetype.modifiers.recruitmentBonus + stronghold.recruitment;
    updateCampaign((current) => ({
      ...current,
      gold: current.gold - cost,
      food: current.food - 10,
      resources: commerceEnabled ? { ...current.resources, grain: current.resources.grain - 10 } : current.resources,
      forces: current.forces + bonus,
      regions: current.regions.map((region) =>
        region.id === selected.id ? { ...region, forces: region.forces + bonus } : region,
      ),
      log: [`${bonus} forces recruited at ${selected.name}.`, ...current.log],
    }));
    announce(`${bonus} new forces answer the call at ${selected.name}.`, false, 'recruit');
  };

  const attackFront = (frontId: string) => {
    if (!guardCampaignActive(campaign)) return;
    const front = campaign?.fronts.find((candidate) => candidate.id === frontId);
    if (!campaign || !front || !front.committedForces) {
      return announce('Stage soldiers at a front before committing an attack.', true);
    }
    if (front.status !== 'arrived') {
      return announce(
        front.status === 'staged'
          ? `The ${front.name} order is staged. Advance the turn to begin its march.`
          : `The ${front.name} army is marching. It needs ${front.travelTurns} more turn${front.travelTurns === 1 ? '' : 's'} before it can attack.`,
        true,
      );
    }
    const source = regionById(campaign.regions, front.sourceRegionId);
    const target = regionById(campaign.regions, front.targetRegionId);
    if (!source || !target || source.kind !== 'player' || target.kind === 'player') {
      return announce('This front no longer has a valid border.', true);
    }
    const protectedTreaty = diplomacyEnabled && campaign.treaties.find((treaty) =>
      treaty.partnerRegionId === target.id &&
      (treaty.kind === 'non-aggression' || treaty.kind === 'defensive-alliance' || treaty.kind === 'peace') &&
      treaty.startedTurn + treaty.duration > campaign.turn,
    );
    if (protectedTreaty) {
      const message = `This attack is blocked by an active ${treatyLabel(protectedTreaty.kind).toLowerCase()}.`;
      updateCampaign((current) => ({
        ...current,
         log: [message, ...current.log],
      }));
      return announce(message, true);
    }
    const supportingForces = diplomacyEnabled && campaign.militaryAid > 0 && campaign.treaties.some((treaty) =>
      treaty.partnerRegionId !== target.id &&
      treaty.kind === 'defensive-alliance' &&
      treaty.startedTurn + treaty.duration > campaign.turn &&
      hasSharedBorder(campaign.regions, treaty.partnerRegionId, target.id),
    ) ? Math.min(12, campaign.militaryAid) : 0;
    const attackStrength = front.committedForces + supportingForces;
    const targetStronghold = getStrongholdTier(target.strongholdLevel);
    const sourceStronghold = getStrongholdTier(source.strongholdLevel);
    const defenderStrength = target.forces + targetStronghold.defense;
    const won = attackStrength > defenderStrength;
    const casualties = won
      ? Math.min(front.committedForces - 1, Math.ceil(defenderStrength * .42))
      : Math.max(0, front.committedForces - Math.floor(front.committedForces / 3) - sourceStronghold.recovery);
    const survivors = front.committedForces - casualties;
    const retreating = won ? 0 : front.committedForces - casualties;
    const victoryReached = won &&
      campaign.status === 'active' &&
      campaign.regions.filter((region) => region.kind === 'player').length + 1 >= KINGDOM_GOAL;

    updateCampaign((current) => ({
      ...current,
      status: victoryReached ? 'victory' : current.status,
      victoryTurn: victoryReached ? current.turn : current.victoryTurn,
      forces: Math.max(0, current.forces - casualties),
      militaryAid: supportingForces ? Math.max(0, current.militaryAid - supportingForces) : current.militaryAid,
       relationships: diplomacyEnabled
         ? won
           ? Object.fromEntries(Object.entries(current.relationships).filter(([regionId]) => regionId !== target.id))
           : { ...current.relationships, [target.id]: 'war' }
         : current.relationships,
       treaties: diplomacyEnabled && won
         ? current.treaties.filter((treaty) => treaty.partnerRegionId !== target.id)
         : current.treaties,
       tradeRoutes: commerceEnabled && won
         ? current.tradeRoutes.filter((route) => route.partnerRegionId !== target.id)
         : current.tradeRoutes,
      regions: current.regions.flatMap((region) => {
        if (region.id === front.targetRegionId && won) {
          return [{
            ...region,
            kind: 'player' as const,
            forces: Math.max(1, survivors),
            settlement: 'Village' as const,
            barracks: false,
          }];
        }
        if (region.id === front.sourceRegionId && !won) {
          return [{ ...region, forces: region.forces + retreating }];
        }
        return [region];
      }),
      fronts: current.fronts.filter((candidate) => candidate.id !== frontId),
       lastTurnSummary: {
         turn: current.turn,
         headline: won ? `The border changed at ${target.name}.` : `${target.name} held the border.`,
         items: [
           `Territory: ${target.name} · ${won ? 'rival claim → your crown' : 'rival claim retained'}.`,
           `Army: ${casualties} losses · ${won ? `${survivors} survivors now hold the province` : `${retreating} soldiers returned to ${source.name}`}.`,
            `Strength: ${attackStrength} attacking${supportingForces ? ` including ${supportingForces} ally support` : ''} vs ${defenderStrength} defending.`,
            `Fortification: ${targetStronghold.name}${targetStronghold.defense ? ` added +${targetStronghold.defense} defense` : ' offered no additional defense'}.`,
           won
             ? `New choice: ${target.name} is a Village without barracks; secure it before pressing another border.`
             : `Recovery: reinforce ${source.name}, recruit again, or revise another front before the next attack.`,
         ],
       },
      log: [
        victoryReached
          ? `Victory at ${target.name}; the first kingdom is founded on turn ${current.turn}.`
          : won
            ? `Victory at ${target.name}; ${survivors} soldiers hold the new border.`
          : `${target.name} repelled the attack${supportingForces ? ` with ${supportingForces} ally support committed` : ''}; ${retreating} soldiers returned to ${source.name}.`,
        ...current.log,
       ],
    }));
    setActiveFrontId(null);
    if (won) {
      announce(
        victoryReached
          ? `The first kingdom is founded. ${target.name} now bears your standard, and this chronicle is complete.`
          : `Victory. ${target.name} now bears your standard.`,
        false,
        'victory',
      );
    } else {
      announce(`${target.name} held the line. ${retreating} soldiers retreated.`, true, 'error');
    }
  };

  const advanceTurn = () => {
    if (!guardCampaignActive(campaign)) return;
    if (campaign.activeEvent) {
      return announce('Resolve the event at the event desk before advancing another turn.', true);
    }
    const nextTurn = campaign.turn + 1;
    const archetype = getNationArchetype(campaign.archetypeId);
    const currentEconomy = commerceEnabled ? realmEconomy(campaign.regions) : { production: emptyLedger(), consumption: emptyLedger() };
    const nextResources = { ...campaign.resources };
    if (commerceEnabled) {
      RESOURCE_TYPES.forEach((resource) => {
        nextResources[resource] = Math.max(0, nextResources[resource] + currentEconomy.production[resource] - currentEconomy.consumption[resource]);
      });
    }
    let routeIncome = 0;
    let routeUpkeep = 0;
    let activeRoutes = 0;
    const nextRoutes = commerceEnabled
      ? campaign.tradeRoutes.map((route) => {
        const condition = routeCondition(campaign, route);
        if (condition.status === 'active') {
          activeRoutes += 1;
          routeIncome += route.income;
          routeUpkeep += route.upkeep;
          nextResources[route.exportResource] = Math.max(0, nextResources[route.exportResource] - 2);
          nextResources[route.importResource] += 3;
        }
        return {
          ...route,
          remainingTurns: Math.max(0, route.remainingTurns - 1),
          status: condition.status === 'active' && route.remainingTurns <= 1 ? 'expired' : condition.status,
        };
      })
      : campaign.tradeRoutes;
    let nextRegions = campaign.regions;
    const frontNotices: string[] = [];
    const nextFronts = campaign.fronts.flatMap((front) => {
      const source = regionById(campaign.regions, front.sourceRegionId);
      const target = regionById(campaign.regions, front.targetRegionId);
      const returnCommittedForces = () => {
        if (!source || source.kind !== 'player' || front.committedForces <= 0) return;
        nextRegions = nextRegions.map((region) =>
          region.id === source.id
            ? { ...region, forces: region.forces + front.committedForces }
            : region,
        );
      };
      if (
        !source ||
        !target ||
        source.kind !== 'player' ||
        target.kind === 'player' ||
        !source.adjacent.includes(target.id) ||
        !target.adjacent.includes(source.id)
      ) {
        returnCommittedForces();
        frontNotices.push(
          `${front.name} was resolved without combat because its border is no longer valid; committed soldiers returned where possible.`,
        );
        return [];
      }
      if (front.committedForces <= 0) {
        frontNotices.push(`${front.name} was resolved without combat because no soldiers remained committed.`);
        return [];
      }
      if (front.status === 'arrived') return [front];

      const travelTurns = Math.max(0, front.travelTurns - 1);
      const status: FrontStatus = travelTurns === 0 ? 'arrived' : 'marching';
      frontNotices.push(
        status === 'arrived'
          ? `${front.name} arrived at ${target.name}; the attack order is now available.`
          : `${front.name} is marching toward ${target.name}; ${travelTurns} turn${travelTurns === 1 ? '' : 's'} remain.`,
      );
      return [{ ...front, travelTurns, status }];
    });
    const nextShortages = RESOURCE_TYPES.filter((resource) => nextResources[resource] < currentEconomy.consumption[resource]);
    const expiredTreaties = diplomacyEnabled
      ? campaign.treaties.filter((treaty) => treaty.startedTurn + treaty.duration <= nextTurn)
      : [];
    const treatyExpiryNotices = expiredTreaties.map((treaty) => {
      const partnerName = regionById(campaign.regions, treaty.partnerRegionId)?.name ?? 'the neighboring court';
      return `${treatyLabel(treaty.kind)} with ${partnerName} expired on turn ${nextTurn}.`;
    });
    const nextTreaties = diplomacyEnabled
      ? campaign.treaties.filter((treaty) => treaty.startedTurn + treaty.duration > nextTurn)
      : campaign.treaties;
    const rivalTurn = resolveRivalTurn({
      regions: nextRegions,
      fronts: nextFronts,
      relationships: campaign.relationships,
      treaties: nextTreaties,
      tradeRoutes: nextRoutes,
      embargoes: campaign.embargoes,
      diplomacy: campaign.diplomacy,
      turn: nextTurn,
      diplomacyEnabled,
      commerceEnabled,
    });
    nextRegions = rivalTurn.regions;
    const turnNotices = [...rivalTurn.notices, ...frontNotices];
    const event = makeCampaignEvent(campaign, nextTurn, nextRegions, nextFronts, nextRoutes);
    const expiredRoutes = nextRoutes.filter((route) => route.status === 'expired').length;
    const income = campaign.regions.filter((region) => region.kind === 'player').length * (24 + archetype.modifiers.turnGoldBonus);
    const goldDelta = income + routeIncome - routeUpkeep;
    const nextFood = commerceEnabled
      ? nextResources.grain
      : campaign.food + campaign.regions.filter((region) => region.kind === 'player').length * 8;
    const turnSummary: TurnSummary = {
      turn: nextTurn,
      headline: turnNotices.length ? 'The border answers your orders.' : 'A quiet turn across the realm.',
      items: [
        `Treasury: ${goldDelta >= 0 ? '+' : ''}${goldDelta} gold${commerceEnabled ? ` · ${activeRoutes} active route${activeRoutes === 1 ? '' : 's'}` : ''}.`,
        commerceEnabled
          ? `Stores: ${nextResources.grain - campaign.resources.grain >= 0 ? '+' : ''}${nextResources.grain - campaign.resources.grain} grain${nextShortages.length ? ` · shortage in ${nextShortages.join(', ')}` : ' · no shortages'}.`
          : `Granary: +${nextFood - campaign.food} food from the provinces.`,
        frontNotices.length ? `Army movements: ${frontNotices.join(' ')}` : 'Army movements: no fronts changed position.',
        rivalTurn.notices.length ? `Rival activity: ${rivalTurn.notices.join(' ')}` : 'Rival activity: no visible border action.',
        expiredTreaties.length
          ? `Court: ${treatyExpiryNotices.join(' ')}`
          : diplomacyEnabled
            ? 'Court: influence rose by 1 and active obligations held.'
            : 'Court: diplomacy is dormant; borders remain unpledged.',
        expiredRoutes
          ? `Routes: ${expiredRoutes} trade charter${expiredRoutes === 1 ? '' : 's'} expired.`
          : commerceEnabled
            ? 'Routes: active charters delivered their scheduled goods.'
            : 'Routes: commerce is dormant; no convoys moved.',
        `Event: ${event.title}. ${event.prompt}`,
      ],
    };
    updateCampaign((current) => ({
      ...current,
      turn: nextTurn,
      gold: Math.max(0, current.gold + goldDelta),
      food: nextFood,
      resources: nextResources,
      tradeRoutes: nextRoutes,
      regions: nextRegions,
      fronts: nextFronts,
      treaties: nextTreaties,
      lastTurnSummary: turnSummary,
      activeEvent: event,
      diplomacy: diplomacyEnabled
        ? {
          ...current.diplomacy,
          influence: Math.min(100, current.diplomacy.influence + 1 + archetype.modifiers.influencePerTurn),
          envoyCooldowns: Object.fromEntries(
            Object.entries(current.diplomacy.envoyCooldowns)
              .map(([id, turns]) => [id, turns - 1])
              .filter(([, turns]) => typeof turns === 'number' && turns > 0),
          ),
        }
        : current.diplomacy,
      log: [
        ...treatyExpiryNotices,
        ...turnNotices,
        `Turn ${nextTurn}: +${goldDelta} gold${commerceEnabled ? `, ${activeRoutes} routes active${nextShortages.length ? `; shortage in ${nextShortages.join(', ')}` : ''}` : ', baseline stores steady'}.`,
        ...current.log,
      ],
    }));
    announce(
      `Turn ${nextTurn}. The realm gathered ${goldDelta} gold${commerceEnabled ? ` and ${nextResources.grain - campaign.resources.grain} grain` : ' and replenished the baseline granary'}. ${event.title} needs your decision.`,
      false,
      'harvest',
    );
  };

  if (!campaign) {
    const selectedFoundingArchetype = getNationArchetype(nationArchetypeId);
    const selectedBanner = banners[bannerIndex];
    return (
      <main className="start-screen">
        <div className="start-glow" />
        <div className="start-glow" />
        <div className="start-appearance">
          <ThemeControl
            theme={theme}
            setTheme={setTheme}
            reducedMotion={reducedMotion}
            setReducedMotion={setReducedMotion}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            feedbackLevel={feedbackLevel}
            setFeedbackLevel={setFeedbackLevel}
            open={appearanceOpen}
            setOpen={setAppearanceOpen}
          />
        </div>
        <div className="start-grid">
          <section className="start-copy ink-rise">
            <div className="eyebrow">A single-player campaign · Canvas edition</div>
            <h1 className="start-title">Open<br /><em>Kingdoms</em></h1>
            <p className="start-subtitle">
              Every border begins as a line of ink. Name your nation, raise its standard, and draw a future across the continent.
            </p>
          </section>
          <div className="start-form-column start-form-delay ink-rise">
            <FoundingPreview
              archetype={selectedFoundingArchetype}
              banner={selectedBanner}
              emblemId={emblemId}
              reducedMotion={reducedMotion}
            />
            <section className="start-form">
              <div className="form-label">The founding decree</div>
              <label htmlFor="nation-name" className="sr-only">Nation name</label>
              <input
                id="nation-name"
                className="name-input"
                value={nationName}
                onChange={(event) => setNationName(event.target.value)}
                placeholder="Name your nation"
                maxLength={28}
                data-testid="input-nation-name"
              />
              <div className="banner-section">
                <div className="form-label">Choose your standard</div>
                <div className="banner-row">
                  {banners.map((banner, index) => (
                    <button
                      type="button"
                      key={banner.name}
                      className={`banner-choice ${bannerIndex === index ? 'is-selected' : ''}`}
                      onClick={() => setBannerIndex(index)}
                      aria-label={`${banner.name} banner`}
                      aria-pressed={bannerIndex === index}
                      data-testid={`button-banner-${banner.name.toLowerCase()}`}
                    >
                      <span className="banner-swatch" style={{ background: `linear-gradient(135deg, ${banner.color} 55%, ${banner.secondary} 56%)` }} />
                    </button>
                  ))}
                </div>
              </div>
              <fieldset className="archetype-section">
                <legend className="form-label">Choose a nation identity</legend>
                <p className="founding-help">Each charter changes the opening years without changing the victory path.</p>
                <div className="archetype-grid" role="radiogroup" aria-label="Nation archetypes">
                  {NATION_ARCHETYPES.map((archetype) => (
                    <button
                      type="button"
                      key={archetype.id}
                      className={`archetype-choice ${nationArchetypeId === archetype.id ? 'is-selected' : ''}`}
                      onClick={() => setNationArchetypeId(archetype.id)}
                      aria-pressed={nationArchetypeId === archetype.id}
                      data-testid={`button-archetype-${archetype.id}`}
                    >
                      <span className="archetype-choice-heading"><strong>{archetype.name}</strong><span>{archetype.shortName}</span></span>
                      <small>{archetype.description}</small>
                      <em>{archetype.bonus}</em>
                    </button>
                  ))}
                </div>
                <div className="founding-summary" data-testid="founding-archetype-summary">
                  <span className="founding-summary-mark" style={{ color: selectedFoundingArchetype.accent }}>◆</span>
                  <span><strong>{selectedFoundingArchetype.name}</strong> · {selectedFoundingArchetype.bonus}. {selectedFoundingArchetype.tradeoff}.</span>
                </div>
              </fieldset>
              <fieldset className="emblem-section">
                <legend className="form-label">Compose your emblem</legend>
                <div className="emblem-row" role="radiogroup" aria-label="Flag emblems">
                  {EMBLEMS.map((emblem) => (
                    <button
                      type="button"
                      key={emblem.id}
                      className={`emblem-choice ${emblemId === emblem.id ? 'is-selected' : ''}`}
                      onClick={() => setEmblemId(emblem.id)}
                      aria-label={`${emblem.name} emblem`}
                      aria-pressed={emblemId === emblem.id}
                      data-testid={`button-emblem-${emblem.id}`}
                    >
                      <span aria-hidden="true">{emblem.glyph}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <ExpansionPackSelector selection={newExpansions} onChange={setNewExpansions} />
              <button className="button-primary found-button" onClick={startCampaign} data-testid="button-found-nation">
                Found the nation <ArrowRight size={15} />
              </button>
              <p className="mono save-note">
                Your campaign is saved locally in this browser
              </p>
            </section>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={`app-shell ${campaignComplete ? 'is-complete' : ''}`}>
      <div className="game-layout">
        <aside className="sidebar">
          <div className="brand-mark">
            <div className="brand-seal"><Crown size={18} /></div>
             <div className="brand-name">OpenKingdoms<small>canvas edition · continental chronicle</small></div>
          </div>
          <button className="mobile-menu button-quiet" onClick={() => setMobileNavOpen(!mobileNavOpen)} aria-label="Toggle royal desk menu" aria-expanded={mobileNavOpen} aria-controls="royal-desk-nav" data-testid="button-toggle-menu"><Menu size={16} /></button>
          <nav id="royal-desk-nav" className={mobileNavOpen ? 'is-open' : ''}>
            <div className="sidebar-caption">The royal desk</div>
             <button className="nav-item is-active" onClick={() => setMobileNavOpen(false)} data-testid="button-nav-campaign"><Castle size={15} /> Continental chart</button>
            <button className="nav-item" onClick={() => setGuideOpen(true)} data-testid="button-nav-guide"><BookOpen size={15} /> Field guide <ChevronRight className="nav-chevron" size={12} /></button>
          </nav>
          <div className="sidebar-footer">
            <div className="campaign-id">CURRENT CHRONICLE<br /><span className="mono">{campaign.nation.toUpperCase()}</span></div>
            <button className="guide-button restart-button" onClick={restartCampaign} data-testid="button-restart-campaign"><Minus size={14} /> Begin anew</button>
          </div>
        </aside>

        <section className="main-area">
          <header className="topbar">
            <div>
               <div className="page-kicker">{campaignComplete ? 'Completed chronicle · Review edition' : 'Canvas edition · Continental chronicle'} · Turn {String(campaign.turn).padStart(2, '0')}</div>
              <h1 className="page-title"><span className="campaign-emblem" aria-label={`${getEmblem(campaign.emblemId).name} emblem`}>{getEmblem(campaign.emblemId).glyph}</span>{campaign.nation}</h1>
              <div className="campaign-identity-line" data-testid="campaign-identity">
                <span>{getNationArchetype(campaign.archetypeId).name}</span>
                <span>·</span>
                <span>{getEmblem(campaign.emblemId).name} emblem</span>
              </div>
            </div>
               <div className="turn-control">
              <ExpansionPackControl
                selection={campaign.expansions}
                onChange={updateExpansionSelection}
                open={systemsOpen}
                setOpen={setSystemsOpen}
                readOnly={campaignComplete}
              />
              <ThemeControl
                theme={theme}
                setTheme={setTheme}
                reducedMotion={reducedMotion}
                setReducedMotion={setReducedMotion}
                soundEnabled={soundEnabled}
                setSoundEnabled={setSoundEnabled}
                feedbackLevel={feedbackLevel}
                setFeedbackLevel={setFeedbackLevel}
                open={appearanceOpen}
                setOpen={setAppearanceOpen}
              />
              <div className="turn-count"><span>Current turn</span><strong data-testid="text-current-turn">{campaign.turn}</strong></div>
               <button className="button-primary" onClick={advanceTurn} disabled={campaignComplete || Boolean(campaign.activeEvent)} data-testid="button-advance-turn"><ArrowRight size={15} /><span>{campaignComplete ? 'Chronicle complete' : campaign.activeEvent ? 'Event decision pending' : 'Resolve turn'}</span></button>
            </div>
          </header>

          {campaignComplete && (
            <section className="campaign-status-banner" role="status" aria-labelledby="campaign-status-title" data-testid="panel-campaign-victory">
              <div className="campaign-status-mark"><Crown size={21} aria-hidden="true" /></div>
              <div className="campaign-status-copy">
                <div className="panel-kicker">The first kingdom is founded</div>
                <h2 id="campaign-status-title">{campaign.nation} has entered the chronicle</h2>
                <p>Your standard now flies over three provinces. The map, dispatches, and court records remain available for review; start a new chronicle only when you choose.</p>
              </div>
              <button className="button-quiet campaign-status-action" onClick={restartCampaign} data-testid="button-start-new-chronicle"><Minus size={14} /> Begin a new chronicle</button>
            </section>
          )}

          <ResourceStrip
            items={[
              { label: 'Treasury', value: campaign.gold, unit: 'gold', icon: Coins, testId: 'value-gold' },
              { label: 'Granary', value: campaign.food, unit: 'food', icon: Wheat, testId: 'value-food' },
              { label: 'Royal forces', value: campaign.forces, unit: 'soldiers', icon: Swords, testId: 'value-forces' },
               { label: 'Held territory', value: playerRegions.length, unit: 'provinces', icon: Flag, testId: 'value-territory' },
            ]}
          />
           <section className="campaign-flow" aria-label="Campaign decision flow">
             <div className={`flow-step ${selected ? 'is-complete' : 'is-current'}`}>
               <span className="flow-step-number">01</span>
               <div><strong>Inspect</strong><small>{selected ? selected.name : 'Choose a province'}</small></div>
             </div>
             <ArrowRight className="flow-arrow" size={15} aria-hidden="true" />
             <div className={`flow-step ${selected ? 'is-current' : ''}`}>
               <span className="flow-step-number">02</span>
               <div><strong>Choose an action</strong><small>{selected?.kind === 'player' ? 'Develop or recruit' : 'Plan a border order'}</small></div>
             </div>
             <ArrowRight className="flow-arrow" size={15} aria-hidden="true" />
             <div className="flow-step flow-step-resolve">
               <span className="flow-step-number">03</span>
               <div><strong>{campaignComplete ? 'Review chronicle' : 'Resolve turn'}</strong><small>{campaignComplete ? 'Kingdom complete' : frontSummaries.length ? `${frontSummaries.length} front${frontSummaries.length === 1 ? '' : 's'} in motion` : 'No fronts staged yet'}</small></div>
             </div>
           </section>
            <CampaignPrimer
              selectedName={selected?.name ?? null}
              selectedKind={selected?.kind ?? null}
              commerceEnabled={commerceEnabled}
              diplomacyEnabled={diplomacyEnabled}
            />
           {campaign.lastTurnSummary && <TurnSummaryPanel summary={campaign.lastTurnSummary} />}
           {campaign.activeEvent && (
             <CampaignEventPanel
               event={campaign.activeEvent}
               onChoose={chooseCampaignEvent}
               getChoiceDisabledReason={getEventChoiceDisabledReason}
               readOnly={campaignComplete}
             />
           )}
            <MilestonePanel milestones={campaignMilestones} />
          {commerceEnabled ? (
            <EconomyPanel
              stocks={campaign.resources}
              production={economy.production}
              consumption={economy.consumption}
              shortages={economyShortages}
              tradeIncome={tradeIncome}
              tradeUpkeep={tradeUpkeep}
              militaryAid={campaign.militaryAid}
            />
          ) : (
            <section className="panel pack-dormant-panel" aria-label="Commerce and Industry dormant" data-testid="panel-commerce-dormant">
              <div className="pack-dormant-icon"><Coins size={18} aria-hidden="true" /></div>
              <div><div className="panel-kicker">Commerce &amp; Industry dormant</div><h2>Baseline stores are steady</h2><p>Settlements, levies, fronts, and conquest remain active. Production, shortages, and convoy income will resume when the pack is awakened.</p></div>
            </section>
          )}

          <div className="content-grid">
             <section
               className={`map-panel map-in ${mapExpanded ? 'map-panel-expanded' : ''}`}
               aria-label="Command map"
               data-testid="panel-command-map"
             >
              <div className="map-head">
                  <div className="map-head-copy"><div className="panel-kicker">The realm at a glance</div><h2>{mapExpanded ? 'Command the border' : 'Read the border'}</h2><p>Land and ownership come first. Select a province to reveal legal neighboring targets, roads, orders, and courts that matter there.</p></div>
                 <div className="map-head-side"><span className="map-view-tag">Focused political map</span><div className="map-legend"><span className="legend-item"><i className="legend-dot yours" /> Your lands</span><span className="legend-item"><i className="legend-dot rival" /> Rival claim</span><span className="legend-item"><i className="legend-dot neutral" /> Unclaimed</span><span className="legend-item"><i className="legend-dot road" /> Roads in focus</span><span className="legend-item"><i className="legend-dot front" /> Active front</span><span className="legend-item"><i className="legend-dot adjacent" /> Adjacent border</span></div></div>
                  <button
                    ref={mapExpandButtonRef}
                    type="button"
                    className="map-expand-button button-quiet"
                    onClick={() => setMapExpanded((expanded) => !expanded)}
                    aria-expanded={mapExpanded}
                    aria-controls="command-map-canvas"
                    data-testid="button-toggle-command-map"
                  >
                    {mapExpanded ? <Minimize2 size={14} aria-hidden="true" /> : <Maximize2 size={14} aria-hidden="true" />}
                    <span>{mapExpanded ? 'Return to desk' : 'Expand map'}</span>
                  </button>
              </div>
               <div className="map-canvas-wrap" id="map-help">
                <CampaignCanvas
                   id="command-map-canvas"
                  regions={canvasRegions}
                  coastlinePath={continentalCoastlinePath}
                  fronts={canvasFronts}
                  routes={canvasRoutes}
                  selectedId={selectedId}
                  selectedFrontId={activeFrontId}
                  bannerColor={campaign.banner.color}
                  palette={canvasPalette}
                   onSelect={selectRegion}
                   onSelectFront={selectFront}
                   onSelectRoute={selectRoute}
                   onMiss={() => announce('Select a province, front, or highlighted route to inspect it.', true)}
                />
              </div>
                <p className="map-note"><strong>Choose your next move.</strong> Your selected province sets the map’s focus; nearby roads and orders appear as you need them.</p>
              <AccessibleRegionIndex
                regions={campaign.regions}
                selectedId={selectedId}
                 onSelect={selectRegion}
              />
              <FrontIndex
                fronts={frontSummaries}
                selectedFrontId={activeFrontId}
                 onSelect={(front) => selectFront(front.id)}
              />
            </section>

            <div className="right-stack">
          {activeFrontSummary && (
                <FrontDossier
                  front={activeFrontSummary}
                  allocation={activeFrontSummary.committedForces}
                  maxAllocation={activeFrontSummary.sourceForces + activeFrontSummary.committedForces}
                  onAllocationChange={(value) => updateFrontAllocation(activeFrontSummary.id, value)}
                  onRecall={() => recallFront(activeFrontSummary.id)}
                  onCancel={() => cancelFront(activeFrontSummary.id)}
                  onAttack={() => attackFront(activeFrontSummary.id)}
                  readOnly={campaignComplete}
                />
              )}
              <section className="panel selection-panel">
                {selected ? (
                  <>
                    <div className="selection-top">
                      <div><div className="panel-kicker">Province dossier</div><h2 className="selection-name" data-testid={`text-selected-region-${selected.id}`}>{selected.name}</h2></div>
                      <span className={`territory-badge ${selected.kind === 'player' ? 'player' : ''}`}>{selected.kind === 'player' ? 'Under your crown' : selected.kind === 'rival' ? 'Rival claim' : 'Unclaimed'}</span>
                    </div>
                    <p className="selection-description">{selected.description}</p>
                    <div className="settlement-meta">
                      <div><span className="meta-label">Settlement</span><strong className="meta-value" data-testid={`value-settlement-${selected.id}`}>{selected.settlement}</strong></div>
                      <div><span className="meta-label">Local forces</span><strong className="meta-value" data-testid={`value-region-forces-${selected.id}`}>{selected.forces}</strong></div>
                      <div><span className="meta-label">Barracks</span><strong className="meta-value" data-testid={`value-barracks-${selected.id}`}>{selected.barracks ? 'Built' : 'None'}</strong></div>
                       <div><span className="meta-label">Stronghold</span><strong className="meta-value" data-testid={`value-stronghold-${selected.id}`}>{getStrongholdTier(selected.strongholdLevel).shortName}</strong></div>
                    </div>
                    <div className="selection-geography">
                      <span><small>Terrain</small><strong>{selected.terrain ? selected.terrain : 'Open country'}</strong></span>
                      <span><small>Landmark</small><strong>{selected.landmark ?? 'No landmark recorded'}</strong></span>
                    </div>
                    <section className="selection-stronghold" aria-labelledby="selection-stronghold-title" data-testid={`panel-stronghold-${selected.id}`}>
                      <div className="selection-subheading">
                        <span className="meta-label" id="selection-stronghold-title">County stronghold</span>
                        <span className="stronghold-tier-badge">{getStrongholdTier(selected.strongholdLevel).shortName}</span>
                      </div>
                      <p className="stronghold-description">{getStrongholdTier(selected.strongholdLevel).description}</p>
                      <div className="stronghold-metrics">
                        <span><small>Defense</small><strong>+{getStrongholdTier(selected.strongholdLevel).defense}</strong></span>
                        <span><small>Recovery</small><strong>+{getStrongholdTier(selected.strongholdLevel).recovery}</strong></span>
                        <span><small>Recruitment</small><strong>+{getStrongholdTier(selected.strongholdLevel).recruitment}</strong></span>
                      </div>
                      {selected.kind === 'player' ? (
                        <>
                          <button
                            className="button-quiet action-button stronghold-upgrade-button"
                            onClick={upgradeStronghold}
                            disabled={campaignComplete || Boolean(strongholdStatusReason(selected, campaign))}
                            data-testid="button-upgrade-stronghold"
                          >
                            <span><Castle size={14} /> {getNextStrongholdTier(selected.strongholdLevel) ? `Raise ${getNextStrongholdTier(selected.strongholdLevel)?.shortName}` : 'Citadel established'}</span>
                            <span className="action-cost">{getNextStrongholdTier(selected.strongholdLevel) ? `${strongholdUpgradeCost(selected.strongholdLevel)} gold` : <Check size={13} />}</span>
                          </button>
                          <p className="action-help" data-testid="stronghold-action-reason">
                            {campaignComplete
                              ? 'The completed chronicle is read-only.'
                              : strongholdStatusReason(selected, campaign) ??
                                `Next tier: ${getNextStrongholdTier(selected.strongholdLevel)?.name}. It adds +${getNextStrongholdTier(selected.strongholdLevel)?.defense} defense and costs ${strongholdUpgradeCost(selected.strongholdLevel)} gold.`}
                          </p>
                        </>
                      ) : (
                        <p className="action-help">This county’s fortification will matter if its banner changes hands.</p>
                      )}
                    </section>
                     {selectedLocalEconomy && (
                       <div className="selection-economy" aria-label={`Local economy for ${selected.name}`}>
                         <div className="selection-subheading"><span className="meta-label">Local economy</span><span className="mono">{commerceEnabled ? 'per turn' : 'when Commerce awakens'}</span></div>
                         <div className="economy-ledger">
                           {RESOURCE_TYPES.map((resource) => (
                             <span key={resource}>
                               <small>{resource}</small>
                               <strong>+{selectedLocalEconomy.production[resource]}</strong>
                               <em>−{selectedLocalEconomy.consumption[resource]}</em>
                             </span>
                           ))}
                         </div>
                         <p className="selection-economy-note">
                           {commerceEnabled
                             ? selectedLocalShortages.length
                               ? `Local shortage: ${selectedLocalShortages.join(', ')}. Keep stores above upkeep before expanding.`
                               : 'No local shortages. Output is shaped by settlement level; consumption rises as the province grows.'
                             : 'The baseline levy is active now. Recruitment costs 25 gold and 10 food; these local specialties become strategic when Commerce &amp; Industry is enabled.'}
                         </p>
                       </div>
                     )}
                     <div className="selection-borders" aria-labelledby="selection-borders-title">
                       <div className="selection-subheading"><span className="meta-label" id="selection-borders-title">Adjacent borders</span><span className="mono">{selectedAdjacentRegions.length} connected</span></div>
                       <div className="border-chip-list">
                         {selectedAdjacentRegions.map((neighbor) => {
                           const legalTarget = selected.kind === 'player' ? neighbor.kind !== 'player' : neighbor.kind === 'player';
                           return (
                             <button
                               type="button"
                               key={neighbor.id}
                               className={`border-chip ${legalTarget ? 'is-legal' : ''}`}
                                onClick={() => selectRegion(neighbor.id)}
                               aria-label={`Inspect adjacent province ${neighbor.name}`}
                             >
                               <span><strong>{neighbor.name}</strong><small>{neighbor.kind === 'player' ? 'Your land' : neighbor.kind === 'rival' ? 'Rival claim' : 'Unclaimed'} · {neighbor.forces} forces</small></span>
                               <em>{legalTarget ? (selected.kind === 'player' ? 'Target' : 'Source') : 'Border'}</em>
                             </button>
                           );
                         })}
                       </div>
                     </div>
                    {selected.kind === 'player' ? (
                      <div className="action-stack">
                          <button className="button-quiet action-button" onClick={buildBarracks} disabled={campaignComplete || selected.barracks || campaign.gold < 80} data-testid="button-build-barracks"><span><Hammer size={14} /> {selected.barracks ? 'Barracks established' : 'Build barracks'}</span><span className="action-cost">{selected.barracks ? <Check size={13} /> : '80 gold'}</span></button>
                          {!selected.barracks && <p className="action-help">Raises each recruitment call from 10 to 16 soldiers.</p>}
                           <button className="button-quiet action-button" onClick={upgradeSettlement} disabled={campaignComplete || selected.settlement === 'City' || campaign.gold < settlementCharterCost(selected.settlement, campaign.archetypeId)} data-testid="button-upgrade-settlement"><span><Landmark size={14} /> {selected.settlement === 'City' ? 'City charter complete' : `Upgrade to ${selected.settlement === 'Village' ? 'town' : 'city'}`}</span><span className="action-cost">{selected.settlement === 'City' ? <Check size={13} /> : `${settlementCharterCost(selected.settlement, campaign.archetypeId)} gold`}</span></button>
                          {selected.settlement !== 'City' && <p className="action-help">Increases this province's output and supports a stronger long-term base.</p>}
                           <button className="button-primary action-button" onClick={recruitForces} disabled={campaignComplete || campaign.gold < 25 || campaign.food < 10 || (commerceEnabled && campaign.resources.grain < 10)} data-testid="button-recruit-forces"><span><Users size={14} /> Recruit forces</span><span className="action-cost">+{selectedRecruitmentYield} · 25 gold · 10 food{commerceEnabled ? ' · 10 grain' : ''}</span></button>
                           <p className="action-help">{selected.barracks ? `Barracks make this levy worth ${selectedRecruitmentYield} soldiers.` : `A field levy adds ${selectedRecruitmentYield} soldiers; build barracks before repeated calls.`}{commerceEnabled && campaign.resources.grain < 10 ? ' Grain is the current constraint.' : ''}</p>
                      </div>
                    ) : (
                      <>
                        {frontSourceOptions.length ? (
                          <FrontPlanner
                            targetName={selected.name}
                            name={frontDraftName}
                            sourceOptions={frontSourceOptions}
                            sourceId={frontDraftSourceId}
                            allocation={frontDraftAllocation}
                            onNameChange={setFrontDraftName}
                            onSourceChange={(sourceId) => {
                              setFrontDraftSourceId(sourceId);
                              const source = frontSourceOptions.find((option) => option.id === sourceId);
                              setFrontDraftAllocation(Math.min(frontDraftAllocation, source?.forces ?? 0));
                            }}
                            onAllocationChange={setFrontDraftAllocation}
                            onCreate={createFront}
                             readOnly={campaignComplete}
                          />
                        ) : (
                          <p className="front-unavailable">
                            {selectedTargetFronts.length
                              ? 'Every neighboring region already has a front here. Select one above to adjust its order.'
                              : 'This border has no neighboring region under your crown.'}
                          </p>
                        )}
                      </>
                    )}
                  </>
                ) : <div className="empty-selection"><Mountain size={26} /><h3>No province selected</h3><p>Choose a shape on the chart to read its dossier and decide what happens next.</p></div>}
              </section>
              {commerceEnabled ? (
                <TradePanel
                  partnerName={selectedTarget?.name ?? null}
                  route={selectedTradeRoute}
                  sourceOptions={tradeSourceOptions}
                  sourceId={tradeDraftSourceId}
                  exportResource={tradeDraftExport}
                  importResource={tradeDraftImport}
                  canEstablish={tradeCanEstablish}
                  establishReason={tradeEstablishReason}
                  diplomacyEnabled={diplomacyEnabled}
                  onSourceChange={setTradeDraftSourceId}
                  onExportChange={setTradeDraftExport}
                  onImportChange={setTradeDraftImport}
                  onEstablish={establishTradeRoute}
                  onCancel={cancelTradeRoute}
                  onRenew={renewTradeRoute}
                  readOnly={campaignComplete}
                />
              ) : (
                <section className="panel pack-dormant-panel pack-dormant-panel-small" aria-label="Commerce and Industry dormant" data-testid="panel-trade-dormant">
                  <div className="pack-dormant-icon"><Route size={17} aria-hidden="true" /></div>
                  <div><div className="panel-kicker">Commerce &amp; Industry dormant</div><h2>Convoys are waiting</h2><p>Turn on the pack from Campaign systems to open trade routes and route consequences.</p></div>
                </section>
              )}
              {diplomacyEnabled ? (
                <DiplomacyPanel
                  partner={selectedPartner}
                  reputation={campaign.reputation}
                  onSendEnvoy={sendEnvoy}
                  onTradeAgreement={() => proposeTreaty('trade')}
                  onNonAggression={() => proposeTreaty('non-aggression')}
                  onAlliance={() => proposeTreaty('defensive-alliance')}
                  onMilitaryAid={() => proposeTreaty('military-aid')}
                  onPeace={() => proposeTreaty('peace')}
                  onEmbargo={toggleEmbargo}
                  onBreakTreaty={breakTreaty}
                  onPostureChange={updateDiplomaticPosture}
                  readOnly={campaignComplete}
                />
              ) : (
                <section className="panel pack-dormant-panel pack-dormant-panel-small" aria-label="Diplomacy and Alliances dormant" data-testid="panel-diplomacy-dormant">
                  <div className="pack-dormant-icon"><Handshake size={17} aria-hidden="true" /></div>
                  <div><div className="panel-kicker">Diplomacy &amp; Alliances dormant</div><h2>The court is quiet</h2><p>Military orders remain available. Awaken the pack when you want envoys, posture, treaties, alliances, and peace terms.</p></div>
                </section>
              )}

               <section className="panel objective-panel">
                  <div className="panel-kicker">{campaignComplete ? 'Campaign complete' : 'The first charter'}</div>
                  <h3>{campaignComplete ? 'Your first kingdom stands.' : 'Secure your first province.'}</h3>
                  <p>{campaignComplete ? `The realm reached its founding goal on turn ${campaign.victoryTurn ?? campaign.turn}. Review the chart and chronicle, or begin a new campaign when you are ready.` : 'Hold three provinces to establish a true kingdom. Build your strength, then decide which border to redraw.'}</p>
                <div className="objective-progress"><span style={{ width: `${objectiveProgress}%` }} /></div>
                  <div className="mono objective-status" data-testid="status-objective">{campaignComplete ? `Completed on turn ${campaign.victoryTurn ?? campaign.turn}` : `${playerRegions.length} of ${KINGDOM_GOAL} provinces held`}</div>
              </section>

              <DispatchList entries={campaign.log} />
            </div>
          </div>
        </section>
      </div>

      {guideOpen && (
        <div className="guide-overlay" onClick={(event) => { if (event.target === event.currentTarget) setGuideOpen(false); }}>
          <aside className="guide-drawer" role="dialog" aria-modal="true" aria-label="Field guide">
            <div className="guide-header"><div><div className="panel-kicker">A primer for sovereigns</div><h2>Field guide</h2></div><button ref={guideCloseRef} className="close-button" onClick={() => setGuideOpen(false)} aria-label="Close guide" data-testid="button-close-guide"><X size={20} /></button></div>
            <div className="guide-section"><h3>Read the chart</h3><p>This is one connected continent, drawn as a field chart. Green provinces answer to your crown; red provinces are rival claims; gold provinces are open to persuasion.</p></div>
              <div className="guide-section"><h3>Grow your realm</h3><ul className="guide-list"><li><Coins size={14} /> <span>Advance a turn to gather gold. {commerceEnabled ? 'Commerce is active, so held provinces also produce and consume grain, timber, iron, and salt.' : 'The baseline keeps stores steady while your core settlement and military loop stays readable.'}</span></li><li><Hammer size={14} /> <span>Barracks cost 80 gold and make each recruitment call worth 16 soldiers instead of 10.</span></li><li><Landmark size={14} /> <span>Upgrade villages into towns and towns into cities. Each charter costs more than the last and improves local output.</span></li></ul></div>
             <div className="guide-section"><h3>Redraw a border</h3><p>Select a rival or unclaimed province to name a front, choose its source province, and stage an exact levy. Review the projected strength before committing the march.</p></div>
              <div className="guide-section"><h3>Optional systems</h3><p><strong>{commerceEnabled ? 'Commerce & Industry is active.' : 'Commerce & Industry is dormant.'}</strong> {commerceEnabled ? 'Charter routes to move goods and earn income; shortages, upkeep, and border conditions can change their status.' : 'Turn it on from Campaign systems to add production, consumption, shortages, and convoys. Dormant route history is preserved.'}</p><p><strong>{diplomacyEnabled ? 'Diplomacy & Alliances is active.' : 'Diplomacy & Alliances is dormant.'}</strong> {diplomacyEnabled ? 'Choose a court posture, spend influence on envoys and treaty proposals, and manage the consequences of trust, aid, peace, and embargoes.' : 'Turn it on from Campaign systems to add court posture, envoys, influence, treaties, and alliance consequences. Dormant court history is preserved.'}</p></div>
              {diplomacyEnabled && <div className="guide-section"><h3>Keep your word</h3><p>Non-aggression pacts protect a border, alliances can send aid to a neighboring front, and peace terms reopen a war-torn crossing. Breaking a treaty costs reputation and makes that court hostile.</p></div>}
            <div className="guide-section"><h3>Remember</h3><p>There is no perfect opening. The chronicle saves to this browser after every decision, so you may return whenever the map calls.</p></div>
          </aside>
        </div>
      )}
      {feedback && (
        <>
          <div
            key={`feedback-aura-${feedback.id}`}
            className={`feedback-aura feedback-aura-${feedback.tone} feedback-aura-${feedbackLevel} ${feedback.error ? 'error' : ''}`}
            aria-hidden="true"
          >
            <div className="feedback-burst">
              <FeedbackIcon tone={feedback.tone} />
              <span>{feedback.error ? 'A royal warning' : 'A new dispatch'}</span>
            </div>
          </div>
          <div key={`feedback-notice-${feedback.id}`} className={`feedback ${feedback.error ? 'error' : ''}`} role="status" data-testid="status-feedback">
            <span className="feedback-icon" aria-hidden="true"><FeedbackIcon tone={feedback.tone} /></span>
            <span>{feedback.text}</span>
          </div>
        </>
      )}
      <div className="sr-only" aria-live="polite" aria-atomic="true" data-testid="status-live-region">{feedback?.text ?? ''}</div>
    </main>
  );
}

export default App;