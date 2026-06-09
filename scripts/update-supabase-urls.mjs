// Update Supabase Auth allowed URLs via Management API
// Need the Supabase project ref and management token

const projectRef = 'ogwheyrmstltrojqzyus'

// Try with service key as management token
const serviceKey = 'sb_secret_6wsDXQvYpn6799W2vhlq5Q_6aP0aDfP'

const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    site_url: 'https://cloue-nail.vercel.app',
    uri_allow_list: 'https://cloue-nail.vercel.app/**,http://localhost:3000/**',
  }),
})

const data = await res.json()
console.log('Status:', res.status)
console.log('Response:', JSON.stringify(data, null, 2))
