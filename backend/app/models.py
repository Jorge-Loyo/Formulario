"""Modelos ORM."""
from datetime import datetime, date

from sqlalchemy import Integer, String, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Postulante(Base):
    __tablename__ = "postulantes"

    # ID interno incremental, único. No lo completa ni lo ve el usuario.
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # --- Datos personales ---
    apellido: Mapped[str] = mapped_column(String(120))
    nombre: Mapped[str] = mapped_column(String(120))
    dni: Mapped[str] = mapped_column(String(20))
    cuil: Mapped[str] = mapped_column(String(20))
    sexo: Mapped[str] = mapped_column(String(2))  # M / F / NB
    fecha_nacimiento: Mapped[date] = mapped_column(Date)
    nacionalidad: Mapped[str] = mapped_column(String(80))

    # --- Contacto ---
    telefono_particular: Mapped[str] = mapped_column(String(40))
    telefono_celular: Mapped[str] = mapped_column(String(40))
    telefono_alternativo: Mapped[str] = mapped_column(String(40))
    email: Mapped[str] = mapped_column(String(200))

    # --- Domicilio real ---
    real_calle: Mapped[str] = mapped_column(String(160))
    real_numero: Mapped[str] = mapped_column(String(20))
    real_piso_depto: Mapped[str] = mapped_column(String(40))
    real_codigo_postal: Mapped[str] = mapped_column(String(20))
    real_localidad: Mapped[str] = mapped_column(String(120))
    real_provincia: Mapped[str] = mapped_column(String(80))

    # --- Domicilio constituido ---
    const_calle: Mapped[str] = mapped_column(String(160))
    const_numero: Mapped[str] = mapped_column(String(20))
    const_piso_depto: Mapped[str] = mapped_column(String(40))
    const_codigo_postal: Mapped[str] = mapped_column(String(20))
    const_localidad: Mapped[str] = mapped_column(String(120))
    const_provincia: Mapped[str] = mapped_column(String(80))

    # --- Estudios ---
    titulo: Mapped[str] = mapped_column(String(160), default="Licenciado en Psicología")
    universidad: Mapped[str] = mapped_column(String(200))
    matricula_profesional: Mapped[str] = mapped_column(String(80))
    expedida_por: Mapped[str] = mapped_column(String(200))
    especialidad: Mapped[str] = mapped_column(String(200))

    # --- Cargo actual en el Ministerio de Salud (opcional) ---
    cargo_establecimiento: Mapped[str] = mapped_column(String(200), default="")
    cargo_cargo: Mapped[str] = mapped_column(String(200), default="")

    # --- Apoderado (solo si un tercero presenta la inscripción) ---
    apoderado_nombre: Mapped[str] = mapped_column(String(200))
    apoderado_tipo_documento: Mapped[str] = mapped_column(String(40))
    apoderado_documento: Mapped[str] = mapped_column(String(40))
    apoderado_numero_acta: Mapped[str] = mapped_column(String(40))

    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
