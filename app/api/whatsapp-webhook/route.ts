import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsApp } from '@/lib/whatsapp'

const MONTHS: Record<string, number> = {
  ocak: 1, şubat: 2, mart: 3, nisan: 4, mayıs: 5, haziran: 6,
  temmuz: 7, ağustos: 8, eylül: 9, ekim: 10, kasım: 11, aralık: 12,
}

const MALE_NAMES = ['mehmet', 'arda']
const title = (name: string) =>
  MALE_NAMES.includes((name ?? '').split(' ')[0].toLowerCase()) ? 'Bey' : 'Hanım'

function formatDateTr(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', weekday: 'long',
  })
}

function parseDate(text: string): string | null {
  const lower = text.toLowerCase().trim()
  const now = new Date()

  if (lower === 'bugün') return now.toISOString().split('T')[0]
  if (lower === 'yarın') {
    const d = new Date(now); d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }

  // "15 haziran"
  const m1 = lower.match(/(\d{1,2})\s+(\w+)/)
  if (m1) {
    const day = parseInt(m1[1])
    const month = MONTHS[m1[2]]
    if (month && day >= 1 && day <= 31) {
      let year = now.getFullYear()
      const d = new Date(year, month - 1, day)
      if (d < now) d.setFullYear(year + 1)
      return d.toISOString().split('T')[0]
    }
  }

  // "15/06" or "15.06"
  const m2 = lower.match(/(\d{1,2})[\/\.](\d{1,2})/)
  if (m2) {
    const day = parseInt(m2[1])
    const month = parseInt(m2[2])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      let year = now.getFullYear()
      const d = new Date(year, month - 1, day)
      if (d < now) d.setFullYear(year + 1)
      return d.toISOString().split('T')[0]
    }
  }

  return null
}

