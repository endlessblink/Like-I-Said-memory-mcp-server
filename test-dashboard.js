const { chromium } = require('playwright');

async function testDashboard() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen for console messages and errors
  page.on('console', msg => {
    console.log(`[CONSOLE ${msg.type()}]: ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR]: ${error.message}`);
    console.log(`Stack: ${error.stack}`);
  });
  
  try {
    console.log('Navigating to localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    console.log('Page loaded, checking for errors...');
    
    // Wait a bit for React to render
    await page.waitForTimeout(3000);
    
    // Check if the page has content
    const bodyText = await page.textContent('body');
    console.log('Page content length:', bodyText.length);
    
    // Take a screenshot
    await page.screenshot({ path: 'dashboard-error.png', fullPage: true });
    console.log('Screenshot saved as dashboard-error.png');
    
    // Check for specific elements
    const memoryCards = await page.locator('.card-modern').count();
    console.log('Memory cards found:', memoryCards);
    
  } catch (error) {
    console.error('Error testing dashboard:', error);
  } finally {
    await browser.close();
  }
}

testDashboard();