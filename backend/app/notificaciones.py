"""Servicio de notificaciones (campañas de email a grupos de postulantes).

Diseñado para poder disparar distintas notificaciones en varias instancias del
concurso. Cada notificación define: su clave, asunto, a qué grupo va, y cómo se
arma el cuerpo del mail (personalizado por persona).

El envío real usa Resend; si no hay API key, se omite (útil para pruebas).
"""
import logging
from dataclasses import dataclass
from typing import Callable

import resend
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .models import Postulante

logger = logging.getLogger("notificaciones")


# ---------------------------------------------------------------------------
# Plantillas de cuerpo (HTML). Editá el texto acá cuando haga falta.
# {nombre_completo} se reemplaza por "Nombre Apellido".
# ---------------------------------------------------------------------------
RECORDATORIO_PREINSCRIPTOS_HTML = """
<div style="font-family:Arial,sans-serif;font-size:15px;color:#333;line-height:1.6;">
  <p>Hola {nombre_completo}!</p>
  <p>
    Te recordamos que recibimos únicamente tu <strong>pre-inscripción</strong> al concurso de
    Psicólogo/a de Planta por el llamado DI-2026-111-GCABA-DGAYDRH. Estás a solo un paso de
    terminar el proceso.
  </p>
  <p>
    Te esperamos para formalizar tu <strong>INSCRIPCIÓN</strong> con la presentación de la
    documentación. El llamado y fecha límite para esto es este <strong>viernes 2-10-2026 a las 15 hs.</strong>!
  </p>
  <p>Saludos,</p>
  <p style="margin:0;">-</p>
  <p style="margin:0;">Dirección General de Administración y Desarrollo de Recursos Humanos</p>
  <p style="margin:0;">Ministerio de Salud</p>
  <p style="margin:0;">GCBA</p>
</div>
"""


@dataclass
class Notificacion:
    clave: str
    titulo: str            # nombre visible en el panel
    descripcion: str       # a quién se envía / para qué
    asunto: str
    grupo: str             # identificador del grupo destinatario
    cuerpo_html: str       # plantilla con {nombre_completo}


# Registro de notificaciones disponibles.
NOTIFICACIONES: dict[str, Notificacion] = {
    "recordatorio-preinscriptos": Notificacion(
        clave="recordatorio-preinscriptos",
        titulo="Recordatorio a preinscriptos",
        descripcion="Recordatorio para que los preinscriptos (no validados) formalicen su inscripción.",
        asunto="Recordatorio: formalizá tu inscripción — Concurso Psicólogo/a de Planta",
        grupo="no_validados",
        cuerpo_html=RECORDATORIO_PREINSCRIPTOS_HTML,
    ),
}


def _destinatarios(db: Session, grupo: str) -> list[Postulante]:
    """Devuelve la lista de postulantes según el grupo destinatario."""
    stmt = select(Postulante)
    if grupo == "no_validados":
        stmt = stmt.where(Postulante.validado == False)  # noqa: E712
    elif grupo == "validados":
        stmt = stmt.where(Postulante.validado == True)  # noqa: E712
    # "todos": sin filtro
    return db.execute(stmt.order_by(Postulante.id)).scalars().all()


def contar_destinatarios(db: Session, clave: str) -> int:
    noti = NOTIFICACIONES.get(clave)
    if noti is None:
        return 0
    return len(_destinatarios(db, noti.grupo))


def _enviar_email(destino: str, asunto: str, html: str) -> bool:
    """Envía un email individual con Resend. Devuelve True si se envió."""
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY no configurada; se omite envío a %s", destino)
        return False
    resend.api_key = settings.resend_api_key
    try:
        resend.Emails.send({
            "from": settings.email_from,
            "to": [destino],
            "subject": asunto,
            "html": html,
        })
        return True
    except Exception as exc:  # noqa: BLE001
        logger.error("Error enviando notificación a %s: %s", destino, exc)
        return False


def enviar_notificacion(db: Session, clave: str) -> dict:
    """Envía la notificación a cada destinatario de su grupo (mail individual).

    Devuelve un resumen con enviados, fallidos y total.
    """
    noti = NOTIFICACIONES.get(clave)
    if noti is None:
        raise ValueError("Notificación desconocida")

    destinatarios = _destinatarios(db, noti.grupo)
    enviados = 0
    fallidos = 0
    for p in destinatarios:
        nombre_completo = f"{p.nombre} {p.apellido}".strip()
        html = noti.cuerpo_html.format(nombre_completo=nombre_completo)
        ok = _enviar_email(p.email, noti.asunto, html)
        if ok:
            enviados += 1
        else:
            fallidos += 1

    return {
        "clave": clave,
        "total": len(destinatarios),
        "enviados": enviados,
        "fallidos": fallidos,
    }
