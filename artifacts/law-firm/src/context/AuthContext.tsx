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
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("mtoken"));
  const [loading, setLoading] = useState(true);
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);

  function applyToken(t: string | null) {
    if (t) {
      localStorage.setItem("mtoken", t);
      setAuthTokenGetter(() => t);
    } else {
      localStorage.removeItem("mtoken");
      setAuthTokenGetter(() => null as unknown as string);
    }
    setToken(t);
  }

  useEffect(() => {
    const saved = localStorage.getItem("mtoken");
    if (saved) setAuthTokenGetter(() => saved);

    fetch(`${BASE_URL}/api/auth/status`)
      .then(r => r.json())
      .then(async (d: { hasUsers: boolean }) => {
        setHasUsers(d.hasUsers);
        if (d.hasUsers && saved) {
          const me = await fetch(`${BASE_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${saved}` },
          });
          if (me.ok) {
            setUser(await me.json());
          } else {
            applyToken(null);
          }
        }
      })
      .catch(() => setHasUsers(true))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const r = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) {
      const d = await r.json() as { error: string };
      throw new Error(d.error ?? "خطأ في تسجيل الدخول");
    }
    const d = await r.json() as { token: string; user: AuthUser };
    applyToken(d.token);
    setUser(d.user);
    setHasUsers(true);
  }

  async function register(data: RegisterData) {
    const r = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!r.ok) {
      const d = await r.json() as { error: string };
      throw new Error(d.error ?? "خطأ في إنشاء الحساب");
    }
    const d = await r.json() as { token: string; user: AuthUser };
    applyToken(d.token);
    setUser(d.user);
    setHasUsers(true);
  }

  async function setup(name: string, email: string, password: string) {
    const r = await fetch(`${BASE_URL}/api/auth/setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!r.ok) {
      const d = await r.json() as { error: string };
      throw new Error(d.error ?? "خطأ في الإعداد");
    }
    const d = await r.json() as { token: string; user: AuthUser };
    applyToken(d.token);
    setUser(d.user);
    setHasUsers(true);
  }

  function logout() {
    applyToken(null);
    setUser(null);
  }

  async function updateProfile(data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) {
    const r = await fetch(`${BASE_URL}/api/auth/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("mtoken")}` },
      body: JSON.stringify(data),
    });
    if (!r.ok) {
      const d = await r.json() as { error: string };
      throw new Error(d.error ?? "خطأ في التحديث");
    }
    const d = await r.json() as { token: string; user: AuthUser };
    applyToken(d.token);
    setUser(d.user);
  }

  async function acceptInvite(token: string, name: string, password: string) {
    const r = await fetch(`${BASE_URL}/api/invitations/accept/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password }),
    });
    if (!r.ok) {
      const d = await r.json() as { error: string };
      throw new Error(d.error ?? "خطأ في قبول الدعوة");
    }
    const d = await r.json() as { token: string; user: AuthUser };
    applyToken(d.token);
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
