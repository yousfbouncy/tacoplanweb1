/** Optional navigation target, distinct from the mandatory human-readable stop name. */
export function normalizeStopNavigation(value: unknown): string {
  if (typeof value !== "string") return "";
  const input = value.trim();
  if (!input) return "";
  if (input.length > 1000) throw new Error("La ubicación no puede superar 1000 caracteres");
  if (/^https?:\/\//i.test(input)) {
    let url: URL;
    try { url = new URL(input); } catch { throw new Error("Enlace de ubicación no válido"); }
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) {
      throw new Error("La ubicación debe ser un enlace HTTPS seguro");
    }
    const host = url.hostname.toLowerCase();
    const googleMaps = host === "maps.app.goo.gl" || host === "maps.google.com" ||
      (host === "www.google.com" || host === "google.com") && url.pathname.startsWith("/maps") ||
      host === "goo.gl" && url.pathname.startsWith("/maps/");
    if (!googleMaps) throw new Error("Utiliza un enlace de Google Maps, coordenadas o una dirección");
    return url.toString();
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(input)) throw new Error("Enlace de ubicación no admitido");
  // Do not mistake malformed coordinate pairs for a valid street address.
  const pair = input.match(/^([+-]?\d+(?:\.\d+)?)\s*[,;]\s*([+-]?\d+(?:\.\d+)?)$/);
  if (pair) {
    const lat = Number(pair[1]), lng = Number(pair[2]);
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new Error("Coordenadas fuera de rango");
    return lat + "," + lng;
  }
  if (!/[\p{L}\p{N}]/u.test(input)) throw new Error("Dirección de ubicación no válida");
  return input;
}
