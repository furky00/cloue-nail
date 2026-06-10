import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsApp } from '@/lib/whatsapp'
import { addDays, subDays, format } from 'date-fns'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  let sent = 0

  const MALE_NAMES = ['mehmet', 'arda']
  const staffTitle = (name: string) =>
    MALE_NAMES.includes(name?.split(' ')[0].toLowerCase()) ? 'Bey' : 'Hanım'

  // --- 2 saatlik hatırlatma ---
  // Her saat başı çalışır, şu andan 2 saat sonraki randevuları bulur
  const targetHour = (now.getHours() + 2) % 24
  const targetDate = targetHour < now.getHours()
    ? format(addDays(now, 1), 'yyyy-MM-dd') // gece yarısını geçtiyse ertesi gün
    : format(now, 'yyyy-MM-dd')
  const targetTime = `${String(targetHour).padStart(2, '0')}:`

  const { data: upcoming } = await supabase
    .from('appointments')
    .select('*, customer:customers(name, phone), service:services(name), staff:users(name)')
    .eq('date', targetDate)
    .eq('status', 'pending')
    .like('time', `${targetTime}%`)

  for (const apt of upcoming ?? []) {
    if (apt.customer?.phone) {
      await sendWhatsApp(
        apt.customer.phone,
        `Merhaba ${apt.customer.name.split(' ')[0]} Hanım! 💅\nBugün saat ${apt.time?.slice(0, 5)}'de ${apt.staff?.name} ${staffTitle(apt.staff?.name)} ile Cloué Nail'deki ${apt.service?.name} randevunuz 2 saat sonra başlıyor.\nSizi bekliyoruz! 🌸`
      )
      sent++
    }
  }

  // --- 3 gün sonra memnuniyet mesajı ---
  const threeDaysAgo = format(subDays(now, 3), 'yyyy-MM-dd')

  const { data: completed } = await supabase
    .from('appointments')
    .select('*, customer:customers(name, phone), service:services(name), staff:users(name)')
    .eq('date', threeDaysAgo)
    .eq('status', 'completed')

  for (const apt of completed ?? []) {
    if (apt.customer?.phone) {
      await sendWhatsApp(
        apt.customer.phone,
        `Merhaba ${apt.customer.name.split(' ')[0]} Hanım! 😊\n${apt.staff?.name} ${staffTitle(apt.staff?.name)} ile yaptırdığınız ${apt.service?.name} hizmetimizden memnun kaldınız mı?\nGörüşleriniz bizim için çok değerli. Bizi tercih ettiğiniz için teşekkür ederiz! 💕\n— Cloué Nail`
      )
      sent++
    }
  }

  return NextResponse.json({ sent })
}
