import Link from "next/link";
import { useRouter } from "next/router";

export default function Layout({ children }) {
  const router = useRouter();
  const isInfoPage = router.pathname === "/informacion-importante";

  return (
    <div className="app-shell">
      <header className="gcba-header">
        <div className="container gcba-header-inner">
          <Link href="/" className="brand-logo">
            <img src="/logo-gcba.png" alt="Buenos Aires Ciudad — DGAYDRH" className="brand-img" />
          </Link>
          {!isInfoPage && (
            <div>
              <a
                href="/informacion-importante"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-info-header"
              >
                <i className="bx bx-info-circle" /> Información importante
              </a>
              <p style={{ color: "#cfd6db", fontSize: 11, marginTop: 4 }}>
                Detalle de llamado a concurso
              </p>
            </div>
          )}
        </div>
      </header>

      <main className="page-content">
        <div className="container">{children}</div>
      </main>

      <footer className="gcba-footer">
        <div className="container">
          <div>Gobierno de la Ciudad de Buenos Aires</div>
          <div style={{ opacity: 0.7, marginTop: 4 }}>
            Preinscripción a Concurso Público · Sistema de gestión de postulaciones
          </div>
        </div>
      </footer>
    </div>
  );
}
