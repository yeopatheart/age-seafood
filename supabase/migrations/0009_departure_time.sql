-- 버스 송장 사진에서 AI가 읽은 출발시간을 사람이 확인한 뒤 저장하는 컬럼.
-- 같은 터미널에 버스가 두 편 이상 가는 경우를 출발시간으로 자연스럽게 구분하기 위함
-- (docs/decisions 참고). invoice_box_count와 동일한 "AI 제안, 사람 확인" 패턴 — 자유
-- 텍스트로 저장해서 "10:30", "오전 10시반" 등 다양한 표기를 그대로 받아들인다.
alter table bus_trips add column departure_time text;

-- create or replace view는 기존 컬럼 순서를 바꿀 수 없어 새 컬럼을 맨 뒤에 추가한다.
create or replace view trip_review_status as
select
  bt.id as trip_id, bt.trip_date, bt.terminal_name,
  count(lp.id) filter (where lp.photo_type = 'label') as label_photo_count,
  count(lp.id) filter (where lp.photo_type = 'invoice') as invoice_photo_count,
  lr.note as latest_note, lr.reviewed_at as latest_reviewed_at,
  bt.invoice_box_count,
  bt.departure_time
from bus_trips bt
left join label_photos lp on lp.bus_trip_id = bt.id
left join lateral (
  select note, reviewed_at from trip_reviews tr
  where tr.bus_trip_id = bt.id order by reviewed_at desc limit 1
) lr on true
group by bt.id, lr.note, lr.reviewed_at;
