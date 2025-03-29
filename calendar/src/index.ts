import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";
import * as googleCalendar from "./googleCalendar.js";

// Load environment variables
dotenv.config();

// Initialize MCP server
const server = new McpServer({
  name: "Calendar",
  version: "1.0.0"
});

// Tool to get upcoming events
server.tool(
  "get-events",
  {
    timeMin: z.string().optional().describe("Start time for the event search (ISO format)"),
    timeMax: z.string().optional().describe("End time for the event search (ISO format)"),
    maxResults: z.number().optional().describe("Maximum number of events to return")
  },
  async ({ timeMin, timeMax, maxResults = 10 }) => {
    try {
      const events = await googleCalendar.listEvents(
        timeMin,
        timeMax,
        maxResults
      );

      if (events.length === 0) {
        return {
          content: [{
            type: "text",
            text: "No upcoming events found in the specified time range."
          }]
        };
      }

      const formattedEvents = events.map((event, index) => {
        const summary = event.summary || 'Untitled Event';
        const start = event.start?.dateTime ? new Date(event.start.dateTime).toLocaleString() : 'Unknown';
        const end = event.end?.dateTime ? new Date(event.end.dateTime).toLocaleString() : 'Unknown';
        return `${index + 1}. ${summary} - ${start} to ${end}`;
      }).join('\n');

      return {
        content: [{
          type: "text",
          text: `Upcoming events (${events.length}):\n\n${formattedEvents}`
        }]
      };
    } catch (error) {
      console.error('Error fetching events:', error);
      return {
        content: [{
          type: "text",
          text: `Error fetching events: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// Tool to create a new event
server.tool(
  "create-event",
  {
    summary: z.string().describe("Title of the event"),
    description: z.string().optional().describe("Description of the event"),
    location: z.string().optional().describe("Location of the event"),
    startDateTime: z.string().describe("Start date and time (ISO format)"),
    endDateTime: z.string().describe("End date and time (ISO format)")
  },
  async ({ summary, description, location, startDateTime, endDateTime }) => {
    try {
      const event = await googleCalendar.createEvent(
        summary,
        description,
        location,
        startDateTime,
        endDateTime
      );

      const start = event.start?.dateTime ? new Date(event.start.dateTime).toLocaleString() : 'Unknown';
      const end = event.end?.dateTime ? new Date(event.end.dateTime).toLocaleString() : 'Unknown';
      const eventLink = event.htmlLink || 'No link available';

      return {
        content: [{
          type: "text",
          text: `Successfully created event:\n\nTitle: ${event.summary}\nDescription: ${event.description || 'N/A'}\nLocation: ${event.location || 'N/A'}\nStart: ${start}\nEnd: ${end}\n\nView in Google Calendar: ${eventLink}`
        }]
      };
    } catch (error) {
      console.error('Error creating event:', error);
      return {
        content: [{
          type: "text",
          text: `Error creating event: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// Tool to get a summary of events for a specific day
server.tool(
  "get-day-summary",
  {
    date: z.string().describe("The date to summarize (YYYY-MM-DD format)")
  },
  async ({ date }) => {
    try {
      const events = await googleCalendar.getEventsForDay(date);

      if (events.length === 0) {
        return {
          content: [{
            type: "text",
            text: `No events scheduled for ${date}.`
          }]
        };
      }

      // Group events by time of day
      const morning = [];
      const afternoon = [];
      const evening = [];

      for (const event of events) {
        if (!event.start?.dateTime) continue;

        const eventDate = new Date(event.start.dateTime);
        const hour = eventDate.getHours();

        const formattedEvent = googleCalendar.formatEvent(event);

        if (hour < 12) {
          morning.push(formattedEvent);
        } else if (hour < 17) {
          afternoon.push(formattedEvent);
        } else {
          evening.push(formattedEvent);
        }
      }

      // Format the summary
      const formatSection = (title: string, events: string[]) => {
        if (events.length === 0) return `${title}:\n- No events scheduled`;
        return `${title}:\n- ${events.join('\n- ')}`;
      };

      const morningSection = formatSection('Morning', morning);
      const afternoonSection = formatSection('Afternoon', afternoon);
      const eveningSection = formatSection('Evening', evening);

      const formattedDate = new Date(date).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      return {
        content: [{
          type: "text",
          text: `Summary for ${formattedDate}:\n\n${morningSection}\n\n${afternoonSection}\n\n${eveningSection}`
        }]
      };
    } catch (error) {
      console.error('Error getting day summary:', error);
      return {
        content: [{
          type: "text",
          text: `Error getting day summary: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// Tool to get a summary of events for the current week
server.tool(
  "get-week-summary",
  {
    startDate: z.string().optional().describe("Start date of the week (YYYY-MM-DD format)")
  },
  async ({ startDate }) => {
    try {
      const eventsByDay = await googleCalendar.getEventsForWeek(startDate);

      // Check if there are any events
      const totalEvents = Object.values(eventsByDay).reduce(
        (count, events) => count + events.length,
        0
      );

      if (totalEvents === 0) {
        return {
          content: [{
            type: "text",
            text: `No events scheduled for the week${startDate ? ` starting from ${startDate}` : ''}.`
          }]
        };
      }

      // Format the week summary
      const weekSummary = Object.entries(eventsByDay).map(([dateStr, events]) => {
        const dayName = googleCalendar.getDayName(dateStr);

        if (events.length === 0) {
          return `${dayName} (${dateStr}):\n- No events scheduled`;
        }

        const formattedEvents = events.map(event => {
          return `- ${googleCalendar.formatEvent(event)}`;
        }).join('\n');

        return `${dayName} (${dateStr}):\n${formattedEvents}`;
      }).join('\n\n');

      // Get the date range for the title
      const dates = Object.keys(eventsByDay).sort();
      const weekStart = dates[0];
      const weekEnd = dates[dates.length - 1];

      const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric'
        });
      };

      return {
        content: [{
          type: "text",
          text: `Week Summary (${formatDate(weekStart)} - ${formatDate(weekEnd)}):\n\n${weekSummary}`
        }]
      };
    } catch (error) {
      console.error('Error getting week summary:', error);
      return {
        content: [{
          type: "text",
          text: `Error getting week summary: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// Tool to create a task
server.tool(
  "create-task",
  {
    title: z.string().describe("Title of the task"),
    description: z.string().optional().describe("Description of the task"),
    dueDate: z.string().describe("Due date for the task (YYYY-MM-DD format)"),
    priority: z.enum(['high', 'medium', 'low']).optional().describe("Priority of the task")
  },
  async ({ title, description, dueDate, priority }) => {
    try {
      // Create a task as a calendar event with specific formatting
      const taskPrefix = priority ? `[${priority.toUpperCase()}] ` : '';
      const taskTitle = `${taskPrefix}TASK: ${title}`;

      // Set the task as an all-day event on the due date
      const dueDateTime = new Date(dueDate);
      dueDateTime.setHours(23, 59, 59); // End of day

      // Create task description
      const taskDescription = `${description || 'No description'}\n\nThis is a task created via Calendar MCP.`;

      const event = await googleCalendar.createEvent(
        taskTitle,
        taskDescription,
        undefined, // No location for tasks
        dueDate, // Start date (beginning of day)
        dueDateTime.toISOString() // End date (end of day)
      );

      return {
        content: [{
          type: "text",
          text: `Successfully created task:\n\nTitle: ${title}\nPriority: ${priority || 'Not specified'}\nDue Date: ${new Date(dueDate).toLocaleDateString()}\nDescription: ${description || 'N/A'}\n\nView in Google Calendar: ${event.htmlLink || 'No link available'}`
        }]
      };
    } catch (error) {
      console.error('Error creating task:', error);
      return {
        content: [{
          type: "text",
          text: `Error creating task: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// Tool to get upcoming tasks
server.tool(
  "get-tasks",
  {
    maxResults: z.number().optional().describe("Maximum number of tasks to return")
  },
  async ({ maxResults = 10 }) => {
    try {
      // Get upcoming events and filter for tasks
      const events = await googleCalendar.listEvents(
        undefined,
        undefined,
        100 // Get more events to filter from
      );

      // Filter for events that have 'TASK:' in the title
      const tasks = events
        .filter(event => event.summary && event.summary.includes('TASK:'))
        .slice(0, maxResults);

      if (tasks.length === 0) {
        return {
          content: [{
            type: "text",
            text: "No upcoming tasks found."
          }]
        };
      }

      // Format tasks
      const formattedTasks = tasks.map((task, index) => {
        const title = task.summary?.replace(/^\[.*?\]\s*TASK:\s*/, '') || 'Untitled Task';
        const priority = task.summary?.match(/^\[(.*?)\]/)?
          ? task.summary?.match(/^\[(.*?)\]/)?.[1] || 'None'
          : 'None';
        const dueDate = task.start?.date || task.start?.dateTime
          ? new Date(task.start.date || task.start.dateTime || '').toLocaleDateString()
          : 'No due date';

        return `${index + 1}. ${title} (Priority: ${priority}, Due: ${dueDate})`;
      }).join('\n');

      return {
        content: [{
          type: "text",
          text: `Upcoming tasks (${tasks.length}):\n\n${formattedTasks}`
        }]
      };
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return {
        content: [{
          type: "text",
          text: `Error fetching tasks: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  console.error("Starting Calendar MCP server...");
  await server.connect(transport);
}

main().catch(error => {
  console.error("Error starting server:", error);
  process.exit(1);
});
