/**
 * Common test utilities
 */

// Timeout wrapper for async functions
export async function withTimeout(promise, timeoutMs = 30000, message = 'Operation timed out') {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

// Safe file reader with timeout
export async function safeReadFile(path, timeout = 5000) {
  const fs = await import('fs/promises');
  return withTimeout(fs.readFile(path, 'utf8'), timeout, `Timeout reading file: ${path}`);
}

// Process killer with timeout
export function killProcessWithTimeout(process, timeout = 5000) {
  return new Promise((resolve) => {
    if (!process) {
      resolve();
      return;
    }

    const timeoutId = setTimeout(() => {
      console.log('Force killing process...');
      process.kill('SIGKILL');
      resolve();
    }, timeout);

    process.on('close', () => {
      clearTimeout(timeoutId);
      resolve();
    });

    process.kill('SIGTERM');
  });
}

// Test runner with global timeout
export async function runTestWithTimeout(testFn, name, timeout = 60000) {
  console.log(`\n🏃 Running: ${name}`);
  const startTime = Date.now();
  
  try {
    await withTimeout(testFn(), timeout, `Test "${name}" exceeded ${timeout}ms timeout`);
    const duration = Date.now() - startTime;
    console.log(`✅ ${name} completed in ${duration}ms`);
    return { success: true, duration, name };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ ${name} failed after ${duration}ms:`, error.message);
    return { success: false, duration, name, error: error.message };
  }
}