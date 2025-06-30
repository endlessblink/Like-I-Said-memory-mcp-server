import { chromium } from 'playwright';

async function debugAlignment() {
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
    
    // Get the position of the "Search" heading
    const searchElement = await page.locator('text=Search').first();
    const searchBox = await searchElement.boundingBox();
    console.log('Search element position:', searchBox);
    
    // Get the position of the "LIKE I SAID" text
    const logoElement = await page.locator('text=LIKE I SAID').first();
    const logoBox = await logoElement.boundingBox();
    console.log('Logo element position:', logoBox);
    
    // Get the position of the nav container
    const navContainer = await page.locator('.nav-container').first();
    const navBox = await navContainer.boundingBox();
    console.log('Nav container position:', navBox);
    
    // Get the position of the space container
    const spaceContainer = await page.locator('.space-container').first();
    const spaceBox = await spaceContainer.boundingBox();
    console.log('Space container position:', spaceBox);
    
    // Calculate required alignment
    if (searchBox && logoBox && spaceBox) {
      const searchLeft = searchBox.x;
      const logoLeft = logoBox.x;
      const spaceLeft = spaceBox.x;
      
      console.log('\\n=== ALIGNMENT ANALYSIS ===');
      console.log(`Search starts at: ${searchLeft}px`);
      console.log(`Logo starts at: ${logoLeft}px`);
      console.log(`Space container starts at: ${spaceLeft}px`);
      console.log(`Difference: ${logoLeft - searchLeft}px`);
      console.log(`Logo needs to move LEFT by: ${logoLeft - searchLeft}px`);
      
      // Calculate nav container left padding needed
      const currentNavPadding = logoLeft - spaceLeft;
      const requiredNavPadding = searchLeft - spaceLeft;
      console.log(`\\nCurrent nav padding: ${currentNavPadding}px`);
      console.log(`Required nav padding: ${requiredNavPadding}px`);
      console.log(`Adjust nav padding by: ${requiredNavPadding - currentNavPadding}px`);
    }
    
    console.log('\\nTaking debug screenshot...');
    await page.screenshot({ 
      path: 'debug-alignment.png', 
      fullPage: false 
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugAlignment();