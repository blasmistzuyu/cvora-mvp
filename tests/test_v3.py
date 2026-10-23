"""Nuevo flujo V3: render del PDF original y ocho plantillas exportables."""
import io
from pathlib import Path
from fastapi.testclient import TestClient
from pypdf import PdfReader
from docx import Document
from reportlab.pdfgen import canvas
from main import app, TEMPLATE_CONFIG

client = TestClient(app)
EXAMPLE = 'Valentina Rojas\nvalentina@example.com\n\nEXPERIENCIA Y PROYECTOS\n• Organización de productos y atención al cliente.\n\nEDUCACIÓN\nSecundario completo'


def test_pdf_original_renders_in_memory():
    stream = io.BytesIO()
    doc = canvas.Canvas(stream)
    doc.setFont('Helvetica', 22)
    doc.drawString(80, 760, 'Valentina Rojas')
    doc.setFont('Helvetica', 12)
    doc.drawString(80, 730, 'valentina@example.com')
    doc.drawString(80, 705, 'Formación y experiencia en atención al cliente')
    doc.showPage()
    doc.save()
    response = client.post('/api/extract', files={'file': ('cv.pdf', stream.getvalue(), 'application/pdf')})
    assert response.status_code == 200
    data = response.json()
    assert 'Valentina Rojas' in data['text']
    assert data['total_pages'] == 1
    assert len(data['preview_pages']) == 1
    assert data['preview_pages'][0].startswith('data:image/jpeg;base64,')


def test_eight_templates_have_pdf_and_word_exports():
    assert len(TEMPLATE_CONFIG) == 8
    for style in TEMPLATE_CONFIG:
        for ext in ['pdf', 'docx']:
            result = client.post('/api/export/' + ext, json={'content': EXAMPLE, 'style': style})
            assert result.status_code == 200, (style, ext, result.text)
            if ext == 'pdf':
                assert 'Valentina' in PdfReader(io.BytesIO(result.content)).pages[0].extract_text()
            else:
                doc = Document(io.BytesIO(result.content))
                assert any('Valentina' in p.text for p in doc.paragraphs)
