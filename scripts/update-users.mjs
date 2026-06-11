import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ogwheyrmstltrojqzyus.supabase.co',
  'sb_secret_6wsDXQvYpn6799W2vhlq5Q_6aP0aDfP',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const updates = [
  { email: 'admin@clouenail.com',    name: 'Mehmet' },
  { email: 'personel1@clouenail.com', name: 'Melike' },
  { email: 'personel2@clouenail.com', name: 'Müge' },
  { email: 'personel3@clouenail.com', name: 'Zehra' },
  { email: 'personel4@clouenail.com', name: 'Arda' },
]

for (const u of updates) {
  const { error } = await supabase
    .from('users')
    .update({ name: u.name })
    .eq('email', u.email)

  if (error) {
    console.log(`❌ ${u.email}: ${error.message}`)
  } else {
    console.log(`✅ ${u.email} → ${u.name}`)
  }
}

// personel5 artık yok, silelim
const { error: delError } = await supabase
  .from('users')
  .delete()
  .eq('email', 'personel5@clouenail.com')

if (!delError) console.log('✅ personel5 silindi')
