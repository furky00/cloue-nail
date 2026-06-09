import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ogwheyrmstltrojqzyus.supabase.co'
const serviceKey = 'sb_secret_6wsDXQvYpn6799W2vhlq5Q_6aP0aDfP'

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Test login directly
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'admin@clouenail.com',
  password: 'Cloue2024!'
})

if (error) {
  console.log('Login error:', error.message, error.status)
} else {
  console.log('Login OK:', data.user.email)
}
