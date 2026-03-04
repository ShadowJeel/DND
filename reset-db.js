#!/usr/bin/env node

/**
 * Database Reset Script
 * 
 * Use this script to reset the database to the current schema.
 * This is useful when the database schema has changed significantly.
 * 
 * Run with: node reset-db.js or npm run reset-db (if added to package.json)
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'data', 'dnd-purchase.db');

if (fs.existsSync(DB_PATH)) {
  try {
    fs.unlinkSync(DB_PATH);
    console.log('✅ Database file deleted successfully');
    console.log('📁 Path: ' + DB_PATH);
    console.log('\n🔄 The database will be recreated with the correct schema on next run');
    console.log('🚀 Start your development server now to initialize the new database');
  } catch (error) {
    console.error('❌ Error deleting database:', error.message);
    process.exit(1);
  }
} else {
  console.log('ℹ️  Database file does not exist at:', DB_PATH);
  console.log('✅ No action needed - database will be created on next run');
}
