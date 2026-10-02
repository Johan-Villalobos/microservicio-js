-- Esquema de REFERENCIA, deducido de las consultas del microservicio.
-- Las tablas reales las crea Django/Supabase (supabase_migration.sql); úsalo solo
-- para pruebas locales contra un Postgres vacío.

create table if not exists perifericos_periferico (
  id        bigserial primary key,
  tipo      varchar(20)  not null,
  conexion  varchar(20)  not null,
  marca     varchar(50)  not null,
  cantidad  integer      not null default 0
);

create table if not exists perifericos_monitor (
  id        bigserial primary key,
  placa     varchar(5)   not null unique,
  marca     varchar(50)  not null,
  pulgadas  integer      not null default 24
);

create table if not exists perifericos_equipo (
  id                bigserial primary key,
  placa             varchar(5)   not null unique,
  tipo              varchar(20)  not null,
  marca             varchar(50)  not null,
  usuario_asignado  varchar(100) not null default ''
);
