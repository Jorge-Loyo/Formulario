"""Modelos ORM."""
from datetime import datetime, date

from sqlalchemy import Integer, String, Date, DateTime, Boolean, Text
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


class Usuario(Base):
    """Usuarios del panel (roles: 'admin' o 'developer')."""
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    usuario: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    rol: Mapped[str] = mapped_column(String(20), default="admin")  # 'admin' | 'developer'
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Auditoria(Base):
    """Registro de cambios realizados desde el panel (no incluye cargas públicas)."""
    __tablename__ = "auditoria"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # A qué entidad se refiere (ej. "postulante" o "usuario") y su id.
    entidad: Mapped[str] = mapped_column(String(40), default="postulante")
    entidad_id: Mapped[int] = mapped_column(Integer, default=0)
    # Acción: 'editar', 'crear_usuario', 'editar_usuario', etc.
    accion: Mapped[str] = mapped_column(String(40), default="editar")
    campo: Mapped[str] = mapped_column(String(80), default="")
    valor_anterior: Mapped[str] = mapped_column(Text, default="")
    valor_nuevo: Mapped[str] = mapped_column(Text, default="")
    # Quién hizo el cambio (nombre de usuario del panel).
    usuario: Mapped[str] = mapped_column(String(80), default="")
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