function parseTime(text: string): string | null {
  const lower = text.toLowerCase().trim()

  const m1 = lower.match(/(\d{1,2})[:\.](\d{2})/)
  if (m1) {
    const h = parseInt(m1[1]), m = parseInt(m1[2])
    if (h >= 7 && h <= 21 && m >= 0 && m <= 59)
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  const m2 = lower.match(/(?:saat\s+)?(\d{1,2})$/)
  if (m2) {
    const h = parseInt(m2[1])
    if (h >= 7 && h <= 21) return `${String(h).padStart(2, '0')}:00`
  }

  return null
}

function addMinutes(time: string, mins: number) {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`
}

async function checkAvailable(
  supabase: any, staffId: string, date: string, time: string, duration: number
): Promise<boolean> {
  const { data } = await supabase
    .from('appointments')
    .select('time, duration_minutes')
    .eq('staff_id', staffId).eq('date', date)
    .not('status', 'in', '("cancelled","no_show")').is('deleted_at', null)

  const [h, m] = time.split(':').map(Number)
  const newStart = h * 60 + m, newEnd = newStart + duration

  for (const apt of data ?? []) {
    const [ah, am] = apt.time.split(':').map(Number)
    const aptStart = ah * 60 + am, aptEnd = aptStart + (apt.duration_minutes ?? 60)
    if (newStart < aptEnd && newEnd > aptStart) return false
  }
  return true
}

async function getSlots(
  supabase: any, staffId: string, date: string, duration: number
): Promise<string[]> {
  const { data } = await supabase
    .from('appointments')
    .select('time, duration_minutes')
    .eq('staff_id', staffId).eq('date', date)
    .not('status', 'in', '("cancelled","no_show")').is('deleted_at', null)

  const slots: string[] = []
  for (let t = 9 * 60; t + duration <= 20 * 60; t += 30) {
    const newEnd = t + duration
    let ok = true
    for (const apt of data ?? []) {
      const [ah, am] = apt.time.split(':').map(Number)
      const aptStart = ah * 60 + am, aptEnd = aptStart + (apt.duration_minutes ?? 60)
      if (t < aptEnd && newEnd > aptStart) { ok = false; break }
    }
    if (ok) slots.push(`${Math.floor(t / 60).toString().padStart(2, '0')}:${(t % 60).toString().padStart(2, '0')}`)
    if (slots.length >= 5) break
  }
  return slots
}

export async function POST(request: Request) {
  const body = await request.json()
  const { data: msg } = body

  if (!msg || msg.type !== 'chat' || msg.isFromMe) return NextResponse.json({ ok: true })

  const phone = (msg.from as string).replace('@c.us', '').replace(/\D/g, '')
  const text = (msg.body as string)?.trim()
  if (!phone || !text) return NextResponse.json({ ok: true })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Oturumu getir
  const { data: session } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('phone', phone)
    .maybeSingle()

  // 30 dakika hareketsizlik → sıfırla
  const isExpired = session?.updated_at &&
    (Date.now() - new Date(session.updated_at).getTime()) > 30 * 60 * 1000

  let step = (isExpired ? null : session?.step) ?? 'start'
  let sd: any = (isExpired ? {} : session?.data) ?? {}

  // Personel ve hizmet listesi
  const { data: staffList } = await supabase.from('users').select('id, name').eq('role', 'staff').order('name')
  const { data: serviceList } = await supabase.from('services').select('id, name, duration_minutes, price').eq('is_active', true).order('category').order('name')

  function findStaff(t: string) {
    const l = t.toLowerCase()
    return staffList?.find(s => l.includes(s.name.split(' ')[0].toLowerCase()) || s.name.toLowerCase().includes(l))
  }

  function findService(t: string) {
    const l = t.toLowerCase()
    return serviceList?.find(s =>
      l.includes(s.name.toLowerCase()) ||
      s.name.toLowerCase().includes(l) ||
      s.name.toLowerCase().startsWith(l.slice(0, 4))
    )
  }

  async function save(nextStep: string, extra: any = {}) {
    await supabase.from('whatsapp_sessions').upsert(
      { phone, step: nextStep, data: { ...sd, ...extra }, updated_at: new Date().toISOString() },
      { onConflict: 'phone' }
    )
    step = nextStep
    sd = { ...sd, ...extra }
  }

  async function send(msg: string, nextStep: string, extra: any = {}) {
    await sendWhatsApp(phone, msg)
    await save(nextStep, extra)
  }

  const lower = text.toLowerCase()

  try {
    // --- START ---
    if (step === 'start' || isExpired || lower.includes('merhaba') || lower.includes('randevu') || lower === 'başla') {
      await send(
        `Merhaba! 😊 Cloué Nail randevu sistemine hoş geldiniz.\n\nAdınızı ve soyadınızı öğrenebilir miyim?`,
        'ask_name', {}
      )
      return NextResponse.json({ ok: true })
    }

    // --- AD ---
    if (step === 'ask_name') {
      if (text.length < 2) {
        await send(`Adınızı anlayamadım, lütfen tekrar yazar mısınız? 😊`, 'ask_name')
        return NextResponse.json({ ok: true })
      }
      const staffNames = staffList?.map(s => `• ${s.name.split(' ')[0]}`).join('\n') ?? ''
      await send(
        `Merhaba ${text.split(' ')[0]} Hanım! 💅\n\nRandevunuz için özellikle çalışmak istediğiniz bir ekip arkadaşımız var mı?\n\n${staffNames}\n\n_Yoksa "Farketmez" yazabilirsiniz._`,
        'ask_staff', { customerName: text }
      )
      return NextResponse.json({ ok: true })
    }

    // --- PERSONEL ---
    if (step === 'ask_staff') {
      let prefStaff: { id: string; name: string } | null = null

      if (!lower.includes('farketmez') && !lower.includes('fark etmez') && !lower.includes('hayır') && !lower.includes('yok') && !lower.includes('bilmiyorum')) {
        const found = findStaff(text)
        if (!found) {
          const staffNames = staffList?.map(s => `• ${s.name.split(' ')[0]}`).join('\n') ?? ''
          await send(
            `"${text}" adında bir çalışanımızı bulamadım. 😊\n\nEkip arkadaşlarımız:\n${staffNames}\n\nBirini seçin veya "Farketmez" yazın.`,
            'ask_staff'
          )
          return NextResponse.json({ ok: true })
        }
        prefStaff = { id: found.id, name: found.name }
      }

      await send(
        `Hangi tarih için randevu almak istersiniz?\n\n_Örnek: 15 Haziran, yarın, 15/06_`,
        'ask_date',
        { prefStaffId: prefStaff?.id ?? null, prefStaffName: prefStaff?.name ?? null }
      )
      return NextResponse.json({ ok: true })
    }

    // --- TARİH ---
    if (step === 'ask_date') {
      const date = parseDate(text)
      if (!date) {
        await send(`Tarihi anlayamadım. 😊 Lütfen şu şekilde yazın:\n_15 Haziran_, _yarın_, _15/06_`, 'ask_date')
        return NextResponse.json({ ok: true })
      }
      await send(
        `${formatDateTr(date)} için hangi saatte gelmek istersiniz?\n\n_Örnek: 14:00, 15:30_`,
        'ask_time', { date }
      )
      return NextResponse.json({ ok: true })
    }

    // --- SAAT ---
    if (step === 'ask_time') {
      const time = parseTime(text)
      if (!time) {
        await send(`Saati anlayamadım. 😊 Lütfen şu formatta yazın:\n_14:00_ veya _15:30_`, 'ask_time')
        return NextResponse.json({ ok: true })
      }
      const serviceNames = serviceList?.map(s => `• ${s.name}`).join('\n') ?? ''
      await send(
        `Hangi hizmeti almak istersiniz?\n\n${serviceNames}`,
        'ask_service', { time }
      )
      return NextResponse.json({ ok: true })
    }

    // --- HİZMET ---
    if (step === 'ask_service') {
      const service = findService(text)
      if (!service) {
        const serviceNames = serviceList?.map(s => `• ${s.name}`).join('\n') ?? ''
        await send(
          `"${text}" hizmetini bulamadım. 😊 Lütfen aşağıdan seçin:\n\n${serviceNames}`,
          'ask_service'
        )
        return NextResponse.json({ ok: true })
      }

      const { date, time, prefStaffId, prefStaffName } = sd

      if (prefStaffId) {
        const avail = await checkAvailable(supabase, prefStaffId, date, time, service.duration_minutes)
        if (avail) {
          await send(
            _confirmMsg(sd.customerName, prefStaffName, service.name, date, time),
            'confirm',
            { serviceId: service.id, serviceName: service.name, serviceDuration: service.duration_minutes, servicePrice: service.price, assignedStaffId: prefStaffId, assignedStaffName: prefStaffName }
          )
        } else {
          // Tercih edilen personel meşgul — alternatifler sun
          const slots = await getSlots(supabase, prefStaffId, date, service.duration_minutes)
          const otherAvail: { id: string; name: string }[] = []
          for (const s of staffList ?? []) {
            if (s.id === prefStaffId) continue
            if (await checkAvailable(supabase, s.id, date, time, service.duration_minutes)) otherAvail.push(s)
          }

          let altMsg = `Maalesef ${prefStaffName} ${title(prefStaffName)} ${time}'de müsait değil. 😊\n\n`
          if (slots.length) altMsg += `*${prefStaffName} ${title(prefStaffName)} için uygun saatler:*\n${slots.map(s => `• ${s}`).join('\n')}\n\n`
          if (otherAvail.length) altMsg += `*${time}'de müsait diğer çalışanlarımız:*\n${otherAvail.map(s => `• ${s.name} ${title(s.name)}`).join('\n')}\n\n`
          altMsg += `Hangi seçeneği tercih edersiniz?`

          await send(altMsg, 'ask_alternative', {
            serviceId: service.id, serviceName: service.name,
            serviceDuration: service.duration_minutes, servicePrice: service.price,
            altSlots: slots, altStaff: otherAvail,
          })
        }
      } else {
        // Tercih yok — uygun ilk personeli ata
        let assigned: { id: string; name: string } | null = null
        for (const s of staffList ?? []) {
          if (await checkAvailable(supabase, s.id, date, time, service.duration_minutes)) {
            assigned = { id: s.id, name: s.name }; break
          }
        }

        if (!assigned) {
          // Hiçbiri müsait değil — tüm personelin boş saatlerini listele
          let noMsg = `Maalesef ${formatDateTr(date)} saat ${time}'de hiçbir çalışanımız müsait değil. 😊\n\n`
          for (const s of staffList ?? []) {
            const slots = await getSlots(supabase, s.id, date, service.duration_minutes)
            if (slots.length) noMsg += `*${s.name} ${title(s.name)}* için uygun saatler:\n${slots.map(sl => `• ${sl}`).join('\n')}\n\n`
          }
          noMsg += `Hangi saat size uygun?`
          await send(noMsg, 'ask_time', { serviceId: service.id, serviceName: service.name, serviceDuration: service.duration_minutes, servicePrice: service.price })
        } else {
          await send(
            _confirmMsg(sd.customerName, assigned.name, service.name, date, time),
            'confirm',
            { serviceId: service.id, serviceName: service.name, serviceDuration: service.duration_minutes, servicePrice: service.price, assignedStaffId: assigned.id, assignedStaffName: assigned.name }
          )
        }
      }
      return NextResponse.json({ ok: true })
    }

    // --- ALTERNATİF SEÇİM ---
    if (step === 'ask_alternative') {
      const { date, prefStaffId, altSlots, altStaff, serviceName, serviceDuration, servicePrice, serviceId } = sd

      const newTime = parseTime(text)
      if (newTime) {
        // Yeni saat seçildi
        let staffId = prefStaffId, staffName = sd.prefStaffName
        if (!(await checkAvailable(supabase, prefStaffId, date, newTime, serviceDuration))) {
          for (const s of staffList ?? []) {
            if (await checkAvailable(supabase, s.id, date, newTime, serviceDuration)) {
              staffId = s.id; staffName = s.name; break
            }
          }
        }
        await send(
          _confirmMsg(sd.customerName, staffName, serviceName, date, newTime),
          'confirm', { time: newTime, assignedStaffId: staffId, assignedStaffName: staffName }
        )
        return NextResponse.json({ ok: true })
      }

      const chosenStaff = findStaff(text)
      if (chosenStaff && (altStaff as any[])?.find((s: any) => s.id === chosenStaff.id)) {
        await send(
          _confirmMsg(sd.customerName, chosenStaff.name, serviceName, date, sd.time),
          'confirm', { assignedStaffId: chosenStaff.id, assignedStaffName: chosenStaff.name }
        )
        return NextResponse.json({ ok: true })
      }

      await send(`Ne demek istediğinizi anlayamadım. 😊 Lütfen bir saat veya çalışan adı yazın.`, 'ask_alternative')
      return NextResponse.json({ ok: true })
    }

    // --- ONAY ---
    if (step === 'confirm') {
      if (lower.includes('evet') || lower.includes('tamam') || lower === 'e' || lower === 'ok' || lower === '👍') {
        const { customerName, date, time, serviceId, serviceName, serviceDuration, servicePrice, assignedStaffId, assignedStaffName } = sd

        // Müşteri bul veya oluştur
        const { data: existing } = await supabase.from('customers').select('id').eq('phone', phone).maybeSingle()
        let customerId: string
        if (existing) {
          customerId = existing.id
          await supabase.from('customers').update({ name: customerName }).eq('id', existing.id)
        } else {
          const { data: newC } = await supabase.from('customers').insert({ name: customerName, phone }).select('id').single()
          customerId = newC!.id
        }

        const endTime = addMinutes(time, serviceDuration)
        await supabase.from('appointments').insert({
          customer_id: customerId,
          staff_id: assignedStaffId,
          service_id: serviceId,
          date, time,
          end_time: `${endTime}:00`,
          duration_minutes: serviceDuration,
          price: servicePrice ?? 0,
          discount: 0,
          net_amount: servicePrice ?? 0,
          payment_type: 'nakit',
          status: 'pending',
        })

        // Oturumu temizle
        await supabase.from('whatsapp_sessions').delete().eq('phone', phone)

        await sendWhatsApp(phone,
          `Randevunuz oluşturuldu! ✅\n\n👤 ${customerName}\n👩 Personel: ${assignedStaffName} ${title(assignedStaffName)}\n💅 Hizmet: ${serviceName}\n📅 ${formatDateTr(date)}\n🕐 Saat: ${time}\n\n📍 Adres: Kavaklıdere, Esat Cd. Perçiner İş Merkezi D:22/8, 06640 Çankaya/Ankara\n🗺️ Konum: https://share.google/e7NzUcDsjfZkqNusa\n\nSizi bekliyoruz! 🌸`
        )

        // Personele bildir
        const { data: staffUser } = await supabase.from('users').select('phone').eq('id', assignedStaffId).single()
        if (staffUser?.phone) {
          await sendWhatsApp(staffUser.phone, `🗓 Yeni randevu (WhatsApp Bot)!\n👤 ${customerName}\n📅 ${formatDateTr(date)} saat ${time}\n💅 ${serviceName}`)
        }

      } else if (lower.includes('hayır') || lower.includes('iptal') || lower === 'h') {
        await supabase.from('whatsapp_sessions').delete().eq('phone', phone)
        await sendWhatsApp(phone, `Randevu iptal edildi. Tekrar randevu almak istediğinizde yazabilirsiniz. 😊`)
      } else {
        await send(`Onaylamak için *Evet*, iptal etmek için *Hayır* yazınız.`, 'confirm')
      }
      return NextResponse.json({ ok: true })
    }

    // Bilinmeyen durum → yeniden başlat
    await send(
      `Ne demek istediğinizi anlayamadım. 😊 Randevu almak için *merhaba* yazabilirsiniz.`,
      'start', {}
    )
    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

function _confirmMsg(customerName: string, staffName: string, serviceName: string, date: string, time: string) {
  const t = (n: string) => ['mehmet', 'arda'].includes((n ?? '').split(' ')[0].toLowerCase()) ? 'Bey' : 'Hanım'
  return `Randevunuzu özetleyeyim:\n\n👤 ${customerName}\n👩 Personel: ${staffName} ${t(staffName)}\n💅 Hizmet: ${serviceName}\n📅 ${formatDateTr(date)}\n🕐 Saat: ${time}\n\nOnaylıyor musunuz? *(Evet / Hayır)*`
}
