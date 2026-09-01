import { useState } from 'react';
import { Check, LockKeyhole, Settings2 } from 'lucide-react';
import {
  ALL_EXPANSIONS,
  BASELINE_EXPANSIONS,
  EXPANSION_PACKS,
  getExpansionPreset,
  type ExpansionPackId,
  type ExpansionPreset,
  type ExpansionSelection,
  validateExpansionSelection,
} from '@/expansion-packs';

function presetLabel(preset: ExpansionPreset) {
  return preset === 'baseline' ? 'Baseline' : preset === 'all' ? 'All expansions' : 'Custom';
}

export function ExpansionPackSelector({
  selection,
  onChange,
  compact = false,
}: {
  selection: ExpansionSelection;
  onChange: (selection: ExpansionSelection) => void;
  compact?: boolean;
}) {
  const preset = getExpansionPreset(selection);
  const [customOpen, setCustomOpen] = useState(preset === 'custom');
  const validation = validateExpansionSelection(selection);
  const activePreset = customOpen ? 'custom' : preset;

  const choosePreset = (nextPreset: ExpansionPreset) => {
    setCustomOpen(nextPreset === 'custom');
    onChange(nextPreset === 'baseline' ? { ...BASELINE_EXPANSIONS } : nextPreset === 'all' ? { ...ALL_EXPANSIONS } : { ...selection });
  };

  const togglePack = (id: ExpansionPackId) => {
    setCustomOpen(true);
    onChange({ ...selection, [id]: !selection[id] });
  };

  return (
    <fieldset className={`pack-selector ${compact ? 'pack-selector-compact' : ''}`} aria-label="Campaign systems">
      <legend className="form-label"><Settings2 size={12} aria-hidden="true" /> Campaign systems</legend>
      <p className="pack-selector-intro">
        Baseline keeps the rules focused. Add packs now or later without losing their dormant history.
      </p>
      <div className="pack-presets" role="group" aria-label="System presets">
        {(['baseline', 'all', 'custom'] as ExpansionPreset[]).map((option) => (
          <button
            type="button"
            key={option}
            className={`pack-preset ${activePreset === option ? 'is-selected' : ''}`}
            onClick={() => choosePreset(option)}
            aria-pressed={activePreset === option}
            data-testid={`button-pack-preset-${option}`}
          >
            {activePreset === option && <Check size={12} aria-hidden="true" />}
            {presetLabel(option)}
          </button>
        ))}
      </div>
      {activePreset === 'custom' && (
        <div className="pack-options">
          {EXPANSION_PACKS.map((pack) => (
            <label className={`pack-option ${selection[pack.id] ? 'is-enabled' : ''}`} key={pack.id}>
              <input
                type="checkbox"
                checked={selection[pack.id]}
                onChange={() => togglePack(pack.id)}
                data-testid={`checkbox-pack-${pack.id}`}
              />
              <span className="pack-option-copy">
                <strong>{pack.name}</strong>
                <small>{pack.description}</small>
              </span>
              {pack.dependencies.length > 0 && <LockKeyhole size={12} aria-label="Has dependencies" />}
            </label>
          ))}
        </div>
      )}
      {!validation.valid && (
        <p className="pack-selector-error" role="alert">{validation.errors.join(' ')}</p>
      )}
    </fieldset>
  );
}

export function ExpansionPackControl({
  selection,
  onChange,
  open,
  setOpen,
}: {
  selection: ExpansionSelection;
  onChange: (selection: ExpansionSelection) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const preset = getExpansionPreset(selection);
  return (
    <div className="pack-control">
      <button
        type="button"
        className="button-quiet pack-control-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="campaign-systems-menu"
        data-testid="button-open-campaign-systems"
      >
        <Settings2 size={14} aria-hidden="true" />
        <span>Systems · {presetLabel(preset)}</span>
      </button>
      {open && (
        <div className="pack-menu" id="campaign-systems-menu" role="dialog" aria-label="Campaign systems settings">
          <div className="pack-menu-heading">
            <div>
              <div className="panel-kicker">Campaign charter</div>
              <strong>Choose the rules</strong>
            </div>
            <button type="button" className="close-button" onClick={() => setOpen(false)} aria-label="Close campaign systems" data-testid="button-close-campaign-systems">×</button>
          </div>
          <ExpansionPackSelector selection={selection} onChange={onChange} compact />
        </div>
      )}
    </div>
  );
}