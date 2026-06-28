-- ============================================================================
--  VITRA — Dry Fruits & More
--  Supabase schema (fresh database for the customer app + admin dashboard)
--  Run this in the Supabase SQL Editor (Dashboard → SQL → New query → Run).
--  Modeled from the prototype's data layer so the UI maps 1:1 onto these tables.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type product_status as enum ('draft','published','out_of_stock');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('pending','paid','processing','shipped','delivered','cancelled','refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ticket_status as enum ('open','pending','resolved','closed');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  tone        text,                       -- swatch/gradient seed used by the UI
  icon        text,
  sort_order  int  default 0,
  visible     boolean default true,
  created_at  timestamptz default now()
);

create table if not exists products (
  id           uuid primary key default gen_random_uuid(),
  sku          text unique,
  name         text not null,
  brand        text default 'Vitra',
  category_id  uuid references categories(id) on delete set null,
  description  text,
  highlights   jsonb default '[]'::jsonb,  -- ["Hand-picked", ...]
  specs        jsonb default '{}'::jsonb,  -- {"Origin":"California", ...}
  tone         text,                       -- gradient seed (placeholder imagery)
  images       jsonb default '[]'::jsonb,  -- [storage urls]
  price        numeric(12,2) not null,     -- selling price (INR)
  mrp          numeric(12,2),              -- strike-through price
  rating       numeric(2,1) default 0,
  review_count int default 0,
  stock        int default 0,
  free_delivery boolean default false,
  badge        text,                       -- "BESTSELLER" | "-20%" | null
  tags         text[] default '{}',
  status       product_status default 'published',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index if not exists products_category_idx on products(category_id);
create index if not exists products_status_idx   on products(status);

-- Category-aware variants (pack size, storage, colour, configuration, volume…)
create table if not exists product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid references products(id) on delete cascade,
  kind        text not null,               -- "pack" | "storage" | "color" | "config" | "size" | "volume"
  label       text not null,               -- "250g" | "256GB" | "Charcoal"
  price_delta numeric(12,2) default 0,     -- added to base price
  stock       int default 0,
  is_default  boolean default false,
  sort_order  int default 0
);
create index if not exists variants_product_idx on product_variants(product_id);

-- ---------------------------------------------------------------------------
-- Merchandising
-- ---------------------------------------------------------------------------
create table if not exists banners (
  id          uuid primary key default gen_random_uuid(),
  tag         text,
  title       text not null,
  subtitle    text,
  cta         text default 'Shop now',
  placement   text default 'home',         -- home | category | top_strip
  gradient    text,
  active       boolean default true,
  starts_at   timestamptz,
  ends_at     timestamptz,
  sort_order  int default 0,
  created_at  timestamptz default now()
);

create table if not exists promo_codes (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,
  description   text,
  discount_type text default 'flat',        -- flat | percent
  amount        numeric(12,2) not null,
  min_order     numeric(12,2) default 0,
  active        boolean default true,
  starts_at     timestamptz,
  ends_at       timestamptz,
  created_at    timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Customers (profile row links to Supabase auth.users)
-- ---------------------------------------------------------------------------
create table if not exists customers (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  phone       text,
  tier        text default 'Silver',        -- Silver | Gold | Platinum
  segment     text default 'New',           -- New | Returning | VIP | At-risk
  lifetime_spend numeric(14,2) default 0,
  admin_notes text,
  status      text default 'active',
  created_at  timestamptz default now()
);

create table if not exists addresses (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  label       text default 'Home',          -- Home | Work | Other
  recipient   text,
  phone       text,
  line1       text not null,
  line2       text,
  city        text,
  state       text,
  pincode     text,
  is_default  boolean default false
);
create index if not exists addresses_customer_idx on addresses(customer_id);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table if not exists orders (
  id            uuid primary key default gen_random_uuid(),
  number        text unique not null default ('VT-' || to_char(now(),'YYMMDD') || '-' || lpad((floor(random()*100000))::text,5,'0')),
  customer_id   uuid references customers(id) on delete set null,
  status        order_status default 'pending',
  payment_method text,                       -- cod | card | upi | wallet | netbanking
  subtotal      numeric(12,2) default 0,
  discount      numeric(12,2) default 0,
  delivery_fee  numeric(12,2) default 0,
  tax           numeric(12,2) default 0,
  total         numeric(12,2) default 0,
  promo_code    text,
  address       jsonb,                        -- snapshot of shipping address
  note          text,
  placed_at     timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists orders_customer_idx on orders(customer_id);
create index if not exists orders_status_idx   on orders(status);

create table if not exists order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid references orders(id) on delete cascade,
  product_id  uuid references products(id) on delete set null,
  name        text not null,                 -- snapshot
  variant     text,                          -- "250g" snapshot
  unit_price  numeric(12,2) not null,
  qty         int not null default 1,
  tone        text
);
create index if not exists order_items_order_idx on order_items(order_id);

-- Tracking timeline + internal admin notes
create table if not exists order_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid references orders(id) on delete cascade,
  status      order_status,
  title       text,
  detail      text,
  is_internal boolean default false,
  created_at  timestamptz default now()
);
create index if not exists order_events_order_idx on order_events(order_id);

