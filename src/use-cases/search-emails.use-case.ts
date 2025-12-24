import moment from 'moment-timezone'
import { TIMEZONE } from '../config/constants.js'
import { searchEmails } from '../repositories/gmail.repository.js'
import type { Email, EmailsResponse } from '../types/calendar.types.js'

function formatEmailsForDisplay(emails: Email[]): string {
  if (emails.length === 0) {
    return 'No emails found.'
  }

  const lines: string[] = []

  for (const email of emails) {
    const time = moment.tz(email.date, TIMEZONE).format('HH:mm')
    const date = moment.tz(email.date, TIMEZONE).format('YYYY-MM-DD')
    const unreadMarker = email.isUnread ? '📬' : '📭'
    const fromName = email.from.split('<')[0].trim() || email.from

    lines.push(`${unreadMarker} ${date} ${time} - ${email.subject}`)
    lines.push(`   👤 ${fromName}`)
    lines.push(`   🆔 ${email.id}`)

    if (email.snippet) {
      const snippet =
        email.snippet.length > 80
          ? `${email.snippet.substring(0, 80)}...`
          : email.snippet
      lines.push(`   💬 ${snippet}`)
    }

    lines.push('')
  }

  return lines.join('\n')
}

export interface SearchEmailsInput {
  query: string
  maxResults?: number
}

export async function searchEmailsUseCase(
  input: SearchEmailsInput
): Promise<EmailsResponse> {
  if (!input.query || input.query.trim().length === 0) {
    throw new Error('Search query is required')
  }

  const maxResults = input.maxResults || 50
  const emails = await searchEmails(input.query.trim(), maxResults)
  const formattedEmails = formatEmailsForDisplay(emails)
  const unreadCount = emails.filter((e) => e.isUnread).length

  // Determine date range for display
  let dateLabel = 'Search results'
  if (emails.length > 0) {
    const dates = emails.map((e) => moment.tz(e.date, TIMEZONE).format('YYYY-MM-DD'))
    const uniqueDates = [...new Set(dates)]
    if (uniqueDates.length === 1) {
      dateLabel = uniqueDates[0]
    } else if (uniqueDates.length > 1) {
      dateLabel = `${uniqueDates[uniqueDates.length - 1]} to ${uniqueDates[0]}`
    }
  }

  return {
    emails,
    formattedEmails,
    date: dateLabel,
    totalCount: emails.length,
    unreadCount
  }
}

