import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  getToken,
  obtenerPostulante,
  editarPostulante,
  cerrarSesion,
} from "@/lib/api";
import { PROVINCIAS, SEXOS, TIPOS_DOCUMENTO, NACIONALIDADES } from "@/lib/constants";

// Definición de campos por sección para renderizar el formulario de edición.
const SECCIONES = [
  {
    titulo: "Datos personales",
    campos: [
      { name: "apellido", label: "Apellido", col: 6 },
      { name: "nombre", label: "Nombre", col: 6 },
      { name: "dni", label: "DNI", col: 3 },
      { name: "cuil", label: "CUIL", col: 3 },
      { name: "sexo", label: "Género", col: 3, tipo: "select", opciones: SEXOS },
      { name: "fecha_nacimiento", label: "Fecha de nacimiento", col: 3, tipo: "date" },
      { name: "nacionalidad", label: "Nacionalidad", col: 6, tipo: "select-libre", opciones: NACIONALIDADES },
    ],
  },
  {
    titulo: "Contacto",
    campos: [
      { name: "telefono_celular", label: "Teléfono celular", col: 4 },
      { name: "telefono_particular", label: "Teléfono particular", col: 4 },
      { name: "telefono_alternativo", label: "Teléfono alternativo", col: 4 },
      { name: "email", label: "Email", col: 12 },
    ],
  },
  {
    titulo: "Domicilio real",
    campos: [
      { name: "real_calle", label: "Calle", col: 6 },
      { name: "real_numero", label: "Número", col: 3 },
      { name: "real_piso_depto", label: "Piso/Depto", col: 3 },
      { name: "real_codigo_postal", label: "Código Postal", col: 3 },
      { name: "real_localidad", label: "Localidad", col: 5 },
      { name: "real_provincia", label: "Provincia", col: 4, tipo: "select", opciones: PROVINCIAS.map((p) => ({ value: p, label: p })) },
    ],
  },
  {
    titulo: "Domicilio constituido",
    campos: [
      { name: "const_calle", label: "Calle", col: 6 },
      { name: "const_numero", label: "Número", col: 3 },
      { name: "const_piso_depto", label: "Piso/Depto", col: 3 },
      { name: "const_codigo_postal", label: "Código Postal", col: 3 },
      { name: "const_localidad", label: "Localidad", col: 5 },
      { name: "const_provincia", label: "Provincia", col: 4, tipo: "select", opciones: PROVINCIAS.map((p) => ({ value: p, label: p })) },
    ],
  },
  {
    titulo: "Estudios",
    campos: [
      { name: "titulo", label: "Título", col: 6 },
      { name: "universidad", label: "Universidad", col: 6 },
      { name: "matricula_profesional", label: "Matrícula Profesional", col: 4 },
      { name: "expedida_por", label: "Expedida por", col: 4 },
      { name: "especialidad", label: "Especialidad", col: 4 },
    ],
  },
  {
    titulo: "Cargo actual en el Ministerio de Salud",
    campos: [
      { name: "cargo_establecimiento", label: "Establecimiento", col: 6 },
      { name: "cargo_cargo", label: "Cargo", col: 6 },
    ],
  },
  {
    titulo: "Inscripción por apoderado",
    campos: [
      { name: "apoderado_nombre", label: "Nombre y Apellido", col: 6 },
      { name: "apoderado_tipo_documento", label: "Tipo de documento", col: 2, tipo: "select", opciones: TIPOS_DOCUMENTO.map((t) => ({ value: t, label: t })) },
      { name: "apoderado_documento", label: "Documento", col: 2 },
      { name: "apoderado_numero_acta", label: "Número de Acta", col: 2 },
    ],
  },
];

// Todos los campos que se envían al backend (deben coincidir con PostulanteUpdate).
const CAMPOS = SECCIONES.flatMap((s) => s.campos.map((c) => c.name));

export default function EditarPostulante() {
  const router = useRouter();
  const { id } = router.query;
  const [form, setForm] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!id) return;
    if (typeof window !== "undefined" && !getToken()) {
      router.replace("/admin");
      return;
    }
    (async () => {
      try {
        const p = await obtenerPostulante(id);
        // Normalizar fecha a YYYY-MM-DD para el input date.
        if (p.fecha_nacimiento) p.fecha_nacimiento = String(p.fecha_nacimiento).slice(0, 10);
        setForm(p);
      } catch (e) {
        if (e.message === "401") {
          cerrarSesion();
          router.replace("/admin");
        } else {
          setError("No se pudo cargar el postulante.");
        }
      } finally {
        setCargando(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setOk(false);
    // Armar payload solo con los campos editables.
    const datos = {};
    for (const c of CAMPOS) datos[c] = form[c] ?? "";
    setGuardando(true);
    try {
      await editarPostulante(id, datos);
      setOk(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e2) {
      if (e2.message === "401") {
        cerrarSesion();
        router.replace("/admin");
      } else {
        setError(e2.message || "No se pudo guardar la edición.");
      }
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="hero"><h1>Editar preinscripción</h1><p>Cargando…</p></div>
    );
  }
  if (!form) {
    return (
      <>
        <div className="hero"><h1>Editar preinscripción</h1></div>
        <div className="alert alert-danger">{error || "No encontrado."}</div>
        <Link href="/admin" className="btn btn-outline-primary">Volver</Link>
      </>
    );
  }

  return (
    <>
      <div className="hero d-flex justify-content-between align-items-center flex-wrap">
        <div>
          <h1>Editar preinscripción N° {form.id}</h1>
          <p>{form.apellido}, {form.nombre}</p>
        </div>
        <Link href="/admin" className="btn btn-outline-light">
          <i className="bx bx-arrow-back" /> Volver
        </Link>
      </div>

      {ok && <div className="alert alert-success">Cambios guardados correctamente.</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={onSubmit}>
        {SECCIONES.map((sec) => (
          <section key={sec.titulo} className="card-form">
            <h2 className="section-title">{sec.titulo}</h2>
            <div className="row">
              {sec.campos.map((c) => (
                <div key={c.name} className={`${c.col <= 3 ? "col-6" : "col-12"} col-md-${c.col} mb-3`}>
                  <label className="form-label">{c.label}</label>
                  {c.tipo === "select" ? (
                    <select className="form-control" value={form[c.name] ?? ""}
                      onChange={(e) => set(c.name, e.target.value)}>
                      <option value="">Seleccionar</option>
                      {c.opciones.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : c.tipo === "select-libre" ? (
                    <>
                      <input className="form-control" list={`dl-${c.name}`} value={form[c.name] ?? ""}
                        onChange={(e) => set(c.name, e.target.value)} />
                      <datalist id={`dl-${c.name}`}>
                        {c.opciones.map((o) => <option key={o} value={o} />)}
                      </datalist>
                    </>
                  ) : (
                    <input type={c.tipo === "date" ? "date" : "text"} className="form-control"
                      value={form[c.name] ?? ""} onChange={(e) => set(c.name, e.target.value)} />
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className="d-flex justify-content-end gap-2 mb-4 form-actions">
          <Link href="/admin" className="btn btn-outline-secondary">Cancelar</Link>
          <button type="submit" className="btn btn-primary btn-lg" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </>
  );
}
