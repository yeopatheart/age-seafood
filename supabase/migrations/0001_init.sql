-- 가족 구성원 프로필 (auth.users 1:1)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 버스 편(송장) 단위 발송 기록
create table bus_trips (
  id uuid primary key default gen_random_uuid(),
  trip_date date not null default current_date,
  terminal_name text not null,
  bus_company text not null,
  vehicle_number text not null,
  destination text,
  invoice_box_count integer not null check (invoice_box_count >= 0),
  departure_time timestamptz,
  arrival_time timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- D-1 주문 리스트 항목. bus_trip_id는 발송 직전에 배정된다
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_date date not null default current_date,
  terminal_name text not null,
  customer_name text not null,
  box_count integer not null check (box_count > 0),
  bus_trip_id uuid references bus_trips(id) on delete set null,
  checked boolean not null default false,
  checked_by uuid references profiles(id),
  checked_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_date_terminal_idx on orders(order_date, terminal_name);
create index orders_bus_trip_idx on orders(bus_trip_id);

-- 박스 라벨 촬영 사진 (버스 편에 연결)
create table label_photos (
  id uuid primary key default gen_random_uuid(),
  bus_trip_id uuid not null references bus_trips(id) on delete cascade,
  storage_path text not null,
  taken_by uuid references profiles(id),
  taken_at timestamptz not null default now()
);

create function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;
create trigger orders_set_updated_at before update on orders
  for each row execute function set_updated_at();

-- checked_by/checked_at은 클라이언트 입력이 아니라 서버(트리거)에서 auth.uid()로 설정한다
-- ("누가 체크했는지" 기록이 신뢰 가능해야 하므로)
create function set_checked_by() returns trigger as $$
begin
  if new.checked is distinct from old.checked then
    new.checked_by := auth.uid();
    new.checked_at := case when new.checked then now() else null end;
  end if;
  return new;
end; $$ language plpgsql security definer;
create trigger orders_set_checked_by before update on orders
  for each row execute function set_checked_by();

alter table profiles enable row level security;
alter table orders enable row level security;
alter table bus_trips enable row level security;
alter table label_photos enable row level security;

-- 소규모 신뢰 팀, 행 단위 소유권 구분 없음: 로그인한 가족 구성원 누구나 읽기/쓰기
-- (v1은 역할 구분 없음 — docs/decisions/2026-09-25-terminal-dispatch-scope.md 결정 6)
create policy "auth read profiles" on profiles for select using (auth.role() = 'authenticated');
create policy "auth all orders" on orders for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth all bus_trips" on bus_trips for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth all label_photos" on label_photos for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
