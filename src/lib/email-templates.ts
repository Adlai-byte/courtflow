function layout(content: string) {
  return `
    <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
      <div style="border-bottom: 2px solid #1a7a3a; padding-bottom: 16px; margin-bottom: 24px;">
        <span style="font-family: 'JetBrains Mono', monospace; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; color: #1a7a3a;">CourtFLOW</span>
      </div>
      ${content}
      <div style="border-top: 1px solid #e5e5e5; margin-top: 32px; padding-top: 16px;">
        <p style="font-size: 12px; color: #888;">This is an automated message from CourtFLOW.</p>
      </div>
    </div>
  `
}

export function bookingConfirmedEmail(courtName: string, date: string, startTime: string, endTime: string) {
  return {
    subject: `Booking Confirmed — ${courtName} on ${date}`,
    html: layout(`
      <h2 style="margin: 0 0 16px;">Booking Confirmed</h2>
      <p>Your booking has been confirmed:</p>
      <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0; font-family: monospace;">
        <p style="margin: 4px 0;"><strong>Court:</strong> ${courtName}</p>
        <p style="margin: 4px 0;"><strong>Date:</strong> ${date}</p>
        <p style="margin: 4px 0;"><strong>Time:</strong> ${startTime} – ${endTime}</p>
      </div>
    `),
  }
}

export function bookingCancelledEmail(courtName: string, date: string, startTime: string, endTime: string) {
  return {
    subject: `Booking Cancelled — ${courtName} on ${date}`,
    html: layout(`
      <h2 style="margin: 0 0 16px;">Booking Cancelled</h2>
      <p>Your booking has been cancelled:</p>
      <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0; font-family: monospace;">
        <p style="margin: 4px 0;"><strong>Court:</strong> ${courtName}</p>
        <p style="margin: 4px 0;"><strong>Date:</strong> ${date}</p>
        <p style="margin: 4px 0;"><strong>Time:</strong> ${startTime} – ${endTime}</p>
      </div>
    `),
  }
}

export function waitlistPromotionEmail(courtName: string, date: string, startTime: string, endTime: string, bookingUrl: string) {
  return {
    subject: `Slot Available — ${courtName} on ${date}`,
    html: layout(`
      <h2 style="margin: 0 0 16px;">A Slot Opened Up!</h2>
      <p>A slot you were waiting for is now available:</p>
      <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0; font-family: monospace;">
        <p style="margin: 4px 0;"><strong>Court:</strong> ${courtName}</p>
        <p style="margin: 4px 0;"><strong>Date:</strong> ${date}</p>
        <p style="margin: 4px 0;"><strong>Time:</strong> ${startTime} – ${endTime}</p>
      </div>
      <p><a href="${bookingUrl}" style="display: inline-block; background: #1a7a3a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Book Now</a></p>
    `),
  }
}

export function membershipRequestEmail(playerName: string, tierName: string, tenantName: string) {
  return {
    subject: `New Membership Request — ${playerName} for ${tierName}`,
    html: layout(`
      <h2 style="margin: 0 0 16px;">New Membership Request</h2>
      <p><strong>${playerName}</strong> has requested to join the <strong>${tierName}</strong> membership at ${tenantName}.</p>
      <p>Log into your dashboard to approve or reject this request.</p>
    `),
  }
}

export function membershipApprovedEmail(tierName: string, tenantName: string) {
  return {
    subject: `Membership Approved — ${tierName} at ${tenantName}`,
    html: layout(`
      <h2 style="margin: 0 0 16px;">Membership Approved!</h2>
      <p>Your request for <strong>${tierName}</strong> membership at <strong>${tenantName}</strong> has been approved.</p>
      <p>You can now enjoy all the perks of your membership.</p>
    `),
  }
}

export function membershipRejectedEmail(tierName: string, tenantName: string, notes: string | null) {
  return {
    subject: `Membership Request Update — ${tenantName}`,
    html: layout(`
      <h2 style="margin: 0 0 16px;">Membership Request Update</h2>
      <p>Your request for <strong>${tierName}</strong> membership at <strong>${tenantName}</strong> was not approved.</p>
      ${notes ? `<p><strong>Note from owner:</strong> ${notes}</p>` : ''}
      <p>You may contact the facility for more information.</p>
    `),
  }
}

export function bookingReminderEmail(courtName: string, date: string, startTime: string, endTime: string) {
  return {
    subject: `Reminder: Booking Tomorrow — ${courtName}`,
    html: layout(`
      <h2 style="margin: 0 0 16px;">Booking Reminder</h2>
      <p>You have a booking tomorrow:</p>
      <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0; font-family: monospace;">
        <p style="margin: 4px 0;"><strong>Court:</strong> ${courtName}</p>
        <p style="margin: 4px 0;"><strong>Date:</strong> ${date}</p>
        <p style="margin: 4px 0;"><strong>Time:</strong> ${startTime} – ${endTime}</p>
      </div>
    `),
  }
}
