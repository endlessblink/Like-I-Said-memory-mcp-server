#!/usr/bin/env node

/**
 * Visual UI test to ensure bottom panel elements are not cut off by Windows taskbar
 * This test runs the dashboard and takes screenshots to verify UI elements
 */

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Visual UI Test - Checking for Windows taskbar overlap...\n');

const screenshotDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function testUIElements() {
  let browser;
  
  try {
    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch({
      headless: false, // Set to true for CI
      defaultViewport: {
        width: 1920,
        height: 1080
      }
    });
    
    const page = await browser.newPage();
    
    console.log('📍 Navigating to dashboard...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    
    // Wait for the app to load
    await page.waitForSelector('.app-container', { timeout: 10000 });
    
    console.log('📸 Taking full page screenshot...');
    await page.screenshot({ 
      path: path.join(screenshotDir, 'full-page.png'),
      fullPage: true 
    });
    
    // Check if statistics panel is visible at bottom
    console.log('🔍 Checking statistics panel visibility...');
    const statsPanel = await page.$('.stats-panel');
    if (statsPanel) {
      const box = await statsPanel.boundingBox();
      console.log(`✅ Statistics panel found at: ${JSON.stringify(box)}`);
      
      // Check if it's cut off
      const viewportHeight = await page.evaluate(() => window.innerHeight);
      if (box && box.y + box.height > viewportHeight) {
        console.log('❌ Statistics panel is cut off by viewport!');
      } else {
        console.log('✅ Statistics panel is fully visible');
      }
      
      await page.screenshot({ 
        path: path.join(screenshotDir, 'stats-panel.png'),
        clip: box
      });
    } else {
      console.log('⚠️ Statistics panel not found');
    }
    
    // Check FAB visibility
    console.log('🔍 Checking FAB button visibility...');
    const fabButton = await page.$('.fab-bottom');
    if (fabButton) {
      const box = await fabButton.boundingBox();
      console.log(`✅ FAB button found at: ${JSON.stringify(box)}`);
      
      const viewportHeight = await page.evaluate(() => window.innerHeight);
      if (box && box.y + box.height > viewportHeight) {
        console.log('❌ FAB button is cut off by viewport!');
      } else {
        console.log('✅ FAB button is fully visible');
      }
    } else {
      console.log('⚠️ FAB button not found');
    }
    
    // Check computed styles of safe area elements
    console.log('\n🎨 Checking computed styles...');
    const safeBottom = await page.evaluate(() => {
      const root = document.documentElement;
      return getComputedStyle(root).getPropertyValue('--safe-bottom');
    });
    console.log(`Safe bottom value: ${safeBottom}`);
    
    // Check sidebar height
    const sidebarHeight = await page.evaluate(() => {
      const sidebar = document.querySelector('.sidebar-safe');
      if (sidebar) {
        return getComputedStyle(sidebar).height;
      }
      return null;
    });
    console.log(`Sidebar height: ${sidebarHeight}`);
    
    console.log('\n✅ Visual test completed!');
    console.log(`Screenshots saved to: ${screenshotDir}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Check if dashboard is running
async function checkDashboardRunning() {
  try {
    const response = await fetch('http://localhost:5173');
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function main() {
  const isDashboardRunning = await checkDashboardRunning();
  
  if (!isDashboardRunning) {
    console.log('⚠️ Dashboard is not running on http://localhost:5173');
    console.log('Please run "npm run dev" in another terminal first.\n');
    process.exit(1);
  }
  
  await testUIElements();
}

main().catch(console.error);