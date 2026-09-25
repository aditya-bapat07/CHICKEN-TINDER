import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { register, signIn } from "../api";
import { useAuth } from "../context/AuthContext";
import { Brand, ErrorMessage, Icon } from "../components/UI";
export default function AuthPage() {
  const location = useLocation();
  const signup = location.pathname === "/signup";
  const { user, login } = useAuth();
  const [keyMode, setKeyMode] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const from = location.state?.from;
  const safeFrom =
    typeof from === "string" &&
    from.startsWith("/") &&
    !from.startsWith("//") &&
    !from.includes("\\")
      ? from
      : null;
  // One redirect path avoids racing the auth-state render with router navigation.
  if (user)
    return (
      <Navigate
        to={safeFrom || (signup && !user.boredomProfile ? "/quiz" : "/")}
        replace
      />
    );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const key =
        keyMode && !signup
          ? String(form.get("key")).trim()
          : (signup
              ? await register(
                  String(form.get("email")),
                  String(form.get("name")),
                  String(form.get("password")),
                )
              : await signIn(
                  String(form.get("email")),
                  String(form.get("password")),
                )
            ).apiKey;
      await login(key);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-story">
        <Link to="/" className="brand-link">
          <Brand />
        </Link>
        <div className="auth-story-content">
          <span className="pill">YOUR CURE FOR “I’M BORED”</span>
          <h1>
            Good things
            <br />
            start with
            <br />
            <em>“why not?”</em>
          </h1>
          <p>
            Find something that feels like you.
            <br />
            Or something that surprises you.
          </p>
          <div className="auth-illustration">
            <span className="big-spark">✳</span>
            <div className="floating-note">
              Less overthinking.
              <br />
              <strong>More doing. ↗</strong>
            </div>
          </div>
        </div>
        <span className="auth-bottom">
          A small nudge toward a more interesting day.
        </span>
      </section>
      <section className="auth-form-side">
        <Link to="/" className="back-link">
          ← Back to discover
        </Link>
        <div className="auth-form-wrap">
          <span className="eyebrow coral">LET’S GET YOU OUT THERE</span>
          <h2>{signup ? "Your next thing awaits." : "Hey, welcome back."}</h2>
          <p>
            {signup
              ? "Create an account. Leave boredom behind."
              : "Your saved adventures are right where you left them."}
          </p>
          {!signup && (
            <div className="tabs auth-tabs">
              <button
                className={!keyMode ? "active" : ""}
                onClick={() => {
                  setKeyMode(false);
                  setError("");
                }}
              >
                Email & password
              </button>
              <button
                className={keyMode ? "active" : ""}
                onClick={() => {
                  setKeyMode(true);
                  setError("");
                }}
              >
                API key
              </button>
            </div>
          )}
          <form onSubmit={submit} key={`${signup}-${keyMode}`}>
            <ErrorMessage error={error} />
            {signup && (
              <label>
                Your name
                <input
                  name="name"
                  autoComplete="name"
                  placeholder="What should we call you?"
                  required
                  maxLength={80}
                />
              </label>
            )}
            {keyMode && !signup ? (
              <label>
                API key
                <input
                  aria-label="API key"
                  name="key"
                  type="password"
                  autoComplete="off"
                  placeholder="ct_live_…"
                  required
                />
                <span className="field-help">
                  Use a key you previously saved from your account.
                </span>
              </label>
            ) : (
              <>
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                  />
                </label>
                <label>
                  Password
                  <div className="password-field">
                    <input
                      aria-label="Password"
                      name="password"
                      type={show ? "text" : "password"}
                      autoComplete={
                        signup ? "new-password" : "current-password"
                      }
                      placeholder={
                        signup ? "At least 8 characters" : "Your password"
                      }
                      minLength={signup ? 8 : 1}
                      maxLength={128}
                      required
                    />
                    <button
                      type="button"
                      aria-label={show ? "Hide password" : "Show password"}
                      onClick={() => setShow(!show)}
                    >
                      {show ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>
              </>
            )}
            <button className="btn full" disabled={busy}>
              {busy ? (
                <>
                  <span className="spinner" />
                  One moment…
                </>
              ) : (
                <>
                  {signup ? "Create my account" : "Sign in"}
                  <Icon name="arrow" size={18} />
                </>
              )}
            </button>
          </form>
          <p className="auth-switch">
            {signup ? "Already part of the flock?" : "New around here?"}{" "}
            <Link
              to={signup ? "/signin" : "/signup"}
              onClick={() => {
                setError("");
                setKeyMode(false);
              }}
            >
              {signup ? "Sign in" : "Create an account"}
            </Link>
          </p>
          <div className="auth-tip">
            <Icon aria-label="API key" name="key" />
            <p>
              {signup
                ? "An API key is created with your account. Manage your keys anytime in settings."
                : "Have an older account? Sign in with your API key, then add a password in My profile."}
            </p>
          </div>
        </div>
        <span className="auth-footnote">
          Your only commitment? Trying something new.
        </span>
      </section>
    </div>
  );
}
