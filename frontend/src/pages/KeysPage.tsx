import { FormEvent, useState } from "react";
import { ApiKey, generateKey, getKeys, revokeKey } from "../api";
import {
  Art,
  CopyField,
  ErrorMessage,
  Icon,
  Loading,
  LoadError,
  Modal,
  useLoad,
} from "../components/UI";
import { useAuth } from "../context/AuthContext";
export default function KeysPage() {
  const list = useLoad(getKeys);
  const { refreshUser } = useAuth();
  const [creating, setCreating] = useState(false);
  const [revoke, setRevoke] = useState<ApiKey>();
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const key = await generateKey(String(f.get("label")));
      setSecret(key.apiKey);
      setCreating(false);
      list.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!revoke) return;
    setBusy(true);
    setError("");
    try {
      await revokeKey(revoke.id);
      if (revoke.current) {
        await refreshUser();
      } else {
        setRevoke(undefined);
        list.reload();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>A key to your next thing.</h1>
          <p>Connect your account to your own apps, scripts, and devices.</p>
        </div>
        <button
          className="btn small"
          onClick={() => {
            setError("");
            setCreating(true);
          }}
        >
          <Icon name="plus" size={16} />
          Generate API key
        </button>
      </div>
      <div className="key-info">
        <span className="stat-icon peach">
          <Icon name="key" />
        </span>
        <div>
          <h3>Your account. Your connections.</h3>
          <p>
            Keys give access to your account. Keep them private and revoke any
            you no longer use. Newly generated keys are shown only once.
          </p>
        </div>
      </div>
      <ErrorMessage error={!creating && !revoke ? error : ""} />
      {list.loading ? (
        <Loading />
      ) : list.error ? (
        <LoadError error={list.error} retry={list.reload} />
      ) : (
        <div className="panel key-table">
          <div className="key-row table-heading">
            <span>KEY NAME</span>
            <span>CREATED</span>
            <span>LAST USED</span>
            <span>STATUS</span>
            <span />
          </div>
          {list.data?.map((key) => (
            <div className="key-row" key={key.id}>
              <div className="key-name">
                <Icon name="key" size={18} />
                <span>
                  <strong>{key.label || "Untitled key"}</strong>
                  {key.current && <small>Current sign-in key</small>}
                </span>
              </div>
              <span>{new Date(key.createdAt).toLocaleDateString()}</span>
              <span>
                {key.lastUsed
                  ? new Date(key.lastUsed).toLocaleDateString()
                  : "Not used yet"}
              </span>
              <span
                className={`badge ${key.revoked || key.expired ? "skipped" : "done"}`}
              >
                {key.revoked ? "Revoked" : key.expired ? "Expired" : "Active"}
              </span>
              <button
                className="text-button danger"
                disabled={key.revoked || key.expired || busy}
                onClick={() => {
                  setError("");
                  setRevoke(key);
                }}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
      <section className="panel api-example">
        <div className="section-heading">
          <div>
            <h3>Your first request</h3>
            <p>Use your key in the x-api-key header.</p>
          </div>
          <a
            className="text-link coral"
            href="/docs"
            target="_blank"
            rel="noreferrer"
          >
            API documentation <Icon name="arrow" size={16} />
          </a>
        </div>
        <pre>
          <code>{`curl ${location.origin}/api/me \\\n  -H "x-api-key: YOUR_API_KEY"`}</code>
        </pre>
      </section>
      {creating && (
        <Modal
          title="Create a new API key"
          close={() => !busy && setCreating(false)}
        >
          <p>Give it a name so you’ll know where you use it.</p>
          <form onSubmit={create}>
            <ErrorMessage error={error} />
            <label>
              Key name
              <input
                name="label"
                placeholder="e.g. My personal project"
                required
                maxLength={60}
                autoFocus
              />
            </label>
            <button className="btn full" disabled={busy}>
              {busy ? "Generating…" : "Generate key"}
            </button>
          </form>
        </Modal>
      )}
      {secret && (
        <Modal title="Your new key is ready." close={() => setSecret("")}>
          <p>
            Copy this key now. You won’t be able to view it again after closing
            this window.
          </p>
          <CopyField value={secret} secret />
          <button className="btn full" onClick={() => setSecret("")}>
            I’ve saved my key
          </button>
        </Modal>
      )}
      {revoke && (
        <Modal
          title={`Revoke ${revoke.label || "this key"}?`}
          close={() => !busy && setRevoke(undefined)}
        >
          <p>
            {revoke.current
              ? "This is your current sign-in key. Revoking it will sign you out. Make sure you have a password or another saved key to sign back in."
              : "Apps and devices using this key will lose access immediately. You can generate a replacement anytime."}
          </p>
          <ErrorMessage error={error} />
          <div className="modal-actions">
            <button
              className="btn secondary"
              disabled={busy}
              onClick={() => setRevoke(undefined)}
            >
              Keep key
            </button>
            <button className="btn" disabled={busy} onClick={remove}>
              {busy ? "Revoking…" : "Revoke key"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
