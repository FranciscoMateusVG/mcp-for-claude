import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import moment from 'moment-timezone'
import { z } from 'zod'
import { TIMEZONE } from '../config/constants.js'
import {
  getEmailsByPeriod,
  getTodayEmails,
  readEmail,
  replyEmail,
  trashEmailsBatch,
  type GetEmailsByPeriodInput
} from '../use-cases/get-emails.use-case.js'
import {
  searchEmailsUseCase,
  type SearchEmailsInput
} from '../use-cases/search-emails.use-case.js'

export function registerEmailTool(server: McpServer): void {
  server.registerTool(
    'get-today-emails',
    {
      title: 'Get Today Emails',
      description: 'Get emails received today from Gmail',
      inputSchema: {
        date: z
          .string()
          .optional()
          .describe('Optional date in YYYY-MM-DD format. Defaults to today.')
      }
    },
    async ({ date }) => {
      try {
        const result = await getTodayEmails(date)

        const text = [
          `📧 Emails for ${result.date}`,
          `📊 ${result.totalCount} email${
            result.totalCount !== 1 ? 's' : ''
          } (${result.unreadCount} unread)`,
          '',
          result.formattedEmails
        ].join('\n')

        return { content: [{ type: 'text', text }] }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          content: [
            { type: 'text', text: `Failed to retrieve emails: ${message}` }
          ]
        }
      }
    }
  )

  // Flexible period-based email tool
  server.registerTool(
    'get-emails',
    {
      title: 'Get Emails',
      description:
        'Get emails for a period (today, yesterday, week, month) or custom date range',
      inputSchema: {
        preset: z
          .enum(['today', 'yesterday', 'week', 'month'])
          .optional()
          .describe('Preset period: today, yesterday, week, month'),
        startDate: z
          .string()
          .optional()
          .describe(
            'Custom start date in YYYY-MM-DD format (use with endDate)'
          ),
        endDate: z
          .string()
          .optional()
          .describe('Custom end date in YYYY-MM-DD format (use with startDate)')
      }
    },
    async ({ preset, startDate, endDate }) => {
      try {
        const input: GetEmailsByPeriodInput = {
          preset: preset as
            | 'today'
            | 'yesterday'
            | 'week'
            | 'month'
            | undefined,
          startDate,
          endDate
        }

        const result = await getEmailsByPeriod(input)

        const text = [
          `📧 Emails for ${result.date}`,
          `📊 ${result.totalCount} email${
            result.totalCount !== 1 ? 's' : ''
          } (${result.unreadCount} unread)`,
          '',
          result.formattedEmails
        ].join('\n')

        return { content: [{ type: 'text', text }] }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          content: [
            { type: 'text', text: `Failed to retrieve emails: ${message}` }
          ]
        }
      }
    }
  )

  // Read full email
  server.registerTool(
    'read-email',
    {
      title: 'Read Email',
      description: 'Read the full content of an email by its ID',
      inputSchema: {
        emailId: z.string().describe('The ID of the email to read')
      }
    },
    async ({ emailId }) => {
      try {
        const email = await readEmail(emailId)

        const dateFormatted = moment
          .tz(email.date, TIMEZONE)
          .format('YYYY-MM-DD HH:mm')

        const lines = [
          `📧 ${email.subject}`,
          '',
          `👤 From: ${email.from}`,
          `📬 To: ${email.to}`
        ]

        if (email.cc) {
          lines.push(`📋 CC: ${email.cc}`)
        }

        lines.push(`📅 Date: ${dateFormatted}`)
        lines.push(`🆔 ID: ${email.id}`)
        lines.push('')
        lines.push('─'.repeat(50))
        lines.push('')
        lines.push(email.body || '(No content)')

        return { content: [{ type: 'text', text: lines.join('\n') }] }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          content: [{ type: 'text', text: `Failed to read email: ${message}` }]
        }
      }
    }
  )

  // Trash emails
  server.registerTool(
    'trash-emails',
    {
      title: 'Trash Emails',
      description: 'Move multiple emails to trash by their IDs',
      inputSchema: {
        emailIds: z
          .array(z.string())
          .describe('Array of email IDs to move to trash')
      }
    },
    async ({ emailIds }) => {
      try {
        const result = await trashEmailsBatch(emailIds)

        const text = [
          `🗑️ Moved ${result.count} email${
            result.count !== 1 ? 's' : ''
          } to trash!`
        ].join('\n')

        return { content: [{ type: 'text', text }] }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          content: [
            { type: 'text', text: `Failed to trash emails: ${message}` }
          ]
        }
      }
    }
  )

  // Reply to email
  server.registerTool(
    'reply-email',
    {
      title: 'Reply to Email',
      description: 'Send a reply to an email',
      inputSchema: {
        emailId: z.string().describe('The ID of the email to reply to'),
        body: z.string().describe('The reply message body')
      }
    },
    async ({ emailId, body }) => {
      try {
        const result = await replyEmail(emailId, body)

        const lines = [
          '✅ Reply sent successfully!',
          '',
          `🆔 Message ID: ${result.id}`,
          `🧵 Thread ID: ${result.threadId}`
        ]

        return { content: [{ type: 'text', text: lines.join('\n') }] }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          content: [{ type: 'text', text: `Failed to send reply: ${message}` }]
        }
      }
    }
  )

  // Search emails
  server.registerTool(
    'search-emails',
    {
      title: 'Search Emails',
      description:
        'Search emails using Gmail search syntax. Supports: from:email, to:email, subject:text, has:attachment, is:unread, after:YYYY/MM/DD, before:YYYY/MM/DD, and general text search',
      inputSchema: {
        query: z
          .string()
          .describe(
            'Gmail search query. Examples: "meeting notes", "from:john@example.com", "subject:invoice", "has:attachment", "is:unread", "after:2024/01/01"'
          ),
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(500)
          .optional()
          .describe(
            'Maximum number of results to return (default: 50, max: 500)'
          )
      }
    },
    async ({ query, maxResults }) => {
      try {
        const input: SearchEmailsInput = {
          query,
          maxResults
        }

        const result = await searchEmailsUseCase(input)

        const text = [
          `🔍 Search results for: "${query}"`,
          `📊 ${result.totalCount} email${
            result.totalCount !== 1 ? 's' : ''
          } found (${result.unreadCount} unread)`,
          `📅 Date range: ${result.date}`,
          '',
          result.formattedEmails
        ].join('\n')

        return { content: [{ type: 'text', text }] }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          content: [
            { type: 'text', text: `Failed to search emails: ${message}` }
          ]
        }
      }
    }
  )
}
