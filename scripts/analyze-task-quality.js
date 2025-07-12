#!/usr/bin/env node

/**
 * Task Quality Analysis Script
 * 
 * Analyzes task descriptions and titles for quality issues
 * and provides improvement recommendations.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import MemoryDescriptionQualityScorer from '../lib/memory-description-quality-scorer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TaskQualityAnalyzer {
  constructor() {
    this.scorer = new MemoryDescriptionQualityScorer();
    this.results = [];
  }

  /**
   * Analyze all task files
   */
  async analyzeTasks() {
    const tasksDir = path.join(__dirname, '..', 'tasks');
    
    if (!fs.existsSync(tasksDir)) {
      console.log('No tasks directory found');
      return;
    }

    console.log('🔍 Analyzing task descriptions...');
    
    // Walk through all project directories
    const projects = fs.readdirSync(tasksDir).filter(item => 
      fs.statSync(path.join(tasksDir, item)).isDirectory()
    );

    for (const project of projects) {
      const projectDir = path.join(tasksDir, project);
      const taskFiles = fs.readdirSync(projectDir).filter(f => f.endsWith('.md'));
      
      console.log(`📁 Project: ${project} (${taskFiles.length} task files)`);
      
      for (const file of taskFiles) {
        const filePath = path.join(projectDir, file);
        await this.analyzeTaskFile(filePath, project);
      }
    }

    console.log(`✅ Analyzed ${this.results.length} task entries`);
  }

  /**
   * Analyze a single task file
   */
  async analyzeTaskFile(filePath, project) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const tasks = this.parseTasksFromFile(content);
      
      for (const task of tasks) {
        const titleScore = this.scorer.scoreTitle(task.title || '', task.description || '', task);
        const summaryScore = this.scorer.scoreSummary(task.description || '', task.description || '', task);
        
        const overallReport = this.scorer.generateQualityReport({
          title: task.title || '',
          summary: task.description || '',
          content: task.description || '',
          ...task
        });

        this.results.push({
          file: path.basename(filePath),
          project,
          taskId: task.id,
          title: task.title || '[No title]',
          description: task.description || '[No description]',
          titleScore,
          summaryScore,
          overallReport,
          task
        });
      }

    } catch (error) {
      console.error(`❌ Error analyzing ${filePath}:`, error.message);
    }
  }

  /**
   * Parse tasks from markdown file
   */
  parseTasksFromFile(content) {
    const tasks = [];
    
    // Split content into sections
    const sections = content.split(/^## /m);
    
    for (const section of sections) {
      if (!section.trim()) continue;
      
      // Extract task information
      const lines = section.split('\n');
      const title = lines[0]?.replace(/^#+\s*/, '').trim();
      
      if (!title) continue;
      
      // Look for task metadata
      const yamlMatch = section.match(/```yaml\s*([\s\S]*?)\s*```/);
      let taskData = {};
      
      if (yamlMatch) {
        try {
          // Simple YAML parsing for basic fields
          const yamlLines = yamlMatch[1].split('\n');
          for (const line of yamlLines) {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) {
              const value = valueParts.join(':').trim();
              taskData[key.trim()] = value;
            }
          }
        } catch (e) {
          console.warn(`Warning: Could not parse YAML in ${title}`);
        }
      }
      
      // Extract description
      const descriptionMatch = section.match(/\*\*Description\*\*:?\s*(.*?)(?=\*\*|$)/s);
      const description = descriptionMatch ? descriptionMatch[1].trim() : '';
      
      tasks.push({
        id: taskData.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title,
        description: description || section.substring(0, 200),
        status: taskData.status || 'unknown',
        priority: taskData.priority || 'medium',
        category: taskData.category || 'general',
        ...taskData
      });
    }
    
    return tasks;
  }

  /**
   * Generate quality report
   */
  generateReport() {
    const poorTasks = this.results.filter(r => r.overallReport.overallScore < 0.6);
    const averageScore = this.results.reduce((sum, r) => sum + r.overallReport.overallScore, 0) / this.results.length;
    
    const qualityDistribution = this.results.reduce((acc, result) => {
      acc[result.overallReport.overallQuality] = (acc[result.overallReport.overallQuality] || 0) + 1;
      return acc;
    }, {});

    return {
      total: this.results.length,
      averageScore,
      qualityDistribution,
      poorTasks: poorTasks.sort((a, b) => a.overallReport.overallScore - b.overallReport.overallScore),
      worstTitles: this.results
        .filter(r => r.titleScore.score < 0.6)
        .sort((a, b) => a.titleScore.score - b.titleScore.score)
        .slice(0, 10),
      worstDescriptions: this.results
        .filter(r => r.summaryScore.score < 0.6)
        .sort((a, b) => a.summaryScore.score - b.summaryScore.score)
        .slice(0, 10)
    };
  }

  /**
   * Print comprehensive report
   */
  printReport() {
    const report = this.generateReport();

    console.log('\n' + '='.repeat(80));
    console.log('📋 TASK DESCRIPTION QUALITY ANALYSIS REPORT');
    console.log('='.repeat(80));

    console.log(`\n📈 OVERALL STATISTICS`);
    console.log(`Total Tasks Analyzed: ${report.total}`);
    console.log(`Average Quality Score: ${report.averageScore.toFixed(2)}/1.00`);

    console.log(`\n📊 QUALITY DISTRIBUTION`);
    Object.entries(report.qualityDistribution).forEach(([quality, count]) => {
      const percentage = ((count / report.total) * 100).toFixed(1);
      console.log(`${quality}: ${count} (${percentage}%)`);
    });

    if (report.poorTasks.length > 0) {
      console.log(`\n🔴 POOR QUALITY TASKS (Score < 0.6)`);
      report.poorTasks.slice(0, 10).forEach((task, index) => {
        console.log(`\n${index + 1}. [${task.overallReport.overallScore.toFixed(2)}] "${task.title}"`);
        console.log(`   File: ${task.file} (${task.project})`);
        console.log(`   Description: "${task.description.substring(0, 100)}..."`);
        console.log(`   Issues: ${[...task.titleScore.issues, ...task.summaryScore.issues].join(', ')}`);
      });
    }

    if (report.worstTitles.length > 0) {
      console.log(`\n🔴 WORST TASK TITLES`);
      report.worstTitles.forEach((task, index) => {
        console.log(`${index + 1}. [${task.titleScore.score.toFixed(2)}] "${task.title}"`);
        console.log(`   Issues: ${task.titleScore.issues.join(', ')}`);
      });
    }

    if (report.worstDescriptions.length > 0) {
      console.log(`\n🔴 WORST TASK DESCRIPTIONS`);
      report.worstDescriptions.forEach((task, index) => {
        console.log(`${index + 1}. [${task.summaryScore.score.toFixed(2)}] "${task.description.substring(0, 100)}..."`);
        console.log(`   Issues: ${task.summaryScore.issues.join(', ')}`);
      });
    }

    console.log(`\n💡 RECOMMENDATIONS`);
    const poorCount = report.poorTasks.length;
    const poorPercent = (poorCount / report.total) * 100;
    
    if (poorPercent > 30) {
      console.log(`❗ HIGH PRIORITY: ${poorCount} tasks (${poorPercent.toFixed(1)}%) have poor quality descriptions`);
    } else if (poorPercent > 15) {
      console.log(`⚠️  MEDIUM PRIORITY: ${poorCount} tasks (${poorPercent.toFixed(1)}%) have poor quality descriptions`);
    } else {
      console.log(`✅ GOOD: Only ${poorCount} tasks (${poorPercent.toFixed(1)}%) have poor quality descriptions`);
    }

    console.log('\n📋 IMPROVEMENT SUGGESTIONS:');
    console.log('• Use specific technical terms instead of generic language');
    console.log('• Include clear action verbs in task titles');
    console.log('• Provide concrete acceptance criteria in descriptions');
    console.log('• Mention specific files, components, or systems affected');
    console.log('• Avoid truncated or auto-generated identifiers as titles');

    console.log('\n' + '='.repeat(80));
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Task Quality Analysis...\n');
  
  const analyzer = new TaskQualityAnalyzer();
  
  try {
    await analyzer.analyzeTasks();
    analyzer.printReport();
    
    console.log('\n✅ Task analysis complete!');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default TaskQualityAnalyzer;