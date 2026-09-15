import { useEffect, useRef, useState } from "react";

const GEOREF_CALLES = "https://apis.datos.gob.ar/georef/api/calles";

/**
 * Buscador de calles reales usando la API Georef (datos.gob.ar), endpoint /calles.
 * Hace búsqueda por coincidencia parcial (no exacta) y puede filtrar por provincia.
 *
 * Props:
 * - value: texto actual de la calle
 * - onChange: (texto) => void  — cambio manual del texto
 * - onSelect: ({ calle, localidad, provincia }) => void
 * - provinciaId: string | "" — ID Georef de la provincia para filtrar (vacío = todo el país)
 * - className, disabled, id, placeholder
 */
export default function AutocompleteDireccion({
  value,
  onChange,
  onSelect,
  provinciaId = "",
  className = "form-control",
  disabled = false,
  id,
  placeholder = "Empezá a escribir la calle…",
}) {
  const [sugerencias, setSugerencias] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [resaltado, setResaltado] = useState(-1);
  const debounceRef = useRef(null);
  const boxRef = useRef(null);
  const ignorarRef = useRef(false);

  useEffect(() => {
    function handleClickFuera(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setAbierto(false);
    }
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  useEffect(() => {
    if (ignorarRef.current) {
      ignorarRef.current = false;
      return;
    }
    const texto = (value || "").trim();
    if (texto.length < 2) {
      setSugerencias([]);
      setAbierto(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(texto), 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, provinciaId]);

  async function buscar(texto) {
    setCargando(true);
    try {
      const params = new URLSearchParams({
        nombre: texto,
        max: "10",
        campos: "nombre,localidad_censal,provincia",
      });
      if (provinciaId) params.set("provincia", provinciaId);
      const res = await fetch(`${GEOREF_CALLES}?${params.toString()}`);
      const data = await res.json();
      setSugerencias(data.calles || []);
      setAbierto(true);
      setResaltado(-1);
    } catch {
      setSugerencias([]);
    } finally {
      setCargando(false);
    }
  }

  function etiqueta(calle) {
    const loc = calle.localidad_censal?.nombre;
    const prov = calle.provincia?.nombre;
    const partes = [calle.nombre];
    if (loc) partes.push(loc);
    if (prov && prov !== loc) partes.push(prov);
    return partes.join(", ");
  }

  function elegir(calle) {
    ignorarRef.current = true;
    onSelect({
      calle: calle.nombre || "",
      localidad: calle.localidad_censal?.nombre || "",
      provincia: calle.provincia?.nombre || "",
    });
    setAbierto(false);
    setSugerencias([]);
  }

  function onKeyDown(e) {
    if (!abierto || sugerencias.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setResaltado((r) => Math.min(r + 1, sugerencias.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setResaltado((r) => Math.max(r - 1, 0));
    } else if (e.key === "Enter" && resaltado >= 0) {
      e.preventDefault();
      elegir(sugerencias[resaltado]);
    } else if (e.key === "Escape") {
      setAbierto(false);
    }
  }

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <input
        id={id}
        className={className}
        disabled={disabled}
        value={value}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => sugerencias.length > 0 && setAbierto(true)}
      />
      {cargando && (
        <span style={{ position: "absolute", right: 10, top: 9, fontSize: 12, color: "#6b7580" }}>
          buscando…
        </span>
      )}
      {abierto && sugerencias.length > 0 && (
        <ul
          style={{
            position: "absolute",
            zIndex: 20,
            left: 0,
            right: 0,
            top: "100%",
            margin: 0,
            padding: 0,
            listStyle: "none",
            background: "#fff",
            border: "1px solid #d0d5da",
            borderRadius: 6,
            boxShadow: "0 4px 12px rgba(21,50,68,0.12)",
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {sugerencias.map((calle, i) => (
            <li
              key={`${calle.id}-${i}`}
              onMouseDown={(e) => {
                e.preventDefault();
                elegir(calle);
              }}
              onMouseEnter={() => setResaltado(i)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: 14,
                background: i === resaltado ? "#eef4f8" : "transparent",
              }}
            >
              {etiqueta(calle)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
