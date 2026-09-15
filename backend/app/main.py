"""API FastAPI — Inscripción a Concurso Público (GCBA)."""
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from . import models, schemas
from .auth import verificar_admin
from .config import settings
from .database import Base, engine, get_db
from .email_service import enviar_email_postulante
from .pdf import generar_pdf_postulante

# Crea las tablas si no existen (para prod se recomienda migraciones con Alembic)
Base.metadata.create_all(bind=engine)

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
    _user: str = Depends(verificar_admin),
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
    _user: str = Depends(verificar_admin),
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
