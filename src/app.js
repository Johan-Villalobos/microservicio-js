'use strict';

/**
 * Microservicio de stock - inventario_perifericos (versión Node.js / Express)
 * ===========================================================================
 *
 * Se conecta a la base de datos en Supabase (tablas perifericos_periferico,
 * perifericos_monitor, perifericos_equipo) y expone esos datos por HTTP.
 *
 *     Django (views.py) --HTTP--> este microservicio --SQL--> Supabase
 *
 * Endpoints por recurso (perifericos, monitores, equipos):
 *     GET    /api/<recurso>            -> listar todos
 *     POST   /api/<recurso>            -> crear uno nuevo
 *     PUT    /api/<recurso>/{id|placa} -> actualizar uno existente
 *     DELETE /api/<recurso>/{id|placa} -> eliminar uno existente
 *     GET    /api/stock                -> vista combinada para Django
 *
 * Documentación interactiva: GET /docs   (especificación: GET /openapi.json)
 */

const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

const { construirSpec } = require('./swagger');
const { HttpError } = require('./utils');

const perifericos = require('./routes/perifericos');
const monitores = require('./routes/monitores');
const equipos = require('./routes/equipos');
const stock = require('./routes/stock');

const app = express();

// En producción, reemplaza "*" por el dominio real donde corre tu Django
// (ej. CORS_ORIGINS=https://mi-django-app.onrender.com) para no exponer la API a cualquiera.
const origenes = (process.env.CORS_ORIGINS || '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: origenes.includes('*') ? '*' : origenes,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  })
);
app.use(express.json());

// Sin cuerpo en la petición: Express deja req.body = {}; lo marcamos como ausente
// para responder 422 "body requerido" igual que FastAPI.
app.use((req, res, next) => {
  const hayCuerpo = Number(req.headers['content-length']) > 0 || req.headers['transfer-encoding'];
  if (!hayCuerpo) req.body = undefined;
  next();
});

// ---- Documentación Swagger --------------------------------------------------
const spec = construirSpec();
app.get('/openapi.json', (req, res) => res.json(spec));
app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(spec, { customSiteTitle: 'Microservicio de Stock - Swagger UI' })
);

// ---- Rutas ------------------------------------------------------------------
app.get('/', (req, res) => {
  res.json({ status: 'ok', servicio: 'microservicio-stock', supabase: true });
});

app.use('/api/perifericos', perifericos);
app.use('/api/monitores', monitores);
app.use('/api/equipos', equipos);
app.use('/api/stock', stock);

// ---- Errores (mismo formato que FastAPI: { "detail": ... }) -----------------
app.use((req, res) => {
  res.status(404).json({ detail: 'Not Found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ detail: err.detail });
  }
  // JSON mal formado en el cuerpo
  if (err.type === 'entity.parse.failed') {
    return res.status(422).json({
      detail: [{ type: 'json_invalid', loc: ['body'], msg: 'JSON decode error', input: {} }],
    });
  }
  console.error(err);
  return res.status(500).json({ detail: `Error interno: ${err.message}` });
});

module.exports = app;
