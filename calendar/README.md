# Google Calendar MCP Server

A Model Context Protocol (MCP) server for interacting with Google Calendar. This MCP allows Claude to check your schedule, create events, and manage your calendar through natural language.

## Features

This MCP server provides the following tools:

### Calendar Management

1. **get-events** - Get upcoming events from your Google Calendar
   - Parameters:
     - `timeMin` (optional) - Start time for the event search (defaults to now)
     - `timeMax` (optional) - End time for the event search
     - `maxResults` (optional) - Maximum number of events to return (default: 10)

2. **create-event** - Create a new event in your Google Calendar
   - Parameters:
     - `summary` - Title of the event
     - `description` (optional) - Description of the event
     - `location` (optional) - Location of the event
     - `startDateTime` - Start date and time (ISO format)
     - `endDateTime` - End date and time (ISO format)

3. **get-day-summary** - Get a summary of events for a specific day
   - Parameters:
     - `date` - The date to summarize (YYYY-MM-DD format)

4. **get-week-summary** - Get a summary of events for the current week
   - Parameters:
     - `startDate` (optional) - Start date of the week (defaults to current week)

### Task Management

5. **create-task** - Create a new task in your Google Calendar
   - Parameters:
     - `title` - Title of the task
     - `description` (optional) - Description of the task
     - `dueDate` - Due date for the task (YYYY-MM-DD format)
     - `priority` (optional) - Priority of the task (high, medium, low)

6. **get-tasks** - Get a list of upcoming tasks
   - Parameters:
     - `maxResults` (optional) - Maximum number of tasks to return (default: 10)

## Setup

### Prerequisites

1. Google Cloud Platform account
2. Google Calendar API enabled
3. OAuth 2.0 credentials

### Google API Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials (Desktop application)
5. Download the credentials JSON file

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd MCP/calendar

# Install dependencies
npm install

# Create a .env file with your Google API credentials
# See .env.example for required variables

# Build the TypeScript code
npm run build
```

### Configuration

Create a `.env` file in the calendar directory with the following variables:

```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
```

## Usage

### Running the Server

```bash
npm start
```

This will start the MCP server using the stdio transport, which allows it to communicate with MCP clients.

### First-time Authentication

The first time you run the server, it will provide a URL for you to authenticate with Google. Open the URL in your browser, sign in with your Google account, and authorize the application. You will receive an authorization code that you need to enter into the terminal.

### Connecting to Claude for Desktop

To use this server with Claude for Desktop:

1. Make sure you have Claude for Desktop installed and updated to the latest version.

2. **Enable Developer Mode in Claude for Desktop**:
   - Open Claude for Desktop
   - Go to Settings
   - Enable the Developer Mode option

3. Configure Claude for Desktop by editing the configuration file:
   - On macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - On Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Create the file if it doesn't exist

4. Add the following configuration:

```json
{
  "mcpServers": {
    "calendar": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/MCP/calendar/dist/index.js"
      ]
    }
  }
}
```

Replace `/ABSOLUTE/PATH/TO/MCP` with the actual path to your project.

5. Restart Claude for Desktop.

6. **Important**: When you first use the calendar MCP tools in a chat, Claude will ask for your permission to use the MCP server. You must grant this permission for the tools to work.

### Example Queries

Once connected to Claude for Desktop, you can ask questions like:

#### Calendar Management
- "What's on my calendar today?"
- "Create a meeting with John tomorrow at 2pm for 1 hour"
- "Show me my schedule for next week"
- "Do I have any events this weekend?"

#### Task Management
- "Create a high priority task to finish the report by Friday"
- "What tasks do I have due this week?"
- "Show me all my high priority tasks"
- "Add a task to call the client by tomorrow"

## License

ISC
