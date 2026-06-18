-- Pastikan bucket lampiran 'mr' dan 'po' bersifat public (read), karena link
-- lampiran dibangun sebagai URL publik (/storage/v1/object/public/<bucket>/...).
-- Jika bucket private, URL publik mengembalikan 404 "Object not found".
update storage.buckets set public = true where id in ('mr', 'po');
