'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronDown, ChevronUp, LayoutDashboard, Archive, MessageSquare, Users, ToggleLeft, ToggleRight, Pencil, Check, X } from 'lucide-react'
import type { Service } from '@/lib/types'

const CATEGORIES = ['Tırnak İşlemleri', 'Kaş / Kirpik', 'Diğer']

interface EditState {
  id: string
  name: string
  price: string
  campaign_price: string
  duration: string
  category: string
}

export default function ServicesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editState, setEditState] = useState<EditState | null>(null)

  // Add form state
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [campaignPrice, setCampaignPrice] = useState('')
  const [duration, setDuration] = useState('60')
  const [category, setCategory] = useState('Tırnak İşlemleri')

  async function loadServices() {
    const { data } = await supabase
      .from('services')
      .select('*')
      .order('category')
      .order('name')
    setServices(data ?? [])
  }

  useEffect(() => { loadServices() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('services').insert({
      name,
      price: parseFloat(price) || 0,
      campaign_price: campaignPrice ? parseFloat(campaignPrice) : null,
      duration_minutes: parseInt(duration),
      category,
      is_active: true,
    })
    setName(''); setPrice(''); setCampaignPrice(''); setDuration('60'); setCategory('Tırnak İşlemleri')
    setShowAddForm(false)
    loadServices()
  }

  async function handleToggleActive(service: Service) {
    await supabase.from('services').update({ is_active: !service.is_active }).eq('id', service.id)
    setServices(prev => prev.map(s => s.id === service.id ? { ...s, is_active: !s.is_active } : s))
  }

  function startEdit(service: Service) {
    setEditState({
      id: service.id,
      name: service.name,
      price: String(service.price),
      campaign_price: service.campaign_price != null ? String(service.campaign_price) : '',
      duration: String(service.duration_minutes),
      category: service.category ?? 'Tırnak İşlemleri',
    })
  }

  async function saveEdit() {
    if (!editState) return
    await supabase.from('services').update({
      name: editState.name,
      price: parseFloat(editState.price) || 0,
      campaign_price: editState.campaign_price ? parseFloat(editState.campaign_price) : null,
      duration_minutes: parseInt(editState.duration),
      category: editState.category,
    }).eq('id', editState.id)
    setEditState(null)
    loadServices()
  }

  // Group services by category
  const grouped = services.reduce((acc, s) => {
    const cat = s.category ?? 'Diğer'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {} as Record<string, Service[]>)

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

      {/* Hizmetler başlık + ekle butonu */}
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

      {/* Yeni hizmet formu */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl card-shadow p-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-sm">Hizmet Adı</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="rounded-xl border-gray-200 h-11" required />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Kategori</Label>
            <Select value={category} onValueChange={(v) => v && setCategory(v)}>
              <SelectTrigger className="rounded-xl border-gray-200 h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Fiyat (₺)</Label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} className="rounded-xl border-gray-200 h-10" min="0" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Kampanya (₺)</Label>
              <Input type="number" value={campaignPrice} onChange={e => setCampaignPrice(e.target.value)} className="rounded-xl border-gray-200 h-10" min="0" placeholder="—" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Süre (dk)</Label>
              <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="rounded-xl border-gray-200 h-10" required min="1" />
            </div>
          </div>
          <Button type="submit" className="w-full h-11 rounded-2xl text-white" style={{ backgroundColor: '#C9547A' }}>
            Hizmet Ekle
          </Button>
        </form>
      )}

      {/* Hizmet listesi - kategorilere göre gruplu */}
      {Object.entries(grouped).map(([cat, svcs]) => (
        <div key={cat} className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">{cat}</p>
          {svcs.map(s => (
            <div key={s.id} className={`bg-white rounded-2xl card-shadow p-4 transition-all ${s.is_active === false ? 'opacity-50' : ''}`}>
              {editState?.id === s.id ? (
                /* Düzenleme modu */
                <div className="space-y-2">
                  <Input value={editState.name} onChange={e => setEditState({ ...editState, name: e.target.value })}
                    className="rounded-xl border-gray-200 h-9 text-sm font-semibold" />
                  <Select value={editState.category} onValueChange={(v) => v && setEditState({ ...editState, category: v })}>
                    <SelectTrigger className="rounded-xl border-gray-200 h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-0.5">
                      <p className="text-xs text-gray-400">Fiyat (₺)</p>
                      <Input type="number" value={editState.price} onChange={e => setEditState({ ...editState, price: e.target.value })}
                        className="rounded-lg border-gray-200 h-9 text-sm" min="0" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-gray-400">Kampanya (₺)</p>
                      <Input type="number" value={editState.campaign_price} onChange={e => setEditState({ ...editState, campaign_price: e.target.value })}
                        className="rounded-lg border-gray-200 h-9 text-sm" min="0" placeholder="—" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-gray-400">Süre (dk)</p>
                      <Input type="number" value={editState.duration} onChange={e => setEditState({ ...editState, duration: e.target.value })}
                        className="rounded-lg border-gray-200 h-9 text-sm" min="1" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button onClick={saveEdit} size="sm" className="rounded-xl text-white h-9 flex-1" style={{ backgroundColor: '#C9547A' }}>
                      <Check size={14} className="mr-1" /> Kaydet
                    </Button>
                    <Button onClick={() => setEditState(null)} variant="ghost" size="sm" className="rounded-xl h-9">
                      <X size={14} />
                    </Button>
                  </div>
                </div>
              ) : (
                /* Normal görünüm */
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {s.campaign_price != null ? (
                        <>
                          <p className="text-xs text-gray-400 line-through">₺{s.price}</p>
                          <p className="text-sm font-bold" style={{ color: '#C9547A' }}>₺{s.campaign_price}</p>
                          <span className="text-xs bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-medium">Kampanya</span>
                        </>
                      ) : (
                        <p className="text-sm font-medium" style={{ color: '#C9547A' }}>₺{s.price}</p>
                      )}
                      <span className="text-xs text-gray-400">· {s.duration_minutes}dk</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => startEdit(s)} className="text-gray-400 hover:text-gray-600 p-1">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleToggleActive(s)} className="p-1">
                      {s.is_active !== false
                        ? <ToggleRight size={22} style={{ color: '#C9547A' }} />
                        : <ToggleLeft size={22} className="text-gray-300" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
