import { useState, useRef } from "react";
import { useRouter } from "next/router";
import { crearInscripcion } from "@/lib/api";
import { PROVINCIAS, SEXOS, TIPOS_DOCUMENTO, TITULO_FIJO, NACIONALIDADES, PROVINCIA_IDS } from "@/lib/constants";
import AutocompleteDireccion from "@/components/AutocompleteDireccion";

const estadoInicial = {
  apellido: "", nombre: "", dni: "", cuil: "", sexo: "", fecha_nacimiento: "", nacionalidad: "",
  telefono_particular: "", telefono_celular: "", telefono_alternativo: "", email: "",
  real_calle: "", real_numero: "", real_piso_depto: "", real_codigo_postal: "", real_localidad: "", real_provincia: "",
  const_calle: "", const_numero: "", const_piso_depto: "", const_codigo_postal: "", const_localidad: "CABA", const_provincia: "Ciudad Autónoma de Buenos Aires",
  universidad: "", matricula_profesional: "", expedida_por: "", especialidad: "",
  cargo_establecimiento: "", cargo_cargo: "",
  apoderado_nombre: "", apoderado_tipo_documento: "", apoderado_documento: "", apoderado_numero_acta: "",
};

// Campos opcionales (no entran en la validación de obligatorios).
const CAMPOS_OPCIONALES = [
  "telefono_particular",
  "telefono_alternativo",
  "real_piso_depto",
  "const_piso_depto",
  "especialidad",
  "cargo_establecimiento",
  "cargo_cargo",
  "apoderado_nombre",
  "apoderado_tipo_documento",
  "apoderado_documento",
  "apoderado_numero_acta",
];

function Label({ children }) {
  return (
    <label className="form-label">
      {children} <span className="required-mark">*</span>
    </label>
  );
}

