export type UserRole = 'admin' | 'staff'
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'no_show' | 'cancelled'
export type PaymentType = 'nakit' | 'kart' | 'iban'
export type MessageType = 'new_appointment' | 'reminder_2h' | 'satisfaction_3d' | 'reappointment_3w' | 'birthday' | 'no_show'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  phone: string
  commission_rate?: number | null
  created_at: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  birthday: string | null
  notes: string | null
  created_at: string
}

export interface Service {
  id: string
  name: string
  price: number
  campaign_price?: number | null
  duration_minutes: number
  category?: string
  is_active?: boolean
}

export interface AppointmentService {
  id: string
  appointment_id: string
  service_id: string | null
  service_name: string
  duration_minutes: number
  price: number
}

export interface Appointment {
  id: string
  customer_id: string
  staff_id: string
  service_id: string
  date: string
  time: string
  end_time: string | null
  price: number
  discount: number
  net_amount: number | null
  payment_type: PaymentType
  note: string | null
  status: AppointmentStatus
  token: string | null
  deleted_at: string | null
  deleted_by: string | null
  duration_minutes: number | null
  created_at: string
  customer?: Customer
  staff?: User
  service?: Service
  appointment_services?: AppointmentService[]
}

export interface WhatsappLog {
  id: string
  appointment_id: string | null
  customer_id: string | null
  phone: string
  message_type: MessageType
  content: string
  status: string
  created_at: string
  appointment?: Appointment
  customer?: Customer
}

export interface Rating {
  id: string
  appointment_id: string
  score: number
  comment: string | null
  created_at: string
}

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Bekliyor',
  confirmed: 'Onaylandı',
  completed: 'Geldi',
  no_show: 'Gelmedi',
  cancelled: 'İptal',
}

export const STATUS_COLORS: Record<AppointmentStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  no_show: 'bg-orange-100 text-orange-700 border-orange-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
}

export const REVENUE_STATUSES: AppointmentStatus[] = ['completed']
