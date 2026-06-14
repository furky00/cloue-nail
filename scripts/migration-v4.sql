-- Cloué Nail v4: WhatsApp Bot konuşma oturumları
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  step text NOT NULL DEFAULT 'start',
  data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
-- Sadece service role erişebilir, public erişim yok
