import { ArrowRight, RotateCcw, Swords, X } from 'lucide-react';

export type FrontSourceOption = {
  id: string;
  name: string;
  forces: number;
};

export type FrontSummary = {
  id: string;
  name: string;
  sourceRegionId: string;
  targetRegionId: string;
  sourceName: string;
  targetName: string;
  sourceForces: number;
  committedForces: number;
  targetForces: number;
  projectedDefendingForces: number;
  allySupport: number;
  supply: 'Supplied' | 'Broken supply';
  travelTurns: number;
  outcome: 'No forces staged' | 'Strong advantage' | 'Uncertain' | 'Outmatched';
};

export function FrontIndex({
  fronts,
  selectedFrontId,
  onSelect,
}: {
  fronts: FrontSummary[];
  selectedFrontId: string | null;
  onSelect: (front: FrontSummary) => void;
}) {
  return (
    <section className="front-index" aria-labelledby="front-index-title">
      <div className="accessible-index-heading">
        <div>
          <div className="panel-kicker">Army movements</div>
          <h3 id="front-index-title">Active fronts</h3>
        </div>
        <span className="mono">{fronts.length} {fronts.length === 1 ? 'front' : 'fronts'}</span>
      </div>
      {fronts.length ? (
        <div className="front-index-list">
          {fronts.map((front) => (
            <button
              type="button"
              key={front.id}
              className={`front-index-button ${selectedFrontId === front.id ? 'is-selected' : ''}`}
              onClick={() => onSelect(front)}
              aria-pressed={selectedFrontId === front.id}
              data-testid={`button-select-front-${front.id}`}
            >
              <span>
                <strong>{front.name}</strong>
                <small>{front.sourceName} → {front.targetName}</small>
              </span>
              <em>{front.committedForces} staged</em>
            </button>
          ))}
        </div>
      ) : (
        <p className="front-index-empty">No armies are staged. Select a rival or neutral border to establish a front.</p>
      )}
    </section>
  );
}

export function FrontPlanner({
  targetName,
  name,
  sourceOptions,
  sourceId,
  allocation,
  onNameChange,
  onSourceChange,
  onAllocationChange,
  onCreate,
}: {
  targetName: string;
  name: string;
  sourceOptions: FrontSourceOption[];
  sourceId: string;
  allocation: number;
  onNameChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onAllocationChange: (value: number) => void;
  onCreate: () => void;
}) {
  const selectedSource = sourceOptions.find((source) => source.id === sourceId);
  const maxAllocation = selectedSource?.forces ?? 0;
  const safeAllocation = Number.isFinite(allocation) ? Math.max(0, Math.min(allocation, maxAllocation)) : 0;

  return (
    <section className="front-planner" aria-labelledby="front-planner-title">
      <div className="front-section-heading">
        <div>
          <div className="panel-kicker">Border command</div>
          <h3 id="front-planner-title">Establish a front</h3>
        </div>
        <span className="front-target"><ArrowRight size={12} aria-hidden="true" /> {targetName}</span>
      </div>
      <label className="front-field">
        <span>Front name</span>
        <input
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          maxLength={48}
          placeholder={`${targetName} Front`}
          data-testid="input-front-name"
        />
      </label>
      <label className="front-field">
        <span>Source region</span>
        <select
          value={sourceId}
          onChange={(event) => onSourceChange(event.target.value)}
          disabled={!sourceOptions.length}
          data-testid="select-front-source"
        >
          {sourceOptions.map((source) => (
            <option key={source.id} value={source.id}>
              {source.name} · {source.forces} available
            </option>
          ))}
        </select>
      </label>
      <div className="front-allocation">
        <div className="front-allocation-heading">
          <label htmlFor="new-front-forces">Soldiers to stage</label>
          <output htmlFor="new-front-forces" aria-live="polite">{safeAllocation}</output>
        </div>
        <input
          id="new-front-forces"
          type="range"
          min={0}
          max={maxAllocation}
          step={1}
          value={safeAllocation}
          onChange={(event) => onAllocationChange(Number(event.target.value))}
          disabled={!sourceOptions.length}
          aria-label="Soldiers to stage at this front"
          data-testid="range-front-forces"
        />
        <input
          className="front-number-input"
          type="number"
          min={0}
          max={maxAllocation}
          step={1}
          value={safeAllocation}
          onChange={(event) => onAllocationChange(Number(event.target.value))}
          disabled={!sourceOptions.length}
          aria-label="Exact soldiers to stage"
          data-testid="input-front-forces"
        />
      </div>
      <button
        type="button"
        className="button-primary front-create-button"
        onClick={onCreate}
        disabled={!sourceOptions.length}
        data-testid="button-create-front"
      >
        <Swords size={14} aria-hidden="true" /> Create front and stage forces
      </button>
    </section>
  );
}

