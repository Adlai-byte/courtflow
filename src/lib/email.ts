import { Resend } from 'resend'

const FROM_EMAIL = process.env.EMAIL_FROM || 'CourtFLOW <noreply@courtflow.app>'

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL SKIP] No RESEND_API_KEY. Would send to ${to}: ${subject}`)
    return
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html })
  } catch (error) {
    console.error('[EMAIL ERROR]', error)
  }
}
