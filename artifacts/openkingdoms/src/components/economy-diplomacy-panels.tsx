import type { ReactNode } from 'react';
import {
  ArrowDownUp,
  Ban,
  Check,
  CircleAlert,
  Coins,
  Handshake,
  RefreshCw,
  Route,
  ScrollText,
  Shield,
  Swords,
  Wheat,
  X,
} from 'lucide-react';

export const RESOURCE_TYPES = ['grain', 'timber', 'iron', 'salt'] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];
export type ResourceLedger = Record<ResourceType, number>;
export type RelationshipState = 'neutral' | 'friendly' | 'trading' | 'allied' | 'hostile' | 'war';
export type TreatyKind = 'trade' | 'non-aggression' | 'defensive-alliance' | 'military-aid' | 'peace';
export type TradeRouteStatus = 'active' | 'disrupted' | 'blocked' | 'shortage' | 'embargoed' | 'expired';

export type TreatyView = {
  id: string;
  kind: TreatyKind;
  label: string;
  remainingTurns: number;
};

export type TradeRouteView = {
  id: string;
  partnerRegionId: string;
  partnerName: string;
  sourceName: string;
  exportResource: ResourceType;
  importResource: ResourceType;
  income: number;
  upkeep: number;
  remainingTurns: number;
  risk: number;
  status: TradeRouteStatus;
  statusReason: string;
};

export type TradeSourceOption = {
  id: string;
  name: string;
  resources: ResourceType[];
};

export type DiplomacyPartnerView = {
  id: string;
  name: string;
  relationship: RelationshipState;
  relationshipReason: string;
  sharedBorder: boolean;
  embargoed: boolean;
  treaties: TreatyView[];
  route: TradeRouteView | null;
  offers: {
    envoy: { enabled: boolean; reason: string };
    trade: { enabled: boolean; reason: string };
    nonAggression: { enabled: boolean; reason: string };
    alliance: { enabled: boolean; reason: string };
    militaryAid: { enabled: boolean; reason: string };
    peace: { enabled: boolean; reason: string };
  };
};

const resourceNames: Record<ResourceType, string> = {
  grain: 'Grain',
  timber: 'Timber',
  iron: 'Iron',
  salt: 'Salt',
};

const relationshipNames: Record<RelationshipState, string> = {
  neutral: 'Neutral',
  friendly: 'Friendly',
  trading: 'Trading partner',
  allied: 'Ally',
  hostile: 'Hostile',
  war: 'At war',
};

const treatyNames: Record<TreatyKind, string> = {
  trade: 'Trade agreement',
  'non-aggression': 'Non-aggression pact',
  'defensive-alliance': 'Defensive alliance',
  'military-aid': 'Military aid charter',
  peace: 'Peace terms',
};

function ResourceIcon({ resource }: { resource: ResourceType }) {
  if (resource === 'grain') return <Wheat size={13} aria-hidden="true" />;
  if (resource === 'timber') return <Route size={13} aria-hidden="true" />;
  if (resource === 'iron') return <Shield size={13} aria-hidden="true" />;
  return <Coins size={13} aria-hidden="true" />;
}

function relationshipClass(relationship: RelationshipState) {
  return `relationship-${relationship}`;
}

export function EconomyPanel({
  stocks,
  production,
  consumption,
  shortages,
  tradeIncome,
  tradeUpkeep,
  militaryAid,
}: {
  stocks: ResourceLedger;
  production: ResourceLedger;
  consumption: ResourceLedger;
  shortages: ResourceType[];
  tradeIncome: number;
  tradeUpkeep: number;
  militaryAid: number;
}) {
  return (
    <section className="panel economy-panel" aria-labelledby="economy-panel-title">
      <div className="economy-heading">
        <div>
          <div className="panel-kicker">Realm economy</div>
          <h2 id="economy-panel-title">The stores &amp; roads</h2>
        </div>
        <span className="economy-net">
          <ArrowDownUp size={13} aria-hidden="true" /> {tradeIncome - tradeUpkeep >= 0 ? '+' : ''}{tradeIncome - tradeUpkeep} gold / turn
        </span>
      </div>
      <div className="economy-ledger">
        {RESOURCE_TYPES.map((resource) => {
          const net = production[resource] - consumption[resource];
          const shortage = shortages.includes(resource);
          return (
            <div className={`economy-resource ${shortage ? 'is-short' : ''}`} key={resource}>
              <div className="economy-resource-name"><ResourceIcon resource={resource} /> <span>{resourceNames[resource]}</span></div>
              <strong>{stocks[resource]}</strong>
              <small>{production[resource]} made · {consumption[resource]} used · {net >= 0 ? '+' : ''}{net}</small>
            </div>
          );
        })}
      </div>
      <div className="economy-footer">
        <span><Route size={12} aria-hidden="true" /> Trade net: {tradeIncome - tradeUpkeep >= 0 ? '+' : ''}{tradeIncome - tradeUpkeep} gold</span>
        <span><Shield size={12} aria-hidden="true" /> Ally aid ready: {militaryAid}</span>
      </div>
      {shortages.length ? (
        <p className="economy-warning" role="status"><CircleAlert size={13} aria-hidden="true" /> Shortage: {shortages.map((resource) => resourceNames[resource]).join(', ')}. Routes using scarce goods may be disrupted.</p>
      ) : (
        <p className="economy-note">Settlement output rises with every charter. Keep consumption covered before a long campaign.</p>
      )}
    </section>
  );
}

