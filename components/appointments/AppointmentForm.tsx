'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle } from 'lucide-react'
import type { User, Service, PaymentType } from '@/lib/types'

interface AppointmentFormProps {
  currentUserId: string
  isAdmin: boolean
  staffList: User[]
  services: Service[]
  defaultDate?: string
}

const PAYMENT_LABELS: Record<PaymentType, string> = {
  nakit: '💵 Nakit',
  kart: '💳 Kart',
  iban: '🏦 IBAN',
}

function addMinutes(time: string, mins: number) {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`
}

export function AppointmentForm({ currentUserId, isAdmin, staffList, services, defaultDate }: AppointmentFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [staffId, setStaffId] = useState(isAdmin ? '' : currentUserId)
  const [serviceId, setServiceId] = useState('')
  const [date, setDate] = useState(defaultDate ?? new Date().toISOString().split('T')[0])
  const [time, setTime] = useState('10:00')
  const [price, setPrice] = useState('')
  const [discount, setDiscount] = useState('0')
  const [paymentType, setPaymentType] = useState<PaymentType>('nakit')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [duration, setDuration] = useState(60)
  const [conflictError, setConflictError] = useState('')

  useEffect(() => {
    const service = services.find(s => s.id === serviceId)
    if (service) setPrice(service.price.toString())
  }, [serviceId, services])

  useEffect(() => {
    if (!serviceId || !date || !time) return
    const effStaffId = staffId || currentUserId
    if (!effStaffId) return

    fetch('/api/appointments/check-conflict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id: effStaffId, date, time, service_id: serviceId }),
    })
      .then(r => r.json())
      .then(data => {
        setDuration(data.duration ?? 60)
        setConflictError(data.conflict ? data.message : '')
      })
  }, [serviceId, staffId, date, time])

  const netAmount = Math.max(0, parseFloat(price || '0') - parseFloat(discount || '0'))
  const endTime = time ? addMinutes(time, duration) : ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (conflictError) return
    setLoading(true)
    setError('')

    let customerId: string
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', customerPhone)
      .maybeSingle()

    if (existing) {
      customerId = existing.id
      // İsmi güncelle
      await supabase.from('customers').update({ name: customerName }).eq('id', existing.id)
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

    const selectedService = services.find(s => s.id === serviceId)
    const endTimeStr = endTime ? `${endTime}:00` : null

    const { data: newApt, error: aptError } = await supabase.from('appointments').insert({
      customer_id: customerId,
      staff_id: staffId || currentUserId,
      service_id: serviceId,
      date,
      time,
      end_time: endTimeStr,
      price: parseFloat(price),
      discount: parseFloat(discount || '0'),
      net_amount: netAmount,
      payment_type: paymentType,
      note: note || null,
      status: 'pending',
    }).select('id, token').single()

    if (aptError || !newApt) {
      setError('Randevu oluşturulamadı: ' + aptError?.message)
      setLoading(false)
      return
    }

    // Müşteriye onay WA mesajı
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'new_appointment',
        appointmentId: newApt.id,
        staffId: staffId || currentUserId,
        customerPhone,
        customerName,
        date,
        time,
        serviceName: selectedService?.name,
        token: newApt.token,
      }),
    })

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4 max-w-lg mx-auto">
      {/* Müşteri bilgileri */}
      <div className="bg-white rounded-2xl card-shadow p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Müşteri</p>
        <div className="space-y-1.5">
          <Label className="text-sm">Ad Soyad</Label>
          <Input
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            className="rounded-xl border-gray-200 h-11"
            placeholder="Örn: Elif Yılmaz"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Telefon (WhatsApp)</Label>
          <Input
            type="tel"
            placeholder="+905xxxxxxxxx"
            value={customerPhone}
            onChange={e => setCustomerPhone(e.target.value)}
            className="rounded-xl border-gray-200 h-11"
            required
          />
        </div>
      </div>

      {/* Randevu detayları */}
      <div className="bg-white rounded-2xl card-shadow p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Randevu</p>

        {isAdmin && (
          <div className="space-y-1.5">
            <Label className="text-sm">Personel</Label>
            <Select value={staffId} onValueChange={(v) => v && setStaffId(v)} required>
              <SelectTrigger className="rounded-xl border-gray-200 h-11"><SelectValue placeholder="Personel seç" /></SelectTrigger>
              <SelectContent>
                {staffList.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-sm">Hizmet</Label>
          <Select value={serviceId} onValueChange={(v) => v && setServiceId(v)} required>
            <SelectTrigger className="rounded-xl border-gray-200 h-11"><SelectValue placeholder="Hizmet seç" /></SelectTrigger>
            <SelectContent>
              {services.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name} — ₺{s.price} · {s.duration_minutes}dk</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Tarih</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-xl border-gray-200 h-11" required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Saat</Label>
            <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="rounded-xl border-gray-200 h-11" required />
          </div>
        </div>

        {serviceId && endTime && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${conflictError ? 'bg-red-50 text-red-600' : 'bg-green-50 text-emerald-700'}`}>
            {conflictError ? (
              <><AlertCircle size={15} /> {conflictError}</>
            ) : (
              <span>✓ {time} – {endTime} ({duration} dk)</span>
            )}
          </div>
        )}
      </div>

      {/* Ödeme */}
      <div className="bg-white rounded-2xl card-shadow p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ödeme</p>

        <div className="space-y-1.5">
          <Label className="text-sm">Ödeme Tipi</Label>
          <Select value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentType)}>
            <SelectTrigger className="rounded-xl border-gray-200 h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.entries(PAYMENT_LABELS) as [PaymentType, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Tutar (₺)</Label>
            <Input type="number" value={price} onChange={e => setPrice(e.target.value)} className="rounded-xl border-gray-200 h-11" required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">İndirim (₺)</Label>
            <Input type="number" value={discount} onChange={e => setDiscount(e.target.value)} className="rounded-xl border-gray-200 h-11" min="0" />
          </div>
        </div>

        <div className="flex items-center justify-between bg-rose-50 rounded-xl px-4 py-3">
          <span className="text-sm font-semibold text-[#C9547A]">Net Tutar</span>
          <span className="text-xl font-bold text-[#C9547A]">₺{netAmount.toLocaleString('tr-TR')}</span>
        </div>
      </div>

      {/* Not */}
      <div className="bg-white rounded-2xl card-shadow p-4 space-y-2">
        <Label className="text-sm">Not (isteğe bağlı)</Label>
        <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Özel istek veya not..." className="rounded-xl border-gray-200 h-11" />
      </div>

      {error && <p className="text-red-500 text-sm px-1">{error}</p>}

      <Button
        type="submit"
        className="w-full h-14 rounded-2xl text-white font-semibold text-base"
        style={{ backgroundColor: conflictError ? '#9CA3AF' : '#C9547A' }}
        disabled={loading || !!conflictError}
      >
        {loading ? 'Kaydediliyor...' : 'Randevu Oluştur'}
      </Button>
    </form>
  )
}
