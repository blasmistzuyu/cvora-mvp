# CVORA 2 — Activar IA y revisar los cambios con el usuario

## Probar gratis, sin IA

```powershell
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload
```

Abrí http://127.0.0.1:8000. Hacé clic en «Probar con un CV de ejemplo» y después «Preparar mi nuevo CV».
La app muestra 3 propuestas de **formato básico** y podés elegir estilos y descargar PDF/Word. El modo sin IA **no reescribe semánticamente** ni interpreta comentarios personalizados.

## Habilitar IA real (es una API de pago)

La suscripción ChatGPT Plus **no incluye** créditos para la API; necesitás una clave de proyecto con facturación/límites habilitados.

1. Abrí https://platform.openai.com/api-keys y generá una clave del proyecto.
2. En VS Code, copiá `.env.example` a `.env` (se ignora por `.gitignore`).
3. Cambiá:

   ```dotenv
   OPENAI_API_KEY=pega_aqui_tu_clave_PRIVADA
   CVORA_ENABLE_AI=true
   OPENAI_MODEL=gpt-5-mini
   CVORA_GLOBAL_AI_LIMIT=10
   CVORA_RATE_LIMIT=12
   ```

4. Cerrá el servidor con Ctrl+C y reiniciá `python -m uvicorn main:app --reload`.
5. Recargá la página. Debería indicar **«IA colaborativa disponible»**.
6. Usá el CV de ejemplo primero. Aceptá la autorización para procesarlo con el proveedor.
7. Elegí «Profesional», «Breve» o «Detallado». Marcá «Me gusta» o «Quiero cambios»; elegí «Más corto», «Más detallado», «Más profesional», «Destacar logros reales» o escribí un comentario propio. Presioná «Aplicar mis cambios». Podés deshacer.
8. Revisá el resultado y descargalo en PDF o Word.

**Nunca pegues tu clave de API en el navegador, en ChatGPT, en mensajes, ni en GitHub.**

## Publicación en Render

La configuración `render.yaml` incluida sirve para la web, pero el modo IA debe configurarse en el panel de Render con variables de entorno privadas `OPENAI_API_KEY`, `CVORA_ENABLE_AI=true`, `OPENAI_MODEL`, `CVORA_GLOBAL_AI_LIMIT`.

**ATENCIÓN antes de difundir:** una app abierta que llama a una API de pago puede generar costos si alguien abusa. Este MVP solo trae límites en memoria. Para publicar IA a desconocidos, agregá autenticación, límites persistentes (Redis), cuotas de gasto y monitoreo. Revisá además privacidad, términos y responsable de datos. Mejor hacer pruebas con usuarios invitados primero.

## Recomendaciones sobre CV respaldadas por fuentes

- [CareerOneStop — Experience](https://cloudfront.careeronestop.org/JobSearch/Resumes/ResumeGuide/work-experience.aspx)
- [CareerOneStop — Formatting](https://cloudfront.careeronestop.org/JobSearch/Resumes/ResumeGuide/formatting.aspx)
- [CareerOneStop — Top Portion](https://cloudfront.careeronestop.org/JobSearch/Resumes/ResumeGuide/top-portion-of-resume.aspx)

Estas guías inspiran los criterios de redacción. **No** implica que CVORA investigue ofertas en directo ni acceda a procesos privados de reclutadores. Cuando una persona pega una oferta, CVORA puede adaptarse a ese texto sin inventar habilidades.

## Cómo maneja los datos

Las subidas, los análisis y las descargas se procesan en memoria; sin base de datos de CV. El historial de ajustes solo vive en la pestaña. Con consentimiento, cada análisis/revisión con IA envía CV original, texto actual y comentarios al proveedor. La API usa `store=False`, sin garantizar retención cero del proveedor. Consultar su política vigente.

## Alcance real del MVP

- Tres versiones iniciales en modo IA (con posible latencia y costo por tokens).
- Revisiones ilimitadas a nivel de interfaz, sujetas a límites API por hora y saldo.
- Conversación por ajustes y devolución, con historial local de esta pestaña.
- Vista previa de contenido y estilo simple; el PDF/Word puede diferir algo visualmente de la vista previa HTML.
- Compatible con archivos PDF con texto, DOCX y TXT, no PDF escaneados sin texto.
- No hay garantía de trabajo ni supuesta nota universal ATS. El usuario debe verificar lo generado.

## V3: Creación desde cero y comparación visual

La pestaña «Crear desde cero» arma una base textual únicamente con los hechos escritos por el usuario. El análisis con IA crea variantes a partir de esa base sin inventar empleos ni credenciales. El usuario puede aclarar hechos nuevos al solicitar revisiones.

«Comparar antes y después» renderiza el PDF subido a imágenes **en memoria del servidor** durante la solicitud y las envía al navegador para verlas al lado del nuevo documento. Para DOCX/TXT se presenta una reconstrucción textual, no una reproducción exacta del diseño. Las imágenes se conservan temporalmente solo en la pestaña abierta. Al cerrar o recargar, se pierden.

Los ocho estilos están disponibles tanto en vista previa como exportación. Por limitaciones de formato, PDF y Word no son una reproducción píxel a píxel del HTML, pero respetan el color y tipografía principales.
