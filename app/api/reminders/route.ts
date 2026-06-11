import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsApp } from '@/lib/whatsapp'
import { addDays, subDays, subWeeks, format } from 'date-fns'

const MALE_NAMES = ['mehmet', 'arda']
const staffTitle = (name: string) =>
  MALE_NAMES.includes(name?.split(' ')[0].toLowerCase()) ? 'Bey' : 'Hanım'

async function logMessage(supabase: any, {
  appointmentId, customerId, phone, messageType, content
}: {
  appointmentId?: string, customerId?: string, phone: string, messageType: string, content: string
}) {
  await supabase.from('whatsapp_logs').insert({
    appointment_id: appointmentId ?? null,
    customer_id: customerId ?? null,
    phone,
    message_type: messageType,
    content,
    status: 'sent',
  })
}

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

  // ── 1. 2 saatlik hatırlatma ──────────────────────────────
  const targetHour = (now.getHours() + 2) % 24
  const targetDate = targetHour < now.getHours()
    ? format(addDays(now, 1), 'yyyy-MM-dd')
    : format(now, 'yyyy-MM-dd')
  const targetTime = `${String(targetHour).padStart(2, '0')}:`

  const { data: upcoming } = await supabase
    .from('appointments')
    .select('*, customer:customers(name, phone), service:services(name), staff:users(name)')
    .eq('date', targetDate)
    .in('status', ['pending', 'confirmed'])
    .like('time', `${targetTime}%`)
    .is('deleted_at', null)

  for (const apt of upcoming ?? []) {
    if (apt.customer?.phone) {
      const firstName = apt.customer.name.split(' ')[0]
      const msg = `Merhaba ${firstName} Hanım! 💅\nBugün saat ${apt.time?.slice(0, 5)}'de ${apt.staff?.name} ${staffTitle(apt.staff?.name)} ile Cloué Nail'deki ${apt.service?.name} randevunuz 2 saat sonra başlıyor.\nSizi bekliyoruz! 🌸`
      await sendWhatsApp(apt.customer.phone, msg)
      await logMessage(supabase, { appointmentId: apt.id, customerId: apt.customer_id, phone: apt.customer.phone, messageType: 'reminder_2h', content: msg })
      sent++
    }
  }

  // ── 2. 3 gün sonra memnuniyet mesajı ────────────────────
  const threeDaysAgo = format(subDays(now, 3), 'yyyy-MM-dd')
  const { data: completed3d } = await supabase
    .from('appointments')
    .select('*, customer:customers(name, phone), service:services(name), staff:users(name)')
    .eq('date', threeDaysAgo)
    .eq('status', 'completed')
    .is('deleted_at', null)

  for (const apt of completed3d ?? []) {
    if (apt.customer?.phone) {
      const firstName = apt.customer.name.split(' ')[0]
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://cloue-nail.vercel.app'
      const miniLink = apt.token ? `${appUrl}/randevum/${apt.token}` : ''
      const msg = `Merhaba ${firstName} Hanım! 😊\n${apt.staff?.name} ${staffTitle(apt.staff?.name)} ile yaptırdığınız ${apt.service?.name} hizmetimizden memnun kaldınız mı?${miniLink ? `\n\nDeneyiminizi değerlendirmek için: ${miniLink}` : ''}\n\nGörüşleriniz bizim için çok değerli. Bizi tercih ettiğiniz için teşekkür ederiz! 💕\n— Cloué Nail`
      await sendWhatsApp(apt.customer.phone, msg)
      await logMessage(supabase, { appointmentId: apt.id, customerId: apt.customer_id, phone: apt.customer.phone, messageType: 'satisfaction_3d', content: msg })
      sent++
    }
  }

  // ── 3. 3 hafta sonra tekrar randevu hatırlatması ─────────
  const threeWeeksAgo = format(subWeeks(now, 3), 'yyyy-MM-dd')
  const { data: completed3w } = await supabase
    .from('appointments')
    .select('*, customer:customers(name, phone)')
    .eq('date', threeWeeksAgo)
    .eq('status', 'completed')
    .is('deleted_at', null)

  for (const apt of completed3w ?? []) {
    if (apt.customer?.phone) {
      const firstName = apt.customer.name.split(' ')[0]
      const msg = `Merhaba ${firstName} Hanım! 💅\nCloué Nail'deki son işleminizin üzerinden 3 hafta geçti. Yeni bakım randevusu oluşturmak ister misiniz?\n\nBizi arayabilir ya da mesaj atabilirsiniz. Sizi görmekten mutluluk duyarız! 🌸\n— Cloué Nail`
      await sendWhatsApp(apt.customer.phone, msg)
      await logMessage(supabase, { appointmentId: apt.id, customerId: apt.customer_id, phone: apt.customer.phone, messageType: 'reappointment_3w', content: msg })
      sent++
    }
  }

  // ── 4. Doğum günü mesajları ──────────────────────────────
  const todayMMDD = format(now, 'MM-dd')
  const { data: birthdayCustomers } = await supabase
    .from('customers')
    .select('id, name, phone, birthday')
    .not('birthday', 'is', null)
    .not('phone', 'is', null)

  for (const customer of birthdayCustomers ?? []) {
    if (!customer.birthday) continue
    const bday = (customer.birthday as string).slice(5)
    if (bday === todayMMDD) {
      const firstName = customer.name.split(' ')[0]
      const msg = `Doğum gününüz kutlu olsun ${firstName} Hanım! 🎂🌸\nCloué Nail ailesi olarak size güzellik dolu ve mutlu bir yaş dileriz. Bu özel gününüzde kendinizi şımarttığınız için burada sizi bekleriz! 💕\n— Cloué Nail`
      await sendWhatsApp(customer.phone, msg)
      await logMessage(supabase, { customerId: customer.id, phone: customer.phone, messageType: 'birthday', content: msg })
      sent++
    }
  }

  return NextResponse.json({ sent, time: now.toISOString() })
}
