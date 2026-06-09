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

      if (staff?.phone) {
        await sendWhatsApp(
          staff.phone,
          `🗓 Yeni randevu!\n👤 ${customerName}\n📅 ${date} saat ${time}\n💅 ${serviceName}`
        )
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('WhatsApp notification error:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
