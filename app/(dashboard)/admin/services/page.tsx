'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronDown, ChevronUp, LayoutDashboard, Archive, MessageSquare, Users } from 'lucide-react'
import type { Service } from '@/lib/types'

export default function ServicesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('60')
  const [showAddForm, setShowAddForm] = useState(false)

  async function loadServices() {
    const { data } = await supabase.from('services').select('*').order('name')
    setServices(data ?? [])
  }

  useEffect(() => { loadServices() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('services').insert({ name, price: parseFloat(price), duration_minutes: parseInt(duration) })
    setName(''); setPrice(''); setDuration('60')
    setShowAddForm(false)
    loadServices()
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu hizmeti silmek istediğinize emin misiniz?')) return
    await supabase.from('services').delete().eq('id', id)
    loadServices()
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <h2 className="font-bold text-2xl text-gray-900 pt-2">Ayarlar</h2>

      {/* Yönetici linkleri */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: LayoutDashboard, label: 'Yönetici Paneli', href: '/admin/dashboard', color: '#C9547A' },
          { icon: Users, label: 'Çalışanlar', href: '/admin/staff', color: '#2D3B6B' },
          { icon: Archive, label: 'Arşiv', href: '/admin/archive', color: '#6B7280' },
          { icon: MessageSquare, label: 'WA Logları', href: '/admin/whatsapp-logs', color: '#10B981' },
        ].map(({ icon: Icon, label, href, color }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            className="bg-white rounded-2xl card-shadow p-4 flex items-center gap-3 text-left active:scale-[0.98] transition-all"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: color + '15' }}>
              <Icon size={18} style={{ color }} />
            </div>
            <span className="text-sm font-medium text-gray-800">{label}</span>
          </button>
        ))}
      </div>

      {/* Hizmetler */}
      <div className="flex items-center justify-between">
        <p className="font-semibold text-gray-800">Hizmet Türleri</p>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-sm font-medium text-[#C9547A] bg-[#FDE8EF] px-3 py-1.5 rounded-xl flex items-center gap-1"
        >
          {showAddForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showAddForm ? 'Kapat' : 'Yeni Hizmet'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl card-shadow p-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-sm">Hizmet Adı</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="rounded-xl border-gray-200 h-11" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-sm">Fiyat (₺)</Label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} className="rounded-xl border-gray-200 h-11" required />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Süre (dk)</Label>
              <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="rounded-xl border-gray-200 h-11" required />
            </div>
          </div>
          <Button type="submit" className="w-full h-11 rounded-2xl text-white" style={{ backgroundColor: '#C9547A' }}>
            Hizmet Ekle
          </Button>
        </form>
      )}

      <div className="space-y-2">
        {services.map(s => (
          <div key={s.id} className="bg-white rounded-2xl card-shadow p-4 flex justify-between items-center">
            <div>
              <p className="font-semibold text-gray-900">{s.name}</p>
              <p className="text-sm font-medium mt-0.5" style={{ color: '#C9547A' }}>₺{s.price}</p>
              <p className="text-xs text-gray-400">{s.duration_minutes} dakika</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(s.id)}
              className="text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
            >
              Sil
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
