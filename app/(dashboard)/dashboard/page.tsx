import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CalendarView } from '@/components/calendar/CalendarView'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  let query = supabase
    .from('appointments')
    .select(`
      *,
      customer:customers(id, name, phone),
      staff:users(id, name),
      service:services(id, name, price)
    `)
    .order('time', { ascending: true })

  if (!isAdmin) {
    query = query.eq('staff_id', user.id)
  }

  const { data: appointments } = await query

  return <CalendarView appointments={appointments ?? []} isAdmin={isAdmin} />
}
