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
  Hammer,
  Landmark,
  Menu,
  Moon,
  Minus,
  Mountain,
  Palette,
  Swords,
  Sun,
  Users,
  Wheat,
  X,
} from 'lucide-react';
import {
  CampaignCanvas,
  type CanvasPalette,
  type CanvasRegion,
} from '@/components/campaign-canvas';

type Banner = { name: string; color: string; secondary: string };
type RegionKind = 'player' | 'rival' | 'neutral';
type Settlement = 'Village' | 'Town' | 'City';
type Region = {
  id: string;
  name: string;
  kind: RegionKind;
  settlement: Settlement;
  forces: number;
  barracks: boolean;
  adjacent: string[];
  description: string;
  path: string;
  label: [number, number];
};
type Campaign = {
  edition: 'Canvas';
  nation: string;
  banner: Banner;
  turn: number;
  gold: number;
  food: number;
  forces: number;
  regions: Region[];
  log: string[];
};

type ThemeKey = 'parchment' | 'midnight' | 'meadow';

type ThemePreset = {
  name: string;
  description: string;
  canvas: CanvasPalette;
};

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

const regionById = (regions: Region[], id: string) => regions.find((region) => region.id === id);

function makeNewCampaign(nation: string, banner: Banner): Campaign {
  return {
    edition: 'Canvas',
    nation: nation.trim() || 'The Unnamed Crown',
    banner,
    turn: 1,
    gold: 145,
    food: 120,
    forces: 48,
    regions: baseRegions.map((region) => ({ ...region })),
    log: ['The first standard was raised at Aurelian Reach.'],
  };
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

    const savedRegions = saved.regions as Partial<Region>[];
    const regions = baseRegions.map((base) => {
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
        kind: savedKind,
        settlement: savedSettlement,
        forces:
          typeof savedRegion.forces === 'number' && savedRegion.forces >= 0
            ? savedRegion.forces
            : base.forces,
        barracks: Boolean(savedRegion.barracks),
      };
    });

    return {
      edition: 'Canvas',
      nation: saved.nation.slice(0, 28),
      banner:
        saved.banner &&
        typeof saved.banner.name === 'string' &&
        typeof saved.banner.color === 'string' &&
        typeof saved.banner.secondary === 'string'
          ? saved.banner
          : banners[0],
      turn: typeof saved.turn === 'number' && saved.turn > 0 ? saved.turn : 1,
      gold: typeof saved.gold === 'number' && saved.gold >= 0 ? saved.gold : 145,
      food: typeof saved.food === 'number' && saved.food >= 0 ? saved.food : 120,
      forces:
        typeof saved.forces === 'number' && saved.forces >= 0
          ? saved.forces
          : 48,
      regions,
      log: Array.isArray(saved.log)
        ? saved.log.filter((entry): entry is string => typeof entry === 'string').slice(0, 4)
        : ['The first standard was raised at Aurelian Reach.'],
    };
  } catch {
    return null;
  }
}

function ThemeControl({
  theme,
  setTheme,
  reducedMotion,
  setReducedMotion,
  open,
  setOpen,
}: {
  theme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
  reducedMotion: boolean;
  setReducedMotion: (value: boolean) => void;
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
              <div className="panel-kicker">Future cosmetics</div>
              <strong>Choose a palette</strong>
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
    return localStorage.getItem('openkingdoms-reduced-motion') === 'true';
  } catch {
    return false;
  }
}

