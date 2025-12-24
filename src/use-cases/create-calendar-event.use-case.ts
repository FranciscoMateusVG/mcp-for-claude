import {
  createEvent,
  createEvents
} from '../repositories/google-calendar.repository.js'
import type {
  CreateEventInput,
  CreateEventResponse
} from '../types/calendar.types.js'

function validateEvent(input: CreateEventInput): void {
  const startDate = new Date(input.start)
  const endDate = new Date(input.end)

  if (endDate <= startDate) {
    throw new Error(
      `Event "${input.summary}": end time must be after start time`
    )
  }
}

export async function createCalendarEvent(
  input: CreateEventInput
): Promise<CreateEventResponse> {
  validateEvent(input)
  return createEvent(input)
}

export async function createCalendarEvents(
  inputs: CreateEventInput[]
): Promise<CreateEventResponse[]> {
  inputs.forEach(validateEvent)
  return createEvents(inputs)
}
