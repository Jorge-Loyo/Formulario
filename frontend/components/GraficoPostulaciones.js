import { useEffect, useMemo, useState } from "react";

// Fecha de cierre del período (02/10/2026).
const FECHA_CIERRE = new Date(2026, 9, 2); // mes 9 = octubre (0-indexado)

function soloFecha(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function fmtDia(d) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}
// Clave YYYY-MM-DD usando fecha LOCAL (evita el corrimiento de día de toISOString/UTC).
function claveDia(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Gráfico de líneas: X = fechas (día a día, hasta el cierre 02/10), Y = cantidad por día.
 * La línea se dibuja solo hasta HOY (los días futuros quedan como eje vacío).
 * Tope del eje Y = máximo diario x 2.
 */
export default function GraficoPostulaciones({ postulantes }) {
  const [abierto, setAbierto] = useState(false); // arranca colapsado
  // En teléfonos se dibuja más angosto y con scroll horizontal, para que el texto sea legible.
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 576px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const { puntos, maxDia, n, idxHoy } = useMemo(() => {
    if (!postulantes || postulantes.length === 0) {
      return { puntos: [], maxDia: 0, n: 0, idxHoy: 0 };
    }
    const conteo = {};
    let minFecha = null;
    for (const p of postulantes) {
      if (!p.creado_en) continue;
      // Tomar solo la parte de fecha (YYYY-MM-DD) del string, sin conversión de zona horaria.
      const fechaStr = String(p.creado_en).slice(0, 10); // "2026-09-17"
      const [ay, am, ad] = fechaStr.split("-").map(Number);
      const d = new Date(ay, am - 1, ad);
      const clave = claveDia(d);
      conteo[clave] = (conteo[clave] || 0) + 1;
      if (minFecha === null || d < minFecha) minFecha = d;
    }
    if (minFecha === null) return { puntos: [], maxDia: 0, n: 0, idxHoy: 0 };

    const hoy = soloFecha(new Date());
    const fin = FECHA_CIERRE > hoy ? FECHA_CIERRE : hoy;

    const lista = [];
    let maxD = 0;
    let iHoy = 0;
    let i = 0;
    for (let d = new Date(minFecha); d <= fin; d.setDate(d.getDate() + 1)) {
      const actual = soloFecha(new Date(d));
      const clave = claveDia(actual);
      const cant = conteo[clave] || 0;
      const esFuturo = actual > hoy;
      if (!esFuturo && cant > maxD) maxD = cant;
      if (actual <= hoy) iHoy = i;
      lista.push({ fecha: new Date(d), cant, esFuturo });
      i++;
    }
    return { puntos: lista, maxDia: maxD, n: lista.length, idxHoy: iHoy };
  }, [postulantes]);

  if (puntos.length === 0) {
    return (
      <div className="grafico-card">
        <button type="button" onClick={() => setAbierto((v) => !v)} className="grafico-toggle">
          <span className="grafico-titulo">Postulaciones por día</span>
          <i className={`bx ${abierto ? "bx-chevron-up" : "bx-chevron-down"}`} />
        </button>
        {abierto && (
          <p className="text-muted" style={{ margin: "12px 0 0" }}>Todavía no hay postulaciones para graficar.</p>
        )}
      </div>
    );
  }

  const W = mobile ? 700 : 1200;
  const H = mobile ? 300 : 340;
  const padL = 12;
  const padR = 70;
  const padT = 32;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const tope = Math.max(2, maxDia * 2);
  const x = (i) => padL + (n === 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const y = (v) => padT + innerH - (v / tope) * innerH;

  const AZUL = "#153244";

  // La línea solo hasta hoy (índice idxHoy).
  const recorridos = puntos.slice(0, idxHoy + 1);
  const dLine = recorridos.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.cant)}`).join(" ");
  const dArea = recorridos.length > 1
    ? `${dLine} L ${x(idxHoy)} ${padT + innerH} L ${x(0)} ${padT + innerH} Z`
    : "";

  const xHoy = x(idxHoy);
  const yHoy = y(recorridos[recorridos.length - 1].cant);

  const ticks = Math.min(4, tope);
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => Math.round((tope * i) / ticks));
  const paso = Math.max(1, Math.floor(n / (mobile ? 5 : 8)));
  const totalPeriodo = puntos.reduce((s, p) => s + p.cant, 0);

  return (
    <div className="grafico-card">
      <button type="button" onClick={() => setAbierto((v) => !v)} className="grafico-toggle">
        <span className="grafico-titulo">Postulaciones por día</span>
        <span className="d-flex align-items-center" style={{ gap: 10 }}>
          <span className="grafico-rango">
            {fmtDia(puntos[0].fecha)} → {fmtDia(puntos[n - 1].fecha)} · Total: {totalPeriodo}
          </span>
          <i className={`bx ${abierto ? "bx-chevron-up" : "bx-chevron-down"}`} style={{ fontSize: 20 }} />
        </span>
      </button>

      {!abierto ? null : (
      <div className="grafico-scroll">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: "auto", display: "block", marginTop: 8, minWidth: mobile ? W : undefined }} role="img"
        aria-label="Postulaciones por día" preserveAspectRatio="none">
        <defs>
          <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={AZUL} stopOpacity="0.16" />
            <stop offset="100%" stopColor={AZUL} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grilla + ticks Y */}
        {yTicks.map((t, i) => {
          const yy = y(t);
          return (
            <g key={i}>
              <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="#e2e7ec" strokeWidth="1" />
              <text x={W - padR + 8} y={yy + 4} fontSize="12" fill="#8a96a0">{t}</text>
            </g>
          );
        })}

        {/* Línea de "hoy" (marca vertical) si hay días futuros */}
        {idxHoy < n - 1 && (
          <line x1={xHoy} y1={padT} x2={xHoy} y2={padT + innerH}
            stroke="#b8770f" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
        )}

        {/* Área + línea (solo hasta hoy) */}
        {dArea && <path d={dArea} fill="url(#gradArea)" />}
        <path d={dLine} fill="none" stroke={AZUL} strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round" />

        {/* Puntos recorridos + etiqueta de cantidad (solo días con valor > 0) */}
        {recorridos.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.cant)} r={recorridos.length <= 60 ? 3 : 0} fill={AZUL} opacity="0.6">
              <title>{fmtDia(p.fecha)}: {p.cant} postulación(es)</title>
            </circle>
            {p.cant > 0 && i !== idxHoy && recorridos.length <= 60 && (
              <text x={x(i)} y={y(p.cant) - 12} textAnchor="middle" fontSize="18"
                fontWeight="700" fill={AZUL}>{p.cant}</text>
            )}
          </g>
        ))}

        {/* Punto marcado en HOY (destacado) con su cantidad */}
        <circle cx={xHoy} cy={yHoy} r="6" fill={AZUL} stroke="#fff" strokeWidth="2">
          <title>Hoy {fmtDia(puntos[idxHoy].fecha)}: {puntos[idxHoy].cant} postulación(es)</title>
        </circle>
        <text x={xHoy} y={yHoy - 16} textAnchor="middle" fontSize="20" fontWeight="800" fill="#b8770f">
          {puntos[idxHoy].cant}
        </text>

        {/* Etiquetas del eje X (dentro del SVG para que queden alineadas con los puntos) */}
        {puntos.map((p, i) =>
          i % paso === 0 || i === n - 1 || i === idxHoy ? (
            <text key={`xl-${i}`} x={x(i)} y={H - 6} textAnchor="middle"
              fontSize="13"
              fontWeight={i === idxHoy ? 700 : 400}
              fill={i === idxHoy ? "#b8770f" : "#8a96a0"}>
              {fmtDia(p.fecha)}
            </text>
          ) : null
        )}
      </svg>
      </div>
      )}
    </div>
  );
}
