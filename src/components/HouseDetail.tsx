import { useState, type ChangeEvent } from "react";
import { HOUSE_STATUSES, statusInfo, type House, type HouseStatus } from "../../shared/types";
import { api, photoUrl } from "../api";
import { formatDateTime, formatPrice, formatScore, messageFromError, preparePhoto, scoreTone } from "../utils";

interface HouseDetailProps {
  house: House;
  onHouseChange: (house: House) => void;
  onEdit: () => void;
  onDelete: () => void;
  onError: (message: string) => void;
}

function formatNumber(value: number | null, suffix = ""): string {
  return value === null ? "—" : `${value}${suffix}`;
}

export function HouseDetail({ house, onHouseChange, onEdit, onDelete, onError }: HouseDetailProps) {
  const [notes, setNotes] = useState(house.visitNotes);
  const [commentDraft, setCommentDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const status = statusInfo(house.status);
  const notesDirty = notes !== house.visitNotes;

  async function save(patch: Partial<House>) {
    setBusy(true);
    try {
      onHouseChange(await api.updateHouse({ ...house, ...patch }));
    } catch (error) {
      onError(messageFromError(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleCommentAdd() {
    const text = commentDraft.trim();
    if (!text) return;
    setCommentDraft("");
    await save({
      comments: [...house.comments, { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() }],
    });
  }

  async function handleCommentDelete(commentId: string) {
    if (!window.confirm("Eliminare questo commento?")) return;
    await save({ comments: house.comments.filter((comment) => comment.id !== commentId) });
  }

  async function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    setUploadProgress(`Caricamento 0/${files.length}…`);
    let current = house;
    for (let index = 0; index < files.length; index += 1) {
      try {
        current = await api.uploadPhoto(current.id, await preparePhoto(files[index]));
        onHouseChange(current);
      } catch (error) {
        onError(messageFromError(error));
      }
      setUploadProgress(`Caricamento ${index + 1}/${files.length}…`);
    }
    setUploadProgress(null);
  }

  async function handlePhotoDelete(photoId: string) {
    if (!window.confirm("Eliminare questa foto?")) return;
    setBusy(true);
    try {
      onHouseChange(await api.deletePhoto(house.id, photoId));
    } catch (error) {
      onError(messageFromError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="detail">
      <div className="detail-header">
        <div>
          <h3>{house.title || "Senza titolo"}</h3>
          {house.address && <p className="muted">{house.address}</p>}
        </div>
        <div className="detail-actions">
          <a className="button ghost small" href={house.url} target="_blank" rel="noreferrer">
            Apri annuncio
          </a>
          <button type="button" className="button ghost small" onClick={onEdit}>
            Modifica
          </button>
          <button type="button" className="button danger small" onClick={onDelete}>
            Elimina
          </button>
        </div>
      </div>

      <div className="detail-summary">
        <div className="summary-item">
          <span className="summary-label">Prezzo</span>
          <strong>{formatPrice(house.price)}</strong>
        </div>
        <div className="summary-item">
          <span className="summary-label">Score</span>
          <span className={`score-badge score-${scoreTone(house.score)}`}>{formatScore(house.score)}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Stato</span>
          <select
            value={house.status}
            disabled={busy}
            onChange={(event) => void save({ status: event.target.value as HouseStatus })}
          >
            {HOUSE_STATUSES.map((info) => (
              <option key={info.value} value={info.value}>
                {info.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <dl className="detail-grid">
        <div>
          <dt>Superficie</dt>
          <dd>{formatNumber(house.details.sizeSqm, " mq")}</dd>
        </div>
        <div>
          <dt>Vani</dt>
          <dd>{formatNumber(house.details.rooms)}</dd>
        </div>
        <div>
          <dt>Piano</dt>
          <dd>{formatNumber(house.details.floor)}</dd>
        </div>
        <div>
          <dt>Spese condominiali</dt>
          <dd>{house.details.condoFees === null ? "—" : `${formatPrice(house.details.condoFees)}/mese`}</dd>
        </div>
        <div>
          <dt>Anno di costruzione</dt>
          <dd>{formatNumber(house.details.yearBuilt)}</dd>
        </div>
        <div>
          <dt>Classe energetica</dt>
          <dd>{house.details.energyClass || "—"}</dd>
        </div>
      </dl>

      {house.tags.length > 0 && (
        <div className="chips">
          {house.tags.map((tag) => (
            <span className="chip static" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      )}

      <section className="detail-section">
        <h4>Foto ({house.photos.length})</h4>
        <div className="photo-grid">
          {house.photos.map((photo) => (
            <figure className="photo-item" key={photo.id}>
              <img src={photoUrl(house.id, photo.id)} alt={photo.filename} loading="lazy" />
              <button
                type="button"
                className="photo-remove"
                onClick={() => void handlePhotoDelete(photo.id)}
                aria-label={`Elimina ${photo.filename}`}
              >
                ×
              </button>
            </figure>
          ))}
          <label className="photo-add">
            <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} hidden />
            Aggiungi foto
          </label>
        </div>
        {uploadProgress && <p className="muted">{uploadProgress}</p>}
      </section>

      <section className="detail-section">
        <h4>Note visita</h4>
        <textarea
          value={notes}
          rows={4}
          placeholder="Appunti della visita, impressioni, cose da verificare…"
          onChange={(event) => setNotes(event.target.value)}
        />
        <div className="section-actions">
          <button
            type="button"
            className="button primary small"
            disabled={!notesDirty || busy}
            onClick={() => void save({ visitNotes: notes })}
          >
            Salva note
          </button>
        </div>
      </section>

      <section className="detail-section">
        <h4>Commenti ({house.comments.length})</h4>
        <ul className="comment-list">
          {house.comments.map((comment) => (
            <li key={comment.id}>
              <p>{comment.text}</p>
              <div className="comment-meta">
                <span className="muted">{formatDateTime(comment.createdAt)}</span>
                <button
                  type="button"
                  className="button ghost small"
                  onClick={() => void handleCommentDelete(comment.id)}
                >
                  Elimina
                </button>
              </div>
            </li>
          ))}
          {house.comments.length === 0 && <li className="muted">Nessun commento.</li>}
        </ul>
        <div className="comment-form">
          <textarea
            value={commentDraft}
            rows={2}
            placeholder="Scrivi un commento…"
            onChange={(event) => setCommentDraft(event.target.value)}
          />
          <button
            type="button"
            className="button primary small"
            disabled={!commentDraft.trim() || busy}
            onClick={() => void handleCommentAdd()}
          >
            Aggiungi
          </button>
        </div>
      </section>

      <p className="muted detail-dates">
        Creata {formatDateTime(house.createdAt)} · aggiornata {formatDateTime(house.updatedAt)} · stato {status.label}
      </p>
    </div>
  );
}