export function FrontDossier({
  front,
  allocation,
  maxAllocation,
  onAllocationChange,
  onRecall,
  onCancel,
  onAttack,
}: {
  front: FrontSummary;
  allocation: number;
  maxAllocation: number;
  onAllocationChange: (value: number) => void;
  onRecall: () => void;
  onCancel: () => void;
  onAttack: () => void;
}) {
  const safeAllocation = Number.isFinite(allocation) ? Math.max(0, Math.min(allocation, maxAllocation)) : 0;

  return (
    <section className="front-dossier" aria-labelledby="front-dossier-title">
      <div className="front-section-heading">
        <div>
          <div className="panel-kicker">Selected order</div>
          <h3 id="front-dossier-title">{front.name}</h3>
        </div>
        <span className={`front-outcome-badge front-outcome-${front.outcome.toLowerCase().replaceAll(' ', '-')}`}>
          {front.outcome}
        </span>
      </div>
      <p className="front-route">{front.sourceName} <ArrowRight size={13} aria-hidden="true" /> {front.targetName}</p>
      <dl className="front-metrics">
        <div><dt>Available in source</dt><dd>{front.sourceForces}</dd></div>
        <div><dt>Committed here</dt><dd>{front.committedForces}</dd></div>
        <div><dt>Defending after change</dt><dd>{front.projectedDefendingForces}</dd></div>
              <div><dt>Defender strength</dt><dd>{front.targetForces}</dd></div>
              <div><dt>Ally support</dt><dd>{front.allySupport ? `+${front.allySupport}` : 'None'}</dd></div>
        <div><dt>Supply status</dt><dd>{front.supply}</dd></div>
        <div><dt>Travel time</dt><dd>{front.travelTurns} turn</dd></div>
      </dl>
      <div className="front-allocation">
        <div className="front-allocation-heading">
          <label htmlFor={`front-forces-${front.id}`}>Projected attack strength</label>
          <output htmlFor={`front-forces-${front.id}`} aria-live="polite">{safeAllocation}</output>
        </div>
        <input
          id={`front-forces-${front.id}`}
          type="range"
          min={0}
          max={maxAllocation}
          step={1}
          value={safeAllocation}
          onChange={(event) => onAllocationChange(Number(event.target.value))}
          aria-label={`Projected attack strength for ${front.name}`}
          data-testid={`range-front-forces-${front.id}`}
        />
        <input
          className="front-number-input"
          type="number"
          min={0}
          max={maxAllocation}
          step={1}
          value={safeAllocation}
          onChange={(event) => onAllocationChange(Number(event.target.value))}
          aria-label={`Exact committed soldiers for ${front.name}`}
          data-testid={`input-front-forces-${front.id}`}
        />
      </div>
      <p className="front-preview">
        {front.outcome === 'Strong advantage'
          ? `Your ${safeAllocation} soldiers should break the ${front.targetName} line.`
          : front.outcome === 'Uncertain'
          ? `The line may hold. Add soldiers for a stronger advantage over ${front.targetName}.`
            : front.outcome === 'Outmatched'
              ? `${front.targetName} has more defenders than this front can currently field.`
              : 'Stage soldiers to preview the outcome before committing the attack.'}
      </p>
      <div className="front-action-row">
        <button type="button" className="button-quiet" onClick={onRecall} disabled={!front.committedForces} data-testid={`button-recall-front-${front.id}`}>
          <RotateCcw size={13} aria-hidden="true" /> Recall staged
        </button>
        <button type="button" className="button-quiet" onClick={onCancel} data-testid={`button-cancel-front-${front.id}`}>
          <X size={13} aria-hidden="true" /> Cancel front
        </button>
        <button type="button" className="button-primary" onClick={onAttack} disabled={!front.committedForces} data-testid="button-attack-front">
          <Swords size={13} aria-hidden="true" /> Attack
        </button>
      </div>
    </section>
  );
}