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
    <div className="min-h-screen" style={{ backgroundColor: '#FAF7F5' }}>
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg, #C9547A, #2D3B6B)' }}>
            C
          </div>
          <h1 className="font-bold text-base tracking-tight" style={{ color: '#2D3B6B' }}>Cloué Nail</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 font-medium">{profile?.name}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="pb-24">
        {children}
      </main>
      <BottomNav isAdmin={isAdmin} />
    </div>
  )
}
