'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { User } from '@/lib/types'

export default function StaffPage() {
  const supabase = createClient()
  const [staff, setStaff] = useState<User[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadStaff() {
    const { data } = await supabase.from('users').select('*').eq('role', 'staff').order('name')
    setStaff(data ?? [])
  }

  useEffect(() => { loadStaff() }, [])

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
            <p className="font-medium">{s.name}</p>
            <p className="text-sm text-gray-500">{s.email}</p>
            <p className="text-sm text-gray-400">{s.phone}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
