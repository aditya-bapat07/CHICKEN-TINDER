export interface Profile {
  energy: number;
  budget: number;
  social: number;
}
export interface User {
  id: string;
  email: string;
  name: string;
  boredomProfile: Profile | null;
  streakRejects: number;
  hasPassword: boolean;
}
export interface Activity extends Profile {
  id: string;
  title: string;
  description: string;
  category: string;
  durationMin: number;
  score?: number;
}
export interface Match {
  id: string;
  activity: Activity;
  status: "pending" | "done" | "skipped";
  createdAt: string;
}
export interface ApiKey {
  id: string;
  label: string | null;
  lastUsed: string | null;
  createdAt: string;
  revoked: boolean;
  current: boolean;
}
export interface Question {
  id: string;
  question: string;
  dimension: keyof Profile;
  options: { label: string; value: number }[];
}
export interface Summary {
  totalSwipes: number;
  likes: number;
  rejects: number;
  forced: number;
  recapMessage: string;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function req<T>(
  path: string,
  opts: RequestInit = {},
  authed = true,
): Promise<T> {
  const headers = new Headers(opts.headers);
  if (opts.body) headers.set("Content-Type", "application/json");
  const key = localStorage.getItem("ct_api_key");
  if (authed && key && !headers.has("x-api-key")) headers.set("x-api-key", key);
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...opts,
      headers,
      signal: opts.signal || AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError(
      "Unable to connect. Check your connection and try again.",
      0,
    );
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && authed && key && headers.get("x-api-key") === key)
      window.dispatchEvent(new Event("ct:unauthorized"));
    throw new ApiError(
      data?.message || "Something went wrong. Please try again.",
      res.status,
    );
  }
  if (data === null)
    throw new ApiError(
      "The server returned an unexpected response.",
      res.status,
    );
  return data;
}
const post = (body?: unknown): RequestInit => ({
  method: "POST",
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
export const register = (email: string, name: string, password: string) =>
  req<{ apiKey: string }>(
    "/auth/register",
    post({ email, name, password }),
    false,
  );
export const signIn = (email: string, password: string) =>
  req<{ apiKey: string }>("/auth/login", post({ email, password }), false);
export const getMe = (key?: string) =>
  req<User>("/me", key ? { headers: { "x-api-key": key } } : {});
export const signOut = () => req("/auth/logout", post());
export const patchMe = (body: { name?: string; boredomProfile?: Profile }) =>
  req<User>("/me", { method: "PATCH", body: JSON.stringify(body) });
export const setPassword = (password: string, currentPassword?: string) =>
  req("/auth/password", {
    method: "PUT",
    body: JSON.stringify({ password, currentPassword }),
  });
export const getQuiz = () => req<{ questions: Question[] }>("/me/profile/quiz");
export const submitAnswers = (
  answers: { questionId: string; value: number }[],
) => req("/me/profile/answers", post({ answers }));
export const getActivities = () => req<Activity[]>("/activities", {}, false);
export const createActivity = (activity: Omit<Activity, "id">) =>
  req<Activity>("/activities", post(activity));
export const createSession = () =>
  req<{ sessionId: string; streakRejects: number }>("/sessions", post());
export const getNextActivity = (id: string) =>
  req<{ activity: Activity | null }>(`/sessions/${id}/next`);
export const swipe = (
  id: string,
  activityId: string,
  direction: "like" | "reject",
) =>
  req<{ accepted: boolean; forced: boolean; streak: number; message: string }>(
    `/sessions/${id}/swipe`,
    post({ activityId, direction }),
  );
export const endSession = (id: string) => req(`/sessions/${id}/end`, post());
export const getSessionSummary = (id: string) =>
  req<Summary>(`/sessions/${id}/summary`);
export const getMatches = () => req<Match[]>("/matches");
export const patchMatch = (id: string, status: "done" | "skipped") =>
  req<Match>(`/matches/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
export const shareMatch = (id: string) =>
  req<{ shareToken: string }>(`/matches/${id}/share`, post());
export const getShared = (token: string) =>
  req<{ sharedBy: string; activity: Activity; status: string }>(
    `/shared/${encodeURIComponent(token)}`,
    {},
    false,
  );
export const getLeaderboard = () =>
  req<{ userId: string; userName: string; forcedMatchesCount: number }[]>(
    "/leaderboard",
    {},
    false,
  );
export const getKeys = () => req<ApiKey[]>("/auth/keys");
export const generateKey = (label: string) =>
  req<{ apiKey: string; id: string }>("/auth/keys", post({ label }));
export const revokeKey = (id: string) =>
  req(`/auth/keys/${id}`, { method: "DELETE" });
