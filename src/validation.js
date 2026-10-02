'use strict';

/**
 * Validación de entrada equivalente a los modelos Pydantic del original.
 * Ante datos inválidos responde 422 con el mismo formato que FastAPI:
 *   { "detail": [ { "type", "loc", "msg", "input" } ] }
 */

const { HttpError } = require('./utils');

// ---- Esquemas (espejo de los BaseModel de main.py) -----------------------

const esquemas = {
  PerifericoEntrada: {
    tipo: { type: 'string', required: true },
    conexion: { type: 'string', required: true },
    marca: { type: 'string', required: true },
    cantidad: { type: 'integer', default: 0 },
  },
  MonitorCrear: {
    placa: { type: 'string', required: true },
    marca: { type: 'string', required: true },
    pulgadas: { type: 'integer', default: 24 },
  },
  MonitorActualizar: {
    marca: { type: 'string', required: true },
    pulgadas: { type: 'integer', default: 24 },
  },
  EquipoCrear: {
    placa: { type: 'string', required: true },
    tipo: { type: 'string', required: true },
    marca: { type: 'string', required: true },
    usuario_asignado: { type: 'string', default: '' },
  },
  EquipoActualizar: {
    tipo: { type: 'string', required: true },
    marca: { type: 'string', required: true },
    usuario_asignado: { type: 'string', default: '' },
  },
};

// ---- Coerción por tipo ----------------------------------------------------

function comoEntero(valor) {
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) return { error: ['int_type', 'Input should be a valid integer'] };
    if (!Number.isInteger(valor)) {
      return { error: ['int_from_float', 'Input should be a valid integer, got a number with a fractional part'] };
    }
    return { valor };
  }
  if (typeof valor === 'string') {
    if (/^\s*[+-]?\d+\s*$/.test(valor)) return { valor: parseInt(valor, 10) };
    return { error: ['int_parsing', 'Input should be a valid integer, unable to parse string as an integer'] };
  }
  return { error: ['int_type', 'Input should be a valid integer'] };
}

function comoTexto(valor) {
  if (typeof valor === 'string') return { valor };
  return { error: ['string_type', 'Input should be a valid string'] };
}

/**
 * Valida y normaliza `body` contra el esquema. Devuelve solo los campos
 * conocidos (Pydantic ignora los extra) con sus valores por defecto aplicados.
 */
function validarBody(nombreEsquema, body) {
  const esquema = esquemas[nombreEsquema];

  if (body === undefined || body === null) {
    throw new HttpError(422, [{ type: 'missing', loc: ['body'], msg: 'Field required', input: null }]);
  }
  if (typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(422, [
      {
        type: 'model_attributes_type',
        loc: ['body'],
        msg: 'Input should be a valid dictionary or object to extract fields from',
        input: body,
      },
    ]);
  }

  const errores = [];
  const limpio = {};

  for (const [campo, regla] of Object.entries(esquema)) {
    const presente = Object.prototype.hasOwnProperty.call(body, campo);
    if (!presente) {
      if (regla.required) {
        errores.push({ type: 'missing', loc: ['body', campo], msg: 'Field required', input: body });
      } else {
        limpio[campo] = regla.default;
      }
      continue;
    }
    const r = regla.type === 'integer' ? comoEntero(body[campo]) : comoTexto(body[campo]);
    if (r.error) {
      errores.push({ type: r.error[0], loc: ['body', campo], msg: r.error[1], input: body[campo] });
    } else {
      limpio[campo] = r.valor;
    }
  }

  if (errores.length) throw new HttpError(422, errores);
  return limpio;
}

/** Valida un parámetro de ruta entero (p. ej. /api/perifericos/{periferico_id}). */
function validarIdEntero(valor, nombre) {
  if (/^\s*[+-]?\d+\s*$/.test(valor)) return parseInt(valor, 10);
  throw new HttpError(422, [
    {
      type: 'int_parsing',
      loc: ['path', nombre],
      msg: 'Input should be a valid integer, unable to parse string as an integer',
      input: valor,
    },
  ]);
}

module.exports = { validarBody, validarIdEntero };
