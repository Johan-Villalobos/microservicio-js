'use strict';

require('dotenv').config();
const app = require('./app');
const { pool } = require('./database');

const PORT = parseInt(process.env.PORT, 10) || 8000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Microservicio de stock escuchando en el puerto ${PORT}`);
  console.log(`Swagger UI: http://localhost:${PORT}/docs`);
});

// Cierre ordenado (Render envía SIGTERM al redesplegar).
function apagar(senal) {
  console.log(`${senal} recibido, cerrando...`);
  server.close(async () => {
    await pool.end().catch(() => {});
    process.exit(0);
  });
}
process.on('SIGTERM', () => apagar('SIGTERM'));
process.on('SIGINT', () => apagar('SIGINT'));
