-- 버스 송장 사진은 트립당 1장만 허용한다 (라벨 사진은 여러 장 가능).
-- 앱에서 새 송장 사진을 올릴 때 기존 것을 지우고 새로 넣지만, 동시 요청 등 경합 상황에서도
-- 데이터베이스가 최종적으로 1장만 남도록 부분 유니크 인덱스로 강제한다.
create unique index label_photos_one_invoice_per_trip
  on label_photos (bus_trip_id)
  where photo_type = 'invoice';
