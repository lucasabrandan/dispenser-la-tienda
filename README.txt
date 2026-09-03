💧 Dispenser La Tienda - Sistema de Gestión Integral

Este es un ecosistema desarrollado para digitalizar y optimizar la gestión de mantenimiento, logística y caja de un negocio de dispensers de agua.
El sistema está diseñado para ser usado en el campo por técnicos (como Marcos) y administradores (como Lucas), permitiendo un control total desde la visita técnica hasta el cierre de caja.

Puntos Clave del Proyecto:
El corazón de este sistema no es solo guardar datos, sino proteger la integridad del negocio.

Gestión de Equipos y Sedes:	
Trazabilidad por Serie: Olvidate de IDs genéricos. Buscamos y gestionamos cada dispenser por su número de serie único ("la chapa").
Blindaje de Integridad: El sistema impide por software que se carguen servicios de un dispenser en una sede a la que no pertenece. Si no hay coincidencia, el servidor bloquea la operación.
Módulo de Caja Profesional:
Cálculo de Descuentos Dinámicos: Soporta descuentos por monto fijo ($) y por porcentaje (%).
Cálculo en Tiempo Real: Interfaz UX que muestra el total neto a cobrar antes de confirmar la operación, evitando errores humanos.Gestión de 
Cobro: Clasificación por métodos de pago (Efectivo, Transferencia, Cta. Cte.).

Stack Tecnológico:
Este proyecto aplica las últimas tecnologías que estoy estudiando en mi formación profesional.
Descripción:
Backend Java + Spring BootMotor robusto para la lógica de negocio y seguridad.
Frontend React.js Interfaz de usuario dinámica y responsiva.
Base de Datos H2 / MySQL Persistencia de datos (H2 en local, MySQL para producción).
Validación Bean Validation Blindaje de datos desde la entrada del DTO.



(Próximos Pasos)[ ] Migración a TypeScript: Para mayor robustez en el tipado de datos.[ ] Buscador Inteligente: Filtro por número de serie en el historial.[ ] Módulo de Reportes: Generación de PDFs de visitas y presupuestos.[ ] PWA: Instalación en móviles para uso en campo (técnicos).

(Actualización 3-sep-2026) Autenticación / seguridad de sesión: se investigó y corrigió un bug real de notificaciones push para técnicos (el token de sesión cacheado para el service worker vencía a las 24hs y no se renovaba solo). Se implementó un refresh token real (revocable, ventana de 30 días) que además permite cortar el acceso de un usuario al instante al desactivarlo o resetearle la contraseña (antes tardaba hasta 24hs). Pendiente: pushear el commit y recompilar el backend para activarlo — ver el roadmap del proyecto para el detalle completo.
ColaboradoresLucas - Lead Developer & Architect Marcos - Product Owner & Senior Field Tech