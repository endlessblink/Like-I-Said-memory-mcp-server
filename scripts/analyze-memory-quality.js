#!/usr/bin/env node

/**
 * Memory Quality Analysis Script
 * 
 * Analyzes all existing memories and tasks to identify quality issues
 * and provide comprehensive reporting on description quality.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import MemoryDescriptionQualityScorer from '../lib/memory-description-quality-scorer.js';
import { MemoryFormat } from '../lib/memory-format.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MemoryQualityAnalyzer {
  constructor() {
    this.scorer = new MemoryDescriptionQualityScorer();
    this.results = {
      memories: [],
      tasks: [],
      summary: {
        totalMemories: 0,
        totalTasks: 0,
        qualityDistribution: {
          excellent: 0,
          good: 0,
          acceptable: 0,
          poor: 0,
          veryPoor: 0
        },
        worstTitles: [],
        worstSummaries: [],
        averageScore: 0,
        commonIssues: {}
      }
    };
  }

  /**
   * Analyze all memories in the memories directory
   */
  async analyzeMemories() {
    const memoriesDir = path.join(__dirname, '..', 'memories');
    
    if (!fs.existsSync(memoriesDir)) {
      console.log('No memories directory found');
      return;
    }

    console.log('🔍 Analyzing memory descriptions...');
    
    // Walk through all project directories
    const projects = fs.readdirSync(memoriesDir).filter(item => 
      fs.statSync(path.join(memoriesDir, item)).isDirectory()
    );

    for (const project of projects) {
      const projectDir = path.join(memoriesDir, project);
      const memoryFiles = fs.readdirSync(projectDir).filter(f => f.endsWith('.md'));
      
      console.log(`📁 Project: ${project} (${memoryFiles.length} memories)`);
      
      for (const file of memoryFiles) {
        const filePath = path.join(projectDir, file);
        await this.analyzeMemoryFile(filePath, project);
      }
    }

    this.results.summary.totalMemories = this.results.memories.length;
    console.log(`✅ Analyzed ${this.results.summary.totalMemories} memories`);
  }

  /**
   * Analyze a single memory file
   */
  async analyzeMemoryFile(filePath, project) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const memory = MemoryFormat.parseMemoryContent(content);
      
      if (!memory) {
        console.log(`⚠️  Could not parse memory file: ${filePath}`);
        return;
      }

      // Extract title and summary from tags or content
      const title = this.extractTitle(memory, content);
      const summary = this.extractSummary(memory, content);
      
      // Score the title and summary
      const titleScore = this.scorer.scoreTitle(title || '', content, memory);
      const summaryScore = this.scorer.scoreSummary(summary || '', content, memory);
      const overallReport = this.scorer.generateQualityReport({
        title: title || '',
        summary: summary || '',
        content: content,
        ...memory
      });

      const result = {
        file: path.basename(filePath),
        project,
        title: title || '[No title]',
        summary: summary || '[No summary]',
        titleScore,
        summaryScore,
        overallReport,
        metadata: memory
      };

      this.results.memories.push(result);
      
      // Update quality distribution
      this.updateQualityDistribution(overallReport.overallQuality);
      
      // Track common issues
      this.trackCommonIssues(titleScore.issues, summaryScore.issues);

      // Track worst titles and summaries
      if (titleScore.score < 0.5) {
        this.results.summary.worstTitles.push({
          title: title || '[No title]',
          score: titleScore.score,
          issues: titleScore.issues,
          file: path.basename(filePath),
          project
        });
      }

      if (summaryScore.score < 0.5) {
        this.results.summary.worstSummaries.push({
          summary: summary || '[No summary]',
          score: summaryScore.score,
          issues: summaryScore.issues,
          file: path.basename(filePath),
          project
        });
      }

    } catch (error) {
      console.error(`❌ Error analyzing ${filePath}:`, error.message);
    }
  }

  /**
   * Extract title from memory tags or content
   */
  extractTitle(memory, content) {
    // Try to find title in tags
    if (memory.tags) {
      for (const tag of memory.tags) {
        if (tag.startsWith('title:')) {
          return tag.substring(6).trim();
        }
      }
    }

    // Try to extract from first line
    const lines = content.split('\n');
    const firstLine = lines.find(line => line.trim() && !line.startsWith('---'));
    
    if (firstLine) {
      return firstLine.replace(/^#+\s*/, '').trim().substring(0, 100);
    }

    return memory.id || '[No title]';
  }

  /**
   * Extract summary from memory tags or content
   */
  extractSummary(memory, content) {
    // Try to find summary in tags
    if (memory.tags) {
      for (const tag of memory.tags) {
        if (tag.startsWith('summary:')) {
          return tag.substring(8).trim();
        }
      }
    }

    // Generate a simple summary from content
    const contentWithoutFrontmatter = content.replace(/^---[\s\S]*?---\n/, '');
    const firstParagraph = contentWithoutFrontmatter.split('\n\n')[0];
    
    if (firstParagraph && firstParagraph.length > 10) {
      return firstParagraph.substring(0, 150).trim();
    }

    return '[No summary]';
  }

  /**
   * Update quality distribution counters
   */
  updateQualityDistribution(quality) {
    switch (quality) {
      case 'excellent':
        this.results.summary.qualityDistribution.excellent++;
        break;
      case 'good':
        this.results.summary.qualityDistribution.good++;
        break;
      case 'acceptable':
        this.results.summary.qualityDistribution.acceptable++;
        break;
      case 'poor':
        this.results.summary.qualityDistribution.poor++;
        break;
      case 'very poor':
        this.results.summary.qualityDistribution.veryPoor++;
        break;
    }
  }

  /**
   * Track common issues for reporting
   */
  trackCommonIssues(titleIssues, summaryIssues) {
    [...titleIssues, ...summaryIssues].forEach(issue => {
      this.results.summary.commonIssues[issue] = (this.results.summary.commonIssues[issue] || 0) + 1;
    });
  }

  /**
   * Calculate average quality score
   */
  calculateAverageScore() {
    if (this.results.memories.length === 0) return 0;
    
    const totalScore = this.results.memories.reduce((sum, result) => 
      sum + result.overallReport.overallScore, 0
    );
    
    return totalScore / this.results.memories.length;
  }

  /**
   * Generate comprehensive quality report
   */
  generateReport() {
    this.results.summary.averageScore = this.calculateAverageScore();
    
    // Sort worst titles and summaries by score
    this.results.summary.worstTitles.sort((a, b) => a.score - b.score);
    this.results.summary.worstSummaries.sort((a, b) => a.score - b.score);
    
    // Keep only top 20 worst examples
    this.results.summary.worstTitles = this.results.summary.worstTitles.slice(0, 20);
    this.results.summary.worstSummaries = this.results.summary.worstSummaries.slice(0, 20);

    return this.results;
  }

  /**
   * Print human-readable report
   */
  printReport() {
    const report = this.generateReport();
    const { summary } = report;

    console.log('\n' + '='.repeat(80));
    console.log('📊 MEMORY DESCRIPTION QUALITY ANALYSIS REPORT');
    console.log('='.repeat(80));

    console.log(`\n📈 OVERALL STATISTICS`);
    console.log(`Total Memories Analyzed: ${summary.totalMemories}`);
    console.log(`Average Quality Score: ${summary.averageScore.toFixed(2)}/1.00`);

    console.log(`\n📊 QUALITY DISTRIBUTION`);
    const dist = summary.qualityDistribution;
    const total = summary.totalMemories;
    console.log(`Excellent: ${dist.excellent} (${((dist.excellent/total)*100).toFixed(1)}%)`);
    console.log(`Good: ${dist.good} (${((dist.good/total)*100).toFixed(1)}%)`);
    console.log(`Acceptable: ${dist.acceptable} (${((dist.acceptable/total)*100).toFixed(1)}%)`);
    console.log(`Poor: ${dist.poor} (${((dist.poor/total)*100).toFixed(1)}%)`);
    console.log(`Very Poor: ${dist.veryPoor} (${((dist.veryPoor/total)*100).toFixed(1)}%)`);

    console.log(`\n⚠️  COMMON ISSUES`);
    const sortedIssues = Object.entries(summary.commonIssues)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    sortedIssues.forEach(([issue, count]) => {
      console.log(`${issue}: ${count} occurrences`);
    });

    console.log(`\n🔴 WORST TITLES (Bottom 20)`);
    summary.worstTitles.forEach((item, index) => {
      console.log(`${index + 1}. [${item.score.toFixed(2)}] "${item.title}"`);
      console.log(`   File: ${item.file} (${item.project})`);
      console.log(`   Issues: ${item.issues.join(', ')}`);
      console.log('');
    });

    console.log(`\n🔴 WORST SUMMARIES (Bottom 20)`);
    summary.worstSummaries.forEach((item, index) => {
      console.log(`${index + 1}. [${item.score.toFixed(2)}] "${item.summary.substring(0, 100)}..."`);
      console.log(`   File: ${item.file} (${item.project})`);
      console.log(`   Issues: ${item.issues.join(', ')}`);
      console.log('');
    });

    console.log(`\n💡 RECOMMENDATIONS`);
    
    const poorCount = dist.poor + dist.veryPoor;
    const poorPercent = (poorCount / total) * 100;
    
    if (poorPercent > 30) {
      console.log(`❗ HIGH PRIORITY: ${poorCount} memories (${poorPercent.toFixed(1)}%) have poor quality descriptions`);
    } else if (poorPercent > 15) {
      console.log(`⚠️  MEDIUM PRIORITY: ${poorCount} memories (${poorPercent.toFixed(1)}%) have poor quality descriptions`);
    } else {
      console.log(`✅ GOOD: Only ${poorCount} memories (${poorPercent.toFixed(1)}%) have poor quality descriptions`);
    }

    if (summary.averageScore < 0.6) {
      console.log('📋 Consider implementing automated description improvement');
      console.log('🔄 Run batch processing to regenerate poor quality descriptions');
    }

    console.log('\n' + '='.repeat(80));
  }

  /**
   * Save detailed report to file
   */
  saveReport(filename = 'memory-quality-report.json') {
    const report = this.generateReport();
    const reportPath = path.join(__dirname, '..', filename);
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Memory Quality Analysis...\n');
  
  const analyzer = new MemoryQualityAnalyzer();
  
  try {
    await analyzer.analyzeMemories();
    analyzer.printReport();
    analyzer.saveReport();
    
    console.log('\n✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default MemoryQualityAnalyzer;