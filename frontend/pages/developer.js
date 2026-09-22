import { useEffect, useState } from "react";
import Link from "next/link";
import {
  login as apiLogin,
  guardarSesion,
  getToken,
  getRol,
  getUsuario,
  cerrarSesion,
  listarUsuarios,
  crearUsuario,
  editarUsuario,
  listarLogs,
  listarValidadas,
  validarPostulante,
} from "@/lib/api";

export default function Developer() {
  const [logueado, setLogueado] = useState(false);
  const [autorizado, setAutorizado] = useState(false);
  const [usuarioLogin, setUsuarioLogin] = useState("");
  const [claveLogin, setClaveLogin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState("usuarios");

  useEffect(() => {
    if (getToken()) {
      setLogueado(true);
      setAutorizado(getRol() === "developer");
    }
  }, []);

  async function onLogin(e) {
    e.preventDefault();
    setLoginError("");
    try {
      const sesion = await apiLogin(usuarioLogin.trim(), claveLogin);
      guardarSesion(sesion);
      setClaveLogin("");
      setLogueado(true);
      setAutorizado(sesion.rol === "developer");
      if (sesion.rol !== "developer") {
        setLoginError("Este usuario no tiene rol developer.");
      }
    } catch {
      setLoginError("Usuario o contraseña incorrectos.");
    }
  }

  function logout() {
    cerrarSesion();
    setLogueado(false);
    setAutorizado(false);
  }

  // --- Login ---
  if (!logueado || !autorizado) {
    return (
      <>
        <div className="hero">
          <h1>Consola Developer</h1>
          <p>Gestión de usuarios y auditoría</p>
        </div>
        <section
          className="card-form"
          style={{ maxWidth: 440, margin: "0 auto" }}
        >
          <h2 className="section-title">Ingresar</h2>
          {loginError && <div className="alert alert-danger">{loginError}</div>}
          <form onSubmit={onLogin}>
            <div className="mb-3">
              <label className="form-label">Usuario</label>
              <input
                className="form-control"
                value={usuarioLogin}
                onChange={(e) => setUsuarioLogin(e.target.value)}
                autoFocus
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Contraseña</label>
              <input
                type="password"
                className="form-control"
                value={claveLogin}
                onChange={(e) => setClaveLogin(e.target.value)}
              />
            </div>
            <button className="btn btn-primary w-100" type="submit">
              Ingresar
            </button>
          </form>
        </section>
      </>
    );
  }

  return (
    <>
      <div className="hero d-flex justify-content-between align-items-center flex-wrap">
        <div>
          <h1>Consola Developer</h1>
          <p>Sesión: {getUsuario()}</p>
        </div>
        <div className="d-flex align-items-center" style={{ gap: 8 }}>
          <Link href="/admin" className="btn btn-outline-light">
            <i className="bx bx-list-ul" /> Admin
          </Link>
          <button className="btn btn-outline-light" onClick={logout}>
            <i className="bx bx-log-out" /> Salir
          </button>
        </div>
      </div>

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "usuarios" ? "active" : ""}`}
            onClick={() => setTab("usuarios")}
          >
            Usuarios
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "validadas" ? "active" : ""}`}
            onClick={() => setTab("validadas")}
          >
            Validadas
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "logs" ? "active" : ""}`}
            onClick={() => setTab("logs")}
          >
            Auditoría (logs)
          </button>
        </li>
      </ul>

      {tab === "usuarios" && <Usuarios onExpira={logout} />}
      {tab === "validadas" && <Validadas onExpira={logout} />}
      {tab === "logs" && <Logs onExpira={logout} />}
    </>
  );
}

// ------------------ Gestión de usuarios ------------------
function Usuarios({ onExpira }) {
  const [usuarios, setUsuarios] = useState([]);
  const [error, setError] = useState("");
  const [nuevo, setNuevo] = useState({
    usuario: "",
    password: "",
    rol: "admin",
  });
  const [mensaje, setMensaje] = useState("");

  async function cargar() {
    setError("");
    try {
      setUsuarios(await listarUsuarios());
    } catch (e) {
      if (e.message === "401" || e.message === "403") onExpira();
      else setError("No se pudieron cargar los usuarios.");
    }
  }
  useEffect(() => {
    cargar(); /* eslint-disable-next-line */
  }, []);

  async function onCrear(e) {
    e.preventDefault();
    setError("");
    setMensaje("");
    try {
      await crearUsuario(nuevo);
      setNuevo({ usuario: "", password: "", rol: "admin" });
      setMensaje("Usuario creado.");
      cargar();
    } catch (e2) {
      setError(e2.message || "No se pudo crear el usuario.");
    }
  }

  async function toggleActivo(u) {
    try {
      await editarUsuario(u.id, { activo: !u.activo });
      cargar();
    } catch (e) {
      setError(e.message || "No se pudo actualizar.");
    }
  }

  async function cambiarRol(u, rol) {
    try {
      await editarUsuario(u.id, { rol });
      cargar();
    } catch (e) {
      setError(e.message || "No se pudo actualizar.");
    }
  }

  async function resetearPassword(u) {
    const nueva = prompt(
      `Nueva contraseña para "${u.usuario}" (mínimo 6 caracteres):`,
    );
    if (!nueva) return;
    try {
      await editarUsuario(u.id, { password: nueva });
      setMensaje("Contraseña actualizada.");
    } catch (e) {
      setError(e.message || "No se pudo actualizar la contraseña.");
    }
  }

  return (
    <>
      <section className="card-form">
        <h2 className="section-title">Crear usuario</h2>
        {mensaje && <div className="alert alert-success">{mensaje}</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={onCrear} className="row g-2 align-items-end">
          <div className="col-md-4">
            <label className="form-label">Usuario</label>
            <input
              className="form-control"
              value={nuevo.usuario}
              onChange={(e) => setNuevo({ ...nuevo, usuario: e.target.value })}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Contraseña</label>
            <input
              type="text"
              className="form-control"
              value={nuevo.password}
              onChange={(e) => setNuevo({ ...nuevo, password: e.target.value })}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">Rol</label>
            <select
              className="form-control"
              value={nuevo.rol}
              onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value })}
            >
              <option value="admin">admin</option>
              <option value="developer">developer</option>
            </select>
          </div>
          <div className="col-md-2">
            <button className="btn btn-primary w-100" type="submit">
              Crear
            </button>
          </div>
        </form>
      </section>

      <section className="card-form">
        <h2 className="section-title">Usuarios</h2>
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Estado</th>
              <th className="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-3 text-muted">
                  Sin usuarios.
                </td>
              </tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.usuario}</td>
                  <td>
                    <select
                      className="form-select form-select-sm"
                      style={{ width: 130 }}
                      value={u.rol}
                      onChange={(e) => cambiarRol(u, e.target.value)}
                    >
                      <option value="admin">admin</option>
                      <option value="developer">developer</option>
                    </select>
                  </td>
                  <td>
                    <span
                      className={`badge ${u.activo ? "bg-success" : "bg-secondary"}`}
                    >
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="text-end table-actions">
                    <button
                      className="btn btn-sm btn-outline-secondary me-2"
                      onClick={() => resetearPassword(u)}
                    >
                      Cambiar clave
                    </button>
                    <button
                      className={`btn btn-sm ${u.activo ? "btn-outline-danger" : "btn-outline-success"}`}
                      onClick={() => toggleActivo(u)}
                    >
                      {u.activo ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}

// ------------------ Preinscripciones validadas ------------------
function Validadas({ onExpira }) {
  const [lista, setLista] = useState([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  async function cargar(busqueda = "") {
    setError("");
    try {
      setLista(await listarValidadas(busqueda));
    } catch (e) {
      if (e.message === "401" || e.message === "403") onExpira();
      else setError("No se pudieron cargar las validadas.");
    }
  }
  useEffect(() => {
    cargar(); /* eslint-disable-next-line */
  }, []);

  async function quitarValidacion(p) {
    if (!confirm(`¿Quitar la validación de ${p.apellido}, ${p.nombre}? Volverá a estado Preinscripto.`)) return;
    try {
      await validarPostulante(p.id); // toggle: al estar validado, lo desvalida
      cargar(q); // recargar la lista (sale de las validadas)
    } catch (e) {
      if (e.message === "401" || e.message === "403") onExpira();
      else setError("No se pudo quitar la validación.");
    }
  }

  return (
    <section className="card-form">
      <h2 className="section-title">Preinscripciones validadas</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          cargar(q);
        }}
        className="row g-2 mb-3"
      >
        <div className="col">
          <input
            className="form-control"
            placeholder="Buscar por apellido, nombre, DNI, CUIL o email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="col-auto">
          <button className="btn btn-primary" type="submit">
            Buscar
          </button>
        </div>
        <div className="col-auto">
          <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={() => {
              setQ("");
              cargar("");
            }}
          >
            Limpiar
          </button>
        </div>
      </form>

      {error && <div className="alert alert-danger">{error}</div>}

      <table className="table table-hover align-middle">
        <thead>
          <tr>
            <th>N°</th>
            <th>Apellido y Nombre</th>
            <th>DNI</th>
            <th>Email</th>
            <th>Validada por</th>
            <th>Fecha de validación</th>
            <th className="text-end">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {lista.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center py-3 text-muted">
                Sin preinscripciones validadas.
              </td>
            </tr>
          ) : (
            lista.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>
                  {p.apellido}, {p.nombre}
                </td>
                <td>{p.dni}</td>
                <td style={{ wordBreak: "break-all" }}>{p.email}</td>
                <td>{p.validado_por}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {p.validado_en
                    ? new Date(p.validado_en).toLocaleString("es-AR")
                    : "-"}
                </td>
                <td className="text-end">
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => quitarValidacion(p)}
                    title="Quitar validación (vuelve a Preinscripto)"
                  >
                    <i className="bx bx-x-circle" /> Quitar validación
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <p className="form-hint">Total validadas: {lista.length}</p>
    </section>
  );
}

// ------------------ Auditoría (logs) ------------------
function Logs({ onExpira }) {
  const [logs, setLogs] = useState([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  async function cargar(busqueda = "") {
    setError("");
    try {
      setLogs(await listarLogs(busqueda));
    } catch (e) {
      if (e.message === "401" || e.message === "403") onExpira();
      else setError("No se pudieron cargar los logs.");
    }
  }
  useEffect(() => {
    cargar(); /* eslint-disable-next-line */
  }, []);

  return (
    <section className="card-form">
      <h2 className="section-title">Auditoría de cambios</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          cargar(q);
        }}
        className="row g-2 mb-3"
      >
        <div className="col">
          <input
            className="form-control"
            placeholder="Buscar por usuario, campo, acción o entidad"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="col-auto">
          <button className="btn btn-primary" type="submit">
            Buscar
          </button>
        </div>
        <div className="col-auto">
          <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={() => {
              setQ("");
              cargar("");
            }}
          >
            Limpiar
          </button>
        </div>
      </form>

      {error && <div className="alert alert-danger">{error}</div>}

      <table className="table table-sm table-hover align-middle">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Usuario</th>
            <th>Acción</th>
            <th>Entidad</th>
            <th>Campo</th>
            <th>Anterior</th>
            <th>Nuevo</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center py-3 text-muted">
                Sin registros.
              </td>
            </tr>
          ) : (
            logs.map((l) => (
              <tr key={l.id}>
                <td style={{ whiteSpace: "nowrap" }}>
                  {new Date(l.creado_en).toLocaleString("es-AR")}
                </td>
                <td>{l.usuario}</td>
                <td>{l.accion}</td>
                <td>
                  {l.entidad} #{l.entidad_id}
                </td>
                <td>{l.campo}</td>
                <td style={{ maxWidth: 180, wordBreak: "break-word" }}>
                  {l.valor_anterior}
                </td>
                <td style={{ maxWidth: 180, wordBreak: "break-word" }}>
                  {l.valor_nuevo}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
