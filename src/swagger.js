'use strict';

/**
 * Especificación OpenAPI 3.0 del microservicio. Se sirve en:
 *   GET /docs          -> interfaz Swagger UI
 *   GET /openapi.json  -> especificación en JSON
 */

const json = (schema, ejemplo) => ({
  'application/json': { schema, ...(ejemplo !== undefined ? { example: ejemplo } : {}) },
});

const ref = (nombre) => ({ $ref: `#/components/schemas/${nombre}` });

const respuesta = (descripcion, schema, ejemplo) => ({
  description: descripcion,
  content: json(schema, ejemplo),
});

const error = (descripcion, ejemplo) => respuesta(descripcion, ref('Error'), { detail: ejemplo });

const error422 = respuesta('Error de validación del cuerpo o de los parámetros', ref('ValidationError'), {
  detail: [{ type: 'missing', loc: ['body', 'marca'], msg: 'Field required', input: {} }],
});

const error500 = error('Error interno o de conexión con Supabase', 'Error consultando Supabase: <detalle>');

const paramPlaca = {
  name: 'placa',
  in: 'path',
  required: true,
  description: 'Placa (clave única) del registro',
  schema: { type: 'string', example: '12345' },
};

const paramId = {
  name: 'periferico_id',
  in: 'path',
  required: true,
  description: 'Id autonumérico del periférico',
  schema: { type: 'integer', example: 1 },
};

const cuerpo = (nombre, ejemplo) => ({
  required: true,
  content: json(ref(nombre), ejemplo),
});

