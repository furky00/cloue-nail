-- =====================================================
-- Cloué Nail v3 Migration
-- Supabase SQL Editor'da çalıştır
-- =====================================================

-- 1. services tablosuna yeni alanlar
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'Tırnak İşlemleri',
  ADD COLUMN IF NOT EXISTS campaign_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 2. appointments tablosuna randevuya özel süre
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS duration_minutes integer;

-- Mevcut randevuların süresini hizmet tablosundan doldur
UPDATE appointments a
SET duration_minutes = COALESCE(
  (SELECT s.duration_minutes FROM services s WHERE s.id = a.service_id),
  60
)
WHERE duration_minutes IS NULL;

-- 3. Çoklu hizmet tablosu
CREATE TABLE IF NOT EXISTS appointment_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id),
  service_name text NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE appointment_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_apt_services" ON appointment_services;
CREATE POLICY "auth_read_apt_services" ON appointment_services
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_apt_services" ON appointment_services;
CREATE POLICY "auth_insert_apt_services" ON appointment_services
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_apt_services" ON appointment_services;
CREATE POLICY "auth_delete_apt_services" ON appointment_services
  FOR DELETE TO authenticated USING (true);

-- public read for mini link
DROP POLICY IF EXISTS "public_read_apt_services" ON appointment_services;
CREATE POLICY "public_read_apt_services" ON appointment_services
  FOR SELECT USING (true);

-- 4. Varsayılan hizmetleri ekle (mevcut olanları atla)
INSERT INTO services (name, category, duration_minutes, price, is_active) VALUES
  ('Manikür', 'Tırnak İşlemleri', 45, 0, true),
  ('Kalıcı Oje (Jel Destekli)', 'Tırnak İşlemleri', 60, 0, true),
  ('Protez Tırnak', 'Tırnak İşlemleri', 120, 0, true),
  ('Protez Tırnak Jel', 'Tırnak İşlemleri', 120, 0, true),
  ('Protez Bakım', 'Tırnak İşlemleri', 90, 0, true),
  ('Pedikür', 'Tırnak İşlemleri', 60, 0, true),
  ('Pedikür Kalıcı', 'Tırnak İşlemleri', 75, 0, true),
  ('Tek Parmak Tamir / Uzatma', 'Tırnak İşlemleri', 20, 0, true),
  ('Çıkarma', 'Tırnak İşlemleri', 30, 0, true),
  ('Çıkarma + Manikür', 'Tırnak İşlemleri', 60, 0, true),
  ('Chrome / Cat Eye / Ombre', 'Tırnak İşlemleri', 30, 0, true),
  ('İnci Tozu / French', 'Tırnak İşlemleri', 20, 0, true),
  ('Nail Art Tek Parmak', 'Tırnak İşlemleri', 15, 0, true),
  ('İpek Kirpik', 'Kaş / Kirpik', 90, 0, true),
  ('Kaş / Kirpik Lifting', 'Kaş / Kirpik', 60, 0, true),
  ('Kaş Alımı', 'Kaş / Kirpik', 15, 0, true)
ON CONFLICT DO NOTHING;
