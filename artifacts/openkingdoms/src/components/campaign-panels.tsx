import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

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
  const groupedRegions = useMemo(() => {
    const groups = new Map<string, RegionIndexItem[]>();
    filteredRegions.forEach((region) => {
      const groupKey = region.chunkId ?? 'chunk-0-0';
      const group = groups.get(groupKey) ?? [];
      group.push(region);
      groups.set(groupKey, group);
    });
    return [...groups.entries()];
  }, [filteredRegions]);
  const visibleGroups = showAll || normalizedQuery ? groupedRegions : groupedRegions.slice(0, 4);
  const visibleRegionCount = visibleGroups.reduce((count, [, group]) => count + group.length, 0);

  return (
    <section className="accessible-map-index" aria-labelledby="accessible-map-title">
      <div className="accessible-index-heading">
        <div>
          <div className="panel-kicker">Chart index</div>
          <h3 id="accessible-map-title">Find a province</h3>
        </div>
        <span className="mono">{filteredRegions.length} of {regions.length} provinces</span>
      </div>
      <label className="accessible-index-search">
        <span className="sr-only">Search regions by name</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the chart by province"
          aria-label="Search provinces by name"
          data-testid="input-region-search"
        />
      </label>
      <div className="accessible-region-groups">
        {visibleGroups.map(([chunkId, group]) => (
          <div className="accessible-region-group" key={chunkId}>
            <h4>{chunkId.replace('chunk-', 'Chart sector ')}</h4>
            <div className="accessible-region-grid">
              {group.map((region) => (
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
        ))}
      </div>
      {!filteredRegions.length && <p className="accessible-index-empty">No provinces match that search.</p>}
      {filteredRegions.length > visibleRegionCount && (
        <button type="button" className="button-quiet accessible-index-more" onClick={() => setShowAll((current) => !current)}>
           {showAll ? 'Show nearby sectors only' : `Show all ${filteredRegions.length} provinces`}
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