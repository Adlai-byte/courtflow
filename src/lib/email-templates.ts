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

export function batchBookingConfirmedEmail(
  bookings: Array<{ courtName: string; date: string; startTime: string; endTime: string; recurring?: boolean }>
) {
  const rows = bookings
    .map(
      (b) => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; font-family: monospace; font-size: 13px;">${b.courtName}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; font-family: monospace; font-size: 13px;">${b.date}${b.recurring ? ' (recurring)' : ''}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; font-family: monospace; font-size: 13px;">${b.startTime} – ${b.endTime}</td>
        </tr>`
    )
    .join('')

  return {
    subject: `Bookings Confirmed — ${bookings.length} slot${bookings.length !== 1 ? 's' : ''}`,
    html: layout(`
      <h2 style="margin: 0 0 16px;">Bookings Confirmed</h2>
      <p>Your ${bookings.length} booking${bookings.length !== 1 ? 's have' : ' has'} been confirmed:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 8px 12px; text-align: left; font-family: monospace; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Court</th>
            <th style="padding: 8px 12px; text-align: left; font-family: monospace; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Date</th>
            <th style="padding: 8px 12px; text-align: left; font-family: monospace; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Time</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `),
  }
}

export function bookingPendingEmail(courtName: string, date: string, startTime: string, endTime: string) {
  return {
    subject: `Booking Submitted — ${courtName} on ${date}`,
    html: layout(`
      <h2 style="margin: 0 0 16px;">Booking Submitted</h2>
      <p>Your booking has been submitted and is <strong>awaiting approval</strong> from the facility owner.</p>
      <div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 16px 0; font-family: monospace;">
        <p style="margin: 4px 0;"><strong>Court:</strong> ${courtName}</p>
        <p style="margin: 4px 0;"><strong>Date:</strong> ${date}</p>
        <p style="margin: 4px 0;"><strong>Time:</strong> ${startTime} – ${endTime}</p>
        <p style="margin: 4px 0;"><strong>Status:</strong> Pending Approval</p>
      </div>
      <p style="color: #666;">You'll receive an email once the owner approves or responds to your request.</p>
    `),
  }
}

export function batchBookingPendingEmail(
  bookings: Array<{ courtName: string; date: string; startTime: string; endTime: string; recurring?: boolean }>
) {
  const rows = bookings
    .map(
      (b) => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; font-family: monospace; font-size: 13px;">${b.courtName}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; font-family: monospace; font-size: 13px;">${b.date}${b.recurring ? ' (recurring)' : ''}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; font-family: monospace; font-size: 13px;">${b.startTime} – ${b.endTime}</td>
        </tr>`
    )
    .join('')

  return {
    subject: `Bookings Submitted — ${bookings.length} slot${bookings.length !== 1 ? 's' : ''} awaiting approval`,
    html: layout(`
      <h2 style="margin: 0 0 16px;">Bookings Submitted</h2>
      <p>Your ${bookings.length} booking${bookings.length !== 1 ? 's are' : ' is'} <strong>awaiting approval</strong>:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background: #fffbeb;">
            <th style="padding: 8px 12px; text-align: left; font-family: monospace; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Court</th>
            <th style="padding: 8px 12px; text-align: left; font-family: monospace; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Date</th>
            <th style="padding: 8px 12px; text-align: left; font-family: monospace; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Time</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color: #666;">You'll receive an email once the owner approves or responds to each request.</p>
    `),
  }
}

export function bookingApprovedEmail(courtName: string, date: string, startTime: string, endTime: string) {
  return {
    subject: `Booking Approved — ${courtName} on ${date}`,
    html: layout(`
      <h2 style="margin: 0 0 16px;">Booking Approved!</h2>
      <p>Your booking has been <strong>approved</strong> and confirmed:</p>
      <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 16px; margin: 16px 0; font-family: monospace;">
        <p style="margin: 4px 0;"><strong>Court:</strong> ${courtName}</p>
        <p style="margin: 4px 0;"><strong>Date:</strong> ${date}</p>
        <p style="margin: 4px 0;"><strong>Time:</strong> ${startTime} – ${endTime}</p>
        <p style="margin: 4px 0;"><strong>Status:</strong> Confirmed</p>
      </div>
    `),
  }
}

export function bookingRejectedEmail(courtName: string, date: string, startTime: string, endTime: string) {
  return {
    subject: `Booking Not Approved — ${courtName} on ${date}`,
    html: layout(`
      <h2 style="margin: 0 0 16px;">Booking Not Approved</h2>
      <p>Unfortunately, your booking request was <strong>not approved</strong>:</p>
      <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 16px; margin: 16px 0; font-family: monospace;">
        <p style="margin: 4px 0;"><strong>Court:</strong> ${courtName}</p>
        <p style="margin: 4px 0;"><strong>Date:</strong> ${date}</p>
        <p style="margin: 4px 0;"><strong>Time:</strong> ${startTime} – ${endTime}</p>
      </div>
      <p style="color: #666;">The time slot is now available for other bookings. Feel free to try a different slot.</p>
    `),
  }
}

export function newBookingRequestEmail(customerName: string, courtName: string, date: string, startTime: string, endTime: string, tenantName: string) {
  return {
    subject: `New Booking Request — ${courtName} on ${date}`,
    html: layout(`
      <h2 style="margin: 0 0 16px;">New Booking Request</h2>
      <p><strong>${customerName}</strong> has requested a booking at <strong>${tenantName}</strong>:</p>
      <div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 16px 0; font-family: monospace;">
        <p style="margin: 4px 0;"><strong>Court:</strong> ${courtName}</p>
        <p style="margin: 4px 0;"><strong>Date:</strong> ${date}</p>
        <p style="margin: 4px 0;"><strong>Time:</strong> ${startTime} – ${endTime}</p>
      </div>
      <p>Log into your dashboard to approve or reject this request.</p>
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
