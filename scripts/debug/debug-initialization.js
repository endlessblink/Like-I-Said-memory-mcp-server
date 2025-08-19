#!/usr/bin/env node

// Test initialization of classes to identify which one hangs

import fs from 'fs';
import path from 'path';

// Import the basic storage system first
const MarkdownStorage = (await import('./lib/memory-storage-wrapper.js')).MarkdownStorage;

console.log('Testing class initialization...');

try {
    console.log('1. Testing MarkdownStorage...');
    const MEMORY_DIR = process.env.MEMORY_DIR || path.join(process.cwd(), 'memories');
    let storage = new MarkdownStorage(MEMORY_DIR);
    console.log('✅ MarkdownStorage OK');

    console.log('2. Testing ConversationMonitor...');
    const { ConversationMonitor } = await import('./lib/conversation-monitor.js');
    const vectorStorage = {
        initialized: false,
        initialize: async () => {},
        addMemory: async () => {},
        addTask: async () => {},
        searchSimilar: async () => [],
        rebuildIndex: async () => {}
    };
    const conversationMonitor = new ConversationMonitor(storage, vectorStorage);
    console.log('✅ ConversationMonitor OK');

    console.log('3. Testing QueryIntelligence...');
    const { QueryIntelligence } = await import('./lib/query-intelligence.js');
    const queryIntelligence = new QueryIntelligence();
    console.log('✅ QueryIntelligence OK');

    console.log('4. Testing BehavioralAnalyzer...');
    const { BehavioralAnalyzer } = await import('./lib/behavioral-analyzer.js');
    const behavioralAnalyzer = new BehavioralAnalyzer();
    console.log('✅ BehavioralAnalyzer OK');

    console.log('5. Testing MemoryEnrichment...');
    const { MemoryEnrichment } = await import('./lib/memory-enrichment.js');
    const memoryEnrichment = new MemoryEnrichment(storage, vectorStorage);
    console.log('✅ MemoryEnrichment OK');

    console.log('6. Testing SessionTracker...');
    const { SessionTracker } = await import('./lib/session-tracker.js');
    const sessionTracker = new SessionTracker(storage);
    console.log('✅ SessionTracker OK');

    console.log('7. Testing ProactiveConfigManager...');
    const { ProactiveConfigManager } = await import('./lib/proactive-config.js');
    const proactiveConfig = new ProactiveConfigManager();
    console.log('✅ ProactiveConfigManager OK');

    console.log('8. Testing WorkDetectorWrapper...');
    const { WorkDetectorWrapper } = await import('./lib/work-detector-wrapper.js');
    const workDetector = new WorkDetectorWrapper({ 
        enabled: true,
        debugMode: false,
        safeMode: true 
    });
    console.log('✅ WorkDetectorWrapper OK');

    console.log('🎯 All class initializations completed successfully!');

} catch (error) {
    console.error('❌ Initialization failed:', error.message);
    console.error('Stack:', error.stack);
}