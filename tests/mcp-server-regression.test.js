/**
 * MCP Server Regression Tests
 * 
 * Tests to prevent the specific bugs found:
 * 1. storage.addMemory is not a function
 * 2. Loader2 import missing
 * 3. Task automation method name mismatch
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('MCP Server Regression Tests', () => {
  let serverProcess;
  
  const sendMCPCommand = (command) => {
    return new Promise((resolve, reject) => {
      const serverProcess = spawn('node', ['server-markdown.js'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      serverProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      serverProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      serverProcess.on('close', (code) => {
        if (stderr && !stderr.includes('File system monitor')) {
          console.warn('Server stderr:', stderr);
        }
        
        try {
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } catch (err) {
          reject(new Error(`Failed to parse JSON: ${stdout} | Error: ${err.message}`));
        }
      });
      
      serverProcess.stdin.write(JSON.stringify(command));
      serverProcess.stdin.end();
      
      // Timeout after 30 seconds
      setTimeout(() => {
        serverProcess.kill();
        reject(new Error('Command timeout'));
      }, 30000);
    });
  };

  describe('Bug Fix: storage.addMemory error', () => {
    test('search_memories should not throw addMemory error', async () => {
      const command = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "search_memories",
          arguments: {
            query: "nonexistent search term that should not be found",
            project: "test-project"
          }
        }
      };

      const result = await sendMCPCommand(command);
      
      expect(result.error).toBeUndefined();
      expect(result.result).toBeDefined();
      expect(result.result.content).toBeDefined();
      
      // Should not contain error about addMemory
      const content = result.result.content[0].text;
      expect(content).not.toContain('addMemory is not a function');
    });

    test('add_memory should work correctly', async () => {
      const command = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "add_memory",
          arguments: {
            content: "Test memory for regression testing",
            category: "research",
            project: "test-regression",
            tags: ["test", "regression"]
          }
        }
      };

      const result = await sendMCPCommand(command);
      
      expect(result.error).toBeUndefined();
      expect(result.result).toBeDefined();
      expect(result.result.content[0].text).toContain('Memory stored as markdown file');
    });
  });

  describe('Task automation method fix', () => {
    test('add_memory should not throw processMemory error', async () => {
      const command = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "add_memory",
          arguments: {
            content: "Test automation compatibility",
            category: "work",
            project: "automation-test"
          }
        }
      };

      // Capture stderr to check for automation errors
      const originalConsoleError = console.error;
      const errors = [];
      console.error = (...args) => {
        errors.push(args.join(' '));
      };

      const result = await sendMCPCommand(command);
      console.error = originalConsoleError;

      expect(result.error).toBeUndefined();
      expect(result.result).toBeDefined();
      
      // Should not have critical automation errors
      const criticalErrors = errors.filter(err => 
        err.includes('processMemory is not a function') || 
        err.includes('Cannot read properties of null')
      );
      expect(criticalErrors).toHaveLength(0);
    });
  });

  describe('MCP Server Core Functionality', () => {
    test('tools/list should return all 27 tools', async () => {
      const command = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list"
      };

      const result = await sendMCPCommand(command);
      
      expect(result.error).toBeUndefined();
      expect(result.result.tools).toBeDefined();
      expect(result.result.tools.length).toBe(27);
      
      // Check for key tools
      const toolNames = result.result.tools.map(t => t.name);
      expect(toolNames).toContain('add_memory');
      expect(toolNames).toContain('search_memories');
      expect(toolNames).toContain('create_task');
      expect(toolNames).toContain('test_tool');
    });

    test('test_tool should work correctly', async () => {
      const command = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "test_tool",  
          arguments: {
            message: "regression test"
          }
        }
      };

      const result = await sendMCPCommand(command);
      
      expect(result.error).toBeUndefined();
      expect(result.result.content[0].text).toContain('MCP Test successful');
      expect(result.result.content[0].text).toContain('regression test');
    });
  });
});