import moment from 'moment-timezone'
import { TIMEZONE } from '../config/constants.js'
import { getEventsByDateRange } from '../repositories/google-calendar.repository.js'
import {
  calculateTotalMeetingTime,
  formatAgendaForDisplay,
  formatMeetingTime
} from '../services/calendar.service.js'
import type {
  PeriodAgendaResponse,
  PeriodPreset
} from '../types/calendar.types.js'

interface DateRange {
  start: Date
  end: Date
}

function getDateRangeFromPreset(preset: PeriodPreset): DateRange {
  const now = moment.tz(TIMEZONE)

  switch (preset) {
    case 'today':
      return {
        start: now.clone().startOf('day').toDate(),
        end: now.clone().endOf('day').toDate()
      }
    case 'tomorrow':
      return {
        start: now.clone().add(1, 'day').startOf('day').toDate(),
        end: now.clone().add(1, 'day').endOf('day').toDate()
      }
    case 'week':
      return {
        start: now.clone().startOf('day').toDate(),
        end: now.clone().endOf('week').toDate()
      }
    case 'next-week':
      return {
        start: now.clone().add(1, 'week').startOf('week').toDate(),
        end: now.clone().add(1, 'week').endOf('week').toDate()
      }
    case 'month':
      return {
        start: now.clone().startOf('day').toDate(),
        end: now.clone().endOf('month').toDate()
      }
  }
}

export interface GetAgendaByPeriodInput {
  preset?: PeriodPreset
  startDate?: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD
}

export async function getAgendaByPeriod(
  input: GetAgendaByPeriodInput
): Promise<PeriodAgendaResponse> {
  let dateRange: DateRange

  if (input.preset) {
    dateRange = getDateRangeFromPreset(input.preset)
  } else if (input.startDate && input.endDate) {
    dateRange = {
      start: moment.tz(input.startDate, TIMEZONE).startOf('day').toDate(),
      end: moment.tz(input.endDate, TIMEZONE).endOf('day').toDate()
    }
  } else {
    // Default to today
    dateRange = getDateRangeFromPreset('today')
  }

  const events = await getEventsByDateRange(dateRange.start, dateRange.end)
  const formattedAgenda = formatAgendaForDisplay(events)
  const totalMeetingTime = formatMeetingTime(calculateTotalMeetingTime(events))

  return {
    events,
    formattedAgenda,
    startDate: moment(dateRange.start).format('YYYY-MM-DD'),
    endDate: moment(dateRange.end).format('YYYY-MM-DD'),
    totalMeetingTime,
    eventCount: events.length
  }
}


