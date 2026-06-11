'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Search, Phone, Calendar, ChevronRight, Cake } from 'lucide-react'
import type { Customer } from '@/lib/types'

interface CustomerWithCount extends Customer {
  appointment_count?: number
  last_visit?: string
}

export default function CustomersPage() {
  const supabase = createClient()
  const router = useRouter()
  const [customers, setCustomers] = useState<CustomerWithCount[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('name')
    setCustomers(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadCustomers() }, [loadCustomers])

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  )

  const todayMMDD = new Date().toISOString().slice(5, 10)

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <h1 className="font-bold text-2xl text-gray-900 mb-1">Müşteriler</h1>
        <p className="text-sm text-gray-400">{customers.length} müşteri</p>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="İsim veya telefon ara..."
            className="pl-10 rounded-2xl border-gray-200 h-11 bg-white"
          />
        </div>
      </div>

      {/* Liste */}
      <div className="px-4 space-y-2">
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">Müşteri bulunamadı</p>
          </div>
        ) : (
          filtered.map(customer => {
            const isBirthday = customer.birthday?.slice(5) === todayMMDD
            return (
              <div
                key={customer.id}
                onClick={() => router.push(`/customers/${customer.id}`)}
                className="bg-white rounded-2xl card-shadow p-4 cursor-pointer active:scale-[0.98] transition-all flex items-center gap-3"
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-base shrink-0"
                  style={{ background: 'linear-gradient(135deg, #C9547A22, #2D3B6B22)', color: '#C9547A' }}
                >
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-gray-900 truncate">{customer.name}</p>
                    {isBirthday && <Cake size={14} className="text-pink-400 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Phone size={11} className="text-gray-400" />
                    <p className="text-xs text-gray-400">{customer.phone}</p>
                  </div>
                  {customer.birthday && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Cake size={11} className="text-gray-400" />
                      <p className="text-xs text-gray-400">
                        {new Date(customer.birthday).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                  )}
                </div>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
