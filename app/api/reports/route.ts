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
  const paymentType = url.searchParams.get('payment')
  const statusFilter = url.searchParams.get('status')

  // Personel komisyon oranlarını çek
  const { data: staffData } = await supabase.from('users').select('id, name, commission_rate')
  const commissionMap: Record<string, number> = {}
  staffData?.forEach(s => { commissionMap[s.id] = s.commission_rate ?? 50 })

  // Geldi (completed) randevuları — gelir sayılır
  let revenueQuery = supabase
    .from('appointments')
    .select('*, staff:users(id, name), service:services(id, name), customer:customers(name)')
    .eq('status', 'completed')
    .gte('date', startDate)
    .lte('date', endDate)
    .is('deleted_at', null)

  if (staffId) revenueQuery = revenueQuery.eq('staff_id', staffId)
  if (serviceId) revenueQuery = revenueQuery.eq('service_id', serviceId)
  if (paymentType) revenueQuery = revenueQuery.eq('payment_type', paymentType)

  // Tüm statüler (iptal, gelmedi dahil) — özet için
  let allQuery = supabase
    .from('appointments')
    .select('id, status, staff_id, date')
    .gte('date', startDate)
    .lte('date', endDate)
    .is('deleted_at', null)

  if (statusFilter) allQuery = allQuery.eq('status', statusFilter)

  const [{ data: completedApts }, { data: allApts }] = await Promise.all([
    revenueQuery,
    allQuery,
  ])

  const appointments = completedApts ?? []
  const totalNetRevenue = appointments.reduce((sum, a) => sum + Number(a.net_amount ?? a.price), 0)
  const totalDiscount = appointments.reduce((sum, a) => sum + Number(a.discount ?? 0), 0)
  const totalRevenue = appointments.reduce((sum, a) => sum + Number(a.price), 0)

  // Ödeme tipi dağılımı
  const nakit = appointments.filter(a => a.payment_type === 'nakit').reduce((s, a) => s + Number(a.net_amount ?? a.price), 0)
  const kart = appointments.filter(a => a.payment_type === 'kart').reduce((s, a) => s + Number(a.net_amount ?? a.price), 0)
  const iban = appointments.filter(a => a.payment_type === 'iban').reduce((s, a) => s + Number(a.net_amount ?? a.price), 0)

  // Personel özeti
  const staffSummary = appointments.reduce((acc, apt) => {
    const key = apt.staff?.id ?? 'unknown'
    const rate = commissionMap[apt.staff?.id] ?? 50
    if (!acc[key]) acc[key] = { id: apt.staff?.id, name: apt.staff?.name ?? '-', count: 0, total: 0, netTotal: 0, commission: 0, commissionRate: rate }
    acc[key].count++
    acc[key].total += Number(apt.price)
    acc[key].netTotal += Number(apt.net_amount ?? apt.price)
    acc[key].commission = acc[key].netTotal * (rate / 100)
    return acc
  }, {} as Record<string, { id: string; name: string; count: number; total: number; netTotal: number; commission: number; commissionRate: number }>)

  // Hizmet özeti
  const serviceSummary = appointments.reduce((acc, apt) => {
    const key = apt.service?.id ?? 'unknown'
    if (!acc[key]) acc[key] = { name: apt.service?.name ?? '-', count: 0, total: 0 }
    acc[key].count++
    acc[key].total += Number(apt.net_amount ?? apt.price)
    return acc
  }, {} as Record<string, { name: string; count: number; total: number }>)

  // İptal ve gelmedi sayıları
  const cancelledCount = (allApts ?? []).filter(a => a.status === 'cancelled').length
  const noShowCount = (allApts ?? []).filter(a => a.status === 'no_show').length
  const totalAll = (allApts ?? []).length
  const cancelRate = totalAll > 0 ? Math.round(((cancelledCount + noShowCount) / totalAll) * 100) : 0

  return NextResponse.json({
    totalCount: appointments.length,
    totalRevenue,
    totalDiscount,
    totalNetRevenue,
    cancelledCount,
    noShowCount,
    cancelRate,
    paymentBreakdown: { nakit, kart, iban },
    staffSummary: Object.values(staffSummary).sort((a: any, b: any) => b.netTotal - a.netTotal),
    serviceSummary: Object.values(serviceSummary).sort((a: any, b: any) => b.count - a.count),
  })
}
