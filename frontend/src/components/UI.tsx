import { useEffect, useState, ReactNode, useRef } from "react";
export function Icon({
  name,
  size = 20,
}: {
  name: string;
  size?: number | string;
}) {
  const paths: Record<string, ReactNode> = {
    spark: (
      <path
        d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M5.6 18.4 18.4 5.6"
        strokeWidth="3"
      />
    ),
    tree: <path d="m12 2-7 9h4l-5 6h7v5h2v-5h7l-5-6h4z" />,
    smile: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 9h.01M16 9h.01M8 14a4.5 4.5 0 0 0 8 0" />
      </>
    ),
    moon: <path d="M20.5 14.3A9 9 0 0 1 9.7 3.5a9 9 0 1 0 10.8 10.8Z" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
    sparkle: <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />,
    game: (
      <>
        <path d="M7 7h10a4 4 0 0 1 4 3l1 7a2 2 0 0 1-3.4 1.7L15 16H9l-3.6 2.7A2 2 0 0 1 2 17l1-7a4 4 0 0 1 4-3ZM7 10v4M5 12h4M16 11h.01M19 13h.01" />
      </>
    ),
    discover: (
      <>
        <path d="m16 8-3 5-5 3 3-5z" />
        <circle cx="12" cy="12" r="9" />
      </>
    ),
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    trophy: (
      <>
        <path d="M8 3h8v6a4 4 0 0 1-8 0zM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 2v6m-4 2h8" />
      </>
    ),
    key: (
      <>
        <circle cx="8" cy="8" r="5" />
        <path d="m12 12 9 9m-5-5 3-3m-6 0 3-3" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    bolt: <path d="m13 2-9 12h7l-1 8 10-12h-7z" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    share: (
      <>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="m9 10 6-4m-6 8 6 4" />
      </>
    ),
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 6 6" />
      </>
    ),
    logout: (
      <>
        <path d="M9 3H4v18h5m-1-9h13m-4-4 4 4-4 4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ),
    mapPin: (
      <>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
    camera: (
      <>
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </>
    ),
    cloud: <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />,
    party: (
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    ),
    checklist: (
      <>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </>
    ),
    flask: (
      <path d="M10 2v7.31L4.62 19.38A2 2 0 0 0 6.36 22h11.28a2 2 0 0 0 1.74-2.62L14 9.31V2" />
    ),
    users: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.discover}
    </svg>
  );
}
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">
        c<span>♥</span>
      </span>
      <span>
        chicken<span className="brand-light">tinder</span>
        <small>LESS SCROLL. MORE LIFE.</small>
      </span>
    </span>
  );
}
export const categories: Record<
  string,
  { icon: string; label: string; color: string }
> = {
  outdoor: { icon: "tree", label: "Outdoors", color: "#cce3cc" },
  creative: { icon: "spark", label: "Creative", color: "#f0d6c8" },
  fitness: { icon: "bolt", label: "Get moving", color: "#d8d9ed" },
  social: { icon: "smile", label: "Be social", color: "#f4df9e" },
  solo: { icon: "moon", label: "Me time", color: "#cedfe8" },
  learning: { icon: "sparkle", label: "Learn something", color: "#d4dfb9" },
  gaming: { icon: "game", label: "Play a little", color: "#e8cee1" },
  relaxation: { icon: "moon", label: "Unwind", color: "#cedfe8" },
};
export function Art({
  category,
  large = false,
}: {
  category: string;
  large?: boolean;
}) {
  const c = categories[category] || categories.creative;
  return (
    <div
      className={`activity-art ${large ? "large" : ""}`}
      style={{ background: c.color }}
      aria-hidden="true"
    >
      <div className="art-orbit" />
      <div className="art-orbit second" />
      <span className="art-star">✦</span>
      <span className="art-symbol">
        <Icon name={c.icon} size="1em" />
      </span>
      <span className="art-caption">A LITTLE OUT OF THE ORDINARY</span>
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" /> Finding the good stuff…
    </div>
  );
}
export function ErrorMessage({ error }: { error: string }) {
  return error ? (
    <div className="error" role="alert">
      {error}
    </div>
  ) : null;
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">✧</span>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.showModal();
    return () => {
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={close}
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function CopyField({
  value,
  secret = false,
}: {
  value: string;
  secret?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <>
      <div className="copy-field">
        <input
          aria-label={secret ? "Generated API key" : "Share link"}
          readOnly
          value={value}
          onFocus={(e) => e.target.select()}
        />
        <button
          className="btn secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setFailed(false);
            } catch {
              setFailed(true);
            }
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      {failed && <p>Select the field and copy it manually.</p>}
    </>
  );
}
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    loader()
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [...deps, version]);
  return {
    data,
    setData,
    error,
    loading,
    reload: () => setVersion((v) => v + 1),
  };
}
export function LoadError({
  error,
  retry,
}: {
  error: string;
  retry: () => void;
}) {
  return (
    <div>
      <ErrorMessage error={error} />
      <button className="btn secondary" onClick={retry}>
        Try again
      </button>
    </div>
  );
}
