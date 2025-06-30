// Like-I-Said MCP Server v2 - Neo4j Knowledge Graph Schema
// This file defines the complete graph schema for the memory knowledge base

// ============================================================================
// CONSTRAINTS AND INDEXES
// ============================================================================

// Unique constraints for primary identifiers
CREATE CONSTRAINT memory_id_unique IF NOT EXISTS FOR (m:Memory) REQUIRE m.id IS UNIQUE;
CREATE CONSTRAINT task_id_unique IF NOT EXISTS FOR (t:Task) REQUIRE t.id IS UNIQUE;
CREATE CONSTRAINT session_id_unique IF NOT EXISTS FOR (s:Session) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT category_name_unique IF NOT EXISTS FOR (c:Category) REQUIRE c.name IS UNIQUE;
CREATE CONSTRAINT project_name_unique IF NOT EXISTS FOR (p:Project) REQUIRE p.name IS UNIQUE;
CREATE CONSTRAINT tag_name_unique IF NOT EXISTS FOR (tag:Tag) REQUIRE tag.name IS UNIQUE;

// Performance indexes for frequently queried properties
CREATE INDEX memory_timestamp_idx IF NOT EXISTS FOR (m:Memory) ON (m.timestamp);
CREATE INDEX memory_priority_idx IF NOT EXISTS FOR (m:Memory) ON (m.priority);
CREATE INDEX memory_status_idx IF NOT EXISTS FOR (m:Memory) ON (m.status);
CREATE INDEX memory_complexity_idx IF NOT EXISTS FOR (m:Memory) ON (m.complexity);
CREATE INDEX task_status_idx IF NOT EXISTS FOR (t:Task) ON (t.status);
CREATE INDEX task_priority_idx IF NOT EXISTS FOR (t:Task) ON (t.priority);

// Full-text search indexes
CREATE FULLTEXT INDEX memory_content_search IF NOT EXISTS FOR (m:Memory) ON EACH [m.content, m.title];
CREATE FULLTEXT INDEX task_content_search IF NOT EXISTS FOR (t:Task) ON EACH [t.content, t.description];

// ============================================================================
// NODE TYPES AND PROPERTIES
// ============================================================================

// Memory nodes - Core content storage
// Properties: id, title, content, timestamp, complexity, priority, status, 
//            file_path, content_hash, access_count, last_accessed, language
(:Memory)

// Task nodes - Work items and todos
// Properties: id, content, description, status, priority, created, completed, 
//            estimated_duration, actual_duration
(:Task)

// Category nodes - Memory organization
// Properties: name, description, created, color, icon
(:Category)

// Project nodes - High-level project grouping
// Properties: name, description, status, version, repository, created
(:Project)

// Tag nodes - Flexible labeling system
// Properties: name, frequency, first_used, category
(:Tag)

// Session nodes - Work sessions and context
// Properties: id, date, duration, achievements, tool_used, user
(:Session)

// Technology nodes - Tech stack and tools
// Properties: name, version, type, category, documentation_url
(:Technology)

// Concept nodes - Domain knowledge and ideas
// Properties: name, definition, domain, importance
(:Concept)

// Person nodes - Contributors and collaborators
// Properties: name, role, email, github_username
(:Person)

// Feature nodes - Product features and capabilities
// Properties: name, description, status, complexity, dependencies
(:Feature)

// Issue nodes - Problems and bugs
// Properties: id, title, severity, status, resolution, created, resolved
(:Issue)

// ============================================================================
// RELATIONSHIP TYPES
// ============================================================================

// Content Organization Relationships
(:Memory)-[:BELONGS_TO]->(:Category)
(:Memory)-[:PART_OF]->(:Project)
(:Memory)-[:TAGGED_WITH]->(:Tag)
(:Memory)-[:CREATED_IN]->(:Session)
(:Task)-[:BELONGS_TO]->(:Category)
(:Task)-[:PART_OF]->(:Project)

// Content Connections
(:Memory)-[:CONNECTS_TO]->(:Memory)
(:Memory)-[:RELATES_TO]->(:Memory)
(:Memory)-[:REFERENCES]->(:Memory)
(:Task)-[:CONNECTS_TO]->(:Memory)
(:Task)-[:IMPLEMENTED_BY]->(:Memory)

// Temporal Relationships
(:Memory)-[:PRECEDES]->(:Memory)
(:Memory)-[:FOLLOWS]->(:Memory)
(:Session)-[:CONTINUES]->(:Session)
(:Memory)-[:BUILDS_ON]->(:Memory)

// Work Flow Relationships
(:Task)-[:DEPENDS_ON]->(:Task)
(:Task)-[:BLOCKS]->(:Task)
(:Task)-[:SUBTASK_OF]->(:Task)
(:Task)-[:ASSIGNED_TO]->(:Person)

// Technical Relationships
(:Memory)-[:IMPLEMENTS]->(:Feature)
(:Memory)-[:DISCUSSES]->(:Technology)
(:Memory)-[:SOLVES]->(:Issue)
(:Memory)-[:DESCRIBES]->(:Concept)
(:Feature)-[:REQUIRES]->(:Technology)
(:Feature)-[:DEPENDS_ON]->(:Feature)

// Knowledge Relationships
(:Concept)-[:RELATED_TO]->(:Concept)
(:Concept)-[:PART_OF]->(:Concept)
(:Technology)-[:USES]->(:Technology)
(:Technology)-[:COMPATIBLE_WITH]->(:Technology)

// Authorship and Attribution
(:Memory)-[:CREATED_BY]->(:Person)
(:Task)-[:CREATED_BY]->(:Person)
(:Session)-[:CONDUCTED_BY]->(:Person)

// Metrics and Analytics Relationships
(:Memory)-[:HAS_METRIC]->(:AnalyticsNode)
(:Tag)-[:HAS_USAGE_STATS]->(:UsageStats)

// ============================================================================
// SAMPLE DATA STRUCTURE
// ============================================================================

// Example memory node creation
// CREATE (m:Memory {
//   id: 'memory_001',
//   title: 'WebSocket Implementation',
//   content: 'Implemented real-time WebSocket updates...',
//   timestamp: datetime('2025-06-29T10:00:00Z'),
//   complexity: 3,
//   priority: 'high',
//   status: 'active',
//   file_path: 'memories/like-i-said-v2/websocket-implementation.md',
//   content_hash: 'sha256_hash_here',
//   access_count: 5,
//   last_accessed: datetime('2025-06-29T19:00:00Z'),
//   language: 'javascript'
// })

// Example relationships
// MATCH (m:Memory {id: 'memory_001'}), (c:Category {name: 'like-i-said-v2'})
// CREATE (m)-[:BELONGS_TO]->(c)

// ============================================================================
// UTILITY QUERIES
// ============================================================================

// Clear all data (DANGER - for development only)
// MATCH (n) DETACH DELETE n;

// Show schema overview
// CALL db.schema.visualization();

// List all node types and counts
// MATCH (n) RETURN labels(n) as NodeType, count(n) as Count ORDER BY Count DESC;

// List all relationship types and counts
// MATCH ()-[r]->() RETURN type(r) as RelationshipType, count(r) as Count ORDER BY Count DESC;