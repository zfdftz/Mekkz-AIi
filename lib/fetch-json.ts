export async function readJsonResponse<T = Record<string, unknown>>(
  res: Response
): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    return {
      error: res.ok ? undefined : "Leere Server-Antwort."
    } as unknown as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return {
      error: text.slice(0, 220) || "Ungültige Server-Antwort."
    } as unknown as T;
  }
}
