import { useState, type KeyboardEvent } from "react";

interface TagInputProps {
  tags: string[];
  suggestions: string[];
  onChange: (tags: string[]) => void;
}

export function TagInput({ tags, suggestions, onChange }: TagInputProps) {
  const [draft, setDraft] = useState("");

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag || tags.includes(tag)) {
      setDraft("");
      return;
    }
    onChange([...tags, tag]);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(draft);
    } else if (event.key === "Backspace" && draft === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="tag-input">
      {tags.map((tag) => (
        <span className="chip" key={tag}>
          {tag}
          <button
            type="button"
            className="chip-remove"
            onClick={() => onChange(tags.filter((item) => item !== tag))}
            aria-label={`Rimuovi tag ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        list="tag-suggestions"
        value={draft}
        placeholder="Aggiungi tag…"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(draft)}
      />
      <datalist id="tag-suggestions">
        {suggestions
          .filter((tag) => !tags.includes(tag))
          .map((tag) => (
            <option key={tag} value={tag} />
          ))}
      </datalist>
    </div>
  );
}
