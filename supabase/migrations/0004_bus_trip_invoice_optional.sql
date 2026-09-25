-- 실제 순서: 라벨 사진 촬영·주문 배정이 먼저이고, 버스 송장(버스회사/차량번호/수량)은
-- 버스 출발 직전 종이 송장을 받은 뒤에야 알 수 있다. 버스 편은 터미널명만으로 먼저 만들고
-- 송장 정보는 나중에 채워 넣을 수 있도록 nullable로 바꾼다.
alter table bus_trips alter column bus_company drop not null;
alter table bus_trips alter column vehicle_number drop not null;
alter table bus_trips alter column invoice_box_count drop not null;

-- invoice_box_count가 아직 없으면 대사 여부를 판단할 수 없으므로 is_mismatch는 null(대기)로 둔다
create or replace view bus_trip_reconciliation as
select
  bt.id as bus_trip_id, bt.trip_date, bt.terminal_name, bt.bus_company,
  bt.vehicle_number, bt.invoice_box_count,
  count(o.id) as assigned_order_count,
  count(o.id) filter (where o.checked) as checked_order_count,
  coalesce(sum(o.box_count) filter (where o.checked), 0) as checked_box_count,
  case
    when bt.invoice_box_count is null then null
    else coalesce(sum(o.box_count) filter (where o.checked), 0) <> bt.invoice_box_count
  end as is_mismatch
from bus_trips bt
left join orders o on o.bus_trip_id = bt.id
group by bt.id;
