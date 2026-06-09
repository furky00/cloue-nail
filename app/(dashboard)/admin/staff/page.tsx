'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { User, Service } from '@/lib/types'

export default function StaffPage() {
  const supabase = createClient()
  const [staff, setStaff] = useState<User[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [durations, setDurations] = useState<Record<string, number>>({})

  async function loadStaff() {
    const { data } = await supabase.from('users').select('*').eq('role', 'staff').order('name')
    setStaff(data ?? [])
  }

  useEffect(() => { loadStaff() }, [])

  async function loadDurations(staffId: string) {
    const [{ data: svcs }, { data: existing }] = await Promise.all([
      supabase.from('services').select('*').order('name'),
      supabase.from('staff_service_durations').select('*').eq('staff_id', staffId)
    ])
    setServices(svcs ?? [])
    const map: Record<string, number> = {}
    svcs?.forEach(s => {
      const found = existing?.find((e: any) => e.service_id === s.id)
      map[s.id] = found?.duration_minutes ?? s.duration_minutes
    })
    setDurations(map)
  }

  async function saveDurations(staffId: string) {
    for (const [serviceId, mins] of Object.entries(durations)) {
      await supabase.from('staff_service_durations').upsert({
        staff_id: staffId,
        service_id: serviceId,
        duration_minutes: mins
      }, { onConflict: 'staff_id,service_id' })
    }
    setSelectedStaff(null)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password }),
    })

    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Hata oluştu')
    } else {
      setName(''); setEmail(''); setPhone(''); setPassword('')
      loadStaff()
    }
    setLoading(false)
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-bold text-lg">Çalışanlar</h2>

      <form onSubmit={handleAdd} className="space-y-3 bg-white p-4 rounded-lg border">
        <div className="space-y-1">
          <Label>Ad Soyad</Label>
          <Input value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>Telefon (WhatsApp)</Label>
          <Input placeholder="+905xxxxxxxxx" value={phone} onChange={e => setPhone(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>Şifre</Label>
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit" className="w-full" style={{ backgroundColor: '#E8185A' }} disabled={loading}>
          {loading ? 'Ekleniyor...' : 'Çalışan Ekle'}
        </Button>
      </form>

      <div className="space-y-2">
        {staff.map(s => (
          <div key={s.id} className="bg-white p-3 rounded-lg border">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-sm text-gray-500">{s.email}</p>
                <p className="text-sm text-gray-400">{s.phone}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setSelectedStaff(s); loadDurations(s.id) }}>
                Süre Ayarla
              </Button>
            </div>
          </div>
        ))}
      </div>

      {selectedStaff && (
        <div className="bg-white rounded-lg border p-4 space-y-3">
          <h3 className="font-semibold">{selectedStaff.name} — Hizmet Süreleri</h3>
          {services.map(s => (
            <div key={s.id} className="flex items-center justify-between gap-3">
              <span className="text-sm flex-1">{s.name}</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  className="w-20 text-center"
                  value={durations[s.id] ?? s.duration_minutes}
                  onChange={e => setDurations(prev => ({ ...prev, [s.id]: parseInt(e.target.value) }))}
                />
                <span className="text-xs text-gray-400">dk</span>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button className="flex-1" style={{ backgroundColor: '#E8185A' }} onClick={() => saveDurations(selectedStaff.id)}>
              Kaydet
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setSelectedStaff(null)}>
              İptal
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
