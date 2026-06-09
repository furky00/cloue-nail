'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { Appointment, AppointmentStatus } from '@/lib/types'

const statusLabels: Record<AppointmentStatus, string> = {
  pending: 'Bekliyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
}

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [apt, setApt] = useState<Appointment | null>(null)
  const [status, setStatus] = useState<AppointmentStatus>('pending')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase
      .from('appointments')
      .select('*, customer:customers(*), staff:users(*), service:services(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          setApt(data)
          setStatus(data.status)
          setNote(data.note ?? '')
        }
      })
  }, [id])

  async function handleSave() {
    setLoading(true)
    await supabase.from('appointments').update({ status, note }).eq('id', id)
    setLoading(false)
    router.push('/dashboard')
    router.refresh()
  }

  if (!apt) return <div className="p-4 text-gray-500">Yükleniyor...</div>

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-lg border p-4 space-y-2">
        <h2 className="font-bold text-lg">{apt.customer?.name}</h2>
        <p className="text-gray-500">{apt.customer?.phone}</p>
        <p>{apt.service?.name}</p>
        <p className="font-semibold" style={{ color: '#E8185A' }}>₺{apt.price}</p>
        <p className="text-gray-500">{apt.date} {apt.time?.slice(0, 5)}</p>
        <p className="text-gray-400 text-sm">Çalışan: {apt.staff?.name}</p>
      </div>

      <div className="space-y-2">
        <Label>Durum</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as AppointmentStatus)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(statusLabels) as AppointmentStatus[]).map(s => (
              <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Not</Label>
        <Input value={note} onChange={e => setNote(e.target.value)} />
      </div>

      <Button
        onClick={handleSave}
        className="w-full"
        style={{ backgroundColor: '#E8185A' }}
        disabled={loading}
      >
        {loading ? 'Kaydediliyor...' : 'Güncelle'}
      </Button>
      <Button variant="outline" className="w-full" onClick={() => router.back()}>
        Geri
      </Button>
    </div>
  )
}
