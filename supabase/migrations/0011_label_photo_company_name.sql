-- 확인 탭 썸네일에 업체명(고객명)을 바로 보여달라는 요청 — AI가 라벨 사진에서 터미널명과
-- 함께 고객명/업체명도 읽어 저장한다. 버스송장 사진에는 해당 없어 항상 null로 남는다.
alter table label_photos add column company_name text;
