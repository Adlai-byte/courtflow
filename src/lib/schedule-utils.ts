import type { Court, Booking } from '@/lib/types'

export type SlotState = 'available' | 'booked_by_others' | 'booked_by_you' | 'pending_by_you' | 'past' | 'in_cart'

export interface GridSlot {
  courtId: string
  start: string   // HH:MM
  end: string     // HH:MM
  state: SlotState | 'closed'
  colSpan: number
  colStart: number // 0-based index into time columns
}

const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export function getDayName(date: Date): string {
  return dayNames[date.getDay()]
}

function gcd(a: number, b: number): number {
  while (b) {
    ;[a, b] = [b, a % b]
  }
  return a
}

/** Compute the GCD of all visible courts' slot durations for unified time axis. */
export function computeBaseInterval(courts: Court[]): number {
  if (courts.length === 0) return 60
  const durations = courts.map((c) =>
    c.booking_mode === 'fixed_slot' ? c.slot_duration_minutes : c.min_duration_minutes
  )
  return durations.reduce((acc, d) => gcd(acc, d), durations[0])
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function fromMinutes(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Generate time column headers from earliest open to latest close across all courts. */
export function generateTimeColumns(
  courts: Court[],
  dayOfWeek: string,
  baseInterval: number
): { time: string; label: string }[] {
  let earliest = 24 * 60
  let latest = 0

  for (const court of courts) {
    const hours = court.operating_hours[dayOfWeek]
    if (!hours) continue
    const open = toMinutes(hours.open)
    const close = toMinutes(hours.close)
    if (open < earliest) earliest = open
    if (close > latest) latest = close
  }

  if (earliest >= latest) return []

  const columns: { time: string; label: string }[] = []
  for (let m = earliest; m < latest; m += baseInterval) {
    const time = fromMinutes(m)
    // Build a compact label
    const h = Math.floor(m / 60)
    const min = m % 60
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    const period = h >= 12 ? 'PM' : 'AM'
    const label = min === 0 ? `${h12} ${period}` : `${h12}:${String(min).padStart(2, '0')}`
    columns.push({ time, label })
  }

  return columns
}

/** Generate grid slots for one court on the unified axis. */
export function generateCourtSlots(
  court: Court,
  dayOfWeek: string,
  baseInterval: number,
  timeColumns: { time: string }[],
  bookings: Booking[],
  currentUserId: string | undefined,
  dateStr: string,
  isInCart: (courtId: string, date: string, startTime: string) => boolean,
  closureDates: string[]
): GridSlot[] {
  if (timeColumns.length === 0) return []

  const isClosed = closureDates.includes(dateStr)
  const hours = court.operating_hours[dayOfWeek]

  // If court has no hours for this day or is closed, return one merged closed cell
  if (!hours || isClosed) {
    return [{
      courtId: court.id,
      start: timeColumns[0].time,
      end: timeColumns[timeColumns.length - 1].time,
      state: 'closed',
      colSpan: timeColumns.length,
      colStart: 0,
    }]
  }

  const courtOpen = toMinutes(hours.open)
  const courtClose = toMinutes(hours.close)
  const duration = court.booking_mode === 'fixed_slot'
    ? court.slot_duration_minutes
    : court.min_duration_minutes
  const slotSpan = duration / baseInterval

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const courtBookings = bookings.filter((b) => b.court_id === court.id)

  const slots: GridSlot[] = []

  // Track which columns have been covered
  let colIdx = 0
  while (colIdx < timeColumns.length) {
    const colMinutes = toMinutes(timeColumns[colIdx].time)

    // Before court opens
    if (colMinutes < courtOpen) {
      // Find how many columns before open
      let spanCount = 0
      let j = colIdx
      while (j < timeColumns.length && toMinutes(timeColumns[j].time) < courtOpen) {
        spanCount++
        j++
      }
      slots.push({
        courtId: court.id,
        start: timeColumns[colIdx].time,
        end: fromMinutes(courtOpen),
        state: 'closed',
        colSpan: spanCount,
        colStart: colIdx,
      })
      colIdx += spanCount
      continue
    }

    // After court closes
    if (colMinutes >= courtClose) {
      const remaining = timeColumns.length - colIdx
      slots.push({
        courtId: court.id,
        start: timeColumns[colIdx].time,
        end: timeColumns[timeColumns.length - 1].time,
        state: 'closed',
        colSpan: remaining,
        colStart: colIdx,
      })
      break
    }

    // Within operating hours — generate a slot
    const slotStart = fromMinutes(colMinutes)
    const slotEndMinutes = colMinutes + duration
    const slotEnd = fromMinutes(slotEndMinutes)

    // If slot would go past closing time, mark rest as closed
    if (slotEndMinutes > courtClose) {
      const remaining = timeColumns.length - colIdx
      slots.push({
        courtId: court.id,
        start: slotStart,
        end: fromMinutes(courtClose),
        state: 'closed',
        colSpan: remaining,
        colStart: colIdx,
      })
      break
    }

    // Determine slot state
    let state: SlotState

    // Past check
    if (dateStr < today) {
      state = 'past'
    } else if (dateStr === today) {
      const slotEndDate = new Date(`${dateStr}T${slotEnd}:00`)
      if (slotEndDate <= now) {
        state = 'past'
      } else {
        state = getSlotAvailability(
          court.id, slotStart, slotEnd, courtBookings, currentUserId, dateStr, isInCart
        )
      }
    } else {
      state = getSlotAvailability(
        court.id, slotStart, slotEnd, courtBookings, currentUserId, dateStr, isInCart
      )
    }

    slots.push({
      courtId: court.id,
      start: slotStart,
      end: slotEnd,
      state,
      colSpan: slotSpan,
      colStart: colIdx,
    })

    colIdx += slotSpan
  }

  return slots
}

function getSlotAvailability(
  courtId: string,
  start: string,
  end: string,
  bookings: Booking[],
  currentUserId: string | undefined,
  dateStr: string,
  isInCart: (courtId: string, date: string, startTime: string) => boolean
): SlotState {
  const overlapping = bookings.find(
    (b) =>
      (b.status === 'confirmed' || b.status === 'pending') &&
      b.start_time < end + ':00' &&
      b.end_time > start + ':00'
  )

  if (overlapping) {
    if (currentUserId && overlapping.customer_id === currentUserId) {
      return overlapping.status === 'pending' ? 'pending_by_you' : 'booked_by_you'
    }
    return 'booked_by_others'
  }

  if (isInCart(courtId, dateStr, start)) {
    return 'in_cart'
  }

  return 'available'
}
