import { gmail_v1, google } from 'googleapis'
import moment from 'moment-timezone'
import { TIMEZONE } from '../config/constants.js'
import { getAuthClient } from '../config/google-auth.js'
import type {
  Email,
  FullEmail,
  SendEmailResponse
} from '../types/calendar.types.js'

function decodeBase64Url(data: string): string {
  // Gmail uses URL-safe base64
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(base64, 'base64').toString('utf-8')
}

function encodeBase64Url(data: string): string {
  return Buffer.from(data)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string
): string {
  const header = headers?.find(
    (h) => h.name?.toLowerCase() === name.toLowerCase()
  )
  return header?.value || ''
}

function mapGmailMessageToEmail(message: gmail_v1.Schema$Message): Email {
  const headers = message.payload?.headers
  const subject = getHeader(headers, 'Subject') || '(No Subject)'
  const from = getHeader(headers, 'From')
  const to = getHeader(headers, 'To')
  const dateStr = getHeader(headers, 'Date')

  const date = dateStr ? new Date(dateStr) : new Date()
  const isUnread = message.labelIds?.includes('UNREAD') || false
  const labels = message.labelIds || []

  return {
    id: message.id || '',
    threadId: message.threadId || '',
    subject,
    from,
    to,
    date,
    snippet: message.snippet || '',
    isUnread,
    labels
  }
}

export async function getEmailsByDate(date: Date): Promise<Email[]> {
  const authClient = getAuthClient()
  await authClient.ensureValidToken()

  const gmail = google.gmail({
    version: 'v1',
    auth: authClient.getClient()
  })

  // Build query for emails from the specific date
  const startOfDay = moment.tz(date, TIMEZONE).startOf('day')
  const endOfDay = moment.tz(date, TIMEZONE).endOf('day')

  // Gmail uses epoch seconds for after/before
  const afterEpoch = Math.floor(startOfDay.valueOf() / 1000)
  const beforeEpoch = Math.floor(endOfDay.valueOf() / 1000)

  const query = `after:${afterEpoch} before:${beforeEpoch}`

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 50
  })

  const messages = response.data.messages || []

  if (messages.length === 0) {
    return []
  }

  // Fetch full message details for each email
  const emails = await Promise.all(
    messages.map(async (msg) => {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'To', 'Date']
      })
      return mapGmailMessageToEmail(fullMessage.data)
    })
  )

  // Sort by date, newest first
  return emails.sort((a, b) => b.date.getTime() - a.date.getTime())
}

export async function getEmailsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<Email[]> {
  const authClient = getAuthClient()
  await authClient.ensureValidToken()

  const gmail = google.gmail({
    version: 'v1',
    auth: authClient.getClient()
  })

  const start = moment.tz(startDate, TIMEZONE).startOf('day')
  const end = moment.tz(endDate, TIMEZONE).endOf('day')

  const afterEpoch = Math.floor(start.valueOf() / 1000)
  const beforeEpoch = Math.floor(end.valueOf() / 1000)

  const query = `after:${afterEpoch} before:${beforeEpoch}`

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 100
  })

  const messages = response.data.messages || []

  if (messages.length === 0) {
    return []
  }

  const emails = await Promise.all(
    messages.map(async (msg) => {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'To', 'Date']
      })
      return mapGmailMessageToEmail(fullMessage.data)
    })
  )

  return emails.sort((a, b) => b.date.getTime() - a.date.getTime())
}

