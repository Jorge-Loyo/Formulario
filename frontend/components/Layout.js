import Link from "next/link";

export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <header className="gcba-header">
        <div className="container">
          <Link href="/" className="brand-logo">
            <img src="/logo-gcba.png" alt="Buenos Aires Ciudad — DGAYDRH" className="brand-img" />
          </Link>
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
