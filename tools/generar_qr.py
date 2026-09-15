"""Genera un QR de la página de preinscripción con el logo de Buenos Aires Ciudad
incrustado en el centro.

El logo "BA" se dibuja con el degradado institucional (amarillo -> celeste)
para no depender de un archivo externo.

Uso:
    python tools/generar_qr.py
Genera: tools/qr_formulario.png
"""
from pathlib import Path

import qrcode
from qrcode.constants import ERROR_CORRECT_H
from PIL import Image, ImageDraw, ImageFont

URL = "https://formulario-ten-hazel.vercel.app/"
SALIDA = Path(__file__).parent / "qr_formulario.png"

# Colores institucionales
AMARILLO = (255, 218, 26)
CELESTE = (108, 200, 224)
AZUL_TXT = (21, 50, 44)


def _degradado_vertical(size, color_top, color_bottom):
    """Crea una imagen con degradado vertical."""
    w, h = size
    base = Image.new("RGB", size, color_top)
    top = Image.new("RGB", size, color_bottom)
    mask = Image.new("L", size)
    md = mask.load()
    for y in range(h):
        for x in range(w):
            md[x, y] = int(255 * (y / max(h - 1, 1)))
    base.paste(top, (0, 0), mask)
    return base


def _fuente(px):
    """Intenta una fuente bold; si no, usa la default."""
    for nombre in ("arialbd.ttf", "Arial Bold.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(nombre, px)
        except OSError:
            continue
    return ImageFont.load_default()


def crear_logo_ba(lado):
    """Genera un cuadrado blanco con 'BA' en degradado (amarillo->celeste)."""
    logo = Image.new("RGBA", (lado, lado), (255, 255, 255, 255))
    draw = ImageDraw.Draw(logo)

    # Texto BA en degradado, recortado con máscara del texto
    fnt = _fuente(int(lado * 0.62))
    texto = "BA"

    # medir
    bbox = draw.textbbox((0, 0), texto, font=fnt)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (lado - tw) // 2 - bbox[0]
    ty = (lado - th) // 2 - bbox[1]

    # máscara del texto
    mask = Image.new("L", (lado, lado), 0)
    ImageDraw.Draw(mask).text((tx, ty), texto, font=fnt, fill=255)

    grad = _degradado_vertical((lado, lado), AMARILLO, CELESTE).convert("RGBA")
    logo.paste(grad, (0, 0), mask)
    return logo


def main():
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_H,  # 30% de tolerancia -> permite logo central
        box_size=14,
        border=4,
    )
    qr.add_data(URL)
    qr.make(fit=True)
    img = qr.make_image(fill_color=(21, 50, 68), back_color="white").convert("RGBA")

    # Logo central (~24% del ancho del QR)
    qw, qh = img.size
    lado = int(qw * 0.24)
    logo = crear_logo_ba(lado)

    # Marco blanco alrededor del logo para asegurar contraste
    marco = int(lado * 0.12)
    fondo = Image.new("RGBA", (lado + 2 * marco, lado + 2 * marco), (255, 255, 255, 255))
    fondo.paste(logo, (marco, marco))

    pos = ((qw - fondo.size[0]) // 2, (qh - fondo.size[1]) // 2)
    img.paste(fondo, pos, fondo)

    img.save(SALIDA)
    print(f"QR generado: {SALIDA}  ({img.size[0]}x{img.size[1]} px)")


if __name__ == "__main__":
    main()
