import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";

// Initialize MCP server
const server = new McpServer({
  name: "Weather",
  version: "1.0.0"
});

// Constants
const NWS_API_BASE = "https://api.weather.gov";
const USER_AGENT = "weather-mcp/1.0";

// Helper function to make requests to the NWS API
async function makeNwsRequest(url: string): Promise<any | null> {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/geo+json"
      },
      timeout: 30000
    });
    return response.data;
  } catch (error) {
    console.error("Error making NWS request:", error);
    return null;
  }
}

// Helper function to make requests to the OpenWeatherMap API
async function makeOpenWeatherRequest(endpoint: string, params: Record<string, string | number>): Promise<any | null> {
  try {
    const url = `${OPENWEATHER_API_BASE}/${endpoint}`;
    const response = await axios.get(url, {
      params: {
        ...params,
        appid: OPENWEATHER_API_KEY,
        units: "metric" // Use metric units by default
      },
      timeout: 30000
    });
    return response.data;
  } catch (error) {
    console.error("Error making OpenWeatherMap request:", error);
    return null;
  }
}

// Helper function to format alert data
function formatAlert(feature: any): string {
  const props = feature.properties;
  return `
Event: ${props.event || "Unknown"}
Area: ${props.areaDesc || "Unknown"}
Severity: ${props.severity || "Unknown"}
Description: ${props.description || "No description available"}
Instructions: ${props.instruction || "No specific instructions provided"}
`;
}

// Tool to get weather alerts for a US state
server.tool(
  "get-alerts",
  { state: z.string().length(2).describe("Two-letter US state code (e.g. CA, NY)") },
  async ({ state }) => {
    const url = `${NWS_API_BASE}/alerts/active/area/${state.toUpperCase()}`;
    const data = await makeNwsRequest(url);

    if (!data || !data.features) {
      return {
        content: [{ type: "text", text: "Unable to fetch alerts or no alerts found." }]
      };
    }

    if (data.features.length === 0) {
      return {
        content: [{ type: "text", text: "No active alerts for this state." }]
      };
    }

    const alerts = data.features.map(formatAlert).join("\n---\n");
    return {
      content: [{ type: "text", text: alerts }]
    };
  }
);

// Tool to get weather forecast for a location by latitude/longitude
server.tool(
  "get-forecast",
  {
    latitude: z.number().describe("Latitude of the location"),
    longitude: z.number().describe("Longitude of the location")
  },
  async ({ latitude, longitude }) => {
    // First get the forecast grid endpoint
    const pointsUrl = `${NWS_API_BASE}/points/${latitude},${longitude}`;
    const pointsData = await makeNwsRequest(pointsUrl);

    if (!pointsData) {
      return {
        content: [{ type: "text", text: "Unable to fetch forecast data for this location." }]
      };
    }

    // Get the forecast URL from the points response
    const forecastUrl = pointsData.properties.forecast;
    const forecastData = await makeNwsRequest(forecastUrl);

    if (!forecastData) {
      return {
        content: [{ type: "text", text: "Unable to fetch detailed forecast." }]
      };
    }

    // Format the periods into a readable forecast
    const periods = forecastData.properties.periods;
    const forecasts = periods.slice(0, 5).map((period: any) => `
${period.name}:
Temperature: ${period.temperature}°${period.temperatureUnit}
Wind: ${period.windSpeed} ${period.windDirection}
Forecast: ${period.detailedForecast}
`).join("\n---\n");

    return {
      content: [{ type: "text", text: forecasts }]
    };
  }
);

// Tool to get weather by city name (uses a geocoding step)
server.tool(
  "get-weather-by-city",
  {
    city: z.string().describe("City name"),
    state: z.string().length(2).describe("Two-letter US state code (e.g. CA, NY)")
  },
  async ({ city, state }) => {
    // This is a simplified approach - in a real implementation, you would use a geocoding service
    // For this example, we'll use a hardcoded mapping for a few major cities
    const cityCoordinates: Record<string, { lat: number, lon: number }> = {
      "new york": { lat: 40.7128, lon: -74.0060 },
      "los angeles": { lat: 34.0522, lon: -118.2437 },
      "chicago": { lat: 41.8781, lon: -87.6298 },
      "houston": { lat: 29.7604, lon: -95.3698 },
      "phoenix": { lat: 33.4484, lon: -112.0740 },
      "philadelphia": { lat: 39.9526, lon: -75.1652 },
      "san antonio": { lat: 29.4241, lon: -98.4936 },
      "san diego": { lat: 32.7157, lon: -117.1611 },
      "dallas": { lat: 32.7767, lon: -96.7970 },
      "san francisco": { lat: 37.7749, lon: -122.4194 },
      "seattle": { lat: 47.6062, lon: -122.3321 },
      "denver": { lat: 39.7392, lon: -104.9903 },
      "boston": { lat: 42.3601, lon: -71.0589 },
      "atlanta": { lat: 33.7490, lon: -84.3880 },
      "miami": { lat: 25.7617, lon: -80.1918 }
    };

    const normalizedCity = city.toLowerCase();

    if (!cityCoordinates[normalizedCity]) {
      return {
        content: [{
          type: "text",
          text: `City not found in our database. Please try using the get-forecast tool with latitude and longitude coordinates instead.`
        }]
      };
    }

    const { lat, lon } = cityCoordinates[normalizedCity];

    // First get the forecast grid endpoint
    const pointsUrl = `${NWS_API_BASE}/points/${lat},${lon}`;
    const pointsData = await makeNwsRequest(pointsUrl);

    if (!pointsData) {
      return {
        content: [{ type: "text", text: "Unable to fetch forecast data for this location." }]
      };
    }

    // Get the forecast URL from the points response
    const forecastUrl = pointsData.properties.forecast;
    const forecastData = await makeNwsRequest(forecastUrl);

    if (!forecastData) {
      return {
        content: [{ type: "text", text: "Unable to fetch detailed forecast." }]
      };
    }

    // Format the periods into a readable forecast
    const periods = forecastData.properties.periods;
    const forecasts = periods.slice(0, 5).map((period: any) => `
${period.name}:
Temperature: ${period.temperature}°${period.temperatureUnit}
Wind: ${period.windSpeed} ${period.windDirection}
Forecast: ${period.detailedForecast}
`).join("\n---\n");

    return {
      content: [{
        type: "text",
        text: `Weather forecast for ${city}, ${state}:\n${forecasts}`
      }]
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  console.error("Starting Weather MCP server...");
  await server.connect(transport);
}

main().catch(error => {
  console.error("Error starting server:", error);
  process.exit(1);
});