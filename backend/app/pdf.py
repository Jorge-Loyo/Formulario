"""Generación del PDF del formulario (versión de prueba, editable)."""
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)

from .models import Postulante

# Colores institucionales aproximados del GCBA
GCBA_AZUL = colors.HexColor("#153244")
GCBA_AMARILLO = colors.HexColor("#FFDA1A")


def _styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="Titulo", fontName="Helvetica-Bold", fontSize=15,
                              textColor=GCBA_AZUL, spaceAfter=2))
    styles.add(ParagraphStyle(name="Subtitulo", fontName="Helvetica", fontSize=9,
                              textColor=colors.HexColor("#5A6672"), spaceAfter=10))
    styles.add(ParagraphStyle(name="Seccion", fontName="Helvetica-Bold", fontSize=10,
                              textColor=colors.white, backColor=GCBA_AZUL,
                              leftIndent=4, spaceBefore=8, spaceAfter=4, leading=16))
    return styles


SEXO_LABELS = {"M": "Masculino", "F": "Femenino", "NB": "NB", "NS": "Prefiero no decirlo"}


def _label_sexo(valor):
    return SEXO_LABELS.get(valor, valor or "-")


def _seccion(titulo, filas, styles):
    """Construye una tabla de 4 columnas (etiqueta/valor, etiqueta/valor)."""
    data = []
    fila = []
    for etiqueta, valor in filas:
        fila.append(Paragraph(f"<b>{etiqueta}</b>", styles["BodyText"]))
        fila.append(Paragraph(str(valor or "-"), styles["BodyText"]))
        if len(fila) == 4:
            data.append(fila)
            fila = []
    if fila:
        while len(fila) < 4:
            fila.append(Paragraph("", styles["BodyText"]))
        data.append(fila)

    tabla = Table(data, colWidths=[32 * mm, 60 * mm, 32 * mm, 46 * mm])
    tabla.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.HexColor("#D0D5DA")),
    ]))
    return tabla


def _documentacion_presentada(styles):
    """Sección de documentación presentada: tabla vacía para completar a mano
    más las líneas de totales y soporte magnético. Sale igual en todos los PDF."""
    elems = []

    encabezados = ["Documentación", "Cantidad de Fojas", "Obra agregado a Fs."]
    filas_doc = ["Curriculum", "Título", "Especialidad", "Matrícula", "Documento", "Otros"]

    data = [encabezados]
    for nombre in filas_doc:
        data.append([nombre, "", ""])

    tabla = Table(data, colWidths=[70 * mm, 50 * mm, 50 * mm])
    tabla.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#8A96A0")),
        ("BACKGROUND", (0, 0), (-1, 0), GCBA_AZUL),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    elems.append(tabla)
    elems.append(Spacer(1, 10))

    elems.append(Paragraph("Cantidad de Fojas Totales: __________________", styles["BodyText"]))
    return elems


def _troquel(styles):
    """Troquel de comprobante de inscripción que se lleva el postulante."""
    elems = []
    elems.append(Spacer(1, 24))

    # Línea de corte (troquel)
    elems.append(Paragraph(
        "✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -",
        styles["Subtitulo"],
    ))
    elems.append(Spacer(1, 8))

    elems.append(Paragraph(
        "COMPROBANTE DE INSCRIPCIÓN", styles["Seccion"],
    ))
    elems.append(Spacer(1, 6))
    elems.append(Paragraph(
        "Recepción del formulario y documentación en original.",
        styles["BodyText"],
    ))
    elems.append(Spacer(1, 14))
    elems.append(Paragraph(
        "Buenos Aires, " + "_" * 12 + " de " + "_" * 22 + " de " + "_" * 22 + ".",
        styles["BodyText"],
    ))
    return elems


