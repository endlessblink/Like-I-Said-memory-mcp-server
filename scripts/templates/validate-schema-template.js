#!/usr/bin/env node

import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

// Test schema (same as V3 tools)
const testSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object", 
  "properties": {
    "test_param": {
      "type": "string",
      "description": "A test parameter"
    }
  },
  "required": ["test_param"],
  "additionalProperties": false
};

console.log('🔍 Validating Schema Template with AJV 2020-12...');

// Create AJV instance for JSON Schema 2020-12
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

// Validate the schema itself
const isValid = ajv.validateSchema(testSchema);

if (isValid) {
  console.log('✅ Schema is valid JSON Schema 2020-12!');
  
  // Test compiling the schema
  try {
    const validate = ajv.compile(testSchema);
    console.log('✅ Schema compiles successfully!');
    
    // Test validation with sample data
    const testData = { test_param: "hello world" };
    const dataValid = validate(testData);
    
    if (dataValid) {
      console.log('✅ Sample data validates successfully!');
      console.log('🎉 Template is fully compliant and ready to use!');
    } else {
      console.log('❌ Sample data validation failed:', validate.errors);
    }
  } catch (error) {
    console.log('❌ Schema compilation failed:', error.message);
  }
} else {
  console.log('❌ Schema validation failed!');
  console.log('Errors:', ajv.errors);
}

export { testSchema };