-- ---------------------------------------------------------------------------
-- Engagement: wishlist, reviews, notifications, support
-- ---------------------------------------------------------------------------
create table if not exists wishlist_items (
  customer_id uuid references customers(id) on delete cascade,
  product_id  uuid references products(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (customer_id, product_id)
);

create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid references products(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  author      text,
  rating      int check (rating between 1 and 5),
  body        text,
  created_at  timestamptz default now()
);
create index if not exists reviews_product_idx on reviews(product_id);

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  kind        text,                          -- order | offer | price_drop | restock | support
  title       text not null,
  body        text,
  read        boolean default false,
  created_at  timestamptz default now()
);
create index if not exists notifications_customer_idx on notifications(customer_id);

create table if not exists support_tickets (
  id          uuid primary key default gen_random_uuid(),
  number      text unique not null default ('TK-' || lpad((floor(random()*1000000))::text,6,'0')),
  customer_id uuid references customers(id) on delete set null,
  subject     text not null,
  category    text,
  priority    text default 'normal',         -- low | normal | high | urgent
  status      ticket_status default 'open',
  assignee    text,
  created_at  timestamptz default now()
);

create table if not exists ticket_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid references support_tickets(id) on delete cascade,
  sender      text,                          -- customer | agent
  body        text,
  created_at  timestamptz default now()
);
create index if not exists ticket_messages_ticket_idx on ticket_messages(ticket_id);

-- ---------------------------------------------------------------------------
-- Store settings (single row, key/value JSON)
-- ---------------------------------------------------------------------------
create table if not exists store_settings (
  id           int primary key default 1,
  business      jsonb default '{}'::jsonb,
  payment       jsonb default '{}'::jsonb,
  shipping      jsonb default '{"free_shipping_threshold": 999}'::jsonb,
  tax           jsonb default '{"gst_percent": 5}'::jsonb,
  notifications jsonb default '{}'::jsonb,
  theme         jsonb default '{"accent":"#b97a2e","motion":10,"mode":"warm"}'::jsonb,
  constraint single_row check (id = 1)
);
insert into store_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists products_touch on products;
create trigger products_touch before update on products
  for each row execute function touch_updated_at();

drop trigger if exists orders_touch on orders;
create trigger orders_touch before update on orders
  for each row execute function touch_updated_at();

-- Auto-create a customer profile when a user signs up
create or replace function handle_new_user() returns trigger as $$
begin
  insert into customers (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email)
  on conflict (id) do nothing;
  return new;
end; $$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
--  Row Level Security
--  Public catalog is world-readable; customer data is owner-scoped.
--  The admin dashboard uses the SERVICE-ROLE key (bypasses RLS) on the server.
-- ============================================================================
alter table categories       enable row level security;
alter table products         enable row level security;
alter table product_variants enable row level security;
alter table banners          enable row level security;
alter table promo_codes      enable row level security;
alter table reviews          enable row level security;
alter table customers        enable row level security;
alter table addresses        enable row level security;
alter table orders           enable row level security;
alter table order_items      enable row level security;
alter table order_events     enable row level security;
alter table wishlist_items   enable row level security;
alter table notifications    enable row level security;
alter table support_tickets  enable row level security;
alter table ticket_messages  enable row level security;

-- Public read for catalog/merchandising
do $$ begin
  create policy "public read categories"   on categories       for select using (true);
  create policy "public read products"     on products         for select using (status <> 'draft');
  create policy "public read variants"     on product_variants for select using (true);
  create policy "public read banners"      on banners          for select using (active);
  create policy "public read promos"       on promo_codes      for select using (active);
  create policy "public read reviews"      on reviews          for select using (true);
exception when duplicate_object then null; end $$;

-- Owner-scoped customer data
do $$ begin
  create policy "own profile"      on customers      for all using (auth.uid() = id) with check (auth.uid() = id);
  create policy "own addresses"    on addresses      for all using (auth.uid() = customer_id) with check (auth.uid() = customer_id);
  create policy "own orders"       on orders         for select using (auth.uid() = customer_id);
  create policy "insert own order" on orders         for insert with check (auth.uid() = customer_id);
  create policy "own order items"  on order_items    for select using (exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid()));
  create policy "own order events" on order_events   for select using (exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid()) and not is_internal);
  create policy "own wishlist"     on wishlist_items for all using (auth.uid() = customer_id) with check (auth.uid() = customer_id);
  create policy "own notifs"       on notifications  for all using (auth.uid() = customer_id) with check (auth.uid() = customer_id);
  create policy "own tickets"      on support_tickets for all using (auth.uid() = customer_id) with check (auth.uid() = customer_id);
  create policy "own ticket msgs"  on ticket_messages for all using (exists (select 1 from support_tickets t where t.id = ticket_id and t.customer_id = auth.uid())) with check (true);
  create policy "write own review" on reviews        for insert with check (auth.uid() = customer_id);
exception when duplicate_object then null; end $$;
