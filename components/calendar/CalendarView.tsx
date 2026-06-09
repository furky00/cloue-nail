'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays, subDays, startOfWeek, isSameDay } from 'date-fns'
import { tr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

  const dayAppointments = appointments.filter(a =>
    isSameDay(new Date(a.date), selectedDate)
  ).sort((a, b) => a.time.localeCompare(b.time))

  return (
    <div className="p-4 space-y-4">
      {/* Haftalık gezinme */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setSelectedDate(d => subDays(d, 7))}>
          <ChevronLeft size={20} />
        </Button>
        <span className="font-semibold">
          {format(selectedDate, 'MMMM yyyy', { locale: tr })}
        </span>
        <Button variant="ghost" size="icon" onClick={() => setSelectedDate(d => addDays(d, 7))}>
          <ChevronRight size={20} />
        </Button>
      </div>

      {/* Hafta günleri */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map(day => {
          const hasAppointment = appointments.some(a => isSameDay(new Date(a.date), day))
          const isSelected = isSameDay(day, selectedDate)
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className="flex flex-col items-center py-2 rounded-lg text-xs transition-colors"
              style={isSelected ? { backgroundColor: '#E8185A', color: 'white' } : { color: '#374151' }}
            >
              <span>{format(day, 'EEE', { locale: tr })}</span>
              <span className="font-bold text-base">{format(day, 'd')}</span>
              {hasAppointment && !isSelected && (
                <div className="w-1 h-1 rounded-full mt-0.5" style={{ backgroundColor: '#E8185A' }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Seçili gün randevuları */}
      <div>
        <h2 className="font-semibold text-gray-700 mb-3">
          {format(selectedDate, 'd MMMM, EEEE', { locale: tr })}
          <span className="text-gray-400 font-normal ml-2">
            ({dayAppointments.length} randevu)
          </span>
        </h2>
        {dayAppointments.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Bu gün için randevu yok</p>
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
    </div>
  )
}
