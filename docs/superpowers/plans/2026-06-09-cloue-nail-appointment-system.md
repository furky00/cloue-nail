# Cloue Nail Randevu Sistemi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js + Supabase ile mobil öncelikli, rol tabanlı randevu yönetim sistemi kurmak.

**Architecture:** Next.js 14 App Router kullanılır; Supabase hem veritabanı (PostgreSQL) hem kimlik doğrulama sağlar. Admin tüm takvimleri yönetir, staff sadece kendi takvimini görür. Vercel'de deploy edilir.

**Tech Stack:** Next.js 14, TypeScript, Supabase, Tailwind CSS, shadcn/ui, Twilio WhatsApp API, Vercel

---

## Dosya Yapısı

```
cloue-nail/
├── app/
│   ├── (auth)/login/page.tsx          # Giriş sayfası
│   ├── (dashboard)/
│   │   ├── layout.tsx                  # Auth guard + nav
│   │   ├── dashboard/page.tsx          # Takvim
│   │   ├── appointments/
│   │   │   ├── new/page.tsx            # Yeni randevu formu
│   │   │   └── [id]/page.tsx           # Randevu detay/düzenle
│   │   ├── reports/page.tsx            # Admin raporlar
│   │   └── admin/
│   │       ├── staff/page.tsx          # Çalışan yönetimi
│   │       └── services/page.tsx       # Hizmet türleri
│   └── api/
│       ├── appointments/route.ts       # GET/POST randevular
│       ├── appointments/[id]/route.ts  # GET/PUT/DELETE tek randevu
│       ├── reports/route.ts            # Rapor verileri
│       └── notify/route.ts             # WhatsApp gönderme
├── components/
│   ├── calendar/
│   │   ├── CalendarView.tsx            # Takvim ana bileşen
│   │   ├── DayView.tsx                 # Günlük görünüm
│   │   └── WeekView.tsx                # Haftalık görünüm
│   ├── appointments/
│   │   ├── AppointmentForm.tsx         # Yeni/düzenleme formu
│   │   └── AppointmentCard.tsx         # Takvimde görünen kart
│   └── ui/
│       └── BottomNav.tsx               # Mobil alt navigasyon
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # Browser client
│   │   └── server.ts                   # Server client
│   ├── types.ts                        # Tüm TypeScript tipleri
│   ├── utils.ts                        # Yardımcı fonksiyonlar
│   └── whatsapp.ts                     # Twilio WhatsApp helper
└── supabase/migrations/
    └── 001_initial.sql                 # Tüm tablolar + RLS
```

---

## Task 1: Proje Kurulumu

**Files:**
- Create: `package.json`, `tsconfig.json`, `.env.local.example`
- Create: `tailwind.config.ts`, `app/layout.tsx`, `app/globals.css`

- [ ] **Step 1: Next.js projesi oluştur**

```bash
cd C:\Users\gsfur
npx create-next-app@latest cloue-nail --typescript --tailwind --app --no-src-dir --import-alias "@/*"
cd cloue-nail
```

- [ ] **Step 2: Bağımlılıkları yükle**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install twilio
npm install date-fns
npm install react-hook-form zod @hookform/resolvers
npm install lucide-react
npx shadcn@latest init
npx shadcn@latest add button input label select card dialog form toast badge
```

- [ ] **Step 3: `.env.local` dosyası oluştur**

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 4: `.env.local.example` oluştur (commit'lenecek)**

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 5: Commit**

```bash
git add .env.local.example package.json package-lock.json
git commit -m "feat: initial Next.js project setup with dependencies"
```

---

## Task 2: TypeScript Tipleri ve Supabase Client

**Files:**
- Create: `lib/types.ts`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: `lib/types.ts` yaz**

```typescript
export type UserRole = 'admin' | 'staff'
export type AppointmentStatus = 'pending' | 'completed' | 'cancelled'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  phone: string
  created_at: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  created_at: string
}

export interface Service {
  id: string
  name: string
  price: number
}

export interface Appointment {
  id: string
  customer_id: string
  staff_id: string
  service_id: string
  date: string
  time: string
  price: number
  note: string | null
  status: AppointmentStatus
  created_at: string
  // join alanları
  customer?: Customer
  staff?: User
  service?: Service
}
```

- [ ] **Step 2: `lib/supabase/client.ts` yaz**

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: `lib/supabase/server.ts` yaz**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/
git commit -m "feat: add TypeScript types and Supabase clients"
```

---

