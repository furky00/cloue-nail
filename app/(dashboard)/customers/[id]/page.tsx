'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronLeft, Phone } from 'lucide-react'
import type { Customer, Appointment } from '@/lib/types'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/types'

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [birthday, setBirthday] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: apts }] = await Promise.all([
        supabase.from('customers').select('*').eq('id', id).single(),
        supabase
          .from('appointments')
          .select('*, service:services(name), staff:users(name)')
          .eq('customer_id', id)
          .is('deleted_at', null)
          .order('date', { ascending: false })
          .limit(10),
      ])
      if (c) {
        setCustomer(c)
        setBirthday(c.birthday ?? '')
        setNotes(c.notes ?? '')
      }
      setAppointments(apts ?? [])
    }
    load()
  }, [id])

  async function handleSave() {
    setSaving(true)
    await supabase.from('customers').update({
      birthday: birthday || null,
      notes: notes || null,
    }).eq('id', id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!customer) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-gray-400 text-sm">Yükleniyor...</div>
    </div>
  )

  const totalSpent = appointments
    .filter(a => a.status === 'completed')
    .reduce((sum, a) => sum + Number(a.net_amount ?? a.price ?? 0), 0)

  return (
    <div className="max-w-lg mx-auto">
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <h2 className="font-bold text-lg text-gray-900">Müşteri Detayı</h2>
      </div>

      <div className="p-4 space-y-4">
        {/* Profil */}
        <div className="bg-white rounded-2xl card-shadow p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold"
              style={{ background: '#FDE8EF', color: '#C9547A' }}>
              {customer.name.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="font-bold text-xl text-gray-900">{customer.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Phone size={13} className="text-gray-400" />
                <a href={`tel:${customer.phone}`} className="text-sm text-gray-500">{customer.phone}</a>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-50">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{appointments.filter(a => a.status === 'completed').length}</p>
              <p className="text-xs text-gray-400">Ziyaret</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: '#C9547A' }}>₺{totalSpent.toLocaleString('tr-TR')}</p>
              <p className="text-xs text-gray-400">Toplam harcama</p>
            </div>
          </div>
        </div>

        {/* Doğum günü & notlar */}
        <div className="bg-white rounded-2xl card-shadow p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Kişisel Bilgiler</p>
          <div className="space-y-1.5">
            <Label className="text-sm">Doğum Günü</Label>
            <Input
              type="date"
              value={birthday}
              onChange={e => setBirthday(e.target.value)}
              className="rounded-xl border-gray-200 h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Notlar</Label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Allerji, tercih, özel not..."
              className="rounded-xl border-gray-200 h-11"
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-11 rounded-2xl text-white"
            style={{ backgroundColor: saved ? '#10b981' : '#C9547A' }}
          >
            {saved ? '✓ Kaydedildi' : saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>

        {/* Randevu geçmişi */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">Randevu Geçmişi</p>
          {appointments.length === 0 ? (
            <div className="bg-white rounded-2xl card-shadow p-6 text-center text-gray-400 text-sm">
              Henüz randevu yok
            </div>
          ) : (
            appointments.map(apt => (
              <div
                key={apt.id}
                onClick={() => router.push(`/appointments/${apt.id}`)}
                className="bg-white rounded-2xl card-shadow p-4 cursor-pointer active:scale-[0.98] transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{apt.service?.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(apt.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} · {apt.time?.slice(0, 5)}
                    </p>
                    {apt.staff && <p className="text-xs text-gray-400">{apt.staff.name}</p>}
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_COLORS[apt.status]}`}>
                      {STATUS_LABELS[apt.status]}
                    </span>
                    <p className="text-sm font-semibold mt-1" style={{ color: '#C9547A' }}>
                      ₺{(apt.net_amount ?? apt.price ?? 0).toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
