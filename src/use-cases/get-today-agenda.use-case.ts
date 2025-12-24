import { getEventsByDate } from '../repositories/google-calendar.repository.js'
import {
  calculateTotalMeetingTime,
  filterEventsByDate,
  formatAgendaForDisplay,
  formatMeetingTime
} from '../services/calendar.service.js'
import type { AgendaResponse } from '../types/calendar.types.js'

export async function getTodayAgenda(date?: string): Promise<AgendaResponse> {
  const targetDate = date ? new Date(date) : new Date()

  const events = await getEventsByDate(targetDate)
  const filteredEvents = filterEventsByDate(events, targetDate)
  const formattedAgenda = formatAgendaForDisplay(filteredEvents)
  const totalMeetingTime = formatMeetingTime(
    calculateTotalMeetingTime(filteredEvents)
  )

  return {
    events: filteredEvents,
    formattedAgenda,
    date: targetDate.toISOString().split('T')[0],
    totalMeetingTime
  }
}
