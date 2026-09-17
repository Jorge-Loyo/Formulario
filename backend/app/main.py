"""API FastAPI — Inscripción a Concurso Público (GCBA)."""
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from . import models, schemas
from .auth import (
    require_admin, require_developer, usuario_actual,
    crear_token, verificar_password, seed_usuarios,
)
from .config import settings
from .database import Base, engine, get_db, SessionLocal
from .email_service import enviar_email_postulante
from .pdf import generar_pdf_postulante

# Crea las tablas si no existen (para prod se recomienda migraciones con Alembic)
Base.metadata.create_all(bind=engine)

# Seed de usuarios iniciales (developer y admin heredado).
with SessionLocal() as _db:
    seed_usuarios(_db)

app = FastAPI(title="Inscripción a Concurso Público — GCBA", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/auth/login", response_model=schemas.LoginResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    """Login del panel. Devuelve token + rol."""
    u = db.execute(
        select(models.Usuario).where(models.Usuario.usuario == payload.usuario)
    ).scalar_one_or_none()
    if u is None or not u.activo or not verificar_password(payload.password, u.password_hash):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    return schemas.LoginResponse(
        token=crear_token(u.usuario, u.rol),
        usuario=u.usuario,
        rol=u.rol,
    )


@app.post("/inscripciones", response_model=schemas.InscripcionResponse, status_code=201)
def crear_inscripcion(payload: schemas.PostulanteCreate, db: Session = Depends(get_db)):
    """Pantalla 1: recibe el formulario, guarda al postulante y le envía el email."""
    datos = payload.model_dump()
    # Título fijo — forzado en el servidor, no depende del cliente.
    datos["titulo"] = "Licenciado en Psicología"

    postulante = models.Postulante(**datos)
    db.add(postulante)
    db.commit()
    db.refresh(postulante)

    email_enviado = enviar_email_postulante(postulante)

    return schemas.InscripcionResponse(
        id=postulante.id,
        mensaje="Inscripción registrada correctamente.",
        email_enviado=email_enviado,
    )


@app.get("/admin/postulantes", response_model=list[schemas.PostulanteOut])
def listar_postulantes(
    q: str | None = Query(default=None, description="Búsqueda por apellido, nombre, DNI, CUIL o email"),
    _user: models.Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Pantalla 3 (admin): listado de postulados con buscador."""
    stmt = select(models.Postulante).order_by(models.Postulante.id.desc())
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(
            models.Postulante.apellido.ilike(like),
            models.Postulante.nombre.ilike(like),
            models.Postulante.dni.ilike(like),
            models.Postulante.cuil.ilike(like),
            models.Postulante.email.ilike(like),
        ))
    return db.execute(stmt).scalars().all()


