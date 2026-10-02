'use strict';

const express = require('express');
const { query } = require('../database');
const { asyncHandler, HttpError, conErrorDb, esViolacionUnique } = require('../utils');
const { validarBody } = require('../validation');

const router = express.Router();

// Monitores (tabla perifericos_monitor) — clave: placa

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await conErrorDb('Error consultando Supabase', () =>
      query(`
        select id, placa, marca, pulgadas
        from perifericos_monitor
        order by placa
      `)
    );
    res.json(rows);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const datos = validarBody('MonitorCrear', req.body);
    const { rows } = await conErrorDb(
      'Error insertando en Supabase',
      () =>
        query(
          `insert into perifericos_monitor (placa, marca, pulgadas)
           values ($1, $2, $3)
           returning id, placa, marca, pulgadas`,
          [datos.placa, datos.marca, datos.pulgadas]
        ),
      (err) =>
        esViolacionUnique(err)
          ? new HttpError(409, `Ya existe un monitor con la placa ${datos.placa}`)
          : null
    );
    res.status(201).json(rows[0]);
  })
);

router.put(
  '/:placa',
  asyncHandler(async (req, res) => {
    const { placa } = req.params;
    const datos = validarBody('MonitorActualizar', req.body);
    const { rows } = await conErrorDb('Error actualizando en Supabase', () =>
      query(
        `update perifericos_monitor
         set marca = $1, pulgadas = $2
         where placa = $3
         returning id, placa, marca, pulgadas`,
        [datos.marca, datos.pulgadas, placa]
      )
    );
    if (!rows.length) throw new HttpError(404, 'Monitor no encontrado');
    res.json(rows[0]);
  })
);

router.delete(
  '/:placa',
  asyncHandler(async (req, res) => {
    const { placa } = req.params;
    const { rowCount } = await conErrorDb('Error eliminando en Supabase', () =>
      query('delete from perifericos_monitor where placa = $1', [placa])
    );
    if (!rowCount) throw new HttpError(404, 'Monitor no encontrado');
    res.json({ eliminado: true, placa });
  })
);

module.exports = router;
