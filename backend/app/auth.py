"""Autenticación por token con roles (admin / developer).

- Contraseñas hasheadas con bcrypt.
- Token propio firmado con HMAC-SHA256 (sin dependencias externas), con expiración.
- Dependencias FastAPI para exigir sesión válida y rol.
"""
import base64
import hashlib
import hmac
import json
import time

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import Usuario

bearer = HTTPBearer(auto_error=False)

TOKEN_TTL_SEGUNDOS = 60 * 60 * 8  # 8 horas


# --- Hashing de contraseñas ---
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verificar_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# --- Token firmado (HMAC) ---
def _b64e(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64d(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def crear_token(usuario: str, rol: str) -> str:
    payload = {"u": usuario, "r": rol, "exp": int(time.time()) + TOKEN_TTL_SEGUNDOS}
    cuerpo = _b64e(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    firma = hmac.new(settings.secret_key.encode("utf-8"), cuerpo.encode("utf-8"), hashlib.sha256).digest()
    return f"{cuerpo}.{_b64e(firma)}"


def _validar_token(token: str) -> dict:
    try:
        cuerpo, firma = token.split(".", 1)
    except ValueError:
        raise HTTPException(status_code=401, detail="Token inválido")
    esperado = hmac.new(settings.secret_key.encode("utf-8"), cuerpo.encode("utf-8"), hashlib.sha256).digest()
    if not hmac.compare_digest(_b64e(esperado), firma):
        raise HTTPException(status_code=401, detail="Token inválido")
    payload = json.loads(_b64d(cuerpo))
    if payload.get("exp", 0) < int(time.time()):
        raise HTTPException(status_code=401, detail="Sesión expirada")
    return payload


# --- Dependencias ---
def usuario_actual(
    cred: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> Usuario:
    if cred is None or not cred.credentials:
        raise HTTPException(status_code=401, detail="No autenticado")
    payload = _validar_token(cred.credentials)
    u = db.execute(
        select(Usuario).where(Usuario.usuario == payload.get("u"))
    ).scalar_one_or_none()
    if u is None or not u.activo:
        raise HTTPException(status_code=401, detail="Usuario inválido o inactivo")
    return u


def require_admin(u: Usuario = Depends(usuario_actual)) -> Usuario:
    """Admin o developer pueden acceder (developer tiene todos los permisos)."""
    if u.rol not in ("admin", "developer"):
        raise HTTPException(status_code=403, detail="No autorizado")
    return u


def require_developer(u: Usuario = Depends(usuario_actual)) -> Usuario:
    if u.rol != "developer":
        raise HTTPException(status_code=403, detail="Requiere rol developer")
    return u


# --- Seed de usuarios iniciales ---
def seed_usuarios(db: Session) -> None:
    """Crea el developer inicial y migra el admin heredado si no existen."""
    def crear_si_falta(nombre: str, password: str, rol: str):
        if not nombre:
            return
        existe = db.execute(select(Usuario).where(Usuario.usuario == nombre)).scalar_one_or_none()
        if existe is None:
            db.add(Usuario(usuario=nombre, password_hash=hash_password(password), rol=rol, activo=True))

    crear_si_falta(settings.developer_user, settings.developer_pass, "developer")
    crear_si_falta(settings.admin_user, settings.admin_pass, "admin")
    db.commit()
