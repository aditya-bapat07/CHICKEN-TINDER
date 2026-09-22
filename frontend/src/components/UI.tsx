import { useEffect, useState, ReactNode, useRef } from "react";
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
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
  { symbol: string; label: string; color: string }
> = {
  outdoor: { symbol: "↟", label: "Outdoors", color: "#cce3cc" },
  creative: { symbol: "✳", label: "Creative", color: "#f0d6c8" },
  fitness: { symbol: "ϟ", label: "Get moving", color: "#d8d9ed" },
  social: { symbol: "☻", label: "Be social", color: "#f4df9e" },
  solo: { symbol: "☾", label: "Me time", color: "#cedfe8" },
  learning: { symbol: "✧", label: "Learn something", color: "#d4dfb9" },
  gaming: { symbol: "✜", label: "Play a little", color: "#e8cee1" },
  relaxation: { symbol: "☾", label: "Unwind", color: "#cedfe8" },
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
      <span className="art-symbol">{c.symbol}</span>
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
