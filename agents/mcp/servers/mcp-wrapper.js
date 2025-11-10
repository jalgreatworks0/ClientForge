#!/usr/bin/env node

/**
 * MCP Protocol Wrapper
 * Wraps our custom servers to implement the full MCP protocol specification
 *
 * MCP Protocol Flow:
 * 1. Host sends: { method: "initialize", params: { protocolVersion, capabilities } }
 * 2. Server responds: { result: { protocolVersion, capabilities, serverInfo } }
 * 3. Host sends: { method: "tools/list" }
 * 4. Server responds: { result: { tools: [...] } }
 * 5. Host sends: { method: "tools/call", params: { name, arguments } }
 * 6. Server responds: { result: { content: [...] } }
 */

class MCPProtocolWrapper {
  constructor(serverName, serverModule, tools) {
    this.serverName = serverName;
    this.serverModule = serverModule;
    this.tools = tools;
    this.protocolVersion = "0.1.0";
  }

  async handleRequest(request) {
    const { id, method, params } = request;

    try {
      let result;

      switch (method) {
        case "initialize":
          result = await this.handleInitialize(params);
          break;

        case "tools/list":
          result = await this.handleToolsList();
          break;

        case "tools/call":
          result = await this.handleToolsCall(params);
          break;

        default:
          // Fallback to legacy JSON-RPC for backward compatibility
          result = await this.serverModule.handleLegacyMethod(method, params);
      }

      return {
        jsonrpc: "2.0",
        id,
        result
      };
    } catch (error) {
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32603,
          message: error.message,
          data: { stack: error.stack }
        }
      };
    }
  }

  async handleInitialize(params) {
    return {
      protocolVersion: this.protocolVersion,
      capabilities: {
        tools: {}
      },
      serverInfo: {
        name: this.serverName,
        version: "1.0.0"
      }
    };
  }

  async handleToolsList() {
    return {
      tools: this.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }))
    };
  }

  async handleToolsCall(params) {
    const { name, arguments: args } = params;

    // Find the tool
    const tool = this.tools.find(t => t.name === name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    // Call the tool handler
    const result = await tool.handler(args);

    // MCP protocol expects content array
    return {
      content: [
        {
          type: "text",
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
        }
      ]
    };
  }
}

module.exports = { MCPProtocolWrapper };
