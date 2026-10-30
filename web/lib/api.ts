export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "The model API could not be reached. Check that the Aegis API is running.",
    );
  }
  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail =
      typeof body === "object" &&
      body !== null &&
      "detail" in body &&
      typeof body.detail === "string"
        ? body.detail
        : `The request failed (${response.status}).`;
    throw new Error(detail);
  }
  return body as T;
}

export async function post<T>(path: string, value: unknown): Promise<T> {
  return api<T>(path, { method: "POST", body: JSON.stringify(value) });
}
