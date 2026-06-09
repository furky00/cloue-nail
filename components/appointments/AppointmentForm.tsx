'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { User, Service } from '@/lib/types'

interface AppointmentFormProps {
  currentUserId: string
  isAdmin: boolean
  staffList: User[]
  services: Service[]
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

  const handleStaffChange = (value: string | null) => {
    if (value) setStaffId(value)
  }

  const handleServiceChange = (value: string | null) => {
    if (value) setServiceId(value)
  }

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
          <Select value={staffId} onValueChange={handleStaffChange} required>
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
        <Select value={serviceId} onValueChange={handleServiceChange} required>
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
      <Button
        type="submit"
        className="w-full"
        style={{ backgroundColor: '#E8185A' }}
        disabled={loading}
      >
        {loading ? 'Kaydediliyor...' : 'Randevu Oluştur'}
      </Button>
    </form>
  )
}
