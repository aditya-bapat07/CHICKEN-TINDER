import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { getMe, signOut, User, ApiError } from "../api";
interface AuthCtx {
  user: User | null;
  loading: boolean;
  error: string;
  login: (key: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}
const Ctx = createContext<AuthCtx>(null!);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(
    Boolean(localStorage.getItem("ct_api_key")),
  );
  const [error, setError] = useState("");
  function clear() {
    localStorage.removeItem("ct_api_key");
    setUser(null);
  }
  async function login(key: string) {
    const u = await getMe(key);
    localStorage.setItem("ct_api_key", key);
    setUser(u);
    setError("");
    return u;
  }
  async function logout() {
    await signOut();
    clear();
  }
  async function refreshUser() {
    const u = await getMe();
    setUser(u);
  }
  async function restore() {
    setError("");
    setLoading(true);
    try {
      await refreshUser();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) clear();
      else setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (localStorage.getItem("ct_api_key")) void restore();
    window.addEventListener("ct:unauthorized", clear);
    return () => window.removeEventListener("ct:unauthorized", clear);
  }, []);
  return (
    <Ctx.Provider value={{ user, loading, error, login, logout, refreshUser }}>
      {error ? (
        <div className="connection-error" role="alert">
          {error} <button onClick={restore}>Retry connection</button>
        </div>
      ) : (
        children
      )}
    </Ctx.Provider>
  );
}
export const useAuth = () => useContext(Ctx);
