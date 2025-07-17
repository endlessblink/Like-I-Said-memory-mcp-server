/**
 * Ollama Local AI Client for Memory Enhancement
 * Provides privacy-focused, local AI processing for title/summary generation
 */

import fs from 'fs';

export class OllamaClient {
  constructor(baseUrl, options = {}) {
    // Auto-detect best URL if not provided
    this.baseUrl = baseUrl || this.getDefaultBaseUrl()
    this.options = {
      model: options.model || 'llama3.1:latest',
      temperature: options.temperature || 0.1,
      maxTokens: options.maxTokens || 200,
      batchSize: options.batchSize || 5,
      requestTimeout: options.requestTimeout || 30000,
      ...options
    }
  }

  /**
   * Get the default base URL, detecting WSL environment
   */
  getDefaultBaseUrl() {
    // Check environment variable first
    if (process.env.OLLAMA_HOST) {
      const host = process.env.OLLAMA_HOST.startsWith('http') ? 
        process.env.OLLAMA_HOST : 
        `http://${process.env.OLLAMA_HOST}`;
      if (process.env.DEBUG_MCP) console.error(`🔌 Using OLLAMA_HOST from environment: ${host}`);
      return host;
    }
    
    // Check if running in WSL
    if (process.platform === 'linux' && (process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP)) {
      if (process.env.DEBUG_MCP) console.error(`🔌 WSL detected - WSL_DISTRO_NAME: ${process.env.WSL_DISTRO_NAME}`);
      
      // Try multiple methods to get Windows host IP
      const candidateIPs = this.getWSLHostIPs();
      
      if (candidateIPs.length > 0) {
        const primaryIP = candidateIPs[0];
        if (process.env.DEBUG_MCP) console.error(`🔌 WSL detected, using Windows host IP: ${primaryIP}`);
        return `http://${primaryIP}:11434`;
      }
      
      // Fallback to common WSL host IPs
      if (process.env.DEBUG_MCP) console.error(`🔌 WSL detected, using fallback host IP`);
      return 'http://host.docker.internal:11434';
    }
    
    return 'http://localhost:11434';
  }

  /**
   * Get potential Windows host IPs from various sources in WSL
   */
  getWSLHostIPs() {
    const candidates = [];
    
    try {
      // Method 1: Get gateway IP from routing table
      const { execSync } = require('child_process');
      const routeOutput = execSync('ip route show default', { encoding: 'utf8' });
      const gatewayMatch = routeOutput.match(/default via (\d+\.\d+\.\d+\.\d+)/);
      if (gatewayMatch && gatewayMatch[1]) {
        candidates.push(gatewayMatch[1]);
        if (process.env.DEBUG_MCP) console.error(`🔍 Found gateway IP: ${gatewayMatch[1]}`);
      }
    } catch (e) {
      if (process.env.DEBUG_MCP) console.error('Could not get gateway IP from routing table');
    }
    
    try {
      // Method 2: Get nameserver from resolv.conf
      const resolv = fs.readFileSync('/etc/resolv.conf', 'utf8');
      const match = resolv.match(/nameserver\s+(\d+\.\d+\.\d+\.\d+)/);
      if (match && match[1] && !candidates.includes(match[1])) {
        candidates.push(match[1]);
        if (process.env.DEBUG_MCP) console.error(`🔍 Found nameserver IP: ${match[1]}`);
      }
    } catch (e) {
      if (process.env.DEBUG_MCP) console.error('Could not read Windows host IP from /etc/resolv.conf');
    }
    
    // Add common fallback IPs that aren't already in the list
    const fallbacks = ['172.17.0.1', '192.168.65.2', '172.20.144.1'];
    fallbacks.forEach(ip => {
      if (!candidates.includes(ip)) {
        candidates.push(ip);
      }
    });
    
    return candidates;
  }

  /**
   * Check if Ollama server is available
   */
  async isAvailable() {
    // Try the configured URL first
    try {
      if (process.env.DEBUG_MCP) console.error(`🔄 Testing primary URL: ${this.baseUrl}`);
      const response = await fetch(`${this.baseUrl}/api/version`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      })
      if (response.ok) {
        if (process.env.DEBUG_MCP) console.error(`✅ Ollama available at primary URL: ${this.baseUrl}`);
        return true;
      }
    } catch (error) {
      if (process.env.DEBUG_MCP) console.error(`❌ Primary URL failed (${this.baseUrl}):`, error.message);
    }
    
