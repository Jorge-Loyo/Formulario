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
<h2 style="color:#153244;font-family:Arial,sans-serif;">¡Recibimos tu preinscripción!</h2>
<p style="font-family:Arial,sans-serif;font-size:15px;color:#333;">
  Hola {nombre}, registramos tu preinscripción al concurso público con el número
  <strong>N° {id}</strong>.
</p>
<h3 style="color:#153244;font-family:Arial,sans-serif;">Próximos pasos</h3>
<ol style="font-family:Arial,sans-serif;font-size:15px;color:#333;line-height:1.7;">
  <li>
    Lugar de inscripción: Rivadavia 524, piso 3, oficina 323, Ciudad Autónoma de Buenos Aires,
    de 8 a 15 horas. Fecha de apertura de inscripción: 23/09/2026 y fecha de cierre de inscripción: 02/10/2026.
  </li>
  <li>
    Recordá acudir con la documentación necesaria para la <strong>inscripción</strong>. El detalle lo podés ver
    en el siguiente link:
    <a href="https://www.buenosaires.gob.ar/salud/recursos-humanos">https://www.buenosaires.gob.ar/salud/recursos-humanos</a>
    (detalle de información general en la página).
  </li>
</ol>
<p style="font-family:Arial,sans-serif;font-size:14px;color:#333;font-style:italic;">
  Guardá tu número de preinscripción y recordá que la presente preinscripción no constituye la inscripción
  formal al concurso hasta tanto acudas presencialmente con la documentación detallada los días y horarios
  mencionados en el detalle anterior.
</p>
<p style="font-family:Arial,sans-serif;font-size:15px;color:#333;">
  ¡Gracias por realizar tu preinscripción! Te esperamos para formalizar tu inscripción.
</p>
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
            "subject": f"Preinscripción a Concurso Público — N° {p.id}",
            "html": html,
        })
        return True
    except Exception as exc:  # noqa: BLE001
        logger.error("Error enviando email con Resend: %s", exc)
        return False
