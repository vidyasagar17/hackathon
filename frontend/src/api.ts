/**
 * Base URL of the backend API.
 *
 * A hosted build sets VITE_API_URL. In development it defaults to port 8000 on
 * the host that served the page, so a phone opening the laptop's network address
 * reaches the laptop's API as well.
 */
export const API_URL: string =
  import.meta.env.VITE_API_URL ?? `http://${window.location.hostname}:8000`