export function TradePanel({
  partnerName,
  route,
  sourceOptions,
  sourceId,
  exportResource,
  importResource,
  canEstablish,
  establishReason,
  onSourceChange,
  onExportChange,
  onImportChange,
  onEstablish,
  onCancel,
  onRenew,
}: {
  partnerName: string | null;
  route: TradeRouteView | null;
  sourceOptions: TradeSourceOption[];
  sourceId: string;
  exportResource: ResourceType;
  importResource: ResourceType;
  canEstablish: boolean;
  establishReason: string;
  onSourceChange: (value: string) => void;
  onExportChange: (value: ResourceType) => void;
  onImportChange: (value: ResourceType) => void;
  onEstablish: () => void;
  onCancel: () => void;
  onRenew: () => void;
}) {
  return (
    <section className="panel trade-panel" aria-labelledby="trade-panel-title">
      <div className="panel-heading-row">
        <div>
          <div className="panel-kicker">Exchange desk</div>
          <h2 id="trade-panel-title">Trade routes</h2>
        </div>
        <Route size={18} className="panel-heading-icon" aria-hidden="true" />
      </div>
      {partnerName ? (
        route ? (
          <>
            <div className="route-status-row">
              <strong>{route.sourceName} → {route.partnerName}</strong>
              <span className={`route-status route-status-${route.status}`}>{route.status}</span>
            </div>
            <dl className="route-metrics">
              <div><dt>Exports</dt><dd>{resourceNames[route.exportResource]}</dd></div>
              <div><dt>Imports</dt><dd>{resourceNames[route.importResource]}</dd></div>
              <div><dt>Income</dt><dd>+{route.income} gold</dd></div>
              <div><dt>Upkeep</dt><dd>-{route.upkeep} gold</dd></div>
              <div><dt>Duration</dt><dd>{route.remainingTurns} turns</dd></div>
              <div><dt>Risk</dt><dd>{route.risk}%</dd></div>
            </dl>
            <p className={`route-explanation ${route.status !== 'active' ? 'is-warning' : ''}`}>
              {route.status !== 'active' && <CircleAlert size={13} aria-hidden="true" />}
              {route.statusReason}
            </p>
            <div className="panel-action-row">
              <button type="button" className="button-quiet" onClick={onRenew} disabled={route.status === 'active' && route.remainingTurns > 1} data-testid="button-renew-trade-route">
                <RefreshCw size={13} aria-hidden="true" /> Renew route
              </button>
              <button type="button" className="button-quiet" onClick={onCancel} data-testid="button-cancel-trade-route">
                <X size={13} aria-hidden="true" /> Cancel route
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="panel-intro">A route to <strong>{partnerName}</strong> earns gold and moves goods, but it needs a trade agreement, an open border, and dependable stores.</p>
            <label className="panel-field"><span>Source region</span>
              <select value={sourceId} onChange={(event) => onSourceChange(event.target.value)} disabled={!sourceOptions.length} data-testid="select-trade-source">
                {sourceOptions.map((source) => <option value={source.id} key={source.id}>{source.name}</option>)}
              </select>
            </label>
            <div className="panel-field-grid">
              <label className="panel-field"><span>Export</span>
                <select value={exportResource} onChange={(event) => onExportChange(event.target.value as ResourceType)} data-testid="select-trade-export">
                  {RESOURCE_TYPES.map((resource) => <option value={resource} key={resource}>{resourceNames[resource]}</option>)}
                </select>
              </label>
              <label className="panel-field"><span>Import</span>
                <select value={importResource} onChange={(event) => onImportChange(event.target.value as ResourceType)} data-testid="select-trade-import">
                  {RESOURCE_TYPES.map((resource) => <option value={resource} key={resource}>{resourceNames[resource]}</option>)}
                </select>
              </label>
            </div>
            <p className="route-explanation"><Coins size={13} aria-hidden="true" /> Expected return: +16 gold income, 4 gold upkeep, six-turn charter, moderate risk.</p>
            <button type="button" className="button-primary panel-wide-button" onClick={onEstablish} disabled={!canEstablish} data-testid="button-establish-trade-route">
              <Route size={13} aria-hidden="true" /> Establish route
            </button>
            <p className={`panel-reason ${canEstablish ? '' : 'is-warning'}`} role="status">{establishReason}</p>
          </>
        )
      ) : (
        <p className="panel-empty"><Route size={20} aria-hidden="true" /> Select a neighboring realm to plan an exchange.</p>
      )}
    </section>
  );
}

