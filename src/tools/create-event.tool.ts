import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type {
  CreateEventInput,
  EventColor,
  RecurrenceRule
} from '../types/calendar.types.js'
import {
  createCalendarEvent,
  createCalendarEvents
} from '../use-cases/create-calendar-event.use-case.js'

const recurrenceSchema = z
  .object({
    frequency: z
      .enum(['daily', 'weekly', 'monthly', 'yearly'])
      .describe('How often the event repeats'),
    interval: z
      .number()
      .optional()
      .describe('Repeat every X periods (default: 1)'),
    count: z.number().optional().describe('Number of occurrences'),
    until: z.string().optional().describe('End date in YYYY-MM-DD format'),
    byDay: z
      .array(z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']))
      .optional()
      .describe('For weekly: which days'),
    byMonthDay: z
      .array(z.number())
      .optional()
      .describe('For monthly: which days of month')
  })
  .optional()

const colorSchema = z
  .enum([
    'lavender', // light purple
    'sage', // light green
    'grape', // purple
    'flamingo', // red/pink
    'banana', // yellow
    'tangerine', // orange
    'peacock', // cyan/teal
    'graphite', // gray
    'blueberry', // blue
    'basil', // green
    'tomato' // red
  ])
  .optional()

export function registerCreateEventTool(server: McpServer): void {
  server.registerTool(
    'create-calendar-event',
    {
      title: 'Create Calendar Event',
      description:
        'Create a new event in Google Calendar (supports recurring events and colors)',
      inputSchema: {
        summary: z.string().describe('Event title/summary'),
        start: z
          .string()
          .describe(
            'Start time in ISO 8601 format (e.g., 2025-12-22T10:00:00-03:00)'
          ),
        end: z
          .string()
          .describe(
            'End time in ISO 8601 format (e.g., 2025-12-22T11:00:00-03:00)'
          ),
        description: z.string().optional().describe('Event description'),
        location: z.string().optional().describe('Event location'),
        attendees: z
          .array(z.string())
          .optional()
          .describe('List of attendee email addresses'),
        isAllDay: z
          .boolean()
          .optional()
          .describe('Whether this is an all-day event'),
        recurrence: recurrenceSchema.describe(
          'Recurrence rule for repeating events'
        ),
        color: colorSchema.describe('Event color/label')
      }
    },
    async ({
      summary,
      start,
      end,
      description,
      location,
      attendees,
      isAllDay,
      recurrence,
      color
    }) => {
      try {
        const result = await createCalendarEvent({
          summary,
          start,
          end,
          description,
          location,
          attendees,
          isAllDay,
          recurrence: recurrence as RecurrenceRule | undefined,
          color: color as EventColor | undefined
        })

        const event = result.event
        const lines = [
          '✅ Event created successfully!',
          '',
          `📌 ${event.title}`,
          `🆔 ${event.id}`,
          `🗓️ ${event.start.toLocaleString()} - ${event.end.toLocaleString()}`
        ]

        if (color) {
          lines.push(`🎨 Color: ${color}`)
        }

        if (recurrence) {
          lines.push(
            `🔄 Repeats ${recurrence.frequency}${
              recurrence.interval && recurrence.interval > 1
                ? ` every ${recurrence.interval}`
                : ''
            }`
          )
        }

        if (event.description) {
          lines.push(`📝 ${event.description}`)
        }

        if (result.eventLink) {
          lines.push(`🔗 ${result.eventLink}`)
        }

        return { content: [{ type: 'text', text: lines.join('\n') }] }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          content: [
            { type: 'text', text: `Failed to create event: ${message}` }
          ]
        }
      }
    }
  )

  // Batch create events tool
  const eventSchema = z.object({
    summary: z.string().describe('Event title/summary'),
    start: z.string().describe('Start time in ISO 8601 format'),
    end: z.string().describe('End time in ISO 8601 format'),
    description: z.string().optional().describe('Event description'),
    location: z.string().optional().describe('Event location'),
    attendees: z.array(z.string()).optional().describe('Attendee emails'),
    isAllDay: z.boolean().optional().describe('All-day event'),
    recurrence: recurrenceSchema,
    color: colorSchema
  })

  server.registerTool(
    'create-calendar-events',
    {
      title: 'Create Multiple Calendar Events',
      description: 'Create multiple events in Google Calendar at once',
      inputSchema: {
        events: z.array(eventSchema).describe('Array of events to create')
      }
    },
    async ({ events }) => {
      try {
        const inputs: CreateEventInput[] = events.map((e) => ({
          summary: e.summary,
          start: e.start,
          end: e.end,
          description: e.description,
          location: e.location,
          attendees: e.attendees,
          isAllDay: e.isAllDay,
          recurrence: e.recurrence as RecurrenceRule | undefined,
          color: e.color as EventColor | undefined
        }))

        const results = await createCalendarEvents(inputs)

        const lines = [`✅ Created ${results.length} events successfully!`, '']

        for (const result of results) {
          lines.push(`📌 ${result.event.title}`)
          lines.push(`   🆔 ${result.event.id}`)
          lines.push('')
        }

        return { content: [{ type: 'text', text: lines.join('\n') }] }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          content: [
            { type: 'text', text: `Failed to create events: ${message}` }
          ]
        }
      }
    }
  )
}
