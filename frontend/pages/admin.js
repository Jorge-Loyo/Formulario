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
  listarInscriptos,
  listarAdmitidos,
  admitirPostulante,
  obtenerEtapas,
  cambiarInscripcionesAdmin,
  cambiarAdmisionAdmin,
  notificarExamen,
  obtenerMail,
  editarMail,
} from "@/lib/api";
import GraficoPostulaciones from "@/components/GraficoPostulaciones";

// Abre el PDF de un postulante (ver o imprimir).
async function abrirPdf(id, imprimir = false) {
  const blob = await descargarPdf(id);
  const win = window.open(URL.createObjectURL(blob), "_blank");
  if (imprimir && win) {
    win.addEventListener("load", () => {
      win.focus();
      win.print();
    });
  }
}

export default function Admin() {
  const [logueado, setLogueado] = useState(false);
  const [rol, setRol] = useState(null);
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState("postulados");
  const [etapas, setEtapas] = useState({ inscripciones_abiertas: true, admision_abierta: true });

  useEffect(() => {
    if (getToken()) {
      setLogueado(true);
      setRol(getRol());
    }
  }, []);

  async function cargarEtapas() {
    try {
      setEtapas(await obtenerEtapas());
    } catch (_) {
      /* no bloquea */
    }
  }

  useEffect(() => {
    if (logueado) cargarEtapas();
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
  }

  function onExpira() {
    cerrarSesion();
    setLogueado(false);
    setLoginError("Sesión expirada. Ingresá de nuevo.");
  }

  // --- Login ---
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

  return (
    <div className="admin-wide">
      <div className="hero d-flex justify-content-between align-items-center flex-wrap">
        <div>
          <h1>Gestión de postulaciones</h1>
          <p>Concurso Público — Psicólogo/a de Planta</p>
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

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${tab === "postulados" ? "active" : ""}`} onClick={() => setTab("postulados")}>
            Postulados
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === "inscriptos" ? "active" : ""}`} onClick={() => setTab("inscriptos")}>
            Inscriptos
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === "admitidos" ? "active" : ""}`} onClick={() => setTab("admitidos")}>
            Admitidos
          </button>
        </li>
      </ul>

      {tab === "postulados" && (
        <Postulados etapas={etapas} onEtapas={cargarEtapas} onExpira={onExpira} />
      )}
      {tab === "inscriptos" && (
        <Inscriptos etapas={etapas} onEtapas={cargarEtapas} onExpira={onExpira} />
      )}
      {tab === "admitidos" && (
        <Admitidos etapas={etapas} onEtapas={cargarEtapas} onExpira={onExpira} />
      )}
    </div>
  );
}

// =====================================================================
// Pestaña POSTULADOS
// =====================================================================
function Postulados({ etapas, onEtapas, onExpira }) {
  const [q, setQ] = useState("");
  const [postulantes, setPostulantes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 10;

  async function cargar(busqueda = "") {
    setCargando(true);
    setError("");
    try {
      const data = await listarPostulantes(busqueda);
      setPostulantes(data);
      setPagina(1);
    } catch (e) {
      if (e.message === "401") onExpira();
      else setError("No se pudieron cargar los postulantes.");
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => { cargar(""); /* eslint-disable-next-line */ }, []);

  async function validar(id) {
    try {
      const actualizado = await validarPostulante(id);
      setPostulantes((lista) => lista.map((p) => (p.id === id ? { ...p, ...actualizado } : p)));
    } catch (e) {
      if (e.message === "401") onExpira();
      else alert(e.message || "No se pudo validar.");
    }
  }

  async function cambiarInscripciones(abiertas) {
    const txt = abiertas
      ? "¿Reabrir las inscripciones? El formulario público volverá a estar disponible."
      : "¿Cerrar las inscripciones? Ya no se podrá validar a más postulantes y el formulario público mostrará el aviso de cierre.";
    if (!confirm(txt)) return;
    try {
      await cambiarInscripcionesAdmin(abiertas);
      onEtapas();
    } catch (e) {
      if (e.message === "401") onExpira();
      else alert(e.message || "No se pudo cambiar el estado.");
    }
  }

  const inscAbiertas = etapas.inscripciones_abiertas;
  const totalPostulados = postulantes.length;
  const totalInscriptos = postulantes.filter((p) => p.validado).length;
  const totalPreinscriptos = totalPostulados - totalInscriptos;

  const totalPaginas = Math.max(1, Math.ceil(postulantes.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const paginados = postulantes.slice(inicio, inicio + POR_PAGINA);

  return (
    <>
      {/* KPIs */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="kpi-card">
            <div className="kpi-icono" style={{ background: "#e8eef3", color: "#153244" }}><i className="bx bx-group" /></div>
            <div><div className="kpi-numero">{totalPostulados}</div><div className="kpi-label">Total postulados</div></div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="kpi-card">
            <div className="kpi-icono" style={{ background: "#e8f5e9", color: "#2e7d32" }}><i className="bx bx-check-circle" /></div>
            <div><div className="kpi-numero" style={{ color: "#2e7d32" }}>{totalInscriptos}</div><div className="kpi-label">Inscriptos (validados)</div></div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="kpi-card">
            <div className="kpi-icono" style={{ background: "#fdf1dd", color: "#b8770f" }}><i className="bx bx-time-five" /></div>
            <div><div className="kpi-numero" style={{ color: "#b8770f" }}>{totalPreinscriptos}</div><div className="kpi-label">Preinscriptos (pendientes)</div></div>
          </div>
        </div>
      </div>

      <GraficoPostulaciones postulantes={postulantes} />

      {/* Estado de inscripciones */}
      <div className="card-form d-flex justify-content-between align-items-center flex-wrap" style={{ gap: 12 }}>
        <div>
          <strong>Etapa de inscripciones:</strong>{" "}
          {inscAbiertas
            ? <span className="badge" style={{ background: "#2e7d32", color: "#fff" }}>Abiertas</span>
            : <span className="badge" style={{ background: "#c1121f", color: "#fff" }}>Cerradas</span>}
          <div className="form-hint">Con las inscripciones cerradas no se puede validar y se habilita la admisión.</div>
        </div>
        {inscAbiertas ? (
          <button className="btn btn-danger" onClick={() => cambiarInscripciones(false)}>
            <i className="bx bx-lock-alt" /> Cerrar inscripciones
          </button>
        ) : (
          <button className="btn btn-success" onClick={() => cambiarInscripciones(true)}>
            <i className="bx bx-lock-open-alt" /> Reabrir inscripciones
          </button>
        )}
      </div>

      <section className="card-form">
        <form onSubmit={(e) => { e.preventDefault(); cargar(q); }} className="row g-2 mb-3">
          <div className="col-12 col-md">
            <input className="form-control" placeholder="Buscar por apellido, nombre, DNI, CUIL o email"
              value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="col-auto"><button className="btn btn-primary" type="submit">Buscar</button></div>
          <div className="col-auto">
            <button className="btn btn-outline-secondary" type="button" onClick={() => { setQ(""); cargar(""); }}>Limpiar</button>
          </div>
        </form>

        {error && <div className="alert alert-danger">{error}</div>}
        {!inscAbiertas && (
          <div className="alert alert-warning">
            Las inscripciones están cerradas: la validación de postulantes está deshabilitada.
          </div>
        )}

        <div className="table-responsive">
          <table className="table table-hover align-middle" style={{ tableLayout: "auto", width: "100%" }}>
            <thead>
              <tr>
                <th>N°</th><th>Apellido y Nombre</th><th>DNI</th><th>CUIL</th><th>Email</th>
                <th>Fecha</th><th>Estado</th><th className="text-end">Acciones</th>
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
                      {p.validado
                        ? <span className="badge" style={{ background: "#2e7d32", color: "#fff" }}>Inscripto</span>
                        : <span className="badge" style={{ background: "#f5a623", color: "#000" }}>Preinscripto</span>}
                    </td>
                    <td className="table-actions">
                      <div className="d-flex justify-content-end" style={{ gap: 8 }}>
                        <button
                          className={`btn btn-sm ${p.validado ? "btn-success" : "btn-outline-success"}`}
                          onClick={() => validar(p.id)}
                          disabled={!inscAbiertas}
                          title={!inscAbiertas ? "Inscripciones cerradas" : (p.validado ? "Quitar validación" : "Validar")}
                        >
                          <i className="bx bx-check" /> <span className="btn-label">{p.validado ? "Validada" : "Validar"}</span>
                        </button>
                        <Link href={`/admin/editar/${p.id}`} className="btn btn-sm btn-outline-secondary">
                          <i className="bx bx-edit" /> <span className="btn-label">Editar</span>
                        </Link>
                        <button className="btn btn-sm btn-outline-primary" onClick={() => abrirPdf(p.id)}>
                          <i className="bx bx-show" /> <span className="btn-label">Ver</span>
                        </button>
                        <button className="btn btn-sm btn-primary" onClick={() => abrirPdf(p.id, true)}>
                          <i className="bx bx-printer" /> <span className="btn-label">Imprimir</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {postulantes.length > 0 && (
          <Paginacion inicio={inicio} porPagina={POR_PAGINA} total={postulantes.length}
            totalPaginas={totalPaginas} paginaActual={paginaActual} setPagina={setPagina} />
        )}
      </section>
    </>
  );
}

// =====================================================================
// Pestaña INSCRIPTOS
// =====================================================================
function Inscriptos({ etapas, onEtapas, onExpira }) {
  const [q, setQ] = useState("");
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [procesando, setProcesando] = useState(0);

  async function cargar(busqueda = "") {
    setCargando(true);
    setError("");
    try {
      setLista(await listarInscriptos(busqueda));
    } catch (e) {
      if (e.message === "401") onExpira();
      else setError("No se pudieron cargar los inscriptos.");
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => { cargar(""); /* eslint-disable-next-line */ }, []);

  const inscCerradas = !etapas.inscripciones_abiertas;
  const admisionAbierta = etapas.admision_abierta;
  const puedeAdmitir = inscCerradas && admisionAbierta;

  async function admitir(p) {
    if (!confirm(
      `¿Admitir a ${p.apellido}, ${p.nombre}?\n\n` +
      "Esta acción NO es reversible y le enviará un correo de admisión a la persona.\n\n¿Confirmás?"
    )) return;
    setProcesando(p.id);
    setMensaje("");
    setError("");
    try {
      await admitirPostulante(p.id);
      setMensaje(`${p.apellido}, ${p.nombre} fue admitido/a y se le envió el correo.`);
      cargar(q);
    } catch (e) {
      if (e.message === "401") onExpira();
      else setError(e.message || "No se pudo admitir.");
    } finally {
      setProcesando(0);
    }
  }

  async function cambiarAdmision(abierta) {
    const txt = abierta
      ? "¿Reabrir la etapa de admisión?"
      : "¿Cerrar la etapa de admisión? Ya no se podrá admitir a nadie más y se habilitará el envío de la fecha de examen a los admitidos.";
    if (!confirm(txt)) return;
    try {
      await cambiarAdmisionAdmin(abierta);
      onEtapas();
    } catch (e) {
      if (e.message === "401") onExpira();
      else alert(e.message || "No se pudo cambiar el estado.");
    }
  }

  return (
    <>
      {/* Estado de etapas */}
      <div className="card-form">
        <div className="d-flex justify-content-between align-items-center flex-wrap" style={{ gap: 12 }}>
          <div>
            <strong>Etapa de admisión:</strong>{" "}
            {admisionAbierta
              ? <span className="badge" style={{ background: "#2e7d32", color: "#fff" }}>Abierta</span>
              : <span className="badge" style={{ background: "#c1121f", color: "#fff" }}>Cerrada</span>}
            <div className="form-hint">
              Para admitir deben estar las inscripciones cerradas y la admisión abierta.
              Al cerrar la admisión se habilita el envío de la fecha de examen.
            </div>
          </div>
          {admisionAbierta ? (
            <button className="btn btn-danger" onClick={() => cambiarAdmision(false)}>
              <i className="bx bx-lock-alt" /> Cerrar admisión
            </button>
          ) : (
            <button className="btn btn-success" onClick={() => cambiarAdmision(true)}>
              <i className="bx bx-lock-open-alt" /> Reabrir admisión
            </button>
          )}
        </div>
        {!inscCerradas && (
          <div className="alert alert-warning mt-3 mb-0">
            Las inscripciones todavía están <strong>abiertas</strong>. Para empezar a admitir, primero
            cerralas en la pestaña <strong>Postulados</strong>.
          </div>
        )}
      </div>

      {/* Editor del mail de admisión */}
      <EditorMail clave="mail-admision" titulo="Correo de admisión (se envía al admitir)" onExpira={onExpira} />

      <section className="card-form">
        <form onSubmit={(e) => { e.preventDefault(); cargar(q); }} className="row g-2 mb-3">
          <div className="col-12 col-md">
            <input className="form-control" placeholder="Buscar inscripto por apellido, DNI, CUIL o email"
              value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="col-auto"><button className="btn btn-primary" type="submit">Buscar</button></div>
          <div className="col-auto">
            <button className="btn btn-outline-secondary" type="button" onClick={() => { setQ(""); cargar(""); }}>Limpiar</button>
          </div>
        </form>

        {mensaje && <div className="alert alert-success">{mensaje}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>N°</th><th>Apellido y Nombre</th><th>DNI</th><th>Email</th>
                <th>Validado por</th><th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={6} className="text-center py-4">Cargando...</td></tr>
              ) : lista.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-4 text-muted">No hay inscriptos pendientes de admitir.</td></tr>
              ) : (
                lista.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.apellido}, {p.nombre}</td>
                    <td>{p.dni}</td>
                    <td style={{ wordBreak: "break-all" }}>{p.email}</td>
                    <td>{p.validado_por}</td>
                    <td className="table-actions">
                      <div className="d-flex justify-content-end" style={{ gap: 8 }}>
                        <button className="btn btn-sm btn-outline-primary" onClick={() => abrirPdf(p.id)}>
                          <i className="bx bx-show" /> <span className="btn-label">Ver</span>
                        </button>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => admitir(p)}
                          disabled={!puedeAdmitir || procesando === p.id}
                          title={!puedeAdmitir ? "Requiere inscripciones cerradas y admisión abierta" : "Admitir (envía correo)"}
                        >
                          <i className="bx bx-user-check" /> <span className="btn-label">
                            {procesando === p.id ? "Admitiendo…" : "Admitir"}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="form-hint">Total inscriptos pendientes: {lista.length}</p>
      </section>
    </>
  );
}

// =====================================================================
// Pestaña ADMITIDOS
// =====================================================================
function Admitidos({ etapas, onExpira }) {
  const [q, setQ] = useState("");
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [fecha, setFecha] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function cargar(busqueda = "") {
    setCargando(true);
    setError("");
    try {
      setLista(await listarAdmitidos(busqueda));
    } catch (e) {
      if (e.message === "401") onExpira();
      else setError("No se pudieron cargar los admitidos.");
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => { cargar(""); /* eslint-disable-next-line */ }, []);

  const admisionCerrada = !etapas.admision_abierta;
  const puedeNotificar = admisionCerrada && lista.length > 0 && fecha.trim().length > 0;

  async function notificar() {
    if (!confirm(
      `Vas a enviar la fecha de examen a ${lista.length} admitido(s):\n\n"${fecha}"\n\n` +
      "Esta acción envía correos reales. ¿Confirmás?"
    )) return;
    setEnviando(true);
    setMensaje("");
    setError("");
    try {
      const r = await notificarExamen(fecha);
      setMensaje(`Notificación enviada: ${r.enviados} enviados, ${r.fallidos} fallidos (total ${r.total}).`);
    } catch (e) {
      if (e.message === "401") onExpira();
      else setError(e.message || "No se pudo notificar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      {/* Notificación de fecha de examen */}
      <div className="card-form">
        <h2 className="section-title">Notificar fecha de examen</h2>
        {!admisionCerrada && (
          <div className="alert alert-warning">
            Para notificar la fecha de examen, primero debe <strong>cerrarse la etapa de admisión</strong>
            {" "}en la pestaña <strong>Inscriptos</strong>.
          </div>
        )}
        <div className="mb-3">
          <label className="form-label">Fecha, hora y lugar del examen</label>
          <input
            className="form-control"
            placeholder="Ej.: Viernes 17/10/2026 a las 10:00 hs, en Rivadavia 524, CABA"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            disabled={!admisionCerrada}
          />
          <span className="form-hint">Este texto se incluye en el correo que reciben los admitidos.</span>
        </div>
        <button className="btn btn-primary" onClick={notificar} disabled={!puedeNotificar || enviando}>
          <i className="bx bx-envelope" /> {enviando ? "Enviando…" : `Notificar a ${lista.length} admitido(s)`}
        </button>
      </div>

      {/* Editor del mail de examen */}
      <EditorMail clave="mail-examen" titulo="Correo de fecha de examen"
        ayuda="Usá {fecha_examen} donde quieras que aparezca la fecha que cargues arriba." onExpira={onExpira} />

      <section className="card-form">
        <div className="d-flex justify-content-between align-items-center flex-wrap mb-2" style={{ gap: 10 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>Admitidos</h2>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); cargar(q); }} className="row g-2 mb-3">
          <div className="col-12 col-md">
            <input className="form-control" placeholder="Buscar admitido por apellido, DNI, CUIL o email"
              value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="col-auto"><button className="btn btn-primary" type="submit">Buscar</button></div>
          <div className="col-auto">
            <button className="btn btn-outline-secondary" type="button" onClick={() => { setQ(""); cargar(""); }}>Limpiar</button>
          </div>
        </form>

        {mensaje && <div className="alert alert-success">{mensaje}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>N°</th><th>Apellido y Nombre</th><th>DNI</th><th>Email</th>
                <th>Admitido por</th><th>Fecha de admisión</th><th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={7} className="text-center py-4">Cargando...</td></tr>
              ) : lista.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-4 text-muted">No hay admitidos.</td></tr>
              ) : (
                lista.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.apellido}, {p.nombre}</td>
                    <td>{p.dni}</td>
                    <td style={{ wordBreak: "break-all" }}>{p.email}</td>
                    <td>{p.admitido_por}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {p.admitido_en ? new Date(p.admitido_en).toLocaleString("es-AR") : "-"}
                    </td>
                    <td className="table-actions">
                      <div className="d-flex justify-content-end" style={{ gap: 8 }}>
                        <button className="btn btn-sm btn-outline-primary" onClick={() => abrirPdf(p.id)}>
                          <i className="bx bx-show" /> <span className="btn-label">Ver</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="form-hint">Total admitidos: {lista.length}</p>
      </section>
    </>
  );
}

// =====================================================================
// Editor de cuerpo de mail (reutilizable) — igual lógica que developer
// =====================================================================
function EditorMail({ clave, titulo, ayuda, onExpira }) {
  const [cuerpo, setCuerpo] = useState("");
  const [borrador, setBorrador] = useState("");
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargar() {
    try {
      const r = await obtenerMail(clave);
      setCuerpo(r.cuerpo || "");
    } catch (e) {
      if (e.message === "401" || e.message === "403") onExpira();
    }
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, []);

  async function guardar() {
    if (!borrador.trim()) { setError("El mensaje no puede quedar vacío."); return; }
    setGuardando(true);
    setError("");
    try {
      const r = await editarMail(clave, borrador);
      setCuerpo(r.cuerpo);
      setEditando(false);
      setMensaje("Mensaje actualizado.");
    } catch (e) {
      if (e.message === "401" || e.message === "403") onExpira();
      else setError(e.message || "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="card-form">
      <div className="d-flex justify-content-between align-items-center flex-wrap" style={{ gap: 10 }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>{titulo}</h2>
        {!editando && (
          <button className="btn btn-outline-secondary btn-sm" onClick={() => { setBorrador(cuerpo); setEditando(true); setMensaje(""); }}>
            <i className="bx bx-edit" /> Editar mensaje
          </button>
        )}
      </div>
      {mensaje && <div className="alert alert-success mt-2">{mensaje}</div>}
      {error && <div className="alert alert-danger mt-2">{error}</div>}

      <div className="mt-3" style={{ background: "#f7f9fa", borderRadius: 8, padding: 14 }}>
        <p style={{ margin: "0 0 8px", fontWeight: 600 }}>Hola [Nombre Apellido]!</p>
        {editando ? (
          <>
            <textarea className="form-control" rows={6} value={borrador} onChange={(e) => setBorrador(e.target.value)} />
            <p className="form-hint mt-1">
              Separá párrafos con una línea en blanco. El saludo y la firma no se editan.
              {ayuda ? ` ${ayuda}` : ""}
            </p>
          </>
        ) : (
          <div style={{ whiteSpace: "pre-line", fontSize: 14, color: "#333" }}>{cuerpo}</div>
        )}
        <div style={{ marginTop: 10, color: "#5a6672", fontSize: 13, borderTop: "1px solid #e2e7ec", paddingTop: 8 }}>
          <p style={{ margin: 0 }}>Saludos,</p>
          <p style={{ margin: 0 }}>-</p>
          <p style={{ margin: 0 }}>Dirección General de Administración y Desarrollo de Recursos Humanos</p>
          <p style={{ margin: 0 }}>Ministerio de Salud</p>
          <p style={{ margin: 0 }}>GCBA</p>
        </div>
        {editando && (
          <div className="d-flex justify-content-end mt-3" style={{ gap: 8 }}>
            <button className="btn btn-outline-secondary" onClick={() => setEditando(false)} disabled={guardando}>Cancelar</button>
            <button className="btn btn-success" onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar mensaje"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Paginación reutilizable
function Paginacion({ inicio, porPagina, total, totalPaginas, paginaActual, setPagina }) {
  return (
    <div className="d-flex justify-content-between align-items-center flex-wrap mt-3">
      <span className="form-hint">
        Mostrando {inicio + 1}–{Math.min(inicio + porPagina, total)} de {total}
      </span>
      {totalPaginas > 1 && (
        <nav>
          <ul className="pagination flex-wrap mb-0">
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
  );
}