    // If in WSL and primary URL failed, try comprehensive alternative URLs
    if (process.platform === 'linux' && (process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP)) {
      if (process.env.DEBUG_MCP) console.error(`🔍 WSL detected, trying alternative URLs...`);
      
      // Build comprehensive list of alternative URLs
      const wslIPs = this.getWSLHostIPs();
      const alternativeUrls = [
        ...wslIPs.map(ip => `http://${ip}:11434`),
        'http://localhost:11434',
        'http://127.0.0.1:11434',
        'http://host.docker.internal:11434'
      ].filter((url, index, array) => {
        // Remove duplicates and filter out the primary URL
        return array.indexOf(url) === index && url !== this.baseUrl;
      });
      
      if (process.env.DEBUG_MCP) console.error(`🔍 Testing ${alternativeUrls.length} alternative URLs`);
      
      for (const url of alternativeUrls) {
        try {
          if (process.env.DEBUG_MCP) console.error(`🔄 Testing: ${url}`);
          const response = await fetch(`${url}/api/version`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(3000)
          })
          if (response.ok) {
            if (process.env.DEBUG_MCP) console.error(`✅ Ollama found at alternative URL: ${url}`);
            this.baseUrl = url // Update to working URL
            return true
          }
        } catch (e) {
          if (process.env.DEBUG_MCP) console.error(`❌ Failed: ${url} - ${e.message}`);
        }
      }
    }
    
    if (process.env.DEBUG_MCP) console.error(`❌ Ollama not available at any tested URL`);
    return false
  }

  /**
   * Get detailed diagnostics and troubleshooting information
   */
  async getDiagnostics() {
    const isWSL = process.platform === 'linux' && (process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP);
    const diagnostics = {
      environment: {
        platform: process.platform,
        isWSL,
        wslDistro: process.env.WSL_DISTRO_NAME,
        ollamaHost: process.env.OLLAMA_HOST
      },
      urls: {
        primary: this.baseUrl,
        alternatives: []
      },
      connectivity: {},
      recommendations: []
    };

    // Test primary URL
    try {
      const response = await fetch(`${this.baseUrl}/api/version`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(3000)
      });
      diagnostics.connectivity.primary = {
        url: this.baseUrl,
        success: response.ok,
        status: response.status,
        error: response.ok ? null : `HTTP ${response.status}`
      };
    } catch (error) {
      diagnostics.connectivity.primary = {
        url: this.baseUrl,
        success: false,
        error: error.message
      };
    }

    // Test alternative URLs if in WSL
    if (isWSL) {
      const wslIPs = this.getWSLHostIPs();
      const alternativeUrls = [
        ...wslIPs.map(ip => `http://${ip}:11434`),
        'http://localhost:11434',
        'http://host.docker.internal:11434'
      ].filter((url, index, array) => array.indexOf(url) === index);

      diagnostics.urls.alternatives = alternativeUrls;
      diagnostics.connectivity.alternatives = [];

      for (const url of alternativeUrls.slice(0, 5)) { // Test max 5 alternatives
        try {
          const response = await fetch(`${url}/api/version`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(2000)
          });
          diagnostics.connectivity.alternatives.push({
            url,
            success: response.ok,
            status: response.status,
            error: response.ok ? null : `HTTP ${response.status}`
          });
        } catch (error) {
          diagnostics.connectivity.alternatives.push({
            url,
            success: false,
            error: error.message
          });
        }
      }
    }

    // Generate recommendations
    if (!diagnostics.connectivity.primary?.success) {
      if (isWSL) {
        diagnostics.recommendations.push(
          'Configure Ollama on Windows to bind to all interfaces:',
          'Set environment variable: OLLAMA_HOST=0.0.0.0:11434',
          'Allow port 11434 through Windows Firewall',
          'Restart Ollama service after configuration changes'
        );
      } else {
        diagnostics.recommendations.push(
          'Ensure Ollama is running: ollama serve',
          'Check if port 11434 is accessible',
          'Verify Ollama installation: ollama --version'
        );
      }
    }

    return diagnostics;
  }

  /**
   * List available models
   */
  async listModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      return data.models || []
    } catch (error) {
      console.error('Failed to list Ollama models:', error)
      return []
    }
  }

  /**
   * Generate title and summary for a single memory
   */
  async enhanceMemory(content, metadata = {}) {
    const prompt = this.buildEnhancementPrompt(content, metadata)
    
    try {
      const response = await this.generateCompletion(prompt)
      return this.parseEnhancementResponse(response)
    } catch (error) {
      if (process.env.DEBUG_MCP) console.error('Ollama enhancement error:', error)
      throw new Error(`Local AI enhancement failed: ${error.message}`)
    }
  }

  /**
   * Batch process multiple memories
   */
  async enhanceMemoriesBatch(memories, onProgress = null) {
    // First check if the model exists
    try {
      const models = await this.listModels()
      const modelExists = models.some(m => 
        m.name === this.options.model || 
        m.name.includes(this.options.model) ||
        this.options.model.includes(m.name.split(':')[0])
      )
      if (!modelExists) {
        throw new Error(`Model '${this.options.model}' not found. Available models: ${models.map(m => m.name).join(', ')}`)
      }
      if (process.env.DEBUG_MCP) console.error(`✅ Model '${this.options.model}' verified`)
    } catch (error) {
      if (process.env.DEBUG_MCP) console.error('❌ Failed to verify model:', error.message)
      // Don't throw - continue anyway as the model might still work
    }
    
    const results = []
    const batches = this.createBatches(memories, this.options.batchSize)
    
    if (process.env.DEBUG_MCP) console.error(`🤖 Processing ${memories.length} memories in ${batches.length} batches of ${this.options.batchSize}`)
    
    // Add start time tracking
    const startTime = Date.now()
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      if (process.env.DEBUG_MCP) console.error(`📦 Processing batch ${i + 1}/${batches.length} (${batch.length} memories)`)
      const batchStartTime = Date.now()
      
      const batchPromises = batch.map(async (memory, index) => {
        try {
          const enhancement = await this.enhanceMemory(memory.content, memory)
          onProgress?.(i * this.options.batchSize + index + 1, memories.length)
          return { memory, enhancement, success: true }
        } catch (error) {
          if (process.env.DEBUG_MCP) console.error(`Failed to enhance memory ${memory.id}:`, error)
          return { memory, error: error.message, success: false }
        }
      })
      
      // Add timeout for entire batch (reasonable timeout per memory)
      const batchTimeout = Math.min(this.options.requestTimeout * batch.length, 180000) // Max 3 minutes per batch
      const batchResultsPromise = Promise.all(batchPromises)
      
      try {
        const batchResults = await Promise.race([
          batchResultsPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Batch ${i + 1} timed out after ${batchTimeout}ms`)), batchTimeout)
          )
        ])
        
        results.push(...batchResults)
        
        const batchTime = Date.now() - batchStartTime
        if (process.env.DEBUG_MCP) console.error(`✅ Batch ${i + 1} completed in ${(batchTime / 1000).toFixed(1)}s`)
        
        // Rate limiting between batches
        if (i < batches.length - 1) {
          await this.delay(1000)
        }
      } catch (error) {
        if (process.env.DEBUG_MCP) console.error(`❌ Batch ${i + 1} failed:`, error.message)
        // Add failed results for this batch
        batch.forEach(memory => {
          results.push({ memory, error: error.message, success: false })
        })
      }
    }
    
    return results
  }

  /**
   * Generate completion using Ollama API
   */
  async generateCompletion(prompt) {
    const payload = {
      model: this.options.model,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      stream: false,
      options: {
        temperature: this.options.temperature,
        num_predict: this.options.maxTokens,
        stop: ['</json>', '\n\n---', '\n\nEnd:']
      }
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.options.requestTimeout)

    try {
      if (process.env.DEBUG_MCP) console.error(`🔌 Calling Ollama API at ${this.baseUrl}/api/chat with model ${this.options.model}`)
      
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.message || !data.message.content) {
        throw new Error('No response from Ollama model')
      }

      return data.message.content.trim()
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.options.requestTimeout}ms - model may be too slow or not loaded`)
      }
      
      throw error
    }
  }

  /**
   * Build enhancement prompt for memory content
   */
  buildEnhancementPrompt(content, metadata = {}) {
    const category = metadata.category || 'general'
    
    // Enhanced category-specific instructions based on comprehensive rules
    const categoryInstructions = {
      code: `Use format: [Technology] [Component]: [Purpose/Action]. Focus on language, framework, component name, and main purpose. Prioritize function over implementation details. Include version numbers and specific technologies when relevant.`,
      work: `Use format: [Project] [Action]: [Specific Task]. Include project context, action verb, and specific outcome. Prioritize deliverables over process. Reference project phases, sprints, or milestones when relevant.`,
      research: `Use format: [Topic]: [Specific Focus/Finding]. Include domain and specific area of focus. Prioritize key insights over general topics. Reference methodologies and measurable outcomes.`,
      conversations: `Use format: [Context]: [Main Topic/Decision]. Include communication type, key participants, and main topic. Prioritize decisions and outcomes over general discussion.`,
      personal: `Use format: [Category]: [Specific Preference/Insight]. Include personal context and specific area. Prioritize actionable insights over general thoughts.`,
      preferences: `Use format: [Category]: [Specific Preference/Insight]. Include personal context and specific area. Prioritize actionable insights over general thoughts.`,
      general: `Use appropriate format based on content type. Focus on specificity, clarity, and actionability. Avoid vague terms like "stuff", "things", "various".`
    }

    const instruction = categoryInstructions[category] || categoryInstructions.general

    return `You are a memory enhancement specialist. Generate a concise title and description following these strict rules:

CONTENT CATEGORY: ${category}
CATEGORY RULES: ${instruction}

MANDATORY REQUIREMENTS:
- Title: Maximum 80 characters, use title case, no periods unless abbreviation
- Summary: Maximum 200 characters, active voice, complement title (no repetition)
- Use specific terms over generic ones (avoid "implementation", "system", "process")
- Include key identifiers (project names, technologies, specific issues)
- For technical content: include technologies, versions, specific components
- For tasks: use action-oriented language with clear outcomes
- For research: emphasize findings and applications
- For conversations: focus on decisions and key outcomes

FORBIDDEN PATTERNS:
- Vague descriptors: "various", "multiple", "different", "several"
- Redundant prefixes: "How to", "Guide to", "Information about"
- Obvious statements: "This is about", "Contains information on"
- Excessive adjectives: "comprehensive", "ultimate", "complete", "full"
- Generic project names: "Project", "System", "Application"

CONTENT TO ANALYZE:
${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}

Generate ONLY a JSON response with:
- title: Specific, clear, follows category format rules
- summary: Informative, complements title, includes context/impact

JSON format:
{
  "title": "your title here",
  "summary": "your summary here"
}

Respond with ONLY the JSON, no additional text:`
  }

  /**
   * Smart truncate that doesn't cut mid-word
   */
  smartTruncate(text, maxLength) {
    if (!text || text.length <= maxLength) return text.trim()
    
    // Find the last space before the limit
    const truncated = text.substring(0, maxLength)
    const lastSpace = truncated.lastIndexOf(' ')
    
    // If there's a space, cut there; otherwise just use the limit
    const cutPoint = lastSpace > maxLength * 0.7 ? lastSpace : maxLength
    return text.substring(0, cutPoint).trim()
  }

  /**
   * Parse AI response and extract title/summary
   */
  parseEnhancementResponse(response) {
    try {
      // Clean the response to extract JSON
      const cleanResponse = response
        .replace(/^[^{]*/, '') // Remove text before first {
        .replace(/[^}]*$/, '') // Remove text after last }
        .replace(/```json\s*/, '') // Remove markdown code blocks
        .replace(/```\s*$/, '')
        .trim()

      const parsed = JSON.parse(cleanResponse)
      
      if (!parsed.title || !parsed.summary) {
        throw new Error('Missing title or summary in response')
      }

      return {
        title: this.smartTruncate(parsed.title, 80),
        summary: this.smartTruncate(parsed.summary, 200)
      }
    } catch (error) {
      // Fallback: try to extract with regex
      const titleMatch = response.match(/"title":\s*"([^"]+)"/i)
      const summaryMatch = response.match(/"summary":\s*"([^"]+)"/i)
      
      if (titleMatch && summaryMatch) {
        return {
          title: this.smartTruncate(titleMatch[1], 80),
          summary: this.smartTruncate(summaryMatch[1], 200)
        }
      }
      
      throw new Error(`Failed to parse AI response: ${error.message}`)
    }
  }

  /**
   * Create batches for processing
   */
  createBatches(items, batchSize) {
    const batches = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }

  /**
   * Delay utility for rate limiting
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get model recommendations based on system resources
   */
  static getModelRecommendations() {
    return {
      lightweight: [
        { name: 'llama3.1:8b', description: 'Fast, good quality (4GB RAM)' },
        { name: 'llama3.2:3b', description: 'Very fast, decent quality (2GB RAM)' },
        { name: 'phi3:mini', description: 'Ultra-fast, basic quality (1GB RAM)' }
      ],
      balanced: [
        { name: 'llama3.1:8b', description: 'Best all-around choice (4GB RAM)' },
        { name: 'mistral:7b', description: 'Good alternative (4GB RAM)' },
        { name: 'codellama:7b', description: 'Better for code content (4GB RAM)' }
      ],
      quality: [
        { name: 'llama3.1:70b', description: 'Highest quality (40GB+ RAM)' },
        { name: 'mixtral:8x7b', description: 'Excellent quality (26GB RAM)' },
        { name: 'llama3.1:13b', description: 'High quality (8GB RAM)' }
      ]
    }
  }

  /**
   * Estimate processing time
   */
  static estimateProcessingTime(memoryCount, model = 'llama3.1:8b') {
    const timePerMemory = {
      'phi3:mini': 2,
      'llama3.2:3b': 3,
      'llama3.1:8b': 5,
      'mistral:7b': 6,
      'llama3.1:13b': 8,
      'mixtral:8x7b': 15,
      'llama3.1:70b': 30
    }
    
    const baseTime = timePerMemory[model] || 5
    const totalSeconds = memoryCount * baseTime
    const minutes = Math.ceil(totalSeconds / 60)
    
    return {
      seconds: totalSeconds,
      minutes: minutes,
      estimate: minutes < 2 ? `~${totalSeconds} seconds` : `~${minutes} minutes`
    }
  }
}

export default OllamaClient