## Task 3: Supabase Veritabanı Şeması ve RLS

**Files:**
- Create: `supabase/migrations/001_initial.sql`

- [ ] **Step 1: Supabase dashboard'da yeni proje oluştur**

1. https://supabase.com adresine git
2. "New Project" → proje adı: `cloue-nail`
3. Şifre kaydet, bölge: `eu-central-1` (Frankfurt - Türkiye'ye yakın)
4. Proje URL ve anon key'i `.env.local` dosyasına yapıştır

- [ ] **Step 2: `supabase/migrations/001_initial.sql` yaz**

```sql
-- users tablosu (Supabase auth.users ile bağlı)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'staff')) default 'staff',
  phone text not null default '',
  created_at timestamptz default now()
);

-- customers tablosu
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  created_at timestamptz default now()
);

-- services tablosu
create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price decimal(10,2) not null default 0,
  created_at timestamptz default now()
);

-- appointments tablosu
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  staff_id uuid references public.users(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  date date not null,
  time time not null,
  price decimal(10,2) not null default 0,
  note text,
  status text not null check (status in ('pending', 'completed', 'cancelled')) default 'pending',
  created_at timestamptz default now()
);

-- RLS aktif et
alter table public.users enable row level security;
alter table public.customers enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;

-- users policy: herkes kendi bilgisini okuyabilir, admin hepsini görebilir
create policy "users_read_own" on public.users
  for select using (
    auth.uid() = id or
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "users_admin_all" on public.users
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- customers: giriş yapmış herkes okuyabilir, admin yönetir
create policy "customers_read_authenticated" on public.customers
  for select using (auth.role() = 'authenticated');

create policy "customers_write_authenticated" on public.customers
  for insert with check (auth.role() = 'authenticated');

create policy "customers_admin_all" on public.customers
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- services: herkes okuyabilir, admin yönetir
create policy "services_read_authenticated" on public.services
  for select using (auth.role() = 'authenticated');

create policy "services_admin_all" on public.services
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- appointments: staff kendi randevularını görür, admin hepsini görür
create policy "appointments_staff_own" on public.appointments
  for select using (
    staff_id = auth.uid() or
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "appointments_staff_insert" on public.appointments
  for insert with check (
    staff_id = auth.uid() or
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "appointments_staff_update_own" on public.appointments
  for update using (
    staff_id = auth.uid() or
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "appointments_admin_delete" on public.appointments
  for delete using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- Başlangıç hizmetleri
insert into public.services (name, price) values
  ('Manikür', 250),
  ('Pedikür', 300),
  ('Kalıcı Oje (El)', 350),
  ('Kalıcı Oje (Ayak)', 400),
  ('Protez Tırnak', 600),
  ('Tırnak Bakımı', 150);
```

- [ ] **Step 3: SQL'i Supabase SQL Editor'da çalıştır**

Supabase dashboard → SQL Editor → yukarıdaki SQL'i yapıştır → Run

- [ ] **Step 4: Admin kullanıcı oluştur**

Supabase dashboard → Authentication → Users → "Invite User" ile:
- Email: `admin@clouenail.com`
- Şifre belirle

Sonra SQL Editor'da:
```sql
-- auth.users'dan id'yi al ve users tablosuna ekle
insert into public.users (id, name, email, role, phone)
values (
  (select id from auth.users where email = 'admin@clouenail.com'),
  'Admin',
  'admin@clouenail.com',
  'admin',
  '+90xxxxxxxxxx'
);
```

- [ ] **Step 5: Commit**

```bash
git add supabase/
git commit -m "feat: add database schema and RLS policies"
```

---

## Task 4: Auth — Giriş Sayfası

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `middleware.ts`

- [ ] **Step 1: `middleware.ts` yaz (auth guard)**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
```

- [ ] **Step 2: `app/(auth)/login/page.tsx` yaz**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email veya şifre hatalı')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Cloue Nail</CardTitle>
          <p className="text-gray-500 text-sm">Randevu Yönetim Sistemi</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Uygulamayı başlat ve giriş sayfasını test et**

```bash
npm run dev
```

Tarayıcıda `http://localhost:3000/login` aç. Login formu görünmeli, `/dashboard`'a gitmeye çalışırsa `/login`'e yönlendirmeli.

- [ ] **Step 4: Commit**

```bash
git add app/ middleware.ts
git commit -m "feat: add login page with Supabase auth and middleware guard"
```

---

## Task 5: Dashboard Layout ve Alt Navigasyon

**Files:**
- Create: `app/(dashboard)/layout.tsx`
- Create: `components/ui/BottomNav.tsx`

- [ ] **Step 1: `components/ui/BottomNav.tsx` yaz**

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, PlusCircle, BarChart2, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  isAdmin: boolean
}

