import { calendar_v3, google } from 'googleapis'
import moment from 'moment-timezone'
import { TIMEZONE } from '../config/constants.js'
import { getAuthClient } from '../config/google-auth.js'
import type {
  CalendarEvent,
  CreateEventInput,
  CreateEventResponse,
  EventColor,
  RecurrenceRule
} from '../types/calendar.types.js'

function buildRRule(rule: RecurrenceRule): string {
  const parts: string[] = [`FREQ=${rule.frequency.toUpperCase()}`]

  if (rule.interval && rule.interval > 1) {
    parts.push(`INTERVAL=${rule.interval}`)
  }

  if (rule.byDay?.length) {
    parts.push(`BYDAY=${rule.byDay.join(',')}`)
  }

  if (rule.byMonthDay?.length) {
    parts.push(`BYMONTHDAY=${rule.byMonthDay.join(',')}`)
  }

  if (rule.count) {
    parts.push(`COUNT=${rule.count}`)
  } else if (rule.until) {
    // Format: YYYYMMDD
    parts.push(`UNTIL=${rule.until.replace(/-/g, '')}`)
  }

  return `RRULE:${parts.join(';')}`
}

const COLOR_ID_TO_NAME: Record<string, string> = {
  '1': 'lavender',
  '2': 'sage',
  '3': 'grape',
  '4': 'flamingo',
  '5': 'banana',
  '6': 'tangerine',
  '7': 'peacock',
  '8': 'graphite',
  '9': 'blueberry',
  '10': 'basil',
  '11': 'tomato'
}

const COLOR_NAME_TO_ID: Record<EventColor, string> = {
  lavender: '1',
  sage: '2',
  grape: '3',
  flamingo: '4',
  banana: '5',
  tangerine: '6',
  peacock: '7',
  graphite: '8',
  blueberry: '9',
  basil: '10',
  tomato: '11'
}

function mapGoogleStatus(
  googleStatus?: string | null
): 'confirmed' | 'tentative' | 'cancelled' {
  switch (googleStatus) {
    case 'confirmed':
      return 'confirmed'
    case 'tentative':
      return 'tentative'
    case 'cancelled':
      return 'cancelled'
    default:
      return 'confirmed'
  }
}

function mapGoogleEventToDomain(
  event: calendar_v3.Schema$Event
): CalendarEvent {
  const id = event.id || ''
  const title = event.summary || 'Untitled Event'
  const description = event.description || ''

  let start: Date
  let end: Date
  let isAllDay = false

  if (event.start?.date) {
    start = moment.tz(event.start.date, TIMEZONE).toDate()
    end = moment.tz(event.end?.date || event.start.date, TIMEZONE).toDate()
    isAllDay = true
  } else {
    start = new Date(event.start?.dateTime || '')
    end = new Date(event.end?.dateTime || '')
  }

  const attendees = event.attendees?.map((a) => a.email || '') || []
  const status = mapGoogleStatus(event.status)
  const color = COLOR_ID_TO_NAME[event.colorId || ''] || 'default'

  return {
    id,
    title,
    start,
    end,
    description,
    attendees,
    color,
    isAllDay,
    status
  }
}

export async function getEventsByDate(date: Date): Promise<CalendarEvent[]> {
  const startOfDay = moment.tz(date, TIMEZONE).startOf('day')
  const endOfDay = moment.tz(date, TIMEZONE).endOf('day')
  return getEventsByDateRange(startOfDay.toDate(), endOfDay.toDate())
}

export async function getEventsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  const authClient = getAuthClient()
  await authClient.ensureValidToken()

  const calendar = google.calendar({
    version: 'v3',
    auth: authClient.getClient()
  })

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: moment.tz(startDate, TIMEZONE).toISOString(),
    timeMax: moment.tz(endDate, TIMEZONE).toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    timeZone: TIMEZONE
  })

  return (response.data.items || []).map(mapGoogleEventToDomain)
}

export async function createEvent(
  input: CreateEventInput
): Promise<CreateEventResponse> {
  const authClient = getAuthClient()
  await authClient.ensureValidToken()

  const calendar = google.calendar({
    version: 'v3',
    auth: authClient.getClient()
  })

  const googleEvent: calendar_v3.Schema$Event = {
    summary: input.summary,
    description: input.description,
    location: input.location
  }

  if (input.isAllDay) {
    const startDate = moment(input.start).format('YYYY-MM-DD')
    const endDate = moment(input.end).format('YYYY-MM-DD')
    googleEvent.start = { date: startDate, timeZone: TIMEZONE }
    googleEvent.end = { date: endDate, timeZone: TIMEZONE }
  } else {
    googleEvent.start = { dateTime: input.start, timeZone: TIMEZONE }
    googleEvent.end = { dateTime: input.end, timeZone: TIMEZONE }
  }

  if (input.attendees?.length) {
    googleEvent.attendees = input.attendees.map((email) => ({ email }))
  }

  if (input.recurrence) {
    googleEvent.recurrence = [buildRRule(input.recurrence)]
  }

  if (input.color) {
    googleEvent.colorId = COLOR_NAME_TO_ID[input.color]
  }

  // Disable all notifications/reminders
  googleEvent.reminders = {
    useDefault: false,
    overrides: []
  }

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: googleEvent,
    sendUpdates: 'all'
  })

  const createdEvent = response.data

  return {
    event: mapGoogleEventToDomain(createdEvent),
    eventLink: createdEvent.htmlLink || ''
  }
}

export async function completeEvent(eventId: string): Promise<CalendarEvent> {
  const authClient = getAuthClient()
  await authClient.ensureValidToken()

  const calendar = google.calendar({
    version: 'v3',
    auth: authClient.getClient()
  })

  const response = await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    requestBody: {
      colorId: COLOR_NAME_TO_ID['graphite']
    }
  })

  return mapGoogleEventToDomain(response.data)
}

export async function createEvents(
  inputs: CreateEventInput[]
): Promise<CreateEventResponse[]> {
  const authClient = getAuthClient()
  await authClient.ensureValidToken()

  return Promise.all(inputs.map((input) => createEvent(input)))
}

export async function completeEvents(
  eventIds: string[]
): Promise<CalendarEvent[]> {
  const authClient = getAuthClient()
  await authClient.ensureValidToken()

  return Promise.all(eventIds.map((id) => completeEvent(id)))
}
