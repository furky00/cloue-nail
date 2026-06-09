import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { staff_id, date, time, service_id, exclude_id } = await request.json()

  // Bu personel + hizmet için süreyi bul (önce özel, sonra varsayılan)
  const { data: customDuration } = await supabase
    .from('staff_service_durations')
    .select('duration_minutes')
    .eq('staff_id', staff_id)
    .eq('service_id', service_id)
    .single()

  const { data: service } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('id', service_id)
    .single()

  const duration = customDuration?.duration_minutes ?? service?.duration_minutes ?? 60

  // Yeni randevunun başlangıç ve bitiş dakikaları
  const [h, m] = time.split(':').map(Number)
  const newStart = h * 60 + m
  const newEnd = newStart + duration

  // O personelin o günkü randevularını getir
  let query = supabase
    .from('appointments')
    .select('time, service_id, staff_service_durations:staff_service_durations(duration_minutes), service:services(duration_minutes)')
    .eq('staff_id', staff_id)
    .eq('date', date)
    .neq('status', 'cancelled')

  if (exclude_id) query = query.neq('id', exclude_id)

  const { data: existing } = await query

  if (!existing) return NextResponse.json({ conflict: false, duration })

  // Çakışma kontrolü
  for (const apt of existing) {
    const [ah, am] = (apt.time as string).split(':').map(Number)
    const aptStart = ah * 60 + am

    // O randevu için süreyi bul
    const aptDuration = (apt as any).staff_service_durations?.[0]?.duration_minutes
      ?? (apt as any).service?.duration_minutes
      ?? 60
    const aptEnd = aptStart + aptDuration

    // Çakışma: yeni başlangıç < mevcut bitiş VE yeni bitiş > mevcut başlangıç
    if (newStart < aptEnd && newEnd > aptStart) {
      const endHour = Math.floor(aptEnd / 60).toString().padStart(2, '0')
      const endMin = (aptEnd % 60).toString().padStart(2, '0')
      return NextResponse.json({
        conflict: true,
        duration,
        message: `Bu personelin ${apt.time.slice(0, 5)} - ${endHour}:${endMin} saatleri arasında randevusu var.`
      })
    }
  }

  return NextResponse.json({ conflict: false, duration })
}
