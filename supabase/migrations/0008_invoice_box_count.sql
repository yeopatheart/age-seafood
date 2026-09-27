-- 버스 송장 사진에서 AI가 읽어준 박스 수량을 사람이 확인한 뒤 저장하는 컬럼.
-- 수기 입력이 아니라 "AI 제안값을 사람이 확인/수정"하는 방식이라 부담이 적다 (docs/decisions 참고).
alter table bus_trips add column invoice_box_count integer;

-- create or replace view는 기존 컬럼 순서를 바꿀 수 없어 새 컬럼을 맨 뒤에 추가한다.
create or replace view trip_review_status as
select
  bt.id as trip_id, bt.trip_date, bt.terminal_name,
  count(lp.id) filter (where lp.photo_type = 'label') as label_photo_count,
  count(lp.id) filter (where lp.photo_type = 'invoice') as invoice_photo_count,
  lr.note as latest_note, lr.reviewed_at as latest_reviewed_at,
  bt.invoice_box_count
from bus_trips bt
left join label_photos lp on lp.bus_trip_id = bt.id
left join lateral (
  select note, reviewed_at from trip_reviews tr
  where tr.bus_trip_id = bt.id order by reviewed_at desc limit 1
) lr on true
group by bt.id, lr.note, lr.reviewed_at;
