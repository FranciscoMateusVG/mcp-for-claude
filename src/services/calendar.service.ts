import moment from 'moment-timezone'
import { TIMEZONE } from '../config/constants.js'
import type { CalendarEvent } from '../types/calendar.types.js'

export function filterEventsByDate(
  events: CalendarEvent[],
  targetDate: Date
): CalendarEvent[] {
  const startOfDay = moment.tz(targetDate, TIMEZONE).startOf('day')
  const endOfDay = moment.tz(targetDate, TIMEZONE).endOf('day')

  return events.filter((event) => {
    const eventStart = moment.tz(event.start, TIMEZONE)
    const eventEnd = moment.tz(event.end, TIMEZONE)
    return eventStart.isBefore(endOfDay) && eventEnd.isAfter(startOfDay)
  })
}

export function formatAgendaForDisplay(events: CalendarEvent[]): string {
  if (events.length === 0) {
    return 'No events scheduled.'
  }

  const sorted = [...events].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  )

  // Group events by date
  const eventsByDate = new Map<string, CalendarEvent[]>()
  for (const event of sorted) {
    const dateKey = moment.tz(event.start, TIMEZONE).format('YYYY-MM-DD')
    if (!eventsByDate.has(dateKey)) {
      eventsByDate.set(dateKey, [])
    }
    eventsByDate.get(dateKey)!.push(event)
  }

  const lines: string[] = []
  const showDateHeaders = eventsByDate.size > 1

  for (const [dateKey, dayEvents] of eventsByDate) {
    if (showDateHeaders) {
      const dateLabel = moment(dateKey).format('dddd, MMM D')
      lines.push(`━━━ ${dateLabel} ━━━`)
      lines.push('')
    }

    for (const event of dayEvents) {
      if (event.isAllDay) {
        lines.push(`📅 [All Day] ${event.title}`)
      } else {
        const startTime = moment.tz(event.start, TIMEZONE).format('HH:mm')
        const endTime = moment.tz(event.end, TIMEZONE).format('HH:mm')
        lines.push(`🕐 ${startTime} - ${endTime}: ${event.title}`)
      }

      lines.push(`   🆔 ${event.id}`)

      if (event.description) {
        const desc =
          event.description.length > 100
            ? `${event.description.substring(0, 100)}...`
            : event.description
        lines.push(`   📝 ${desc}`)
      }

      if (event.attendees.length > 0) {
        const shown = event.attendees.slice(0, 3).join(', ')
        const extra =
          event.attendees.length > 3
            ? ` +${event.attendees.length - 3} more`
            : ''
        lines.push(`   👥 ${shown}${extra}`)
      }

      lines.push('')
    }
  }

  return lines.join('\n')
}

export function calculateTotalMeetingTime(events: CalendarEvent[]): number {
  return events
    .filter((e) => !e.isAllDay)
    .reduce(
      (total, e) => total + (e.end.getTime() - e.start.getTime()) / 60000,
      0
    )
}

export function formatMeetingTime(totalMinutes: number): string {
  if (totalMinutes === 0) return '0 minutes'

  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.round(totalMinutes % 60)

  if (hours === 0) return `${minutes} minutes`
  if (minutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`
  return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minutes`
}
