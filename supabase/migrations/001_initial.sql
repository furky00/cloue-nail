-- users tablosu (Supabase auth.users ile bağlı)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'staff')) default 'staff',
  phone text not null default '',
  created_at timestamptz default now()
);

-- customers tablosu
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  created_at timestamptz default now()
);

-- services tablosu
create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price decimal(10,2) not null default 0,
  created_at timestamptz default now()
);

-- appointments tablosu
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  staff_id uuid references public.users(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  date date not null,
  time time not null,
  price decimal(10,2) not null default 0,
  note text,
  status text not null check (status in ('pending', 'completed', 'cancelled')) default 'pending',
  created_at timestamptz default now()
);

-- RLS aktif et
alter table public.users enable row level security;
alter table public.customers enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;

-- users policy: herkes kendi bilgisini okuyabilir, admin hepsini görebilir
create policy "users_read_own" on public.users
  for select using (
    auth.uid() = id or
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "users_admin_all" on public.users
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- customers: giriş yapmış herkes okuyabilir, admin yönetir
create policy "customers_read_authenticated" on public.customers
  for select using (auth.role() = 'authenticated');

create policy "customers_write_authenticated" on public.customers
  for insert with check (auth.role() = 'authenticated');

create policy "customers_admin_all" on public.customers
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- services: herkes okuyabilir, admin yönetir
create policy "services_read_authenticated" on public.services
  for select using (auth.role() = 'authenticated');

create policy "services_admin_all" on public.services
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- appointments: staff kendi randevularını görür, admin hepsini görür
create policy "appointments_staff_own" on public.appointments
  for select using (
    staff_id = auth.uid() or
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "appointments_staff_insert" on public.appointments
  for insert with check (
    staff_id = auth.uid() or
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "appointments_staff_update_own" on public.appointments
  for update using (
    staff_id = auth.uid() or
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "appointments_admin_delete" on public.appointments
  for delete using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- Başlangıç hizmetleri
insert into public.services (name, price) values
  ('Manikür', 250),
  ('Pedikür', 300),
  ('Kalıcı Oje (El)', 350),
  ('Kalıcı Oje (Ayak)', 400),
  ('Protez Tırnak', 600),
  ('Tırnak Bakımı', 150);
