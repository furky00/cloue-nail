import type { Appointment } from '@/lib/types'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/types'

interface AppointmentCardProps {
  appointment: Appointment
  onClick?: () => void
}

export function AppointmentCard({ appointment, onClick }: AppointmentCardProps) {
  const status = appointment.status
  const endTime = appointment.end_time?.slice(0, 5)
  const startTime = appointment.time?.slice(0, 5)

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl card-shadow p-4 cursor-pointer active:scale-[0.98] transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#2D3B6B] text-sm">
            {startTime}
            {endTime && endTime !== startTime && (
              <span className="text-gray-400 font-normal"> – {endTime}</span>
            )}
          </span>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>

      <p className="font-semibold text-gray-900 text-base leading-tight">
        {appointment.customer?.name}
      </p>
      <p className="text-sm text-gray-500 mt-0.5">{appointment.service?.name}</p>

      <div className="flex items-center justify-between mt-2.5">
        <p className="text-sm font-medium" style={{ color: '#C9547A' }}>
          ₺{(appointment.net_amount ?? appointment.price).toLocaleString('tr-TR')}
        </p>
        {appointment.staff && (
          <p className="text-xs text-gray-400">{appointment.staff.name}</p>
        )}
      </div>
    </div>
  )
}
