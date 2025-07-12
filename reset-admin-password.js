#!/usr/bin/env node

import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

// Reset admin password
const usersFile = path.join(process.cwd(), 'data', 'users.json');

if (!fs.existsSync(usersFile)) {
  console.error('❌ No users file found. Run the server first to create default user.');
  process.exit(1);
}

const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));

if (!users.admin) {
  console.error('❌ No admin user found.');
  process.exit(1);
}

// Generate new password
const newPassword = 'admin123';
const hashedPassword = bcrypt.hashSync(newPassword, 12);

// Update admin password
users.admin.password = hashedPassword;
users.admin.sessions = []; // Clear existing sessions

// Save updated users
fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

console.log('✅ Admin password reset successfully!');
console.log('   Username: admin');
console.log('   Password: admin123');
console.log('   Please change this password after logging in!');