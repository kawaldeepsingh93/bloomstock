export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: 'no-store' });
  const json = (await response.json()) as { ok: boolean; data?: T; error?: { message: string } };
  if (!response.ok || !json.ok || json.data === undefined) {
    throw new Error(json.error?.message ?? `Request failed: ${path}`);
  }
  return json.data;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await response.json()) as { ok: boolean; data?: T; error?: { message: string } };
  if (!response.ok || !json.ok || json.data === undefined) {
    throw new Error(json.error?.message ?? `Request failed: ${path}`);
  }
  return json.data;
}
