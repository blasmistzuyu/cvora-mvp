# CVORA — versión preparada para GitHub y Render

**Precio de lanzamiento recomendado: ARS $4.900** por una mejora con IA y hasta tres revisiones. No es una tarifa de mercado garantizada y se cambia mediante `CVORA_PRICE_ARS`.

**Estado real:** la app funciona gratis con extracción de PDF/Word, análisis básico, ocho plantillas, comparación visual, creación desde cero y exportación. La IA real necesita una clave de OpenAI. Se incluyó Checkout Pro de Mercado Pago con acreditación mediante webhook firmado y verificación servidor-servidor; **las compras están desactivadas hasta conectar credenciales, PostgreSQL persistente y probar cobros**.

## Iniciar en Windows

```powershell
py -m pip install -r requirements.txt
py -m uvicorn main:app --reload
```

Abrí http://127.0.0.1:8000; para probar, usá el ejemplo ficticio.

## Publicación

1. Subí el contenido de esta carpeta al repositorio GitHub `cvora-mvp`.
2. En [Render](https://dashboard.render.com/), creá un **Web Service** desde este repositorio (o importá `render.yaml`).
3. Build: `pip install -r requirements.txt`; Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
4. Probá `https://<tu-servicio>.onrender.com/api/health` y la aplicación. No hay que poner claves en el repositorio.
5. Para activar la versión comercial, leé **`PUBLICACION_Y_COBROS.md`**. La beta gratuita en Render Free no es un entorno adecuado para cobros de clientes.

## Privacidad y seguridad

- Los CV se procesan en memoria y no se guardan como archivo en la aplicación. Los pedidos, cuando se activan, guardan identificadores técnicos anónimos y estado de pago en PostgreSQL.
- Para usar IA se solicita consentimiento. No se garantiza conseguir entrevistas.
- **El cobro no está activado** por defecto; el botón informa su estado, no simula compras.
- Antes de ofrecer pagos completá la política de privacidad con tus datos reales, términos y contacto de soporte, protección antiabusos persistente y recuperación de compras por cuenta de usuario; revisá marca CVORA.

# CVORA V3 — creá, mejorá y compará tu CV

Versión 3: **subí o creá desde cero un CV, recibí propuestas con IA, elegí entre ocho plantillas, compará el PDF original a la derecha, opiná («Me gusta»/«Quiero cambios») y pedí revisiones con texto libre o botones rápidos**. Conserva edición manual, vista previa y exportación PDF/Word. Sin clave, hay modo de prueba limitado con reglas (no se simula IA).

**Para publicarla:** leé primero [`GUIA_PUBLICAR_Y_MONETIZAR.md`](GUIA_PUBLICAR_Y_MONETIZAR.md). Para habilitar IA, ver [`GUIA_IA_Y_COLABORACION.md`](GUIA_IA_Y_COLABORACION.md).

## Empezar en Windows / VS Code

```powershell
cd CVORA_mvp
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload
```

Abrí **http://127.0.0.1:8000** (no basta con abrir `index.html`: necesita backend).

Usá **«Probar con un CV de ejemplo»** para comprobar el recorrido completo sin usar datos reales.

## Diferencia entre modo demo y modo IA

- **Sin clave de API:** funciona el análisis de estructura y comparación básica con la oferta mediante reglas; descarga en PDF y Word. **No usa ni simula IA**. No hay corrección semántica automática avanzada.
- **Con clave de API:** aparece la aceptación expresa para enviar el texto a un proveedor externo. Usa OpenAI Responses API y devuelve observaciones y una propuesta reescrita sin inventar experiencia. La persona debe revisar todo. La clave se mantiene en el servidor.

Para activar IA podés usar `.env` según la guía. Alternativamente en PowerShell, en **tu PC** (no pegues ni compartas la clave en chats):

```powershell
$env:OPENAI_API_KEY="TU_CLAVE_PRIVADA"
$env:OPENAI_MODEL="gpt-5-mini"
$env:CVORA_ENABLE_AI="true"
$env:CVORA_GLOBAL_AI_LIMIT="20"
python -m uvicorn main:app --reload
```

Las API tienen costo por uso, **independiente** de cualquier suscripción de ChatGPT. Revisá precios y límites del modelo elegido antes de habilitarlo en una web pública.

## Publicar en Render (requiere tu cuenta)

1. Creá un **nuevo repositorio propio** en GitHub llamado por ejemplo `cvora-mvp`. No publiques `.env`, contraseñas ni datos de CV reales.
2. Subí todos los archivos de esta carpeta, conservando la estructura.
3. En https://dashboard.render.com/ elegí **New → Web Service**, conectá tu repositorio y el plan que corresponda (Free para pruebas).
4. Render puede utilizar `render.yaml`, o configurá manualmente:
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Health check: `/api/health`
5. Esperá al despliegue y abrí la dirección real `https://...onrender.com/` que Render te indique. **El nombre depende de disponibilidad**.
6. Primero probalo sin API de IA. Si luego querés habilitarla, agregá `OPENAI_API_KEY` como **secret environment variable** y `CVORA_ENABLE_AI=true` en Render (nunca en el frontend ni en GitHub).

El plan gratuito puede entrar en reposo y tardar en despertar. No se recomienda para una aplicación comercial definitiva.

## Protección de datos y limitaciones

- Sin base de datos y sin almacenamiento permanente intencional del currículum. Los archivos se leen en memoria, se procesan y se descartan en el flujo.
- Procesar un CV por primera vez puede implicar datos personales: informar claramente del uso y obtener los consentimientos legales correspondientes. Ver `/privacidad`.
- Con IA, el texto se envía a un proveedor externo **solo si la persona consiente**. La llamada a OpenAI usa `store=False`; consultar sus políticas actuales de procesamiento/retención.
- No se puede extraer texto de un PDF que sea únicamente una imagen escaneada. Se explica cómo pegar el texto manualmente.
- API rate limiting, incluido el cupo global de llamadas IA, es **solo en memoria** y se reinicia al desplegar. **No habilitar una API de IA abierta sin autenticar y sin cuotas de gasto**: riesgo de abuso y costos imprevistos. Antes de cobrar, agregar autenticación, límites robustos (Redis), monitoreo de costos y pruebas legales de privacidad.
- La V4 ofrece una integración opcional de Checkout Pro. Está DESACTIVADA por defecto; requiere base de datos PostgreSQL persistente, credenciales de Mercado Pago, clave de OpenAI y protección comercial. No hay cuentas ni recuperación de compras todavía.
- No se garantizan entrevistas o contratación. No se inventan títulos ni experiencias.
- El nombre **CVORA** es provisional hasta verificar marca y dominio.

## Estructura

```
main.py                # Backend API, análisis, lectura y exportación
static/index.html      # Interfaz
static/styles.css      # Estilos
static/app.js          # Funcionalidad UI
static/privacidad.html # Aviso inicial de privacidad (completar antes del lanzamiento)
render.yaml            # Configuración para Render
requirements.txt
.env.example
```

## Verificar localmente

```powershell
python -m pip install -r requirements-dev.txt
python -m pytest -q
```


## Funciones nuevas V2

- 3 propuestas iniciales con IA: profesional, breve, detallada.
- Elegir versión; vista previa PDF-like con temas moderno, clásico y simple/ATS.
- Devolución «Me gusta» / «Quiero cambios», chips rápidos y texto libre.
- Iteraciones con IA y opción Deshacer; historial temporal en el navegador.
- Pautas públicas de CV visibles (CareerOneStop), no acceso en vivo a procesos de selección.

## Funciones nuevas V3

- El resultado ocupa **todo el ancho** disponible. El CV mejorado se muestra **a la izquierda**.
- **Comparación real de PDF:** cuando el usuario sube un PDF, CVORA renderiza temporalmente hasta las primeras seis páginas a imágenes JPEG conservando diseño, tipografías, columnas y colores del **original** y las muestra a la **derecha** del nuevo CV al presionar **Comparar antes y después**. Puede abrir el PDF completo en otra pestaña, si lo desea. No guardamos la imagen en disco.
- Si sube DOCX/TXT o crea desde cero, la comparación muestra una **reconstrucción del contenido**; en estos casos no se promete fidelidad visual al original.
- **Crear desde cero:** formulario para datos de contacto, objetivo laboral, experiencia/proyectos narrados libremente, estudios, habilidades y otros datos. No exige empleo formal previo.
- **Dos decisiones separadas**: (1) cuánto contenido mostrar (Equilibrado / Más resumido / Con más detalle), y (2) diseño visual.
- **Ocho plantillas**: Moderno, Clásico, Minimalista, Elegante, Ejecutivo, Creativo, Compacto, Simple ATS. Se aplican a la vista previa y a exportaciones PDF/Word con características acordes (fuentes, tamaños y colores básicos). La vista en HTML es aproximada respecto del documento exportado.
- Continúan la revisión colaborativa, cambios en lenguaje natural, deshacer, consejos y descarga PDF/Word.
- El visor fiel de PDF utiliza **pypdfium2/PDFium** y no depende del visor de PDF del navegador. El límite de 6 páginas por previsualización reduce el consumo; los archivos pueden tener hasta 15 páginas según el extractor.

### Nota importante de la prueba

En **modo demo**, el texto no se reescribe con IA. Las tres opciones son transformaciones muy ligeras. Para mejorar la redacción y responder a comentarios, activá una clave de API y consentimiento, tal como detalla `GUIA_IA_Y_COLABORACION.md`. La demo no simula resultados que no puede producir.


## Estado comercial

Beta para pruebas. **No tiene cobros integrados ni cuentas de usuario**. Las revisiones con IA deben mantenerse desactivadas en despliegues públicos hasta instalar protección anti-abuso, cuotas persistentes y control de gastos. La política de privacidad necesita revisión y completar los datos del responsable antes del lanzamiento.