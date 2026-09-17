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
  validarPostulante,
} from "@/lib/api";
import GraficoPostulaciones from "@/components/GraficoPostulaciones";

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

  async function validar(id) {
    try {
      const actualizado = await validarPostulante(id);
      // Actualiza la fila en memoria sin recargar toda la lista.
      setPostulantes((lista) =>
        lista.map((p) => (p.id === id ? { ...p, ...actualizado } : p))
      );
    } catch (e) {
      if (e.message === "401") {
        cerrarSesion();
        setLogueado(false);
      } else {
        alert("No se pudo validar.");
      }
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

  // --- KPIs ---
  const totalPostulados = postulantes.length;
  const totalInscriptos = postulantes.filter((p) => p.validado).length;
  const totalPreinscriptos = totalPostulados - totalInscriptos;

  // --- Listado ---
  const totalPaginas = Math.max(1, Math.ceil(postulantes.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const paginados = postulantes.slice(inicio, inicio + POR_PAGINA);

  return (
    <div className="admin-wide">
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

      {/* KPIs */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="kpi-card">
            <div className="kpi-icono" style={{ background: "#e8eef3", color: "#153244" }}>
              <i className="bx bx-group" />
            </div>
            <div>
              <div className="kpi-numero">{totalPostulados}</div>
              <div className="kpi-label">Total postulados</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="kpi-card">
            <div className="kpi-icono" style={{ background: "#e8f5e9", color: "#2e7d32" }}>
              <i className="bx bx-check-circle" />
            </div>
            <div>
              <div className="kpi-numero" style={{ color: "#2e7d32" }}>{totalInscriptos}</div>
              <div className="kpi-label">Inscriptos (validados)</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="kpi-card">
            <div className="kpi-icono" style={{ background: "#fdf1dd", color: "#b8770f" }}>
              <i className="bx bx-time-five" />
            </div>
            <div>
              <div className="kpi-numero" style={{ color: "#b8770f" }}>{totalPreinscriptos}</div>
              <div className="kpi-label">Preinscriptos (pendientes)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de evolución */}
      <GraficoPostulaciones postulantes={postulantes} />

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
              <th>Estado</th>
              <th className="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={8} className="text-center py-4">Cargando...</td></tr>
            ) : postulantes.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-4 text-muted">Sin resultados.</td></tr>
            ) : (
              paginados.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.apellido}, {p.nombre}</td>
                  <td>{p.dni}</td>
                  <td>{p.cuil}</td>
                  <td style={{ wordBreak: "break-all" }}>{p.email}</td>
                  <td>{new Date(p.creado_en).toLocaleDateString("es-AR")}</td>
                  <td>
                    {p.validado ? (
                      <span className="badge" title={`Validado por ${p.validado_por}`}
                        style={{ background: "#2e7d32", color: "#fff" }}>
                        Inscripto
                      </span>
                    ) : (
                      <span className="badge" style={{ background: "#f5a623", color: "#000" }}>
                        Preinscripto
                      </span>
                    )}
                  </td>
                  <td className="table-actions">
                    <div className="d-flex justify-content-end" style={{ gap: 8 }}>
                      <button
                        className={`btn btn-sm ${p.validado ? "btn-success" : "btn-outline-success"}`}
                        onClick={() => validar(p.id)}
                        title={p.validado ? "Quitar validación" : "Validar preinscripción"}
                      >
                        <i className="bx bx-check" /> {p.validado ? "Validada" : "Validar"}
                      </button>
                      <Link href={`/admin/editar/${p.id}`} className="btn btn-sm btn-outline-secondary">
                        <i className="bx bx-edit" /> Editar
                      </Link>
                      <button className="btn btn-sm btn-outline-primary" onClick={() => ver(p.id)}>
                        <i className="bx bx-show" /> Ver
                      </button>
                      <button className="btn btn-sm btn-primary" onClick={() => imprimir(p.id)}>
                        <i className="bx bx-printer" /> Imprimir
                      </button>
                    </div>
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
    </div>
  );
}
