import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsApp } from '@/lib/whatsapp'

const MALE_NAMES = ['mehmet', 'arda']
const staffTitle = (name: string) =>
  MALE_NAMES.includes(name?.split(' ')[0].toLowerCase()) ? 'Bey' : 'Hanım'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })
}

async function logMessage(supabase: any, {
  appointmentId, customerId, phone, messageType, content, status = 'sent'
}: {
  appointmentId?: string, customerId?: string, phone: string,
  messageType: string, content: string, status?: string
}) {
  await supabase.from('whatsapp_logs').insert({
    appointment_id: appointmentId ?? null,
    customer_id: customerId ?? null,
    phone,
    message_type: messageType,
    content,
    status,
  })
}

export async function POST(request: Request) {
  const body = await request.json()
  const { type, appointmentId, staffId, customerPhone, customerName, date, time, serviceName, token } = body

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    if (type === 'new_appointment') {
      // Personele bildirim
      if (staffId) {
        const { data: staff } = await supabase.from('users').select('name, phone').eq('id', staffId).single()
        if (staff?.phone) {
          const msg = `🗓 Yeni randevu!\n👤 ${customerName}\n📅 ${formatDate(date)} saat ${time}\n💅 ${serviceName}`
          await sendWhatsApp(staff.phone, msg)
        }
      }

      // Müşteriye onay mesajı
      if (customerPhone) {
        const { data: staff } = await supabase.from('users').select('name').eq('id', staffId).single()
        const staffName = staff?.name ?? ''
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://cloue-nail.vercel.app'
        const miniLink = token ? `${appUrl}/randevum/${token}` : ''

        const firstName = customerName.split(' ')[0]
        const staffDisplay = staffName ? `${staffName} ${staffTitle(staffName)}` : 'Ekibimiz'
        const msg = `Merhaba ${firstName} Hanım! 💅\n\nCloué Nail'de randevunuz başarıyla oluşturuldu.\n\n👤 Personel: ${staffDisplay}\n💅 Hizmet: ${serviceName}\n📅 Tarih: ${formatDate(date)}\n🕐 Saat: ${time}\n\n📍 Adres: Kavaklıdere, Esat Cd. Perçiner İş Merkezi D:22/8, 06640 Çankaya/Ankara\n🗺️ Konum: https://share.google/e7NzUcDsjfZkqNusa\n\nSizi bekliyoruz! 🌸`

        await sendWhatsApp(customerPhone, msg)
        await logMessage(supabase, {
          appointmentId,
          phone: customerPhone,
          messageType: 'new_appointment',
          content: msg,
        })
      }
    }

    if (type === 'no_show') {
      // Randevu bilgilerini getir
      const { data: apt } = await supabase
        .from('appointments')
        .select('*, customer:customers(name, phone), staff:users(name)')
        .eq('id', appointmentId)
        .single()

      if (apt?.customer?.phone) {
        const firstName = apt.customer.name.split(' ')[0]
        const msg = `Merhaba ${firstName} Hanım 💕\n\nBugün sizi randevunuzda göremedik. Umarız her şey yolundadır.\n\nYeni bir randevu oluşturmak ister misiniz? Size uygun bir zamanda tekrar bekliyoruz! 🌸\n\n— Cloué Nail`
        await sendWhatsApp(apt.customer.phone, msg)
        await logMessage(supabase, {
          appointmentId,
          customerId: apt.customer_id,
          phone: apt.customer.phone,
          messageType: 'no_show',
          content: msg,
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Notify error:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