export function BottomNav({ isAdmin }: BottomNavProps) {
  const pathname = usePathname()

  const links = [
    { href: '/dashboard', label: 'Takvim', icon: CalendarDays },
    { href: '/appointments/new', label: 'Randevu', icon: PlusCircle },
    ...(isAdmin ? [{ href: '/reports', label: 'Rapor', icon: BarChart2 }] : []),
    ...(isAdmin ? [{ href: '/admin/services', label: 'Ayarlar', icon: Settings }] : []),
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-1 px-4 py-2 text-xs',
              pathname === href ? 'text-pink-600' : 'text-gray-500'
            )}
          >
            <Icon size={22} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: `app/(dashboard)/layout.tsx` yaz**

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/ui/BottomNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, name')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold text-lg text-pink-600">Cloue Nail</h1>
        <span className="text-sm text-gray-500">{profile?.name}</span>
      </header>
      <main className="pb-20">
        {children}
      </main>
      <BottomNav isAdmin={isAdmin} />
    </div>
  )
}
```

- [ ] **Step 3: Test**

Supabase'e admin kullanıcıyla giriş yap. Dashboard layout görünmeli, alt nav çalışmalı.

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/layout.tsx components/ui/BottomNav.tsx
git commit -m "feat: add dashboard layout with mobile bottom navigation"
```

---

## Task 6: Takvim Görünümü (Dashboard)

**Files:**
- Create: `app/(dashboard)/dashboard/page.tsx`
- Create: `components/calendar/CalendarView.tsx`
- Create: `components/appointments/AppointmentCard.tsx`

- [ ] **Step 1: `components/appointments/AppointmentCard.tsx` yaz**

