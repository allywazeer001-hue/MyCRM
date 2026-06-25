export interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startAt: Date;
  endAt?: Date;
  allDay?: boolean;
  reminders?: number[];
  link?: string;
}

export interface CreateEventResult {
  eventId: string;
  calendarId: string;
  htmlLink?: string;
}

export interface CalendarInfo {
  id: string;
  name: string;
  isPrimary?: boolean;
}

export interface ICalendarProvider {
  listCalendars(): Promise<CalendarInfo[]>;
  createCalendar(name: string): Promise<CalendarInfo>;
  createEvent(calendarId: string, event: CalendarEvent): Promise<CreateEventResult>;
  updateEvent(calendarId: string, eventId: string, event: Partial<CalendarEvent>): Promise<void>;
  deleteEvent(calendarId: string, eventId: string): Promise<void>;
}
