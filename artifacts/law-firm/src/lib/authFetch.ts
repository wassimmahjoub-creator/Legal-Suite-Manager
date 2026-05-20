export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const isFormData = options.body instanceof FormData;
  return fetch(url, {
    credentials: "include",          // httpOnly cookie envoyé automatiquement
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers ?? {}),
      // Plus d'Authorization header — le cookie gère l'auth
    },
  });
}
