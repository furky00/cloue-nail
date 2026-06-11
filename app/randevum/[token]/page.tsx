import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { MapPin, Clock, User, Sparkles } from 'lucide-react'
import { RatingForm } from './RatingForm'

const SALON_MAPS_URL = 'https://maps.google.com/?q=Cloué+Nail'

export default async function MiniAppointmentPage({ params }: { params: { token: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: apt } = await supabase
    .from('appointments')
    .select('*, customer:customers(name), staff:users(name), service:services(name, duration_minutes)')
    .eq('token', params.token)
    .is('deleted_at', null)
    .single()

  if (!apt) notFound()

  const { data: existingRating } = await supabase
    .from('ratings')
    .select('score, comment')
    .eq('appointment_id', apt.id)
    .maybeSingle()

  const dateFormatted = format(new Date(apt.date), 'd MMMM yyyy, EEEE', { locale: tr })
  const canRate = apt.status === 'completed'

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF7F5' }}>
      {/* Header */}
      <div className="px-4 pt-10 pb-6 text-center" style={{ background: 'linear-gradient(135deg, #C9547A15, #2D3B6B10)' }}>
        <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center text-white text-2xl font-bold"
          style={{ background: 'linear-gradient(135deg, #C9547A, #2D3B6B)' }}>
          C
        </div>
        <h1 className="font-bold text-xl text-gray-900">Cloué Nail</h1>
        <p className="text-sm text-gray-400 mt-0.5">Randevu Detayı</p>
      </div>

      <div className="p-4 space-y-4 max-w-sm mx-auto">
        {/* Müşteri */}
        <div className="bg-white rounded-2xl card-shadow p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Randevunuz</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FDE8EF' }}>
                <User size={16} style={{ color: '#C9547A' }} />
              </div>
              <div>
                <p className="text-xs text-gray-400">Müşteri</p>
                <p className="font-semibold text-gray-900">{apt.customer?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FDE8EF' }}>
                <Sparkles size={16} style={{ color: '#C9547A' }} />
              </div>
              <div>
                <p className="text-xs text-gray-400">Hizmet</p>
                <p className="font-semibold text-gray-900">{apt.service?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FDE8EF' }}>
                <Clock size={16} style={{ color: '#C9547A' }} />
              </div>
              <div>
                <p className="text-xs text-gray-400">Tarih & Saat</p>
                <p className="font-semibold text-gray-900">{dateFormatted}</p>
                <p className="text-sm text-gray-500">{apt.time?.slice(0, 5)}
                  {apt.service?.duration_minutes && ` — ${apt.service.duration_minutes} dakika`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FDE8EF' }}>
                <User size={16} style={{ color: '#C9547A' }} />
              </div>
              <div>
                <p className="text-xs text-gray-400">Personel</p>
                <p className="font-semibold text-gray-900">{apt.staff?.name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Konum */}
        <a
          href={SALON_MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-white rounded-2xl card-shadow p-4 w-full"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#2D3B6B15' }}>
            <MapPin size={16} style={{ color: '#2D3B6B' }} />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900 text-sm">Cloué Nail Salonu</p>
            <p className="text-xs text-gray-400">Google Maps'te görüntüle</p>
          </div>
          <span className="text-xs text-[#2D3B6B] font-medium">Yol Tarifi →</span>
        </a>

        {/* Puan ver */}
        {canRate && (
          <RatingForm
            appointmentId={apt.id}
            existingRating={existingRating ?? null}
          />
        )}

        <p className="text-center text-xs text-gray-300 pb-4">Cloué Nail · Güzellik salonunuz</p>
      </div>
    </div>
  )
}
