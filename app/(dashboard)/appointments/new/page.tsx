import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppointmentForm } from '@/components/appointments/AppointmentForm'

export default async function NewAppointmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  const [{ data: staffList }, { data: services }] = await Promise.all([
    supabase.from('users').select('id, name, role, email, phone, created_at').eq('role', 'staff').order('name'),
    supabase.from('services').select('*').order('name'),
  ])

  return (
    <div>
      <div className="px-4 py-3 border-b bg-white">
        <h2 className="font-semibold text-lg">Yeni Randevu</h2>
      </div>
      <AppointmentForm
        currentUserId={user.id}
        isAdmin={isAdmin}
        staffList={staffList ?? []}
        services={services ?? []}
      />
    </div>
  )
}