export async function getFullEmail(emailId: string): Promise<FullEmail> {
  const authClient = getAuthClient()
  await authClient.ensureValidToken()

  const gmail = google.gmail({
    version: 'v1',
    auth: authClient.getClient()
  })

  const response = await gmail.users.messages.get({
    userId: 'me',
    id: emailId,
    format: 'full'
  })

  const message = response.data
  const headers = message.payload?.headers
  const subject = getHeader(headers, 'Subject') || '(No Subject)'
  const from = getHeader(headers, 'From')
  const to = getHeader(headers, 'To')
  const cc = getHeader(headers, 'Cc')
  const bcc = getHeader(headers, 'Bcc')
  const replyTo = getHeader(headers, 'Reply-To')
  const dateStr = getHeader(headers, 'Date')

  const date = dateStr ? new Date(dateStr) : new Date()
  const isUnread = message.labelIds?.includes('UNREAD') || false
  const labels = message.labelIds || []

  // Extract body from the message
  let body = ''
  const payload = message.payload

  if (payload?.body?.data) {
    body = decodeBase64Url(payload.body.data)
  } else if (payload?.parts) {
    // Multi-part message - find text/plain or text/html
    const textPart = payload.parts.find(
      (p) => p.mimeType === 'text/plain' && p.body?.data
    )
    const htmlPart = payload.parts.find(
      (p) => p.mimeType === 'text/html' && p.body?.data
    )

    if (textPart?.body?.data) {
      body = decodeBase64Url(textPart.body.data)
    } else if (htmlPart?.body?.data) {
      // Strip HTML tags for plain text display
      body = decodeBase64Url(htmlPart.body.data).replace(/<[^>]*>/g, '')
    }

    // Check nested parts (for multipart/alternative)
    for (const part of payload.parts) {
      if (part.parts) {
        const nestedText = part.parts.find(
          (p) => p.mimeType === 'text/plain' && p.body?.data
        )
        if (nestedText?.body?.data) {
          body = decodeBase64Url(nestedText.body.data)
          break
        }
      }
    }
  }

  return {
    id: message.id || '',
    threadId: message.threadId || '',
    subject,
    from,
    to,
    cc: cc || undefined,
    bcc: bcc || undefined,
    replyTo: replyTo || undefined,
    date,
    snippet: message.snippet || '',
    body: body.trim(),
    isUnread,
    labels
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function trashEmails(emailIds: string[]): Promise<string[]> {
  // Optimistically return all email IDs immediately
  // Process deletions in the background to avoid blocking the server connection
  processTrashEmailsInBackground(emailIds).catch((error) => {
    // Log errors but don't throw - we've already returned optimistically
    console.error('Error processing trash emails in background:', error)
  })

  return emailIds
}

async function processTrashEmailsInBackground(
  emailIds: string[]
): Promise<void> {
  const authClient = getAuthClient()
  await authClient.ensureValidToken()

  const gmail = google.gmail({
    version: 'v1',
    auth: authClient.getClient()
  })

  const BATCH_SIZE = 9
  const DELAY_MS = 3000 // 3 seconds

  // Process emails in batches of 9 with 3 second delay between batches
  for (let i = 0; i < emailIds.length; i += BATCH_SIZE) {
    const batch = emailIds.slice(i, i + BATCH_SIZE)

    // Move batch of emails to trash
    await Promise.all(
      batch.map((id) =>
        gmail.users.messages
          .trash({
            userId: 'me',
            id
          })
          .catch((error) => {
            // Log individual errors but continue processing
            console.error(`Error trashing email ${id}:`, error)
          })
      )
    )

    // Add delay between batches (except after the last batch)
    if (i + BATCH_SIZE < emailIds.length) {
      await delay(DELAY_MS)
    }
  }
}

export async function searchEmails(
  query: string,
  maxResults: number = 50
): Promise<Email[]> {
  const authClient = getAuthClient()
  await authClient.ensureValidToken()

  const gmail = google.gmail({
    version: 'v1',
    auth: authClient.getClient()
  })

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults
  })

  const messages = response.data.messages || []

  if (messages.length === 0) {
    return []
  }

  // Fetch full message details for each email
  const emails = await Promise.all(
    messages.map(async (msg) => {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'To', 'Date']
      })
      return mapGmailMessageToEmail(fullMessage.data)
    })
  )

  // Sort by date, newest first
  return emails.sort((a, b) => b.date.getTime() - a.date.getTime())
}

export async function replyToEmail(
  emailId: string,
  replyBody: string
): Promise<SendEmailResponse> {
  const authClient = getAuthClient()
  await authClient.ensureValidToken()

  const gmail = google.gmail({
    version: 'v1',
    auth: authClient.getClient()
  })

  // Get the original email to extract reply info
  const original = await getFullEmail(emailId)

  // Determine reply-to address
  const replyToAddress = original.replyTo || original.from

  // Extract email address from "Name <email>" format
  const emailMatch = replyToAddress.match(/<([^>]+)>/)
  const toEmail = emailMatch ? emailMatch[1] : replyToAddress

  // Build the reply subject
  const replySubject = original.subject.startsWith('Re:')
    ? original.subject
    : `Re: ${original.subject}`

  // Get the user's email for the From header
  const profile = await gmail.users.getProfile({ userId: 'me' })
  const fromEmail = profile.data.emailAddress

  // Build the raw email message
  const messageParts = [
    `From: ${fromEmail}`,
    `To: ${toEmail}`,
    `Subject: ${replySubject}`,
    `In-Reply-To: ${emailId}`,
    `References: ${emailId}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    replyBody
  ]

  const rawMessage = encodeBase64Url(messageParts.join('\r\n'))

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: rawMessage,
      threadId: original.threadId
    }
  })

  return {
    id: response.data.id || '',
    threadId: response.data.threadId || '',
    success: true
  }
}
