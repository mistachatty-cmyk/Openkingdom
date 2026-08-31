import type { LucideIcon } from 'lucide-react';

export type ResourceItem = {
  label: string;
  value: number;
  unit: string;
  icon: LucideIcon;
};

export type RegionIndexItem = {
  id: string;
  name: string;
  kind: 'player' | 'rival' | 'neutral';
  settlement: 'Village' | 'Town' | 'City';
  forces: number;
};

export function ResourceStrip({ items }: { items: ResourceItem[] }) {
  return (
    <section className="resource-strip" aria-label="Realm resources">
      {items.map(({ label, value, unit, icon: Icon }) => (
        <div className="resource-card" key={label}>
          <div className="resource-label">{label}</div>
          <div className="resource-value">
            <Icon className="resource-icon" size={15} aria-hidden="true" />
            <strong>{value}</strong>
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
  return (
    <section className="accessible-map-index" aria-labelledby="accessible-map-title">
      <div className="accessible-index-heading">
        <div>
          <div className="panel-kicker">Keyboard map</div>
          <h3 id="accessible-map-title">Accessible region index</h3>
        </div>
        <span className="mono">{regions.length} regions</span>
      </div>
      <div className="accessible-region-grid">
        {regions.map((region) => (
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
    </section>
  );
}

export function DispatchList({ entries }: { entries: string[] }) {
  return (
    <section className="panel dispatch-panel">
      <div className="panel-kicker">Recent dispatches</div>
      <div className="dispatch-list">
        {entries.map((entry, index) => (
          <div
            key={`${entry}-${index}`}
            className={`dispatch-entry ${index === 0 ? 'is-latest' : ''}`}
            data-testid={`text-dispatch-${index}`}
          >
            {entry}
          </div>
        ))}
      </div>
    </section>
  );
}