function construirSpec() {
  const urlPublica = process.env.PUBLIC_URL || '/';

  return {
    openapi: '3.0.3',
    info: {
      title: 'Microservicio de Stock - Inventario Periféricos',
      version: '1.0.0',
      description:
        'API REST (Node.js + Express) que consulta y modifica directamente las tablas de Supabase ' +
        '`perifericos_periferico`, `perifericos_monitor` y `perifericos_equipo`, y las expone por HTTP ' +
        'para que el proyecto Django `inventario_perifericos` las consuma.\n\n' +
        '```\nDjango (views.stock_proveedor) --HTTP--> este microservicio --SQL--> Supabase\n```\n\n' +
        '**Endpoint para `MICROSERVICIO_STOCK_URL`:** `GET /api/stock`.',
    },
    servers: [{ url: urlPublica, description: urlPublica === '/' ? 'Servidor actual' : 'Servidor público' }],
    tags: [
      { name: 'Salud', description: 'Healthcheck del servicio' },
      { name: 'Periféricos', description: 'Mouse y teclados (tabla `perifericos_periferico`, clave: `id`)' },
      { name: 'Monitores', description: 'Monitores (tabla `perifericos_monitor`, clave: `placa`)' },
      { name: 'Equipos', description: 'Portátiles y de escritorio (tabla `perifericos_equipo`, clave: `placa`)' },
      { name: 'Stock', description: 'Vista combinada que consume Django' },
    ],
    paths: {
      '/': {
        get: {
          tags: ['Salud'],
          summary: 'Healthcheck',
          operationId: 'raiz',
          responses: {
            200: respuesta('Servicio en línea', ref('Salud'), {
              status: 'ok',
              servicio: 'microservicio-stock',
              supabase: true,
            }),
          },
        },
      },

      // ------------------------------------------------------------ Periféricos
      '/api/perifericos': {
        get: {
          tags: ['Periféricos'],
          summary: 'Listar mouse y teclados',
          description: 'Devuelve la tabla `perifericos_periferico` ordenada por `tipo` y `conexion`.',
          operationId: 'listar_periferico',
          responses: {
            200: respuesta('Lista de periféricos', { type: 'array', items: ref('Periferico') }, [
              { id: 1, tipo: 'mouse', conexion: 'alambrico', marca: 'Logitech', cantidad: 10 },
            ]),
            500: error500,
          },
        },
        post: {
          tags: ['Periféricos'],
          summary: 'Crear un periférico',
          operationId: 'crear_periferico',
          requestBody: cuerpo('PerifericoEntrada', {
            tipo: 'teclado',
            conexion: 'inalambrico',
            marca: 'Logitech',
            cantidad: 5,
          }),
          responses: {
            201: respuesta('Periférico creado', ref('Periferico')),
            422: error422,
            500: error500,
          },
        },
      },
      '/api/perifericos/{periferico_id}': {
        put: {
          tags: ['Periféricos'],
          summary: 'Actualizar un periférico por id',
          operationId: 'actualizar_periferico',
          parameters: [paramId],
          requestBody: cuerpo('PerifericoEntrada'),
          responses: {
            200: respuesta('Periférico actualizado', ref('Periferico')),
            404: error('Periférico no encontrado', 'Periférico no encontrado'),
            422: error422,
            500: error500,
          },
        },
        delete: {
          tags: ['Periféricos'],
          summary: 'Eliminar un periférico por id',
          operationId: 'eliminar_periferico',
          parameters: [paramId],
          responses: {
            200: respuesta('Periférico eliminado', ref('EliminadoPorId'), { eliminado: true, id: 1 }),
            404: error('Periférico no encontrado', 'Periférico no encontrado'),
            422: error422,
            500: error500,
          },
        },
      },

      // --------------------------------------------------------------- Monitores
      '/api/monitores': {
        get: {
          tags: ['Monitores'],
          summary: 'Listar monitores',
          description: 'Devuelve la tabla `perifericos_monitor` ordenada por `placa`.',
          operationId: 'listar_monitores',
          responses: {
            200: respuesta('Lista de monitores', { type: 'array', items: ref('Monitor') }, [
              { id: 1, placa: '12345', marca: 'Dell', pulgadas: 24 },
            ]),
            500: error500,
          },
        },
        post: {
          tags: ['Monitores'],
          summary: 'Crear un monitor',
          operationId: 'crear_monitor',
          requestBody: cuerpo('MonitorCrear', { placa: '12345', marca: 'Dell', pulgadas: 24 }),
          responses: {
            201: respuesta('Monitor creado', ref('Monitor')),
            409: error('Ya existe un monitor con esa placa', 'Ya existe un monitor con la placa 12345'),
            422: error422,
            500: error500,
          },
        },
      },
      '/api/monitores/{placa}': {
        put: {
          tags: ['Monitores'],
          summary: 'Actualizar un monitor por placa',
          operationId: 'actualizar_monitor',
          parameters: [paramPlaca],
          requestBody: cuerpo('MonitorActualizar', { marca: 'LG', pulgadas: 27 }),
          responses: {
            200: respuesta('Monitor actualizado', ref('Monitor')),
            404: error('Monitor no encontrado', 'Monitor no encontrado'),
            422: error422,
            500: error500,
          },
        },
        delete: {
          tags: ['Monitores'],
          summary: 'Eliminar un monitor por placa',
          operationId: 'eliminar_monitor',
          parameters: [paramPlaca],
          responses: {
            200: respuesta('Monitor eliminado', ref('EliminadoPorPlaca'), { eliminado: true, placa: '12345' }),
            404: error('Monitor no encontrado', 'Monitor no encontrado'),
            500: error500,
          },
        },
      },

      // ------------------------------------------------------------------ Equipos
      '/api/equipos': {
        get: {
          tags: ['Equipos'],
          summary: 'Listar equipos',
          description: 'Devuelve la tabla `perifericos_equipo` ordenada por `placa`.',
          operationId: 'listar_equipos',
          responses: {
            200: respuesta('Lista de equipos', { type: 'array', items: ref('Equipo') }, [
              { id: 1, placa: '54321', tipo: 'portatil', marca: 'Lenovo', usuario_asignado: 'Johan' },
            ]),
            500: error500,
          },
        },
        post: {
          tags: ['Equipos'],
          summary: 'Crear un equipo',
          operationId: 'crear_equipo',
          requestBody: cuerpo('EquipoCrear', {
            placa: '54321',
            tipo: 'portatil',
            marca: 'Lenovo',
            usuario_asignado: 'Johan',
          }),
          responses: {
            201: respuesta('Equipo creado', ref('Equipo')),
            409: error('Ya existe un equipo con esa placa', 'Ya existe un equipo con la placa 54321'),
            422: error422,
            500: error500,
          },
        },
      },
      '/api/equipos/{placa}': {
        put: {
          tags: ['Equipos'],
          summary: 'Actualizar un equipo por placa',
          operationId: 'actualizar_equipo',
          parameters: [paramPlaca],
          requestBody: cuerpo('EquipoActualizar', { tipo: 'escritorio', marca: 'HP', usuario_asignado: '' }),
          responses: {
            200: respuesta('Equipo actualizado', ref('Equipo')),
            404: error('Equipo no encontrado', 'Equipo no encontrado'),
            422: error422,
            500: error500,
          },
        },
        delete: {
          tags: ['Equipos'],
          summary: 'Eliminar un equipo por placa',
          operationId: 'eliminar_equipo',
          parameters: [paramPlaca],
          responses: {
            200: respuesta('Equipo eliminado', ref('EliminadoPorPlaca'), { eliminado: true, placa: '54321' }),
            404: error('Equipo no encontrado', 'Equipo no encontrado'),
            500: error500,
          },
        },
      },

      // -------------------------------------------------------------------- Stock
      '/api/stock': {
        get: {
          tags: ['Stock'],
          summary: 'Stock combinado de periféricos, monitores y equipos',
          description:
            'Combina las tres tablas en una sola lista con la forma `{categoria, producto, stock}`. ' +
            '**Es el endpoint que debe usar `MICROSERVICIO_STOCK_URL` en Django.** ' +
            'Monitores y equipos aportan `stock: 1` (activos individuales por placa).',
          operationId: 'stock_general',
          responses: {
            200: respuesta('Lista combinada', { type: 'array', items: ref('StockItem') }, [
              { categoria: 'periferico', producto: 'Mouse Alambrico - Logitech', stock: 10 },
              { categoria: 'monitor', producto: 'Monitor 12345 - Dell (24")', stock: 1 },
              { categoria: 'equipo', producto: 'Portatil 54321 - Lenovo - Johan', stock: 1 },
            ]),
            500: error500,
          },
        },
      },
    },

    components: {
      schemas: {
        Salud: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            servicio: { type: 'string', example: 'microservicio-stock' },
            supabase: { type: 'boolean', example: true },
          },
        },
        Periferico: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            tipo: { type: 'string', example: 'mouse' },
            conexion: { type: 'string', example: 'alambrico' },
            marca: { type: 'string', example: 'Logitech' },
            cantidad: { type: 'integer', example: 10 },
          },
        },
        PerifericoEntrada: {
          type: 'object',
          required: ['tipo', 'conexion', 'marca'],
          properties: {
            tipo: { type: 'string', example: 'mouse' },
            conexion: { type: 'string', example: 'alambrico' },
            marca: { type: 'string', example: 'Logitech' },
            cantidad: { type: 'integer', default: 0, example: 10 },
          },
        },
        Monitor: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            placa: { type: 'string', example: '12345' },
            marca: { type: 'string', example: 'Dell' },
            pulgadas: { type: 'integer', example: 24 },
          },
        },
        MonitorCrear: {
          type: 'object',
          required: ['placa', 'marca'],
          properties: {
            placa: { type: 'string', example: '12345' },
            marca: { type: 'string', example: 'Dell' },
            pulgadas: { type: 'integer', default: 24, example: 24 },
          },
        },
        MonitorActualizar: {
          type: 'object',
          required: ['marca'],
          properties: {
            marca: { type: 'string', example: 'LG' },
            pulgadas: { type: 'integer', default: 24, example: 27 },
          },
        },
        Equipo: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            placa: { type: 'string', example: '54321' },
            tipo: { type: 'string', example: 'portatil' },
            marca: { type: 'string', example: 'Lenovo' },
            usuario_asignado: { type: 'string', example: 'Johan' },
          },
        },
        EquipoCrear: {
          type: 'object',
          required: ['placa', 'tipo', 'marca'],
          properties: {
            placa: { type: 'string', example: '54321' },
            tipo: { type: 'string', example: 'portatil' },
            marca: { type: 'string', example: 'Lenovo' },
            usuario_asignado: { type: 'string', default: '', example: 'Johan' },
          },
        },
        EquipoActualizar: {
          type: 'object',
          required: ['tipo', 'marca'],
          properties: {
            tipo: { type: 'string', example: 'escritorio' },
            marca: { type: 'string', example: 'HP' },
            usuario_asignado: { type: 'string', default: '', example: '' },
          },
        },
        StockItem: {
          type: 'object',
          properties: {
            categoria: { type: 'string', enum: ['periferico', 'monitor', 'equipo'], example: 'periferico' },
            producto: { type: 'string', example: 'Mouse Alambrico - Logitech' },
            stock: { type: 'integer', example: 10 },
          },
        },
        EliminadoPorId: {
          type: 'object',
          properties: { eliminado: { type: 'boolean', example: true }, id: { type: 'integer', example: 1 } },
        },
        EliminadoPorPlaca: {
          type: 'object',
          properties: { eliminado: { type: 'boolean', example: true }, placa: { type: 'string', example: '12345' } },
        },
        Error: {
          type: 'object',
          properties: { detail: { type: 'string', example: 'Recurso no encontrado' } },
        },
        ValidationError: {
          type: 'object',
          properties: {
            detail: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', example: 'missing' },
                  loc: { type: 'array', items: { oneOf: [{ type: 'string' }, { type: 'integer' }] } },
                  msg: { type: 'string', example: 'Field required' },
                  input: {},
                },
              },
            },
          },
        },
      },
    },
  };
}

module.exports = { construirSpec };
