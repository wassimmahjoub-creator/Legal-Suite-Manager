import { useToast } from "./use-toast";

type MutateOptions = {
  successMsg?: string;
  errorMsg?: string;
};

/**
 * Wrapper autour d'authFetch qui :
 * - affiche un toast de succès/erreur automatiquement
 * - retourne null si la requête échoue (au lieu de throw)
 * - extrait le message d'erreur de la réponse JSON du backend
 */
export function useMutate() {
  const { toast } = useToast();

  return async function mutate<T = unknown>(
    fn: () => Promise<Response>,
    opts: MutateOptions = {},
  ): Promise<T | null> {
    try {
      const res = await fn();

      if (!res.ok) {
        let message = opts.errorMsg ?? "حدث خطأ";
        try {
          const data = (await res.clone().json()) as { error?: string };
          if (data.error) message = data.error;
        } catch { /* ignore */ }
        toast({ title: message, variant: "destructive" });
        return null;
      }

      if (opts.successMsg) toast({ title: opts.successMsg });
      if (res.status === 204) return null;
      return (await res.json()) as T;

    } catch {
      toast({ title: "خطأ في الاتصال بالخادم. تحقق من اتصالك.", variant: "destructive" });
      return null;
    }
  };
}
