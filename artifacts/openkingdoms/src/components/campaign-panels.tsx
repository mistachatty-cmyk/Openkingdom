import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, Check, CircleAlert, Flag, Landmark, Route, Swords, Wheat } from 'lucide-react';

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
  strongholdLevel?: number;
};

export type TurnSummary = {
  turn: number;
  headline: string;
  items: string[];
};

export type CampaignEventCategory =
  | 'harvest'
  | 'settlement'
  | 'border'
  | 'scouting'
  | 'trade'
  | 'diplomacy'
  | 'readiness';

export type CampaignEventChoice = {
  id: string;
  label: string;
  description: string;
};

export type CampaignEvent = {
  id: string;
  turn: number;
  category: CampaignEventCategory;
  title: string;
  description: string;
  prompt: string;
  subjectRegionId?: string;
  subjectName?: string;
  choices: CampaignEventChoice[];
};

export type CampaignMilestone = {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  detail: string;
  complete: boolean;
};

export function CampaignPrimer({
  selectedName,
  selectedKind,
  commerceEnabled,
  diplomacyEnabled,
}: {
  selectedName: string | null;
  selectedKind: 'player' | 'rival' | 'neutral' | null;
  commerceEnabled: boolean;
  diplomacyEnabled: boolean;
}) {
  return (
    <section className="campaign-primer" aria-labelledby="campaign-primer-title" data-testid="panel-campaign-primer">
      <div className="campaign-primer-heading">
        <div>
          <div className="panel-kicker">Your first five minutes</div>
          <h2 id="campaign-primer-title">How to move the realm</h2>
        </div>
        <Landmark size={18} aria-hidden="true" />
      </div>
      <p className="campaign-primer-intro">
        Inspect {selectedName ? <strong>{selectedName}</strong> : 'a province'}, choose one clear action, then resolve a turn and read what changed.
      </p>
      <ol className="campaign-primer-steps">
        <li><span>01</span><div><strong>Inspect</strong><small>Click a province or use the province index to read its owner, settlement, forces, terrain, and nearby borders.</small></div></li>
         <li><span>02</span><div><strong>Develop or move</strong><small>{selectedKind === 'player' ? 'Build, upgrade, or recruit here. Fortify the county when you want a stronger defensive reserve. To expand, select a neighboring border and stage soldiers from this province.' : 'Select a neighboring border to choose a player-held source, set the levy, and preview the line.'}</small></div></li>
        <li><span>03</span><div><strong>Resolve and review</strong><small>Advance the turn to march armies and gather stores. Arrived fronts can attack; the resolution brief and chronicle explain every result.</small></div></li>
      </ol>
      <p className="campaign-primer-note">
        {commerceEnabled ? 'Commerce is active: production, consumption, shortages, and routes change your choices.' : 'Baseline stores stay steady while you learn the border loop.'}
        {diplomacyEnabled ? ' Courts and treaties can protect or close a border.' : ' Diplomacy can be awakened later from Campaign systems.'}
      </p>
    </section>
  );
}

export function MilestonePanel({ milestones }: { milestones: CampaignMilestone[] }) {
  return (
    <section className="panel milestone-panel" aria-labelledby="milestone-panel-title" data-testid="panel-campaign-milestones">
      <div className="milestone-heading">
        <div>
          <div className="panel-kicker">Chapter markers</div>
          <h2 id="milestone-panel-title">The road to a kingdom</h2>
        </div>
        <span className="mono">{milestones.filter((milestone) => milestone.complete).length} of {milestones.length} complete</span>
      </div>
      <div className="milestone-list">
        {milestones.map((milestone) => (
          <div className={`milestone-row ${milestone.complete ? 'is-complete' : ''}`} key={milestone.id} data-testid={`milestone-${milestone.id}`}>
            <span className="milestone-mark" aria-hidden="true">{milestone.complete ? <Check size={12} /> : <span />}</span>
            <div className="milestone-copy">
              <strong>{milestone.title}</strong>
              <small>{milestone.description}</small>
              <div className="milestone-progress" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.round((milestone.progress / milestone.target) * 100))}%` }} /></div>
            </div>
            <em>{milestone.detail}</em>
          </div>
        ))}
      </div>
    </section>
  );
}

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

const eventCategoryLabels: Record<CampaignEventCategory, string> = {
  harvest: 'Harvest report',
  settlement: 'Settlement life',
  border: 'Border pressure',
  scouting: 'Scouting report',
  trade: 'Trade dispatch',
  diplomacy: 'Court affairs',
  readiness: 'Military readiness',
};

export function CampaignEventPanel({
  event,
  onChoose,
  getChoiceDisabledReason,
  readOnly = false,
}: {
  event: CampaignEvent;
  onChoose: (choiceId: string) => void;
  getChoiceDisabledReason?: (choice: CampaignEventChoice) => string | undefined;
  readOnly?: boolean;
}) {
  return (
    <section
      className="campaign-event-panel"
      aria-labelledby="campaign-event-title"
      aria-live="polite"
      data-testid="panel-campaign-event"
    >
      <div className="campaign-event-heading">
        <div>
          <div className="panel-kicker">{eventCategoryLabels[event.category]} · Turn {event.turn}</div>
          <h2 id="campaign-event-title">{event.title}</h2>
        </div>
        <span className="campaign-event-mark" aria-hidden="true">!</span>
      </div>
      <p className="campaign-event-description">{event.description}</p>
      <p className="campaign-event-prompt">{event.prompt}</p>
      <div className="campaign-event-choices">
        {event.choices.map((choice) => {
          const disabledReason = getChoiceDisabledReason?.(choice);
          return (
            <div className="campaign-event-choice" key={choice.id}>
              <button
                type="button"
                className="button-quiet"
                onClick={() => onChoose(choice.id)}
                disabled={readOnly || Boolean(disabledReason)}
                data-testid={`button-event-choice-${choice.id}`}
              >
                <span>{choice.label}</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
              <p>{choice.description}</p>
              {disabledReason && <small className="campaign-event-disabled">{disabledReason}</small>}
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
                    {region.strongholdLevel ? ` · Stronghold ${'I'.repeat(Math.min(3, region.strongholdLevel))}` : ''}
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