import { useEffect, useState } from "react";
import { authHeader, listarPostulantes, pdfUrl, API_URL } from "@/lib/api";

const STORAGE_KEY = "gcba_admin_auth";

export default function Admin() {
  const [auth, setAuth] = useState(null);
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [loginError, setLoginError] = useState("");

  const [q, setQ] = useState("");
  const [postulantes, setPostulantes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  // Restaurar sesión guardada
  useEffect(() => {
    const saved = typeof window !== "undefined" ? sessionStorage.getItem(STORAGE_KEY) : null;
    if (saved) setAuth(saved);
  }, []);

  async function cargar(busqueda = "", authActual = auth) {
    if (!authActual) return;
    setCargando(true);
    setError("");
    try {
      const data = await listarPostulantes(busqueda, authActual);
      setPostulantes(data);
    } catch (e) {
      if (e.message === "401") {
        setAuth(null);
        sessionStorage.removeItem(STORAGE_KEY);
        setLoginError("Sesión inválida. Ingresá de nuevo.");
      } else {
        setError("No se pudieron cargar los postulantes.");
      }
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (auth) cargar(q, auth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  async function onLogin(e) {
    e.preventDefault();
    setLoginError("");
    const header = authHeader(usuario.trim(), clave);
    try {
      await listarPostulantes("", header);
      setAuth(header);
      sessionStorage.setItem(STORAGE_KEY, header);
      setClave("");
    } catch (err) {
      setLoginError("Usuario o contraseña incorrectos.");
    }
  }

  function logout() {
    setAuth(null);
    sessionStorage.removeItem(STORAGE_KEY);
    setPostulantes([]);
  }

  function onBuscar(e) {
    e.preventDefault();
    cargar(q, auth);
  }

  // Descarga el PDF autenticado y devuelve una URL de blob.
  async function obtenerPdfUrl(id) {
    const res = await fetch(pdfUrl(id), { headers: { Authorization: auth } });
    if (!res.ok) throw new Error();
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  async function ver(id) {
    try {
      const url = await obtenerPdfUrl(id);
      window.open(url, "_blank");
    } catch {
      alert("No se pudo generar el PDF.");
    }
  }

  async function imprimir(id) {
    try {
      const url = await obtenerPdfUrl(id);
      // Abre el PDF y dispara el diálogo de impresión automáticamente.
      const win = window.open(url, "_blank");
      if (win) {
        win.addEventListener("load", () => {
          win.focus();
          win.print();
        });
      }
    } catch {
      alert("No se pudo generar el PDF.");
    }
  }

  // --- Pantalla de login ---
  if (!auth) {
    return (
      <>
        <div className="hero">
          <h1>Panel de administración</h1>
          <p>Acceso restringido — Gestión de postulaciones</p>
        </div>
        <section className="card-form" style={{ maxWidth: 440, margin: "0 auto" }}>
          <h2 className="section-title">Ingresar</h2>
          {loginError && <div className="alert alert-danger">{loginError}</div>}
          <form onSubmit={onLogin}>
            <div className="mb-3">
              <label className="form-label">Usuario</label>
              <input className="form-control" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus />
            </div>
            <div className="mb-3">
              <label className="form-label">Contraseña</label>
              <input type="password" className="form-control" value={clave} onChange={(e) => setClave(e.target.value)} />
            </div>
            <button className="btn btn-primary w-100" type="submit">Ingresar</button>
          </form>
        </section>
      </>
    );
  }

  // --- Listado ---
  return (
    <>
      <div className="hero d-flex justify-content-between align-items-center flex-wrap">
        <div>
          <h1>Postulados</h1>
          <p>Concurso Público — Gestión de postulaciones</p>
        </div>
        <button className="btn btn-outline-light" onClick={logout}>
          <i className="bx bx-log-out" /> Salir
        </button>
      </div>

      <section className="card-form">
        <form onSubmit={onBuscar} className="row g-2 mb-3">
          <div className="col">
            <input className="form-control" placeholder="Buscar por apellido, nombre, DNI, CUIL o email"
              value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="col-auto">
            <button className="btn btn-primary" type="submit">Buscar</button>
          </div>
          <div className="col-auto">
            <button className="btn btn-outline-secondary" type="button" onClick={() => { setQ(""); cargar("", auth); }}>
              Limpiar
            </button>
          </div>
        </form>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>N°</th>
                <th>Apellido y Nombre</th>
                <th>DNI</th>
                <th>CUIL</th>
                <th>Email</th>
                <th>Fecha</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={7} className="text-center py-4">Cargando...</td></tr>
              ) : postulantes.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-4 text-muted">Sin resultados.</td></tr>
              ) : (
                postulantes.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.apellido}, {p.nombre}</td>
                    <td>{p.dni}</td>
                    <td>{p.cuil}</td>
                    <td>{p.email}</td>
                    <td>{new Date(p.creado_en).toLocaleDateString("es-AR")}</td>
                    <td className="text-end table-actions">
                      <button className="btn btn-sm btn-outline-primary me-2" onClick={() => ver(p.id)}>
                        <i className="bx bx-show" /> Ver
                      </button>
                      <button className="btn btn-sm btn-primary" onClick={() => imprimir(p.id)}>
                        <i className="bx bx-printer" /> Imprimir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="form-hint">API: {API_URL}</p>
      </section>
    </>
  );
}
