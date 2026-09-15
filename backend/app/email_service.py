"""Envío de email al postulante mediante Resend.

El contenido del email es el MISMO que la pantalla 2 (próximos pasos).
Este texto es un placeholder editable: modificá PROXIMOS_PASOS_HTML.
"""
import logging

import resend

from .config import settings
from .models import Postulante

logger = logging.getLogger("email_service")

# ---------------------------------------------------------------------------
# TEXTO EDITABLE — debe coincidir con la Pantalla 2 (próximos pasos).
# Cambiá este contenido cuando definas el texto definitivo.
# ---------------------------------------------------------------------------
PROXIMOS_PASOS_HTML = """
<h2 style="color:#153244;font-family:Arial,sans-serif;">¡Recibimos tu inscripción!</h2>
<p style="font-family:Arial,sans-serif;font-size:15px;color:#333;">
  Hola {nombre}, registramos tu inscripción al concurso público con el número
  <strong>N° {id}</strong>.
</p>
<h3 style="color:#153244;font-family:Arial,sans-serif;">Próximos pasos</h3>
<ol style="font-family:Arial,sans-serif;font-size:15px;color:#333;">
  <li>Placeholder: acá van a ir los próximos pasos definitivos.</li>
  <li>Placeholder: documentación a presentar / fechas / lugar.</li>
  <li>Placeholder: cualquier otra indicación.</li>
</ol>
<p style="font-family:Arial,sans-serif;font-size:13px;color:#777;">
  Este es un mensaje automático. Por favor no respondas a este correo.
</p>
"""


def enviar_email_postulante(p: Postulante) -> bool:
    """Envía el email de confirmación al postulante. Devuelve True si se envió."""
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY no configurada; se omite el envío de email.")
        return False

    resend.api_key = settings.resend_api_key
    html = PROXIMOS_PASOS_HTML.format(nombre=p.nombre, id=p.id)

    try:
        resend.Emails.send({
            "from": settings.email_from,
            "to": [p.email],
            "subject": f"Inscripción a Concurso Público — N° {p.id}",
            "html": html,
        })
        return True
    except Exception as exc:  # noqa: BLE001
        logger.error("Error enviando email con Resend: %s", exc)
        return False
