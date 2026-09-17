export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// ---- Sesión (token en sessionStorage) ----
const TOKEN_KEY = "gcba_token";
const USER_KEY = "gcba_user";
const ROL_KEY = "gcba_rol";

export function guardarSesion({ token, usuario, rol }) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, usuario);
  sessionStorage.setItem(ROL_KEY, rol);
}
export function getToken() {
  return typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_KEY) : null;
}
export function getUsuario() {
  return typeof window !== "undefined" ? sessionStorage.getItem(USER_KEY) : null;
}
export function getRol() {
  return typeof window !== "undefined" ? sessionStorage.getItem(ROL_KEY) : null;
}
export function cerrarSesion() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(ROL_KEY);
}

function bearer() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function manejarError(res, defecto) {
  if (res.status === 401) throw new Error("401");
  if (res.status === 403) throw new Error("403");
  let detalle = defecto;
  try {
    const err = await res.json();
    if (err.detail) detalle = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail);
  } catch (_) {}
  throw new Error(detalle);
}

// ---- Público ----
export async function crearInscripcion(datos) {
  const res = await fetch(`${API_URL}/inscripciones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  if (!res.ok) await manejarError(res, "No se pudo registrar la inscripción.");
  return res.json();
}

// ---- Auth ----
export async function login(usuario, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, password }),
  });
  if (!res.ok) await manejarError(res, "Usuario o contraseña incorrectos.");
  return res.json();
}

// ---- Admin: postulantes ----
export async function listarPostulantes(q) {
  const url = new URL(`${API_URL}/admin/postulantes`);
  if (q) url.searchParams.set("q", q);
  const res = await fetch(url.toString(), { headers: bearer() });
  if (!res.ok) await manejarError(res, "Error al obtener postulantes.");
  return res.json();
}

export async function obtenerPostulante(id) {
  const res = await fetch(`${API_URL}/admin/postulantes/${id}`, { headers: bearer() });
  if (!res.ok) await manejarError(res, "No se pudo obtener el postulante.");
  return res.json();
}

export async function editarPostulante(id, datos) {
  const res = await fetch(`${API_URL}/admin/postulantes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...bearer() },
    body: JSON.stringify(datos),
  });
  if (!res.ok) await manejarError(res, "No se pudo guardar la edición.");
  return res.json();
}

export async function descargarPdf(id) {
  const res = await fetch(`${API_URL}/admin/postulantes/${id}/pdf`, { headers: bearer() });
  if (!res.ok) await manejarError(res, "No se pudo generar el PDF.");
  return res.blob();
}

export async function validarPostulante(id) {
  const res = await fetch(`${API_URL}/admin/postulantes/${id}/validar`, {
    method: "POST",
    headers: bearer(),
  });
  if (!res.ok) await manejarError(res, "No se pudo validar.");
  return res.json();
}

// ---- Developer: usuarios ----
export async function listarUsuarios() {
  const res = await fetch(`${API_URL}/developer/usuarios`, { headers: bearer() });
  if (!res.ok) await manejarError(res, "Error al obtener usuarios.");
  return res.json();
}

export async function crearUsuario(datos) {
  const res = await fetch(`${API_URL}/developer/usuarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...bearer() },
    body: JSON.stringify(datos),
  });
  if (!res.ok) await manejarError(res, "No se pudo crear el usuario.");
  return res.json();
}

export async function editarUsuario(id, datos) {
  const res = await fetch(`${API_URL}/developer/usuarios/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...bearer() },
    body: JSON.stringify(datos),
  });
  if (!res.ok) await manejarError(res, "No se pudo editar el usuario.");
  return res.json();
}

// ---- Developer: logs ----
export async function listarLogs(q) {
  const url = new URL(`${API_URL}/developer/logs`);
  if (q) url.searchParams.set("q", q);
  const res = await fetch(url.toString(), { headers: bearer() });
  if (!res.ok) await manejarError(res, "Error al obtener los logs.");
  return res.json();
}

// ---- Developer: validadas ----
export async function listarValidadas(q) {
  const url = new URL(`${API_URL}/developer/validadas`);
  if (q) url.searchParams.set("q", q);
  const res = await fetch(url.toString(), { headers: bearer() });
  if (!res.ok) await manejarError(res, "Error al obtener las validadas.");
  return res.json();
}
