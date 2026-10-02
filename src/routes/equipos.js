'use strict';

const express = require('express');
const { query } = require('../database');
const { asyncHandler, HttpError, conErrorDb, esViolacionUnique } = require('../utils');
const { validarBody } = require('../validation');

const router = express.Router();

// Equipos (tabla perifericos_equipo) — clave: placa

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await conErrorDb('Error consultando Supabase', () =>
      query(`
        select id, placa, tipo, marca, usuario_asignado
        from perifericos_equipo
        order by placa
      `)
    );
    res.json(rows);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const datos = validarBody('EquipoCrear', req.body);
    const { rows } = await conErrorDb(
      'Error insertando en Supabase',
      () =>
        query(
          `insert into perifericos_equipo (placa, tipo, marca, usuario_asignado)
           values ($1, $2, $3, $4)
           returning id, placa, tipo, marca, usuario_asignado`,
          [datos.placa, datos.tipo, datos.marca, datos.usuario_asignado]
        ),
      (err) =>
        esViolacionUnique(err)
          ? new HttpError(409, `Ya existe un equipo con la placa ${datos.placa}`)
          : null
    );
    res.status(201).json(rows[0]);
  })
);

router.put(
  '/:placa',
  asyncHandler(async (req, res) => {
    const { placa } = req.params;
    const datos = validarBody('EquipoActualizar', req.body);
    const { rows } = await conErrorDb('Error actualizando en Supabase', () =>
      query(
        `update perifericos_equipo
         set tipo = $1, marca = $2, usuario_asignado = $3
         where placa = $4
         returning id, placa, tipo, marca, usuario_asignado`,
        [datos.tipo, datos.marca, datos.usuario_asignado, placa]
      )
    );
    if (!rows.length) throw new HttpError(404, 'Equipo no encontrado');
    res.json(rows[0]);
  })
);

router.delete(
  '/:placa',
  asyncHandler(async (req, res) => {
    const { placa } = req.params;
    const { rowCount } = await conErrorDb('Error eliminando en Supabase', () =>
      query('delete from perifericos_equipo where placa = $1', [placa])
    );
    if (!rowCount) throw new HttpError(404, 'Equipo no encontrado');
    res.json({ eliminado: true, placa });
  })
);

module.exports = router;
