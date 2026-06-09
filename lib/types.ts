export type UserRole = 'admin' | 'staff'
export type AppointmentStatus = 'pending' | 'completed' | 'cancelled'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  phone: string
  created_at: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  created_at: string
}

export interface Service {
  id: string
  name: string
  price: number
  duration_minutes: number
}

export interface StaffServiceDuration {
  id: string
  staff_id: string
  service_id: string
  duration_minutes: number
}

export interface Appointment {
  id: string
  customer_id: string
  staff_id: string
  service_id: string
  date: string
  time: string
  price: number
  note: string | null
  status: AppointmentStatus
  created_at: string
  // join alanları
  customer?: Customer
  staff?: User
  service?: Service
}
