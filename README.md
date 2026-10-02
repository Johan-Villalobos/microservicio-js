# Microservicio de stock — versión Node.js (Express → Supabase → Django)

Reescritura en JavaScript del microservicio FastAPI original. Mantiene **los mismos
endpoints, los mismos JSON, los mismos códigos de estado y la misma conexión a
Supabase (PostgreSQL)**, y añade documentación **Swagger UI** en `/docs`.

```
Django (views.stock_proveedor) --HTTP GET--> este microservicio --SQL--> Supabase
```

## Endpoints

| Ruta | Método | Descripción |
|---|---|---|
| `/` | GET | Healthcheck |
| `/docs` | GET | **Swagger UI** (documentación interactiva) |
| `/openapi.json` | GET | Especificación OpenAPI 3.0 |
| `/api/perifericos` | GET / POST | Listar / crear mouse y teclados (`{tipo, conexion, marca, cantidad}`) |
| `/api/perifericos/{id}` | PUT / DELETE | Actualizar / eliminar por `id` |
| `/api/monitores` | GET / POST | Listar / crear (`{placa, marca, pulgadas}`) |
| `/api/monitores/{placa}` | PUT / DELETE | Actualizar (`{marca, pulgadas}`) / eliminar por `placa` |
| `/api/equipos` | GET / POST | Listar / crear (`{placa, tipo, marca, usuario_asignado}`) |
| `/api/equipos/{placa}` | PUT / DELETE | Actualizar (`{tipo, marca, usuario_asignado}`) / eliminar por `placa` |
| `/api/stock` | GET | Vista combinada `{categoria, producto, stock}` → **la que usa `MICROSERVICIO_STOCK_URL`** |

Códigos: `201` al crear · `404` si el registro no existe (PUT/DELETE) · `409` si la
`placa` ya existe (POST de monitores/equipos) · `422` si el cuerpo es inválido
(mismo formato que FastAPI) · `500` para errores de Supabase. Los errores siempre
vienen como `{"detail": ...}`.

## Estructura

```
src/
  server.js          arranque + cierre ordenado (SIGTERM de Render)
  app.js             Express: CORS, JSON, Swagger, rutas y manejo de errores
  database.js        pool de pg hacia Supabase (equivale a database.py)
  validation.js      validación de entrada (equivale a los modelos Pydantic)
  swagger.js         especificación OpenAPI 3.0
  utils.js           titleCase (= str.title() de Python), HttpError, helpers
  routes/            perifericos.js · monitores.js · equipos.js · stock.js
sql/esquema_referencia.sql   esquema deducido de las consultas (solo para pruebas locales)
Procfile                     web: node src/server.js
```

## Probar en local

```bash
npm install
cp .env.example .env        # edita DATABASE_URL con tu cadena real de Supabase
npm start                   # o: npm run dev (recarga automática)
```

- API: `http://localhost:8000/api/stock`
- Swagger UI: `http://localhost:8000/docs`

### Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | Cadena de Supabase (usa *Connection pooling*, puerto `6543`, en Render) |
| `PORT` | No | Puerto (Render lo define solo; por defecto `8000`) |
| `CORS_ORIGINS` | No | `*` por defecto; en producción pon el dominio de tu Django (lista separada por comas) |
| `DATABASE_SSL` | No | `true` por defecto (Supabase exige SSL); `false` solo para Postgres local |
| `PUBLIC_URL` | No | URL pública del servicio, para que "Try it out" de Swagger apunte a Render |

## Desplegar en Render

1. Sube esta carpeta a un repo de GitHub (`node_modules` y `.env` ya están en `.gitignore`).
2. En Render: **New +** → **Web Service** → conecta el repo.
3. Configura:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. En **Environment** agrega `DATABASE_URL` (y, opcionalmente, `PUBLIC_URL` y `CORS_ORIGINS`).
5. Deploy. Swagger quedará en `https://<tu-servicio>.onrender.com/docs`.

## Conectarlo con Django

No hay que cambiar nada en las vistas: el contrato JSON es idéntico. Solo apunta a la
nueva URL en `inventario/settings.py`:

```python
MICROSERVICIO_STOCK_URL = "https://<tu-servicio>.onrender.com/api/stock"
```

## Equivalencias Python → JavaScript

| Python (original) | Node.js (esta versión) |
|---|---|
| FastAPI | Express 4 |
| psycopg2 `SimpleConnectionPool(1, 10)` | `pg.Pool({ max: 10 })` |
| Modelos Pydantic | `validation.js` (422 con el formato de FastAPI) |
| `pg_errors.UniqueViolation` | SQLSTATE `23505` → 409 |
| `str.title()` | `titleCase()` |
| `/docs` automático de FastAPI | `swagger-ui-express` + `swagger.js` |

## Notas

- Las consultas SQL son las mismas; solo cambian los marcadores (`%s` → `$1, $2…`).
- Los `bigint` se convierten a número (psycopg2 los devolvía como `int`), por si los
  `id` de Django son `BigAutoField`.
- Con el pooler de Supabase en modo *transaction* no se usan *prepared statements*
  con nombre, así que es compatible.
- El README original decía que los `PUT` de monitores/equipos devolvían 409, pero el
  código solo lo hacía en los `POST` (el `PUT` no modifica la placa); aquí se conserva
  el comportamiento real del código.
- CORS abierto por defecto para pruebas; restríngelo en producción.
