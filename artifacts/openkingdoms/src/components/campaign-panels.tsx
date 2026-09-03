import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, Check, CircleAlert, Flag, Route, Swords, Wheat } from 'lucide-react';

export type ResourceItem = {
  label: string;
  value: number;
  unit: string;
  icon: LucideIcon;
  testId?: string;
};

export type RegionIndexItem = {
  id: string;
  chunkId?: string;
  name: string;
  kind: 'player' | 'rival' | 'neutral';
  settlement: 'Village' | 'Town' | 'City';
  forces: number;
};

export type TurnSummary = {
  turn: number;
  headline: string;
  items: string[];
};

export function TurnSummaryPanel({ summary }: { summary: TurnSummary }) {
  return (
    <section className="turn-summary-panel" aria-labelledby="turn-summary-title" data-testid="panel-turn-summary">
      <div className="turn-summary-heading">
        <div>
          <div className="panel-kicker">Latest resolution · Turn {summary.turn}</div>
          <h2 id="turn-summary-title">{summary.headline}</h2>
        </div>
        <span className="turn-summary-mark" aria-hidden="true"><Check size={15} /></span>
      </div>
      <div className="turn-summary-items">
        {summary.items.map((item, index) => {
          const Icon = index === 0 ? Wheat : item.toLowerCase().includes('front') || item.toLowerCase().includes('army')
            ? Swords
            : item.toLowerCase().includes('rival') || item.toLowerCase().includes('border')
              ? Flag
              : item.toLowerCase().includes('route') || item.toLowerCase().includes('trade')
                ? Route
                : item.toLowerCase().includes('treaty') || item.toLowerCase().includes('court')
                  ? CircleAlert
                  : ArrowRight;
          return (
            <div className="turn-summary-item" key={`${summary.turn}-${index}`}>
              <Icon size={13} aria-hidden="true" />
              <span>{item}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ResourceStrip({ items }: { items: ResourceItem[] }) {
  return (
    <section className="resource-strip" aria-label="Realm resources">
      {items.map(({ label, value, unit, icon: Icon, testId }) => (
        <div className="resource-card" key={label}>
          <div className="resource-label">{label}</div>
          <div className="resource-value">
            <Icon className="resource-icon" size={15} aria-hidden="true" />
            <strong data-testid={testId}>{value}</strong>
            <span>{unit}</span>
          </div>
        </div>
      ))}
    </section>
  );
}

function getRegionStatus(kind: RegionIndexItem['kind']) {
  if (kind === 'player') return 'Your land';
  if (kind === 'rival') return 'Rival claim';
  return 'Unclaimed';
}

const CORE_REGION_IDS = new Set([
  'aurelian',
  'bracken',
  'saltmere',
  'highvale',
  'ironwood',
  'northwatch',
  'sunfall',
]);

export function AccessibleRegionIndex({
  regions,
  selectedId,
  onSelect,
}: {
  regions: RegionIndexItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRegions = useMemo(
    () => regions.filter((region) => !normalizedQuery || region.name.toLowerCase().includes(normalizedQuery) || region.id.includes(normalizedQuery)),
    [normalizedQuery, regions],
  );
  const prioritizedRegions = useMemo(
    () => [...filteredRegions].sort((first, second) => {
      if (first.id === selectedId) return -1;
      if (second.id === selectedId) return 1;
      if (CORE_REGION_IDS.has(first.id) && !CORE_REGION_IDS.has(second.id)) return -1;
      if (CORE_REGION_IDS.has(second.id) && !CORE_REGION_IDS.has(first.id)) return 1;
      if (first.kind === 'player' && second.kind !== 'player') return -1;
      if (second.kind === 'player' && first.kind !== 'player') return 1;
      return first.name.localeCompare(second.name);
    }),
    [filteredRegions, selectedId],
  );
  const visibleRegions = showAll || normalizedQuery ? prioritizedRegions : prioritizedRegions.slice(0, 8);

  return (
    <section className="accessible-map-index" aria-labelledby="accessible-map-title">
      <div className="accessible-index-heading">
        <div>
          <div className="panel-kicker">Province index</div>
          <h3 id="accessible-map-title">Accessible region index</h3>
        </div>
        <span className="mono">{filteredRegions.length} of {regions.length} provinces</span>
      </div>
      <label className="accessible-index-search">
        <span className="sr-only">Search regions by name</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search provinces by name"
          aria-label="Search provinces by name"
          data-testid="input-region-search"
        />
      </label>
      <div className="accessible-region-groups">
        <div className="accessible-region-group">
          <h4>{normalizedQuery ? 'Matching provinces' : showAll ? 'All provinces' : 'Your realm & nearby borders'}</h4>
          <div className="accessible-region-grid">
            {visibleRegions.map((region) => (
                <button
                  type="button"
                  key={region.id}
                  className={`region-index-button ${selectedId === region.id ? 'is-selected' : ''}`}
                  onClick={() => onSelect(region.id)}
                  aria-pressed={selectedId === region.id}
                  data-testid={`button-select-region-${region.id}`}
                >
                  <span>{region.name}</span>
                  <small>
                    {getRegionStatus(region.kind)} · {region.settlement} · {region.forces} forces
                  </small>
                </button>
            ))}
          </div>
        </div>
      </div>
      {!filteredRegions.length && <p className="accessible-index-empty">No provinces match that search.</p>}
      {filteredRegions.length > visibleRegions.length && (
        <button type="button" className="button-quiet accessible-index-more" onClick={() => setShowAll((current) => !current)}>
           {showAll ? 'Show nearby provinces only' : `Show all ${filteredRegions.length} provinces`}
        </button>
      )}
    </section>
  );
}

export function DispatchList({ entries }: { entries: string[] }) {
  const recentEntryCount = 4;
  const [showFullHistory, setShowFullHistory] = useState(false);
  const visibleEntries = showFullHistory ? entries : entries.slice(0, recentEntryCount);
  const olderEntryCount = Math.max(0, entries.length - recentEntryCount);

  return (
    <section className="panel dispatch-panel" aria-labelledby="chronicle-title" aria-live="polite">
      <div className="dispatch-heading">
        <div>
          <div className="panel-kicker">Campaign chronicle</div>
          <h2 id="chronicle-title">Recent dispatches</h2>
        </div>
        <span className="mono dispatch-count">
          {entries.length} {entries.length === 1 ? 'record' : 'records'}
        </span>
      </div>
      <div className="dispatch-list" id="dispatch-history-list">
        {visibleEntries.map((entry, index) => (
          <div
            key={`${entry}-${index}`}
            className={`dispatch-entry ${index === 0 ? 'is-latest' : ''}`}
            data-testid={`text-dispatch-${index}`}
          >
            {entry}
          </div>
        ))}
      </div>
      {olderEntryCount > 0 && (
        <button
          type="button"
          className="button-quiet dispatch-history-toggle"
          onClick={() => setShowFullHistory((current) => !current)}
          aria-expanded={showFullHistory}
          aria-controls="dispatch-history-list"
          data-testid="button-toggle-dispatch-history"
        >
          {showFullHistory ? 'Show recent dispatches' : `Review full chronicle · ${olderEntryCount} older`}
        </button>
      )}
    </section>
  );
}