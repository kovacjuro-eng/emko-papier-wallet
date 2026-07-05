-- =============================================================
-- EMKO PAPIER – vernostný systém
-- Spustite celý tento súbor v Supabase SQL editore (raz).
-- =============================================================

create extension if not exists "pgcrypto";

-- -------------------------------------------------------------
-- Tabuľky
-- -------------------------------------------------------------

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- employees.id = uuid používateľa v Supabase Auth (auth.users.id)
create table if not exists public.employees (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null default 'employee' check (role in ('employee', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  gdpr_consent boolean not null default false,
  -- začiatok aktuálneho zberného cyklu; pečiatky pred týmto dátumom sa nepočítajú
  cycle_started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.stamps (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  store_id uuid not null references public.stores (id),
  employee_id uuid not null references public.employees (id),
  amount numeric(10, 2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'used', 'expired')),
  discount_percent numeric(5, 2) not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees (id) on delete set null,
  action text not null,
  customer_id uuid,
  "timestamp" timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

-- Nastavenia programu – jediný riadok (id = 1)
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  min_purchase_amount numeric(10, 2) not null default 5.00,
  stamps_required int not null default 5 check (stamps_required between 1 and 50),
  discount_percent numeric(5, 2) not null default 10.00 check (discount_percent between 1 and 100),
  reward_validity_days int not null default 60 check (reward_validity_days between 1 and 730),
  updated_at timestamptz not null default now()
);

-- Indexy
create index if not exists stamps_customer_created_idx on public.stamps (customer_id, created_at desc);
create index if not exists rewards_customer_status_idx on public.rewards (customer_id, status);
create index if not exists audit_logs_customer_idx on public.audit_logs (customer_id);
create index if not exists audit_logs_timestamp_idx on public.audit_logs ("timestamp" desc);

-- -------------------------------------------------------------
-- Seed dáta
-- -------------------------------------------------------------

insert into public.settings (id) values (1) on conflict (id) do nothing;

insert into public.stores (name)
select s from unnest(array[
  'Emko Papier – Predajňa 1',
  'Emko Papier – Predajňa 2',
  'Emko Papier – Predajňa 3',
  'Emko Papier – Predajňa 4'
]) as s
where not exists (select 1 from public.stores);

-- -------------------------------------------------------------
-- RLS
-- -------------------------------------------------------------
-- Filozofia: všetky ZÁPISY idú výhradne cez server (service role key,
-- ktorý RLS obchádza) po overení prihláseného zamestnanca v API vrstve.
-- Prihlásení zamestnanci majú cez anon/auth klienta iba ČÍTANIE.
-- Zamestnanec teda z klienta nemôže mazať zákazníkov ani meniť odmeny.

alter table public.stores enable row level security;
alter table public.employees enable row level security;
alter table public.customers enable row level security;
alter table public.stamps enable row level security;
alter table public.rewards enable row level security;
alter table public.audit_logs enable row level security;
alter table public.settings enable row level security;

-- security definer, aby politika na employees nespôsobila rekurziu RLS
create or replace function public.is_employee()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.employees where id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.employees where id = auth.uid() and role = 'admin');
$$;

create policy "employees can read customers" on public.customers
  for select to authenticated using (public.is_employee());

create policy "employees can read stamps" on public.stamps
  for select to authenticated using (public.is_employee());

create policy "employees can read rewards" on public.rewards
  for select to authenticated using (public.is_employee());

create policy "employees can read stores" on public.stores
  for select to authenticated using (public.is_employee());

create policy "employees can read settings" on public.settings
  for select to authenticated using (public.is_employee());

create policy "employee reads self, admin reads all" on public.employees
  for select to authenticated using (id = auth.uid() or public.is_admin());

create policy "admins can read audit logs" on public.audit_logs
  for select to authenticated using (public.is_admin());

-- Žiadne insert/update/delete politiky => zápisy iba cez service role (server).

-- -------------------------------------------------------------
-- PRVÝ ADMIN (urobte ručne po spustení schémy):
-- 1. Supabase dashboard -> Authentication -> Users -> Add user
--    (zadajte e-mail + heslo, zaškrtnite "Auto Confirm User")
-- 2. Skopírujte UUID nového používateľa a spustite:
--
-- insert into public.employees (id, name, email, role)
-- values ('<UUID-Z-AUTH>', 'Meno Priezvisko', 'email@emko.sk', 'admin');
--
-- Ďalších zamestnancov už vytvoríte v admin paneli aplikácie.
-- -------------------------------------------------------------