@app.get("/admin/postulantes/{postulante_id}/pdf")
def descargar_pdf(
    postulante_id: int,
    _user: models.Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Genera y devuelve el PDF del formulario de un postulante."""
    postulante = db.get(models.Postulante, postulante_id)
    if postulante is None:
        raise HTTPException(status_code=404, detail="Postulante no encontrado")

    pdf_bytes = generar_pdf_postulante(postulante)
    filename = f"inscripcion_{postulante.id}_{postulante.apellido}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@app.get("/admin/postulantes/{postulante_id}", response_model=schemas.PostulanteOut)
def obtener_postulante(
    postulante_id: int,
    _user: models.Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Devuelve un postulante para editarlo."""
    postulante = db.get(models.Postulante, postulante_id)
    if postulante is None:
        raise HTTPException(status_code=404, detail="Postulante no encontrado")
    return postulante


def _valor_str(v) -> str:
    if v is None:
        return ""
    return str(v)


@app.put("/admin/postulantes/{postulante_id}", response_model=schemas.PostulanteOut)
def editar_postulante(
    postulante_id: int,
    payload: schemas.PostulanteUpdate,
    user: models.Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Edita un postulante y registra en auditoría cada campo modificado."""
    postulante = db.get(models.Postulante, postulante_id)
    if postulante is None:
        raise HTTPException(status_code=404, detail="Postulante no encontrado")

    datos = payload.model_dump()
    cambios = []
    for campo, nuevo in datos.items():
        anterior = getattr(postulante, campo)
        # Comparación como string para fechas/valores mixtos.
        if _valor_str(anterior) != _valor_str(nuevo):
            cambios.append((campo, _valor_str(anterior), _valor_str(nuevo)))
            setattr(postulante, campo, nuevo)

    # Registrar cada cambio en la auditoría.
    for campo, anterior, nuevo in cambios:
        db.add(models.Auditoria(
            entidad="postulante",
            entidad_id=postulante.id,
            accion="editar",
            campo=campo,
            valor_anterior=anterior,
            valor_nuevo=nuevo,
            usuario=user.usuario,
        ))

    db.commit()
    db.refresh(postulante)
    return postulante


# =========================================================================
# Gestión de usuarios y auditoría (solo developer)
# =========================================================================

@app.get("/developer/usuarios", response_model=list[schemas.UsuarioOut])
def listar_usuarios(
    _dev: models.Usuario = Depends(require_developer),
    db: Session = Depends(get_db),
):
    return db.execute(
        select(models.Usuario).order_by(models.Usuario.id)
    ).scalars().all()


@app.post("/developer/usuarios", response_model=schemas.UsuarioOut, status_code=201)
def crear_usuario(
    payload: schemas.UsuarioCreate,
    dev: models.Usuario = Depends(require_developer),
    db: Session = Depends(get_db),
):
    from .auth import hash_password
    existe = db.execute(
        select(models.Usuario).where(models.Usuario.usuario == payload.usuario)
    ).scalar_one_or_none()
    if existe is not None:
        raise HTTPException(status_code=409, detail="Ese nombre de usuario ya existe")

    nuevo = models.Usuario(
        usuario=payload.usuario,
        password_hash=hash_password(payload.password),
        rol=payload.rol,
        activo=True,
    )
    db.add(nuevo)
    db.flush()
    db.add(models.Auditoria(
        entidad="usuario", entidad_id=nuevo.id, accion="crear_usuario",
        campo="usuario", valor_anterior="", valor_nuevo=f"{nuevo.usuario} ({nuevo.rol})",
        usuario=dev.usuario,
    ))
    db.commit()
    db.refresh(nuevo)
    return nuevo


@app.put("/developer/usuarios/{usuario_id}", response_model=schemas.UsuarioOut)
def editar_usuario(
    usuario_id: int,
    payload: schemas.UsuarioUpdate,
    dev: models.Usuario = Depends(require_developer),
    db: Session = Depends(get_db),
):
    from .auth import hash_password
    u = db.get(models.Usuario, usuario_id)
    if u is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    cambios = []
    if payload.rol is not None and payload.rol != u.rol:
        cambios.append(("rol", u.rol, payload.rol))
        u.rol = payload.rol
    if payload.activo is not None and payload.activo != u.activo:
        cambios.append(("activo", str(u.activo), str(payload.activo)))
        u.activo = payload.activo
    if payload.password:
        u.password_hash = hash_password(payload.password)
        cambios.append(("password", "***", "*** (actualizada)"))

    for campo, ant, nue in cambios:
        db.add(models.Auditoria(
            entidad="usuario", entidad_id=u.id, accion="editar_usuario",
            campo=campo, valor_anterior=ant, valor_nuevo=nue, usuario=dev.usuario,
        ))
    db.commit()
    db.refresh(u)
    return u


@app.get("/developer/logs", response_model=list[schemas.AuditoriaOut])
def listar_logs(
    q: str | None = Query(default=None, description="Filtro por usuario, campo, acción o entidad"),
    _dev: models.Usuario = Depends(require_developer),
    db: Session = Depends(get_db),
):
    stmt = select(models.Auditoria).order_by(models.Auditoria.id.desc())
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(
            models.Auditoria.usuario.ilike(like),
            models.Auditoria.campo.ilike(like),
            models.Auditoria.accion.ilike(like),
            models.Auditoria.entidad.ilike(like),
        ))
    return db.execute(stmt).scalars().all()