```typescript
import { Badge } from '@/components/ui/badge'
import type { Appointment } from '@/lib/types'

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const statusLabels = {
  pending: 'Bekliyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
}

interface AppointmentCardProps {
  appointment: Appointment
  onClick?: () => void
}

export function AppointmentCard({ appointment, onClick }: AppointmentCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-sm transition-shadow"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm">{appointment.time.slice(0, 5)}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[appointment.status]}`}>
          {statusLabels[appointment.status]}
        </span>
      </div>
      <p className="font-semibold">{appointment.customer?.name}</p>
      <p className="text-sm text-gray-500">{appointment.service?.name}</p>
      <p className="text-sm text-pink-600 font-medium">₺{appointment.price}</p>
      {appointment.staff && (
        <p className="text-xs text-gray-400 mt-1">{appointment.staff.name}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: `components/calendar/CalendarView.tsx` yaz**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays, subDays, startOfWeek, isSameDay } from 'date-fns'
import { tr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppointmentCard } from '@/components/appointments/AppointmentCard'
import type { Appointment } from '@/lib/types'

interface CalendarViewProps {
  appointments: Appointment[]
  isAdmin: boolean
}

export function CalendarView({ appointments, isAdmin }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const router = useRouter()

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const dayAppointments = appointments.filter(a =>
    isSameDay(new Date(a.date), selectedDate)
  ).sort((a, b) => a.time.localeCompare(b.time))

  return (
    <div className="p-4 space-y-4">
      {/* Haftalık gezinme */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setSelectedDate(d => subDays(d, 7))}>
          <ChevronLeft size={20} />
        </Button>
        <span className="font-semibold">
          {format(selectedDate, 'MMMM yyyy', { locale: tr })}
        </span>
        <Button variant="ghost" size="icon" onClick={() => setSelectedDate(d => addDays(d, 7))}>
          <ChevronRight size={20} />
        </Button>
      </div>

      {/* Hafta günleri */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map(day => {
          const hasAppointment = appointments.some(a => isSameDay(new Date(a.date), day))
          const isSelected = isSameDay(day, selectedDate)
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={`flex flex-col items-center py-2 rounded-lg text-xs transition-colors ${
                isSelected
                  ? 'bg-pink-600 text-white'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <span>{format(day, 'EEE', { locale: tr })}</span>
              <span className="font-bold text-base">{format(day, 'd')}</span>
              {hasAppointment && !isSelected && (
                <div className="w-1 h-1 rounded-full bg-pink-400 mt-0.5" />
              )}
            </button>
          )
        })}
      </div>

      {/* Seçili gün randevuları */}
      <div>
        <h2 className="font-semibold text-gray-700 mb-3">
          {format(selectedDate, 'd MMMM, EEEE', { locale: tr })}
          <span className="text-gray-400 font-normal ml-2">
            ({dayAppointments.length} randevu)
          </span>
        </h2>
        {dayAppointments.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Bu gün için randevu yok</p>
        ) : (
          <div className="space-y-2">
            {dayAppointments.map(apt => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                onClick={() => router.push(`/appointments/${apt.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: `app/(dashboard)/dashboard/page.tsx` yaz**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CalendarView } from '@/components/calendar/CalendarView'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  // Admin tüm randevuları görür, staff sadece kendini
  let query = supabase
    .from('appointments')
    .select(`
      *,
      customer:customers(id, name, phone),
      staff:users(id, name),
      service:services(id, name, price)
    `)
    .order('time', { ascending: true })

  if (!isAdmin) {
    query = query.eq('staff_id', user.id)
  }

  const { data: appointments } = await query

  return <CalendarView appointments={appointments ?? []} isAdmin={isAdmin} />
}
```

- [ ] **Step 4: date-fns locale yükle**

```bash
npm install date-fns
```

`package.json`'da zaten varsa atla.

- [ ] **Step 5: Test**

`http://localhost:3000/dashboard` aç. Haftalık takvim görünmeli, randevu eklenince kartta görünmeli.

- [ ] **Step 6: Commit**

```bash
git add app/(dashboard)/dashboard/ components/calendar/ components/appointments/AppointmentCard.tsx
git commit -m "feat: add calendar dashboard with weekly view and appointment cards"
```

---

## Task 7: Yeni Randevu Formu

**Files:**
- Create: `app/(dashboard)/appointments/new/page.tsx`
- Create: `components/appointments/AppointmentForm.tsx`

- [ ] **Step 1: `components/appointments/AppointmentForm.tsx` yaz**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { User, Service, Customer } from '@/lib/types'

interface AppointmentFormProps {
  currentUserId: string
  isAdmin: boolean
  staffList: User[]
  services: Service[]
  defaultStaffId?: string
  defaultDate?: string
}

export function AppointmentForm({
  currentUserId,
  isAdmin,
  staffList,
  services,
  defaultDate,
}: AppointmentFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [staffId, setStaffId] = useState(isAdmin ? '' : currentUserId)
  const [serviceId, setServiceId] = useState('')
  const [date, setDate] = useState(defaultDate ?? new Date().toISOString().split('T')[0])
  const [time, setTime] = useState('10:00')
  const [price, setPrice] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Hizmet seçilince fiyatı otomatik doldur
  useEffect(() => {
    const service = services.find(s => s.id === serviceId)
    if (service) setPrice(service.price.toString())
  }, [serviceId, services])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Müşteriyi bul veya oluştur
    let customerId: string
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', customerPhone)
      .single()

    if (existing) {
      customerId = existing.id
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({ name: customerName, phone: customerPhone })
        .select('id')
        .single()

      if (customerError || !newCustomer) {
        setError('Müşteri oluşturulamadı')
        setLoading(false)
        return
      }
      customerId = newCustomer.id
    }

    // Randevu oluştur
    const { error: aptError } = await supabase.from('appointments').insert({
      customer_id: customerId,
      staff_id: staffId || currentUserId,
      service_id: serviceId,
      date,
      time,
      price: parseFloat(price),
      note: note || null,
      status: 'pending',
    })

    if (aptError) {
      setError('Randevu oluşturulamadı: ' + aptError.message)
      setLoading(false)
      return
    }

    // WhatsApp bildirimi gönder
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'new_appointment',
        staffId: staffId || currentUserId,
        customerPhone,
        customerName,
        date,
        time,
        serviceName: services.find(s => s.id === serviceId)?.name,
      }),
    })

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <div className="space-y-2">
        <Label>Müşteri Adı</Label>
        <Input value={customerName} onChange={e => setCustomerName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Müşteri Telefonu</Label>
        <Input
          type="tel"
          placeholder="+905xxxxxxxxx"
          value={customerPhone}
          onChange={e => setCustomerPhone(e.target.value)}
          required
        />
      </div>
      {isAdmin && (
        <div className="space-y-2">
          <Label>Çalışan</Label>
          <Select value={staffId} onValueChange={setStaffId} required>
            <SelectTrigger><SelectValue placeholder="Çalışan seç" /></SelectTrigger>
            <SelectContent>
              {staffList.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label>Hizmet</Label>
        <Select value={serviceId} onValueChange={setServiceId} required>
          <SelectTrigger><SelectValue placeholder="Hizmet seç" /></SelectTrigger>
          <SelectContent>
            {services.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name} — ₺{s.price}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Tarih</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Saat</Label>
          <Input type="time" value={time} onChange={e => setTime(e.target.value)} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Fiyat (₺)</Label>
        <Input
          type="number"
          value={price}
          onChange={e => setPrice(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Not (isteğe bağlı)</Label>
        <Input value={note} onChange={e => setNote(e.target.value)} />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <Button type="submit" className="w-full bg-pink-600 hover:bg-pink-700" disabled={loading}>
        {loading ? 'Kaydediliyor...' : 'Randevu Oluştur'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: `app/(dashboard)/appointments/new/page.tsx` yaz**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppointmentForm } from '@/components/appointments/AppointmentForm'

export default async function NewAppointmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  const [{ data: staffList }, { data: services }] = await Promise.all([
    supabase.from('users').select('id, name, role').eq('role', 'staff').order('name'),
    supabase.from('services').select('*').order('name'),
  ])

  return (
    <div>
      <div className="px-4 py-3 border-b bg-white">
        <h2 className="font-semibold text-lg">Yeni Randevu</h2>
      </div>
      <AppointmentForm
        currentUserId={user.id}
        isAdmin={isAdmin}
        staffList={staffList ?? []}
        services={services ?? []}
      />
    </div>
  )
}
```

- [ ] **Step 3: Test**

`/appointments/new` sayfasını aç. Form doldur, kaydet. Dashboard'da randevu görünmeli.

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/appointments/new/ components/appointments/AppointmentForm.tsx
git commit -m "feat: add new appointment form with customer autocreate"
```

---

## Task 8: Randevu Detay / Düzenleme

**Files:**
- Create: `app/(dashboard)/appointments/[id]/page.tsx`

- [ ] **Step 1: `app/(dashboard)/appointments/[id]/page.tsx` yaz**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { Appointment, AppointmentStatus } from '@/lib/types'

const statusLabels: Record<AppointmentStatus, string> = {
  pending: 'Bekliyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
}

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [apt, setApt] = useState<Appointment | null>(null)
  const [status, setStatus] = useState<AppointmentStatus>('pending')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase
      .from('appointments')
      .select('*, customer:customers(*), staff:users(*), service:services(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          setApt(data)
          setStatus(data.status)
          setNote(data.note ?? '')
        }
      })
  }, [id])

  async function handleSave() {
    setLoading(true)
    await supabase.from('appointments').update({ status, note }).eq('id', id)
    setLoading(false)
    router.push('/dashboard')
    router.refresh()
  }

  if (!apt) return <div className="p-4 text-gray-500">Yükleniyor...</div>

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-lg border p-4 space-y-2">
        <h2 className="font-bold text-lg">{apt.customer?.name}</h2>
        <p className="text-gray-500">{apt.customer?.phone}</p>
        <p>{apt.service?.name}</p>
        <p className="text-pink-600 font-semibold">₺{apt.price}</p>
        <p className="text-gray-500">{apt.date} {apt.time?.slice(0, 5)}</p>
        <p className="text-gray-400 text-sm">Çalışan: {apt.staff?.name}</p>
      </div>

      <div className="space-y-2">
        <Label>Durum</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as AppointmentStatus)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(statusLabels) as AppointmentStatus[]).map(s => (
              <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Not</Label>
        <Input value={note} onChange={e => setNote(e.target.value)} />
      </div>

      <Button onClick={handleSave} className="w-full bg-pink-600 hover:bg-pink-700" disabled={loading}>
        {loading ? 'Kaydediliyor...' : 'Güncelle'}
      </Button>
      <Button variant="outline" className="w-full" onClick={() => router.back()}>
        Geri
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Test**

Dashboard'da bir randevuya tıkla, detay sayfası açılmalı. Durumu değiştir, güncelle, dashboard'a dönmeli.

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/appointments/\[id\]/
git commit -m "feat: add appointment detail and status update page"
```

---

## Task 9: WhatsApp API Entegrasyonu

**Files:**
- Create: `lib/whatsapp.ts`
- Create: `app/api/notify/route.ts`

- [ ] **Step 1: `lib/whatsapp.ts` yaz**

```typescript
import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

export async function sendWhatsApp(to: string, message: string) {
  // Twilio sandbox test numarasını kullan (prod'da kendi numarandan gönder)
  await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM!,
    to: `whatsapp:${to}`,
    body: message,
  })
}
```

- [ ] **Step 2: `app/api/notify/route.ts` yaz**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsApp } from '@/lib/whatsapp'

export async function POST(request: Request) {
  const body = await request.json()
  const { type, staffId, customerPhone, customerName, date, time, serviceName } = body

  try {
    if (type === 'new_appointment') {
      const supabase = await createClient()
      const { data: staff } = await supabase
        .from('users')
        .select('name, phone')
        .eq('id', staffId)
        .single()

      // Çalışana bildirim
      if (staff?.phone) {
        await sendWhatsApp(
          staff.phone,
          `🗓 Yeni randevu!\n👤 ${customerName}\n📅 ${date} saat ${time}\n💅 ${serviceName}`
        )
      }

      // Müşteriye hatırlatma (hemen değil, cron ile - şimdilik sadece staff'a)
      // Müşteri bildirimi için aşağıya bakın (Task 10)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('WhatsApp notification error:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
```

- [ ] **Step 3: Twilio sandbox kurulumu**

1. https://www.twilio.com adresinde ücretsiz hesap aç
2. Console → Messaging → Try it out → Send a WhatsApp message
3. Sandbox'a katılmak için telefona `join <sandbox-code>` mesajı gönder
4. `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` değerlerini `.env.local`'e yapıştır

- [ ] **Step 4: Test**

Yeni randevu oluştur → çalışanın telefonuna WhatsApp mesajı gelmeli.

- [ ] **Step 5: Commit**

```bash
git add lib/whatsapp.ts app/api/notify/
git commit -m "feat: add Twilio WhatsApp notification on new appointment"
```

---

## Task 10: Müşteri Hatırlatma Cron Job

**Files:**
- Create: `app/api/reminders/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: `app/api/reminders/route.ts` yaz**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsApp } from '@/lib/whatsapp'
import { addDays, format } from 'date-fns'

// Bu endpoint Vercel Cron ile her gün 10:00'da tetiklenir
export async function GET(request: Request) {
  // Cron secret kontrolü
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, customer:customers(name, phone), service:services(name)')
    .eq('date', tomorrow)
    .eq('status', 'pending')

  if (!appointments) return NextResponse.json({ sent: 0 })

  let sent = 0
  for (const apt of appointments) {
    if (apt.customer?.phone) {
      await sendWhatsApp(
        apt.customer.phone,
        `Merhaba ${apt.customer.name}! 💅\nYarın saat ${apt.time?.slice(0, 5)}'de Cloue Nail'deki ${apt.service?.name} randevunuzu hatırlatırız.\nBizi tercih ettiğiniz için teşekkürler! 🌸`
      )
      sent++
    }
  }

  return NextResponse.json({ sent })
}
```

- [ ] **Step 2: `vercel.json` oluştur**

```json
{
  "crons": [
    {
      "path": "/api/reminders",
      "schedule": "0 7 * * *"
    }
  ]
}
```

Her gün sabah 07:00 UTC (10:00 Türkiye saati) çalışır.

- [ ] **Step 3: `.env.local`'e CRON_SECRET ekle**

```env
CRON_SECRET=gizli-bir-string-buraya-yaz
```

- [ ] **Step 4: Commit**

```bash
git add app/api/reminders/ vercel.json
git commit -m "feat: add daily reminder cron job for customers via WhatsApp"
```

---

## Task 11: Admin Raporlar Sayfası

**Files:**
- Create: `app/(dashboard)/reports/page.tsx`
- Create: `app/api/reports/route.ts`

- [ ] **Step 1: `app/api/reports/route.ts` yaz**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(request.url)
  const startDate = url.searchParams.get('start') ?? '2024-01-01'
  const endDate = url.searchParams.get('end') ?? '2099-12-31'
  const staffId = url.searchParams.get('staff')
  const serviceId = url.searchParams.get('service')

  let query = supabase
    .from('appointments')
    .select('*, staff:users(id, name), service:services(id, name), customer:customers(name)')
    .eq('status', 'completed')
    .gte('date', startDate)
    .lte('date', endDate)

  if (staffId) query = query.eq('staff_id', staffId)
  if (serviceId) query = query.eq('service_id', serviceId)

  const { data: appointments } = await query

  if (!appointments) return NextResponse.json({ data: [] })

  // Çalışan bazlı özet
  const staffSummary = appointments.reduce((acc, apt) => {
    const key = apt.staff?.id ?? 'unknown'
    if (!acc[key]) acc[key] = { name: apt.staff?.name ?? '-', count: 0, total: 0 }
    acc[key].count++
    acc[key].total += Number(apt.price)
    return acc
  }, {} as Record<string, { name: string; count: number; total: number }>)

  // Hizmet bazlı özet
  const serviceSummary = appointments.reduce((acc, apt) => {
    const key = apt.service?.id ?? 'unknown'
    if (!acc[key]) acc[key] = { name: apt.service?.name ?? '-', count: 0, total: 0 }
    acc[key].count++
    acc[key].total += Number(apt.price)
    return acc
  }, {} as Record<string, { name: string; count: number; total: number }>)

  return NextResponse.json({
    totalCount: appointments.length,
    totalRevenue: appointments.reduce((sum, a) => sum + Number(a.price), 0),
    staffSummary: Object.values(staffSummary).sort((a, b) => b.total - a.total),
    serviceSummary: Object.values(serviceSummary).sort((a, b) => b.count - a.count),
  })
}
```

- [ ] **Step 2: `app/(dashboard)/reports/page.tsx` yaz**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface ReportData {
  totalCount: number
  totalRevenue: number
  staffSummary: Array<{ name: string; count: number; total: number }>
  serviceSummary: Array<{ name: string; count: number; total: number }>
}

export default function ReportsPage() {
  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = today.slice(0, 8) + '01'

  const [start, setStart] = useState(firstOfMonth)
  const [end, setEnd] = useState(today)
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)

  async function fetchReport() {
    setLoading(true)
    const res = await fetch(`/api/reports?start=${start}&end=${end}`)
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  useEffect(() => { fetchReport() }, [])

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-bold text-lg">Raporlar</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Başlangıç</Label>
          <Input type="date" value={start} onChange={e => setStart(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Bitiş</Label>
          <Input type="date" value={end} onChange={e => setEnd(e.target.value)} />
        </div>
      </div>
      <Button onClick={fetchReport} className="w-full bg-pink-600 hover:bg-pink-700">
        {loading ? 'Yükleniyor...' : 'Filtrele'}
      </Button>

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-sm text-gray-500">Toplam İşlem</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-2xl font-bold">{data.totalCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-sm text-gray-500">Toplam Ciro</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-2xl font-bold text-pink-600">₺{data.totalRevenue.toLocaleString('tr-TR')}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Çalışan Bazlı</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.staffSummary.map(s => (
                <div key={s.name} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-gray-500">{s.count} işlem</p>
                  </div>
                  <p className="font-semibold text-pink-600">₺{s.total.toLocaleString('tr-TR')}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Hizmet Bazlı</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.serviceSummary.map(s => (
                <div key={s.name} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-gray-500">{s.count} kez</p>
                  </div>
                  <p className="font-semibold text-pink-600">₺{s.total.toLocaleString('tr-TR')}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Test**

Admin hesabıyla `/reports` aç. Tarih filtresi çalışmalı. Staff hesabıyla girince 403 hatası almalı.

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/reports/ app/api/reports/
git commit -m "feat: add admin reports page with staff and service breakdown"
```

---

## Task 12: Admin — Çalışan ve Hizmet Yönetimi

**Files:**
- Create: `app/(dashboard)/admin/services/page.tsx`
- Create: `app/(dashboard)/admin/staff/page.tsx`

- [ ] **Step 1: `app/(dashboard)/admin/services/page.tsx` yaz**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Service } from '@/lib/types'

