-- =============================================================
--  DESCUBRE CARRANQUE · Instalación de la base de datos
--  -------------------------------------------------------------
--  Cómo usarlo: en Supabase → SQL Editor → New query → pega
--  TODO este archivo → cambia el email del final → Run.
--  Se puede ejecutar varias veces sin romper nada.
-- =============================================================

-- 1) Tabla de lugares (comercios, asociaciones, cultura…)
create table if not exists public.lugares (
  id              text primary key,                 -- identificador del enlace (#lugar=id)
  publicado       boolean not null default true,    -- false = borrador, no sale en la web
  seccion         text not null check (seccion in ('comercios', 'asociaciones', 'cultura')),
  categoria       text not null,
  icono           text not null default '',
  nombre          text not null,
  resumen         text not null default '',
  descripcion     text not null default '',
  servicios       text[] not null default '{}',
  direccion       text not null default '',
  lat             double precision not null,
  lng             double precision not null,
  horario         jsonb not null default '{}'::jsonb,
  horario_nota    text not null default '',
  telefono        text not null default '',
  whatsapp        text not null default '',
  email           text not null default '',
  web             text not null default '',
  redes           jsonb not null default '{}'::jsonb,
  fotos           text[] not null default '{}',
  etiquetas       text[] not null default '{}',
  creado          timestamptz not null default now(),
  actualizado     timestamptz not null default now(),
  actualizado_por text not null default ''
);

-- Fecha y autor de la última modificación, automáticos
create or replace function public.lugares_al_guardar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.actualizado := now();
  new.actualizado_por := coalesce(auth.jwt() ->> 'email', '');
  return new;
end $$;
drop trigger if exists lugares_al_guardar on public.lugares;
create trigger lugares_al_guardar before insert or update on public.lugares
  for each row execute function public.lugares_al_guardar();

-- 2) Lista de gestores: SOLO estos emails pueden modificar datos y fotos
create table if not exists public.gestores (
  email  text primary key,
  nombre text not null default ''
);

create or replace function public.es_gestor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.gestores
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- 3) Permisos (seguridad a nivel de fila)
alter table public.lugares  enable row level security;
alter table public.gestores enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.lugares to anon, authenticated;
grant insert, update, delete on public.lugares to authenticated;
grant select on public.gestores to authenticated;
grant execute on function public.es_gestor() to anon, authenticated;

drop policy if exists "lugares: lectura" on public.lugares;
create policy "lugares: lectura" on public.lugares for select
  to anon, authenticated using (publicado or public.es_gestor());

drop policy if exists "lugares: alta" on public.lugares;
create policy "lugares: alta" on public.lugares for insert
  to authenticated with check (public.es_gestor());

drop policy if exists "lugares: edición" on public.lugares;
create policy "lugares: edición" on public.lugares for update
  to authenticated using (public.es_gestor()) with check (public.es_gestor());

drop policy if exists "lugares: borrado" on public.lugares;
create policy "lugares: borrado" on public.lugares for delete
  to authenticated using (public.es_gestor());

drop policy if exists "gestores: verse a sí mismo" on public.gestores;
create policy "gestores: verse a sí mismo" on public.gestores for select
  to authenticated using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- 4) Almacén de fotos (público para ver, solo gestores para subir/borrar)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "fotos: subir" on storage.objects;
create policy "fotos: subir" on storage.objects for insert
  to authenticated with check (bucket_id = 'fotos' and public.es_gestor());

drop policy if exists "fotos: cambiar" on storage.objects;
create policy "fotos: cambiar" on storage.objects for update
  to authenticated using (bucket_id = 'fotos' and public.es_gestor());

drop policy if exists "fotos: borrar" on storage.objects;
create policy "fotos: borrar" on storage.objects for delete
  to authenticated using (bucket_id = 'fotos' and public.es_gestor());

-- 5) ⬇️ CAMBIA ESTE EMAIL por el tuyo (y añade una línea por cada gestor)
insert into public.gestores (email, nombre) values
  ('tu-email@ejemplo.com', 'Administrador')
on conflict (email) do nothing;
