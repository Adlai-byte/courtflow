/**
 * Convert 24hr time string to 12hr format.
 * "14:00" → "2:00 PM", "08:00" → "8:00 AM", "00:00" → "12:00 AM"
 */
export function to12Hr(time24: string): string {
  const [hStr, mStr] = time24.split(':')
  let h = parseInt(hStr, 10)
  const m = mStr ?? '00'
  const period = h >= 12 ? 'PM' : 'AM'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return `${h}:${m} ${period}`
}

/**
 * Build a compact slot label like "8–9 AM", "11 AM–12 PM", "12–1 PM".
 * When both times share the same AM/PM period the suffix appears once at the end.
 */
export function toSlotLabel(start: string, end: string): string {
  const parse = (t: string) => {
    const [hStr, mStr] = t.split(':')
    let h = parseInt(hStr, 10)
    const m = parseInt(mStr ?? '0', 10)
    const period = h >= 12 ? 'PM' : 'AM'
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return { h12, m, period }
  }

  const s = parse(start)
  const e = parse(end)

  const fmt = (h: number, m: number) => (m === 0 ? `${h}` : `${h}:${String(m).padStart(2, '0')}`)

  const startStr = fmt(s.h12, s.m)
  const endStr = fmt(e.h12, e.m)

  if (s.period === e.period) {
    return `${startStr}\u2013${endStr} ${s.period}`
  }
  return `${startStr} ${s.period}\u2013${endStr} ${e.period}`
}
