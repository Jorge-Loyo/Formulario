# 🖥️ Cómo correr la aplicación en local

## Requisitos previos

- **Node.js** 18+ ([descargar](https://nodejs.org/))
- **npm** (viene con Node.js)
- **Python** 3.10+ ([descargar](https://www.python.org/downloads/)) — solo si vas a correr el backend localmente
- **Git** ([descargar](https://git-scm.com/))

---

## 1. Clonar el repositorio

```bash
git clone https://github.com/tuusuario/Formulario.git
cd Formulario
```

---

## 2. Frontend (Next.js)

### Instalar dependencias

```bash
cd frontend
npm install
```

### Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Editar `.env.local` y completar:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Ejecutar en desarrollo

```bash
npm run dev
```

La app estará disponible en → **http://localhost:3001**

---

## 3. Backend (FastAPI) — opcional, solo si necesitás el API local

### Crear entorno virtual e instalar dependencias

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows CMD
# o
source .venv/Scripts/activate   # Git Bash / WSL

pip install -r requirements.txt
```

### Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con tus credenciales (Neon, Resend, etc.).

### Ejecutar el servidor

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

La API estará disponible en → **http://localhost:8000**

---

## 4. Ver la aplicación

1. **Con backend corriendo**: Abrí **http://localhost:3001** en tu navegador.
2. **Sin backend**: El formulario funciona, pero el envío de datos dará error (necesitás el backend activo).

---

## Estructura de carpetas relevante

```
Formulario/
├── frontend/                  # App Next.js
│   ├── pages/                 # Rutas de la app
│   │   ├── index.js           # Formulario de inscripción
│   │   ├── confirmacion.js    # Confirmación
│   │   ├── informacion-importante.js  # Visor del PDF
│   │   ├── admin.js           # Panel administrativo
│   │   └── _app.js            # Proveedor global
│   ├── components/            # Layout, gráficos, autocompletado
│   ├── lib/                   # API, constantes
│   ├── styles/globals.css     # Estilos generales (GCBA/Obelisco)
│   ├── public/                # Archivos estáticos (logo, PDF)
│   └── package.json
├── backend/                   # API FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   └── ...
│   ├── requirements.txt
│   └── .env.example
└── render.yaml                # Configuración de deploy en Render
```

---

## Scripts útiles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Compila para producción |
| `npm run start` | Ejecuta la versión compilada |
| `npm run lint` | Verifica errores de linting |

---

## Solución de problemas

- **Puerto 3000 ocupado**: Cambiá el puerto con `PORT=3001 npm run dev` o matá el proceso que lo usa.
- **Error de módulo**: Ejecutá `npm install` nuevamente en la carpeta `frontend/`.
- **CORS al conectar con el backend**: Asegurate de que `NEXT_PUBLIC_API_URL` apunte a `http://localhost:8000` y que el backend esté corriendo.
- **PDF no se muestra**: Verificá que el archivo `frontend/public/informacion-importante.pdf` exista.
