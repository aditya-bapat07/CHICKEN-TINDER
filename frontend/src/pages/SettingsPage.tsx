import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { patchMe, setPassword } from "../api";
import { useAuth } from "../context/AuthContext";
import { ErrorMessage, Icon } from "../components/UI";
export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function save(
    e: FormEvent<HTMLFormElement>,
    kind: "profile" | "password",
  ) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(kind);
    setError("");
    setSuccess("");
    try {
      if (kind === "profile")
        await patchMe({
          name: String(f.get("name")),
          boredomProfile: {
            energy: Number(f.get("energy")),
            budget: Number(f.get("budget")),
            social: Number(f.get("social")),
          },
        });
      else {
        if (f.get("password") !== f.get("confirm"))
          throw new Error("The new passwords don’t match.");
        await setPassword(
          String(f.get("password")),
          user?.hasPassword ? String(f.get("currentPassword")) : undefined,
        );
      }
      await refreshUser();
      setSuccess(
        kind === "profile"
          ? "Your profile is saved. Let’s find you something good."
          : "Your password is saved. You can now sign in with your email.",
      );
      if (kind === "password") form.reset();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>A little more you.</h1>
          <p>Keep your details and your current vibe up to date.</p>
        </div>
      </div>
      <ErrorMessage error={error} />
      {success && (
        <div className="success" role="status">
          {success}
        </div>
      )}
      <div className="settings-grid">
        <form
          className="panel settings-panel"
          onSubmit={(e) => save(e, "profile")}
        >
          <h2>My profile</h2>
          <p>Good recommendations start with you.</p>
          <label>
            Your name
            <input
              name="name"
              defaultValue={user?.name}
              required
              maxLength={80}
            />
          </label>
          <label>
            Email address
            <input value={user?.email} readOnly />
            <span className="field-help">Your account’s sign-in address.</span>
          </label>
          <hr />
          <h3>Today’s vibe</h3>
          {(["energy", "budget", "social"] as const).map((d) => (
            <label className="capitalize" key={d}>
              {d}
              <select name={d} defaultValue={user?.boredomProfile?.[d] || 3}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} —{" "}
                    {d === "energy"
                      ? [
                          "Very relaxed",
                          "Low key",
                          "Balanced",
                          "Active",
                          "Full of energy",
                        ][n - 1]
                      : d === "budget"
                        ? [
                            "Free",
                            "Low budget",
                            "Moderate",
                            "Treat myself",
                            "Flexible",
                          ][n - 1]
                        : [
                            "Solo",
                            "One friend",
                            "Small group",
                            "Meet people",
                            "A crowd",
                          ][n - 1]}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <button className="btn" disabled={!!busy}>
            {busy === "profile" ? "Saving…" : "Save profile"}
          </button>
          <Link className="text-link" to="/quiz">
            Take the vibe quiz instead →
          </Link>
        </form>
        <div>
          <form
            className="panel settings-panel"
            onSubmit={(e) => save(e, "password")}
          >
            <span className="stat-icon lavender">
              <Icon name="key" />
            </span>
            <h2>{user?.hasPassword ? "Change password" : "Add a password"}</h2>
            <p>
              {user?.hasPassword
                ? "Keep your sign-in details up to date."
                : "Sign in with your email without looking up an API key."}
            </p>
            {user?.hasPassword && (
              <label>
                Current password
                <input
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                />
              </label>
            )}
            <label>
              New password
              <input
                name="password"
                type="password"
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                required
                placeholder="At least 8 characters"
              />
            </label>
            <label>
              Confirm new password
              <input
                name="confirm"
                type="password"
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                required
              />
            </label>
            <button className="btn secondary" disabled={!!busy}>
              {busy === "password" ? "Saving…" : "Save password"}
            </button>
          </form>
          <div className="settings-note">
            <h3>Building something fun?</h3>
            <p>Create and manage API keys for your own projects.</p>
            <Link className="text-link coral" to="/keys">
              Manage API keys <Icon name="arrow" size={16} />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
