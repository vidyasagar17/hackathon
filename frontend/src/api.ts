/**
 * Base URL of the backend API.
 *
 * A hosted build sets VITE_API_URL. In development it defaults to port 8000 on
 * the host that served the page, so a phone opening the laptop's network address
 * reaches the laptop's API as well.
 */
export const API_URL: string =
  import.meta.env.VITE_API_URL ?? `http://${window.location.hostname}:8000`

/** POST JSON to the API and parse the JSON reply; rejects on a non-2xx status. */
export function postJson<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  return fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  }).then((res) => {
    if (!res.ok) throw new Error(`Request to ${path} failed`)
    return res.json()
  })
}
