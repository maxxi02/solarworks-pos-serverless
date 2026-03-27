import { createMcpHandler } from "mcp-handler";

// Create the MCP handler with an initializer function
const handler = createMcpHandler((server) => {
  /**
   * Example tool: Get POS Status
   * Demonstrates how to expose a simple diagnostic tool to Antigravity.
   */
  server.tool(
    "get-pos-status",
    {},
    async () => {
      return {
        content: [{ type: "text", text: "SolarWorks POS System is operational and connected to Antigravity." }],
      };
    }
  );

  /**
   * Example tool: Global Project Metadata
   * Provides information about the project to the AI agent.
   */
  server.tool(
    "get-project-metadata",
    {},
    async () => {
      return {
        content: [{ 
          type: "text", 
          text: "Project: SolarWorks POS Serverless\nTech Stack: Next.js 16, React 19, MongoDB, Tailwind CSS\nPrimary Purpose: POS system for solar installations." 
        }],
      };
    }
  );
}, {
  serverInfo: {
    name: "SolarWorks POS Custom Server",
    version: "1.0.0",
  }
});

// Export standard Next.js route handlers for both GET (for SSE setup) and POST (for MCP requests)
export const POST = handler;
export const GET = handler;
// export const runtime = "nodejs"; // Using standard node runtime to support node:crypto

