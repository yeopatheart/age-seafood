-- 라벨 사진 저장용 비공개 버킷
insert into storage.buckets (id, name, public) values ('label-photos', 'label-photos', false);

create policy "auth read label photos" on storage.objects for select
  using (bucket_id = 'label-photos' and auth.role() = 'authenticated');
create policy "auth upload label photos" on storage.objects for insert
  with check (bucket_id = 'label-photos' and auth.role() = 'authenticated');
create policy "auth delete label photos" on storage.objects for delete
  using (bucket_id = 'label-photos' and auth.role() = 'authenticated');
