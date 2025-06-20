#!/usr/bin/env node

// Set NO_BACKUP before any imports
process.env.NO_BACKUP = 'true';

// Now import the main server
import('./server-markdown.js');