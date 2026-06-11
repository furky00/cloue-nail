import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ogwheyrmstltrojqzyus.supabase.co',
  'sb_secret_6wsDXQvYpn6799W2vhlq5Q_6aP0aDfP',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const updates = [
  { oldEmail: 'admin@clouenail.com',     newEmail: 'mehmet@clouenail.com',  name: 'Mehmet' },
  { oldEmail: 'personel1@clouenail.com', newEmail: 'melike@clouenail.com',  name: 'Melike' },
  { oldEmail: 'personel2@clouenail.com', newEmail: 'muge@clouenail.com',    name: 'Müge' },
  { oldEmail: 'personel3@clouenail.com', newEmail: 'zehra@clouenail.com',   name: 'Zehra' },
  { oldEmail: 'personel4@clouenail.com', newEmail: 'arda@clouenail.com',    name: 'Arda' },
]

for (const u of updates) {
  // Kullanıcı ID'sini bul
  const { data: users } = await supabase.auth.admin.listUsers()
  const authUser = users.users.find(x => x.email === u.oldEmail)
  if (!authUser) { console.log(`❌ ${u.oldEmail} bulunamadı`); continue }

  // Auth email güncelle
  const { error: authErr } = await supabase.auth.admin.updateUserById(authUser.id, {
    email: u.newEmail
  })
  if (authErr) { console.log(`❌ Auth ${u.oldEmail}: ${authErr.message}`); continue }

  // users tablosunu güncelle
  const { error: dbErr } = await supabase
    .from('users')
    .update({ email: u.newEmail })
    .eq('email', u.oldEmail)

  if (dbErr) {
    console.log(`❌ DB ${u.oldEmail}: ${dbErr.message}`)
  } else {
    console.log(`✅ ${u.oldEmail} → ${u.newEmail}`)
  }
}
