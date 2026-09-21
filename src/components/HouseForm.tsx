import { useState, type FormEvent } from "react";
import { HOUSE_STATUSES, MAX_SCORE, type HousePayload, type HouseStatus } from "../../shared/types";
import { messageFromError } from "../utils";
import { TagInput } from "./TagInput";

export interface HouseSubmitOptions {
  importPhotos: boolean;
}

interface HouseFormProps {
  initial: HousePayload;
  tagSuggestions: string[];
  submitLabel: string;
  showImportOption?: boolean;
  onSubmit: (payload: HousePayload, options: HouseSubmitOptions) => Promise<void>;
  onCancel: () => void;
}

interface FormState {
  url: string;
  title: string;
  address: string;
  price: string;
  score: string;
  status: HouseStatus;
  tags: string[];
  sizeSqm: string;
  rooms: string;
  floor: string;
  condoFees: string;
  yearBuilt: string;
  energyClass: string;
}

function numberToInput(value: number | null): string {
  return value === null ? "" : String(value);
}

function inputToNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function HouseForm({
  initial,
  tagSuggestions,
  submitLabel,
  showImportOption = false,
  onSubmit,
  onCancel,
}: HouseFormProps) {
  const [state, setState] = useState<FormState>({
    url: initial.url,
    title: initial.title,
    address: initial.address,
    price: numberToInput(initial.price),
    score: numberToInput(initial.score),
    status: initial.status,
    tags: initial.tags,
    sizeSqm: numberToInput(initial.details.sizeSqm),
    rooms: numberToInput(initial.details.rooms),
    floor: numberToInput(initial.details.floor),
    condoFees: numberToInput(initial.details.condoFees),
    yearBuilt: numberToInput(initial.details.yearBuilt),
    energyClass: initial.details.energyClass,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importPhotos, setImportPhotos] = useState(true);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload: HousePayload = {
      url: state.url,
      title: state.title,
      address: state.address,
      price: inputToNumber(state.price),
      score: inputToNumber(state.score),
      status: state.status,
      tags: state.tags,
      comments: initial.comments,
      visitNotes: initial.visitNotes,
      details: {
        sizeSqm: inputToNumber(state.sizeSqm),
        rooms: inputToNumber(state.rooms),
        floor: inputToNumber(state.floor),
        condoFees: inputToNumber(state.condoFees),
        yearBuilt: inputToNumber(state.yearBuilt),
        energyClass: state.energyClass,
      },
    };
    try {
      await onSubmit(payload, { importPhotos: showImportOption && importPhotos });
    } catch (err) {
      setError(messageFromError(err));
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="full">
        Link annuncio *
        <input
          type="url"
          required
          value={state.url}
          onChange={(event) => update("url", event.target.value)}
          placeholder="https://www.immobiliare.it/annunci/…"
        />
      </label>
      <label>
        Titolo
        <input
          value={state.title}
          onChange={(event) => update("title", event.target.value)}
          placeholder="Trilocale via Roma"
        />
      </label>
      <label>
        Indirizzo
        <input
          value={state.address}
          onChange={(event) => update("address", event.target.value)}
          placeholder="Via Roma 10, Milano"
        />
      </label>
      <label>
        Prezzo (€)
        <input
          type="number"
          min={0}
          step={1000}
          value={state.price}
          onChange={(event) => update("price", event.target.value)}
          placeholder="250000"
        />
      </label>
      <label>
        Stato
        <select value={state.status} onChange={(event) => update("status", event.target.value as HouseStatus)}>
          {HOUSE_STATUSES.map((info) => (
            <option key={info.value} value={info.value}>
              {info.label}
            </option>
          ))}
        </select>
      </label>
      <div className="full">
        <span className="field-label">
          Score: {state.score === "" ? "non assegnato" : `${state.score}/10`}
        </span>
        <div className="score-row">
          <input
            type="range"
            min={0}
            max={MAX_SCORE}
            step={0.5}
            value={state.score === "" ? 0 : Number(state.score)}
            onChange={(event) => update("score", event.target.value)}
          />
          <button type="button" className="button ghost small" onClick={() => update("score", "")}>
            Azzera
          </button>
        </div>
      </div>
      <div className="full">
        <span className="field-label">Tag</span>
        <TagInput tags={state.tags} suggestions={tagSuggestions} onChange={(tags) => update("tags", tags)} />
      </div>
      <fieldset className="full details-fieldset">
        <legend>Dettagli</legend>
        <div className="form-grid">
          <label>
            Superficie (mq)
            <input
              type="number"
              min={0}
              step={1}
              value={state.sizeSqm}
              onChange={(event) => update("sizeSqm", event.target.value)}
            />
          </label>
          <label>
            Vani
            <input
              type="number"
              min={0}
              step={1}
              value={state.rooms}
              onChange={(event) => update("rooms", event.target.value)}
            />
          </label>
          <label>
            Piano
            <input
              type="number"
              step={1}
              value={state.floor}
              onChange={(event) => update("floor", event.target.value)}
            />
          </label>
          <label>
            Spese condominiali (€/mese)
            <input
              type="number"
              min={0}
              step={10}
              value={state.condoFees}
              onChange={(event) => update("condoFees", event.target.value)}
            />
          </label>
          <label>
            Anno di costruzione
            <input
              type="number"
              min={1000}
              max={2200}
              step={1}
              value={state.yearBuilt}
              onChange={(event) => update("yearBuilt", event.target.value)}
            />
          </label>
          <label>
            Classe energetica
            <input
              maxLength={20}
              value={state.energyClass}
              onChange={(event) => update("energyClass", event.target.value)}
              placeholder="A2"
            />
          </label>
        </div>
      </fieldset>
      {showImportOption && (
        <label className="checkbox-label full">
          <input
            type="checkbox"
            checked={importPhotos}
            onChange={(event) => setImportPhotos(event.target.checked)}
          />
          Importa automaticamente le foto dall'annuncio
        </label>
      )}
      {error && <p className="error-text full">{error}</p>}
      <div className="form-actions full">
        <button type="button" className="button ghost" onClick={onCancel}>
          Annulla
        </button>
        <button type="submit" className="button primary" disabled={saving || !state.url.trim()}>
          {saving ? "Salvataggio…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
