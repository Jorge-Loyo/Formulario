import { useState } from "react";
import Link from "next/link";

export default function InformacionImportante() {
  const [loading, setLoading] = useState(true);

  return (
      <div className="container" style={{ paddingTop: 24, paddingBottom: 48 }}>
        <h1 style={{ color: "var(--gcba-azul)", fontFamily: "'Nunito', sans-serif", marginBottom: 16 }}>
          Información Importante
        </h1>
        <Link href="/" className="btn btn-info-header" style={{ alignSelf: "flex-start", marginBottom: 16 }}>
          <i className="bx bx-arrow-back" /> Volver al formulario
        </Link>
        <div
          style={{
            background: "#fff",
            borderRadius: 10,
            boxShadow: "0 2px 10px rgba(21,50,68,0.08)",
            padding: 28,
            minHeight: "80vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
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
            src="/informacion-importante.pdf"
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
        </div>
      </div>
  );
}
