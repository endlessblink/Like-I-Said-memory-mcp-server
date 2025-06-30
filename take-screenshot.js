import { chromium } from 'playwright';

async function takeScreenshot() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to localhost:5173...');
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    console.log('Waiting for page to load...');
    await page.waitForTimeout(3000);
    
    // Click on Memories tab to see the Search heading
    console.log('Clicking Memories tab...');
    await page.click('text=Memories');
    await page.waitForTimeout(1000);
    
    console.log('Taking screenshot...');
    await page.screenshot({ 
      path: 'dashboard-navigation-fixed.png', 
      fullPage: false 
    });
    
    console.log('Screenshot saved as dashboard-navigation.png');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

takeScreenshot();