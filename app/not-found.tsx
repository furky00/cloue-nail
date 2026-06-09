import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold" style={{ color: '#2D3B6B' }}>404</h1>
      <p className="text-gray-500">Sayfa bulunamadı</p>
      <Link href="/dashboard" className="text-sm font-medium" style={{ color: '#E8185A' }}>
        Takvime Dön
      </Link>
    </div>
  )
}
