# Inscripción a Concurso Público — GCBA

Sitio web de inscripción a concurso público con el estilo institucional del Gobierno de la Ciudad de Buenos Aires (sistema de diseño **Obelisco**).

---

## ▶️ Correr en local (copiar y pegar)

### Paso 1 — Abrir la terminal y activar el backend

```bash
cd C:\Desarrollo\Formulario\backend
source .venv/Scripts/activate
```

Si no tenés el entorno virtual creado, ejecutá también esto primero:
```bash
python -m venv .venv
source .venv/Scripts/activate
```

### Paso 2 — Instalar dependencias del backend

```bash
pip install -r requirements.txt
```

### Paso 3 — Ejecutar el backend

> ⚠️ **Importante**: eliminá el archivo `.env` para que use SQLite local (no necesita PostgreSQL/Neon).
> ```bash
> del .env
> ```
> O alternativamente, dejá `DATABASE_URL` sin definir para que use `sqlite:///./local.db` por defecto.

```bash
uvicorn app.main:app --reload
```

El backend estará en **http://localhost:8000**

### Paso 4 — Abrir otra terminal y correr el frontend

```bash
cd C:\Desarrollo\Formulario\frontend
npm install
cp .env.local.example .env.local
npm run dev
```

El frontend estará en **http://localhost:3000**

### Paso 5 — Abrir el navegador

```
http://localhost:3000
```

---

## Arquitectura

- **Frontend**: Next.js (React) — usa el CSS de Obelisco (GCBA) vía CDN.
- **Backend**: FastAPI (Python) — API REST con autenticación.
- **Base de datos**: SQLite (local) o PostgreSQL en Neon (producción).
- **Email**: Resend (envío al postulante).
- **PDF**: generación server-side del formulario.

## Estructura

```
Formulario/
├── backend/            # API FastAPI
│   ├── app/
│   │   ├── main.py         # App FastAPI + rutas
│   │   ├── config.py       # Configuración / variables de entorno
│   │   ├── database.py     # Conexión a DB (Neon o SQLite)
│   │   ├── models.py       # Modelos ORM
│   │   ├── schemas.py      # Esquemas Pydantic
│   │   ├── auth.py         # Autenticación básica del admin
│   │   ├── pdf.py          # Generación de PDF
│   │   └── email_service.py # Envío de mail con Resend
│   ├── requirements.txt
│   ├── .env.example
│   └── local.db            # Base de datos SQLite local
├── frontend/           # App Next.js
│   ├── pages/
│   │   ├── index.js              # Pantalla 1: formulario
│   │   ├── confirmacion.js       # Pantalla 2: próximos pasos
│   │   ├── informacion-importante.js  # Visor del PDF informativo
│   │   ├── admin.js              # Pantalla 3: listado admin
│   │   └── _app.js               # Proveedor global
│   ├── components/
│   ├── lib/
│   ├── styles/
│   ├── package.json
│   └── .env.local.example
├── render.yaml         # Deploy del backend en Render
└── LOCAL.md            # Guía detallada para correr localmente
```

## Variables de entorno

### Backend (`backend/.env`)

- `DATABASE_URL` — cadena de conexión de Neon (Postgres). Por defecto usa `sqlite:///./local.db`.
- `RESEND_API_KEY` — API key de Resend.
- `EMAIL_FROM` — remitente verificado en Resend.
- `ADMIN_USER` / `ADMIN_PASS` — credenciales del usuario admin (default: `admin` / `cambiar-esta-clave`).
- `CONCURSOS_USER` / `CONCURSOS_PASS` — credenciales del usuario concursos.
- `FRONTEND_ORIGIN` — origen permitido para CORS (default: `http://localhost:3000`).

### Frontend (`frontend/.env.local`)

- `NEXT_PUBLIC_API_URL` — URL del backend. Por defecto `http://127.0.0.1:8000`.

## Despliegue

### 1. Base de datos — Neon (solo para producción)

1. Crear un proyecto en [neon.tech](https://neon.tech) y una base de datos.
2. Copiar la cadena de conexión y adaptarla al dialecto psycopg3:
   `postgresql+psycopg://USER:PASS@HOST/DB?sslmode=require`
3. Usarla como `DATABASE_URL` en el backend.

### 2. Email — Resend

1. Crear cuenta en [resend.com](https://resend.com) y generar una API key.
2. Verificar un dominio remitente (o usar `onboarding@resend.dev` para pruebas).
3. Configurar `RESEND_API_KEY` y `EMAIL_FROM` en el backend.

### 3. Backend — Render

- El repo incluye `render.yaml` (Blueprint). En Render: **New > Blueprint** apuntando al repo.
- O crear un **Web Service** manual con:
  - Root Directory: `backend`
  - Build: `pip install -r requirements.txt`
  - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
  - Health check: `/health`
- Cargar las variables de entorno (ver `backend/.env.example`).
- `FRONTEND_ORIGIN` debe ser la URL de Vercel para que CORS funcione.

### 4. Frontend — Vercel

- En Vercel: **Add New > Project**, importar el repo.
- Root Directory: `frontend`.
- Variable de entorno: `NEXT_PUBLIC_API_URL` = URL pública del backend en Render.
- Deploy. Vercel detecta Next.js automáticamente.

### Orden recomendado

1. Neon (obtener `DATABASE_URL`).
2. Resend (obtener API key).
3. Render (deploy backend; anotar su URL pública).
4. Vercel (deploy frontend con `NEXT_PUBLIC_API_URL` = URL de Render).
5. Volver a Render y setear `FRONTEND_ORIGIN` = URL de Vercel.

## Notas

- El título de estudio es fijo: **Licenciado en Psicología**.
- Todos los campos del formulario son obligatorios.
- El texto de "próximos pasos" (pantalla 2) y el cuerpo del email son un placeholder editable.
- Admin protegido con 2 usuarios: `admin` y `concursos`.
- El botón "Información importante" en el header abre un visor inline del PDF `DI-2026-42196950-GCABA-DGAYDRH.pdf`.
