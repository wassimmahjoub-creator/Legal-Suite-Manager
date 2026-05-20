import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "../lib/authFetch";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export const CLIENTS_QUERY_KEY = "/api/clients";

export function useClients(params: { search?: string; type?: string } = {}) {
  const qp = new URLSearchParams({ limit: "100" });
  if (params.search) qp.set("search", params.search);
  if (params.type)   qp.set("type",   params.type);

  return useQuery({
    queryKey: [CLIENTS_QUERY_KEY, params.search ?? "", params.type ?? ""],
    queryFn:  async () => {
      const r = await authFetch(`${BASE}/api/clients?${qp}`);
      if (!r.ok) throw new Error("فشل تحميل قائمة العملاء");
      return r.json() as Promise<Record<string, unknown>[]>;
    },
    placeholderData: (prev) => prev,
  });
}

export function useInvalidateClients() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: [CLIENTS_QUERY_KEY] });
}
