import twilio from 'twilio'

const client = twilio(
  'AC65889be162dc8c2b65f6f7c2242d0322',
  '103353637128abcf083b55959ee3cdf1'
)

// Test mesajı gönder — kendi numarana
const TEST_PHONE = process.argv[2]
if (!TEST_PHONE) {
  console.log('Kullanım: node scripts/test-whatsapp.mjs +905XXXXXXXXX')
  process.exit(1)
}

try {
  const msg = await client.messages.create({
    from: 'whatsapp:+14155238886',
    to: `whatsapp:${TEST_PHONE}`,
    body: 'Cloué Nail test mesajı ✅ WhatsApp entegrasyonu çalışıyor!'
  })
  console.log('✅ Gönderildi! SID:', msg.sid, '| Status:', msg.status)
} catch (err) {
  console.log('❌ Hata:', err.message)
  console.log('Kod:', err.code)
}