function App() {
  const [campaign, setCampaign] = useState<Campaign | null>(() => readCampaign());
  const [nationName, setNationName] = useState('');
  const [bannerIndex, setBannerIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>('aurelian');
  const [guideOpen, setGuideOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);
  const [theme, setTheme] = useState<ThemeKey>(() => readTheme());
  const [reducedMotion, setReducedMotion] = useState(() => readReducedMotion());
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const guideCloseRef = useRef<HTMLButtonElement>(null);

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
    if (!guideOpen) return;
    guideCloseRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setGuideOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [guideOpen]);

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
  const objectiveProgress = Math.min(100, Math.round((playerRegions.length / 3) * 100));
  const canvasRegions: CanvasRegion[] = campaign?.regions ?? [];
  const canvasPalette = themePresets[theme].canvas;

  const announce = (text: string, error = false) => setFeedback({ text, error });

  const startCampaign = () => {
    const next = makeNewCampaign(nationName, banners[bannerIndex]);
    setCampaign(next);
    setSelectedId('aurelian');
    announce(`${next.nation} enters the chronicle.`);
  };

  const restartCampaign = () => {
    if (!window.confirm('Restart this campaign? Your current chronicle will be erased.')) return;
    localStorage.removeItem('openkingdoms-campaign');
    setCampaign(null);
    setNationName('');
    setSelectedId('aurelian');
    announce('The map has been cleared.');
  };

  const updateCampaign = (transform: (current: Campaign) => Campaign) => {
    setCampaign((current) => (current ? transform(current) : current));
  };

  const buildBarracks = () => {
    if (!campaign || !selected || selected.kind !== 'player') return;
    if (selected.barracks) return announce('A barracks already stands here.', true);
    if (campaign.gold < 80) return announce('The treasury cannot fund this construction yet.', true);
    updateCampaign((current) => ({
      ...current,
      gold: current.gold - 80,
      regions: current.regions.map((region) =>
        region.id === selected.id ? { ...region, barracks: true } : region,
      ),
      log: [`Barracks raised at ${selected.name}.`, ...current.log].slice(0, 4),
    }));
    announce(`Barracks raised at ${selected.name}. Your levy grows stronger.`);
  };

  const upgradeSettlement = () => {
    if (!campaign || !selected || selected.kind !== 'player') return;
    const costs: Record<Settlement, number> = { Village: 110, Town: 190, City: 9999 };
    const nextSettlement: Record<Settlement, Settlement> = { Village: 'Town', Town: 'City', City: 'City' };
    const cost = costs[selected.settlement];
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
      log: [`${selected.name} chartered as a ${nextSettlement[selected.settlement]}.`, ...current.log].slice(0, 4),
    }));
    announce(`${selected.name} is now a ${nextSettlement[selected.settlement]}.`);
  };

  const recruitForces = () => {
    if (!campaign || !selected || selected.kind !== 'player') return;
    const cost = 25;
    if (campaign.gold < cost || campaign.food < 10) return announce('Not enough gold or food to call a new levy.', true);
    const bonus = selected.barracks ? 16 : 10;
    updateCampaign((current) => ({
      ...current,
      gold: current.gold - cost,
      food: current.food - 10,
      forces: current.forces + bonus,
      regions: current.regions.map((region) =>
        region.id === selected.id ? { ...region, forces: region.forces + bonus } : region,
      ),
      log: [`${bonus} forces recruited at ${selected.name}.`, ...current.log].slice(0, 4),
    }));
    announce(`${bonus} new forces answer the call at ${selected.name}.`);
  };

  const launchAttack = () => {
    if (!campaign || !selected || selected.kind !== 'rival') return;
    const home = campaign.regions.find((region) => region.kind === 'player' && region.adjacent.includes(selected.id));
    if (!home) return announce('This rival is beyond your current borders.', true);
    const available = home.forces;
    if (available < selected.forces + 12) return announce('Your army needs a larger margin before marching here.', true);
    const won = available > selected.forces;
    if (!won) return announce(`${selected.name} repelled the first charge. Recruit more forces.`, true);
    updateCampaign((current) => ({
      ...current,
      forces: current.forces - Math.ceil(selected.forces * .42),
      regions: current.regions.map((region) =>
        region.id === selected.id
          ? { ...region, kind: 'player', forces: Math.max(14, Math.floor(home.forces * .58)), settlement: 'Village', barracks: false }
          : region.id === home.id
            ? { ...region, forces: Math.max(12, Math.floor(home.forces * .58)) }
            : region,
      ),
      log: [`Victory at ${selected.name}; the border moves east.`, ...current.log].slice(0, 4),
    }));
    announce(`Victory. ${selected.name} now bears your standard.`);
  };

  const advanceTurn = () => {
    if (!campaign) return;
    const income = playerRegions.length * 24;
    const foodIncome = playerRegions.length * 18;
    updateCampaign((current) => ({
      ...current,
      turn: current.turn + 1,
      gold: current.gold + income,
      food: current.food + foodIncome,
      log: [`Turn ${current.turn + 1}: the realm gathers its harvest.`, ...current.log].slice(0, 4),
    }));
    announce(`Turn ${campaign.turn + 1}. The realm gathers ${income} gold and ${foodIncome} food.`);
  };

  if (!campaign) {
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
            open={appearanceOpen}
            setOpen={setAppearanceOpen}
          />
        </div>
        <div className="start-grid">
          <section className="start-copy ink-rise">
            <div className="eyebrow">A single-player campaign · Canvas edition</div>
            <h1 className="start-title">Open<br /><em>Kingdoms</em></h1>
            <p className="start-subtitle">
              Every border begins as a line of ink. Name your nation, raise its standard, and decide what the map remembers.
            </p>
          </section>
          <section className="start-form ink-rise" style={{ animationDelay: '.12s' }}>
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
            <div style={{ marginTop: 30 }}>
              <div className="form-label">Choose your standard</div>
              <div className="banner-row">
                {banners.map((banner, index) => (
                  <button
                    key={banner.name}
                    className={`banner-choice ${bannerIndex === index ? 'is-selected' : ''}`}
                    onClick={() => setBannerIndex(index)}
                    aria-label={`${banner.name} banner`}
                    data-testid={`button-banner-${banner.name.toLowerCase()}`}
                  >
                    <span className="banner-swatch" style={{ background: `linear-gradient(135deg, ${banner.color} 55%, ${banner.secondary} 56%)` }} />
                  </button>
                ))}
              </div>
            </div>
            <button className="button-primary" style={{ width: '100%', marginTop: 32 }} onClick={startCampaign} data-testid="button-found-nation">
              Found the nation <ArrowRight size={15} />
            </button>
            <p className="mono" style={{ color: '#89928d', fontSize: 9, margin: '18px 0 0', textAlign: 'center' }}>
              Your campaign is saved locally in this browser
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="game-layout">
        <aside className="sidebar">
          <div className="brand-mark">
            <div className="brand-seal"><Crown size={18} /></div>
            <div className="brand-name">OpenKingdoms<small>canvas edition · living chronicle</small></div>
          </div>
          <button className="mobile-menu button-quiet" onClick={() => setMobileNavOpen(!mobileNavOpen)} aria-label="Toggle menu" data-testid="button-toggle-menu"><Menu size={16} /></button>
          <nav style={{ display: mobileNavOpen ? 'block' : undefined }}>
            <div className="sidebar-caption">The royal desk</div>
            <button className="nav-item is-active" onClick={() => setMobileNavOpen(false)} data-testid="button-nav-campaign"><Castle size={15} /> Campaign map</button>
            <button className="nav-item" onClick={() => setGuideOpen(true)} data-testid="button-nav-guide"><BookOpen size={15} /> Field guide <ChevronRight size={12} style={{ marginLeft: 'auto' }} /></button>
          </nav>
          <div className="sidebar-footer">
            <div className="campaign-id">CURRENT CHRONICLE<br /><span className="mono">{campaign.nation.toUpperCase()}</span></div>
            <button className="guide-button restart-button" onClick={restartCampaign} data-testid="button-restart-campaign"><Minus size={14} /> Begin anew</button>
          </div>
        </aside>

        <section className="main-area">
          <header className="topbar">
            <div>
              <div className="page-kicker">Canvas edition · Year of the first crown · Chronicle {String(campaign.turn).padStart(2, '0')}</div>
              <h1 className="page-title">{campaign.nation}</h1>
            </div>
            <div className="turn-control">
              <ThemeControl
                theme={theme}
                setTheme={setTheme}
                reducedMotion={reducedMotion}
                setReducedMotion={setReducedMotion}
                open={appearanceOpen}
                setOpen={setAppearanceOpen}
              />
              <div className="turn-count"><span>Current turn</span><strong data-testid="text-current-turn">{campaign.turn}</strong></div>
              <button className="button-primary" onClick={advanceTurn} data-testid="button-advance-turn"><ArrowRight size={15} /><span>Advance turn</span></button>
            </div>
          </header>

          <section className="resource-strip" aria-label="Realm resources">
            <div className="resource-card"><div className="resource-label">Treasury</div><div className="resource-value"><Coins size={15} color="#a67035" /><strong data-testid="value-gold">{campaign.gold}</strong><span>gold</span></div></div>
            <div className="resource-card"><div className="resource-label">Granary</div><div className="resource-value"><Wheat size={15} color="#a67035" /><strong data-testid="value-food">{campaign.food}</strong><span>food</span></div></div>
            <div className="resource-card"><div className="resource-label">Royal forces</div><div className="resource-value"><Swords size={15} color="#a67035" /><strong data-testid="value-forces">{campaign.forces}</strong><span>soldiers</span></div></div>
            <div className="resource-card"><div className="resource-label">Held territory</div><div className="resource-value"><Flag size={15} color="#a67035" /><strong data-testid="value-territory">{playerRegions.length}</strong><span>regions</span></div></div>
          </section>

          <div className="content-grid">
            <section className="map-panel map-in">
              <div className="map-head">
                <div><div className="panel-kicker">The known realm</div><h2>Borderlands &amp; banners</h2></div>
                <div className="map-legend"><span className="legend-item"><i className="legend-dot yours" /> Your lands</span><span className="legend-item"><i className="legend-dot rival" /> Rival</span></div>
              </div>
              <div className="map-canvas-wrap" id="map-help">
                <CampaignCanvas
                  regions={canvasRegions}
                  selectedId={selectedId}
                  bannerColor={campaign.banner.color}
                  palette={canvasPalette}
                  onSelect={setSelectedId}
                />
              </div>
              <p className="map-note"><strong>Choose your decision.</strong> Click a region or use the accessible index below to inspect its claim. The map remembers your selection while you explore.</p>
              <section className="accessible-map-index" aria-labelledby="accessible-map-title">
                <div className="accessible-index-heading">
                  <div>
                    <div className="panel-kicker">Keyboard map</div>
                    <h3 id="accessible-map-title">Accessible region index</h3>
                  </div>
                  <span className="mono">{campaign.regions.length} regions</span>
                </div>
                <div className="accessible-region-grid">
                  {campaign.regions.map((region) => (
                    <button
                      type="button"
                      key={region.id}
                      className={`region-index-button ${selectedId === region.id ? 'is-selected' : ''}`}
                      onClick={() => setSelectedId(region.id)}
                      aria-pressed={selectedId === region.id}
                      data-testid={`button-select-region-${region.id}`}
                    >
                      <span>{region.name}</span>
                      <small>{region.kind === 'player' ? 'Your land' : region.kind === 'rival' ? 'Rival claim' : 'Unclaimed'} · {region.settlement} · {region.forces} forces</small>
                    </button>
                  ))}
                </div>
              </section>
            </section>

            <div className="right-stack">
              <section className="panel selection-panel">
                {selected ? (
                  <>
                    <div className="selection-top">
                      <div><div className="panel-kicker">Region dossier</div><h2 className="selection-name" data-testid={`text-selected-region-${selected.id}`}>{selected.name}</h2></div>
                      <span className={`territory-badge ${selected.kind === 'player' ? 'player' : ''}`}>{selected.kind === 'player' ? 'Under your crown' : selected.kind === 'rival' ? 'Rival claim' : 'Unclaimed'}</span>
                    </div>
                    <p className="selection-description">{selected.description}</p>
                    <div className="settlement-meta">
                      <div><span className="meta-label">Settlement</span><strong className="meta-value" data-testid={`value-settlement-${selected.id}`}>{selected.settlement}</strong></div>
                      <div><span className="meta-label">Local forces</span><strong className="meta-value" data-testid={`value-region-forces-${selected.id}`}>{selected.forces}</strong></div>
                      <div><span className="meta-label">Barracks</span><strong className="meta-value" data-testid={`value-barracks-${selected.id}`}>{selected.barracks ? 'Built' : 'None'}</strong></div>
                    </div>
                    {selected.kind === 'player' ? (
                      <div className="action-stack">
                        <button className="button-quiet action-button" onClick={buildBarracks} disabled={selected.barracks || campaign.gold < 80} data-testid="button-build-barracks"><span><Hammer size={14} /> {selected.barracks ? 'Barracks established' : 'Build barracks'}</span><span className="action-cost">{selected.barracks ? <Check size={13} /> : '80 gold'}</span></button>
                        <button className="button-quiet action-button" onClick={upgradeSettlement} disabled={selected.settlement === 'City' || campaign.gold < (selected.settlement === 'Village' ? 110 : 190)} data-testid="button-upgrade-settlement"><span><Landmark size={14} /> {selected.settlement === 'City' ? 'City charter complete' : `Upgrade to ${selected.settlement === 'Village' ? 'town' : 'city'}`}</span><span className="action-cost">{selected.settlement === 'City' ? <Check size={13} /> : `${selected.settlement === 'Village' ? 110 : 190} gold`}</span></button>
                        <button className="button-primary action-button" onClick={recruitForces} disabled={campaign.gold < 25 || campaign.food < 10} data-testid="button-recruit-forces"><span><Users size={14} /> Recruit forces</span><span className="action-cost">25 gold · 10 food</span></button>
                      </div>
                    ) : (
                      <div className="action-stack">
                        <button className="button-primary action-button" onClick={launchAttack} disabled={!selected.adjacent.some((id) => playerRegions.some((region) => region.id === id)) || (selected.adjacent.map((id) => regionById(campaign.regions, id)).find((region) => region?.kind === 'player')?.forces ?? 0) < selected.forces + 12} data-testid="button-launch-attack"><span><Swords size={14} /> Launch attack</span><span className="action-cost">Requires border army</span></button>
                        <div className="mono" style={{ color: '#8a7b63', fontSize: 9, lineHeight: 1.5, padding: '0 3px' }}>A neighboring army must hold enough forces to survive the march.</div>
                      </div>
                    )}
                  </>
                ) : <div className="empty-selection"><Mountain size={26} /><h3>No region selected</h3><p>Choose a shape on the campaign map to read its dossier.</p></div>}
              </section>

              <section className="panel objective-panel">
                <div className="panel-kicker">The first objective</div>
                <h3>Make the map yours.</h3>
                <p>Hold three regions to establish a true kingdom. Build an army, then decide which border to redraw.</p>
                <div className="objective-progress"><span style={{ width: `${objectiveProgress}%` }} /></div>
                <div className="mono" style={{ color: '#d4c18e', fontSize: 9, marginTop: 8 }} data-testid="status-objective">{playerRegions.length} of 3 regions held</div>
              </section>

              <section className="panel" style={{ padding: 18 }}>
                <div className="panel-kicker">Recent dispatches</div>
                <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                  {campaign.log.map((entry, index) => <div key={`${entry}-${index}`} className="mono" data-testid={`text-dispatch-${index}`} style={{ color: index === 0 ? '#a45140' : '#817763', fontSize: 9, lineHeight: 1.4, borderLeft: `2px solid ${index === 0 ? '#c35a45' : '#cbbb9d'}`, paddingLeft: 9 }}>{entry}</div>)}
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>

      {guideOpen && (
        <div className="guide-overlay" onClick={(event) => { if (event.target === event.currentTarget) setGuideOpen(false); }}>
          <aside className="guide-drawer" role="dialog" aria-modal="true" aria-label="Field guide">
            <div className="guide-header"><div><div className="panel-kicker">A primer for sovereigns</div><h2>Field guide</h2></div><button ref={guideCloseRef} className="close-button" onClick={() => setGuideOpen(false)} aria-label="Close guide" data-testid="button-close-guide"><X size={20} /></button></div>
            <div className="guide-section"><h3>Read the map</h3><p>Every region is a decision waiting to be made. Green lands answer to your crown; red lands are rivals; gold lands are still persuadable.</p></div>
            <div className="guide-section"><h3>Grow your realm</h3><ul className="guide-list"><li><Coins size={14} /> <span>Advance a turn to gather gold and food from every region you hold.</span></li><li><Hammer size={14} /> <span>Barracks cost 80 gold and make each recruitment call worth 16 soldiers instead of 10.</span></li><li><Landmark size={14} /> <span>Upgrade villages into towns and towns into cities. Each charter costs more than the last.</span></li></ul></div>
            <div className="guide-section"><h3>Redraw a border</h3><p>Select a rival beside your territory. If your border army has a margin of 12 soldiers over its defenders, the attack button will become available.</p></div>
            <div className="guide-section"><h3>Remember</h3><p>There is no perfect opening. The chronicle saves to this browser after every decision, so you may return whenever the map calls.</p></div>
          </aside>
        </div>
      )}
      {feedback && <div className={`feedback ${feedback.error ? 'error' : ''}`} role="status" data-testid="status-feedback">{feedback.text}</div>}
      <div className="sr-only" aria-live="polite" aria-atomic="true" data-testid="status-live-region">{feedback?.text ?? ''}</div>
    </main>
  );
}

export default App;