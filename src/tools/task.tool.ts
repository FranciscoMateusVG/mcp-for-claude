import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import moment from 'moment-timezone'
import { z } from 'zod'
import { TIMEZONE } from '../config/constants.js'
import {
  createTask,
  completeTasks,
  getTodayTasks
} from '../use-cases/task.use-case.js'

export function registerTaskTool(server: McpServer): void {
  server.registerTool(
    'create-task',
    {
      title: 'Create Task',
      description:
        'Create a new task. The task is stored as a flamingo-colored calendar event scheduled in the first free 15-minute slot between 1:00 AM and 5:00 AM today.',
      inputSchema: {
        title: z.string().describe('Task title'),
        description: z.string().optional().describe('Task description')
      }
    },
    async ({ title, description }) => {
      try {
        const result = await createTask(title, description)
        const event = result.event
        const startTime = moment.tz(event.start, TIMEZONE).format('HH:mm')
        const endTime = moment.tz(event.end, TIMEZONE).format('HH:mm')

        const lines = [
          '✅ Task created!',
          '',
          `📌 ${event.title}`,
          `🆔 ${event.id}`,
          `🕐 ${startTime} - ${endTime}`
        ]

        if (event.description) {
          lines.push(`📝 ${event.description}`)
        }

        return { content: [{ type: 'text', text: lines.join('\n') }] }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          content: [
            { type: 'text', text: `Failed to create task: ${message}` }
          ]
        }
      }
    }
  )

  server.registerTool(
    'get-tasks',
    {
      title: 'Get Tasks',
      description:
        "Get today's pending tasks (flamingo-colored calendar events).",
      inputSchema: {}
    },
    async () => {
      try {
        const tasks = await getTodayTasks()

        if (tasks.length === 0) {
          return {
            content: [{ type: 'text', text: 'No pending tasks for today.' }]
          }
        }

        const lines = [`📋 ${tasks.length} pending task(s):`, '']

        for (const task of tasks) {
          const startTime = moment.tz(task.start, TIMEZONE).format('HH:mm')
          lines.push(`• ${task.title}`)
          lines.push(`  🆔 ${task.id}`)
          lines.push(`  🕐 ${startTime}`)
          if (task.description) {
            const desc =
              task.description.length > 80
                ? `${task.description.substring(0, 80)}...`
                : task.description
            lines.push(`  📝 ${desc}`)
          }
          lines.push('')
        }

        return { content: [{ type: 'text', text: lines.join('\n') }] }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          content: [
            { type: 'text', text: `Failed to get tasks: ${message}` }
          ]
        }
      }
    }
  )

  server.registerTool(
    'complete-task',
    {
      title: 'Complete Task',
      description:
        'Mark one or more tasks as completed by changing their color to graphite.',
      inputSchema: {
        eventIds: z
          .array(z.string())
          .describe('Array of event IDs to mark as completed')
      }
    },
    async ({ eventIds }) => {
      try {
        const events = await completeTasks(eventIds)

        const lines = [
          `✅ Completed ${events.length} task(s)!`,
          ''
        ]

        for (const event of events) {
          lines.push(`📌 ${event.title}`)
        }

        return { content: [{ type: 'text', text: lines.join('\n') }] }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          content: [
            { type: 'text', text: `Failed to complete task(s): ${message}` }
          ]
        }
      }
    }
  )
}
