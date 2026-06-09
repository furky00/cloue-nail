import type { Appointment } from '@/lib/types'

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const statusLabels = {
  pending: 'Bekliyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
}

interface AppointmentCardProps {
  appointment: Appointment
  onClick?: () => void
}

export function AppointmentCard({ appointment, onClick }: AppointmentCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-sm transition-shadow"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm">{appointment.time.slice(0, 5)}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[appointment.status]}`}>
          {statusLabels[appointment.status]}
        </span>
      </div>
      <p className="font-semibold">{appointment.customer?.name}</p>
      <p className="text-sm text-gray-500">{appointment.service?.name}</p>
      <p className="text-sm font-medium" style={{ color: '#E8185A' }}>₺{appointment.price}</p>
      {appointment.staff && (
        <p className="text-xs text-gray-400 mt-1">{appointment.staff.name}</p>
      )}
    </div>
  )
}
