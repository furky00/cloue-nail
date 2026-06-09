'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Service } from '@/lib/types'

export default function ServicesPage() {
  const supabase = createClient()
  const [services, setServices] = useState<Service[]>([])
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')

  async function loadServices() {
    const { data } = await supabase.from('services').select('*').order('name')
    setServices(data ?? [])
  }

  useEffect(() => { loadServices() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('services').insert({ name, price: parseFloat(price) })
    setName('')
    setPrice('')
    loadServices()
  }

  async function handleDelete(id: string) {
    await supabase.from('services').delete().eq('id', id)
    loadServices()
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-bold text-lg">Hizmet Türleri</h2>

      <form onSubmit={handleAdd} className="space-y-3 bg-white p-4 rounded-lg border">
        <div className="space-y-1">
          <Label>Hizmet Adı</Label>
          <Input value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>Fiyat (₺)</Label>
          <Input type="number" value={price} onChange={e => setPrice(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" style={{ backgroundColor: '#E8185A' }}>Ekle</Button>
      </form>

      <div className="space-y-2">
        {services.map(s => (
          <div key={s.id} className="flex justify-between items-center bg-white p-3 rounded-lg border">
            <div>
              <p className="font-medium">{s.name}</p>
              <p style={{ color: '#E8185A' }}>₺{s.price}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} className="text-red-500">
              Sil
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
