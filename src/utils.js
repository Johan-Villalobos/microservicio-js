'use strict';

/**
 * Equivalente a str.title() de Python: cada racha de letras empieza en
 * mayúscula y el resto va en minúscula ("usb inalámbrico" -> "Usb Inalámbrico").
 */
function titleCase(valor) {
  return String(valor ?? '').replace(
    /(\p{L})(\p{L}*)/gu,
    (_, primera, resto) => primera.toUpperCase() + resto.toLowerCase()
  );
}

/** Envoltorio para que los errores de handlers async lleguen al middleware de errores. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Error HTTP con el mismo formato de FastAPI: { "detail": "..." } */
class HttpError extends Error {
  constructor(status, detail) {
    super(typeof detail === 'string' ? detail : JSON.stringify(detail));
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Ejecuta `fn` (consulta a la BD). Cualquier error que no sea ya un HttpError se
 * convierte en 500 con el mismo mensaje del original: "<prefijo>: <error>".
 * `mapear` permite traducir errores concretos (p. ej. violación de unique -> 409).
 */
async function conErrorDb(prefijo, fn, mapear) {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError) throw err;
    const traducido = mapear ? mapear(err) : null;
    if (traducido) throw traducido;
    throw new HttpError(500, `${prefijo}: ${err.message}`);
  }
}

/** Código SQLSTATE 23505 = unique_violation. */
const esViolacionUnique = (err) => err && err.code === '23505';

module.exports = { titleCase, asyncHandler, HttpError, conErrorDb, esViolacionUnique };
