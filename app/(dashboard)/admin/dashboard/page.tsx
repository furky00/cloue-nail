import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { tr } from 'date-fns/locale'

async function getStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd')

  const [
    { data: todayApts },
    { data: weekApts },
    { data: monthApts },
    { data: allStaff },
  ] = await Promise.all([
    supabase.from('appointments').select('*, staff:users(id,name,commission_rate), service:services(name)')
      .eq('date', today).is('deleted_at', null),
    supabase.from('appointments').select('*, staff:users(id,name,commission_rate)')
      .gte('date', weekStart).lte('date', weekEnd).eq('status', 'completed').is('deleted_at', null),
    supabase.from('appointments').select('*, staff:users(id,name,commission_rate)')
      .gte('date', monthStart).lte('date', monthEnd).is('deleted_at', null),
    supabase.from('users').select('id, name, commission_rate').eq('role', 'staff'),
  ])

  const todayRevenue = (todayApts ?? []).filter(a => a.status === 'completed')
    .reduce((s, a) => s + Number(a.net_amount ?? a.price ?? 0), 0)

  const weekRevenue = (weekApts ?? [])
    .reduce((s, a) => s + Number(a.net_amount ?? a.price ?? 0), 0)

  const monthTotal = (monthApts ?? []).length
  const monthCancelled = (monthApts ?? []).filter(a => a.status === 'cancelled' || a.status === 'no_show').length
  const cancelRate = monthTotal > 0 ? Math.round((monthCancelled / monthTotal) * 100) : 0

  const noShowCount = (todayApts ?? []).filter(a => a.status === 'no_show').length
  const pendingCount = (todayApts ?? []).filter(a => ['pending', 'confirmed'].includes(a.status)).length

  // Personel performansı (bu ay, geldi olanlar)
  const staffPerf: Record<string, { name: string; count: number; revenue: number; commission: number; rate: number }> = {}
  const staffRateMap: Record<string, number> = {}
  allStaff?.forEach(s => { staffRateMap[s.id] = s.commission_rate ?? 50 })

  for (const apt of monthApts ?? []) {
    if (apt.status !== 'completed') continue
    const sid = apt.staff?.id ?? 'unknown'
    const rate = staffRateMap[sid] ?? 50
    if (!staffPerf[sid]) staffPerf[sid] = { name: apt.staff?.name ?? '-', count: 0, revenue: 0, commission: 0, rate }
    staffPerf[sid].count++
    staffPerf[sid].revenue += Number(apt.net_amount ?? apt.price ?? 0)
    staffPerf[sid].commission = staffPerf[sid].revenue * (rate / 100)
  }

  // En çok satılan hizmet (bu ay)
  const serviceCount: Record<string, { name: string; count: number }> = {}
  for (const apt of monthApts ?? []) {
    if (apt.status !== 'completed') continue
    const sname = (apt as any).service?.name ?? '-'
    if (!serviceCount[sname]) serviceCount[sname] = { name: sname, count: 0 }
    serviceCount[sname].count++
  }
  const topService = Object.values(serviceCount).sort((a, b) => b.count - a.count)[0]

  // En çok işlem yapan personel (bu ay)
  const topStaff = Object.values(staffPerf).sort((a, b) => b.count - a.count)[0]

  return {
    today: { appointments: todayApts ?? [], revenue: todayRevenue, pending: pendingCount, noShow: noShowCount },
    week: { revenue: weekRevenue },
    month: { cancelRate, staffPerf: Object.values(staffPerf).sort((a, b) => b.revenue - a.revenue) },
    topService,
    topStaff,
  }
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users').select('role, name').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const stats = await getStats(supabase)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Günaydın'
    if (h < 18) return 'İyi günler'
    return 'İyi akşamlar'
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-5">
      {/* Karşılama */}
      <div className="pt-2">
        <p className="text-sm text-gray-400">{greeting()}, {profile?.name} 👋</p>
        <h1 className="font-bold text-2xl text-gray-900 mt-0.5">
          {format(new Date(), 'd MMMM', { locale: tr })} · Bugün
        </h1>
      </div>

      {/* Bugün ciro */}
      <div className="rounded-3xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #C9547A, #2D3B6B)' }}>
        <p className="text-white/70 text-sm font-medium">Bugünün Cirosu</p>
        <p className="text-4xl font-bold mt-1">₺{stats.today.revenue.toLocaleString('tr-TR')}</p>
        <div className="flex gap-4 mt-4">
          <div>
            <p className="text-white/60 text-xs">Randevu</p>
            <p className="font-bold text-lg">{stats.today.appointments.length}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Bekleyen</p>
            <p className="font-bold text-lg">{stats.today.pending}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Gelmedi</p>
            <p className="font-bold text-lg">{stats.today.noShow}</p>
          </div>
        </div>
      </div>

      {/* Hızlı metrikler */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl card-shadow p-4">
          <p className="text-xs text-gray-400 font-medium">Bu Hafta</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">₺{stats.week.revenue.toLocaleString('tr-TR')}</p>
          <p className="text-xs text-gray-400 mt-0.5">Net ciro</p>
        </div>
        <div className="bg-white rounded-2xl card-shadow p-4">
          <p className="text-xs text-gray-400 font-medium">Bu Ay İptal</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">%{stats.month.cancelRate}</p>
          <p className="text-xs text-gray-400 mt-0.5">İptal + gelmedi</p>
        </div>
        {stats.topStaff && (
          <div className="bg-white rounded-2xl card-shadow p-4">
            <p className="text-xs text-gray-400 font-medium">En Çok İşlem</p>
            <p className="text-base font-bold text-gray-900 mt-1">{stats.topStaff.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{stats.topStaff.count} işlem</p>
          </div>
        )}
        {stats.topService && (
          <div className="bg-white rounded-2xl card-shadow p-4">
            <p className="text-xs text-gray-400 font-medium">Popüler Hizmet</p>
            <p className="text-base font-bold text-gray-900 mt-1 leading-tight">{stats.topService.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{stats.topService.count} kez</p>
          </div>
        )}
      </div>

      {/* Personel performansı */}
      {stats.month.staffPerf.length > 0 && (
        <div className="bg-white rounded-2xl card-shadow p-4">
          <p className="font-semibold text-gray-800 mb-3">Bu Ay Personel Performansı</p>
          <div className="space-y-3">
            {stats.month.staffPerf.map(s => (
              <div key={s.name} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-800">{s.name}</span>
                  <span className="font-semibold" style={{ color: '#C9547A' }}>₺{s.revenue.toLocaleString('tr-TR')}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{s.count} işlem</span>
                  <span className="text-amber-600 font-medium">Hak ediş: ₺{s.commission.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</span>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (s.revenue / (stats.month.staffPerf[0]?.revenue || 1)) * 100)}%`,
                      background: 'linear-gradient(90deg, #C9547A, #D4789A)'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bugünün randevuları */}
      {stats.today.appointments.length > 0 && (
        <div className="bg-white rounded-2xl card-shadow p-4">
          <p className="font-semibold text-gray-800 mb-3">Bugünün Randevuları</p>
          <div className="space-y-2">
            {stats.today.appointments
              .sort((a: any, b: any) => a.time?.localeCompare(b.time))
              .map((apt: any) => (
                <div key={apt.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{apt.time?.slice(0, 5)} · {apt.customer?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{apt.staff?.name} · {apt.service?.name}</p>
                  </div>
                  <p className="text-xs font-medium" style={{ color: '#C9547A' }}>₺{apt.net_amount ?? apt.price}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
