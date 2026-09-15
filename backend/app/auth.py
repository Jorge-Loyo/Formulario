"""Autenticación básica para la sección admin (2 usuarios fijos)."""
import secrets

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from .config import settings

security = HTTPBasic()


def verificar_admin(credentials: HTTPBasicCredentials = Depends(security)) -> str:
    """Valida contra los 2 usuarios permitidos: admin y concursos.

    Devuelve el nombre de usuario si es válido; de lo contrario 401.
    """
    usuarios = {
        settings.admin_user: settings.admin_pass,
        settings.concursos_user: settings.concursos_pass,
    }

    esperado = usuarios.get(credentials.username)
    if esperado is None or not secrets.compare_digest(credentials.password, esperado):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username
