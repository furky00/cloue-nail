import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ArchiveList } from './ArchiveList'

export default async function ArchivePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: archived } = await supabase
    .from('appointments')
    .select('*, customer:customers(name, phone), staff:users(name), service:services(name)')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
    .limit(100)

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <h2 className="font-bold text-2xl text-gray-900 pt-2">Arşiv</h2>
      <p className="text-sm text-gray-400">Silinen ve iptal edilen randevular</p>
      <ArchiveList appointments={archived ?? []} />
    </div>
  )
}
