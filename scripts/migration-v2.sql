-- =====================================================
-- Cloué Nail v2 Migration
-- Supabase SQL Editor'da çalıştır
-- =====================================================

-- 1. appointments tablosuna yeni alanlar
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS end_time time,
  ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'nakit',
  ADD COLUMN IF NOT EXISTS discount numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS token text DEFAULT gen_random_uuid()::text;

-- status için yeni değerler (confirmed, no_show) text kolonu olduğu için direkt çalışır
-- Mevcut: pending, completed, cancelled
-- Yeni: + confirmed, no_show

-- 2. Mevcut token boşları doldur
UPDATE appointments SET token = gen_random_uuid()::text WHERE token IS NULL;

-- 3. token unique index
CREATE UNIQUE INDEX IF NOT EXISTS appointments_token_idx ON appointments(token);

-- 4. net_amount boşları fiyattan doldur
UPDATE appointments SET net_amount = price WHERE net_amount IS NULL;

-- 5. users tablosuna komisyon oranı
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2) DEFAULT 50;

-- 6. customers tablosuna doğum günü
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS birthday date,
  ADD COLUMN IF NOT EXISTS notes text;

-- 7. WhatsApp log tablosu
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  phone text NOT NULL,
  message_type text NOT NULL,
  content text NOT NULL,
  status text DEFAULT 'sent',
  created_at timestamptz DEFAULT now()
);

-- 8. Puan/yorum tablosu
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE UNIQUE,
  score integer CHECK (score >= 1 AND score <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

-- 9. RLS politikaları
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- whatsapp_logs: sadece authenticated kullanıcılar okuyabilir
CREATE POLICY IF NOT EXISTS "auth_read_logs" ON whatsapp_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "service_insert_logs" ON whatsapp_logs
  FOR INSERT TO authenticated USING (true) WITH CHECK (true);

-- ratings: herkese açık okuma (mini link), insert herkese açık
CREATE POLICY IF NOT EXISTS "public_read_ratings" ON ratings
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "public_insert_ratings" ON ratings
  FOR INSERT WITH CHECK (true);

-- appointments: token ile public okuma (mini link için)
-- Mevcut RLS politikalarına ek, token ile okuma
CREATE POLICY IF NOT EXISTS "public_read_by_token" ON appointments
  FOR SELECT USING (token IS NOT NULL);
