import {
  NavLink,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { useState } from "react";
import ScrollEffects from "./components/ScrollEffects";
import { useAuth } from "./context/AuthContext";
import { Brand, Icon, Loading, ErrorMessage } from "./components/UI";
import AuthPage from "./pages/AuthPage";
import DiscoverPage from "./pages/DiscoverPage";
import SwipePage from "./pages/SwipePage";
import QuizPage from "./pages/QuizPage";
import MatchesPage from "./pages/MatchesPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import SharedPage from "./pages/SharedPage";
import KeysPage from "./pages/KeysPage";
import SettingsPage from "./pages/SettingsPage";
const nav = [
  ["/", "discover", "Discover"],
  ["/activities", "grid", "All activities"],
  ["/matches", "heart", "My matches"],
  ["/leaderboard", "trophy", "Leaderboard"],
];
function Protected() {
  const { user, loading } = useAuth();
  const location = useLocation();
  return loading ? (
    <Loading />
  ) : user ? (
    <Outlet />
  ) : (
    <Navigate to="/signin" state={{ from: location.pathname }} replace />
  );
}
function Layout() {
  const { user, logout, loading } = useAuth();
  const location = useLocation();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const title =
    [
      ...nav,
      ["/keys", "", "API keys"],
      ["/settings", "", "My profile"],
      ["/quiz", "", "Your vibe"],
      ["/swipe", "", "Find your next thing"],
    ].find((n) => n[0] === location.pathname)?.[2] || "A little inspiration";
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link to="/" className="brand-link">
          <Brand />
        </Link>
        <div className="nav-label">YOUR NEXT ADVENTURE</div>
        <nav aria-label="Main navigation">
          {nav.map(([to, icon, label]) => (
            <NavLink key={to} to={to} end>
              <Icon name={icon} />
              {label}
              {to === "/" && <span className="nav-dot" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span>✳</span>
            <strong>Bored is a starting point.</strong>
            <p>Something good is one yes away.</p>
            <Link to={user ? "/quiz" : "/signup"}>
              Find your vibe <Icon name="arrow" size={16} />
            </Link>
          </div>
          <nav aria-label="Account navigation">
            <NavLink to="/keys">
              <Icon name="key" />
              API keys
            </NavLink>
            <NavLink to="/settings">
              <Icon name="settings" />
              My profile
            </NavLink>
          </nav>
          <div className="sidebar-footer">
            Made for doing, not doomscrolling.
            <span>© {new Date().getFullYear()} Chicken Tinder</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="breadcrumb">
            Your daily dose of <strong>something different</strong>{" "}
            <span className="tiny-star">✦</span>
          </span>
          <span className="mobile-brand">chickentinder</span>
          <div className="account">
            <ScrollEffects />
            {loading ? (
              <span className="spinner" />
            ) : user ? (
              <>
                <Link
                  className="user-link"
                  to="/settings"
                  aria-label="My profile"
                >
                  <span className="avatar">
                    {user.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span>{user.name.split(" ")[0]}</span>
                </Link>
                <button
                  className="icon-button"
                  disabled={busy}
                  title="Sign out"
                  aria-label="Sign out"
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await logout();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Icon name="logout" size={18} />
                </button>
              </>
            ) : (
              <>
                <Link className="text-link" to="/signin">
                  Sign in
                </Link>
                <Link className="btn small" to="/signup">
                  Get started <Icon name="arrow" size={16} />
                </Link>
              </>
            )}
          </div>
        </header>
        <main id="main" className="main-content" tabIndex={-1}>
          <ErrorMessage error={error} />
          <div className="page-eyebrow">{title}</div>
          <Outlet />
        </main>
        <footer className="main-footer">
          <span>A little less “what should we do?”</span>
          <span>
            A little more living. <span className="coral">♥</span>
          </span>
        </footer>
      </div>
    </div>
  );
}
export default function App() {
  return (
    <Routes>
      <Route path="/signin" element={<AuthPage />} />
      <Route path="/signup" element={<AuthPage />} />
      <Route element={<Layout />}>
        <Route index element={<DiscoverPage />} />
        <Route path="activities" element={<DiscoverPage catalog />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="invite/:token" element={<SharedPage />} />
        <Route element={<Protected />}>
          <Route path="swipe" element={<SwipePage />} />
          <Route path="quiz" element={<QuizPage />} />
          <Route path="matches" element={<MatchesPage />} />
          <Route path="keys" element={<KeysPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route
          path="*"
          element={
            <div className="empty">
              <h1>This trail leads nowhere.</h1>
              <p>Let’s find you something better.</p>
              <Link to="/" className="btn">
                Back to discover
              </Link>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
