import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(request.url)
  const startDate = url.searchParams.get('start') ?? '2024-01-01'
  const endDate = url.searchParams.get('end') ?? '2099-12-31'
  const staffId = url.searchParams.get('staff')
  const serviceId = url.searchParams.get('service')

  let query = supabase
    .from('appointments')
    .select('*, staff:users(id, name), service:services(id, name), customer:customers(name)')
    .eq('status', 'completed')
    .gte('date', startDate)
    .lte('date', endDate)

  if (staffId) query = query.eq('staff_id', staffId)
  if (serviceId) query = query.eq('service_id', serviceId)

  const { data: appointments } = await query

  if (!appointments) return NextResponse.json({ data: [] })

  const staffSummary = appointments.reduce((acc, apt) => {
    const key = apt.staff?.id ?? 'unknown'
    if (!acc[key]) acc[key] = { name: apt.staff?.name ?? '-', count: 0, total: 0 }
    acc[key].count++
    acc[key].total += Number(apt.price)
    return acc
  }, {} as Record<string, { name: string; count: number; total: number }>)

  const serviceSummary = appointments.reduce((acc, apt) => {
    const key = apt.service?.id ?? 'unknown'
    if (!acc[key]) acc[key] = { name: apt.service?.name ?? '-', count: 0, total: 0 }
    acc[key].count++
    acc[key].total += Number(apt.price)
    return acc
  }, {} as Record<string, { name: string; count: number; total: number }>)

  return NextResponse.json({
    totalCount: appointments.length,
    totalRevenue: appointments.reduce((sum, a) => sum + Number(a.price), 0),
    staffSummary: Object.values(staffSummary).sort((a: any, b: any) => b.total - a.total),
    serviceSummary: Object.values(serviceSummary).sort((a: any, b: any) => b.count - a.count),
  })
}
