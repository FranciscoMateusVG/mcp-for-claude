import {
  completeEvent,
  completeEvents
} from '../repositories/google-calendar.repository.js'
import type { CalendarEvent } from '../types/calendar.types.js'

export async function completeCalendarEvent(
  eventId: string
): Promise<CalendarEvent> {
  if (!eventId) {
    throw new Error('Event ID is required')
  }

  return completeEvent(eventId)
}

export async function completeCalendarEvents(
  eventIds: string[]
): Promise<CalendarEvent[]> {
  if (!eventIds.length) {
    throw new Error('At least one event ID is required')
  }

  return completeEvents(eventIds)
}

