'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ChevronLeft, Phone, Trash2 } from 'lucide-react'
import type { Appointment, AppointmentStatus, PaymentType } from '@/lib/types'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/types'

const PAYMENT_LABELS: Record<PaymentType, string> = {
  nakit: '💵 Nakit',
  kart: '💳 Kart',
  iban: '🏦 IBAN',
}

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [apt, setApt] = useState<Appointment | null>(null)
  const [status, setStatus] = useState<AppointmentStatus>('pending')
  const [note, setNote] = useState('')
  const [paymentType, setPaymentType] = useState<PaymentType>('nakit')
  const [discount, setDiscount] = useState('0')
  const [netAmount, setNetAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
      setIsAdmin(profile?.role === 'admin')

      const { data } = await supabase
        .from('appointments')
        .select('*, customer:customers(*), staff:users(*), service:services(*)')
        .eq('id', id)
        .single()
      if (data) {
        setApt(data)
        setStatus(data.status)
        setNote(data.note ?? '')
        setPaymentType(data.payment_type ?? 'nakit')
        setDiscount(String(data.discount ?? 0))
        setNetAmount(String(data.net_amount ?? data.price ?? 0))
      }
    }
    load()
  }, [id])

  useEffect(() => {
    if (!apt) return
    const net = (apt.price || 0) - parseFloat(discount || '0')
    setNetAmount(String(Math.max(0, net)))
  }, [discount, apt])

  async function handleSave() {
    setLoading(true)
    const prevStatus = apt?.status

    await supabase.from('appointments').update({
      status,
      note: note || null,
      payment_type: paymentType,
      discount: parseFloat(discount || '0'),
      net_amount: parseFloat(netAmount || '0'),
    }).eq('id', id)

    // Gelmedi durumuna geçildiğinde WA mesajı gönder
    if (status === 'no_show' && prevStatus !== 'no_show') {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'no_show', appointmentId: id }),
      })
    }

    setLoading(false)
    router.push('/dashboard')
    router.refresh()
  }

  async function handleSoftDelete() {
    if (!confirm('Bu randevuyu arşive taşımak istediğinize emin misiniz?')) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('appointments').update({
      deleted_at: new Date().toISOString(),
      deleted_by: user?.id,
    }).eq('id', id)
    router.push('/dashboard')
    router.refresh()
  }

  if (!apt) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-gray-400 text-sm">Yükleniyor...</div>
    </div>
  )

  const miniLink = apt.token ? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/randevum/${apt.token}` : null

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <h2 className="font-bold text-lg text-gray-900">Randevu Detayı</h2>
      </div>

      <div className="p-4 space-y-4">
        {/* Müşteri kartı */}
        <div className="bg-white rounded-2xl card-shadow p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-bold text-lg text-gray-900">{apt.customer?.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">{apt.customer?.phone}</p>
            </div>
            {apt.customer?.phone && (
              <a
                href={`tel:${apt.customer.phone}`}
                className="p-2.5 rounded-xl text-white flex items-center justify-center"
                style={{ backgroundColor: '#C9547A' }}
              >
                <Phone size={18} />
              </a>
            )}
          </div>
        </div>

        {/* Randevu bilgileri */}
        <div className="bg-white rounded-2xl card-shadow p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Hizmet</span>
            <span className="font-medium text-gray-900">{apt.service?.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Personel</span>
            <span className="font-medium text-gray-900">{apt.staff?.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Tarih & Saat</span>
            <span className="font-medium text-gray-900">
              {new Date(apt.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} — {apt.time?.slice(0, 5)}
              {apt.end_time && <span className="text-gray-400"> – {apt.end_time.slice(0, 5)}</span>}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-gray-50">
            <span className="text-sm text-gray-500">İşlem tutarı</span>
            <span className="font-semibold text-gray-900">₺{apt.price?.toLocaleString('tr-TR')}</span>
          </div>
        </div>

        {/* Durum */}
        <div className="bg-white rounded-2xl card-shadow p-4 space-y-3">
          <Label className="text-sm font-semibold text-gray-700">Randevu Durumu</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as AppointmentStatus)}>
            <SelectTrigger className="rounded-xl border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(STATUS_LABELS) as [AppointmentStatus, string][]).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ödeme */}
        <div className="bg-white rounded-2xl card-shadow p-4 space-y-4">
          <p className="font-semibold text-gray-700 text-sm">Ödeme Bilgileri</p>

          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Ödeme Tipi</Label>
            <Select value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentType)}>
              <SelectTrigger className="rounded-xl border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(PAYMENT_LABELS) as [PaymentType, string][]).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">İndirim (₺)</Label>
            <Input
              type="number"
              value={discount}
              onChange={e => setDiscount(e.target.value)}
              className="rounded-xl border-gray-200"
              min="0"
            />
          </div>

          <div className="flex items-center justify-between bg-rose-50 rounded-xl px-4 py-3">
            <span className="text-sm font-semibold text-[#C9547A]">Net Tutar</span>
            <span className="text-lg font-bold text-[#C9547A]">₺{parseFloat(netAmount || '0').toLocaleString('tr-TR')}</span>
          </div>
        </div>

        {/* Not */}
        <div className="bg-white rounded-2xl card-shadow p-4 space-y-2">
          <Label className="text-sm font-semibold text-gray-700">Not</Label>
          <Input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Randevuya not ekle..."
            className="rounded-xl border-gray-200"
          />
        </div>

        {/* Mini link */}
        {miniLink && (
          <div className="bg-white rounded-2xl card-shadow p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500">MÜŞTERİ LİNKİ</p>
            <p className="text-xs text-gray-400 break-all">{miniLink}</p>
            <button
              onClick={() => navigator.clipboard.writeText(miniLink)}
              className="text-xs text-[#C9547A] font-medium"
            >
              Kopyala
            </button>
          </div>
        )}

        {/* Butonlar */}
        <Button
          onClick={handleSave}
          className="w-full h-12 rounded-2xl text-white font-semibold text-base"
          style={{ backgroundColor: '#C9547A' }}
          disabled={loading}
        >
          {loading ? 'Kaydediliyor...' : 'Güncelle'}
        </Button>

        {isAdmin && (
          <Button
            variant="outline"
            onClick={handleSoftDelete}
            className="w-full h-12 rounded-2xl border-red-200 text-red-500 flex items-center gap-2"
          >
            <Trash2 size={16} />
            Arşive Taşı
          </Button>
        )}
      </div>
    </div>
  )
}
