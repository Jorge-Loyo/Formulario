import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { datosContacto, enviarContacto } from "@/lib/api";

export default function Contacto() {
  const router = useRouter();
  const { token } = router.query;
  const [datos, setDatos] = useState(null);
  const [tokenValido, setTokenValido] = useState(null); // null=cargando, true/false
  const [asunto, setAsunto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    datosContacto(token)
      .then((d) => { setDatos(d); setTokenValido(true); })
      .catch(() => setTokenValido(false));
  }, [token]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (!asunto.trim() || !mensaje.trim()) {
      setError("Completá el asunto y el mensaje.");
      return;
    }
    setEnviando(true);
    try {
      await enviarContacto(token, asunto, mensaje);
      setEnviado(true);
    } catch (e2) {
      setError(e2.message || "No se pudo enviar el mensaje.");
    } finally {
      setEnviando(false);
    }
  }

  if (tokenValido === false) {
    return (
      <>
        <div className="hero"><h1>Mensaje al equipo de selección</h1></div>
        <section className="card-form">
          <div className="alert alert-danger">El enlace es inválido o venció.</div>
          <Link href="/" className="btn btn-outline-primary">Ir al inicio</Link>
        </section>
      </>
    );
  }

  return (
    <>
      <div className="hero">
        <h1>Mensaje al equipo de selección</h1>
        <p>Concurso Público — Psicólogo/a de Planta</p>
      </div>
      <section className="card-form" style={{ maxWidth: 640, margin: "0 auto" }}>
        {enviado ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <i className="bx bx-check-circle" style={{ fontSize: 56, color: "#2e7d32" }} />
            <h2 style={{ color: "var(--gcba-azul)", marginTop: 12 }}>Mensaje enviado</h2>
            <p style={{ fontSize: 16 }}>Tu mensaje llegó al equipo de selección. ¡Gracias!</p>
            <Link href="/" className="btn btn-outline-primary mt-2">Ir al inicio</Link>
          </div>
        ) : (
          <>
            {datos && (
              <p className="form-hint" style={{ marginBottom: 16 }}>
                Escribís como <strong>{datos.nombre}</strong> ({datos.email}).
              </p>
            )}
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={onSubmit}>
              <div className="mb-3">
                <label className="form-label">Asunto</label>
                <input className="form-control" value={asunto} maxLength={200}
                  onChange={(e) => setAsunto(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">Mensaje</label>
                <textarea className="form-control" rows={6} value={mensaje} maxLength={4000}
                  onChange={(e) => setMensaje(e.target.value)} />
              </div>
              <button className="btn btn-primary" type="submit" disabled={enviando || tokenValido !== true}>
                {enviando ? "Enviando…" : "Enviar mensaje"}
              </button>
            </form>
          </>
        )}
      </section>
    </>
  );
}
