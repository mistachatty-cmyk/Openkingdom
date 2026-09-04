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
  strongholdLevel: number;
  strongholdDefense: number;
  strongholdUpkeep: number;
  strongholdGarrison: number;
  sourceGarrison: number;
  projectedDefendingForces: number;
  allySupport: number;
  supply: 'Supplied' | 'Broken supply';
  status: 'staged' | 'marching' | 'arrived' | 'resolved';
  travelTurns: number;
  outcome: 'No forces staged' | 'Strong advantage' | 'Uncertain' | 'Outmatched';
};

function frontStatusLabel(status: FrontSummary['status']) {
  return status === 'staged' ? 'Staged' : status === 'marching' ? 'Marching' : status === 'arrived' ? 'Arrived' : 'Resolved';
}

function frontTimingLabel(status: FrontSummary['status'], travelTurns: number) {
  if (status === 'arrived') return 'Army arrived · attack may be ordered';
  if (status === 'marching') return `${travelTurns} turn${travelTurns === 1 ? '' : 's'} until arrival`;
  if (status === 'staged') return `Staged · resolves into a march next turn · ${travelTurns} turn${travelTurns === 1 ? '' : 's'} until arrival`;
  return 'Order resolved';
}

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
               <em><strong className={`front-status front-status-${front.status}`}>{frontStatusLabel(front.status)}</strong> · {front.committedForces} soldiers · {front.status === 'arrived' ? 'ready' : `${front.travelTurns} turn${front.travelTurns === 1 ? '' : 's'}`}</em>
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
  readOnly = false,
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
  readOnly?: boolean;
}) {
  const selectedSource = sourceOptions.find((source) => source.id === sourceId);
  const maxAllocation = selectedSource?.forces ?? 0;
  const safeAllocation = Number.isFinite(allocation) ? Math.max(0, Math.min(allocation, maxAllocation)) : 0;

  return (
    <section className="front-planner" aria-labelledby="front-planner-title" data-testid="panel-front-planner">
      <div className="front-section-heading">
        <div>
          <div className="panel-kicker">Border command</div>
          <h3 id="front-planner-title">Establish a front</h3>
        </div>
        <span className="front-target"><ArrowRight size={12} aria-hidden="true" /> {targetName}</span>
      </div>
      <p className="front-instructions">Choose a player-held source, stage a levy, then advance the turn to march. The attack order unlocks when the army arrives; you can revise or recall it before then.</p>
      <label className="front-field">
        <span>Front name</span>
        <input
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          disabled={readOnly}
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
          disabled={readOnly || !sourceOptions.length}
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
          disabled={readOnly || !sourceOptions.length}
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
          disabled={readOnly || !sourceOptions.length}
          aria-label="Exact soldiers to stage"
          data-testid="input-front-forces"
        />
      </div>
      <button
        type="button"
        className="button-primary front-create-button"
        onClick={onCreate}
        disabled={readOnly || !sourceOptions.length}
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
  readOnly = false,
}: {
  front: FrontSummary;
  allocation: number;
  maxAllocation: number;
  onAllocationChange: (value: number) => void;
  onRecall: () => void;
  onCancel: () => void;
  onAttack: () => void;
  readOnly?: boolean;
}) {
  const safeAllocation = Number.isFinite(allocation) ? Math.max(0, Math.min(allocation, maxAllocation)) : 0;

  return (
    <section className="front-dossier" aria-labelledby="front-dossier-title" data-testid="panel-front-dossier">
      <div className="front-section-heading">
        <div>
          <div className="panel-kicker">Selected order</div>
          <h3 id="front-dossier-title">{front.name}</h3>
        </div>
         <span className={`front-outcome-badge front-outcome-${front.outcome.toLowerCase().replaceAll(' ', '-')}`}>
           {frontStatusLabel(front.status)} · {front.outcome}
         </span>
      </div>
      <p className="front-route">{front.sourceName} <ArrowRight size={13} aria-hidden="true" /> {front.targetName}</p>
      <dl className="front-metrics">
        <div><dt>Source reserve</dt><dd>{front.sourceForces}</dd></div>
        <div><dt>Committed attack</dt><dd>{front.committedForces}</dd></div>
        <div><dt>Source after staging</dt><dd>{front.projectedDefendingForces}</dd></div>
        <div><dt>Defender strength</dt><dd>{front.targetForces + front.strongholdDefense}</dd></div>
        <div><dt>County stronghold</dt><dd>{front.strongholdDefense ? `+${front.strongholdDefense} defense` : 'None'}</dd></div>
        <div><dt>Garrison commitment</dt><dd>{front.strongholdGarrison ? `${front.strongholdGarrison} held locally` : 'None'}</dd></div>
        <div><dt>Stronghold upkeep</dt><dd>{front.strongholdUpkeep ? `-${front.strongholdUpkeep} gold / turn` : 'None'}</dd></div>
        <div><dt>Source garrison</dt><dd>{front.sourceGarrison ? `${front.sourceGarrison} held locally` : 'None'}</dd></div>
        <div><dt>Ally support</dt><dd>{front.allySupport ? `+${front.allySupport}` : 'None'}</dd></div>
        <div><dt>Supply status</dt><dd>{front.supply}</dd></div>
         <div><dt>Order status</dt><dd>{frontStatusLabel(front.status)}</dd></div>
         <div><dt>Travel time</dt><dd>{front.status === 'arrived' ? 'Arrived' : `${front.travelTurns} turn${front.travelTurns === 1 ? '' : 's'} remaining`}</dd></div>
      </dl>
       <p className={`front-timing front-timing-${front.status}`} role="status">{frontTimingLabel(front.status, front.travelTurns)}</p>
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
          disabled={readOnly}
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
          disabled={readOnly}
          aria-label={`Exact committed soldiers for ${front.name}`}
          data-testid={`input-front-forces-${front.id}`}
        />
      </div>
      <p className="front-preview">
        {front.outcome === 'Strong advantage'
          ? `${safeAllocation} committed${front.allySupport ? ` + ${front.allySupport} support` : ''} should break the ${front.targetName} line.`
          : front.outcome === 'Uncertain'
          ? `The line may hold. Add soldiers for a stronger advantage over ${front.targetName}.`
            : front.outcome === 'Outmatched'
              ? `${front.targetName} has ${front.targetForces} defenders. This order needs ${Math.max(1, front.targetForces + 1 - safeAllocation - front.allySupport)} more soldiers to edge past the line.`
              : 'Stage soldiers to preview the outcome before committing the attack.'}
      </p>
      <div className="front-action-row">
          <button type="button" className="button-quiet" onClick={onRecall} disabled={readOnly || !front.committedForces} data-testid={`button-recall-front-${front.id}`}>
          <RotateCcw size={13} aria-hidden="true" /> Recall staged
        </button>
        <button type="button" className="button-quiet" onClick={onCancel} disabled={readOnly} data-testid={`button-cancel-front-${front.id}`}>
          <X size={13} aria-hidden="true" /> Cancel front
        </button>
         <button type="button" className="button-primary" onClick={onAttack} disabled={readOnly || front.status !== 'arrived' || !front.committedForces} data-testid="button-attack-front">
          <Swords size={13} aria-hidden="true" /> Attack
        </button>
      </div>
    </section>
  );
}