export function DiplomacyPanel({
  partner,
  reputation,
  onSendEnvoy,
  onTradeAgreement,
  onNonAggression,
  onAlliance,
  onMilitaryAid,
  onPeace,
  onEmbargo,
  onBreakTreaty,
}: {
  partner: DiplomacyPartnerView | null;
  reputation: number;
  onSendEnvoy: () => void;
  onTradeAgreement: () => void;
  onNonAggression: () => void;
  onAlliance: () => void;
  onMilitaryAid: () => void;
  onPeace: () => void;
  onEmbargo: () => void;
  onBreakTreaty: (treatyId: string) => void;
}) {
  return (
    <section className="panel diplomacy-panel" aria-labelledby="diplomacy-panel-title">
      <div className="panel-heading-row">
        <div>
          <div className="panel-kicker">Royal correspondence</div>
          <h2 id="diplomacy-panel-title">Diplomacy</h2>
        </div>
        <span className="reputation-score"><ScrollText size={12} aria-hidden="true" /> Reputation {reputation}</span>
      </div>
      {partner ? (
        <>
          <div className="diplomacy-partner-heading">
            <div>
              <strong>{partner.name}</strong>
              <small>{partner.relationshipReason}</small>
            </div>
            <span className={`relationship-badge ${relationshipClass(partner.relationship)}`}>{relationshipNames[partner.relationship]}</span>
          </div>
          <p className="panel-intro">Offers are judged by trust, existing obligations, and the state of the border. The reason beside each action is part of the negotiation.</p>
          <div className="diplomacy-offers">
            <DiplomacyOffer label="Send an envoy" icon={<Handshake size={13} aria-hidden="true" />} enabled={partner.offers.envoy.enabled} reason={partner.offers.envoy.reason} onClick={onSendEnvoy} testId="button-send-envoy" />
            <DiplomacyOffer label="Propose trade agreement" icon={<Route size={13} aria-hidden="true" />} enabled={partner.offers.trade.enabled} reason={partner.offers.trade.reason} onClick={onTradeAgreement} testId="button-propose-trade" />
            <DiplomacyOffer label="Propose non-aggression pact" icon={<Shield size={13} aria-hidden="true" />} enabled={partner.offers.nonAggression.enabled} reason={partner.offers.nonAggression.reason} onClick={onNonAggression} testId="button-propose-nap" />
            <DiplomacyOffer label="Propose defensive alliance" icon={<Swords size={13} aria-hidden="true" />} enabled={partner.offers.alliance.enabled} reason={partner.offers.alliance.reason} onClick={onAlliance} testId="button-propose-alliance" />
            <DiplomacyOffer label="Request military aid" icon={<Shield size={13} aria-hidden="true" />} enabled={partner.offers.militaryAid.enabled} reason={partner.offers.militaryAid.reason} onClick={onMilitaryAid} testId="button-request-military-aid" />
            <DiplomacyOffer label="Offer peace terms" icon={<Handshake size={13} aria-hidden="true" />} enabled={partner.offers.peace.enabled} reason={partner.offers.peace.reason} onClick={onPeace} testId="button-offer-peace" />
          </div>
          {partner.treaties.length ? (
            <div className="treaty-list">
              <div className="subpanel-label">Active obligations</div>
              {partner.treaties.map((treaty) => (
                <div className="treaty-row" key={treaty.id}>
                  <span><Check size={12} aria-hidden="true" /> {treaty.label}<small>{treaty.remainingTurns} turns remain</small></span>
                  <button type="button" className="treaty-break-button" onClick={() => onBreakTreaty(treaty.id)} aria-label={`Break ${treaty.label}`} data-testid={`button-break-treaty-${treaty.id}`}><Ban size={12} aria-hidden="true" /></button>
                </div>
              ))}
            </div>
          ) : null}
          <button type="button" className={`embargo-button ${partner.embargoed ? 'is-active' : ''}`} onClick={onEmbargo} data-testid="button-toggle-embargo">
            <Ban size={13} aria-hidden="true" /> {partner.embargoed ? 'Lift embargo' : 'Impose embargo'}
          </button>
        </>
      ) : (
        <p className="panel-empty"><Handshake size={20} aria-hidden="true" /> Select a rival or neutral realm to read its diplomatic posture.</p>
      )}
    </section>
  );
}

function DiplomacyOffer({
  label,
  icon,
  enabled,
  reason,
  onClick,
  testId,
}: {
  label: string;
  icon: ReactNode;
  enabled: boolean;
  reason: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <div className={`diplomacy-offer ${enabled ? '' : 'is-disabled'}`}>
      <button type="button" className="button-quiet" onClick={onClick} disabled={!enabled} data-testid={testId}>{icon}<span>{label}</span></button>
      <small>{reason}</small>
    </div>
  );
}