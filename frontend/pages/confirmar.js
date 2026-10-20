import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { confirmarPostulante } from "@/lib/api";

export default function Confirmar() {
  const router = useRouter();
  const { tipo, token } = router.query;
  const [estado, setEstado] = useState("cargando"); // cargando | ok | error
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    if (!tipo || !token) return;
    confirmarPostulante(tipo, token)
      .then((r) => {
        setEstado("ok");
        setMensaje(r.mensaje || "Confirmación registrada.");
      })
      .catch(() => {
        setEstado("error");
        setMensaje("No pudimos registrar tu confirmación. El enlace puede ser inválido o haber vencido.");
      });
  }, [tipo, token]);

  const titulo = tipo === "asistencia" ? "Confirmación de asistencia" : "Confirmación de recepción";

  return (
    <>
      <div className="hero">
        <h1>{titulo}</h1>
        <p>Concurso Público — Psicólogo/a de Planta</p>
      </div>
      <section className="card-form" style={{ textAlign: "center", padding: "40px 28px" }}>
        {estado === "cargando" && <p>Procesando…</p>}
        {estado === "ok" && (
          <>
            <i className="bx bx-check-circle" style={{ fontSize: 56, color: "#2e7d32" }} />
            <h2 style={{ color: "var(--gcba-azul)", marginTop: 12 }}>¡Listo!</h2>
            <p style={{ fontSize: 16, color: "#333" }}>{mensaje}</p>
          </>
        )}
        {estado === "error" && (
          <>
            <i className="bx bx-error-circle" style={{ fontSize: 56, color: "#c1121f" }} />
            <h2 style={{ color: "var(--gcba-azul)", marginTop: 12 }}>No se pudo confirmar</h2>
            <p style={{ fontSize: 16, color: "#333" }}>{mensaje}</p>
          </>
        )}
        <div className="mt-4">
          <Link href="/" className="btn btn-outline-primary">Ir al inicio</Link>
        </div>
      </section>
    </>
  );
}
