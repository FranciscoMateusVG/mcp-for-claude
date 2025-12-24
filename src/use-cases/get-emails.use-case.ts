import moment from 'moment-timezone'
import { TIMEZONE } from '../config/constants.js'
import {
  getEmailsByDate,
  getEmailsByDateRange,
  getFullEmail,
  replyToEmail,
  trashEmails
} from '../repositories/gmail.repository.js'
import type {
  Email,
  EmailsResponse,
  FullEmail,
  SendEmailResponse
} from '../types/calendar.types.js'

function formatEmailsForDisplay(emails: Email[]): string {
  if (emails.length === 0) {
    return 'No emails found.'
  }

  const lines: string[] = []

  for (const email of emails) {
    const time = moment.tz(email.date, TIMEZONE).format('HH:mm')
    const unreadMarker = email.isUnread ? '📬' : '📭'
    const fromName = email.from.split('<')[0].trim() || email.from

    lines.push(`${unreadMarker} ${time} - ${email.subject}`)
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

export async function getTodayEmails(date?: string): Promise<EmailsResponse> {
  const targetDate = date ? new Date(date) : new Date()
  const emails = await getEmailsByDate(targetDate)
  const formattedEmails = formatEmailsForDisplay(emails)
  const unreadCount = emails.filter((e) => e.isUnread).length

  return {
    emails,
    formattedEmails,
    date: moment.tz(targetDate, TIMEZONE).format('YYYY-MM-DD'),
    totalCount: emails.length,
    unreadCount
  }
}

export interface GetEmailsByPeriodInput {
  preset?: 'today' | 'yesterday' | 'week' | 'month'
  startDate?: string
  endDate?: string
}

export async function getEmailsByPeriod(
  input: GetEmailsByPeriodInput
): Promise<EmailsResponse> {
  const now = moment.tz(TIMEZONE)
  let startDate: Date
  let endDate: Date

  if (input.preset) {
    switch (input.preset) {
      case 'today':
        startDate = now.clone().startOf('day').toDate()
        endDate = now.clone().endOf('day').toDate()
        break
      case 'yesterday':
        startDate = now.clone().subtract(1, 'day').startOf('day').toDate()
        endDate = now.clone().subtract(1, 'day').endOf('day').toDate()
        break
      case 'week':
        startDate = now.clone().startOf('week').toDate()
        endDate = now.clone().endOf('day').toDate()
        break
      case 'month':
        startDate = now.clone().startOf('month').toDate()
        endDate = now.clone().endOf('day').toDate()
        break
    }
  } else if (input.startDate && input.endDate) {
    startDate = moment.tz(input.startDate, TIMEZONE).startOf('day').toDate()
    endDate = moment.tz(input.endDate, TIMEZONE).endOf('day').toDate()
  } else {
    startDate = now.clone().startOf('day').toDate()
    endDate = now.clone().endOf('day').toDate()
  }

  const emails = await getEmailsByDateRange(startDate, endDate)
  const formattedEmails = formatEmailsForDisplay(emails)
  const unreadCount = emails.filter((e) => e.isUnread).length

  const dateLabel =
    moment(startDate).format('YYYY-MM-DD') ===
    moment(endDate).format('YYYY-MM-DD')
      ? moment(startDate).format('YYYY-MM-DD')
      : `${moment(startDate).format('YYYY-MM-DD')} to ${moment(endDate).format(
          'YYYY-MM-DD'
        )}`

  return {
    emails,
    formattedEmails,
    date: dateLabel,
    totalCount: emails.length,
    unreadCount
  }
}

export async function readEmail(emailId: string): Promise<FullEmail> {
  if (!emailId) {
    throw new Error('Email ID is required')
  }
  return getFullEmail(emailId)
}

export async function trashEmailsBatch(
  emailIds: string[]
): Promise<{ trashedIds: string[]; count: number }> {
  if (!emailIds.length) {
    throw new Error('At least one email ID is required')
  }

  const trashedIds = await trashEmails(emailIds)
  return {
    trashedIds,
    count: trashedIds.length
  }
}

export async function replyEmail(
  emailId: string,
  body: string
): Promise<SendEmailResponse> {
  if (!emailId) {
    throw new Error('Email ID is required')
  }
  if (!body) {
    throw new Error('Reply body is required')
  }

  return replyToEmail(emailId, body)
}
