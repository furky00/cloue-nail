'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface ReportData {
  totalCount: number
  totalRevenue: number
  staffSummary: Array<{ name: string; count: number; total: number }>
  serviceSummary: Array<{ name: string; count: number; total: number }>
}

export default function ReportsPage() {
  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = today.slice(0, 8) + '01'

  const [start, setStart] = useState(firstOfMonth)
  const [end, setEnd] = useState(today)
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)

  async function fetchReport() {
    setLoading(true)
    const res = await fetch(`/api/reports?start=${start}&end=${end}`)
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  useEffect(() => { fetchReport() }, [])

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-bold text-lg">Raporlar</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Başlangıç</Label>
          <Input type="date" value={start} onChange={e => setStart(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Bitiş</Label>
          <Input type="date" value={end} onChange={e => setEnd(e.target.value)} />
        </div>
      </div>
      <Button
        onClick={fetchReport}
        className="w-full"
        style={{ backgroundColor: '#E8185A' }}
      >
        {loading ? 'Yükleniyor...' : 'Filtrele'}
      </Button>

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-sm text-gray-500">Toplam İşlem</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-2xl font-bold">{data.totalCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-sm text-gray-500">Toplam Ciro</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-2xl font-bold" style={{ color: '#E8185A' }}>₺{data.totalRevenue.toLocaleString('tr-TR')}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Çalışan Bazlı</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.staffSummary.map(s => (
                <div key={s.name} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-gray-500">{s.count} işlem</p>
                  </div>
                  <p className="font-semibold" style={{ color: '#E8185A' }}>₺{s.total.toLocaleString('tr-TR')}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Hizmet Bazlı</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.serviceSummary.map(s => (
                <div key={s.name} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-gray-500">{s.count} kez</p>
                  </div>
                  <p className="font-semibold" style={{ color: '#E8185A' }}>₺{s.total.toLocaleString('tr-TR')}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
