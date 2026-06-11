import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  new_appointment: '🗓 Yeni Randevu',
  reminder_2h: '⏰ 2 Saat Hatırlatma',
  satisfaction_3d: '😊 Memnuniyet',
  reappointment_3w: '💅 Tekrar Randevu',
  birthday: '🎂 Doğum Günü',
  no_show: '❗ Gelmedi',
}

export default async function WhatsappLogsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: logs } = await supabase
    .from('whatsapp_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="pt-2">
        <h2 className="font-bold text-2xl text-gray-900">WhatsApp Logları</h2>
        <p className="text-sm text-gray-400 mt-0.5">Son gönderilen mesajlar</p>
      </div>

      <div className="space-y-2">
        {(logs ?? []).length === 0 ? (
          <div className="bg-white rounded-2xl card-shadow p-10 text-center">
            <p className="text-gray-400 text-sm">Henüz mesaj gönderilmedi</p>
          </div>
        ) : (
          (logs ?? []).map(log => (
            <div key={log.id} className="bg-white rounded-2xl card-shadow p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
                  {MESSAGE_TYPE_LABELS[log.message_type] ?? log.message_type}
                </span>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(log.created_at).toLocaleString('tr-TR', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-700">{log.phone}</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2">{log.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
