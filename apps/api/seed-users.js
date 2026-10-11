const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');

const db = new Database('dbugg-dev.sqlite');

const users = [
  { phone: '9999999999', email: 'admin@dbuggs.in', password: 'admin123', role: 'super_admin', name: 'Super Admin' },
  { phone: '9888888888', email: 'manageradmin@dbuggs.in', password: 'admin123', role: 'admin', name: 'Ops Admin' },
  { phone: '9777777777', email: 'b2c@dbuggs.in', password: 'user123', role: 'b2c', name: 'Rahul Sharma (B2C)' },
  { phone: '9666666666', email: 'b2b@dbuggs.in', password: 'user123', role: 'b2b', name: 'TechCorp Pvt Ltd (B2B)' },
];

for (const u of users) {
  const hash = bcrypt.hashSync(u.password, 10);
  const existing = db.prepare('SELECT * FROM users WHERE phone = ?').get(u.phone);
  if (existing) {
    db.prepare('UPDATE users SET email = ?, password = ?, role = ?, name = ? WHERE phone = ?')
      .run(u.email, hash, u.role, u.name, u.phone);
    console.log('Updated:', u.role, '->', u.email, '/', u.password);
  } else {
    const id = randomUUID();
    db.prepare(`
      INSERT INTO users (id, name, phone, email, password, role, kycStatus, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(id, u.name, u.phone, u.email, hash, u.role, 'approved', 1);
    console.log('Created:', u.role, '->', u.email, '/', u.password);
  }
}

db.close();
console.log('\nAll demo accounts ready. Admin panel login works only with role=admin or super_admin.');
