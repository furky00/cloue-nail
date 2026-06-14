export async function sendWhatsApp(to: string, message: string) {
  const instanceId = process.env.ULTRAMSG_INSTANCE_ID!
  const token = process.env.ULTRAMSG_TOKEN!

  // Normalize phone number: remove + and spaces
  const phone = to.replace(/\D/g, '')

  const res = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      token,
      to: phone,
      body: message,
    }).toString(),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`UltraMsg error [${res.status}] instance=${instanceId} token=${token?.slice(0,6)}...: ${err}`)
  }

  return res.json()
}
