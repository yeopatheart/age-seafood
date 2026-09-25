-- 대사 결과는 저장하지 않고 뷰로 계산한다 (버스 편 단위)
create view bus_trip_reconciliation as
select
  bt.id as bus_trip_id, bt.trip_date, bt.terminal_name, bt.bus_company,
  bt.vehicle_number, bt.invoice_box_count,
  count(o.id) as assigned_order_count,
  count(o.id) filter (where o.checked) as checked_order_count,
  coalesce(sum(o.box_count) filter (where o.checked), 0) as checked_box_count,
  coalesce(sum(o.box_count) filter (where o.checked), 0) <> bt.invoice_box_count as is_mismatch
from bus_trips bt
left join orders o on o.bus_trip_id = bt.id
group by bt.id;
