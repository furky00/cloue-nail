# Supabase Kurulum

## 1. Proje Oluştur
1. https://supabase.com adresine git
2. "New Project" → proje adı: `cloue-nail`
3. Bölge: `eu-central-1` (Frankfurt)
4. Şifre kaydet

## 2. SQL Çalıştır
Supabase Dashboard → SQL Editor → `migrations/001_initial.sql` dosyasını yapıştır → Run

## 3. Admin Kullanıcı Oluştur
Supabase Dashboard → Authentication → Users → "Invite User":
- Email: admin@clouenail.com
- Şifre belirle

Sonra SQL Editor'da:
```sql
insert into public.users (id, name, email, role, phone)
values (
  (select id from auth.users where email = 'admin@clouenail.com'),
  'Admin',
  'admin@clouenail.com',
  'admin',
  '+90xxxxxxxxxx'
);
```

## 4. .env.local Güncelle
Supabase Dashboard → Settings → API:
- `NEXT_PUBLIC_SUPABASE_URL` = Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` = service_role key
