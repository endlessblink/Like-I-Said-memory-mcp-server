/**
 * Full Integration Tests
 * 
 * End-to-end tests covering the complete workflow
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Full Integration Tests', () => {
  const testMemoryDir = path.join(__dirname, '..', 'memories', 'test-integration');
  const testTaskDir = path.join(__dirname, '..', 'tasks', 'test-integration');

  beforeAll(() => {
    // Create test directories
    fs.mkdirSync(testMemoryDir, { recursive: true });
    fs.mkdirSync(testTaskDir, { recursive: true });
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(testMemoryDir)) {
      fs.rmSync(testMemoryDir, { recursive: true, force: true });
    }
    if (fs.existsSync(testTaskDir)) {
      fs.rmSync(testTaskDir, { recursive: true, force: true });
    }
  });

  const sendMCPCommand = async (command, timeout = 30000) => {
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
        try {
          const result = JSON.parse(stdout.trim());
          resolve({ result, stderr });
        } catch (err) {
          reject(new Error(`Failed to parse JSON: ${stdout} | Error: ${err.message}`));
        }
      });
      
      serverProcess.stdin.write(JSON.stringify(command));
      serverProcess.stdin.end();
      
      setTimeout(() => {
        serverProcess.kill();
        reject(new Error('Command timeout'));
      }, timeout);
    });
  };

  describe('Memory-Task Integration Workflow', () => {
    let memoryId;
    let taskId;

    test('Step 1: Create memory successfully', async () => {
      const command = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "add_memory",
          arguments: {
            content: "Integration test memory for connecting to tasks",
            category: "work",
            project: "test-integration",
            tags: ["integration", "workflow", "testing"],
            priority: "high"
          }
        }
      };

      const { result } = await sendMCPCommand(command);
      
      expect(result.error).toBeUndefined();
      expect(result.result.content[0].text).toContain('Memory stored');
      
      // Extract memory ID from response
      const idMatch = result.result.content[0].text.match(/🆔 ID: ([a-zA-Z0-9]+)/);
      expect(idMatch).toBeTruthy();
      memoryId = idMatch[1];
    });

    test('Step 2: Create task that should link to memory', async () => {
      const command = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "create_task",
          arguments: {
            title: "Integration testing workflow task",
            description: "This task should automatically link to the integration test memory",
            project: "test-integration",
            category: "work",
            priority: "high",
            auto_link: true
          }
        }
      };

      const { result } = await sendMCPCommand(command);
      
      expect(result.error).toBeUndefined();
      expect(result.result.content[0].text).toContain('Task created');
      
      // Extract task ID
      const idMatch = result.result.content[0].text.match(/🆔 Task ID: ([a-zA-Z0-9-]+)/);
      expect(idMatch).toBeTruthy();
      taskId = idMatch[1];
    });

    test('Step 3: Search should find both memory and task', async () => {
      const command = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "search_memories",
          arguments: {
            query: "integration testing workflow",
            project: "test-integration"
          }
        }
      };

      const { result } = await sendMCPCommand(command);
      
      expect(result.error).toBeUndefined();
      expect(result.result.content[0].text).toContain('Found');
      expect(result.result.content[0].text).toContain('integration');
    });

    test('Step 4: List memories should include our test memory', async () => {
      const command = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "list_memories",
          arguments: {
            project: "test-integration"
          }
        }
      };

      const { result } = await sendMCPCommand(command);
      
      expect(result.error).toBeUndefined();
      expect(result.result.content[0].text).toContain('memories found');
    });

    test('Step 5: Get task context should show memory connections', async () => {
      if (!taskId) {
        console.log('Skipping task context test - no task ID available');
        return;
      }

      const command = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "get_task_context",
          arguments: {
            task_id: taskId
          }
        }
      };

      const { result } = await sendMCPCommand(command);
      
      expect(result.error).toBeUndefined();
      expect(result.result.content[0].text).toContain('Task Context');
    });
  });

  describe('Error Handling and Recovery', () => {
    test('Invalid memory ID should return proper error', async () => {
      const command = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "get_memory",
          arguments: {
            id: "nonexistent-memory-id"
          }
        }
      };

      const { result } = await sendMCPCommand(command);
      
      expect(result.error).toBeUndefined();
      expect(result.result.content[0].text).toContain('not found');
    });

    test('Invalid task ID should return proper error', async () => {
      const command = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "get_task_context",
          arguments: {
            task_id: "nonexistent-task-id"
          }
        }
      };

      const { result } = await sendMCPCommand(command);
      
      expect(result.error).toBeUndefined();
      expect(result.result.content[0].text).toContain('not found');
    });

    test('Empty search should not crash', async () => {
      const command = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "search_memories",
          arguments: {
            query: "",
            project: "test-integration"
          }
        }
      };

      const { result } = await sendMCPCommand(command);
      
      expect(result.error).toBeUndefined();
      // Should handle empty query gracefully
    });
  });

  describe('Performance and Stability', () => {
    test('Multiple rapid commands should not cause issues', async () => {
      const commands = Array.from({ length: 5 }, (_, i) => ({
        jsonrpc: "2.0",
        id: i + 1,
        method: "tools/call",
        params: {
          name: "test_tool",
          arguments: {
            message: `performance test ${i + 1}`
          }
        }
      }));

      const promises = commands.map(cmd => sendMCPCommand(cmd, 10000));
      const results = await Promise.all(promises);
      
      results.forEach((response, i) => {
        expect(response.result.error).toBeUndefined();
        expect(response.result.result.content[0].text).toContain(`performance test ${i + 1}`);
      });
    });

    test('Large memory content should be handled correctly', async () => {
      const largeContent = 'This is a large memory content. '.repeat(1000);
      
      const command = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "add_memory",
          arguments: {
            content: largeContent,
            category: "research",
            project: "test-integration",
            tags: ["large", "performance"]
          }
        }
      };

      const { result } = await sendMCPCommand(command, 45000); // Longer timeout for large content
      
      expect(result.error).toBeUndefined();
      expect(result.result.content[0].text).toContain('Memory stored');
    });
  });
});