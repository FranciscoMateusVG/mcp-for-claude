import moment from 'moment-timezone'
import { TIMEZONE } from '../config/constants.js'
import {
  createEvent,
  completeEvent,
  completeEvents,
  getEventsByDate
} from '../repositories/google-calendar.repository.js'
import type {
  CalendarEvent,
  CreateEventResponse
} from '../types/calendar.types.js'

const TASK_WINDOW_START_HOUR = 1
const TASK_WINDOW_END_HOUR = 5
const TASK_DURATION_MINUTES = 15

export async function createTask(
  title: string,
  description?: string
): Promise<CreateEventResponse> {
  const now = new Date()
  const events = await getEventsByDate(now)

  const dayStart = moment.tz(now, TIMEZONE).startOf('day')
  const windowStart = dayStart.clone().add(TASK_WINDOW_START_HOUR, 'hours')
  const windowEnd = dayStart.clone().add(TASK_WINDOW_END_HOUR, 'hours')

  // Filter events that overlap with the task window
  const windowEvents = events.filter((e) => {
    const eStart = moment.tz(e.start, TIMEZONE)
    const eEnd = moment.tz(e.end, TIMEZONE)
    return eStart.isBefore(windowEnd) && eEnd.isAfter(windowStart)
  })

  // Walk from window start in 15-min increments to find first free slot
  let slotStart = windowStart.clone()
  let foundSlot = false

  while (slotStart.clone().add(TASK_DURATION_MINUTES, 'minutes').isSameOrBefore(windowEnd)) {
    const slotEnd = slotStart.clone().add(TASK_DURATION_MINUTES, 'minutes')

    const hasConflict = windowEvents.some((e) => {
      const eStart = moment.tz(e.start, TIMEZONE)
      const eEnd = moment.tz(e.end, TIMEZONE)
      return eStart.isBefore(slotEnd) && eEnd.isAfter(slotStart)
    })

    if (!hasConflict) {
      foundSlot = true
      break
    }

    slotStart.add(TASK_DURATION_MINUTES, 'minutes')
  }

  if (!foundSlot) {
    throw new Error('No free slot available between 1:00 AM and 5:00 AM')
  }

  const start = slotStart.format()
  const end = slotStart.clone().add(TASK_DURATION_MINUTES, 'minutes').format()

  return createEvent({
    summary: title,
    description,
    start,
    end,
    color: 'flamingo'
  })
}

export async function getTodayTasks(): Promise<CalendarEvent[]> {
  const events = await getEventsByDate(new Date())
  return events.filter((e) => e.color === 'flamingo')
}

export async function completeTask(eventId: string): Promise<CalendarEvent> {
  if (!eventId) {
    throw new Error('Event ID is required')
  }
  return completeEvent(eventId)
}

export async function completeTasks(
  eventIds: string[]
): Promise<CalendarEvent[]> {
  if (!eventIds.length) {
    throw new Error('At least one event ID is required')
  }
  return completeEvents(eventIds)
}
