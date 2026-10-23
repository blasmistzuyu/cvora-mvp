# CVORA — Publicar en GitHub, poner online y empezar a cobrar

> **Estado actual**: CVORA V3 es una beta funcional que analiza CV, permite compararlos visualmente, elegir plantillas y descargar PDF/Word. **No tiene autenticación, pagos integrados ni derechos de uso comercial verificados para la marca**. No publicarla como un servicio de IA pago sin completar los pasos de seguridad.

## 1. Crear el repositorio (acción del dueño de GitHub)

1. Abrir https://github.com/new?name=cvora-mvp en tu cuenta GitHub.
2. Nombre: `cvora-mvp`. Descripción sugerida: `CVORA — herramienta de currículums y mejora colaborativa con IA (beta)`.
3. Elegir **Private** mientras se prueba; luego se puede cambiar. Render puede desplegar repositorios privados al autorizar su app.
4. Dejar **vacías** las opciones *Add a README*, *.gitignore* y *License*, ya existen los archivos necesarios.
5. Presionar **Create repository**.
6. Para subirlo con ayuda de ChatGPT: volver al chat y avisar que el repositorio fue creado para subir los archivos mediante la conexión con GitHub.

**Alternativa 100 % manual en GitHub:** en el repositorio vacío, hacer clic en **uploading an existing file** o **Add file → Upload files**. Descomprimir el ZIP, abrir la carpeta `CVORA_mvp` y arrastrar su contenido **conservando las subcarpetas** `static`, `tests`, `.github/workflows`. Hacer commit a `main`. **No subir el ZIP** como un solo archivo, ni `.env` con la clave.

## 2. Desplegar en Render

1. Abrir https://dashboard.render.com/ y entrar con tu cuenta.
2. **New → Web Service**, conectar GitHub y seleccionar `cvora-mvp`.
3. Dejar que Render lea `render.yaml` como Blueprint, o configurar manualmente:
   - Language: `Python 3`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Health path: `/api/health`
4. Para una primera demostración sin uso real comercial, plan `Free`. Puede suspenderse por inactividad y reiniciarse con demora, y no es apropiado para producción comercial.
5. Comprobar `https://<subdominio-asignado>.onrender.com/api/health` y la página principal; el nombre real lo entrega Render y puede no ser `cvora-web`.
6. No configurar clave de OpenAI todavía: mantener `CVORA_ENABLE_AI=false` durante la prueba pública.
7. Probar con datos inventados; **no solicitar CV con datos personales reales a extraños** hasta completar la política de privacidad y medidas de seguridad.

## 3. Preparar IA real de forma segura

- La API OpenAI es de pago por uso, no depende de ChatGPT Plus.
- Guardar `OPENAI_API_KEY` solo en los *Environment / Secret* del servicio en Render, nunca en el repositorio, ni en el HTML ni en un chat.
- El proyecto usa `store=False` en las peticiones a la API y requiere consentimiento para usar IA; esto **no sustituye** una política de privacidad completa y legalmente revisada.
- Antes de habilitar IA a usuarios externos: agregar autenticación, cuota por cuenta, controles anti-abuso persistentes, límites de presupuesto y monitoreo de facturación. El limitador actual es **en memoria** y se reinicia al desplegar.
- Activar `CVORA_ENABLE_AI=true` solo después de implementar y verificar estas protecciones.

## 4. Monetización: primer modelo recomendado

**Gratis**: vista previa, análisis estructural y orientación general sin IA.

**Pago por CV**: una mejora con IA, revisiones limitadas, plantillas y descargas. **Precio a validar con usuarios**, no necesariamente suscripción.

1. Crear cuenta de vendedor en Mercado Pago y su integración **Checkout Pro**: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/overview
2. El backend crea una preferencia de pago y guarda una operación pendiente en una base de datos.
3. El comprador paga en Mercado Pago. Configurar **webhook** y comprobar el estado real de pago consultando las APIs de Mercado Pago, no basarse solo en que la persona volvió a la página o en el parámetro `success`.
4. Cuando se confirme el pago, acreditar los créditos o habilitar la entrega al usuario autenticado. Prevenir entregas duplicadas por webhooks repetidos (idempotencia).
5. Añadir política de devoluciones, términos, soporte, información del titular, información fiscal y privacidad conforme al país donde se venda.
6. Usar primero las credenciales de pruebas de Mercado Pago y comprobar pagos aprobados, rechazados y pendientes. Nunca habilitarlo a usuarios hasta que pase las pruebas.

**Esta versión no cobra ni desbloquea funciones por pago**. No reemplazar el paso 4 con un botón de pago sin verificación del servidor: cualquiera podría simularlo.

## 5. Antes de ofrecer el servicio al público

- [ ] Validar disponibilidad del nombre CVORA (marca y dominio).
- [ ] Completar la política de privacidad de `/privacidad` con nombre del responsable, domicilio o medio legal de contacto, derechos del titular, finalidades, terceros y retención.
- [ ] Probar documentos PDF, Word y casos límites con datos ficticios.
- [ ] Crear cuentas de usuario, almacenamiento seguro si hace falta y mecanismo de borrado.
- [ ] Incorporar cuotas robustas, protección anti-bots, pagos verificados y alertas de costos de IA.
- [ ] Elegir hosting de pago adecuado al uso comercial y revisar costos.
- [ ] Agregar avisos de que la IA no garantiza entrevistas ni contratación, y que el usuario debe revisar su CV.
- [ ] Dar de alta Google Search Console y el sitemap cuando el sitio sea público y esté listo.

## 6. Tres métricas que medir antes de escalar

- Visitas que llegan a la página.
- Usuarios que completan un CV y descargan una versión.
- Personas que pagan por una revisión y costo variable de IA por pedido.

**Objetivo inicial:** validar con 10–20 personas que la herramienta resulta útil. No pagar anuncios ni prometer ingresos hasta comprobar la conversión.
