#!/usr/bin/env node

/**
 * NELC App Factory V2 - MCP Server
 * Allows business users to generate Cloud Run apps directly from Cursor
 */

const http = require('http');
const https = require('https');

// Configuration
const PORTAL_API_URL = process.env.PORTAL_API_URL || 'https://appfactory-v2-portal-621571041797.me-central2.run.app/api/generate-prompt';

// Simple HTTP client
function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const client = urlObj.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

// MCP Server implementation
class AppFactoryMCP {
  constructor() {
    this.name = 'app-factory';
    this.version = '2.0.0';
  }

  async handleRequest(request) {
    const { method, params } = request;

    switch (method) {
      case 'initialize':
        return this.handleInitialize();
      
      case 'tools/list':
        return this.handleToolsList();
      
      case 'tools/call':
        return this.handleToolsCall(params);
      
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  handleInitialize() {
    return {
      protocolVersion: '2024-11-05',
      serverInfo: {
        name: this.name,
        version: this.version,
      },
      capabilities: {
        tools: {},
      },
    };
  }

  handleToolsList() {
    return {
      tools: [
        {
          name: 'generate_app_prompt',
          description: 'Generate a production-ready Cloud Run app with automatic deployment to GCP. V2 uses simplified architecture with shared infrastructure.',
          inputSchema: {
            type: 'object',
            properties: {
              appName: {
                type: 'string',
                description: 'Name of the app (e.g., "Customer Tracker", "Todo List")',
              },
              features: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of features (3-7 recommended)',
              },
              needsDB: {
                type: 'boolean',
                description: 'Whether app needs PostgreSQL database',
                default: false,
              },
              needsFiles: {
                type: 'boolean',
                description: 'Whether app needs file storage',
                default: false,
              },
            },
            required: ['appName', 'features'],
          },
        },
      ],
    };
  }

  async handleToolsCall(params) {
    const { name, arguments: args } = params;

    if (name === 'generate_app_prompt') {
      try {
        const response = await makeRequest(PORTAL_API_URL, args);
        
        if (response.error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${response.error}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: response.prompt,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to generate prompt: ${error.message}\n\nMake sure the portal is running at: ${PORTAL_API_URL}`,
            },
          ],
          isError: true,
        };
      }
    }

    throw new Error(`Unknown tool: ${name}`);
  }
}

// Main server loop
async function main() {
  const server = new AppFactoryMCP();
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on('line', async (line) => {
    try {
      const request = JSON.parse(line);
      const response = await server.handleRequest(request);
      
      console.log(JSON.stringify({
        jsonrpc: '2.0',
        id: request.id,
        result: response,
      }));
    } catch (error) {
      console.error(JSON.stringify({
        jsonrpc: '2.0',
        id: request?.id || null,
        error: {
          code: -32603,
          message: error.message,
        },
      }));
    }
  });
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { AppFactoryMCP };

