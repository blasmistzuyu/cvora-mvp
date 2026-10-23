# CVORA

**CVORA** es una aplicación web para crear, revisar y presentar currículums. Permite partir de un documento existente o redactar uno desde cero, explorar distintos diseños y revisar los cambios antes de exportar la versión final.

## Funcionalidades

- **Importación de CV:** admite archivos PDF, DOCX y TXT, además de texto pegado directamente.
- **Creación desde cero:** organiza perfil, experiencia, proyectos, educación y habilidades a partir de un formulario.
- **Revisión interactiva:** ofrece propuestas de redacción, permite ajustar el nivel de detalle y solicitar modificaciones mediante comentarios.
- **Ocho plantillas:** Moderno, Clásico, Minimalista, Elegante, Ejecutivo, Creativo, Compacto y Simple ATS.
- **Comparación visual:** muestra el currículum actualizado junto al documento original. Para PDF conserva su diseño en una vista previa renderizada.
- **Exportación:** genera documentos PDF y Word editables.
- **Diseño adaptable:** interfaz responsive para computadoras y celulares.

La mejora avanzada de texto es opcional y se habilita desde el servidor con una API externa y consentimiento del usuario. Sin esa configuración, permanecen disponibles la revisión básica, las plantillas, la edición y la exportación.

## Tecnologías

| Capa | Tecnologías |
| --- | --- |
| Backend | Python, FastAPI, Uvicorn |
| Frontend | HTML, CSS, JavaScript |
| Documentos | pypdf, python-docx, ReportLab, PDFium |
| Integraciones opcionales | OpenAI API, Mercado Pago Checkout Pro, PostgreSQL |
| Despliegue | Render |

## Instalación local

Requiere Python 3.11 o una versión compatible y `pip`.

```powershell
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload
```

En Windows también podés utilizar `py` en lugar de `python`.

Abrí **http://127.0.0.1:8000** en tu navegador.

## Configuración

Duplicá `.env.example` como `.env` y configurá únicamente los servicios que vayas a utilizar.

- `OPENAI_API_KEY`: clave privada para activar la revisión avanzada de texto.
- `CVORA_ENABLE_AI`: controla la integración de redacción asistida.
- `CVORA_RATE_LIMIT`: límite básico de solicitudes por proceso.
- `CVORA_ENABLE_PAYMENTS`: habilitación comercial, desactivada por defecto.
- `CVORA_PRICE_ARS`: precio configurable en pesos argentinos.

El archivo `.env` está excluido del repositorio mediante `.gitignore`. Nunca publiques claves ni credenciales en GitHub.

## Estructura

```text
CVORA/
├── main.py                 # API y procesamiento de currículums
├── commerce.py             # Integración de pagos opcional
├── static/
│   ├── index.html          # Interfaz
│   ├── styles.css          # Estilos
│   ├── app.js              # Interacciones
│   └── privacidad.html     # Información sobre tratamiento de datos
├── tests/                  # Pruebas automatizadas
├── render.yaml             # Despliegue en Render
├── requirements.txt
└── .env.example
```

## Pruebas

```powershell
python -m pip install -r requirements-dev.txt
python -m pytest -q
```

Las pruebas cubren el procesamiento de documentos, las exportaciones, el flujo de revisión, la comparación y la configuración comercial.

## Despliegue

El repositorio incluye `render.yaml` para desplegar el backend y la interfaz en Render desde la rama principal. La ruta `/api/health` permite comprobar el estado del servicio.

Las integraciones externas requieren configurar sus credenciales como variables de entorno del alojamiento. **Los pagos están desactivados por defecto** y requieren infraestructura persistente, validación de compras y pruebas antes de ofrecerse al público.

## Privacidad y alcance

CVORA procesa los currículums en memoria y no los almacena intencionalmente como archivos permanentes. Para la redacción asistida solicita consentimiento antes de enviar el texto al proveedor correspondiente. El usuario conserva el control sobre los cambios y debe revisar el contenido antes de usarlo. La aplicación no inventa antecedentes laborales ni garantiza entrevistas o contrataciones.

Este repositorio es una versión en desarrollo. Antes de un lanzamiento comercial deben completarse la identificación y las vías de contacto del responsable, los términos aplicables y los controles de seguridad y recuperación de compras.
