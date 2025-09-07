const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function diagnoseDashboard() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down by 1s for debugging
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Collect console logs
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });
  
  // Collect network failures
  const networkFailures = [];
  page.on('response', response => {
    if (!response.ok()) {
      networkFailures.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
    }
  });
  
  // Collect JavaScript errors
  const jsErrors = [];
  page.on('pageerror', error => {
    jsErrors.push(error.message);
  });
  
  try {
    console.log('🔍 Navigating to http://localhost:8777...');
    
    // Set a longer timeout for navigation
    await page.goto('http://localhost:8777', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✅ Page loaded successfully');
    
    // Wait a bit for React to render
    await page.waitForTimeout(3000);
    
    // Take screenshot
    const screenshotPath = path.join(__dirname, 'dashboard-screenshot.png');
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true 
    });
    console.log(`📸 Screenshot saved to: ${screenshotPath}`);
    
    // Check page title
    const title = await page.title();
    console.log(`📄 Page title: "${title}"`);
    
    // Check if React root exists
    const reactRoot = await page.locator('#root').count();
    console.log(`⚛️  React root element found: ${reactRoot > 0}`);
    
    // Check for specific dashboard elements
    const dashboardElements = await page.evaluate(() => {
      return {
        hasReactApp: document.querySelector('#root') !== null,
        hasContent: document.querySelector('#root')?.innerHTML?.length > 0,
        bodyClasses: document.body.className,
        bodyContent: document.body.innerHTML.substring(0, 500) + '...',
        scripts: Array.from(document.scripts).map(s => s.src || 'inline'),
        stylesheets: Array.from(document.styleSheets).map(s => s.href || 'inline')
      };
    });
    
    console.log('🔍 Dashboard analysis:');
    console.log(`  - React app container exists: ${dashboardElements.hasReactApp}`);
    console.log(`  - Content in root: ${dashboardElements.hasContent}`);
    console.log(`  - Body classes: ${dashboardElements.bodyClasses}`);
    console.log(`  - Scripts loaded: ${dashboardElements.scripts.length}`);
    console.log(`  - Stylesheets loaded: ${dashboardElements.stylesheets.length}`);
    
    // Check for specific error messages
    const errorMessages = await page.evaluate(() => {
      const errors = [];
      const errorElements = document.querySelectorAll('[class*="error"], .error-message, .error');
      errorElements.forEach(el => errors.push(el.textContent));
      return errors;
    });
    
    // Wait for potential async content
    console.log('⏳ Waiting for dynamic content...');
    await page.waitForTimeout(5000);
    
    // Take final screenshot after waiting
    const finalScreenshotPath = path.join(__dirname, 'dashboard-final-screenshot.png');
    await page.screenshot({ 
      path: finalScreenshotPath, 
      fullPage: true 
    });
    
    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      pageTitle: title,
      url: page.url(),
      dashboardElements,
      consoleLogs,
      networkFailures,
      jsErrors,
      errorMessages,
      screenshots: [screenshotPath, finalScreenshotPath]
    };
    
    const reportPath = path.join(__dirname, 'dashboard-diagnosis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📊 DIAGNOSIS REPORT:');
    console.log('===================');
    console.log(`Console logs: ${consoleLogs.length}`);
    if (consoleLogs.length > 0) {
      console.log('Console messages:');
      consoleLogs.forEach(log => console.log(`  ${log}`));
    }
    
    console.log(`\nNetwork failures: ${networkFailures.length}`);
    if (networkFailures.length > 0) {
      console.log('Failed requests:');
      networkFailures.forEach(failure => {
        console.log(`  ${failure.status} ${failure.url}`);
      });
    }
    
    console.log(`\nJavaScript errors: ${jsErrors.length}`);
    if (jsErrors.length > 0) {
      console.log('JS errors:');
      jsErrors.forEach(error => console.log(`  ${error}`));
    }
    
    console.log(`\nError messages on page: ${errorMessages.length}`);
    if (errorMessages.length > 0) {
      errorMessages.forEach(msg => console.log(`  ${msg}`));
    }
    
    console.log(`\n📋 Full report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message);
    
    // Take screenshot even on error
    try {
      const errorScreenshotPath = path.join(__dirname, 'dashboard-error-screenshot.png');
      await page.screenshot({ path: errorScreenshotPath, fullPage: true });
      console.log(`📸 Error screenshot saved to: ${errorScreenshotPath}`);
    } catch (screenshotError) {
      console.error('Failed to take error screenshot:', screenshotError.message);
    }
  } finally {
    await browser.close();
  }
}

// Check if dashboard server is running
async function checkDashboardServer() {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('http://localhost:8777', { 
      method: 'HEAD',
      timeout: 5000 
    });
    console.log(`🌐 Dashboard server status: ${response.status} ${response.statusText}`);
    return true;
  } catch (error) {
    console.error('❌ Dashboard server not accessible:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting dashboard diagnosis...\n');
  
  // First check if server is running
  const serverRunning = await checkDashboardServer();
  
  if (!serverRunning) {
    console.log('💡 Try starting the dashboard server with:');
    console.log('   npm run dev:full');
    console.log('   or');
    console.log('   npm run start:dashboard');
    return;
  }
  
  await diagnoseDashboard();
  console.log('\n✅ Dashboard diagnosis complete!');
}

main().catch(console.error);