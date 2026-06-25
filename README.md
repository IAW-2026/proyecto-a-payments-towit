# payments
Aplicación **Payments** del [Proyecto IAW 2026](https://iaw-2026.github.io/proyecto/) — comisión `TowIt`.

Deploy de producción:  https://payments-towit-six.vercel.app

## Usuarios disponibles para realizar pruebas

- customerpayments+clerk_test@iaw.com - iawuser#
- tower+clerk_test@iaw.com - iawuser#
- admin+clerk_test@iaw.com - iawuser#

## Instrucciones

- Para generar una orden de pago se tiene que hacer un POST a "https://payments-towit-six.vercel.app/payments/", con el header Authorization (con la API key) y el body {"tripId": string, "clerkId": string, "amount": number}. 
- Para generar un reembolso/cancelación se tiene que hacer un POST a "https://payments-towit-six.vercel.app/refunds/", con el header Authorization (con la API key) y el body {"tripId": string, "clerkId": string, "refundType": string}
- Para generar un desembolso se tiene que hacer un POST a "https://payments-towit-six.vercel.app/disbursements/", con el header Authorization (con la API key) y el body {"tripId": string, "clerk_id": string, "feePercentage": number}
- Para ver la información de los pagos se entra a la pagina  /payments/ donde, si el estado es pendiente, se puede pagar con MercadoPago. Para completar un pago con MercadoPago se tiene que usar la cuenta de prueba "TESTUSER2137522699836841910" con la contraseña "48gAECJIAG" (codigo de verificación 113372). Se tiene que pagar con la siguiente tarjeta de prueba: <5031 7557 3453 0604, 11/30, 123>. El nombre tiene que ser "APRO" y DNI 12345678 para que el pago salga como aprobado.

## Descripción del proyecto
TowIt Payments es el subsistema centralizado de gestión financiera desarrollado para la plataforma de transporte TowIt. Su objetivo principal es auditar, procesar y visualizar de manera segura el flujo de dinero generado a partir de los viajes, actuando como el centro de control financiero para los usuarios y administradores del sistema.

La plataforma está estructurada en tres módulos operativos: el Módulo de Pagos (encargado de la auditoría de los cobros recibidos de los pasajeros), el Módulo de Liquidaciones (diseñado para el monitoreo de las transferencias y acreditaciones enviadas a los conductores al finalizar correctamente el viaje) y el Módulo de Reembolsos (gestión del historial y estado de las devoluciones, devolviendo el dinero al usuario que realizó el pago). A través de su panel principal, los usuarios pueden visualizar su balance disponible en tiempo real y navegar por el historial detallado de sus transacciones. El panel de adminsitrador permite eliminar/revertir las transacciones de estos tres módulos, teniendo una vista completa de las tablas. 

A nivel técnico y arquitectónico, la aplicación está construida utilizando Next.js (App Router) bajo un enfoque Mobile-First, priorizando el rendimiento mediante el uso de Server Components y cargas asíncronas optimizadas (React Suspense). La capa de datos interactúa con una base de datos relacional en PostgreSQL (Neon) utilizando Drizzle ORM, mientras que la seguridad, autenticación y el control de acceso basado en roles están delegados en la infraestructura de Clerk, garantizando un entorno robusto y escalable.

## Comentarios

### Limitación
- Panel de administrador: No permite generar transacciones mediante los endpoints dejados, ya que es tarea de los otros sistemas usar los endpoints. El agregarlo podria causar inconsistencia del sistema global. Ademas un detalle es que permite borrar un payment solo si no tiene asociado un disbursement/refund el viaje.

### Decisiones de diseño y aspectos a destacar
- Paginación optimizada: En paginas como /payments/ se eligió evitar el COUNT(*) para obtener mejor rendimiento, usando la tactica de consultar un item de mas por pagina para saber si hay siguiente.
- Lazy loading: Para evitar sincronizar tablas con los otros sistemas, guardo con mi id propio a los usuarios que se hacen referencia en endpoints o entran al sistema. Ademas para no consultarlo en cada pagina que entran se implementó una cookie propia del sistema de Payments (encriptada) a modo de no ensuciar el JWT de Clerk con datos de un solo sistema. 
-Se priorizó el uso de Server Components para evitar enviar HTML innecesario al cliente y mejorar el First Contentful Paint.

### Documentación adicional
- En el archivo [Comandos](./docs/comandos.md) se deja un ejemplo de comandos de terminal para crear transacciones a modo que sea mas facil de probar el sistema, junto con la API key que usa para verificar que venga de alguien autenticado del sistema. Fijarse de llenar el body con los datos correctos.
