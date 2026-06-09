# Cloue Nail — Randevu Takvimi Sistemi Tasarım Dokümanı

**Tarih:** 2026-06-09  
**Proje:** Cloue Nail Randevu Yönetim Sistemi

---

## Genel Bakış

Cloue Nail işletmesi için dahili randevu yönetim sistemi. 5 çalışan ve 1 yöneticiden oluşan ekip, müşterileri telefon ile aradıktan sonra randevuları sisteme manuel olarak girer. Çalışanlar kendi takvimlerini yönetir, yönetici tüm takvimleri görür ve düzenler. WhatsApp ile hem çalışana hem müşteriye hatırlatma gönderilir.

---

## Mimari

- **Frontend + Backend:** Next.js 14 (App Router)
- **Veritabanı + Auth:** Supabase (PostgreSQL)
- **Hosting:** Vercel
- **Bildirim:** Twilio WhatsApp API (veya Meta Cloud API)
- **UI:** Tailwind CSS, mobil öncelikli

```
Kullanıcı (Telefon/Tarayıcı)
        ↓
   Next.js App (Vercel)
   ├── Frontend (React, mobil öncelikli)
   └── API Routes
        ↓
   Supabase
   ├── PostgreSQL
   └── Auth
        ↓
   WhatsApp API
   └── Hatırlatma mesajları
```

---

## Kullanıcı Rolleri

| Rol | Yetki |
|-----|-------|
| `admin` | Tüm takvimleri görür/düzenler, raporlara erişir, çalışan ve hizmet yönetimi |
| `staff` | Sadece kendi takvimini görür/düzenler |

---

## Veri Modeli

### `users`
| Alan | Tip | Açıklama |
|------|-----|----------|
| id | uuid | Primary key |
| name | text | Ad soyad |
| email | text | Giriş emaili |
| role | enum | admin / staff |
| phone | text | WhatsApp bildirimi için |
| created_at | timestamp | |

### `customers`
| Alan | Tip | Açıklama |
|------|-----|----------|
| id | uuid | Primary key |
| name | text | Müşteri adı |
| phone | text | WhatsApp hatırlatma için |
| created_at | timestamp | |

### `services`
| Alan | Tip | Açıklama |
|------|-----|----------|
| id | uuid | Primary key |
| name | text | Hizmet adı (Manikür, Pedikür, Kalıcı Oje vb.) |
| price | decimal | Varsayılan fiyat |

### `appointments`
| Alan | Tip | Açıklama |
|------|-----|----------|
| id | uuid | Primary key |
| customer_id | uuid | FK → customers |
| staff_id | uuid | FK → users |
| service_id | uuid | FK → services |
| date | date | Randevu tarihi |
| time | time | Randevu saati |
| price | decimal | Uygulanan fiyat (varsayılandan farklı olabilir) |
| note | text | Ek not |
| status | enum | pending / completed / cancelled |
| created_at | timestamp | |

---

## Sayfa Yapısı

| Sayfa | Erişim | Açıklama |
|-------|--------|----------|
| `/login` | Herkese açık | Email + şifre girişi |
| `/dashboard` | Staff + Admin | Takvim görünümü (staff: kendi, admin: tümü) |
| `/appointments/new` | Staff + Admin | Yeni randevu formu |
| `/appointments/[id]` | Staff + Admin | Randevu detay/düzenleme |
| `/reports` | Sadece Admin | Filtreli istatistikler |
| `/admin/staff` | Sadece Admin | Çalışan yönetimi |
| `/admin/services` | Sadece Admin | Hizmet türleri yönetimi |

---

## Randevu Formu Alanları

- Müşteri adı (autocomplete — daha önce kayıtlıysa)
- Müşteri telefonu
- Çalışan seçimi (admin için dropdown, staff için otomatik kendi)
- Hizmet türü (dropdown)
- Tarih
- Saat
- Fiyat (hizmet fiyatı otomatik gelir, değiştirilebilir)
- Not (isteğe bağlı)

---

## Raporlar (Admin)

Filtreler:
- Tarih aralığı
- Çalışan
- Hizmet türü

Gösterilen veriler:
- Toplam randevu sayısı
- Toplam ciro
- Çalışan bazlı ciro ve işlem sayısı
- Hizmet türü bazlı dağılım

---

## WhatsApp Bildirimleri

**Çalışana** (randevu eklendiğinde):
> "Yeni randevu: [Müşteri Adı], [Tarih] saat [Saat], [Hizmet]"

**Müşteriye** (randevudan 1 gün önce):
> "Merhaba [Ad], yarın saat [Saat]'te Cloue Nail'deki randevunuzu hatırlatırız. 📍 [Adres]"

Hatırlatmalar Supabase'de bir `cron job` veya Vercel `cron` ile tetiklenir.

---

## Güvenlik

- Supabase Row Level Security (RLS): her staff sadece kendi randevularını okuyabilir/yazabilir
- Admin tüm kayıtlara erişebilir
- JWT tabanlı session (Supabase Auth)

---

## Mobil Öncelikli UI Notları

- Alt navigasyon barı (takvim, yeni randevu, raporlar)
- Takvim görünümü: günlük ve haftalık
- Hızlı randevu ekleme butonu (floating action button)
- Karanlık mod opsiyonel (sonraya bırakılabilir)
