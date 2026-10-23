# CVORA — publicación y cobros (Argentina)

## Precio recomendado (lanzamiento)

- **ARS 4.900 por CV** con una mejora inicial de IA y **hasta 3 revisiones** adicionales. Sin renovación automática.
- El análisis básico, las 8 plantillas y los PDF/Word siguen gratis.
- No publiques precios en USD convertidos automáticamente sin revisar impuestos y costos.
- Para ajustar el precio: variable de entorno `CVORA_PRICE_ARS=4900` y volver a desplegar.

## Fase 1: beta gratis

1. Publicar Render Web Service conectado a GitHub.
2. Mantener `CVORA_DEPLOYMENT=public`, `CVORA_ENABLE_AI=false`, `CVORA_ENABLE_PAYMENTS=false`.
3. Probarla con datos ficticios y 10–20 personas cercanas. Evitar CV personales reales hasta completar términos y aviso de privacidad.

## Fase 2: IA + ventas (requisitos imprescindibles)

1. Crear un servicio de PostgreSQL **persistente** (no la instancia Free de Render: tiene caducidad y no sirve para pagos de clientes).
2. Crear una aplicación de Mercado Pago en https://www.mercadopago.com.ar/developers/ y elegir Checkout Pro.
3. Configurar las siguientes variables **solo en Render → Environment**:
   - `CVORA_DEPLOYMENT=public`
   - `CVORA_ENABLE_AI=true`
   - `OPENAI_API_KEY` = clave privada del servidor
   - `OPENAI_MODEL=gpt-5-mini` (verificar disponibilidad y costos)
   - `CVORA_ENABLE_PAYMENTS=true`
   - `CVORA_PRICE_ARS=4900`
   - `MP_ACCESS_TOKEN` = token privado de Mercado Pago
   - `MP_WEBHOOK_SECRET` = clave secreta del webhook desde Mercado Pago
   - `DATABASE_URL` = URL segura PostgreSQL
   - `CVORA_PUBLIC_URL` = dominio HTTPS exacto de CVORA, sin barra final
4. Configurar webhook de pago en Mercado Pago: `https://TU-DOMINIO/api/mercadopago/webhook`.
5. El backend crea un pedido pendiente y una preferencia MP. Al recibir notificación verifica HMAC y luego consulta el pago directamente a Mercado Pago; solo si está aprobado, coincide la referencia, moneda y monto se acreditan 4 llamadas de IA. El parámetro de retorno del navegador NO acredita pagos.
6. Probar exhaustivamente en sandbox: pagos aprobados, rechazados, cancelados, webhook duplicado, reinicios, pérdida de conexión y reembolsos; comprobar los importes.
7. **Antes de habilitar público:** implementar cuentas de usuario + recuperación de compras (el prototipo vincula la compra a una cookie de navegador, que puede perderse), rate limiting persistente, protección bots, política de devolución y datos legales del proveedor. Sin esto, dejar `CVORA_ENABLE_PAYMENTS=false`.
8. Revisar facturación y gastos: IA, hosting, PostgreSQL, comisiones MP e impuestos. Nunca insertar claves en el frontend ni en GitHub.

## Alertas técnicas

- Si no se proporciona alguna de las variables críticas, `/api/pricing` muestra `checkout_available:false` y el botón pago se desactiva; gratis sigue funcionando.
- Render Free duerme por inactividad y pierde ficheros temporales; usar plan apto para producción.
- La web usa plantillas de diseño y análisis básico sin IA; en producción no habilita AI si pagos no están activos para evitar cargos no controlados.
- Los pedidos se asocian a una cookie HttpOnly de 30 días; no es reemplazo de cuentas de cliente. Agregar email autenticado y recuperación para un negocio real.
- La validación del webhook sigue la firma HMAC oficial de Mercado Pago; auditoría de seguridad adicional aconsejada antes de abrir a desconocidos.
- Políticas legales, marca y datos del responsable deben completarse antes de vender.

## Documentación oficial

- Checkout Pro: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/overview
- Preferencias: https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro-preferences/create-preference/post
- Webhooks: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/notifications
- Render: https://render.com/docs/deploy-fastapi
- OpenAI API: https://developers.openai.com/api/docs/pricing
