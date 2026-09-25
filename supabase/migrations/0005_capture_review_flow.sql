-- 흐름을 "촬영(라벨 사진·버스 송장 사진) → 검수(정상/문제있음+메모) → 기록"으로 단순화한다.
-- 주문 리스트·자동 대사 계산·버스 송장 텍스트 입력은 v1 범위에서 제거한다.

drop view if exists bus_trip_reconciliation;
drop table if exists orders;

alter table bus_trips
  drop column if exists bus_company,
  drop column if exists vehicle_number,
  drop column if exists destination,
  drop column if exists invoice_box_count,
  drop column if exists departure_time,
  drop column if exists arrival_time;

alter table label_photos
  add column photo_type text not null default 'label'
    check (photo_type in ('label', 'invoice'));

create table trip_reviews (
  id uuid primary key default gen_random_uuid(),
  bus_trip_id uuid not null references bus_trips(id) on delete cascade,
  status text not null check (status in ('ok', 'issue')),
  note text,
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz not null default now()
);
create index trip_reviews_trip_idx on trip_reviews(bus_trip_id, reviewed_at desc);

alter table trip_reviews enable row level security;
create policy "auth all trip_reviews" on trip_reviews for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 트립 목록 화면(촬영·검수·기록)이 공통으로 쓰는 뷰: 사진 개수 + 가장 최근 검수 상태
create view trip_review_status as
select
  bt.id as trip_id, bt.trip_date, bt.terminal_name,
  count(lp.id) filter (where lp.photo_type = 'label') as label_photo_count,
  count(lp.id) filter (where lp.photo_type = 'invoice') as invoice_photo_count,
  lr.status as latest_status, lr.note as latest_note, lr.reviewed_at as latest_reviewed_at
from bus_trips bt
left join label_photos lp on lp.bus_trip_id = bt.id
left join lateral (
  select status, note, reviewed_at from trip_reviews tr
  where tr.bus_trip_id = bt.id order by reviewed_at desc limit 1
) lr on true
group by bt.id, lr.status, lr.note, lr.reviewed_at;
