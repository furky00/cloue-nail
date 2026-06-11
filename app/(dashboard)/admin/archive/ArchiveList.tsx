'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/types'
import type { Appointment } from '@/lib/types'

export function ArchiveList({ appointments }: { appointments: Appointment[] }) {
  const supabase = createClient()
  const router = useRouter()
  const [restoring, setRestoring] = useState<string | null>(null)

  async function restore(id: string) {
    setRestoring(id)
    await supabase.from('appointments').update({ deleted_at: null, deleted_by: null }).eq('id', id)
    setRestoring(null)
    router.refresh()
  }

  if (appointments.length === 0) {
    return (
      <div className="bg-white rounded-2xl card-shadow p-10 text-center">
        <p className="text-gray-400 text-sm">Arşivde randevu yok</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {appointments.map(apt => (
        <div key={apt.id} className="bg-white rounded-2xl card-shadow p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{apt.customer?.name}</p>
              <p className="text-sm text-gray-500">{apt.service?.name} · {apt.staff?.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(apt.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} · {apt.time?.slice(0, 5)}
              </p>
              {apt.deleted_at && (
                <p className="text-xs text-red-400 mt-1">
                  Silindi: {new Date(apt.deleted_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_COLORS[apt.status]}`}>
                {STATUS_LABELS[apt.status]}
              </span>
              <button
                onClick={() => restore(apt.id)}
                disabled={restoring === apt.id}
                className="text-xs text-[#C9547A] font-medium border border-[#C9547A30] rounded-lg px-2.5 py-1"
              >
                {restoring === apt.id ? '...' : 'Geri Al'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
