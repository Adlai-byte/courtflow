const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET_KEY || ''
const PAYMONGO_BASE = 'https://api.paymongo.com/v1'

function headers() {
  return {
    Authorization: `Basic ${Buffer.from(PAYMONGO_SECRET + ':').toString('base64')}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

export async function createCheckoutSession(opts: {
  amount: number
  description: string
  metadata: Record<string, string>
  successUrl: string
  cancelUrl: string
}): Promise<{ checkoutUrl: string; checkoutId: string }> {
  if (!PAYMONGO_SECRET) {
    throw new Error('PAYMONGO_SECRET_KEY is not configured')
  }

  const amountInCentavos = Math.round(opts.amount * 100)

  const res = await fetch(`${PAYMONGO_BASE}/checkout_sessions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      data: {
        attributes: {
          send_email_receipt: false,
          show_description: true,
          show_line_items: true,
          description: opts.description,
          line_items: [{
            currency: 'PHP',
            amount: amountInCentavos,
            name: opts.description,
            quantity: 1,
          }],
          payment_method_types: ['gcash', 'paymaya'],
          success_url: opts.successUrl,
          cancel_url: opts.cancelUrl,
          metadata: opts.metadata,
        },
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new Error(`PayMongo error: ${err?.errors?.[0]?.detail || res.statusText}`)
  }

  const json = await res.json()
  return {
    checkoutUrl: json.data.attributes.checkout_url,
    checkoutId: json.data.id,
  }
}

export async function retrieveCheckoutSession(checkoutId: string) {
  const res = await fetch(`${PAYMONGO_BASE}/checkout_sessions/${checkoutId}`, {
    headers: headers(),
  })

  if (!res.ok) {
    throw new Error(`PayMongo error: ${res.statusText}`)
  }

  return await res.json()
}

export async function createRefund(paymentId: string, amount: number, reason: string) {
  const amountInCentavos = Math.round(amount * 100)

  const res = await fetch(`${PAYMONGO_BASE}/refunds`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      data: {
        attributes: {
          amount: amountInCentavos,
          payment_id: paymentId,
          reason: 'requested_by_customer',
          notes: reason,
        },
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new Error(`PayMongo refund error: ${err?.errors?.[0]?.detail || res.statusText}`)
  }

  return await res.json()
}
