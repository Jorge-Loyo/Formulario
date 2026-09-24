import { useEffect, useState } from "react";
import Link from "next/link";

const PDF_URL = "/informacion-importante.pdf";

export default function InformacionImportante() {
  const [loading, setLoading] = useState(true);
  // Chrome en Android (y otros navegadores móviles) no muestran PDFs incrustados:
  // en ese caso se ofrece abrir el archivo en lugar del visor.
  const [sinVisor, setSinVisor] = useState(false);

  useEffect(() => {
    if (navigator.pdfViewerEnabled === false) setSinVisor(true);
  }, []);

  return (
      <div style={{ paddingBottom: 24 }}>
        <h1 style={{ color: "var(--gcba-azul)", fontFamily: "'Nunito', sans-serif", marginBottom: 16 }}>
          Información Importante
        </h1>
        <div className="d-flex flex-wrap pdf-actions" style={{ gap: 8, marginBottom: 16 }}>
          <Link href="/" className="btn btn-info-header">
            <i className="bx bx-arrow-back" /> Volver al formulario
          </Link>
          <a href={PDF_URL} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary">
            <i className="bx bx-file" /> Abrir PDF
          </a>
        </div>
        <div className="pdf-card">
          {sinVisor ? (
            <div style={{ textAlign: "center", padding: "48px 16px", color: "#6b7580" }}>
              <i className="bx bx-file" style={{ fontSize: 48, color: "var(--gcba-azul)" }} />
              <p style={{ margin: "12px 0 20px" }}>
                Tu navegador no puede mostrar el documento dentro de la página.
              </p>
              <a href={PDF_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                Ver documento
              </a>
            </div>
          ) : (
            <>
              {loading && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "120px 16px",
                    color: "#6b7580",
                    fontSize: 16,
                  }}
                >
                  Cargando documento…
                </div>
              )}
              <embed
                src={PDF_URL}
                type="application/pdf"
                style={{
                  width: "100%",
                  flex: 1,
                  minHeight: "95vh",
                  border: "1px solid #e0e4e6",
                  borderRadius: 8,
                }}
                onLoad={() => setLoading(false)}
              />
            </>
          )}
        </div>
      </div>
  );
}
