import { google, calendar_v3 } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to token storage
const TOKEN_PATH = process.env.TOKEN_PATH || path.join(__dirname, '..', 'token.json');

// OAuth2 scopes
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

// Create OAuth2 client
const createOAuth2Client = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing required environment variables for Google OAuth2');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

// Get and store new token after prompting for user authorization
const getNewToken = async (oAuth2Client: any): Promise<any> => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.error('Authorize this app by visiting this URL:', authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question('Enter the code from that page here: ', async (code) => {
      rl.close();
      try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        
        // Store the token to disk for later program executions
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        console.error('Token stored to', TOKEN_PATH);
        
        resolve(oAuth2Client);
      } catch (err) {
        reject(new Error(`Error retrieving access token: ${err}`));
      }
    });
  });
};

// Load saved token or get a new one
const authorize = async (): Promise<any> => {
  const oAuth2Client = createOAuth2Client();

  try {
    // Check if we have previously stored a token
    if (fs.existsSync(TOKEN_PATH)) {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
      oAuth2Client.setCredentials(token);
      return oAuth2Client;
    } else {
      return await getNewToken(oAuth2Client);
    }
  } catch (error) {
    console.error('Error during authorization:', error);
    return await getNewToken(oAuth2Client);
  }
};

// Get calendar client
const getCalendarClient = async (): Promise<calendar_v3.Calendar> => {
  const auth = await authorize();
  return google.calendar({ version: 'v3', auth });
};

// List upcoming events
export const listEvents = async (
  timeMin?: string,
  timeMax?: string,
  maxResults: number = 10
): Promise<calendar_v3.Schema$Event[]> => {
  const calendar = await getCalendarClient();
  
  // Default timeMin to now if not provided
  const now = new Date();
  const defaultTimeMin = now.toISOString();
  
  // Default timeMax to 7 days from now if not provided
  const oneWeekFromNow = new Date(now);
  oneWeekFromNow.setDate(now.getDate() + 7);
  const defaultTimeMax = oneWeekFromNow.toISOString();

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin || defaultTimeMin,
      timeMax: timeMax || defaultTimeMax,
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
};

// Create a new event
export const createEvent = async (
  summary: string,
  description?: string,
  location?: string,
  startDateTime?: string,
  endDateTime?: string
): Promise<calendar_v3.Schema$Event> => {
  const calendar = await getCalendarClient();

  // Default start time to now + 1 hour if not provided
  const now = new Date();
  const defaultStart = new Date(now);
  defaultStart.setHours(now.getHours() + 1);
  
  // Default end time to start + 1 hour if not provided
  const defaultEnd = new Date(startDateTime ? new Date(startDateTime) : defaultStart);
  defaultEnd.setHours(defaultEnd.getHours() + 1);

  const event: calendar_v3.Schema$Event = {
    summary,
    description,
    location,
    start: {
      dateTime: startDateTime || defaultStart.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDateTime || defaultEnd.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    return response.data;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
};

// Get events for a specific day
export const getEventsForDay = async (date: string): Promise<calendar_v3.Schema$Event[]> => {
  // Parse the date string (YYYY-MM-DD)
  const targetDate = new Date(date);
  
  // Set time to start of day
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  // Set time to end of day
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  return await listEvents(startOfDay.toISOString(), endOfDay.toISOString(), 100);
};

// Get events for a week
export const getEventsForWeek = async (startDate?: string): Promise<Record<string, calendar_v3.Schema$Event[]>> => {
  // Parse the start date or use current date
  const start = startDate ? new Date(startDate) : new Date();
  
  // Adjust to the start of the week (Monday)
  const startOfWeek = new Date(start);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);
  
  // Calculate end of week (Sunday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Get all events for the week
  const events = await listEvents(startOfWeek.toISOString(), endOfWeek.toISOString(), 100);
  
  // Group events by day
  const eventsByDay: Record<string, calendar_v3.Schema$Event[]> = {};
  
  // Initialize all days of the week
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    const dayStr = day.toISOString().split('T')[0]; // YYYY-MM-DD
    eventsByDay[dayStr] = [];
  }
  
  // Group events by day
  events.forEach(event => {
    if (event.start?.dateTime) {
      const eventDate = new Date(event.start.dateTime);
      const dayStr = eventDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (eventsByDay[dayStr]) {
        eventsByDay[dayStr].push(event);
      }
    }
  });
  
  return eventsByDay;
};

// Format event for display
export const formatEvent = (event: calendar_v3.Schema$Event): string => {
  const summary = event.summary || 'Untitled Event';
  
  let startTime = 'Unknown';
  let endTime = 'Unknown';
  
  if (event.start?.dateTime) {
    const start = new Date(event.start.dateTime);
    startTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  if (event.end?.dateTime) {
    const end = new Date(event.end.dateTime);
    endTime = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  return `${summary} (${startTime} - ${endTime})`;
};

// Format day name
export const getDayName = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { weekday: 'long' });
};
