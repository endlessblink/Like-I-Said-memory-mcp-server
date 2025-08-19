#!/usr/bin/env node

// Test imports one by one to identify which one causes the hang

console.log('Testing imports...');

try {
    console.log('1. Testing DropoffGenerator...');
    const { DropoffGenerator } = await import('./lib/dropoff-generator.js');
    console.log('✅ DropoffGenerator OK');

    console.log('2. Testing TaskStorage...');
    const { TaskStorage } = await import('./lib/task-storage.js');
    console.log('✅ TaskStorage OK');

    console.log('3. Testing TaskMemoryLinker...');
    const { TaskMemoryLinker } = await import('./lib/task-memory-linker.js');
    console.log('✅ TaskMemoryLinker OK');

    console.log('4. Testing TitleSummaryGenerator...');
    const { TitleSummaryGenerator } = await import('./lib/title-summary-generator.js');
    console.log('✅ TitleSummaryGenerator OK');

    console.log('5. Testing OllamaClient...');
    const { OllamaClient } = await import('./lib/ollama-client.js');
    console.log('✅ OllamaClient OK');

    console.log('6. Testing MemoryDeduplicator...');
    const { MemoryDeduplicator } = await import('./lib/memory-deduplicator.js');
    console.log('✅ MemoryDeduplicator OK');

    console.log('7. Testing TaskNLPProcessor...');
    const { TaskNLPProcessor } = await import('./lib/task-nlp-processor.js');
    console.log('✅ TaskNLPProcessor OK');

    console.log('8. Testing TaskAutomation...');
    const { TaskAutomation } = await import('./lib/task-automation.js');
    console.log('✅ TaskAutomation OK');

    console.log('9. Testing ConversationMonitor...');
    const { ConversationMonitor } = await import('./lib/conversation-monitor.js');
    console.log('✅ ConversationMonitor OK');

    console.log('10. Testing MemoryTaskAutomator (suspect)...');
    const { MemoryTaskAutomator } = await import('./lib/memory-task-automator.cjs');
    console.log('✅ MemoryTaskAutomator OK');

    console.log('11. Testing QueryIntelligence...');
    const { QueryIntelligence } = await import('./lib/query-intelligence.js');
    console.log('✅ QueryIntelligence OK');

    console.log('12. Testing BehavioralAnalyzer...');
    const { BehavioralAnalyzer } = await import('./lib/behavioral-analyzer.js');
    console.log('✅ BehavioralAnalyzer OK');

    console.log('🎯 All imports tested successfully!');

} catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error('Stack:', error.stack);
}