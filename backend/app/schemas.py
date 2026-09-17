"""Esquemas Pydantic para validación de entrada/salida."""
from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field, ConfigDict


class PostulanteBase(BaseModel):
    # Datos personales
    apellido: str = Field(min_length=1, max_length=120)
    nombre: str = Field(min_length=1, max_length=120)
    dni: str = Field(min_length=1, max_length=20)
    cuil: str = Field(min_length=1, max_length=20)
    sexo: str = Field(pattern="^(M|F|NS)$")
    fecha_nacimiento: date
    nacionalidad: str = Field(min_length=1, max_length=80)

    # Contacto
    telefono_celular: str = Field(min_length=1, max_length=40)
    telefono_particular: str = Field(default="", max_length=40)
    telefono_alternativo: str = Field(default="", max_length=40)
    email: EmailStr

    # Domicilio real
    real_calle: str = Field(min_length=1, max_length=160)
    real_numero: str = Field(min_length=1, max_length=20)
    real_piso_depto: str = Field(default="", max_length=40)
    real_codigo_postal: str = Field(min_length=1, max_length=20)
    real_localidad: str = Field(min_length=1, max_length=120)
    real_provincia: str = Field(min_length=1, max_length=80)

    # Domicilio constituido
    const_calle: str = Field(min_length=1, max_length=160)
    const_numero: str = Field(min_length=1, max_length=20)
    const_piso_depto: str = Field(default="", max_length=40)
    const_codigo_postal: str = Field(min_length=1, max_length=20)
    const_localidad: str = Field(min_length=1, max_length=120)
    const_provincia: str = Field(min_length=1, max_length=80)

    # Estudios (título fijo, pero se acepta y se fuerza en el server)
    universidad: str = Field(min_length=1, max_length=200)
    matricula_profesional: str = Field(min_length=1, max_length=80)
    expedida_por: str = Field(min_length=1, max_length=200)
    especialidad: str = Field(default="", max_length=200)

    # Cargo actual en el Ministerio de Salud (opcional)
    cargo_establecimiento: str = Field(default="", max_length=200)
    cargo_cargo: str = Field(default="", max_length=200)

    # Apoderado (opcional: completar solo si un tercero presenta la inscripción)
    apoderado_nombre: str = Field(default="", max_length=200)
    apoderado_tipo_documento: str = Field(default="", max_length=40)
    apoderado_documento: str = Field(default="", max_length=40)
    apoderado_numero_acta: str = Field(default="", max_length=40)


class PostulanteCreate(PostulanteBase):
    pass


class PostulanteUpdate(PostulanteBase):
    """Edición desde el panel admin. Permite editar todos los campos (incluido título)."""
    titulo: str = Field(min_length=1, max_length=160)


class PostulanteOut(PostulanteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    titulo: str
    creado_en: datetime


class InscripcionResponse(BaseModel):
    id: int
    mensaje: str
    email_enviado: bool


# --- Autenticación ---
class LoginRequest(BaseModel):
    usuario: str
    password: str


class LoginResponse(BaseModel):
    token: str
    usuario: str
    rol: str


# --- Usuarios (gestión desde /developer) ---
class UsuarioCreate(BaseModel):
    usuario: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=6, max_length=200)
    rol: str = Field(pattern="^(admin|developer)$")


class UsuarioUpdate(BaseModel):
    # Campos opcionales para editar: cambiar clave, rol o activar/desactivar.
    password: str | None = Field(default=None, min_length=6, max_length=200)
    rol: str | None = Field(default=None, pattern="^(admin|developer)$")
    activo: bool | None = None


class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario: str
    rol: str
    activo: bool
    creado_en: datetime


# --- Auditoría ---
class AuditoriaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    entidad: str
    entidad_id: int
    accion: str
    campo: str
    valor_anterior: str
    valor_nuevo: str
    usuario: str
    creado_en: datetime
