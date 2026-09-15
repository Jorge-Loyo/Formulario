export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function crearInscripcion(datos) {
  const res = await fetch(`${API_URL}/inscripciones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  if (!res.ok) {
    let detalle = "No se pudo registrar la inscripción.";
    try {
      const err = await res.json();
      if (err.detail) detalle = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail);
    } catch (_) {}
    throw new Error(detalle);
  }
  return res.json();
}

// --- Admin ---
export function authHeader(usuario, clave) {
  return "Basic " + btoa(`${usuario}:${clave}`);
}

export async function listarPostulantes(q, auth) {
  const url = new URL(`${API_URL}/admin/postulantes`);
  if (q) url.searchParams.set("q", q);
  const res = await fetch(url.toString(), {
    headers: { Authorization: auth },
  });
  if (res.status === 401) throw new Error("401");
  if (!res.ok) throw new Error("Error al obtener postulantes.");
  return res.json();
}

export function pdfUrl(id) {
  return `${API_URL}/admin/postulantes/${id}/pdf`;
}
