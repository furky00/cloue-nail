'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Star } from 'lucide-react'

interface Props {
  appointmentId: string
  existingRating: { score: number; comment: string | null } | null
}

export function RatingForm({ appointmentId, existingRating }: Props) {
  const supabase = createClient()
  const [score, setScore] = useState(existingRating?.score ?? 0)
  const [comment, setComment] = useState(existingRating?.comment ?? '')
  const [saved, setSaved] = useState(!!existingRating)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!score) return
    setLoading(true)
    await supabase.from('ratings').upsert(
      { appointment_id: appointmentId, score, comment: comment || null },
      { onConflict: 'appointment_id' }
    )
    setLoading(false)
    setSaved(true)
  }

  if (saved && existingRating) {
    return (
      <div className="bg-white rounded-2xl card-shadow p-5 text-center">
        <p className="text-2xl mb-2">{'⭐'.repeat(existingRating.score)}</p>
        <p className="font-semibold text-gray-900">Değerlendirmeniz alındı!</p>
        <p className="text-sm text-gray-400 mt-1">Teşekkür ederiz 💕</p>
      </div>
    )
  }

  if (saved) {
    return (
      <div className="bg-white rounded-2xl card-shadow p-5 text-center">
        <p className="text-3xl mb-2">💕</p>
        <p className="font-semibold text-gray-900">Teşekkürler!</p>
        <p className="text-sm text-gray-400 mt-1">Değerlendirmeniz kaydedildi.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl card-shadow p-5 space-y-4">
      <p className="font-semibold text-gray-900 text-center">Deneyiminizi Puanlayın</p>
      <p className="text-sm text-gray-400 text-center">Hizmetimizden ne kadar memnun kaldınız?</p>

      {/* Yıldızlar */}
      <div className="flex justify-center gap-3">
        {[1, 2, 3, 4, 5].map(s => (
          <button key={s} onClick={() => setScore(s)} className="transition-transform active:scale-90">
            <Star
              size={36}
              fill={s <= score ? '#C9547A' : 'none'}
              stroke={s <= score ? '#C9547A' : '#D1D5DB'}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>

      {/* Yorum */}
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Yorumunuzu yazın... (isteğe bağlı)"
        className="w-full rounded-xl border border-gray-200 p-3 text-sm resize-none outline-none focus:border-[#C9547A] transition-colors"
        rows={3}
      />

      <Button
        onClick={handleSubmit}
        disabled={!score || loading}
        className="w-full h-12 rounded-2xl text-white font-semibold"
        style={{ backgroundColor: '#C9547A' }}
      >
        {loading ? 'Gönderiliyor...' : 'Değerlendirmeyi Gönder'}
      </Button>
    </div>
  )
}
