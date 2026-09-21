import { HOUSE_STATUSES, type HouseStatus } from "../../shared/types";
import { defaultFilters, type Filters, type SortOption } from "../filters";

interface FilterBarProps {
  filters: Filters;
  tags: string[];
  resultCount: number;
  totalCount: number;
  onChange: (filters: Filters) => void;
}

export function FilterBar({ filters, tags, resultCount, totalCount, onChange }: FilterBarProps) {
  function update(patch: Partial<Filters>) {
    onChange({ ...filters, ...patch });
  }

  const dirty = JSON.stringify(filters) !== JSON.stringify(defaultFilters);

  return (
    <section className="filter-bar">
      <div className="filter-row">
        <input
          className="search-input"
          type="search"
          placeholder="Cerca per titolo, indirizzo, tag…"
          value={filters.search}
          onChange={(event) => update({ search: event.target.value })}
        />
        <select
          value={filters.status}
          onChange={(event) => update({ status: event.target.value as HouseStatus | "all" })}
        >
          <option value="all">Tutti gli stati</option>
          {HOUSE_STATUSES.map((info) => (
            <option key={info.value} value={info.value}>
              {info.label}
            </option>
          ))}
        </select>
        <select value={filters.tag} onChange={(event) => update({ tag: event.target.value })}>
          <option value="">Tutti i tag</option>
          {tags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        <select value={filters.sort} onChange={(event) => update({ sort: event.target.value as SortOption })}>
          <option value="updated">Aggiornate di recente</option>
          <option value="created">Aggiunte di recente</option>
          <option value="score">Score più alto</option>
          <option value="price_asc">Prezzo crescente</option>
          <option value="price_desc">Prezzo decrescente</option>
        </select>
      </div>
      <div className="filter-row">
        <label className="inline-label">
          Prezzo min
          <input
            type="number"
            min={0}
            step={10000}
            value={filters.minPrice}
            onChange={(event) => update({ minPrice: event.target.value })}
          />
        </label>
        <label className="inline-label">
          Prezzo max
          <input
            type="number"
            min={0}
            step={10000}
            value={filters.maxPrice}
            onChange={(event) => update({ maxPrice: event.target.value })}
          />
        </label>
        <label className="inline-label">
          Score min
          <input
            type="number"
            min={0}
            max={10}
            step={0.5}
            value={filters.minScore}
            onChange={(event) => update({ minScore: event.target.value })}
          />
        </label>
        {dirty && (
          <button type="button" className="button ghost small" onClick={() => onChange(defaultFilters)}>
            Azzera filtri
          </button>
        )}
        <span className="muted result-count">
          {resultCount} di {totalCount} immobili
        </span>
      </div>
    </section>
  );
}
