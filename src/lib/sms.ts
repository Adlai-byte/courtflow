const SEMAPHORE_API_KEY = process.env.SEMAPHORE_API_KEY || ''
const SEMAPHORE_SENDER = process.env.SEMAPHORE_SENDER_NAME || 'CourtFLOW'

export async function sendSMS(to: string, message: string) {
  if (!SEMAPHORE_API_KEY) {
    console.log(`[SMS SKIP] No SEMAPHORE_API_KEY. Would send to ${to}: ${message}`)
    return
  }

  // Normalize PH number: 09xx → +639xx
  const normalized = to.replace(/^0/, '+63').replace(/^\+?63/, '+63')

  try {
    const res = await fetch('https://api.semaphore.co/api/v4/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        apikey: SEMAPHORE_API_KEY,
        number: normalized,
        message,
        sendername: SEMAPHORE_SENDER,
      }),
    })

    if (!res.ok) {
      console.error('[SMS ERROR]', await res.text())
    }
  } catch (error) {
    console.error('[SMS ERROR]', error)
  }
}
