'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays, subDays, startOfWeek, isSameDay, isToday } from 'date-fns'
import { tr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { AppointmentCard } from '@/components/appointments/AppointmentCard'
import type { Appointment } from '@/lib/types'

interface CalendarViewProps {
  appointments: Appointment[]
  isAdmin: boolean
}

export function CalendarView({ appointments, isAdmin }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const router = useRouter()

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const dayAppointments = appointments
    .filter(a => isSameDay(new Date(a.date), selectedDate) && !a.deleted_at)
    .sort((a, b) => a.time.localeCompare(b.time))

  const todayRevenue = dayAppointments
    .filter(a => a.status === 'completed')
    .reduce((sum, a) => sum + Number(a.net_amount ?? a.price ?? 0), 0)

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="text-xs font-medium text-[#C9547A] bg-[#FDE8EF] px-3 py-1 rounded-full"
          >
            Bugün
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSelectedDate(d => subDays(d, 7))}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={18} className="text-gray-500" />
          </button>
          <span className="font-semibold text-gray-800 text-sm min-w-[110px] text-center">
            {format(selectedDate, 'MMMM yyyy', { locale: tr })}
          </span>
          <button
            onClick={() => setSelectedDate(d => addDays(d, 7))}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ChevronRight size={18} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Hafta günleri */}
      <div className="px-4 mb-4">
        <div className="bg-white rounded-2xl card-shadow p-2 grid grid-cols-7 gap-1">
          {weekDays.map(day => {
            const hasAppointment = appointments.some(a =>
              isSameDay(new Date(a.date), day) && !a.deleted_at &&
              !['cancelled', 'no_show'].includes(a.status)
            )
            const isSelected = isSameDay(day, selectedDate)
            const isTodayDay = isToday(day)

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className="flex flex-col items-center py-2 px-1 rounded-xl text-xs transition-all"
                style={isSelected
                  ? { background: 'linear-gradient(135deg, #C9547A, #D4789A)', color: 'white' }
                  : isTodayDay
                  ? { color: '#C9547A' }
                  : { color: '#374151' }
                }
              >
                <span className="font-medium text-[10px] uppercase">
                  {format(day, 'EEE', { locale: tr })}
                </span>
                <span className={`font-bold text-base mt-0.5 ${isTodayDay && !isSelected ? 'text-[#C9547A]' : ''}`}>
                  {format(day, 'd')}
                </span>
                {hasAppointment && (
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-0.5"
                    style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.7)' : '#C9547A' }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Seçili gün */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-gray-900">
              {format(selectedDate, 'd MMMM, EEEE', { locale: tr })}
            </h2>
            <p className="text-xs text-gray-400">
              {dayAppointments.length} randevu
              {todayRevenue > 0 && <span className="text-[#C9547A] font-medium ml-2">· ₺{todayRevenue.toLocaleString('tr-TR')}</span>}
            </p>
          </div>
        </div>

        {dayAppointments.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl" style={{ backgroundColor: '#FDE8EF' }}>
              💅
            </div>
            <p className="text-gray-400 text-sm">Bu gün için randevu yok</p>
            <button
              onClick={() => router.push('/appointments/new')}
              className="mt-3 text-sm font-medium text-[#C9547A]"
            >
              Randevu ekle →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {dayAppointments.map(apt => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                onClick={() => router.push(`/appointments/${apt.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => router.push('/appointments/new')}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-2xl text-white flex items-center justify-center card-shadow-lg transition-transform active:scale-95 z-40"
        style={{ background: 'linear-gradient(135deg, #C9547A, #2D3B6B)' }}
        aria-label="Yeni randevu"
      >
        <Plus size={24} />
      </button>
    </div>
  )
}
