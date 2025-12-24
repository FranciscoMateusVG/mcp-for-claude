import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import {
  completeCalendarEvent,
  completeCalendarEvents
} from '../use-cases/complete-event.use-case.js'

export function registerCompleteEventTool(server: McpServer): void {
  server.registerTool(
    'complete-calendar-event',
    {
      title: 'Complete Calendar Event',
      description:
        'Mark a calendar event as completed by changing its color to gray',
      inputSchema: {
        eventId: z.string().describe('The ID of the event to mark as completed')
      }
    },
    async ({ eventId }) => {
      try {
        const event = await completeCalendarEvent(eventId)

        const lines = [
          '✅ Event marked as completed!',
          '',
          `📌 ${event.title}`,
          `🎨 Color changed to graphite (gray)`
        ]

        return { content: [{ type: 'text', text: lines.join('\n') }] }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          content: [
            { type: 'text', text: `Failed to complete event: ${message}` }
          ]
        }
      }
    }
  )

  server.registerTool(
    'complete-calendar-events',
    {
      title: 'Complete Multiple Calendar Events',
      description:
        'Mark multiple calendar events as completed by changing their color to gray',
      inputSchema: {
        eventIds: z
          .array(z.string())
          .describe('Array of event IDs to mark as completed')
      }
    },
    async ({ eventIds }) => {
      try {
        const events = await completeCalendarEvents(eventIds)

        const lines = [`✅ Marked ${events.length} events as completed!`, '']

        for (const event of events) {
          lines.push(`📌 ${event.title}`)
        }

        return { content: [{ type: 'text', text: lines.join('\n') }] }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          content: [
            { type: 'text', text: `Failed to complete events: ${message}` }
          ]
        }
      }
    }
  )
}
