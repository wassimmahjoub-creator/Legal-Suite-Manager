import { type ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../context/AuthContext";

interface Props {
  children: ReactNode;
  /** Rôles autorisés. Par défaut: ["admin"] */
  roles?: string[];
}

export function AdminGuard({ children, roles = ["admin"] }: Props) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && user && !roles.includes(user.role)) {
      navigate("/", { replace: true });
    }
  }, [user, loading, roles]);

  if (loading) return null;
  if (!user || !roles.includes(user.role)) return null;

  return <>{children}</>;
}
