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
from .excel import generar_excel_validadas
from . import notificaciones as notif

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


CLAVE_INSCRIPCIONES = "inscripciones_abiertas"
CLAVE_ADMISION = "admision_abierta"


def _leer_flag(db: Session, clave: str, default: bool = True) -> bool:
    reg = db.execute(
        select(models.Configuracion).where(models.Configuracion.clave == clave)
    ).scalar_one_or_none()
    if reg is None:
        return default
    return reg.valor == "true"


def _guardar_flag(db: Session, clave: str, valor: bool, usuario: str) -> None:
    from datetime import datetime as _dt
    reg = db.execute(
        select(models.Configuracion).where(models.Configuracion.clave == clave)
    ).scalar_one_or_none()
    if reg is None:
        reg = models.Configuracion(clave=clave)
        db.add(reg)
    reg.valor = "true" if valor else "false"
    reg.actualizado_en = _dt.utcnow()
    reg.actualizado_por = usuario


def _inscripciones_abiertas(db: Session) -> bool:
    """Lee el flag de inscripciones. Por defecto: abiertas (si no hay registro)."""
    return _leer_flag(db, CLAVE_INSCRIPCIONES, default=True)


def _admision_abierta(db: Session) -> bool:
    """Lee el flag de admisión. Por defecto: abierta (si no hay registro)."""
    return _leer_flag(db, CLAVE_ADMISION, default=True)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/inscripciones/estado", response_model=schemas.EstadoInscripciones)
def estado_inscripciones(db: Session = Depends(get_db)):
    """Público: indica si las inscripciones están abiertas (para el formulario)."""
    return schemas.EstadoInscripciones(abiertas=_inscripciones_abiertas(db))


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
    # Rechazar si las inscripciones están cerradas (control del lado del servidor).
    if not _inscripciones_abiertas(db):
        raise HTTPException(status_code=403, detail="Las inscripciones al concurso han finalizado.")

    datos = payload.model_dump()
    # Título fijo — forzado en el servidor, no depende del cliente.
    datos["titulo"] = "Licenciado en Psicología"

    # Evitar duplicados: no permitir email ni DNI ya registrados.
    from sqlalchemy import func
    email_norm = datos["email"].strip().lower()
    dni_norm = datos["dni"].strip()
    ya_email = db.execute(
        select(models.Postulante).where(func.lower(models.Postulante.email) == email_norm)
    ).scalar_one_or_none()
    if ya_email is not None:
        raise HTTPException(status_code=409, detail="Ya existe una preinscripción con ese correo electrónico.")
    ya_dni = db.execute(
        select(models.Postulante).where(models.Postulante.dni == dni_norm)
    ).scalar_one_or_none()
    if ya_dni is not None:
        raise HTTPException(status_code=409, detail="Ya existe una preinscripción con ese DNI.")

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
    # Solo se puede editar mientras las inscripciones están abiertas.
    if not _inscripciones_abiertas(db):
        raise HTTPException(
            status_code=403,
            detail="Las inscripciones están cerradas: no se pueden editar los postulantes.",
        )

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


@app.post("/admin/postulantes/{postulante_id}/validar", response_model=schemas.PostulanteOut)
def validar_postulante(
    postulante_id: int,
    user: models.Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Marca/desmarca una preinscripción como validada (toggle) y lo audita."""
    from datetime import datetime as _dt
    postulante = db.get(models.Postulante, postulante_id)
    if postulante is None:
        raise HTTPException(status_code=404, detail="Postulante no encontrado")

    # Solo se puede validar mientras las inscripciones están abiertas.
    if not _inscripciones_abiertas(db):
        raise HTTPException(
            status_code=403,
            detail="Las inscripciones están cerradas: no se puede validar más postulantes.",
        )

    nuevo_estado = not postulante.validado
    postulante.validado = nuevo_estado
    if nuevo_estado:
        postulante.validado_por = user.usuario
        postulante.validado_en = _dt.utcnow()
    else:
        postulante.validado_por = ""
        postulante.validado_en = None

    db.add(models.Auditoria(
        entidad="postulante", entidad_id=postulante.id,
        accion="validar" if nuevo_estado else "desvalidar",
        campo="validado", valor_anterior=str(not nuevo_estado), valor_nuevo=str(nuevo_estado),
        usuario=user.usuario,
    ))
    db.commit()
    db.refresh(postulante)
    return postulante


# =========================================================================
# Inscriptos / Admitidos / Etapas (admin)
# =========================================================================

@app.get("/admin/inscriptos", response_model=list[schemas.PostulanteOut])
def listar_inscriptos(
    q: str | None = Query(default=None),
    _user: models.Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Validados que todavía NO fueron admitidos."""
    stmt = select(models.Postulante).where(
        models.Postulante.validado == True,   # noqa: E712
        models.Postulante.admitido == False,  # noqa: E712
    ).order_by(models.Postulante.validado_en.desc())
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(
            models.Postulante.apellido.ilike(like),
            models.Postulante.dni.ilike(like),
            models.Postulante.cuil.ilike(like),
            models.Postulante.email.ilike(like),
        ))
    return db.execute(stmt).scalars().all()


