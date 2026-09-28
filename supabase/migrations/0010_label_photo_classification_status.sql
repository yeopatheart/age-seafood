-- 업로드를 AI 분류와 분리하면서(백그라운드 처리), 사진이 "아직 분류 대기 중"인지 "분류가
-- 끝났는지"(터미널을 찾았든 못 찾았든)를 구분할 컬럼이 필요해졌다. 이게 없으면 방금 올라와
-- 아직 처리 중인 사진과 AI가 정말 못 읽어낸 사진을 구분할 수 없어서, 확인 탭에 "미확인"
-- 카드가 잠깐 나타났다 사진이 다 빠져나가면 빈 채로 남는 문제가 생겼다.
-- 기존 행은 이미 (구조상) 분류가 끝난 상태이므로 기본값을 'done'으로 한다.
alter table label_photos
  add column classification_status text not null default 'done'
  check (classification_status in ('pending', 'done'));
