# Weather MCP Server

A Model Context Protocol (MCP) server for checking weather information using weather APIs. Currently supports US weather via the National Weather Service (NWS) API, with global weather support via OpenWeatherMap coming soon.

## Features

This MCP server provides the following tools:

1. **get-alerts** - Get weather alerts for a US state
   - Parameter: `state` - Two-letter US state code (e.g., CA, NY)

2. **get-forecast** - Get weather forecast for a location by latitude/longitude
   - Parameters:
     - `latitude` - Latitude of the location
     - `longitude` - Longitude of the location

3. **get-weather-by-city** - Get weather forecast for a major US city
   - Parameters:
     - `city` - City name
     - `state` - Two-letter US state code (e.g., CA, NY)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd weather-mcp

# Install dependencies
npm install

# Build the TypeScript code
npm run build
```

## Usage

### Running the Server

```bash
npm start
```

This will start the MCP server using the stdio transport, which allows it to communicate with MCP clients.

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
    "weather": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/weather/dist/index.js"
      ]
    }
  }
}
```

Replace `/ABSOLUTE/PATH/TO/weather` with the actual path to your project.

5. Restart Claude for Desktop.

6. **Important**: When you first use the weather MCP tools in a chat, Claude will ask for your permission to use the MCP server. You must grant this permission for the tools to work.

### Example Queries

Once connected to Claude for Desktop, you can ask questions like:

- "What's the weather forecast for San Francisco, CA?"
- "Are there any weather alerts in Texas?"
- "What's the forecast for latitude 40.7128, longitude -74.0060?"

## Data Sources

### Current
- **National Weather Service (NWS) API**: Free to use, provides weather data for the United States only.

### Coming Soon
- **OpenWeatherMap API**: Will provide global weather data. Requires a free API key from [OpenWeatherMap](https://openweathermap.org/api).

## License

ISC
