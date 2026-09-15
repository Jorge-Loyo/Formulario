import Link from "next/link";
import { useRouter } from "next/router";

export default function Confirmacion() {
  const router = useRouter();
  const { id, email } = router.query;

  return (
    <>
      <div className="hero">
        <h1>¡Recibimos tu Preinscripción!</h1>
        <p>Concurso Público — Gobierno de la Ciudad de Buenos Aires</p>
      </div>

      <section className="card-form">
        <div className="d-flex align-items-center mb-3" style={{ gap: 12 }}>
          <i className="bx bx-check-circle" style={{ fontSize: 40, color: "#2e7d32" }} />
          <div>
            <h2 style={{ margin: 0, color: "var(--gcba-azul)" }}>
              Preinscripción registrada{id ? ` — N° ${id}` : ""}
            </h2>
            {email && (
              <p style={{ margin: 0 }} className="form-hint">
                Enviamos una copia de estos pasos a <strong>{email}</strong>.
              </p>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* PLACEHOLDER EDITABLE — Próximos pasos.                              */}
        {/* Este texto debe coincidir con el email (backend: PROXIMOS_PASOS_HTML). */}
        {/* Editalo cuando tengas el contenido definitivo.                     */}
        {/* ------------------------------------------------------------------ */}
        <h3 className="section-title">Próximos pasos</h3>
        <ol style={{ lineHeight: 1.9 }}>
          <li>Lugar de inscripción: Rivadavia 524, piso 3, oficina 323, Ciudad Autónoma de Buenos Aires, de 8 a 15 horas. Fecha de apertura de inscripción: 23/09/2026 y fecha de cierre de inscripción: 02/10/2026.</li>
          <li>
            Recordá acudir con la documentación necesaria para la <strong>inscripción</strong>. El detalle lo
            podés ver en el siguiente link:{" "}
            <a href="https://www.buenosaires.gob.ar/salud/recursos-humanos" target="_blank" rel="noopener noreferrer">
              https://www.buenosaires.gob.ar/salud/recursos-humanos
            </a>{" "}
            (detalle de información general en la página).
          </li>
        </ol>

        <div className="alert alert-info mt-3" role="alert">
          <em>
            Guardá tu número de preinscripción y recordá que la presente preinscripción no constituye la
            inscripción formal al concurso hasta tanto acudas presencialmente con la documentación detallada
            los días y horarios mencionados en el detalle anterior.
          </em>
        </div>

        <p className="mt-4" style={{ fontSize: 16 }}>
          ¡Gracias por realizar tu preinscripción! Te esperamos para formalizar tu inscripción.
        </p>

        <div className="mt-4">
          <Link href="/" className="btn btn-outline-primary">
            Volver al inicio
          </Link>
        </div>
      </section>
    </>
  );
}
