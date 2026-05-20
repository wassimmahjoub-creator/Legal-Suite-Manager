import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
  roleLabel: string;
  orgId?: number;
  phone?: string;
  status?: string;
}

interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  officeName: string;
  phone?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  hasUsers: boolean | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  setup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) => Promise<void>;
  acceptInvite: (token: string, name: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);

  function applyToken(t: string | null) {
    localStorage.removeItem("mtoken");
    setAuthTokenGetter(null);
    setToken(t);
  }

  useEffect(() => {
    localStorage.removeItem("mtoken");
    setAuthTokenGetter(null);

    const statusP = fetch(`${BASE_URL}/api/auth/status`).then(r => r.json() as Promise<{ hasUsers: boolean }>);
    const meP = fetch(`${BASE_URL}/api/auth/me`, { credentials: "include" });

    Promise.all([statusP, meP])
      .then(async ([status, meRes]) => {
        setHasUsers(status.hasUsers);
        if (meRes.ok) {
          const me = await meRes.json() as AuthUser;
          setUser(me);
          setToken("cookie");
        }
      })
      .catch(() => setHasUsers(true))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const r = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) {
      const d = await r.json() as { error: string };
      throw new Error(d.error ?? "خطأ في تسجيل الدخول");
    }
    const d = await r.json() as { user: AuthUser };
    setToken("cookie");
    setUser(d.user);
    setHasUsers(true);
  }

  async function register(data: RegisterData) {
    const r = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!r.ok) {
      const d = await r.json() as { error: string };
      throw new Error(d.error ?? "خطأ في إنشاء الحساب");
    }
    const d = await r.json() as { user: AuthUser };
    setToken("cookie");
    setUser(d.user);
    setHasUsers(true);
  }

  async function setup(name: string, email: string, password: string) {
    const r = await fetch(`${BASE_URL}/api/auth/setup`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!r.ok) {
      const d = await r.json() as { error: string };
      throw new Error(d.error ?? "خطأ في الإعداد");
    }
    const d = await r.json() as { user: AuthUser };
    setToken("cookie");
    setUser(d.user);
    setHasUsers(true);
  }

  function logout() {
    fetch(`${BASE_URL}/api/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
    setToken(null);
    setUser(null);
  }

  async function updateProfile(data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) {
    const r = await fetch(`${BASE_URL}/api/auth/me`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!r.ok) {
      const d = await r.json() as { error: string };
      throw new Error(d.error ?? "خطأ في التحديث");
    }
    const d = await r.json() as { user: AuthUser };
    setToken("cookie");
    setUser(d.user);
  }

  async function acceptInvite(token: string, name: string, password: string) {
    const r = await fetch(`${BASE_URL}/api/invitations/accept/${token}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password }),
    });
    if (!r.ok) {
      const d = await r.json() as { error: string };
      throw new Error(d.error ?? "خطأ في قبول الدعوة");
    }
    const d = await r.json() as { user: AuthUser };
    setToken("cookie");
    setUser(d.user);
    setHasUsers(true);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, hasUsers, login, register, setup, logout, updateProfile, acceptInvite }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
