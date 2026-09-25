-- 검수 결과를 정상/문제있음 구분 없이 "검수완료" 하나로 단순화한다 (스와이프로 확인).
-- 문제가 있으면 메모에 적는다 — 별도 상태값은 두지 않는다.
-- trip_review_status 뷰가 status 컬럼을 참조하고 있어 먼저 지우고 나중에 다시 만든다.
drop view trip_review_status;

alter table trip_reviews drop column status;

create view trip_review_status as
select
  bt.id as trip_id, bt.trip_date, bt.terminal_name,
  count(lp.id) filter (where lp.photo_type = 'label') as label_photo_count,
  count(lp.id) filter (where lp.photo_type = 'invoice') as invoice_photo_count,
  lr.note as latest_note, lr.reviewed_at as latest_reviewed_at
from bus_trips bt
left join label_photos lp on lp.bus_trip_id = bt.id
left join lateral (
  select note, reviewed_at from trip_reviews tr
  where tr.bus_trip_id = bt.id order by reviewed_at desc limit 1
) lr on true
group by bt.id, lr.note, lr.reviewed_at;
