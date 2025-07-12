const { MemoryDescriptionQualityScorer } = require('../lib/memory-description-quality-scorer.cjs');

describe('MemoryDescriptionQualityScorer', () => {
  let scorer;

  beforeEach(() => {
    scorer = new MemoryDescriptionQualityScorer();
  });

  describe('scoreTitle', () => {
    test('should score excellent titles highly', () => {
      const title = 'Implement user authentication with JWT tokens';
      const content = 'This memory contains implementation details for user authentication using JWT tokens in Node.js...';
      
      const result = scorer.scoreTitle(title, content);
      
      expect(result.score).toBeGreaterThan(0.8);
      expect(result.qualityLevel).toBe('excellent');
      expect(result.issues).toHaveLength(0);
    });

    test('should penalize truncated titles', () => {
      const title = 'plan-task-relationship-data-mo-626534';
      const content = 'Planning task relationship data model...';
      
      const result = scorer.scoreTitle(title, content);
      
      expect(result.score).toBeLessThan(0.5);
      expect(result.issues).toContain('Title appears truncated');
    });

    test('should penalize generic titles', () => {
      const title = 'Memory 123';
      const content = 'Important implementation details...';
      
      const result = scorer.scoreTitle(title, content);
      
      expect(result.score).toBeLessThan(0.5);
      expect(result.issues).toContain('Title is too generic');
    });

    test('should reward specific technical titles', () => {
      const title = 'React useEffect cleanup function implementation';
      const content = 'Details about implementing cleanup functions in React useEffect hooks...';
      
      const result = scorer.scoreTitle(title, content);
      
      expect(result.breakdown.specificity).toBeGreaterThan(0.8);
      expect(result.breakdown.informativeness).toBeGreaterThan(0.7);
    });

    test('should handle missing titles', () => {
      const result = scorer.scoreTitle('', 'Some content');
      
      expect(result.score).toBe(0);
      expect(result.issues).toContain('Missing or invalid title');
    });
  });

  describe('scoreSummary', () => {
    test('should score excellent summaries highly', () => {
      const summary = 'Implementation guide for JWT authentication in Node.js, covering token generation, validation middleware, and refresh token strategies.';
      const content = 'Detailed content about JWT authentication implementation...';
      
      const result = scorer.scoreSummary(summary, content);
      
      expect(result.score).toBeGreaterThan(0.7);
      expect(result.qualityLevel).toMatch(/good|excellent/);
    });

    test('should penalize overly generic summaries', () => {
      const summary = 'This memory contains information about various aspects of the system.';
      const content = 'Specific implementation details...';
      
      const result = scorer.scoreSummary(summary, content);
      
      expect(result.breakdown.specificity).toBeLessThan(0.5);
      expect(result.issues).toContain('Summary uses too many generic phrases');
    });

    test('should reward concise but complete summaries', () => {
      const summary = 'React component optimization using useMemo and useCallback hooks to prevent unnecessary re-renders in data-heavy dashboards.';
      const content = 'Detailed explanation of React optimization techniques...';
      
      const result = scorer.scoreSummary(summary, content);
      
      expect(result.breakdown.conciseness).toBeGreaterThan(0.7);
      expect(result.breakdown.completeness).toBeGreaterThan(0.6);
    });

    test('should penalize too brief summaries', () => {
      const summary = 'React stuff.';
      const content = 'Long detailed content about React implementation...'.repeat(20);
      
      const result = scorer.scoreSummary(summary, content);
      
      expect(result.breakdown.completeness).toBeLessThan(0.5);
      expect(result.issues).toContain('Summary needs more detail');
    });
  });

  describe('generateQualityReport', () => {
    test('should generate comprehensive quality report', () => {
      const memory = {
        title: 'Implement Redis caching layer',
        summary: 'Added Redis caching to improve API response times, including TTL configuration and cache invalidation strategies.',
        content: 'Detailed implementation of Redis caching layer with connection pooling, error handling, and performance metrics...'
      };
      
      const report = scorer.generateQualityReport(memory);
      
      expect(report).toHaveProperty('overallScore');
      expect(report).toHaveProperty('overallQuality');
      expect(report).toHaveProperty('title');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('recommendations');
      expect(report.recommendations).toBeInstanceOf(Array);
    });

    test('should provide high-priority recommendations for poor quality', () => {
      const memory = {
        title: 'untitled',
        summary: 'stuff',
        content: 'Important technical implementation details about microservices architecture...'
      };
      
      const report = scorer.generateQualityReport(memory);
      
      expect(report.overallQuality).toMatch(/poor|very poor/);
      expect(report.recommendations.some(r => r.priority === 'high')).toBe(true);
    });
  });

  describe('quality factors', () => {
    test('should correctly identify clarity issues', () => {
      const title = 'implement... user... auth... sys-a1b2c3';
      const result = scorer.scoreTitle(title, 'User authentication system');
      
      expect(result.breakdown.clarity).toBeLessThan(0.5);
    });

    test('should reward informative content', () => {
      const title = 'PostgreSQL connection pooling with pg library';
      const content = 'Implementation of PostgreSQL connection pooling using pg library with configuration for max connections...';
      
      const result = scorer.scoreTitle(title, content);
      
      expect(result.breakdown.informativeness).toBeGreaterThan(0.7);
    });

    test('should identify conciseness issues', () => {
      const summary = 'This summary contains information about the implementation of a system that handles user authentication and authorization with various different methods and approaches that could be used in different scenarios and situations.';
      
      const result = scorer.scoreSummary(summary, 'Auth system details');
      
      expect(result.breakdown.conciseness).toBeLessThan(0.5);
      expect(result.issues).toContain('Summary is too verbose');
    });
  });

  describe('edge cases', () => {
    test('should handle null inputs gracefully', () => {
      const result = scorer.scoreTitle(null, 'content');
      expect(result.score).toBe(0);
    });

    test('should handle very long titles', () => {
      const longTitle = 'This is a very long title that goes on and on and contains way too much information than necessary for a title';
      const result = scorer.scoreTitle(longTitle, 'content');
      
      expect(result.breakdown.conciseness).toBeLessThan(0.5);
    });

    test('should handle code-heavy content', () => {
      const content = '```javascript\nfunction test() { return true; }\n```\nThis implements a test function.';
      const summary = 'JavaScript test function implementation.';
      
      const result = scorer.scoreSummary(summary, content);
      
      expect(result.breakdown.informativeness).toBeGreaterThan(0.5);
    });
  });
});