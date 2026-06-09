import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/ui/BottomNav'
import { LogoutButton } from '@/components/ui/LogoutButton'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, name')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold text-lg" style={{ color: '#2D3B6B' }}>Cloué Nail</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{profile?.name}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="pb-20">
        {children}
      </main>
      <BottomNav isAdmin={isAdmin} />
    </div>
  )
}
