import { useAuth } from "../context/AuthContext";

const ADMIN_ROLES    = ["admin"]                    as const;
const MANAGER_ROLES  = ["admin", "partner"]         as const;
const READONLY_ROLES = ["trainee"]                  as const;

type Role = string;

export function useRole() {
  const { user } = useAuth();
  const role: Role = user?.role ?? "";

  return {
    role,
    isAdmin:          role === "admin",
    isAdminOrPartner: (MANAGER_ROLES as readonly string[]).includes(role),
    isReadOnly:       (READONLY_ROLES as readonly string[]).includes(role),
    /** Vérifie si le rôle actuel fait partie d'une liste donnée */
    can: (allowedRoles: string[]) => allowedRoles.includes(role),
  };
}
