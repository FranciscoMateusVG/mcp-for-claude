import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerAgendaTool } from './tools/agenda.tool.js'
import { registerCompleteEventTool } from './tools/complete-event.tool.js'
import { registerCreateEventTool } from './tools/create-event.tool.js'
import { registerEmailTool } from './tools/email.tool.js'
import { registerTaskTool } from './tools/task.tool.js'

const server = new McpServer({
  name: 'google-workspace',
  version: '1.0.0'
})

registerAgendaTool(server)
registerCreateEventTool(server)
registerCompleteEventTool(server)
registerEmailTool(server)
registerTaskTool(server)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Google Workspace MCP Server running on stdio')
}

main().catch((error) => {
  console.error('Fatal error in main():', error)
  process.exit(1)
})
