import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getTodayAgenda } from '../use-cases/get-today-agenda.use-case.js'
import {
  getAgendaByPeriod,
  type GetAgendaByPeriodInput
} from '../use-cases/get-agenda-by-period.use-case.js'
import type { PeriodPreset } from '../types/calendar.types.js'

export function registerAgendaTool(server: McpServer): void {
  // Simple today's agenda tool (kept for backwards compatibility)
  server.registerTool(
    'get-today-agenda',
    {
      title: 'Get Today Agenda',
      description:
        'Get calendar events for today or a specific date from Google Calendar',
      inputSchema: {
        date: z
          .string()
          .optional()
          .describe('Optional date in YYYY-MM-DD format. Defaults to today.')
      }
    },
    async ({ date }) => {
      try {
        const agenda = await getTodayAgenda(date)

        const text = [
          `📆 Agenda for ${agenda.date}`,
          `⏱️ Total meeting time: ${agenda.totalMeetingTime}`,
          '',
          agenda.formattedAgenda
        ].join('\n')

        return { content: [{ type: 'text', text }] }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          content: [
            { type: 'text', text: `Failed to retrieve agenda: ${message}` }
          ]
        }
      }
    }
  )

  // Flexible period-based agenda tool
  server.registerTool(
    'get-agenda',
    {
      title: 'Get Calendar Agenda',
      description:
        'Get calendar events for a period (today, tomorrow, week, next-week, month) or custom date range',
      inputSchema: {
        preset: z
          .enum(['today', 'tomorrow', 'week', 'next-week', 'month'])
          .optional()
          .describe(
            'Preset period: today, tomorrow, week (rest of this week), next-week, month (rest of this month)'
          ),
        startDate: z
          .string()
          .optional()
          .describe('Custom start date in YYYY-MM-DD format (use with endDate)'),
        endDate: z
          .string()
          .optional()
          .describe('Custom end date in YYYY-MM-DD format (use with startDate)')
      }
    },
    async ({ preset, startDate, endDate }) => {
      try {
        const input: GetAgendaByPeriodInput = {
          preset: preset as PeriodPreset | undefined,
          startDate,
          endDate
        }

        const agenda = await getAgendaByPeriod(input)

        const periodLabel =
          agenda.startDate === agenda.endDate
            ? agenda.startDate
            : `${agenda.startDate} to ${agenda.endDate}`

        const text = [
          `📆 Agenda for ${periodLabel}`,
          `📊 ${agenda.eventCount} event${agenda.eventCount !== 1 ? 's' : ''}`,
          `⏱️ Total meeting time: ${agenda.totalMeetingTime}`,
          '',
          agenda.formattedAgenda
        ].join('\n')

        return { content: [{ type: 'text', text }] }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          content: [
            { type: 'text', text: `Failed to retrieve agenda: ${message}` }
          ]
        }
      }
    }
  )
}
