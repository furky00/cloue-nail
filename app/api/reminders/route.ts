import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsApp } from '@/lib/whatsapp'
import { addDays, format } from 'date-fns'

export async function GET(request: Request) {
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
        `Merhaba ${apt.customer.name}! 💅\nYarın saat ${apt.time?.slice(0, 5)}'de Cloué Nail'deki ${apt.service?.name} randevunuzu hatırlatırız.\nBizi tercih ettiğiniz için teşekkürler! 🌸`
      )
      sent++
    }
  }

  return NextResponse.json({ sent })
}
