import { useEffect, useState } from "react";
import Link from "next/link";
import {
  login as apiLogin,
  guardarSesion,
  getToken,
  getRol,
  cerrarSesion,
  listarPostulantes,
  descargarPdf,
} from "@/lib/api";

export default function Admin() {
  const [logueado, setLogueado] = useState(false);
  const [rol, setRol] = useState(null);
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [loginError, setLoginError] = useState("");

  const [q, setQ] = useState("");
  const [postulantes, setPostulantes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 10;

  useEffect(() => {
    if (getToken()) {
      setLogueado(true);
      setRol(getRol());
    }
  }, []);

  async function cargar(busqueda = "") {
    setCargando(true);
    setError("");
    try {
      const data = await listarPostulantes(busqueda);
      setPostulantes(data);
      setPagina(1);
    } catch (e) {
      if (e.message === "401") {
        cerrarSesion();
        setLogueado(false);
        setLoginError("Sesión expirada. Ingresá de nuevo.");
      } else {
        setError("No se pudieron cargar los postulantes.");
      }
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (logueado) cargar(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logueado]);

  async function onLogin(e) {
    e.preventDefault();
    setLoginError("");
    try {
      const sesion = await apiLogin(usuario.trim(), clave);
      guardarSesion(sesion);
      setRol(sesion.rol);
      setClave("");
      setLogueado(true);
    } catch (err) {
      setLoginError("Usuario o contraseña incorrectos.");
    }
  }

  function logout() {
    cerrarSesion();
    setLogueado(false);
    setPostulantes([]);
  }

  function onBuscar(e) {
    e.preventDefault();
    cargar(q);
  }

  async function ver(id) {
    try {
      const blob = await descargarPdf(id);
      window.open(URL.createObjectURL(blob), "_blank");
    } catch {
      alert("No se pudo generar el PDF.");
    }
  }

  async function imprimir(id) {
    try {
      const blob = await descargarPdf(id);
      const win = window.open(URL.createObjectURL(blob), "_blank");
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
  if (!logueado) {
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
              <input className="form-control" value={usuario}
                onChange={(e) => setUsuario(e.target.value)} autoFocus />
            </div>
            <div className="mb-3">
              <label className="form-label">Contraseña</label>
              <input type="password" className="form-control" value={clave}
                onChange={(e) => setClave(e.target.value)} />
            </div>
            <button className="btn btn-primary w-100" type="submit">Ingresar</button>
          </form>
        </section>
      </>
    );
  }

  // --- Listado ---
  const totalPaginas = Math.max(1, Math.ceil(postulantes.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const paginados = postulantes.slice(inicio, inicio + POR_PAGINA);

  return (
    <>
      <div className="hero d-flex justify-content-between align-items-center flex-wrap">
        <div>
          <h1>Postulados</h1>
          <p>Concurso Público — Gestión de postulaciones</p>
        </div>
        <div className="d-flex align-items-center" style={{ gap: 8 }}>
          {rol === "developer" && (
            <Link href="/developer" className="btn btn-outline-light">
              <i className="bx bx-code-alt" /> Developer
            </Link>
          )}
          <button className="btn btn-outline-light" onClick={logout}>
            <i className="bx bx-log-out" /> Salir
          </button>
        </div>
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
            <button className="btn btn-outline-secondary" type="button"
              onClick={() => { setQ(""); cargar(""); }}>
              Limpiar
            </button>
          </div>
        </form>

        {error && <div className="alert alert-danger">{error}</div>}

        <table className="table table-hover align-middle" style={{ tableLayout: "auto", width: "100%" }}>
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
              paginados.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.apellido}, {p.nombre}</td>
                  <td>{p.dni}</td>
                  <td>{p.cuil}</td>
                  <td style={{ wordBreak: "break-all" }}>{p.email}</td>
                  <td>{new Date(p.creado_en).toLocaleDateString("es-AR")}</td>
                  <td className="text-end table-actions">
                    <Link href={`/admin/editar/${p.id}`} className="btn btn-sm btn-outline-secondary me-2">
                      <i className="bx bx-edit" /> Editar
                    </Link>
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

        {postulantes.length > 0 && (
          <div className="d-flex justify-content-between align-items-center flex-wrap mt-3">
            <span className="form-hint">
              Mostrando {inicio + 1}–{Math.min(inicio + POR_PAGINA, postulantes.length)} de {postulantes.length}
            </span>
            {totalPaginas > 1 && (
              <nav>
                <ul className="pagination mb-0">
                  <li className={`page-item ${paginaActual === 1 ? "disabled" : ""}`}>
                    <button className="page-link" onClick={() => setPagina(paginaActual - 1)}>Anterior</button>
                  </li>
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                    <li key={n} className={`page-item ${n === paginaActual ? "active" : ""}`}>
                      <button className="page-link" onClick={() => setPagina(n)}>{n}</button>
                    </li>
                  ))}
                  <li className={`page-item ${paginaActual === totalPaginas ? "disabled" : ""}`}>
                    <button className="page-link" onClick={() => setPagina(paginaActual + 1)}>Siguiente</button>
                  </li>
                </ul>
              </nav>
            )}
          </div>
        )}
      </section>
    </>
  );
}
