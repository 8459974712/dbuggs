const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');

const db = new Database('dbugg-dev.sqlite');

const email = 'admin@dbuggs.in';
const password = 'admin123';
const hash = bcrypt.hashSync(password, 10);

const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

if (existing) {
  db.prepare('UPDATE users SET role = ?, name = ?, password = ? WHERE email = ?').run('super_admin', 'Super Admin', hash, email);
  console.log('Updated existing admin:', email);
} else {
  const id = randomUUID();
  db.prepare(`
    INSERT INTO users (id, name, phone, email, password, role, kycStatus, isActive, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(id, 'Super Admin', '9999999999', email, hash, 'super_admin', 'approved', 1);
  console.log('Created admin:', email);
}

console.log('Login with email:', email, '/ password:', password);
db.close();
