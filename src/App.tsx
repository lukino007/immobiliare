import { useCallback, useEffect, useMemo, useState } from "react";
import { emptyPayload, payloadFromHouse, type House, type HousePayload } from "../shared/types";
import { ApiError, api } from "./api";
import { FilterBar } from "./components/FilterBar";
import { HouseCard } from "./components/HouseCard";
import { HouseDetail } from "./components/HouseDetail";
import { HouseForm } from "./components/HouseForm";
import { LoginScreen } from "./components/LoginScreen";
import { Modal } from "./components/Modal";
import { applyFilters, collectTags, defaultFilters, type Filters } from "./filters";
import { messageFromError } from "./utils";

type AuthState = "checking" | "authenticated" | "anonymous";
type FormState = { mode: "create" } | { mode: "edit"; house: House } | null;

export default function App() {
  const [auth, setAuth] = useState<AuthState>("checking");
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(null);

  const loadHouses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setHouses(await api.listHouses());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setAuth("anonymous");
      } else {
        setError(messageFromError(err));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        const session = await api.session();
        if (cancelled) return;
        if (!session.authenticated) {
          setAuth("anonymous");
          return;
        }
        setAuth("authenticated");
        await loadHouses();
      } catch {
        if (!cancelled) setAuth("anonymous");
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [loadHouses]);

  const visibleHouses = useMemo(() => applyFilters(houses, filters), [houses, filters]);
  const allTags = useMemo(() => collectTags(houses), [houses]);
  const selectedHouse = useMemo(
    () => houses.find((house) => house.id === selectedId) ?? null,
    [houses, selectedId],
  );

  function replaceHouse(updated: House) {
    setHouses((current) => current.map((house) => (house.id === updated.id ? updated : house)));
  }

  async function handleLogin(password: string) {
    await api.login(password);
    setAuth("authenticated");
    await loadHouses();
  }

  async function handleLogout() {
    try {
      await api.logout();
    } catch {
      // logging out locally is enough even if the request fails
    }
    setAuth("anonymous");
    setHouses([]);
    setSelectedId(null);
    setForm(null);
  }

  async function handleCreate(payload: HousePayload) {
    const created = await api.createHouse(payload);
    setHouses((current) => [created, ...current]);
    setForm(null);
    setSelectedId(created.id);
  }

  async function handleUpdate(payload: HousePayload) {
    if (!form || form.mode !== "edit") return;
    const updated = await api.updateHouse({ ...form.house, ...payload });
    replaceHouse(updated);
    setForm(null);
  }

  async function handleDelete(house: House) {
    if (!window.confirm(`Eliminare "${house.title || house.url}"?`)) return;
    try {
      await api.deleteHouse(house.id);
      setHouses((current) => current.filter((item) => item.id !== house.id));
      setSelectedId(null);
    } catch (err) {
      setError(messageFromError(err));
    }
  }

  if (auth === "checking") {
    return (
      <div className="center-screen">
        <p className="muted">Caricamento…</p>
      </div>
    );
  }

  if (auth === "anonymous") {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Immobiliare</h1>
          <p className="muted">{houses.length} immobili salvati</p>
        </div>
        <div className="header-actions">
          <button type="button" className="button primary" onClick={() => setForm({ mode: "create" })}>
            Aggiungi casa
          </button>
          <a className="button ghost" href="/api/export">
            Esporta JSON
          </a>
          <button type="button" className="button ghost" onClick={() => void handleLogout()}>
            Esci
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button type="button" className="icon-button" onClick={() => setError(null)} aria-label="Chiudi">
            ×
          </button>
        </div>
      )}

      <FilterBar
        filters={filters}
        tags={allTags}
        resultCount={visibleHouses.length}
        totalCount={houses.length}
        onChange={setFilters}
      />

      {loading ? (
        <p className="muted center-screen">Caricamento…</p>
      ) : visibleHouses.length === 0 ? (
        <div className="empty-state">
          <p>
            {houses.length === 0
              ? "Nessuna casa salvata. Aggiungi il primo annuncio!"
              : "Nessun immobile corrisponde ai filtri."}
          </p>
        </div>
      ) : (
        <main className="house-grid">
          {visibleHouses.map((house) => (
            <HouseCard key={house.id} house={house} onOpen={(item) => setSelectedId(item.id)} />
          ))}
        </main>
      )}

      {selectedHouse && (
        <Modal title="Dettaglio immobile" onClose={() => setSelectedId(null)} size="wide">
          <HouseDetail
            key={selectedHouse.id}
            house={selectedHouse}
            onHouseChange={replaceHouse}
            onEdit={() => setForm({ mode: "edit", house: selectedHouse })}
            onDelete={() => void handleDelete(selectedHouse)}
            onError={setError}
          />
        </Modal>
      )}

      {form && (
        <Modal
          title={form.mode === "create" ? "Nuova casa" : "Modifica casa"}
          onClose={() => setForm(null)}
          size="wide"
        >
          <HouseForm
            initial={form.mode === "create" ? emptyPayload() : payloadFromHouse(form.house)}
            tagSuggestions={allTags}
            submitLabel={form.mode === "create" ? "Aggiungi" : "Salva modifiche"}
            onSubmit={form.mode === "create" ? handleCreate : handleUpdate}
            onCancel={() => setForm(null)}
          />
        </Modal>
      )}
    </div>
  );
}
