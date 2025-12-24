# Google Calendar MCP Server

An MCP (Model Context Protocol) server that provides access to your Google Calendar agenda.

## Features

- **get-today-agenda**: Get calendar events for today or a specific date
  - Shows event title, time, description, and attendees
  - Calculates total meeting time
  - Supports optional date parameter (YYYY-MM-DD format)

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Build the project

```bash
pnpm build
```

### 3. Configure Google Calendar API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials (Desktop application)
5. Download the credentials

### 4. Set environment variables

You need to set the following environment variables:

```bash
export GOOGLE_CLIENT_ID="your-client-id"
export GOOGLE_CLIENT_SECRET="your-client-secret"
export GOOGLE_REDIRECT_URI="your-redirect-uri"
export GOOGLE_REFRESH_TOKEN="your-refresh-token"
```

### 5. Get a Refresh Token

To get a refresh token, you'll need to complete the OAuth flow once. You can use [OAuth Playground](https://developers.google.com/oauthplayground/) or implement a simple auth flow.

## Usage with Cursor/Claude

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "google-calendar": {
      "command": "node",
      "args": ["/path/to/mcp-server/build/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "your-client-id",
        "GOOGLE_CLIENT_SECRET": "your-client-secret",
        "GOOGLE_REDIRECT_URI": "your-redirect-uri",
        "GOOGLE_REFRESH_TOKEN": "your-refresh-token"
      }
    }
  }
}
```

## Tool Usage Examples

### Get today's agenda
```
Use the get-today-agenda tool
```

### Get agenda for a specific date
```
Use the get-today-agenda tool with date "2025-12-25"
```

## Timezone

The server is configured to use `America/Sao_Paulo` timezone. You can modify this in `src/index.ts` by changing the `TIMEZONE` constant.
