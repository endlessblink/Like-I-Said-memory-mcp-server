#!/usr/bin/env node

// Test script to validate SelectItem values across the codebase
console.log('🔍 Testing for potential SelectItem empty value issues...\n');

// Check data from API
async function testSelectItemValues() {
  try {
    // Test API endpoint
    const response = await fetch('http://localhost:3001/api/memories');
    const memories = await response.json();
    
    console.log(`📊 Total memories: ${memories.length}`);
    
    // Extract all unique values that might be used in SelectItems
    const projects = new Set();
    const tags = new Set();
    const categories = new Set();
    
    memories.forEach(memory => {
      // Check projects
      if (memory.project !== undefined && memory.project !== null) {
        projects.add(memory.project);
      }
      
      // Check tags
      if (memory.tags && Array.isArray(memory.tags)) {
        memory.tags.forEach(tag => tags.add(tag));
      }
      
      // Check categories
      if (memory.category !== undefined && memory.category !== null) {
        categories.add(memory.category);
      }
    });
    
    // Check for problematic values
    console.log('\n🏷️  Projects:');
    const problemProjects = [];
    projects.forEach(project => {
      if (!project || project.trim() === '') {
        problemProjects.push(`Empty project: "${project}"`);
      } else {
        console.log(`  ✅ "${project}"`);
      }
    });
    
    console.log('\n🔖 Tags:');
    const problemTags = [];
    tags.forEach(tag => {
      if (!tag || tag.trim() === '') {
        problemTags.push(`Empty tag: "${tag}"`);
      } else if (tag.length > 50) {
        console.log(`  ⚠️  Long tag (${tag.length} chars): "${tag.substring(0, 50)}..."`);
      }
    });
    
    console.log('\n📁 Categories:');
    const problemCategories = [];
    categories.forEach(category => {
      if (!category || category.trim() === '') {
        problemCategories.push(`Empty category: "${category}"`);
      } else {
        console.log(`  ✅ "${category}"`);
      }
    });
    
    // Report problems
    console.log('\n❗ PROBLEMS FOUND:');
    if (problemProjects.length > 0) {
      console.log('Projects with issues:', problemProjects);
    }
    if (problemTags.length > 0) {
      console.log('Tags with issues:', problemTags);
    }
    if (problemCategories.length > 0) {
      console.log('Categories with issues:', problemCategories);
    }
    
    if (problemProjects.length === 0 && problemTags.length === 0 && problemCategories.length === 0) {
      console.log('✅ No empty value issues found!');
    }
    
    // Check for edge cases
    console.log('\n🔍 Edge Cases Check:');
    let edgeCases = 0;
    
    memories.forEach(memory => {
      // Check for undefined vs null vs empty string
      if (memory.project === '') {
        console.log(`  ⚠️  Memory ${memory.id} has empty string project`);
        edgeCases++;
      }
      if (memory.category === '') {
        console.log(`  ⚠️  Memory ${memory.id} has empty string category`);
        edgeCases++;
      }
      if (memory.tags && memory.tags.includes('')) {
        console.log(`  ⚠️  Memory ${memory.id} has empty string in tags`);
        edgeCases++;
      }
    });
    
    if (edgeCases === 0) {
      console.log('  ✅ No edge cases found');
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    console.log('\nMake sure the dashboard server is running:');
    console.log('  node dashboard-server-bridge.js');
  }
}

// Run the test
testSelectItemValues();