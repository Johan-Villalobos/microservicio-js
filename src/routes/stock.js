'use strict';

const express = require('express');
const { withConnection } = require('../database');
const { asyncHandler, conErrorDb, titleCase } = require('../utils');

const router = express.Router();

/**
 * Endpoint que consume directamente la vista `stock_proveedor` de Django
 * (MICROSERVICIO_STOCK_URL). Combina las tres tablas en una sola lista,
 * describiendo cada ítem y su cantidad en stock.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await conErrorDb('Error consultando Supabase', () =>
      withConnection(async (client) => {
        const resultado = [];

        const perifericos = await client.query(`
          select tipo, conexion, marca, cantidad
          from perifericos_periferico
          order by tipo, conexion
        `);
        for (const { tipo, conexion, marca, cantidad } of perifericos.rows) {
          resultado.push({
            categoria: 'periferico',
            producto: `${titleCase(tipo)} ${titleCase(conexion)} - ${marca}`,
            stock: cantidad,
          });
        }

        const monitores = await client.query(`
          select placa, marca, pulgadas
          from perifericos_monitor
          order by placa
        `);
        for (const { placa, marca, pulgadas } of monitores.rows) {
          resultado.push({
            categoria: 'monitor',
            producto: `Monitor ${placa} - ${marca} (${pulgadas}")`,
            stock: 1,
          });
        }

        const equipos = await client.query(`
          select placa, tipo, marca, usuario_asignado
          from perifericos_equipo
          order by placa
        `);
        for (const { placa, tipo, marca, usuario_asignado: usuario } of equipos.rows) {
          const asignado = usuario ? ` - ${usuario}` : ' - sin asignar';
          resultado.push({
            categoria: 'equipo',
            producto: `${titleCase(tipo)} ${placa} - ${marca}${asignado}`,
            stock: 1,
          });
        }

        return resultado;
      })
    );
    res.json(items);
  })
);

module.exports = router;
