#!/usr/bin/env node

// Minimal test to identify server startup issues
console.log("🔍 Starting server diagnostics...");

async function runDiagnostics() {
  try {
    console.log("✅ Node.js environment OK");
    
    // Test basic imports
    console.log("📦 Testing imports...");
    
    const fs = await import('fs');
    console.log("✅ fs module OK");
    
    const path = await import('path');
    console.log("✅ path module OK");
    
    // Test MCP SDK imports
    try {
      const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
      console.log("✅ MCP Server SDK OK");
    } catch (e) {
      console.log("❌ MCP Server SDK failed:", e.message);
    }
    
    try {
      const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
      console.log("✅ MCP StdioServerTransport OK");
    } catch (e) {
      console.log("❌ MCP StdioServerTransport failed:", e.message);
    }
    
    // Test lib imports one by one
    const libModules = [
      './lib/dropoff-generator.js',
      './lib/task-storage.js', 
      './lib/task-memory-linker.js',
      './lib/title-summary-generator.js',
      './lib/ollama-client.js'
    ];
    
    for (const module of libModules) {
      try {
        await import(module);
        console.log(`✅ ${module} OK`);
      } catch (e) {
        console.log(`❌ ${module} failed:`, e.message);
        if (e.message.includes('sharp')) {
          console.log("🔍 Sharp dependency issue detected!");
        }
      }
    }
    
    console.log("🎯 Diagnostics complete!");
    
  } catch (error) {
    console.error("❌ Critical error:", error.message);
    console.error("Stack:", error.stack);
  }
}

runDiagnostics();