export default function ServicesPage() {
  const supabase = createClient()
  const [services, setServices] = useState<Service[]>([])
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')

  async function loadServices() {
    const { data } = await supabase.from('services').select('*').order('name')
    setServices(data ?? [])
  }

  useEffect(() => { loadServices() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('services').insert({ name, price: parseFloat(price) })
    setName('')
    setPrice('')
    loadServices()
  }

  async function handleDelete(id: string) {
    await supabase.from('services').delete().eq('id', id)
    loadServices()
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-bold text-lg">Hizmet Türleri</h2>

      <form onSubmit={handleAdd} className="space-y-3 bg-white p-4 rounded-lg border">
        <div className="space-y-1">
          <Label>Hizmet Adı</Label>
          <Input value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>Fiyat (₺)</Label>
          <Input type="number" value={price} onChange={e => setPrice(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full bg-pink-600 hover:bg-pink-700">Ekle</Button>
      </form>

      <div className="space-y-2">
        {services.map(s => (
          <div key={s.id} className="flex justify-between items-center bg-white p-3 rounded-lg border">
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-pink-600">₺{s.price}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} className="text-red-500">
              Sil
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `app/(dashboard)/admin/staff/page.tsx` yaz**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { User } from '@/lib/types'

export default function StaffPage() {
  const supabase = createClient()
  const [staff, setStaff] = useState<User[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadStaff() {
    const { data } = await supabase.from('users').select('*').eq('role', 'staff').order('name')
    setStaff(data ?? [])
  }

  useEffect(() => { loadStaff() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password }),
    })

    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Hata oluştu')
    } else {
      setName(''); setEmail(''); setPhone(''); setPassword('')
      loadStaff()
    }
    setLoading(false)
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-bold text-lg">Çalışanlar</h2>

      <form onSubmit={handleAdd} className="space-y-3 bg-white p-4 rounded-lg border">
        <div className="space-y-1">
          <Label>Ad Soyad</Label>
          <Input value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>Telefon (WhatsApp)</Label>
          <Input placeholder="+905xxxxxxxxx" value={phone} onChange={e => setPhone(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>Şifre</Label>
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit" className="w-full bg-pink-600 hover:bg-pink-700" disabled={loading}>
          {loading ? 'Ekleniyor...' : 'Çalışan Ekle'}
        </Button>
      </form>

      <div className="space-y-2">
        {staff.map(s => (
          <div key={s.id} className="bg-white p-3 rounded-lg border">
            <p className="font-medium">{s.name}</p>
            <p className="text-sm text-gray-500">{s.email}</p>
            <p className="text-sm text-gray-400">{s.phone}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: `app/api/admin/staff/route.ts` yaz**

```typescript
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, email, phone, password } = await request.json()

  // Admin client kullan (service role key)
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !newUser.user) {
    return NextResponse.json({ error: authError?.message ?? 'Auth hatası' }, { status: 400 })
  }

  const { error: profileError } = await adminClient.from('users').insert({
    id: newUser.user.id,
    name,
    email,
    phone,
    role: 'staff',
  })

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Test**

Admin ile `/admin/staff` sayfasını aç, yeni çalışan ekle. Supabase dashboard'da auth ve users tablosunda görünmeli.

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/admin/ app/api/admin/
git commit -m "feat: add admin staff and service management pages"
```

---

## Task 13: Vercel Deploy

**Files:**
- Modify: `.env.local` → Vercel environment variables

- [ ] **Step 1: GitHub repo oluştur ve push et**

```bash
git remote add origin https://github.com/<kullaniciadi>/cloue-nail.git
git push -u origin main
```

- [ ] **Step 2: Vercel'e bağla**

1. https://vercel.com → "Add New Project"
2. GitHub repo'yu seç
3. Framework: Next.js (otomatik algılar)

- [ ] **Step 3: Environment Variables ekle**

Vercel dashboard → Settings → Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_FROM
CRON_SECRET
NEXT_PUBLIC_APP_URL   → https://cloue-nail.vercel.app (Vercel'in verdiği URL)
```

- [ ] **Step 4: Deploy**

Vercel otomatik deploy eder. Dashboard'da "Build Logs" takip et.

- [ ] **Step 5: Supabase'de production URL'i ekle**

Supabase → Authentication → URL Configuration:
- Site URL: `https://cloue-nail.vercel.app`
- Redirect URLs: `https://cloue-nail.vercel.app/**`

- [ ] **Step 6: Son test**

Production URL'de giriş yap, randevu oluştur, WhatsApp bildirimini kontrol et.

---

## Özet

| Task | Kapsam |
|------|--------|
| 1 | Proje kurulumu |
| 2 | TypeScript tipleri + Supabase client |
| 3 | Veritabanı şeması + RLS |
| 4 | Giriş sayfası + middleware |
| 5 | Dashboard layout + alt navigasyon |
| 6 | Takvim görünümü |
| 7 | Yeni randevu formu |
| 8 | Randevu detay/güncelleme |
| 9 | WhatsApp bildirimleri (Twilio) |
| 10 | Müşteri hatırlatma cron job |
| 11 | Admin raporlar sayfası |
| 12 | Çalışan + hizmet yönetimi |
| 13 | Vercel deploy |
