# Monotickets API

API minimalista para gestionar invitaciones y controlar el acceso de asistentes a eventos sin depender de frameworks externos. Está optimizada para ejecutarse exclusivamente dentro de contenedores Docker.

## Características principales

- Autenticación con tokens firmados (HS256) y contraseñas cifradas con `scrypt`.
- Gestión in-memory de usuarios, eventos e invitaciones con tiempos de respuesta constantes.
- Servicio de conteo interno desacoplado para poder sustituir Redis por cualquier almacén compatible.
- Pruebas end-to-end auto-contenidas con un _test runner_ ligero sin dependencias de terceros.

## Requisitos

- Docker 24 o superior.
- Docker Compose plugin.

## Desarrollo y pruebas

```bash
docker compose build
docker compose run --rm api npm test
```

## Ejecución en contenedor

```bash
docker compose up --build
```

La API quedará disponible en `http://localhost:3000/api/v1`.

## Variables de entorno relevantes

| Variable        | Descripción                               | Valor por defecto |
|-----------------|-------------------------------------------|-------------------|
| `PORT`          | Puerto de exposición dentro del contenedor| `3000`            |
| `JWT_SECRET`    | Clave HMAC para firmar los tokens         | `changeme`        |
| `JWT_EXPIRES_IN`| Tiempo de expiración del token en segundos| `3600`            |

## Seguridad y buenas prácticas

- Las contraseñas se almacenan siempre con un hash `salted` mediante `scrypt`.
- Los tokens incluyen fecha de expiración y se validan usando comparación en tiempo constante.
- Las rutas protegidas aplican verificación estricta por rol (ADMIN o STAFF).
- Cada petición se valida y devuelve errores explícitos con códigos HTTP apropiados.

## Rendimiento

- Toda la lógica opera en memoria y se basa en estructuras `Map`, lo que garantiza operaciones O(1).
- Las rutas utilizan un analizador JSON directo sin sobrecarga adicional.

## Estructura del proyecto

```
├── src/
│   ├── application.js            # Servidor HTTP y ruteo
│   ├── server.js                 # Punto de entrada
│   └── services/                 # Servicios de dominio (usuarios, eventos, invites, check-in)
├── test/
│   ├── app.e2e-spec.js           # Pruebas end-to-end
│   ├── harness.js                # Mini framework de testing
│   └── run-tests.js              # Lanzador de pruebas
├── Dockerfile
└── docker-compose.yml
```

## Licencia

Uso interno de Monotickets.