export default function FormularioInscripcion() {
  const router = useRouter();
  const [form, setForm] = useState(estadoInicial);
  const [confirmarEmail, setConfirmarEmail] = useState("");
  const [nacionalidadOtra, setNacionalidadOtra] = useState(false);
  const confirmNameRef = useRef(`conf_${Math.random().toString(36).slice(2)}`);
  const [declaracion, setDeclaracion] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState("");

  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  // Edad en años a partir de una fecha (YYYY-MM-DD).
  function calcularEdad(fechaStr) {
    if (!fechaStr) return 0;
    const nac = new Date(fechaStr);
    if (isNaN(nac)) return 0;
    const hoy = new Date();
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  }

  // Fecha máxima permitida (hoy menos 18 años) para el input date.
  const maxFechaNacimiento = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split("T")[0];
  })();
  // Bloquea pegar / arrastrar / autocompletar en el campo de confirmación de email.
  function bloquearPegado(e) {
    e.preventDefault();
    return false;
  }

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function validar() {
    const faltantes = Object.entries(form).filter(
      ([campo, v]) => !CAMPOS_OPCIONALES.includes(campo) && !String(v).trim()
    );
    if (faltantes.length > 0) {
      return "Todos los campos son obligatorios. Completá los que faltan (marcados en rojo).";
    }
    if (calcularEdad(form.fecha_nacimiento) < 18) {
      return "El postulante debe ser mayor de edad (18 años o más).";
    }
    if (!emailRegex.test(form.email)) {
      return "El email no tiene un formato válido.";
    }
    if (!confirmarEmail.trim()) {
      return "Confirmá el email volviéndolo a escribir.";
    }
    if (form.email.trim().toLowerCase() !== confirmarEmail.trim().toLowerCase()) {
      return "Los emails no coinciden. Reescribilos para verificar que sean iguales.";
    }
    if (!declaracion) {
      return "Debés confirmar que los datos declarados son verídicos para poder enviar.";
    }
    return "";
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErrorGlobal("");
    const err = validar();
    if (err) {
      setErrorGlobal(err);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setEnviando(true);
    try {
      const resp = await crearInscripcion(form);
      const params = new URLSearchParams({ id: String(resp.id), email: form.email });
      router.push(`/confirmacion?${params.toString()}`);
    } catch (e2) {
      setErrorGlobal(e2.message || "Ocurrió un error al enviar la inscripción.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setEnviando(false);
    }
  }

  const invalido = (campo) => enviando === false && errorGlobal && !String(form[campo]).trim();

  return (
    <>
      <div className="hero">
        <h1>Formulario de Preinscripción</h1>
        <p style={{ lineHeight: 1.6 }}>
          Puesto a cubrir: Psicólogo de Planta<br />
          Profesión: Lic. Psicología (conforme Ley 6035)<br />
          Lugar de inscripción: Rivadavia 524, piso 3, oficina 323, Ciudad Autónoma de Buenos Aires.
        </p>
      </div>

      {errorGlobal && (
        <div className="alert alert-danger alert-fixed" role="alert">
          {errorGlobal}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        {/* DATOS PERSONALES */}
        <section className="card-form">
          <h2 className="section-title">Datos personales</h2>
          <div className="row">
            <div className="col-md-6 mb-3">
              <Label>Apellido</Label>
              <input className={`form-control ${invalido("apellido") ? "is-invalid" : ""}`}
                value={form.apellido} onChange={(e) => set("apellido", e.target.value)} />
            </div>
            <div className="col-md-6 mb-3">
              <Label>Nombre</Label>
              <input className={`form-control ${invalido("nombre") ? "is-invalid" : ""}`}
                value={form.nombre} onChange={(e) => set("nombre", e.target.value)} />
            </div>
            <div className="col-md-3 mb-3">
              <Label>DNI</Label>
              <input className={`form-control ${invalido("dni") ? "is-invalid" : ""}`}
                value={form.dni} onChange={(e) => set("dni", e.target.value)} />
            </div>
            <div className="col-md-3 mb-3">
              <Label>CUIL</Label>
              <input className={`form-control ${invalido("cuil") ? "is-invalid" : ""}`}
                inputMode="numeric" maxLength={11}
                value={form.cuil}
                onChange={(e) => set("cuil", e.target.value.replace(/\D/g, ""))} />
              <span className="form-hint">Solo números, sin guiones (11 dígitos).</span>
            </div>
            <div className="col-md-2 mb-3">
              <Label>Sexo</Label>
              <select className={`form-control ${invalido("sexo") ? "is-invalid" : ""}`}
                value={form.sexo} onChange={(e) => set("sexo", e.target.value)}>
                <option value="">Seleccionar</option>
                {SEXOS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="col-md-4 mb-3">
              <Label>Fecha de nacimiento</Label>
              <input type="date" className={`form-control ${invalido("fecha_nacimiento") ? "is-invalid" : ""}`}
                max={maxFechaNacimiento}
                value={form.fecha_nacimiento} onChange={(e) => set("fecha_nacimiento", e.target.value)} />
              <span className="form-hint">Debe ser mayor de edad (18 años o más).</span>
            </div>
            <div className="col-md-6 mb-3">
              <Label>Nacionalidad</Label>
              <select className={`form-control ${invalido("nacionalidad") && !nacionalidadOtra ? "is-invalid" : ""}`}
                value={nacionalidadOtra ? "Otra" : form.nacionalidad}
                onChange={(e) => {
                  if (e.target.value === "Otra") {
                    setNacionalidadOtra(true);
                    set("nacionalidad", "");
                  } else {
                    setNacionalidadOtra(false);
                    set("nacionalidad", e.target.value);
                  }
                }}>
                <option value="">Seleccionar</option>
                {NACIONALIDADES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              {nacionalidadOtra && (
                <input
                  className={`form-control mt-2 ${invalido("nacionalidad") ? "is-invalid" : ""}`}
                  placeholder="Escribí la nacionalidad"
                  value={form.nacionalidad}
                  onChange={(e) => set("nacionalidad", e.target.value)}
                />
              )}
            </div>
          </div>
        </section>

        {/* CONTACTO */}
        <section className="card-form">
          <h2 className="section-title">Contacto</h2>
          <div className="row">
            <div className="col-md-4 mb-3">
              <Label>Teléfono celular</Label>
              <input className={`form-control ${invalido("telefono_celular") ? "is-invalid" : ""}`}
                inputMode="numeric" maxLength={20}
                value={form.telefono_celular}
                onChange={(e) => set("telefono_celular", e.target.value.replace(/\D/g, ""))} />
              <span className="form-hint">Solo números.</span>
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Teléfono particular</label>
              <input className="form-control"
                inputMode="numeric" maxLength={20}
                value={form.telefono_particular}
                onChange={(e) => set("telefono_particular", e.target.value.replace(/\D/g, ""))} />
              <span className="form-hint">Solo números.</span>
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Teléfono alternativo</label>
              <input className="form-control"
                inputMode="numeric" maxLength={20}
                value={form.telefono_alternativo}
                onChange={(e) => set("telefono_alternativo", e.target.value.replace(/\D/g, ""))} />
              <span className="form-hint">Solo números.</span>
            </div>
            <div className="col-md-6 mb-3">
              <Label>Email</Label>
              <input type="email" className={`form-control ${invalido("email") ? "is-invalid" : ""}`}
                value={form.email} onChange={(e) => set("email", e.target.value)} onPaste={bloquearPegado}
                autoComplete="off" />
            </div>
            <div className="col-md-6 mb-3">
              <Label>Confirmar email</Label>
              <input
                type="text"
                name={confirmNameRef.current}
                inputMode="email"
                className={`form-control ${
                  errorGlobal && (!confirmarEmail.trim() ||
                    form.email.trim().toLowerCase() !== confirmarEmail.trim().toLowerCase())
                    ? "is-invalid"
                    : confirmarEmail && emailRegex.test(confirmarEmail) &&
                      form.email.trim().toLowerCase() === confirmarEmail.trim().toLowerCase()
                    ? "is-valid"
                    : ""
                }`}
                value={confirmarEmail}
                onChange={(e) => setConfirmarEmail(e.target.value)}
                onPaste={bloquearPegado}
                onDrop={bloquearPegado}
                onCopy={bloquearPegado}
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-lpignore="true"
                data-form-type="other"
                data-1p-ignore="true"
              />
              <span className="form-hint">Reescribí el email. No se permite pegar.</span>
            </div>
            <div className="col-12">
              <div className="alert alert-info" role="note" style={{ marginBottom: 0 }}>
                <i className="bx bx-info-circle" style={{ marginRight: 6 }} />
                El presente correo declarado será la vía de notificaciones para todo el proceso concursal.
              </div>
            </div>
          </div>
        </section>

        {/* DOMICILIO REAL */}
        <section className="card-form">
          <h2 className="section-title">Domicilio real</h2>
          <DomicilioCampos prefijo="real" form={form} set={set} invalido={invalido} />
        </section>

        {/* DOMICILIO CONSTITUIDO */}
        <section className="card-form">
          <h2 className="section-title">Domicilio constituido</h2>
          <div className="alert alert-info" role="note">
            <i className="bx bx-info-circle" style={{ marginRight: 6 }} />
            El domicilio constituido deberá ser en la Ciudad Autónoma de Buenos Aires.
          </div>
          <DomicilioCampos prefijo="const" form={form} set={set} invalido={invalido} provinciaFija />
        </section>

        {/* ESTUDIOS */}
        <section className="card-form">
          <h2 className="section-title">Estudios</h2>
          <div className="row">
            <div className="col-md-6 mb-3">
              <Label>Título</Label>
              <input className="form-control" value={TITULO_FIJO} readOnly disabled />
              <span className="form-hint">Título requerido para este concurso.</span>
            </div>
            <div className="col-md-6 mb-3">
              <Label>Universidad</Label>
              <input className={`form-control ${invalido("universidad") ? "is-invalid" : ""}`}
                value={form.universidad} onChange={(e) => set("universidad", e.target.value)} />
            </div>
            <div className="col-md-4 mb-3">
              <Label>Matrícula Profesional</Label>
              <input className={`form-control ${invalido("matricula_profesional") ? "is-invalid" : ""}`}
                value={form.matricula_profesional} onChange={(e) => set("matricula_profesional", e.target.value)} />
            </div>
            <div className="col-md-4 mb-3">
              <Label>Expedida por</Label>
              <input className={`form-control ${invalido("expedida_por") ? "is-invalid" : ""}`}
                value={form.expedida_por} onChange={(e) => set("expedida_por", e.target.value)} />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Especialidad</label>
              <input className="form-control"
                value={form.especialidad} onChange={(e) => set("especialidad", e.target.value)} />
            </div>
          </div>
        </section>

        {/* CARGO ACTUAL EN EL MINISTERIO DE SALUD */}
        <section className="card-form">
          <h2 className="section-title">Cargo actual en el Ministerio de Salud</h2>
          <div className="alert alert-info" role="note">
            <i className="bx bx-info-circle" style={{ marginRight: 6 }} />
            Completar si corresponde.
          </div>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Establecimiento</label>
              <input className="form-control"
                value={form.cargo_establecimiento} onChange={(e) => set("cargo_establecimiento", e.target.value)} />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Cargo</label>
              <input className="form-control"
                value={form.cargo_cargo} onChange={(e) => set("cargo_cargo", e.target.value)} />
            </div>
          </div>
        </section>

        {/* APODERADO */}
        <section className="card-form">
          <h2 className="section-title">Inscripción por apoderado</h2>
          <div className="alert alert-info" role="note">
            <i className="bx bx-info-circle" style={{ marginRight: 6 }} />
            Completar solo en caso de que un tercero presente la inscripción. Debe acompañarse del poder correspondiente.
          </div>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Nombre y Apellido</label>
              <input className="form-control"
                value={form.apoderado_nombre} onChange={(e) => set("apoderado_nombre", e.target.value)} />
            </div>
            <div className="col-md-2 mb-3">
              <label className="form-label">Tipo de documento</label>
              <select className="form-control"
                value={form.apoderado_tipo_documento} onChange={(e) => set("apoderado_tipo_documento", e.target.value)}>
                <option value="">Seleccionar</option>
                {TIPOS_DOCUMENTO.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-md-2 mb-3">
              <label className="form-label">Documento</label>
              <input className="form-control"
                value={form.apoderado_documento} onChange={(e) => set("apoderado_documento", e.target.value)} />
            </div>
            <div className="col-md-2 mb-3">
              <label className="form-label">Número de Acta</label>
              <input className="form-control"
                value={form.apoderado_numero_acta} onChange={(e) => set("apoderado_numero_acta", e.target.value)} />
            </div>
          </div>
        </section>

        <section className="card-form">
          <div className={`form-check ${errorGlobal && !declaracion ? "is-invalid" : ""}`}>
            <input
              className={`form-check-input ${errorGlobal && !declaracion ? "is-invalid" : ""}`}
              type="checkbox"
              id="declaracion"
              checked={declaracion}
              onChange={(e) => setDeclaracion(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="declaracion">
              Declaro bajo juramento que los datos consignados en el presente formulario son verídicos y exactos.
              <span className="required-mark"> *</span>
            </label>
          </div>
        </section>

        <div className="d-flex justify-content-end">
          <button type="submit" className="btn btn-primary btn-lg" disabled={enviando}>
            {enviando ? "Enviando..." : "Enviar inscripción"}
          </button>
        </div>
      </form>
    </>
  );
}

function DomicilioCampos({ prefijo, form, set, invalido, disabled = false, provinciaFija = false }) {
  const c = (s) => `${prefijo}_${s}`;

  // Provincia efectiva: fija en CABA para el constituido, o la elegida en el real.
  const provinciaSel = provinciaFija ? "Ciudad Autónoma de Buenos Aires" : form[c("provincia")];
  const provinciaId = PROVINCIA_IDS[provinciaSel] || "";
  // La calle se habilita una vez elegida la provincia (en el constituido siempre está lista).
  const calleHabilitada = !disabled && (provinciaFija || Boolean(provinciaSel));

  // Al elegir una calle de Georef, completa calle y (en el real) localidad.
  function onSelectCalle({ calle, localidad }) {
    set(c("calle"), calle);
    if (!provinciaFija && localidad) set(c("localidad"), localidad);
  }

  // Al cambiar la provincia en el real, se limpia la calle previa para re-buscar.
  function onChangeProvincia(v) {
    set(c("provincia"), v);
    set(c("calle"), "");
    set(c("localidad"), "");
  }

  return (
    <div className="row">
      {/* Provincia primero */}
      <div className="col-md-4 mb-3">
        <Label>Provincia</Label>
        {provinciaFija ? (
          <select className="form-control" value="Ciudad Autónoma de Buenos Aires" disabled>
            <option value="Ciudad Autónoma de Buenos Aires">Ciudad Autónoma de Buenos Aires</option>
          </select>
        ) : (
          <select className={`form-control ${invalido(c("provincia")) ? "is-invalid" : ""}`} disabled={disabled}
            value={form[c("provincia")]} onChange={(e) => onChangeProvincia(e.target.value)}>
            <option value="">Seleccionar</option>
            {PROVINCIAS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
      </div>

      {/* Calle (filtrada por la provincia elegida) */}
      <div className="col-md-8 mb-3">
        <Label>Calle</Label>
        <AutocompleteDireccion
          className={`form-control ${invalido(c("calle")) ? "is-invalid" : ""}`}
          disabled={!calleHabilitada}
          provinciaId={provinciaId}
          value={form[c("calle")]}
          onChange={(v) => set(c("calle"), v)}
          onSelect={onSelectCalle}
          placeholder={calleHabilitada ? "Empezá a escribir la calle…" : "Elegí primero la provincia"}
        />
        <span className="form-hint">Escribí parte del nombre y elegí la calle de la lista.</span>
      </div>

      <div className="col-md-3 mb-3">
        <Label>Número</Label>
        <input className={`form-control ${invalido(c("numero")) ? "is-invalid" : ""}`} disabled={disabled}
          value={form[c("numero")]} onChange={(e) => set(c("numero"), e.target.value)} />
      </div>
      <div className="col-md-3 mb-3">
        <label className="form-label">Piso/Depto</label>
        <input className="form-control" disabled={disabled}
          value={form[c("piso_depto")]} onChange={(e) => set(c("piso_depto"), e.target.value)} />
      </div>
      <div className="col-md-3 mb-3">
        <Label>Código Postal</Label>
        <input className={`form-control ${invalido(c("codigo_postal")) ? "is-invalid" : ""}`} disabled={disabled}
          inputMode="numeric" maxLength={10}
          value={form[c("codigo_postal")]}
          onChange={(e) => set(c("codigo_postal"), e.target.value.replace(/\D/g, ""))} />
      </div>
      <div className="col-md-3 mb-3">
        <Label>Localidad</Label>
        {provinciaFija ? (
          <input className="form-control" value="CABA" readOnly disabled />
        ) : (
          <input className={`form-control ${invalido(c("localidad")) ? "is-invalid" : ""}`} disabled={disabled}
            value={form[c("localidad")]} onChange={(e) => set(c("localidad"), e.target.value)} />
        )}
      </div>
    </div>
  );
}
