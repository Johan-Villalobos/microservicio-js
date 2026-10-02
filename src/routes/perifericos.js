'use strict';

const express = require('express');
const { query } = require('../database');
const { asyncHandler, HttpError, conErrorDb } = require('../utils');
const { validarBody, validarIdEntero } = require('../validation');

const router = express.Router();

// Mouse y teclados (tabla perifericos_periferico) — id autonumérico

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await conErrorDb('Error consultando Supabase', () =>
      query(`
        select id, tipo, conexion, marca, cantidad
        from perifericos_periferico
        order by tipo, conexion
      `)
    );
    res.json(rows);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const datos = validarBody('PerifericoEntrada', req.body);
    const { rows } = await conErrorDb('Error insertando en Supabase', () =>
      query(
        `insert into perifericos_periferico (tipo, conexion, marca, cantidad)
         values ($1, $2, $3, $4)
         returning id, tipo, conexion, marca, cantidad`,
        [datos.tipo, datos.conexion, datos.marca, datos.cantidad]
      )
    );
    res.status(201).json(rows[0]);
  })
);

router.put(
  '/:periferico_id',
  asyncHandler(async (req, res) => {
    const id = validarIdEntero(req.params.periferico_id, 'periferico_id');
    const datos = validarBody('PerifericoEntrada', req.body);
    const { rows } = await conErrorDb('Error actualizando en Supabase', () =>
      query(
        `update perifericos_periferico
         set tipo = $1, conexion = $2, marca = $3, cantidad = $4
         where id = $5
         returning id, tipo, conexion, marca, cantidad`,
        [datos.tipo, datos.conexion, datos.marca, datos.cantidad, id]
      )
    );
    if (!rows.length) throw new HttpError(404, 'Periférico no encontrado');
    res.json(rows[0]);
  })
);

router.delete(
  '/:periferico_id',
  asyncHandler(async (req, res) => {
    const id = validarIdEntero(req.params.periferico_id, 'periferico_id');
    const { rowCount } = await conErrorDb('Error eliminando en Supabase', () =>
      query('delete from perifericos_periferico where id = $1', [id])
    );
    if (!rowCount) throw new HttpError(404, 'Periférico no encontrado');
    res.json({ eliminado: true, id });
  })
);

module.exports = router;