def generar_pdf_postulante(p: Postulante) -> bytes:
    """Genera el PDF de un postulante y devuelve los bytes."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=16 * mm, bottomMargin=16 * mm,
        title=f"Inscripción N° {p.id}",
    )
    styles = _styles()
    elems = []

    elems.append(Paragraph("FORMULARIO DE INSCRIPCIÓN", styles["Titulo"]))
    elems.append(Paragraph(
        "Puesto a cubrir: Psicólogo de Planta<br/>"
        "Profesión: Lic. Psicología (conforme Ley 6035)<br/>"
        "Lugar de inscripción: Rivadavia 524, piso 3, oficina 323, Ciudad Autónoma de Buenos Aires.",
        styles["Subtitulo"],
    ))

    encabezado = Table(
        [[Paragraph(f"<b>Inscripto N°:</b> {p.id}", styles["BodyText"]),
          Paragraph(f"<b>Fecha:</b> {p.creado_en:%d/%m/%Y %H:%M}", styles["BodyText"])]],
        colWidths=[85 * mm, 85 * mm],
    )
    encabezado.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GCBA_AMARILLO),
        ("BOX", (0, 0), (-1, -1), 0.5, GCBA_AZUL),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    elems.append(encabezado)
    elems.append(Spacer(1, 6))

    elems.append(Paragraph("DATOS PERSONALES", styles["Seccion"]))
    elems.append(_seccion("Datos personales", [
        ("Apellido", p.apellido), ("Nombre", p.nombre),
        ("DNI", p.dni), ("CUIL", p.cuil),
        ("Sexo", _label_sexo(p.sexo)), ("Fecha de nacimiento", f"{p.fecha_nacimiento:%d/%m/%Y}"),
        ("Nacionalidad", p.nacionalidad), ("", ""),
    ], styles))

    elems.append(Paragraph("CONTACTO", styles["Seccion"]))
    elems.append(_seccion("Contacto", [
        ("Tel. particular", p.telefono_particular), ("Tel. celular", p.telefono_celular),
        ("Tel. alternativo", p.telefono_alternativo), ("Email", p.email),
    ], styles))

    elems.append(Paragraph("DOMICILIO REAL", styles["Seccion"]))
    elems.append(_seccion("Domicilio real", [
        ("Calle", p.real_calle), ("Número", p.real_numero),
        ("Piso/Depto", p.real_piso_depto), ("Código Postal", p.real_codigo_postal),
        ("Localidad", p.real_localidad), ("Provincia", p.real_provincia),
    ], styles))

    elems.append(Paragraph("DOMICILIO CONSTITUIDO", styles["Seccion"]))
    elems.append(_seccion("Domicilio constituido", [
        ("Calle", p.const_calle), ("Número", p.const_numero),
        ("Piso/Depto", p.const_piso_depto), ("Código Postal", p.const_codigo_postal),
        ("Localidad", p.const_localidad), ("Provincia", p.const_provincia),
    ], styles))

    elems.append(Paragraph("ESTUDIOS", styles["Seccion"]))
    elems.append(_seccion("Estudios", [
        ("Título", p.titulo), ("Universidad", p.universidad),
        ("Matrícula Prof. Nacional", p.matricula_profesional), ("Expedida por", p.expedida_por),
        ("Especialidad", p.especialidad), ("", ""),
    ], styles))

    elems.append(Paragraph("CARGO ACTUAL EN EL MINISTERIO DE SALUD", styles["Seccion"]))
    elems.append(_seccion("Cargo actual", [
        ("Establecimiento", p.cargo_establecimiento), ("Cargo", p.cargo_cargo),
    ], styles))

    elems.append(Paragraph("INSCRIPCIÓN POR APODERADO", styles["Seccion"]))
    elems.append(_seccion("Apoderado", [
        ("Nombre y Apellido", p.apoderado_nombre), ("Tipo de documento", p.apoderado_tipo_documento),
        ("Documento", p.apoderado_documento), ("N° de Acta", p.apoderado_numero_acta),
    ], styles))

    # --- Documentación presentada (campos a completar manualmente) ---
    # Inicia en una hoja nueva para que la tabla no se corte entre páginas.
    elems.append(PageBreak())
    elems.append(Paragraph("DOCUMENTACIÓN PRESENTADA", styles["Seccion"]))
    elems.extend(_documentacion_presentada(styles))

    # --- Cargo a concursar + declaración jurada y firma ---
    elems.append(Spacer(1, 14))
    elems.append(Paragraph("CARGO A CONCURSAR", styles["Seccion"]))
    elems.append(Spacer(1, 6))
    elems.append(Paragraph(
        "Cargo: Psicólogo de Planta",
        styles["BodyText"],
    ))
    elems.append(Spacer(1, 18))
    elems.append(Paragraph(
        "Declaro bajo juramento que los datos, manifestaciones efectuadas y documentación presentada "
        "son exactos y verdaderos, sin omitir ni falsear dato alguno.",
        styles["BodyText"],
    ))
    elems.append(Spacer(1, 26))
    firma_style = ParagraphStyle(
        "FirmaCentrada", parent=styles["BodyText"], alignment=1  # 1 = centrado
    )
    firma = Table([[""], [Paragraph("Firma y aclaración", firma_style)]], colWidths=[90 * mm])
    firma.setStyle(TableStyle([
        ("LINEABOVE", (0, 1), (0, 1), 0.5, colors.black),
        ("TOPPADDING", (0, 1), (0, 1), 2),
    ]))
    elems.append(firma)

    # --- Troquel: comprobante que se lleva el postulante ---
    elems.extend(_troquel(styles))

    doc.build(elems)
    buffer.seek(0)
    return buffer.getvalue()
