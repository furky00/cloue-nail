import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ogwheyrmstltrojqzyus.supabase.co'
const serviceKey = 'sb_secret_6wsDXQvYpn6799W2vhlq5Q_6aP0aDfP'

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const users = [
  { name: 'Admin', email: 'admin@clouenail.com', password: 'Cloue2024!', role: 'admin' },
  { name: 'Personel 1', email: 'personel1@clouenail.com', password: 'Cloue2024!', role: 'staff' },
  { name: 'Personel 2', email: 'personel2@clouenail.com', password: 'Cloue2024!', role: 'staff' },
  { name: 'Personel 3', email: 'personel3@clouenail.com', password: 'Cloue2024!', role: 'staff' },
  { name: 'Personel 4', email: 'personel4@clouenail.com', password: 'Cloue2024!', role: 'staff' },
  { name: 'Personel 5', email: 'personel5@clouenail.com', password: 'Cloue2024!', role: 'staff' },
]

for (const user of users) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
  })

  if (error) {
    console.log(`❌ ${user.email}: ${error.message}`)
    continue
  }

  const { error: dbError } = await supabase.from('users').insert({
    id: data.user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  })

  if (dbError) {
    console.log(`❌ DB insert ${user.email}: ${dbError.message}`)
  } else {
    console.log(`✅ ${user.email} (${user.role}) oluşturuldu`)
  }
}