@app.get("/admin/admitidos", response_model=list[schemas.PostulanteOut])
def listar_admitidos(
    q: str | None = Query(default=None),
    _user: models.Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Postulantes admitidos."""
    stmt = select(models.Postulante).where(
        models.Postulante.admitido == True  # noqa: E712
    ).order_by(models.Postulante.admitido_en.desc())
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(
            models.Postulante.apellido.ilike(like),
            models.Postulante.dni.ilike(like),
            models.Postulante.cuil.ilike(like),
            models.Postulante.email.ilike(like),
        ))
    return db.execute(stmt).scalars().all()


@app.post("/admin/postulantes/{postulante_id}/admitir", response_model=schemas.PostulanteOut)
def admitir_postulante(
    postulante_id: int,
    user: models.Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admite a un inscripto (no reversible) y le envía el correo de admisión.

    Requiere: inscripciones cerradas y admisión abierta.
    """
    from datetime import datetime as _dt
    postulante = db.get(models.Postulante, postulante_id)
    if postulante is None:
        raise HTTPException(status_code=404, detail="Postulante no encontrado")
    if not postulante.validado:
        raise HTTPException(status_code=400, detail="El postulante no está validado (inscripto).")
    if postulante.admitido:
        raise HTTPException(status_code=409, detail="El postulante ya fue admitido.")
    if _inscripciones_abiertas(db):
        raise HTTPException(status_code=403, detail="Primero deben cerrarse las inscripciones.")
    if not _admision_abierta(db):
        raise HTTPException(status_code=403, detail="La etapa de admisión está cerrada.")

    postulante.admitido = True
    postulante.admitido_por = user.usuario
    postulante.admitido_en = _dt.utcnow()

    email_ok = notif.enviar_mail_admision(db, postulante)

    db.add(models.Auditoria(
        entidad="postulante", entidad_id=postulante.id, accion="admitir",
        campo="admitido", valor_anterior="False", valor_nuevo="True",
        usuario=user.usuario,
    ))
    db.commit()
    db.refresh(postulante)
    return postulante


@app.get("/admin/etapas")
def estado_etapas(
    _user: models.Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Estado de las etapas para el panel admin."""
    return {
        "inscripciones_abiertas": _inscripciones_abiertas(db),
        "admision_abierta": _admision_abierta(db),
    }


@app.put("/admin/inscripciones/estado", response_model=schemas.EstadoInscripciones)
def admin_cambiar_inscripciones(
    payload: schemas.EstadoInscripciones,
    user: models.Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Abrir/cerrar inscripciones desde el admin (pestaña Postulados)."""
    anterior = _inscripciones_abiertas(db)
    _guardar_flag(db, CLAVE_INSCRIPCIONES, payload.abiertas, user.usuario)
    db.add(models.Auditoria(
        entidad="configuracion", entidad_id=0,
        accion="abrir_inscripciones" if payload.abiertas else "cerrar_inscripciones",
        campo=CLAVE_INSCRIPCIONES,
        valor_anterior="abiertas" if anterior else "cerradas",
        valor_nuevo="abiertas" if payload.abiertas else "cerradas",
        usuario=user.usuario,
    ))
    db.commit()
    return schemas.EstadoInscripciones(abiertas=payload.abiertas)


@app.put("/admin/admision/estado", response_model=schemas.EstadoAdmision)
def admin_cambiar_admision(
    payload: schemas.EstadoAdmision,
    user: models.Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Abrir/cerrar la etapa de admisión desde el admin (pestaña Inscriptos)."""
    anterior = _admision_abierta(db)
    _guardar_flag(db, CLAVE_ADMISION, payload.abierta, user.usuario)
    db.add(models.Auditoria(
        entidad="configuracion", entidad_id=0,
        accion="abrir_admision" if payload.abierta else "cerrar_admision",
        campo=CLAVE_ADMISION,
        valor_anterior="abierta" if anterior else "cerrada",
        valor_nuevo="abierta" if payload.abierta else "cerrada",
        usuario=user.usuario,
    ))
    db.commit()
    return schemas.EstadoAdmision(abierta=payload.abierta)


@app.post("/admin/admitidos/notificar-examen", response_model=schemas.EnvioNotificacionResponse)
def notificar_examen(
    payload: schemas.NotificarExamenRequest,
    user: models.Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Envía la fecha de examen a todos los admitidos. Requiere admisión cerrada."""
    if _admision_abierta(db):
        raise HTTPException(
            status_code=403,
            detail="Primero debe cerrarse la etapa de admisión para notificar el examen.",
        )
    admitidos = db.execute(
        select(models.Postulante).where(models.Postulante.admitido == True)  # noqa: E712
    ).scalars().all()
    resumen = notif.enviar_mail_examen(db, admitidos, payload.fecha_examen)

    db.add(models.Auditoria(
        entidad="notificacion", entidad_id=0, accion="notificar_examen",
        campo="fecha_examen", valor_anterior="", valor_nuevo=payload.fecha_examen,
        usuario=user.usuario,
    ))
    db.commit()
    return schemas.EnvioNotificacionResponse(
        clave="mail-examen", total=resumen["total"],
        enviados=resumen["enviados"], fallidos=resumen["fallidos"],
    )


# --- Cuerpos editables de los mails de admisión y examen (admin) ---
@app.get("/admin/mails/{clave}")
def obtener_mail(
    clave: str,
    _user: models.Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if clave not in ("mail-admision", "mail-examen"):
        raise HTTPException(status_code=404, detail="Mail desconocido")
    return {"clave": clave, "cuerpo": notif.obtener_cuerpo(db, clave)}


@app.put("/admin/mails/{clave}")
def editar_mail(
    clave: str,
    payload: schemas.NotificacionUpdate,
    user: models.Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if clave not in ("mail-admision", "mail-examen"):
        raise HTTPException(status_code=404, detail="Mail desconocido")
    notif.guardar_cuerpo(db, clave, payload.cuerpo, user.usuario)
    db.add(models.Auditoria(
        entidad="mail", entidad_id=0, accion="editar_mail",
        campo=clave, valor_anterior="", valor_nuevo="cuerpo actualizado",
        usuario=user.usuario,
    ))
    db.commit()
    return {"clave": clave, "cuerpo": notif.obtener_cuerpo(db, clave)}


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


@app.get("/developer/validadas", response_model=list[schemas.PostulanteOut])
def listar_validadas(
    q: str | None = Query(default=None, description="Búsqueda por apellido, nombre, DNI, CUIL o email"),
    _dev: models.Usuario = Depends(require_developer),
    db: Session = Depends(get_db),
):
    """Lista las preinscripciones validadas."""
    stmt = select(models.Postulante).where(
        models.Postulante.validado == True  # noqa: E712
    ).order_by(models.Postulante.validado_en.desc())
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


@app.get("/developer/validadas/excel")
def exportar_validadas_excel(
    _dev: models.Usuario = Depends(require_developer),
    db: Session = Depends(get_db),
):
    """Descarga un Excel (xlsx) con todas las inscripciones validadas."""
    from datetime import datetime as _dt
    validadas = db.execute(
        select(models.Postulante)
        .where(models.Postulante.validado == True)  # noqa: E712
        .order_by(models.Postulante.validado_en.desc())
    ).scalars().all()

    contenido = generar_excel_validadas(validadas)
    nombre = f"inscripciones_validadas_{_dt.now():%Y%m%d_%H%M}.xlsx"
    return Response(
        content=contenido,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
    )


@app.get("/developer/notificaciones", response_model=list[schemas.NotificacionOut])
def listar_notificaciones(
    _dev: models.Usuario = Depends(require_developer),
    db: Session = Depends(get_db),
):
    """Lista las notificaciones disponibles y cuántos destinatarios tendría cada una."""
    salida = []
    for clave, n in notif.NOTIFICACIONES.items():
        salida.append(schemas.NotificacionOut(
            clave=n.clave, titulo=n.titulo, descripcion=n.descripcion,
            asunto=n.asunto, grupo=n.grupo,
            destinatarios=notif.contar_destinatarios(db, clave),
            cuerpo=notif.obtener_cuerpo(db, clave),
        ))
    return salida


@app.put("/developer/notificaciones/{clave}", response_model=schemas.NotificacionOut)
def editar_notificacion(
    clave: str,
    payload: schemas.NotificacionUpdate,
    dev: models.Usuario = Depends(require_developer),
    db: Session = Depends(get_db),
):
    """Edita el cuerpo (texto editable) de una notificación. Saludo y asunto son fijos."""
    n = notif.NOTIFICACIONES.get(clave)
    if n is None:
        raise HTTPException(status_code=404, detail="Notificación desconocida")

    notif.guardar_cuerpo(db, clave, payload.cuerpo, dev.usuario)
    db.add(models.Auditoria(
        entidad="notificacion", entidad_id=0, accion="editar_notificacion",
        campo=clave, valor_anterior="", valor_nuevo="cuerpo actualizado",
        usuario=dev.usuario,
    ))
    db.commit()

    return schemas.NotificacionOut(
        clave=n.clave, titulo=n.titulo, descripcion=n.descripcion,
        asunto=n.asunto, grupo=n.grupo,
        destinatarios=notif.contar_destinatarios(db, clave),
        cuerpo=notif.obtener_cuerpo(db, clave),
    )


@app.post("/developer/notificaciones/{clave}/enviar", response_model=schemas.EnvioNotificacionResponse)
def enviar_notificacion(
    clave: str,
    dev: models.Usuario = Depends(require_developer),
    db: Session = Depends(get_db),
):
    """Envía la notificación a su grupo y registra el envío en auditoría."""
    if clave not in notif.NOTIFICACIONES:
        raise HTTPException(status_code=404, detail="Notificación desconocida")

    # El recordatorio a preinscriptos solo tiene sentido con inscripciones abiertas.
    if clave == "recordatorio-preinscriptos" and not _inscripciones_abiertas(db):
        raise HTTPException(
            status_code=403,
            detail="Las inscripciones están cerradas: no se puede enviar el recordatorio a preinscriptos.",
        )

    resumen = notif.enviar_notificacion(db, clave)

    db.add(models.Auditoria(
        entidad="notificacion", entidad_id=0, accion="enviar_notificacion",
        campo=clave,
        valor_anterior="",
        valor_nuevo=f"enviados={resumen['enviados']} fallidos={resumen['fallidos']} total={resumen['total']}",
        usuario=dev.usuario,
    ))
    db.commit()

    return schemas.EnvioNotificacionResponse(**resumen)


# =========================================================================
# Configuración: abrir / cerrar inscripciones (solo developer)
# =========================================================================

@app.get("/developer/inscripciones/estado", response_model=schemas.EstadoInscripciones)
def developer_estado_inscripciones(
    _dev: models.Usuario = Depends(require_developer),
    db: Session = Depends(get_db),
):
    return schemas.EstadoInscripciones(abiertas=_inscripciones_abiertas(db))


@app.put("/developer/inscripciones/estado", response_model=schemas.EstadoInscripciones)
def cambiar_estado_inscripciones(
    payload: schemas.EstadoInscripciones,
    dev: models.Usuario = Depends(require_developer),
    db: Session = Depends(get_db),
):
    """Abre o cierra las inscripciones y registra el cambio en auditoría."""
    from datetime import datetime as _dt
    estado_anterior = _inscripciones_abiertas(db)
    reg = db.execute(
        select(models.Configuracion).where(models.Configuracion.clave == CLAVE_INSCRIPCIONES)
    ).scalar_one_or_none()
    if reg is None:
        reg = models.Configuracion(clave=CLAVE_INSCRIPCIONES)
        db.add(reg)
    reg.valor = "true" if payload.abiertas else "false"
    reg.actualizado_en = _dt.utcnow()
    reg.actualizado_por = dev.usuario

    db.add(models.Auditoria(
        entidad="configuracion", entidad_id=0,
        accion="abrir_inscripciones" if payload.abiertas else "cerrar_inscripciones",
        campo=CLAVE_INSCRIPCIONES,
        valor_anterior="abiertas" if estado_anterior else "cerradas",
        valor_nuevo="abiertas" if payload.abiertas else "cerradas",
        usuario=dev.usuario,
    ))
    db.commit()
    return schemas.EstadoInscripciones(abiertas=payload.abiertas)
