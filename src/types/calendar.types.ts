export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  description: string
  attendees: string[]
  color: string
  isAllDay: boolean
  status: 'confirmed' | 'tentative' | 'cancelled'
}

export interface AgendaResponse {
  events: CalendarEvent[]
  formattedAgenda: string
  date: string
  totalMeetingTime: string
}

export type PeriodPreset = 'today' | 'tomorrow' | 'week' | 'next-week' | 'month'

export interface PeriodAgendaResponse {
  events: CalendarEvent[]
  formattedAgenda: string
  startDate: string
  endDate: string
  totalMeetingTime: string
  eventCount: number
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'

export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  interval?: number // Every X days/weeks/months/years (default: 1)
  count?: number // Number of occurrences
  until?: string // End date in YYYY-MM-DD format
  byDay?: Weekday[] // For weekly: which days (e.g., ['MO', 'WE', 'FR'])
  byMonthDay?: number[] // For monthly: which day of month (e.g., [1, 15])
}

// Google Calendar event colors (colorId 1-11)
export type EventColor =
  | 'lavender' // 1
  | 'sage' // 2
  | 'grape' // 3
  | 'flamingo' // 4 (red/pink)
  | 'banana' // 5 (yellow)
  | 'tangerine' // 6 (orange)
  | 'peacock' // 7 (cyan/teal)
  | 'graphite' // 8 (gray)
  | 'blueberry' // 9 (blue)
  | 'basil' // 10 (green)
  | 'tomato' // 11 (red)

export interface CreateEventInput {
  summary: string
  start: string
  end: string
  description?: string
  location?: string
  attendees?: string[]
  isAllDay?: boolean
  recurrence?: RecurrenceRule
  color?: EventColor
}

export interface CreateEventResponse {
  event: CalendarEvent
  eventLink: string
}

// Gmail types
export interface Email {
  id: string
  threadId: string
  subject: string
  from: string
  to: string
  date: Date
  snippet: string
  isUnread: boolean
  labels: string[]
}

export interface FullEmail extends Email {
  body: string
  cc?: string
  bcc?: string
  replyTo?: string
}

export interface EmailsResponse {
  emails: Email[]
  formattedEmails: string
  date: string
  totalCount: number
  unreadCount: number
}

export interface ReplyEmailInput {
  emailId: string
  body: string
}

export interface SendEmailResponse {
  id: string
  threadId: string
  success: boolean
}
