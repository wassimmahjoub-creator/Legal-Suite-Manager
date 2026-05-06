export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("mtoken");
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
  });
}
