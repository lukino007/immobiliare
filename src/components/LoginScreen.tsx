import { useState, type FormEvent } from "react";
import { ApiError } from "../api";
import { messageFromError } from "../utils";

interface LoginScreenProps {
  onLogin: (password: string) => Promise<void>;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) return;
    setLoading(true);
    setError(null);
    try {
      await onLogin(password);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? "Password non corretta." : messageFromError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Immobiliare</h1>
        <p className="muted">Inserisci la password per accedere al tuo archivio di case.</p>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoFocus
            autoComplete="current-password"
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" className="button primary" disabled={loading || !password}>
          {loading ? "Accesso in corso…" : "Accedi"}
        </button>
      </form>
    </div>
  );
}
