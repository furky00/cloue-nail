'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ReportData {
  totalCount: number
  totalRevenue: number
  totalDiscount: number
  totalNetRevenue: number
  cancelledCount: number
  noShowCount: number
  cancelRate: number
  paymentBreakdown: { nakit: number; kart: number; iban: number }
  staffSummary: Array<{ name: string; count: number; total: number; netTotal: number; commission: number; commissionRate: number }>
  serviceSummary: Array<{ name: string; count: number; total: number }>
}

export default function ReportsPage() {
  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = today.slice(0, 8) + '01'

  const [start, setStart] = useState(firstOfMonth)
  const [end, setEnd] = useState(today)
  const [paymentType, setPaymentType] = useState('all')
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)

  async function fetchReport() {
    setLoading(true)
    const params = new URLSearchParams({ start, end })
    if (paymentType !== 'all') params.set('payment', paymentType)
    const res = await fetch(`/api/reports?${params}`)
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  useEffect(() => { fetchReport() }, [])

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <h2 className="font-bold text-2xl text-gray-900 pt-2">Raporlar</h2>

      {/* Filtreler */}
      <div className="bg-white rounded-2xl card-shadow p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Başlangıç</Label>
            <Input type="date" value={start} onChange={e => setStart(e.target.value)} className="rounded-xl border-gray-200 h-11" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Bitiş</Label>
            <Input type="date" value={end} onChange={e => setEnd(e.target.value)} className="rounded-xl border-gray-200 h-11" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Ödeme Tipi</Label>
          <Select value={paymentType} onValueChange={(v) => v && setPaymentType(v)}>
            <SelectTrigger className="rounded-xl border-gray-200 h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="nakit">Nakit</SelectItem>
              <SelectItem value="kart">Kart</SelectItem>
              <SelectItem value="iban">IBAN</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={fetchReport}
          className="w-full h-11 rounded-2xl text-white font-semibold"
          style={{ backgroundColor: '#C9547A' }}
          disabled={loading}
        >
          {loading ? 'Yükleniyor...' : 'Filtrele'}
        </Button>
      </div>

      {data && (
        <>
          {/* Özet kartlar */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl card-shadow p-4">
              <p className="text-xs text-gray-400">Toplam İşlem</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{data.totalCount}</p>
            </div>
            <div className="bg-white rounded-2xl card-shadow p-4">
              <p className="text-xs text-gray-400">Net Ciro</p>
              <p className="text-2xl font-bold mt-1" style={{ color: '#C9547A' }}>₺{data.totalNetRevenue.toLocaleString('tr-TR')}</p>
            </div>
            <div className="bg-white rounded-2xl card-shadow p-4">
              <p className="text-xs text-gray-400">Toplam İndirim</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">₺{data.totalDiscount.toLocaleString('tr-TR')}</p>
            </div>
            <div className="bg-white rounded-2xl card-shadow p-4">
              <p className="text-xs text-gray-400">İptal + Gelmedi</p>
              <p className="text-2xl font-bold text-orange-500 mt-1">{data.cancelledCount + data.noShowCount}</p>
              <p className="text-xs text-gray-400">%{data.cancelRate} oran</p>
            </div>
          </div>

          {/* Ödeme dağılımı */}
          <div className="bg-white rounded-2xl card-shadow p-4">
            <p className="font-semibold text-gray-800 mb-3 text-sm">Ödeme Dağılımı</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '💵 Nakit', value: data.paymentBreakdown.nakit },
                { label: '💳 Kart', value: data.paymentBreakdown.kart },
                { label: '🏦 IBAN', value: data.paymentBreakdown.iban },
              ].map(({ label, value }) => (
                <div key={label} className="text-center bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className="font-bold text-sm text-gray-900">₺{value.toLocaleString('tr-TR')}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Personel bazlı */}
          <div className="bg-white rounded-2xl card-shadow p-4">
            <p className="font-semibold text-gray-800 mb-3 text-sm">Personel Bazlı</p>
            <div className="space-y-4">
              {data.staffSummary.map(s => (
                <div key={s.name} className="border-b border-gray-50 last:border-0 pb-4 last:pb-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.count} işlem · Brüt ₺{s.total.toLocaleString('tr-TR')}</p>
                    </div>
                    <p className="font-bold text-base" style={{ color: '#C9547A' }}>
                      ₺{s.netTotal.toLocaleString('tr-TR')}
                    </p>
                  </div>
                  <div className="flex justify-between items-center mt-2 bg-amber-50 rounded-xl px-3 py-2">
                    <p className="text-xs text-amber-700 font-medium">Hak Ediş (%{s.commissionRate})</p>
                    <p className="text-sm font-bold text-amber-700">₺{s.commission.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hizmet bazlı */}
          <div className="bg-white rounded-2xl card-shadow p-4">
            <p className="font-semibold text-gray-800 mb-3 text-sm">Hizmet Bazlı</p>
            <div className="space-y-2">
              {data.serviceSummary.map(s => (
                <div key={s.name} className="flex justify-between items-center py-1">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.count} kez</p>
                  </div>
                  <p className="font-semibold text-sm" style={{ color: '#C9547A' }}>₺{s.total.toLocaleString('tr-TR')}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
