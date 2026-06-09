import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ogwheyrmstltrojqzyus.supabase.co'
const serviceKey = 'sb_secret_6wsDXQvYpn6799W2vhlq5Q_6aP0aDfP'

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Try signing in as admin to verify credentials work
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'admin@clouenail.com',
  password: 'Cloue2024!'
})

if (error) {
  console.log('❌ Login error:', error.message)
} else {
  console.log('✅ Login OK, user id:', data.user.id)
}

// Check users table
const { data: users, error: usersError } = await supabase.from('users').select('*')
if (usersError) {
  console.log('❌ Users table error:', usersError.message)
} else {
  console.log('Users in DB:', users.map(u => `${u.email} (${u.role})`).join(', '))
}
