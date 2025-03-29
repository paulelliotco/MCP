# Model Context Protocol (MCP) Implementations

This repository contains various implementations of Model Context Protocol (MCP) servers that can be used with Claude for Desktop and other MCP clients.

## What is MCP?

The [Model Context Protocol (MCP)](https://modelcontextprotocol.io) is an open protocol that standardizes how applications provide context to LLMs. It allows LLMs to access external data and functionality through a standardized interface.

## Available MCP Servers

### [Weather MCP](/weather)

A weather information MCP server that provides tools for:
- Getting weather forecasts for US locations
- Checking weather alerts by US state
- Getting weather by city name
- (Coming soon) Global weather information

## Getting Started

Each MCP server is contained in its own directory with its own README and setup instructions. Navigate to the specific MCP server directory you're interested in to learn more.

## Using with Claude for Desktop

To use these MCP servers with Claude for Desktop:

1. Make sure you have Claude for Desktop installed and updated to the latest version.

2. **Enable Developer Mode in Claude for Desktop**:
   - Open Claude for Desktop
   - Go to Settings
   - Enable the Developer Mode option

3. Configure Claude for Desktop by editing the configuration file:
   - On macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - On Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Create the file if it doesn't exist

4. Add the MCP servers you want to use to the configuration file.

5. Restart Claude for Desktop.

6. When you first use an MCP tool in a chat, Claude will ask for your permission to use the MCP server.

## Contributing

Contributions are welcome! If you have an idea for a new MCP server or want to improve an existing one, feel free to open an issue or submit a pull request.

## License

ISC
