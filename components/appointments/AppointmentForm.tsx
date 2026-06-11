'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Plus, Trash2, Clock } from 'lucide-react'
import type { User, Service, PaymentType } from '@/lib/types'

interface ServiceItem {
  service: Service
  duration: number
  price: number
}

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
  const [date, setDate] = useState(defaultDate ?? new Date().toISOString().split('T')[0])
  const [time, setTime] = useState('10:00')
  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>([])
  const [addingServiceId, setAddingServiceId] = useState('')
  const [discount, setDiscount] = useState('0')
  const [paymentType, setPaymentType] = useState<PaymentType>('nakit')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [conflictError, setConflictError] = useState('')

  const activeServices = services.filter(s => s.is_active !== false)
  const groupedServices = activeServices.reduce((acc, s) => {
    const cat = s.category ?? 'Diğer'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {} as Record<string, Service[]>)

  const totalDuration = selectedServices.reduce((s, i) => s + i.duration, 0)
  const totalPrice = selectedServices.reduce((s, i) => s + i.price, 0)
  const netAmount = Math.max(0, totalPrice - parseFloat(discount || '0'))
  const endTime = time && totalDuration > 0 ? addMinutes(time, totalDuration) : ''

  const checkConflict = useCallback(async () => {
    const effStaffId = staffId || currentUserId
    if (!effStaffId || !date || !time || totalDuration === 0) return
    try {
      const res = await fetch('/api/appointments/check-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: effStaffId, date, time, duration_minutes: totalDuration }),
      })
      const data = await res.json()
      setConflictError(data.conflict ? data.message : '')
    } catch { /* ignore */ }
  }, [staffId, currentUserId, date, time, totalDuration])

  useEffect(() => { checkConflict() }, [checkConflict])

  function addService() {
    if (!addingServiceId) return
    const service = services.find(s => s.id === addingServiceId)
    if (!service) return
    if (selectedServices.find(i => i.service.id === service.id)) return
    setSelectedServices(prev => [...prev, {
      service,
      duration: service.duration_minutes,
      price: service.campaign_price ?? service.price,
    }])
    setAddingServiceId('')
  }

  function removeService(serviceId: string) {
    setSelectedServices(prev => prev.filter(i => i.service.id !== serviceId))
  }

  function updateDuration(serviceId: string, val: string) {
    setSelectedServices(prev => prev.map(i =>
      i.service.id === serviceId ? { ...i, duration: parseInt(val) || 0 } : i
    ))
  }

  function updatePrice(serviceId: string, val: string) {
    setSelectedServices(prev => prev.map(i =>
      i.service.id === serviceId ? { ...i, price: parseFloat(val) || 0 } : i
    ))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (conflictError || selectedServices.length === 0) return
    setLoading(true)
    setError('')

    // Müşteri bul veya oluştur
    let customerId: string
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', customerPhone)
      .maybeSingle()

    if (existing) {
      customerId = existing.id
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

    const primaryService = selectedServices[0]
    const endTimeStr = endTime ? `${endTime}:00` : null

    const { data: newApt, error: aptError } = await supabase
      .from('appointments')
      .insert({
        customer_id: customerId,
        staff_id: staffId || currentUserId,
        service_id: primaryService.service.id,
        date,
        time,
        end_time: endTimeStr,
        duration_minutes: totalDuration,
        price: totalPrice,
        discount: parseFloat(discount || '0'),
        net_amount: netAmount,
        payment_type: paymentType,
        note: note || null,
        status: 'pending',
      })
      .select('id, token')
      .single()

    if (aptError || !newApt) {
      setError('Randevu oluşturulamadı: ' + aptError?.message)
      setLoading(false)
      return
    }

    // Çoklu hizmet kaydı
    if (selectedServices.length > 0) {
      await supabase.from('appointment_services').insert(
        selectedServices.map(i => ({
          appointment_id: newApt.id,
          service_id: i.service.id,
          service_name: i.service.name,
          duration_minutes: i.duration,
          price: i.price,
        }))
      )
    }

    // Müşteriye onay WA
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
        serviceName: selectedServices.map(i => i.service.name).join(' + '),
        token: newApt.token,
      }),
    })

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4 max-w-lg mx-auto">
      {/* Müşteri */}
      <div className="bg-white rounded-2xl card-shadow p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Müşteri</p>
        <div className="space-y-1.5">
          <Label className="text-sm">Ad Soyad</Label>
          <Input value={customerName} onChange={e => setCustomerName(e.target.value)}
            className="rounded-xl border-gray-200 h-11" placeholder="Örn: Elif Yılmaz" required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Telefon (WhatsApp)</Label>
          <Input type="tel" placeholder="+905xxxxxxxxx" value={customerPhone}
            onChange={e => setCustomerPhone(e.target.value)} className="rounded-xl border-gray-200 h-11" required />
        </div>
      </div>

      {/* Personel + Zaman */}
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
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Tarih</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="rounded-xl border-gray-200 h-11" required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Başlangıç</Label>
            <Input type="time" value={time} onChange={e => setTime(e.target.value)}
              className="rounded-xl border-gray-200 h-11" required />
          </div>
        </div>

        {/* Süre + bitiş özeti */}
        {totalDuration > 0 && (
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm ${conflictError ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
            <Clock size={14} />
            {conflictError ? conflictError : (
              <span>{time} – {endTime} <span className="opacity-70">({totalDuration} dk)</span></span>
            )}
          </div>
        )}
      </div>

      {/* Hizmetler */}
      <div className="bg-white rounded-2xl card-shadow p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Hizmetler</p>

        {/* Seçili hizmetler listesi */}
        {selectedServices.length > 0 && (
          <div className="space-y-2">
            {selectedServices.map(item => (
              <div key={item.service.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900 text-sm">{item.service.name}</p>
                  <button type="button" onClick={() => removeService(item.service.id)}
                    className="text-red-400 hover:text-red-500 p-0.5">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Süre (dk)</Label>
                    <Input
                      type="number"
                      value={item.duration}
                      onChange={e => updateDuration(item.service.id, e.target.value)}
                      className="rounded-lg border-gray-200 h-9 text-sm"
                      min="1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Fiyat (₺)</Label>
                    <Input
                      type="number"
                      value={item.price}
                      onChange={e => updatePrice(item.service.id, e.target.value)}
                      className="rounded-lg border-gray-200 h-9 text-sm"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Toplam */}
            <div className="flex items-center justify-between bg-rose-50 rounded-xl px-3 py-2.5">
              <div>
                <p className="text-xs text-[#C9547A] font-medium">Toplam</p>
                <p className="text-xs text-gray-400">{totalDuration} dakika</p>
              </div>
              <p className="text-lg font-bold text-[#C9547A]">₺{totalPrice.toLocaleString('tr-TR')}</p>
            </div>
          </div>
        )}

        {/* Hizmet ekle */}
        <div className="flex gap-2">
          <Select value={addingServiceId} onValueChange={(v) => v && setAddingServiceId(v)}>
            <SelectTrigger className="rounded-xl border-gray-200 h-11 flex-1">
              <SelectValue placeholder="Hizmet seç..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(groupedServices).map(([category, svcs]) => (
                <div key={category}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">{category}</div>
                  {svcs
                    .filter(s => !selectedServices.find(i => i.service.id === s.id))
                    .map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} · {s.duration_minutes}dk
                        {s.campaign_price != null && ` · ₺${s.campaign_price}`}
                      </SelectItem>
                    ))}
                </div>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" onClick={addService} disabled={!addingServiceId}
            className="h-11 px-4 rounded-xl text-white shrink-0"
            style={{ backgroundColor: '#C9547A' }}>
            <Plus size={18} />
          </Button>
        </div>

        {selectedServices.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-1">En az bir hizmet ekleyin</p>
        )}
      </div>

      {/* Ödeme */}
      <div className="bg-white rounded-2xl card-shadow p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ödeme</p>
        <div className="space-y-1.5">
          <Label className="text-sm">Ödeme Tipi</Label>
          <Select value={paymentType} onValueChange={(v) => v && setPaymentType(v as PaymentType)}>
            <SelectTrigger className="rounded-xl border-gray-200 h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.entries(PAYMENT_LABELS) as [PaymentType, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">İndirim (₺)</Label>
          <Input type="number" value={discount} onChange={e => setDiscount(e.target.value)}
            className="rounded-xl border-gray-200 h-11" min="0" />
        </div>
        <div className="flex items-center justify-between bg-rose-50 rounded-xl px-4 py-3">
          <span className="text-sm font-semibold text-[#C9547A]">Net Tutar</span>
          <span className="text-xl font-bold text-[#C9547A]">₺{netAmount.toLocaleString('tr-TR')}</span>
        </div>
      </div>

      {/* Not */}
      <div className="bg-white rounded-2xl card-shadow p-4 space-y-2">
        <Label className="text-sm">Not (isteğe bağlı)</Label>
        <Input value={note} onChange={e => setNote(e.target.value)}
          placeholder="Özel istek veya not..." className="rounded-xl border-gray-200 h-11" />
      </div>

      {error && <p className="text-red-500 text-sm px-1">{error}</p>}

      <Button
        type="submit"
        className="w-full h-14 rounded-2xl text-white font-semibold text-base"
        style={{ backgroundColor: (conflictError || selectedServices.length === 0) ? '#9CA3AF' : '#C9547A' }}
        disabled={loading || !!conflictError || selectedServices.length === 0}
      >
        {loading ? 'Kaydediliyor...' : 'Randevu Oluştur'}
      </Button>
    </form>
  )
}
