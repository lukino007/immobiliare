import { statusInfo, type House } from "../../shared/types";
import { photoUrl } from "../api";
import { formatDate, formatPrice, formatScore, scoreTone } from "../utils";

interface HouseCardProps {
  house: House;
  onOpen: (house: House) => void;
}

export function HouseCard({ house, onOpen }: HouseCardProps) {
  const status = statusInfo(house.status);
  const cover = house.photos[0];
  const visibleTags = house.tags.slice(0, 4);
  const extraTags = house.tags.length - visibleTags.length;

  return (
    <article
      className="house-card"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(house)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(house);
        }
      }}
    >
      <div className="house-cover">
        {cover ? (
          <img src={photoUrl(house.id, cover.id)} alt={house.title || "Foto immobile"} loading="lazy" />
        ) : (
          <span className="house-cover-placeholder">Nessuna foto</span>
        )}
        <span className="status-badge" style={{ backgroundColor: status.color }}>
          {status.label}
        </span>
        <span className={`score-badge score-${scoreTone(house.score)}`}>{formatScore(house.score)}</span>
      </div>
      <div className="house-card-body">
        <h3>{house.title || "Senza titolo"}</h3>
        {house.address && <p className="muted">{house.address}</p>}
        <p className="house-price">{formatPrice(house.price)}</p>
        {visibleTags.length > 0 && (
          <div className="chips">
            {visibleTags.map((tag) => (
              <span className="chip static" key={tag}>
                {tag}
              </span>
            ))}
            {extraTags > 0 && <span className="chip static">+{extraTags}</span>}
          </div>
        )}
        <p className="house-meta muted">
          {house.photos.length} foto · {house.comments.length} commenti · agg. {formatDate(house.updatedAt)}
        </p>
      </div>
    </article>
  );
}
