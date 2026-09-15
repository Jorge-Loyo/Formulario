import { useEffect, useRef, useState } from "react";

// ID de provincia CABA en Georef
const CABA_ID = "02";
const GEOREF = "https://apis.datos.gob.ar/georef/api/direcciones";

/**
 * Campo de búsqueda de direcciones reales usando la API Georef (datos.gob.ar).
 * Al seleccionar una sugerencia, llama onSelect con { calle, numero, localidad, provincia }.
 *
 * Props:
 * - value: texto actual de la calle
 * - onChange: (texto) => void  — cambio manual del texto
 * - onSelect: ({calle, numero, localidad, provincia}) => void
 * - soloCABA: boolean — si true, filtra resultados a CABA
 * - className, disabled, id
 */
export default function AutocompleteDireccion({
  value,
  onChange,
  onSelect,
  soloCABA = false,
  className = "form-control",
  disabled = false,
  id,
}) {
  const [sugerencias, setSugerencias] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [resaltado, setResaltado] = useState(-1);
  const debounceRef = useRef(null);
  const boxRef = useRef(null);
  const ignorarRef = useRef(false); // evita re-buscar tras seleccionar

  useEffect(() => {
    // Cerrar el desplegable al hacer clic fuera
    function handleClickFuera(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setAbierto(false);
      }
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
    if (texto.length < 3) {
      setSugerencias([]);
      setAbierto(false);
      return;
    }
    // Debounce de 350ms
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(texto), 350);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  async function buscar(texto) {
    setCargando(true);
    try {
      const params = new URLSearchParams({ direccion: texto, max: "6" });
      if (soloCABA) params.set("provincia", CABA_ID);
      const res = await fetch(`${GEOREF}?${params.toString()}`);
      const data = await res.json();
      setSugerencias(data.direcciones || []);
      setAbierto(true);
      setResaltado(-1);
    } catch {
      setSugerencias([]);
    } finally {
      setCargando(false);
    }
  }

  function elegir(dir) {
    ignorarRef.current = true;
    onSelect({
      calle: dir.calle?.nombre || "",
      numero: dir.altura?.valor != null ? String(dir.altura.valor) : "",
      localidad: dir.localidad_censal?.nombre || "",
      provincia: dir.provincia?.nombre || "",
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
        placeholder="Empezá a escribir la calle…"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => sugerencias.length > 0 && setAbierto(true)}
      />
      {cargando && (
        <span
          style={{ position: "absolute", right: 10, top: 9, fontSize: 12, color: "#6b7580" }}
        >
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
          {sugerencias.map((dir, i) => (
            <li
              key={`${dir.calle?.id}-${i}`}
              onMouseDown={(e) => {
                e.preventDefault();
                elegir(dir);
              }}
              onMouseEnter={() => setResaltado(i)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: 14,
                background: i === resaltado ? "#eef4f8" : "transparent",
              }}
            >
              {dir.nomenclatura}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
