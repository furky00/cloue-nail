'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronDown, ChevronUp } from 'lucide-react'
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
  const [commissionRate, setCommissionRate] = useState(50)
  const [showAddForm, setShowAddForm] = useState(false)

  async function loadStaff() {
    const { data } = await supabase.from('users').select('*').eq('role', 'staff').order('name')
    setStaff(data ?? [])
  }

  useEffect(() => { loadStaff() }, [])

  async function loadDurations(staffMember: User) {
    setSelectedStaff(staffMember)
    setCommissionRate(staffMember.commission_rate ?? 50)
    const [{ data: svcs }, { data: existing }] = await Promise.all([
      supabase.from('services').select('*').order('name'),
      supabase.from('staff_service_durations').select('*').eq('staff_id', staffMember.id)
    ])
    setServices(svcs ?? [])
    const map: Record<string, number> = {}
    svcs?.forEach(s => {
      const found = existing?.find((e: any) => e.service_id === s.id)
      map[s.id] = found?.duration_minutes ?? s.duration_minutes
    })
    setDurations(map)
  }

  async function saveStaffSettings(staffId: string) {
    // Hizmet süreleri
    for (const [serviceId, mins] of Object.entries(durations)) {
      await supabase.from('staff_service_durations').upsert({
        staff_id: staffId,
        service_id: serviceId,
        duration_minutes: mins
      }, { onConflict: 'staff_id,service_id' })
    }
    // Komisyon oranı
    await supabase.from('users').update({ commission_rate: commissionRate }).eq('id', staffId)
    setSelectedStaff(null)
    loadStaff()
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
      setShowAddForm(false)
      loadStaff()
    }
    setLoading(false)
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h2 className="font-bold text-2xl text-gray-900">Çalışanlar</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-sm font-medium text-[#C9547A] bg-[#FDE8EF] px-3 py-1.5 rounded-xl flex items-center gap-1"
        >
          {showAddForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showAddForm ? 'Kapat' : 'Ekle'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl card-shadow p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Yeni Çalışan</p>
          <div className="space-y-1">
            <Label className="text-sm">Ad Soyad</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="rounded-xl border-gray-200 h-11" required />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="rounded-xl border-gray-200 h-11" required />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">WhatsApp Numarası</Label>
            <Input placeholder="+905xxxxxxxxx" value={phone} onChange={e => setPhone(e.target.value)} className="rounded-xl border-gray-200 h-11" required />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Şifre</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="rounded-xl border-gray-200 h-11" required />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full h-11 rounded-2xl text-white" style={{ backgroundColor: '#C9547A' }} disabled={loading}>
            {loading ? 'Ekleniyor...' : 'Çalışan Ekle'}
          </Button>
        </form>
      )}

      <div className="space-y-2">
        {staff.map(s => (
          <div key={s.id} className="bg-white rounded-2xl card-shadow p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-gray-900">{s.name}</p>
                <p className="text-sm text-gray-400">{s.email}</p>
                <p className="text-xs text-gray-400">{s.phone} · Hak ediş: %{s.commission_rate ?? 50}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-gray-200"
                onClick={() => selectedStaff?.id === s.id ? setSelectedStaff(null) : loadDurations(s)}
              >
                {selectedStaff?.id === s.id ? 'Kapat' : 'Ayarla'}
              </Button>
            </div>

            {selectedStaff?.id === s.id && (
              <div className="mt-4 pt-4 border-t border-gray-50 space-y-4">
                {/* Hak ediş oranı */}
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-sm">Hak Ediş Oranı (%)</Label>
                  <Input
                    type="number"
                    className="w-24 text-center rounded-xl border-gray-200 h-10"
                    value={commissionRate}
                    onChange={e => setCommissionRate(parseInt(e.target.value) || 0)}
                    min="0" max="100"
                  />
                </div>

                {/* Hizmet süreleri */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Hizmet Süreleri</p>
                  {services.map(svc => (
                    <div key={svc.id} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-700 flex-1">{svc.name}</span>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          className="w-20 text-center rounded-xl border-gray-200 h-9 text-sm"
                          value={durations[svc.id] ?? svc.duration_minutes}
                          onChange={e => setDurations(prev => ({ ...prev, [svc.id]: parseInt(e.target.value) || 0 }))}
                        />
                        <span className="text-xs text-gray-400">dk</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    className="flex-1 h-11 rounded-2xl text-white"
                    style={{ backgroundColor: '#C9547A' }}
                    onClick={() => saveStaffSettings(s.id)}
                  >
                    Kaydet
                  </Button>
                  <Button variant="outline" className="flex-1 h-11 rounded-2xl" onClick={() => setSelectedStaff(null)}>
                    İptal
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
