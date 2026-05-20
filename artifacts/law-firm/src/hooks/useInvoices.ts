import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "../lib/authFetch";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export const INVOICES_QUERY_KEY = "/api/invoices";

export function useInvoices(params: { search?: string; status?: string } = {}) {
  const qp = new URLSearchParams({ limit: "100" });
  if (params.search) qp.set("search", params.search);
  if (params.status) qp.set("status", params.status);

  return useQuery({
    queryKey: [INVOICES_QUERY_KEY, params.search ?? "", params.status ?? ""],
    queryFn:  async () => {
      const r = await authFetch(`${BASE}/api/invoices?${qp}`);
      if (!r.ok) throw new Error("فشل تحميل قائمة الفواتير");
      return r.json() as Promise<Record<string, unknown>[]>;
    },
    placeholderData: (prev) => prev,
  });
}

export function useInvalidateInvoices() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: [INVOICES_QUERY_KEY] });
}
