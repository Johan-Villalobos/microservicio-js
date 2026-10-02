'use strict';

/**
 * Conexión a la base de datos de Supabase (PostgreSQL).
 *
 * La cadena de conexión se toma de la variable de entorno DATABASE_URL.
 * En Supabase la obtienes en: Project Settings -> Database -> Connection string
 * (usa la variante "Connection pooling" / puerto 6543 si desplegarás en Render,
 * ya que Render abre/cierra muchas conexiones y el pooler de Supabase lo maneja
 * mejor que la conexión directa al puerto 5432).
 *
 * Ejemplo de valor para DATABASE_URL:
 * postgresql://postgres.xxxxxxxxxxxx:TU_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
 */

require('dotenv').config();
const { Pool, types } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    'Falta la variable de entorno DATABASE_URL con la cadena de conexión de Supabase.'
  );
}

// bigint (OID 20) llega como string por defecto en node-pg; psycopg2 lo devolvía
// como int. Los ids de Django pueden ser BigAutoField, así que los convertimos.
types.setTypeParser(20, (valor) => parseInt(valor, 10));

// node-pg deja que "sslmode" de la URL pise la opción `ssl`; la quitamos y
// controlamos SSL con DATABASE_SSL (Supabase exige SSL).
const connectionString = DATABASE_URL
  .replace(/([?&])sslmode=[^&]*&?/i, '$1')
  .replace(/[?&]$/, '');

const usarSsl = (process.env.DATABASE_SSL ?? 'true').toLowerCase() !== 'false';

// Pool pequeño: suficiente para un microservicio en Render (plan free).
const pool = new Pool({
  connectionString,
  ssl: usarSsl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// Evita que un error en una conexión ociosa tumbe el proceso.
pool.on('error', (err) => console.error('Error en conexión ociosa del pool:', err.message));

/** Ejecuta una consulta parametrizada ($1, $2, ...) y devuelve { rows, rowCount }. */
function query(text, params = []) {
  return pool.query(text, params);
}

/**
 * Entrega una conexión del pool dentro de una transacción (BEGIN/COMMIT) y la
 * devuelve al terminar; si algo falla hace ROLLBACK. Equivale a get_connection().
 */
async function withConnection(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      /* la conexión ya estaba rota */
    }
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withConnection };
