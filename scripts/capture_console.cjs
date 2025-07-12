const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await browser.newPage();
  
  // Listen for console messages
  page.on('console', msg => {
    console.log(`CONSOLE ${msg.type().toUpperCase()}: ${msg.text()}`);
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });
  
  // Listen for request failures
  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url());
  });
  
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 15000 });
    
    // Wait a bit more for React to render
    await page.waitForTimeout(5000);
    
    // Check if there are any React error overlays
    const errorOverlay = await page.$('.react-error-overlay') || await page.$('[data-error-boundary]');
    if (errorOverlay) {
      const errorText = await page.evaluate(el => el.textContent, errorOverlay);
      console.log('REACT ERROR OVERLAY:', errorText);
    }
    
    // Take a screenshot for verification
    await page.screenshot({ path: '/tmp/puppeteer_screenshot.png' });
    
  } catch (error) {
    console.log('NAVIGATION ERROR:', error.message);
  }
  
  await browser.close();
})();